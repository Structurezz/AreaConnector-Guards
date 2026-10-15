import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { callAPI } from '../api';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { startTone, stopTone } from '../utils/callTones';

// One-to-one voice calls over WebRTC.
//
// Flow (server: controllers/callController + services/callService):
//   caller  POST /calls ───────────────► callee gets `call:incoming`, rings
//   both    `call:bind` (acked)          registers *this* device for signals
//   callee  POST /calls/:id/answer ────► caller gets `call:accepted`
//   caller  creates offer ─ call:signal ─► callee answers ─ call:signal ─► …ICE
//   either  POST /calls/:id/end ───────► both get `call:ended` (with billing)
//
// Audio has two paths, both ours (no third-party TURN):
//   1. Relay — the moment a call connects, voice flows through our server
//      over the existing WebSocket: mic → AudioWorklet (16 kHz G.711 μ-law,
//      40 ms frames) → `call:audio` → server → other device → jitter-buffered
//      AudioWorklet player. Works on any network that can load the app.
//   2. Direct — in parallel we try a peer-to-peer WebRTC link (STUN only).
//      If it connects (usually on Wi-Fi) we switch to it for better quality
//      and less server load; if it drops we fall back to the relay. A failed
//      direct link never ends the call.

const CallContext = createContext(null);

const SEEN_KEY = 'calls_missed_seen';
const MISSED_SINCE_KEY = 'calls_missed_checked_at';
const readSeen = () => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch { return []; } };
const writeSeen = (ids) => localStorage.setItem(SEEN_KEY, JSON.stringify(ids.slice(0, 100)));
export const useCall = () => useContext(CallContext);

export const END_TEXT = {
  declined: 'Call declined', missed: 'No answer', cancelled: 'Call cancelled', failed: 'Call failed', ended: 'Call ended',
};
export const REASON_TEXT = {
  credits_exhausted: 'You ran out of call credits',
  caller_out_of_credits: 'The caller ran out of credits',
  disconnected: 'Connection lost',
  no_answer: 'No answer',
  mic_denied: 'Microphone access is needed for calls',
};

export function CallProvider({ children }) {
  const { subscribe, emitAck, emit, sendVolatile } = useSocket() || {};
  const { user } = useAuth() || {};
  const [call, setCall] = useState(null);
  const callRef = useRef(null);
  callRef.current = call;

  const pcRef = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef(null);
  const pendingOffer = useRef(null);
  const pendingIce = useRef([]);
  const clearTimer = useRef(null);
  // Relay audio graph
  const ctxRef = useRef(null);
  const captureRef = useRef(null);
  const playerRef = useRef(null);
  const modeRef = useRef('relay'); // 'relay' | 'direct'

  const update = useCallback((patch) => setCall((c) => (c ? { ...c, ...patch } : c)), []);

  const releaseMedia = useCallback(() => {
    stopTone();
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioRef.current) audioRef.current.srcObject = null;
    pendingOffer.current = null;
    pendingIce.current = [];
    try { captureRef.current?.disconnect(); playerRef.current?.disconnect(); } catch {}
    captureRef.current = null;
    playerRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    modeRef.current = 'relay';
  }, []);

  // Show the end state briefly, then clear the call screen.
  const finish = useCallback((end) => {
    releaseMedia();
    setCall((c) => (c ? { ...c, status: 'ended', end } : c));
    clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => setCall((c) => (c?.status === 'ended' ? null : c)), 3000);
  }, [releaseMedia]);

  const getMic = () => navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });

  const sendSignal = (data) => emit?.('call:signal', { callId: callRef.current?.id, data });

  // Must be created inside a user gesture (call / accept tap) or mobile
  // browsers start it suspended.
  const ensureAudioContext = () => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    }
    ctxRef.current.resume?.().catch(() => {});
    return ctxRef.current;
  };

  const setMode = useCallback((mode) => {
    if (modeRef.current === mode) return;
    modeRef.current = mode;
    // Only one path is audible at a time.
    if (audioRef.current) audioRef.current.muted = mode !== 'direct';
    if (mode === 'direct') playerRef.current?.port.postMessage('flush');
    update({ path: mode });
  }, [update]);

  /** Start our server relay: mic → capture worklet → socket; socket → player. */
  const startRelay = useCallback(async (callId) => {
    const ctx = ensureAudioContext();
    try {
      await Promise.all([
        ctx.audioWorklet.addModule('/worklets/call-capture.js'),
        ctx.audioWorklet.addModule('/worklets/call-player.js'),
      ]);
    } catch (e) {
      console.warn('[call relay] worklets unavailable', e);
      return;
    }
    if (!streamRef.current || ctx.state === 'closed') return;
    const src = ctx.createMediaStreamSource(streamRef.current);
    const capture = new AudioWorkletNode(ctx, 'call-capture');
    const silent = ctx.createGain();
    silent.gain.value = 0; // keeps the capture node running without playing the mic back
    src.connect(capture).connect(silent).connect(ctx.destination);
    capture.port.onmessage = (e) => {
      if (modeRef.current === 'relay') sendVolatile?.('call:audio', callId, e.data.buffer);
    };
    const player = new AudioWorkletNode(ctx, 'call-player', { outputChannelCount: [1] });
    player.connect(ctx.destination);
    captureRef.current = capture;
    playerRef.current = player;
    if (audioRef.current) audioRef.current.muted = true; // direct path silent until it connects
    update({ status: 'active', connectedAt: Date.now(), path: 'relay' });
  }, [sendVolatile, update]); // eslint-disable-line react-hooks/exhaustive-deps

  // Diagnostic switch: localStorage ac_call_force_relay=1 skips the direct
  // attempt so the call runs entirely on our relay (support / testing).
  const relayOnly = () => { try { return localStorage.getItem('ac_call_force_relay') === '1'; } catch { return false; } };

  const createPeer = useCallback((iceServers) => {
    const pc = new RTCPeerConnection({ iceServers });
    pc.onicecandidate = (e) => { if (e.candidate) sendSignal({ type: 'candidate', candidate: e.candidate.toJSON() }); };
    pc.ontrack = (e) => {
      if (audioRef.current) {
        audioRef.current.srcObject = e.streams[0];
        audioRef.current.play().catch(() => {});
      }
    };
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === 'connected') setMode('direct');
      // Direct link lost or never possible: stay on / fall back to the relay.
      if (st === 'failed' || st === 'disconnected' || st === 'closed') setMode('relay');
    };
    streamRef.current?.getTracks().forEach((t) => pc.addTrack(t, streamRef.current));
    pcRef.current = pc;
    return pc;
  }, [setMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const flushIce = async () => {
    const pc = pcRef.current;
    if (!pc?.remoteDescription) return;
    const queued = pendingIce.current;
    pendingIce.current = [];
    for (const cand of queued) { try { await pc.addIceCandidate(cand); } catch {} }
  };

  const handleOffer = async (offer) => {
    const pc = pcRef.current;
    if (!pc) { pendingOffer.current = offer; return; }
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendSignal({ type: 'answer', sdp: pc.localDescription.toJSON() });
    await flushIce();
  };

  // ── Actions ───────────────────────────────────────────────────────────────

  /** Returns { ok } or { needCredits: true } so callers can open the top-up sheet. */
  const startCall = useCallback(async (peer) => {
    if (callRef.current) { toast.error('You\'re already on a call'); return { ok: false }; }
    ensureAudioContext(); // inside the tap, so mobile browsers allow audio
    try {
      streamRef.current = await getMic();
    } catch {
      toast.error(REASON_TEXT.mic_denied);
      releaseMedia();
      return { ok: false };
    }
    let data;
    try {
      ({ data } = await callAPI.start(peer._id));
    } catch (err) {
      releaseMedia();
      const code = err.response?.data?.code;
      if (code !== 'NO_CREDITS') toast.error(err.response?.data?.message || 'Could not start the call');
      return { ok: false, needCredits: code === 'NO_CREDITS' };
    }
    const { call: c, callee, iceServers } = data.data;
    setCall({ id: String(c._id), direction: 'outgoing', kind: c.kind, peer: callee || peer, status: 'ringing', iceServers, muted: false });
    callRef.current = { id: String(c._id) };
    await emitAck?.('call:bind', { callId: String(c._id) });
    startTone('ringback');
    return { ok: true };
  }, [emitAck, releaseMedia]);

  const accept = useCallback(async () => {
    const c = callRef.current;
    if (!c || c.status !== 'incoming') return;
    stopTone();
    ensureAudioContext(); // inside the tap
    update({ status: 'connecting' });
    try {
      streamRef.current = await getMic();
    } catch {
      toast.error(REASON_TEXT.mic_denied);
      callAPI.decline(c.id).catch(() => {});
      return finish({ status: 'failed', reason: 'mic_denied' });
    }
    // Register this device *before* answering so the caller's offer reaches it.
    await emitAck?.('call:bind', { callId: c.id });
    if (!relayOnly()) createPeer(c.iceServers);
    try {
      const { data } = await callAPI.answer(c.id);
      update({ maxSeconds: data.data?.call?.maxSeconds || 0 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'This call has ended');
      return finish({ status: 'ended' });
    }
    startRelay(c.id);
    if (pendingOffer.current) { const o = pendingOffer.current; pendingOffer.current = null; handleOffer(o).catch(() => {}); }
  }, [createPeer, emitAck, finish, update, startRelay]); // eslint-disable-line react-hooks/exhaustive-deps

  const decline = useCallback(() => {
    const c = callRef.current;
    if (!c) return;
    stopTone();
    callAPI.decline(c.id).catch(() => {});
    releaseMedia();
    setCall(null);
  }, [releaseMedia]);

  const hangup = useCallback(() => {
    const c = callRef.current;
    if (!c) return;
    if (c.status === 'ended') { setCall(null); return; }
    const req = c.direction === 'outgoing' && c.status === 'ringing' ? callAPI.cancel(c.id) : callAPI.end(c.id);
    req.catch(() => {});
    // The server's `call:ended` (with duration/charge) updates the end screen.
    finish({ status: c.status === 'ringing' ? 'cancelled' : 'ended' });
  }, [finish]);

  const toggleMute = useCallback(() => {
    const tracks = streamRef.current?.getAudioTracks() || [];
    const muted = !callRef.current?.muted;
    tracks.forEach((t) => { t.enabled = !muted; });
    update({ muted });
  }, [update]);

  // ── Socket events ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!subscribe) return;
    const offs = [
      subscribe('call:incoming', (p) => {
        if (callRef.current?.id === p.callId) return; // already showing it (picked up via /calls/ringing)
        if (callRef.current && callRef.current.status !== 'ended') {
          callAPI.decline(p.callId).catch(() => {}); // already on a call
          return;
        }
        setCall({ id: p.callId, direction: 'incoming', kind: p.kind, peer: p.from, status: 'incoming', iceServers: p.iceServers, muted: false });
        startTone('ring');
      }),
      subscribe('call:accepted', async (p) => {
        const c = callRef.current;
        if (!c || c.id !== p.callId || c.direction !== 'outgoing') return;
        stopTone();
        update({ status: 'connecting', maxSeconds: p.maxSeconds });
        startRelay(c.id);
        if (relayOnly()) return;
        const pc = createPeer(c.iceServers);
        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);
        sendSignal({ type: 'offer', sdp: pc.localDescription.toJSON() });
      }),
      subscribe('call:signal', async ({ callId, data }) => {
        const c = callRef.current;
        if (!c || c.id !== callId || !data) return;
        try {
          if (data.type === 'offer') await handleOffer(data.sdp);
          else if (data.type === 'answer') { await pcRef.current?.setRemoteDescription(data.sdp); await flushIce(); }
          else if (data.type === 'candidate') {
            if (pcRef.current?.remoteDescription) await pcRef.current.addIceCandidate(data.candidate);
            else pendingIce.current.push(data.candidate);
          }
        } catch (e) { console.warn('[call signal]', e); }
      }),
      subscribe('call:ended', (p) => {
        const c = callRef.current;
        if (!c || c.id !== p.callId) return;
        if (c.status === 'incoming') { stopTone(); releaseMedia(); setCall(null); return; } // caller gave up
        finish({ status: p.status, reason: p.reason, durationSec: p.durationSec, creditsCharged: p.creditsCharged });
      }),
      subscribe('call:audio', (callId, frame) => {
        if (callRef.current?.id !== callId || modeRef.current !== 'relay' || !playerRef.current) return;
        playerRef.current.port.postMessage(new Uint8Array(frame));
      }),
      subscribe('call:answered_elsewhere', (p) => {
        const c = callRef.current;
        // Picked up on another of my devices: stop ringing here.
        if (c?.id === p.callId && c.status === 'incoming') { stopTone(); setCall(null); }
      }),
      subscribe('call:missed', (p) => showMissed([p])),
      subscribe('call:low_credit', (p) => {
        if (callRef.current?.id === p.callId) toast('About 1 minute of call credit left', { icon: '⏳', duration: 6000 });
      }),
    ];
    return () => offs.forEach((off) => off?.());
  }, [subscribe, createPeer, finish, releaseMedia, update, startRelay]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Missed calls ─────────────────────────────────────────────────────────
  // Shown live (`call:missed`) and caught up from call history whenever the
  // app opens or comes back to the foreground — so a call missed while the
  // app was closed still shows up. Each call is announced once.
  const startCallRef = useRef(startCall);
  startCallRef.current = startCall;
  const showMissed = useCallback((list) => {
    const seen = readSeen();
    const fresh = list.filter((m) => m?.callId && !seen.includes(m.callId));
    if (!fresh.length) return;
    writeSeen([...fresh.map((m) => m.callId), ...seen]);
    fresh.forEach((m) => window.dispatchEvent(new CustomEvent('app:notification', { detail: {
      id: `missed-${m.callId}`, type: 'missed_call', title: `Missed call from ${m.from?.name || 'someone'}`,
      body: 'Call them back from Calls', createdAt: m.at || new Date().toISOString(), silent: true,
    } })));
    const latest = fresh[0];
    const more = fresh.length - 1;
    toast((t) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 320 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>📵</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>Missed call from {latest.from?.name || 'someone'}{more > 0 ? ` +${more} more` : ''}</div>
          <button onClick={() => { toast.dismiss(t.id); if (latest.from?._id) startCallRef.current(latest.from); }}
            style={{ marginTop: 4, fontSize: 12, fontWeight: 700, color: '#2563EB', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>
            Call back →
          </button>
        </div>
      </div>
    ), { duration: 12000, id: `missed-${latest.callId}` });
  }, []);

  const catchUp = useCallback(async () => {
    if (!callAPI.ringing || !localStorage.getItem('accessToken')) return; // admin never receives calls; logged out
    // 1) A call ringing for me right now (opened from the notification / mid-ring).
    if (!callRef.current) {
      try {
        const { data } = await callAPI.ringing();
        const p = data.data;
        if (p && !callRef.current) {
          setCall({ id: p.callId, direction: 'incoming', kind: p.kind, peer: p.from, status: 'incoming', iceServers: p.iceServers, muted: false });
          startTone('ring');
        }
      } catch { /* offline */ }
    }
    // 2) Calls I missed since I last looked.
    try {
      const since = Number(localStorage.getItem(MISSED_SINCE_KEY)) || Date.now() - 24 * 3600_000;
      const { data } = await callAPI.history();
      localStorage.setItem(MISSED_SINCE_KEY, String(Date.now()));
      const missed = (data.data || [])
        .filter((c) => c.direction === 'incoming' && ['missed', 'cancelled'].includes(c.status) && new Date(c.createdAt).getTime() > since - 60_000)
        .map((c) => ({ callId: String(c._id), at: c.createdAt, from: c.callerId }));
      if (missed.length) showMissed(missed);
    } catch { /* offline */ }
  }, [showMissed]);

  useEffect(() => {
    catchUp();
    // Opened via ?incoming=<id> from a notification — tidy the URL.
    if (/[?&](incoming|missed)=/.test(window.location.search)) window.history.replaceState(null, '', window.location.pathname);
    const onVisible = () => { if (document.visibilityState === 'visible') catchUp(); };
    const onSw = (e) => { if (e.data?.type === 'call:open_incoming' || e.data?.type === 'push:open') catchUp(); };
    document.addEventListener('visibilitychange', onVisible);
    navigator.serviceWorker?.addEventListener('message', onSw);
    return () => { document.removeEventListener('visibilitychange', onVisible); navigator.serviceWorker?.removeEventListener('message', onSw); };
  }, [catchUp, user?._id]);

  useEffect(() => () => { releaseMedia(); clearTimeout(clearTimer.current); }, [releaseMedia]);

  return (
    <CallContext.Provider value={{ call, startCall, accept, decline, hangup, toggleMute }}>
      {children}
      <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />
    </CallContext.Provider>
  );
}
