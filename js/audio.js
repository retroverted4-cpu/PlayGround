export class Sound {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
    this.lastPlayed = new Map();
  }

  ensure() {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.62;
      this.master.connect(this.ctx.destination);
      const length = Math.floor(this.ctx.sampleRate * 0.7);
      this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.master) this.master.gain.value = enabled ? 0.62 : 0;
  }

  throttled(key, ms) {
    const now = performance.now();
    if ((this.lastPlayed.get(key) || 0) + ms > now) return true;
    this.lastPlayed.set(key, now);
    return false;
  }

  tone(freq, duration, options = {}) {
    const ctx = this.ensure();
    if (!ctx) return;
    const {
      type = 'sine', gain = 0.08, delay = 0, slide = 0, attack = 0.004,
    } = options;
    const now = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator();
    const volume = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, freq), now);
    if (slide) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), now + duration);
    volume.gain.setValueAtTime(0.0001, now);
    volume.gain.linearRampToValueAtTime(gain, now + attack);
    volume.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(volume);
    volume.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  }

  noise(duration, gain = 0.08, options = {}) {
    const ctx = this.ensure();
    if (!ctx || !this.noiseBuffer) return;
    const { delay = 0, frequency = 900, type = 'bandpass', q = 0.9 } = options;
    const now = ctx.currentTime + delay;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const volume = ctx.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    volume.gain.setValueAtTime(gain, now);
    volume.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(volume);
    volume.connect(this.master);
    source.start(now);
    source.stop(now + duration + 0.02);
  }

  pop(hard = false) {
    if (!this.enabled || this.throttled('pop', 22)) return;
    const base = hard ? 170 : 330 + Math.random() * 160;
    this.tone(base, 0.075, { type: 'triangle', gain: hard ? 0.09 : 0.045, slide: -base * 0.45 });
    this.noise(0.045, hard ? 0.035 : 0.014, { frequency: hard ? 780 : 1800, q: 1.2 });
  }

  shoot(kind = 'dart') {
    if (!this.enabled || this.throttled(`shoot-${kind}`, 28)) return;
    if (kind === 'bomb') {
      this.tone(120, 0.1, { type: 'sawtooth', gain: 0.035, slide: 40 });
      return;
    }
    if (kind === 'super' || kind === 'plasma' || kind === 'laser') {
      this.tone(760, 0.07, { type: 'square', gain: 0.018, slide: -220 });
      return;
    }
    this.tone(520, 0.05, { type: 'triangle', gain: 0.025, slide: -140 });
  }

  boom() {
    if (!this.enabled) return;
    this.tone(85, 0.3, { type: 'sine', gain: 0.14, slide: -38 });
    this.noise(0.26, 0.1, { frequency: 240, type: 'lowpass', q: 0.5 });
  }

  freeze() {
    if (!this.enabled) return;
    this.tone(1450, 0.22, { type: 'sine', gain: 0.035, slide: 380 });
    this.tone(1900, 0.18, { type: 'triangle', gain: 0.02, slide: 220, delay: 0.025 });
  }

  glue() {
    if (!this.enabled || this.throttled('glue', 55)) return;
    this.tone(230, 0.11, { type: 'sine', gain: 0.045, slide: -90 });
  }

  cash() {
    if (!this.enabled) return;
    this.tone(880, 0.09, { type: 'triangle', gain: 0.04 });
    this.tone(1320, 0.12, { type: 'triangle', gain: 0.028, delay: 0.055 });
  }

  upgrade() {
    if (!this.enabled) return;
    const notes = [523, 659, 784, 1046];
    notes.forEach((note, index) => {
      this.tone(note, 0.18, { type: 'triangle', gain: 0.042, delay: index * 0.045 });
    });
  }

  build() {
    if (!this.enabled) return;
    this.tone(180, 0.13, { type: 'sine', gain: 0.07, slide: 45 });
    this.tone(360, 0.09, { type: 'triangle', gain: 0.03, delay: 0.04 });
  }

  sell() {
    if (!this.enabled) return;
    this.tone(620, 0.09, { type: 'triangle', gain: 0.04 });
    this.tone(420, 0.13, { type: 'triangle', gain: 0.03, delay: 0.06 });
  }

  deny() {
    if (!this.enabled || this.throttled('deny', 140)) return;
    this.tone(170, 0.11, { type: 'square', gain: 0.035, slide: -40 });
  }

  leak() {
    if (!this.enabled) return;
    this.tone(95, 0.35, { type: 'sawtooth', gain: 0.11, slide: -45 });
    this.noise(0.22, 0.08, { frequency: 180, type: 'lowpass' });
  }

  wave() {
    if (!this.enabled) return;
    this.tone(392, 0.2, { type: 'triangle', gain: 0.045 });
    this.tone(523, 0.2, { type: 'triangle', gain: 0.04, delay: 0.09 });
    this.tone(784, 0.35, { type: 'triangle', gain: 0.036, delay: 0.18 });
  }

  victory() {
    if (!this.enabled) return;
    const melody = [523, 659, 784, 1046, 1318, 1046, 1318];
    melody.forEach((note, index) => {
      this.tone(note, 0.38, { type: 'triangle', gain: 0.05, delay: index * 0.12 });
    });
  }

  defeat() {
    if (!this.enabled) return;
    const melody = [392, 349, 311, 233];
    melody.forEach((note, index) => {
      this.tone(note, 0.55, { type: 'sine', gain: 0.06, delay: index * 0.18, slide: -22 });
    });
  }

  click() {
    if (!this.enabled || this.throttled('click', 50)) return;
    this.tone(660, 0.04, { type: 'triangle', gain: 0.02 });
  }
}
