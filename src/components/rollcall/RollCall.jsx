import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Siren, ShieldCheck, LifeBuoy, X, ChevronRight, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { rollCallAPI } from '../../api';
import { useSite } from '../../context/SiteContext';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { playSiren, stopSiren, playSound } from '../../utils/sounds';
import Portal from '../ui/Portal';

// Emergency roll-call (module rollcall — never on estates). Guards are in
// every roll-call's "expected" list, and can start / end one.
//   • the running roll-call is checked on load, on socket `rollcall_update`,
//     and every 30s while one runs
//   • unanswered → full-screen takeover (I'm safe / I need help)
//   • answered (or hidden) → a banner at the top of every page
const RollCallContext = createContext(null);
const NOOP = { enabled: false, active: null, needsAnswer: false, refresh: () => {}, respond: async () => {}, end: async () => false, openStart: () => {}, show: () => {} };
export const useRollCall = () => useContext(RollCallContext) || NOOP;

const REASONS = ['Fire', 'Evacuation', 'Security threat', 'Gas leak', 'Drill'];

export function RollCallProvider({ children }) {
  const { isEstate, modules } = useSite();
  const enabled = !isEstate && !!modules?.rollcall;
  const { subscribe } = useSocket() || {};
  const { user } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState(null);
  const [hidden, setHidden] = useState(null); // roll-call id the guard hid the takeover for
  const [starting, setStarting] = useState(false);
  const lastId = useRef(null);

  const refresh = useCallback(async () => {
    if (!enabled) { setActive(null); return; }
    try {
      const { data } = await rollCallAPI.active();
      const rc = data?.data || null;
      setActive(rc);
      lastId.current = rc?._id || null;
    } catch { /* offline or older server — keep what we have */ }
  }, [enabled]);

  useEffect(() => { refresh(); }, [refresh, user?._id]);

  useEffect(() => {
    if (!subscribe || !enabled) return;
    return subscribe('rollcall_update', (p) => {
      if (p?.action === 'started') { setHidden(null); }
      if (p?.action === 'ended' && p._id && String(p._id) === String(lastId.current)) { setActive(null); lastId.current = null; stopSiren(); }
      refresh();
    });
  }, [subscribe, enabled, refresh]);

  // Poll every 30s while one runs
  useEffect(() => {
    if (!enabled || !active?._id) return;
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [enabled, active?._id, refresh]);

  const needsAnswer = enabled && active && !active.endedAt && !active.myResponse;
  const showTakeover = needsAnswer && hidden !== active._id;

  // Siren while the takeover is up
  useEffect(() => {
    if (!showTakeover) return;
    playSiren();
    return () => stopSiren();
  }, [showTakeover]);

  const respond = useCallback(async (status, note = '') => {
    if (!active?._id) return;
    try {
      const { data } = await rollCallAPI.respond(active._id, status, note);
      playSound(status === 'safe' ? 'success' : 'click');
      toast.success(data?.message || (status === 'safe' ? "Marked safe" : 'Help request sent'));
      setActive((a) => (a ? { ...a, myResponse: { status, note, at: new Date().toISOString() } } : a));
      refresh();
    } catch (err) {
      playSound('error');
      toast.error(err.response?.data?.message || 'Could not send — try again');
      throw err;
    }
  }, [active?._id, refresh]);

  const end = useCallback(async () => {
    if (!active?._id) return false;
    try {
      await rollCallAPI.end(active._id);
      playSound('success');
      toast.success('Roll-call ended');
      setActive(null); lastId.current = null;
      return true;
    } catch (err) {
      playSound('error');
      toast.error(err.response?.data?.message || 'Could not end the roll-call');
      return false;
    }
  }, [active?._id]);

  const start = useCallback(async (reason) => {
    try {
      const { data } = await rollCallAPI.start(reason);
      playSound('success');
      toast.success(data?.message || 'Roll-call started — everyone has been alerted');
      setStarting(false);
      await refresh();
      navigate('/rollcall');
    } catch (err) {
      playSound('error');
      toast.error(err.response?.data?.message || 'Could not start the roll-call');
    }
  }, [refresh, navigate]);

  const value = { enabled, active: enabled ? active : null, refresh, respond, end, openStart: () => setStarting(true), show: () => setHidden(null), needsAnswer };

  return (
    <RollCallContext.Provider value={value}>
      {children}
      {showTakeover && <Takeover rc={active} onRespond={respond} onHide={() => setHidden(active._id)} />}
      {starting && <StartModal busy={!!active} onClose={() => setStarting(false)} onStart={start} />}
    </RollCallContext.Provider>
  );
}

/* ── Full-screen takeover: are you safe? ─────────────────────────────── */
function Takeover({ rc, onRespond, onHide }) {
  const [helping, setHelping] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async (status) => {
    setBusy(true);
    try { await onRespond(status, status === 'help' ? note.trim() : ''); } catch { /* toast shown */ } finally { setBusy(false); }
  };
  return (
    <Portal>
      <div className="fixed inset-0 z-[200] flex flex-col text-white" style={{ background: 'radial-gradient(120% 90% at 50% 0%, #DC2626 0%, #7F1D1D 55%, #1F0707 100%)' }}>
        <div className="flex justify-end p-4" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <button onClick={onHide} className="h-10 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-[13px] font-semibold flex items-center gap-1.5">
            <X size={16} /> Hide for now
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-6 flex flex-col items-center justify-center text-center">
          <span className="w-24 h-24 rounded-3xl bg-white/15 border-2 border-white/40 flex items-center justify-center g-alarm">
            <Siren size={48} />
          </span>
          <p className="mt-6 text-[13px] font-bold uppercase tracking-[0.2em] text-white/75">Emergency roll-call</p>
          <h1 className="mt-2 text-[30px] sm:text-[36px] font-extrabold leading-tight max-w-lg" style={{ color: '#fff' }}>
            🚨 Emergency roll-call — {rc.reason || 'Emergency'}
          </h1>
          <p className="mt-3 text-[16px] font-semibold text-white/85">Tell us now: are you safe?</p>

          <div className="mt-8 w-full max-w-md space-y-3">
            <button disabled={busy} onClick={() => send('safe')}
              className="w-full h-[72px] rounded-2xl text-[22px] font-extrabold flex items-center justify-center gap-3 disabled:opacity-60 active:scale-[.99] transition-transform"
              style={{ background: '#16A34A', color: '#fff', border: '3px solid #fff', boxShadow: '0 14px 32px -12px rgba(0,0,0,.6)' }}>
              <ShieldCheck size={28} /> I'm safe
            </button>
            {!helping ? (
              <button disabled={busy} onClick={() => setHelping(true)}
                className="w-full h-[72px] rounded-2xl text-[22px] font-extrabold flex items-center justify-center gap-3 disabled:opacity-60 active:scale-[.99] transition-transform"
                style={{ background: '#fff', color: '#B91C1C', border: '3px solid #fff' }}>
                <LifeBuoy size={28} /> I need help
              </button>
            ) : (
              <div className="rounded-2xl bg-white p-3 text-left">
                <p className="text-[13px] font-bold text-slate-900 mb-1.5">Where are you, and what's wrong? <span className="font-normal text-slate-500">· optional</span></p>
                <textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Trapped at the back gate, injured leg"
                  className="w-full min-h-[72px] rounded-xl p-3 text-[15px] text-slate-900 outline-none" style={{ border: '2px solid #E2E8F0' }} />
                <button disabled={busy} onClick={() => send('help')}
                  className="mt-2 w-full h-14 rounded-xl text-[18px] font-extrabold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: '#DC2626' }}>
                  <Send size={20} /> {busy ? 'Sending…' : 'Send — I need help'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}

/* ── Banner on every page while a roll-call runs ─────────────────────── */
export function RollCallBanner() {
  const { active, needsAnswer, show } = useRollCall();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  if (!active || active.endedAt) return null;
  const mine = active.myResponse;
  return (
    <div className="mb-4 rounded-2xl overflow-hidden g-rise" style={{ background: '#7F1D1D', border: '2px solid #DC2626' }}>
      <div className="px-4 py-3 flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center flex-shrink-0 g-alarm"><Siren size={20} /></span>
        <div className="flex-1 min-w-0 leading-tight">
          <p className="text-[15px] font-extrabold text-white truncate">🚨 Roll-call running — {active.reason || 'Emergency'}</p>
          <p className="text-[12.5px] font-semibold text-red-100 mt-0.5">
            {active.safe} safe · <span className={active.help ? 'text-white underline' : ''}>{active.help} need help</span> · {active.missing} missing
            {mine && <> · You: {mine.status === 'safe' ? 'safe' : 'need help'}</>}
          </p>
        </div>
        {needsAnswer ? (
          <button onClick={show}
            className="h-10 px-3.5 rounded-xl bg-white text-red-700 text-[13.5px] font-extrabold flex-shrink-0">Respond</button>
        ) : pathname !== '/rollcall' && (
          <button onClick={() => navigate('/rollcall')}
            className="h-10 px-3 rounded-xl bg-white/15 text-white text-[13.5px] font-bold flex items-center gap-1 flex-shrink-0">Open <ChevronRight size={15} /></button>
        )}
      </div>
    </div>
  );
}

/* ── Start a roll-call: confirm with a reason ────────────────────────── */
function StartModal({ busy, onClose, onStart }) {
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const go = async () => {
    if (!reason.trim()) return;
    setSending(true);
    try { await onStart(reason.trim()); } finally { setSending(false); }
  };
  return (
    <Portal>
      <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-6">
        <div className="overlay-backdrop" aria-hidden="true" onClick={onClose} />
        <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl animate-slide-down" style={{ maxHeight: '92vh' }}>
          <div className="px-5 pt-5 pb-3 flex items-start gap-3 border-b border-slate-100">
            <span className="w-11 h-11 rounded-xl bg-red-600 text-white flex items-center justify-center flex-shrink-0"><Siren size={21} /></span>
            <div className="flex-1 min-w-0">
              <p className="text-[17px] font-bold text-slate-900 leading-tight">Start an emergency roll-call?</p>
              <p className="text-[12.5px] text-slate-600 mt-0.5">Everyone on site gets a loud alert and must say if they are safe.</p>
            </div>
            <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"><X size={17} /></button>
          </div>
          <div className="px-5 py-4 space-y-3">
            {busy && <p className="text-[13px] font-semibold rounded-xl px-3 py-2" style={{ background: '#FFFBEB', color: '#92400E', border: '1px solid #FCD34D' }}>A roll-call is already running.</p>}
            <p className="text-[13px] font-semibold text-slate-800">Why? <span className="font-normal text-slate-500">· people will see this</span></p>
            <div className="flex flex-wrap gap-1.5">
              {REASONS.map((r) => (
                <button key={r} type="button" onClick={() => setReason(r)}
                  className={`h-10 px-3.5 rounded-lg border-2 text-[14px] font-semibold ${reason === r ? 'border-red-600 bg-red-50 text-red-700' : 'border-slate-200 text-slate-700'}`}>{r}</button>
              ))}
            </div>
            <input className="input-field !h-12" placeholder="Or type the reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={140} />
          </div>
          <div className="px-5 pt-1" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
            <button disabled={!reason.trim() || sending || busy} onClick={go}
              className="w-full h-14 rounded-xl text-[16px] font-extrabold text-white flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50">
              <Siren size={19} /> {sending ? 'Starting…' : 'Start roll-call now'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
