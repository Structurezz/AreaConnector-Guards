// AudioWorklet: microphone → 16 kHz mono → G.711 μ-law → 40 ms frames.
// Posts each frame (Uint8Array, 640 bytes) to the main thread, which sends
// it over the socket audio relay.
const OUT_RATE = 16000;
const FRAME = 640; // 40 ms at 16 kHz

function linearToMulaw(sample) {
  const BIAS = 0x84, CLIP = 32635;
  let s = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
  const sign = (s >> 8) & 0x80;
  if (sign) s = -s;
  if (s > CLIP) s = CLIP;
  s += BIAS;
  let exponent = 7;
  for (let mask = 0x4000; (s & mask) === 0 && exponent > 0; exponent--, mask >>= 1) {}
  const mantissa = (s >> (exponent + 3)) & 0x0f;
  return ~(sign | (exponent << 4) | mantissa) & 0xff;
}

class CallCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.step = sampleRate / OUT_RATE; // input samples per output sample
    this.pos = 0;                       // fractional read position in current block
    this.prev = 0;                      // last input sample (for interpolation across blocks)
    this.frame = new Uint8Array(FRAME);
    this.n = 0;
  }
  process(inputs) {
    const input = inputs[0] && inputs[0][0];
    if (!input) return true;
    // Linear-interpolating resampler from the context rate down to 16 kHz.
    while (this.pos < input.length) {
      const i = Math.floor(this.pos);
      const frac = this.pos - i;
      const a = i === 0 ? this.prev : input[i - 1];
      const b = input[i];
      this.frame[this.n++] = linearToMulaw(a + (b - a) * frac);
      if (this.n === FRAME) {
        this.port.postMessage(this.frame, [this.frame.buffer]);
        this.frame = new Uint8Array(FRAME);
        this.n = 0;
      }
      this.pos += this.step;
    }
    this.pos -= input.length;
    this.prev = input[input.length - 1];
    return true;
  }
}
registerProcessor('call-capture', CallCapture);
