// INKWARD's voice is a handful of WebAudio gestures — a brush's swish, a
// seal's soft stamp, the pop of a bursting spirit — synthesised on the spot.
// No samples, no files. The bank stays silent until the first user gesture
// opens the AudioContext, and M mutes it for good until pressed again.

class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  /** Open the context (call from a click or keypress handler). */
  wake() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  tone(freq, dur, { type = 'sine', gain = 0.08, slide = 0, delay = 0 } = {}) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    amp.gain.setValueAtTime(gain, t0);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(amp).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise(dur, { gain = 0.1, delay = 0, low = 400, high = 2400 } = {}) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(high, t0);
    filter.frequency.exponentialRampToValueAtTime(low, t0 + dur);
    const amp = this.ctx.createGain();
    amp.gain.setValueAtTime(gain, t0);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(amp).connect(this.ctx.destination);
    src.start(t0);
  }

  click() { this.tone(660, 0.06, { type: 'triangle', gain: 0.05 }); }
  swish() { this.noise(0.12, { gain: 0.03, low: 900, high: 2600 }); }
  seal() {
    this.tone(320, 0.12, { type: 'triangle', gain: 0.09, slide: -90 });
    this.noise(0.08, { gain: 0.05, low: 500, high: 1800 });
  }
  stamp() {
    this.tone(180, 0.16, { type: 'square', gain: 0.06, slide: -60 });
    this.noise(0.1, { gain: 0.09, low: 300, high: 1200 });
  }
  burst(depth = 0) {
    const lift = Math.min(depth, 6) * 40;
    this.tone(520 + lift, 0.1, { type: 'sine', gain: 0.07, slide: 260 });
    this.noise(0.07, { gain: 0.05, low: 800, high: 3000 });
  }
  hurt() {
    this.tone(140, 0.2, { type: 'sawtooth', gain: 0.08, slide: -60 });
  }
  dash() { this.noise(0.14, { gain: 0.05, low: 1200, high: 3200 }); }
  pickup() { this.tone(880, 0.07, { type: 'sine', gain: 0.04, slide: 220 }); }
  upgrade() {
    this.tone(523, 0.12, { type: 'triangle', gain: 0.07 });
    this.tone(659, 0.12, { type: 'triangle', gain: 0.07, delay: 0.09 });
    this.tone(784, 0.2, { type: 'triangle', gain: 0.08, delay: 0.18 });
  }
  bossHit() {
    this.tone(110, 0.25, { type: 'square', gain: 0.09, slide: -30 });
    this.noise(0.2, { gain: 0.08, low: 200, high: 900 });
  }
  win() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.22, { type: 'triangle', gain: 0.08, delay: i * 0.13 }));
  }
  lose() {
    [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.25, { type: 'triangle', gain: 0.07, delay: i * 0.15 }));
  }
}

export const sfx = new SoundBank();
