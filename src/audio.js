// Tiny synthesized sound engine: no audio files, no autoplay surprises.
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.master = null;
    this.lastShot = 0;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.16;
    this.master.connect(this.ctx.destination);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(enabled ? 0.16 : 0, this.ctx.currentTime, 0.03);
    }
  }

  tone(freq, duration, { type = 'sine', volume = 0.3, slide = 0, delay = 0 } = {}) {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  noise(duration, { volume = 0.25, filter = 800, delay = 0 } = {}) {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime + delay;
    const length = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const biquad = this.ctx.createBiquadFilter();
    biquad.type = 'lowpass';
    biquad.frequency.value = filter;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    source.connect(biquad).connect(gain).connect(this.master);
    source.start(now);
  }

  pop(big = false) {
    if (!this.enabled || !this.ctx) return;
    const base = big ? 130 : 280 + Math.random() * 220;
    this.tone(base, big ? 0.24 : 0.08, { type: 'triangle', volume: big ? 0.45 : 0.22, slide: -base * 0.55 });
    this.noise(big ? 0.22 : 0.05, { volume: big ? 0.3 : 0.08, filter: big ? 500 : 1600 });
  }

  shoot(kind = 'dart') {
    if (!this.enabled || !this.ctx) return;
    const now = performance.now();
    if (now - this.lastShot < 42) return;
    this.lastShot = now;
    if (kind === 'sniper') {
      this.tone(190, 0.18, { type: 'sawtooth', volume: 0.32, slide: -100 });
      this.noise(0.12, { volume: 0.18, filter: 1300 });
    } else if (kind === 'bomb') {
      this.tone(110, 0.13, { type: 'square', volume: 0.16, slide: -50 });
    } else if (kind === 'super') {
      this.tone(1050, 0.035, { type: 'square', volume: 0.04, slide: -300 });
    } else if (kind === 'rang') {
      this.tone(520, 0.07, { type: 'triangle', volume: 0.08, slide: 140 });
    } else {
      this.tone(760, 0.045, { type: 'triangle', volume: 0.07, slide: -220 });
    }
  }

  explode() {
    this.noise(0.38, { volume: 0.45, filter: 520 });
    this.tone(70, 0.32, { type: 'sawtooth', volume: 0.4, slide: -38 });
  }

  place() {
    this.tone(340, 0.1, { type: 'triangle', volume: 0.16, slide: 120 });
    this.tone(520, 0.13, { type: 'triangle', volume: 0.12, slide: 160, delay: 0.07 });
  }

  sell() {
    this.tone(620, 0.08, { type: 'triangle', volume: 0.13, slide: -80 });
    this.tone(440, 0.1, { type: 'triangle', volume: 0.1, slide: -80, delay: 0.07 });
  }

  upgrade() {
    [523, 659, 784].forEach((freq, index) => {
      this.tone(freq, 0.16, { type: 'triangle', volume: 0.14, slide: 20, delay: index * 0.065 });
    });
  }

  startWave() {
    [392, 523, 659, 784].forEach((freq, index) => {
      this.tone(freq, 0.3, { type: 'triangle', volume: 0.2, delay: index * 0.075 });
    });
  }

  victory() {
    [523, 659, 784, 1046, 1318].forEach((freq, index) => {
      this.tone(freq, 0.5, { type: 'triangle', volume: 0.2, delay: index * 0.13 });
    });
  }

  defeat() {
    [330, 294, 262, 196].forEach((freq, index) => {
      this.tone(freq, 0.45, { type: 'sawtooth', volume: 0.13, delay: index * 0.16 });
    });
  }

  click() {
    this.tone(660, 0.04, { type: 'triangle', volume: 0.08, slide: 80 });
  }

  alert() {
    this.tone(220, 0.25, { type: 'square', volume: 0.1, slide: 60 });
  }
}
