// AudioWorklet: G.711 μ-law frames (16 kHz) → jitter buffer → speakers.
// Frames arrive via port.postMessage(Uint8Array). Keeps ~100 ms buffered to
// absorb network jitter; plays silence on underrun and skips ahead if the
// buffer grows too large (so latency never creeps up).
const IN_RATE = 16000;

function mulawToLinear(u) {
  u = ~u & 0xff;
  const sign = u & 0x80, exponent = (u >> 4) & 0x07, mantissa = u & 0x0f;
  let s = ((mantissa << 3) + 0x84) << exponent;
  s -= 0x84;
  return (sign ? -s : s) / 32768;
}
const TABLE = new Float32Array(256);
for (let i = 0; i < 256; i++) TABLE[i] = mulawToLinear(i);

class CallPlayer extends AudioWorkletProcessor {
  constructor() {
    super();
    this.size = IN_RATE * 2;              // 2 s ring buffer at 16 kHz
    this.buf = new Float32Array(this.size);
    this.w = 0;                            // write index
    this.r = 0;                            // read position (fractional)
    this.count = 0;                        // samples buffered
    this.started = false;
    this.target = IN_RATE * 0.1;           // aim for 100 ms buffered
    this.max = IN_RATE * 0.35;             // above this, drop back to target
    this.step = IN_RATE / sampleRate;      // input samples per output sample
    this.received = 0;
    this.port.onmessage = (e) => {
      if (e.data === 'flush') { this.count = 0; this.started = false; return; }
      const frame = e.data;
      for (let i = 0; i < frame.length; i++) {
        this.buf[this.w] = TABLE[frame[i]];
        this.w = (this.w + 1) % this.size;
      }
      this.count = Math.min(this.size, this.count + frame.length);
      this.received++;
      if (this.count > this.max) { // too far behind: skip ahead to the target
        const skip = this.count - this.target;
        this.r = (this.r + skip) % this.size;
        this.count -= skip;
      }
    };
  }
  process(_inputs, outputs) {
    const out = outputs[0][0];
    if (!this.started && this.count >= this.target) this.started = true;
    for (let i = 0; i < out.length; i++) {
      if (!this.started || this.count < 2) { out[i] = 0; this.started = false; continue; }
      const i0 = Math.floor(this.r) % this.size;
      const i1 = (i0 + 1) % this.size;
      const frac = this.r - Math.floor(this.r);
      out[i] = this.buf[i0] + (this.buf[i1] - this.buf[i0]) * frac;
      this.r += this.step;
      if (this.r >= this.size) this.r -= this.size;
      this.count -= this.step;
    }
    for (let c = 1; c < outputs[0].length; c++) outputs[0][c].set(out);
    return true;
  }
}
registerProcessor('call-player', CallPlayer);
