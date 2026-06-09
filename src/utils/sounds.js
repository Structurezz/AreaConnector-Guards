let _ctx = null;

// Called on first user click — unlocks the AudioContext for the entire session.
// Browsers block audio until a user gesture has occurred; once unlocked it stays running.
function unlock() {
  try {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (_ctx.state === 'suspended') _ctx.resume();
  } catch {}
}

if (typeof window !== 'undefined') {
  window.addEventListener('click',   unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

function getCtx() {
  if (!_ctx || _ctx.state === 'closed') {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

function tone(c, freq, duration, type = 'sine', volume = 0.18, delay = 0) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = type;
  osc.frequency.value = freq;
  const t = c.currentTime + delay;
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.start(t);
  osc.stop(t + duration);
}

const SOUNDS = {
  click:   (c) => tone(c, 1000, 0.05, 'sine',     0.15),
  success: (c) => { tone(c, 440, 0.12, 'sine', 0.18); tone(c, 660, 0.15, 'sine', 0.18, 0.13); },
  error:   (c) => tone(c, 260, 0.35, 'sawtooth',  0.15),
  checkin: (c) => { tone(c, 440, 0.10, 'sine', 0.18); tone(c, 550, 0.10, 'sine', 0.18, 0.11); tone(c, 660, 0.15, 'sine', 0.18, 0.22); },
};

export function playSound(type) {
  try {
    const fn = SOUNDS[type];
    if (fn) fn(getCtx());
  } catch {}
}

export function playSiren(loops = 5) {
  try {
    const c = getCtx();
    const gain = c.createGain();
    gain.connect(c.destination);
    const loopDuration = 0.6;
    for (let i = 0; i < loops; i++) {
      const osc = c.createOscillator();
      osc.connect(gain);
      const t = c.currentTime + i * loopDuration;
      osc.frequency.setValueAtTime(480, t);
      osc.frequency.linearRampToValueAtTime(920, t + loopDuration * 0.5);
      osc.frequency.linearRampToValueAtTime(480, t + loopDuration);
      osc.start(t);
      osc.stop(t + loopDuration);
    }
    gain.gain.setValueAtTime(0.7, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + loops * loopDuration);
  } catch {}
}
