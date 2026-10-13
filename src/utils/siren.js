// Emergency siren. Shared design across the AreaConnect web apps.
//
// Why this exists: the old siren streamed a 9.6 MB MP3 from the API server,
// played it once (no loop), and silently did nothing when the browser
// blocked autoplay. Now:
//   • a small same-origin file (public/sounds/siren.mp3) that loads instantly
//     and is cached by the PWA,
//   • loops until stopped (or `durationMs` elapses),
//   • audio is unlocked on the first tap/keypress so later alerts can play,
//   • falls back to a Web Audio two-tone siren if the MP3 can't play,
//   • vibrates on devices that support it.

const SIREN_SRC = '/sounds/siren.mp3';
const VIBRATE_PATTERN = [600, 300, 600, 300, 600];

let audio = null;
let ctx = null;
let synth = null;      // { osc, gain, timer } while the fallback is sounding
let stopTimer = null;
let vibrateTimer = null;
let playing = false;

function getAudio() {
  if (!audio && typeof Audio !== 'undefined') {
    audio = new Audio(SIREN_SRC);
    audio.preload = 'auto';
    audio.loop = true;
  }
  return audio;
}

function getCtx() {
  try {
    if (!ctx || ctx.state === 'closed') {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch { return null; }
}

// Browsers only allow sound after a user gesture. On the first interaction we
// resume an AudioContext and briefly play the (muted) siren element, which
// "blesses" it so a later alert can start it without a gesture.
function unlock() {
  getCtx();
  const a = getAudio();
  if (a && !playing) {
    a.muted = true;
    a.play().then(() => { if (!playing) { a.pause(); a.currentTime = 0; } a.muted = false; })
      .catch(() => { a.muted = false; });
  }
  ['pointerdown', 'keydown', 'touchend'].forEach((ev) => window.removeEventListener(ev, unlock, true));
}

if (typeof window !== 'undefined') {
  ['pointerdown', 'keydown', 'touchend'].forEach((ev) => window.addEventListener(ev, unlock, true));
}

function startSynth() {
  const c = getCtx();
  if (!c || synth) return;
  try {
    const gain = c.createGain();
    gain.gain.value = 0.25;
    gain.connect(c.destination);
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.connect(gain);
    osc.start();
    let high = false;
    const sweep = () => {
      const t = c.currentTime;
      osc.frequency.cancelScheduledValues(t);
      osc.frequency.setValueAtTime(high ? 960 : 640, t);
      osc.frequency.linearRampToValueAtTime(high ? 640 : 960, t + 0.45);
      high = !high;
    };
    sweep();
    synth = { osc, gain, timer: setInterval(sweep, 450) };
  } catch { synth = null; }
}

function stopSynth() {
  if (!synth) return;
  clearInterval(synth.timer);
  try { synth.osc.stop(); synth.osc.disconnect(); synth.gain.disconnect(); } catch {}
  synth = null;
}

export function isSirenPlaying() { return playing; }

export function stopSiren() {
  playing = false;
  clearTimeout(stopTimer);
  clearInterval(vibrateTimer);
  stopSynth();
  try { navigator.vibrate?.(0); } catch {}
  const a = audio;
  if (a) { try { a.pause(); a.currentTime = 0; } catch {} }
}

export function playSiren({ durationMs = 60000 } = {}) {
  stopSiren();
  playing = true;

  const a = getAudio();
  if (a) {
    a.muted = false;
    a.loop = true;
    try { a.currentTime = 0; } catch {}
    const p = a.play();
    if (p && typeof p.catch === 'function') p.catch(() => { if (playing) startSynth(); });
  } else {
    startSynth();
  }

  try {
    if (navigator.vibrate) {
      navigator.vibrate(VIBRATE_PATTERN);
      vibrateTimer = setInterval(() => navigator.vibrate(VIBRATE_PATTERN), 3000);
    }
  } catch {}

  stopTimer = setTimeout(stopSiren, durationMs);
}
