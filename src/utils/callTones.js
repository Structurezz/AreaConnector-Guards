// Phone tones generated with Web Audio (no files to load):
//   ring     — INCOMING call: a melodic marimba-style ringtone, repeating,
//              plus vibration on phones. Deliberately different from…
//   ringback — what the CALLER hears while it rings at the other end: the
//              classic double "brr-brr" phone tone.

let ctx = null;
let timer = null;
let nodes = [];

function getCtx() {
  try {
    if (!ctx || ctx.state === 'closed') ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch { return null; }
}

// Flat-topped beep (telephone ringback).
function beep(c, freqs, start, dur, vol) {
  const gain = c.createGain();
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(vol, start + 0.02);
  gain.gain.setValueAtTime(vol, start + dur - 0.03);
  gain.gain.linearRampToValueAtTime(0, start + dur);
  gain.connect(c.destination);
  freqs.forEach((f) => {
    const o = c.createOscillator();
    o.frequency.value = f;
    o.connect(gain);
    o.start(start);
    o.stop(start + dur);
    nodes.push(o);
  });
}

// Plucked mallet note: quick attack, ringing decay, with a soft octave
// overtone so it sounds like a marimba rather than a beep.
function pluck(c, freq, start, vol = 0.22, decay = 0.55) {
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(vol, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + decay);
  gain.connect(c.destination);
  [[freq, 'sine', 1], [freq * 2, 'sine', 0.25], [freq * 3.01, 'triangle', 0.08]].forEach(([f, type, level]) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.value = level;
    o.connect(g).connect(gain);
    o.start(start);
    o.stop(start + decay + 0.05);
    nodes.push(o);
  });
}

// E5 G#5 B5 E6 · B5 E6 — a cheerful rising phrase, played twice per cycle.
const RING_PHRASE = [[659.25, 0], [830.61, 0.14], [987.77, 0.28], [1318.51, 0.42], [987.77, 0.7], [1318.51, 0.84]];

const PATTERNS = {
  ring: {
    every: 2600,
    play: (c, t) => RING_PHRASE.forEach(([f, dt]) => pluck(c, f, t + dt, dt >= 0.7 ? 0.18 : 0.22)),
    vibrate: [250, 120, 250, 120, 500],
  },
  ringback: {
    every: 3000,
    play: (c, t) => { beep(c, [400, 450], t, 0.4, 0.07); beep(c, [400, 450], t + 0.6, 0.4, 0.07); },
  },
};

export function startTone(kind) {
  stopTone();
  const p = PATTERNS[kind];
  const c = getCtx();
  if (!p) return;
  const tick = () => {
    if (c) p.play(c, c.currentTime + 0.05);
    if (p.vibrate) { try { navigator.vibrate?.(p.vibrate); } catch {} }
  };
  tick();
  timer = setInterval(tick, p.every);
}

export function stopTone() {
  clearInterval(timer);
  timer = null;
  nodes.forEach((o) => { try { o.stop(); } catch {} });
  nodes = [];
  try { navigator.vibrate?.(0); } catch {}
}
