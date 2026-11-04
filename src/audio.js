// Small WebAudio synth — no external assets needed.

export class AudioKit {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.lastPop = 0;
    this.popBudget = 0;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.enabled ? 0.3 : 0;
    this.master.connect(this.ctx.destination);
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? 0.3 : 0;
  }

  get t() { return this.ctx ? this.ctx.currentTime : 0; }

  tone({ freq = 440, end = null, dur = 0.12, type = "sine", vol = 0.2, delay = 0, attack = 0.005 }) {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.t + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (end) osc.frequency.exponentialRampToValueAtTime(Math.max(24, end), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise({ dur = 0.1, vol = 0.15, freq = 1800, q = 0.8, delay = 0, type = "bandpass" }) {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.t + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(120, freq * 0.3), t0 + dur);
    filter.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t0);
  }

  pop(size = 14) {
    if (!this.enabled || !this.ctx) return;
    const now = performance.now();
    if (now - this.lastPop < 34) return;
    this.lastPop = now;
    const base = 620 + (14 - size) * 14 + Math.random() * 120;
    this.tone({ freq: base, end: base * 0.45, dur: 0.09, type: "triangle", vol: 0.11 });
    this.noise({ dur: 0.055, vol: 0.055, freq: 2400 });
  }

  shoot(kind = "dart") {
    if (!this.enabled || !this.ctx) return;
    const cfg = {
      dart: { freq: 900, end: 480, dur: 0.055, type: "square", vol: 0.035 },
      tack: { freq: 1300, end: 700, dur: 0.04, type: "square", vol: 0.025 },
      boomerang: { freq: 300, end: 520, dur: 0.12, type: "sine", vol: 0.05 },
      bomb: { freq: 110, end: 48, dur: 0.16, type: "sawtooth", vol: 0.09 },
      laser: { freq: 1500, end: 900, dur: 0.03, type: "sawtooth", vol: 0.02 },
      magic: { freq: 720, end: 1100, dur: 0.09, type: "triangle", vol: 0.04 },
      sniper: { freq: 180, end: 70, dur: 0.14, type: "square", vol: 0.06 },
    }[kind] || { freq: 700, end: 400, dur: 0.05, type: "triangle", vol: 0.03 };
    this.tone(cfg);
  }

  boom() {
    this.noise({ dur: 0.34, vol: 0.24, freq: 700, q: 0.5, type: "lowpass" });
    this.tone({ freq: 90, end: 34, dur: 0.3, type: "sine", vol: 0.22 });
  }

  ice() {
    this.tone({ freq: 1400, end: 2300, dur: 0.24, type: "sine", vol: 0.05 });
    this.tone({ freq: 2100, end: 1100, dur: 0.3, type: "triangle", vol: 0.03, delay: 0.04 });
  }

  place() {
    this.tone({ freq: 300, end: 520, dur: 0.1, type: "triangle", vol: 0.1 });
    this.tone({ freq: 600, end: 760, dur: 0.1, type: "sine", vol: 0.06, delay: 0.07 });
  }

  upgrade() {
    [523, 659, 784, 1046].forEach((f, i) => {
      this.tone({ freq: f, dur: 0.16, type: "triangle", vol: 0.07, delay: i * 0.06 });
    });
  }

  error() {
    this.tone({ freq: 180, end: 130, dur: 0.18, type: "square", vol: 0.06 });
  }

  sell() {
    this.tone({ freq: 520, end: 260, dur: 0.14, type: "triangle", vol: 0.08 });
  }

  leak() {
    this.tone({ freq: 150, end: 60, dur: 0.4, type: "sawtooth", vol: 0.14 });
    this.noise({ dur: 0.25, vol: 0.1, freq: 500, type: "lowpass" });
  }

  waveStart() {
    [392, 523, 659].forEach((f, i) => {
      this.tone({ freq: f, dur: 0.2, type: "triangle", vol: 0.07, delay: i * 0.09 });
    });
  }

  roundClear() {
    [659, 784, 1046, 1318].forEach((f, i) => {
      this.tone({ freq: f, dur: 0.24, type: "triangle", vol: 0.07, delay: i * 0.08 });
    });
  }

  win() {
    [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => {
      this.tone({ freq: f, dur: 0.42, type: "triangle", vol: 0.08, delay: i * 0.12 });
    });
  }

  lose() {
    [392, 330, 262, 196].forEach((f, i) => {
      this.tone({ freq: f, dur: 0.5, type: "sawtooth", vol: 0.06, delay: i * 0.16 });
    });
  }

  moab() {
    this.tone({ freq: 70, end: 40, dur: 1.2, type: "sawtooth", vol: 0.12 });
    this.noise({ dur: 1.4, vol: 0.1, freq: 300, type: "lowpass" });
  }
}
