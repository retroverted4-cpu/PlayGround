/* =========================================================
   BLOONS TD 5 — SUNSET GROVE
   Tiny synthesized sound engine (no audio assets).
   ========================================================= */
(() => {
  "use strict";
  const BTD = (window.BTD = window.BTD || {});

  const Sound = {
    ctx: null,
    master: null,
    muted: false,
    _last: Object.create(null),

    init() {
      if (this.ctx) {
        if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.26;
        this.master.connect(this.ctx.destination);
      } catch {
        this.ctx = null;
      }
    },

    setMuted(muted) {
      this.muted = muted;
      if (this.master) this.master.gain.value = muted ? 0 : 0.26;
    },

    _ok() {
      return this.ctx && !this.muted && this.ctx.state === "running";
    },

    _throttle(name, seconds) {
      if (!this.ctx) return false;
      const now = this.ctx.currentTime;
      if (this._last[name] && now - this._last[name] < seconds) return false;
      this._last[name] = now;
      return true;
    },

    tone(freq, opts = {}) {
      if (!this._ok()) return;
      const {
        type = "sine",
        dur = 0.15,
        vol = 0.15,
        slide = 0,
        delay = 0,
        attack = 0.006,
        release = null
      } = opts;
      const t0 = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(30, freq), t0);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + (release || dur));
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + (release || dur) + 0.03);
    },

    noise(opts = {}) {
      if (!this._ok()) return;
      const { dur = 0.15, vol = 0.12, delay = 0, freq = 900, q = 0.8, type = "lowpass" } = opts;
      const t0 = this.ctx.currentTime + delay;
      const length = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = freq;
      filter.Q.value = q;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start(t0);
    },

    play(name, pitch = 0) {
      if (!this._ok()) return;
      switch (name) {
        case "pop": {
          if (!this._throttle("pop", 0.032)) return;
          const f = 520 + pitch * 55 + Math.random() * 150;
          this.tone(f, { type: "triangle", dur: 0.075, vol: 0.11, slide: -180 });
          this.tone(f * 1.9, { type: "sine", dur: 0.04, vol: 0.04, slide: -100 });
          break;
        }
        case "bigPop":
          if (!this._throttle("bigPop", 0.08)) return;
          this.tone(190, { type: "square", dur: 0.18, vol: 0.16, slide: -80 });
          this.noise({ dur: 0.22, vol: 0.15, freq: 1100 });
          break;
        case "shoot":
          if (!this._throttle("shoot", 0.045)) return;
          this.tone(760 + Math.random() * 170, { type: "square", dur: 0.035, vol: 0.026, slide: -180 });
          break;
        case "boomerang":
          if (!this._throttle("boomerang", 0.1)) return;
          this.tone(430, { type: "triangle", dur: 0.15, vol: 0.045, slide: 300 });
          break;
        case "bomb":
          if (!this._throttle("bomb", 0.12)) return;
          this.tone(120, { type: "sine", dur: 0.28, vol: 0.18, slide: -55 });
          this.noise({ dur: 0.3, vol: 0.15, freq: 500 });
          break;
        case "freeze":
          if (!this._throttle("freeze", 0.2)) return;
          this.tone(990, { type: "sine", dur: 0.23, vol: 0.06, slide: 480 });
          this.tone(1320, { type: "sine", dur: 0.28, vol: 0.04, slide: 300, delay: 0.03 });
          break;
        case "glue":
          if (!this._throttle("glue", 0.1)) return;
          this.tone(260, { type: "sine", dur: 0.12, vol: 0.055, slide: 90 });
          break;
        case "sniper":
          if (!this._throttle("sniper", 0.08)) return;
          this.noise({ dur: 0.09, vol: 0.14, freq: 2300, type: "bandpass", q: 1.4 });
          this.tone(170, { type: "square", dur: 0.12, vol: 0.1, slide: -70 });
          break;
        case "place":
          this.tone(392, { type: "sine", dur: 0.14, vol: 0.12 });
          this.tone(523, { type: "sine", dur: 0.18, vol: 0.1, delay: 0.07 });
          this.tone(659, { type: "triangle", dur: 0.22, vol: 0.07, delay: 0.13 });
          break;
        case "upgrade":
          this.tone(523, { type: "triangle", dur: 0.12, vol: 0.1 });
          this.tone(659, { type: "triangle", dur: 0.12, vol: 0.1, delay: 0.08 });
          this.tone(784, { type: "triangle", dur: 0.14, vol: 0.1, delay: 0.16 });
          this.tone(1046, { type: "sine", dur: 0.28, vol: 0.08, delay: 0.24 });
          break;
        case "sell":
          this.tone(520, { type: "triangle", dur: 0.1, vol: 0.09 });
          this.tone(390, { type: "triangle", dur: 0.14, vol: 0.08, delay: 0.07 });
          break;
        case "error":
          this.tone(160, { type: "square", dur: 0.1, vol: 0.05, slide: -30 });
          break;
        case "click":
          this.tone(620, { type: "sine", dur: 0.03, vol: 0.035, slide: 70 });
          break;
        case "life":
          this.tone(140, { type: "sawtooth", dur: 0.35, vol: 0.09, slide: -60 });
          this.noise({ dur: 0.16, vol: 0.08, freq: 380 });
          break;
        case "round":
          this.tone(196, { type: "sawtooth", dur: 0.34, vol: 0.055, slide: 30 });
          this.tone(294, { type: "triangle", dur: 0.4, vol: 0.08, delay: 0.16 });
          this.tone(392, { type: "triangle", dur: 0.48, vol: 0.075, delay: 0.32 });
          break;
        case "boss":
          this.tone(82, { type: "sawtooth", dur: 0.7, vol: 0.12, slide: -20 });
          this.tone(110, { type: "square", dur: 0.6, vol: 0.06, delay: 0.16 });
          this.noise({ dur: 0.8, vol: 0.08, freq: 220 });
          break;
        case "win":
          [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, { type: "triangle", dur: 0.32, vol: 0.1, delay: i * 0.12 }));
          this.tone(1568, { type: "sine", dur: 0.7, vol: 0.08, delay: 0.64 });
          break;
        case "lose":
          [392, 330, 262, 196].forEach((f, i) => this.tone(f, { type: "triangle", dur: 0.38, vol: 0.11, delay: i * 0.18, slide: -18 }));
          break;
        default:
          break;
      }
    }
  };

  BTD.Sound = Sound;
})();
