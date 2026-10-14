// Phone tones generated with Web Audio (no files to load):
//   ring     — incoming call: classic double ring, repeating
//   ringback — what the caller hears while it rings at the other end
// Also vibrates for incoming calls on phones that support it.

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

const PATTERNS = {
  // UK-style double ring: 0.4 on, 0.2 off, 0.4 on, 2s off
  ring: { every: 3000, play: (c, t) => { beep(c, [400, 450], t, 0.4, 0.18); beep(c, [400, 450], t + 0.6, 0.4, 0.18); }, vibrate: [400, 200, 400] },
  ringback: { every: 3000, play: (c, t) => { beep(c, [400, 450], t, 0.4, 0.07); beep(c, [400, 450], t + 0.6, 0.4, 0.07); } },
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
