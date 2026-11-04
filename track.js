/* =========================================================
   BLOONS TD 5 — SUNSET GROVE
   Smooth track geometry.
   ========================================================= */
(() => {
  "use strict";
  const BTD = (window.BTD = window.BTD || {});
  const { TAU, clamp } = BTD;

  const DESKTOP_POINTS = [
    [-0.06, 0.29], [0.08, 0.29], [0.16, 0.43], [0.255, 0.55],
    [0.35, 0.575], [0.445, 0.475], [0.445, 0.325], [0.535, 0.195],
    [0.655, 0.19], [0.735, 0.3], [0.715, 0.44], [0.79, 0.56],
    [0.9, 0.6], [0.972, 0.5], [1.06, 0.455]
  ];

  const MOBILE_POINTS = [
    [-0.08, 0.065], [0.17, 0.075], [0.5, 0.105], [0.74, 0.175],
    [0.82, 0.275], [0.69, 0.36], [0.41, 0.37], [0.2, 0.425],
    [0.17, 0.515], [0.27, 0.6], [0.53, 0.635], [0.78, 0.69],
    [0.84, 0.79], [0.72, 0.875], [0.46, 0.92], [0.24, 0.97],
    [0.13, 1.06]
  ];

  class Track {
    constructor(w, h) {
      this.w = w;
      this.h = h;
      const mobile = w / h < 1.18;
      const controls = (mobile ? MOBILE_POINTS : DESKTOP_POINTS).map(([x, y]) => ({ x: x * w, y: y * h }));
      this.controls = controls;
      this.points = this._smooth(controls);
      this.cum = [0];
      this.length = 0;
      for (let i = 1; i < this.points.length; i++) {
        this.length += Math.hypot(this.points[i].x - this.points[i - 1].x, this.points[i].y - this.points[i - 1].y);
        this.cum.push(this.length);
      }
      this.start = this.pointAt(0.012);
      this.end = this.pointAt(0.988);
    }

    _smooth(controls) {
      const pts = [];
      const cp = [controls[0], ...controls, controls[controls.length - 1]];
      for (let i = 1; i < cp.length - 2; i++) {
        const p0 = cp[i - 1];
        const p1 = cp[i];
        const p2 = cp[i + 1];
        const p3 = cp[i + 2];
        const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const steps = clamp(Math.ceil(segLen / 7), 6, 34);
        for (let s = 0; s < steps; s++) {
          const t = s / steps;
          const t2 = t * t;
          const t3 = t2 * t;
          const x = 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
          const y = 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
          pts.push({ x, y });
        }
      }
      pts.push({ ...controls[controls.length - 1] });
      return pts;
    }

    pointAt(t) {
      const target = clamp(t, 0, 1) * this.length;
      let lo = 0;
      let hi = this.cum.length - 1;
      while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (this.cum[mid] <= target) lo = mid;
        else hi = mid;
      }
      const a = this.points[lo];
      const b = this.points[Math.min(lo + 1, this.points.length - 1)];
      const seg = Math.max(0.0001, this.cum[lo + 1] - this.cum[lo]);
      const f = clamp((target - this.cum[lo]) / seg, 0, 1);
      const x = a.x + (b.x - a.x) * f;
      const y = a.y + (b.y - a.y) * f;
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      return { x, y, angle, nx: -Math.sin(angle), ny: Math.cos(angle) };
    }

    nearest(x, y) {
      let best = Infinity;
      let index = 0;
      for (let i = 0; i < this.points.length; i += 2) {
        const p = this.points[i];
        const d = (p.x - x) ** 2 + (p.y - y) ** 2;
        if (d < best) {
          best = d;
          index = i;
        }
      }
      return { distance: Math.sqrt(best), x: this.points[index].x, y: this.points[index].y, index };
    }

    pointAlongDistance(d) {
      return this.pointAt(d / this.length);
    }

    draw(ctx, width, scale) {
      const path = new Path2D();
      path.moveTo(this.points[0].x, this.points[0].y);
      for (let i = 1; i < this.points.length; i++) path.lineTo(this.points[i].x, this.points[i].y);

      ctx.save();
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      // Soft moss shadow / border
      ctx.strokeStyle = "rgba(36, 69, 29, .4)";
      ctx.lineWidth = width + 12 * scale;
      ctx.stroke(path);

      ctx.strokeStyle = "#70502c";
      ctx.lineWidth = width + 3 * scale;
      ctx.stroke(path);

      ctx.strokeStyle = "#b3834b";
      ctx.lineWidth = width - 3 * scale;
      ctx.stroke(path);

      const dirt = ctx.createLinearGradient(0, 0, this.w, this.h);
      dirt.addColorStop(0, "#d9b079");
      dirt.addColorStop(0.5, "#c99d63");
      dirt.addColorStop(1, "#e1ba82");
      ctx.strokeStyle = dirt;
      ctx.lineWidth = width - 10 * scale;
      ctx.stroke(path);

      // Sunlit inner ribbon
      ctx.strokeStyle = "rgba(255, 231, 170, .14)";
      ctx.lineWidth = width * 0.32;
      ctx.stroke(path);
      ctx.restore();

      // Dirt speckles and little stones
      const rng = BTD.makeRng(1977 + Math.round(width));
      for (let i = 0; i < 130; i++) {
        const p = this.pointAt(rng());
        const side = (rng() - 0.5) * width * 0.72;
        const x = p.x + p.nx * side;
        const y = p.y + p.ny * side;
        if (rng() < 0.7) {
          ctx.fillStyle = `rgba(107, 72, 39, ${0.12 + rng() * 0.15})`;
          ctx.beginPath();
          ctx.ellipse(x, y, (1 + rng() * 2.2) * scale, (0.7 + rng() * 1.4) * scale, rng() * 3, 0, TAU);
          ctx.fill();
        } else {
          ctx.fillStyle = `rgba(245, 217, 166, ${0.2 + rng() * 0.22})`;
          ctx.beginPath();
          ctx.ellipse(x, y, (1.2 + rng() * 2.1) * scale, (0.8 + rng() * 1.2) * scale, rng() * 3, 0, TAU);
          ctx.fill();
        }
      }

      // Footprints / tiny dashed trail dots
      ctx.save();
      ctx.setLineDash([2 * scale, 13 * scale]);
      ctx.lineDashOffset = 4;
      ctx.strokeStyle = "rgba(112, 77, 42, .2)";
      ctx.lineWidth = 1.2 * scale;
      ctx.stroke(path);
      ctx.restore();
    }
  }

  BTD.Track = Track;
})();
