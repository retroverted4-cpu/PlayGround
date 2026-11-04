// Catmull-Rom spline path with arc-length lookups.

export class Track {
  constructor(waypoints, samplesPerSegment = 28) {
    this.points = [];
    const pts = waypoints;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let s = 0; s < samplesPerSegment; s++) {
        const t = s / samplesPerSegment;
        this.points.push(catmullRom(p0, p1, p2, p3, t));
      }
    }
    this.points.push({ ...pts[pts.length - 1] });

    this.cum = [0];
    for (let i = 1; i < this.points.length; i++) {
      const a = this.points[i - 1];
      const b = this.points[i];
      this.cum.push(this.cum[i - 1] + Math.hypot(b.x - a.x, b.y - a.y));
    }
    this.length = this.cum[this.cum.length - 1];
  }

  pointAt(d) {
    const t = Math.max(0, Math.min(this.length, d));
    let lo = 0;
    let hi = this.cum.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (this.cum[mid] <= t) lo = mid;
      else hi = mid;
    }
    const a = this.points[lo];
    const b = this.points[Math.min(this.points.length - 1, lo + 1)];
    const span = this.cum[lo + 1] - this.cum[lo] || 1;
    const f = (t - this.cum[lo]) / span;
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  }

  tangentAt(d) {
    const a = this.pointAt(Math.max(0, d - 3));
    const b = this.pointAt(Math.min(this.length, d + 3));
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
  }

  normalAt(d) {
    const t = this.tangentAt(d);
    return { x: -t.y, y: t.x };
  }

  distanceTo(x, y) {
    let best = Infinity;
    const pts = this.points;
    for (let i = 0; i < pts.length; i++) {
      const dx = pts[i].x - x;
      const dy = pts[i].y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < best) best = d2;
    }
    return Math.sqrt(best);
  }
}

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}
