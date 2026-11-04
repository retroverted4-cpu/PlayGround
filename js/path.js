function lerp(a, b, t) {
  return a + (b - a) * t;
}

function chaikin(points, iterations = 3) {
  let current = points.map(([x, y]) => ({ x, y }));
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const next = [current[0]];
    for (let i = 0; i < current.length - 1; i += 1) {
      const a = current[i];
      const b = current[i + 1];
      next.push(
        { x: lerp(a.x, b.x, 0.25), y: lerp(a.y, b.y, 0.25) },
        { x: lerp(a.x, b.x, 0.75), y: lerp(a.y, b.y, 0.75) },
      );
    }
    next.push(current[current.length - 1]);
    current = next;
  }
  return current;
}

export function createPath(anchors, iterations = 3) {
  const poly = chaikin(anchors, iterations);
  const lengths = [];
  let total = 0;
  for (let i = 0; i < poly.length - 1; i += 1) {
    const a = poly[i];
    const b = poly[i + 1];
    total += Math.hypot(b.x - a.x, b.y - a.y);
    lengths.push(total);
  }
  return { poly, lengths, total };
}

let paths = [];

export function setPaths(anchorSets) {
  paths = anchorSets.map((anchors) => createPath(anchors));
  return paths;
}

export function getPaths() {
  return paths;
}

export function getPathCount() {
  return paths.length;
}

export function getPathTotal(track = 0) {
  return paths[track]?.total || 0;
}

export function pathPoint(track, distance, out = {}) {
  const path = paths[track] || paths[0];
  if (!path) {
    out.x = 0;
    out.y = 0;
    out.tx = 1;
    out.ty = 0;
    out.nx = 0;
    out.ny = 1;
    out.angle = 0;
    return out;
  }
  const total = path.total;
  const d = Math.max(0, Math.min(total - 0.0001, distance));
  let lo = 0;
  let hi = path.lengths.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (path.lengths[mid] < d) lo = mid + 1;
    else hi = mid;
  }
  const index = Math.max(0, lo);
  const a = path.poly[index];
  const b = path.poly[Math.min(path.poly.length - 1, index + 1)];
  const start = index === 0 ? 0 : path.lengths[index - 1];
  const length = Math.max(0.0001, path.lengths[index] - start);
  const t = Math.max(0, Math.min(1, (d - start) / length));
  out.x = lerp(a.x, b.x, t);
  out.y = lerp(a.y, b.y, t);
  out.tx = (b.x - a.x) / length;
  out.ty = (b.y - a.y) / length;
  out.nx = -out.ty;
  out.ny = out.tx;
  out.angle = Math.atan2(out.ty, out.tx);
  return out;
}

function segmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq < 0.0001) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

export function distanceToPaths(x, y) {
  let best = Infinity;
  for (const path of paths) {
    for (let i = 0; i < path.poly.length - 1; i += 1) {
      const a = path.poly[i];
      const b = path.poly[i + 1];
      const d = segmentDistance(x, y, a.x, a.y, b.x, b.y);
      if (d < best) best = d;
    }
  }
  return best;
}

export function closestPathInfo(x, y) {
  let best = Infinity;
  let bestDistance = 0;
  let bestTrack = 0;
  for (let track = 0; track < paths.length; track += 1) {
    const path = paths[track];
    let running = 0;
    for (let i = 0; i < path.poly.length - 1; i += 1) {
      const a = path.poly[i];
      const b = path.poly[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const lengthSq = dx * dx + dy * dy;
      const length = Math.sqrt(lengthSq);
      if (length < 0.0001) continue;
      let t = ((x - a.x) * dx + (y - a.y) * dy) / lengthSq;
      t = Math.max(0, Math.min(1, t));
      const qx = a.x + dx * t;
      const qy = a.y + dy * t;
      const d = Math.hypot(x - qx, y - qy);
      if (d < best) {
        best = d;
        bestDistance = running + length * t;
        bestTrack = track;
      }
      running += length;
    }
  }
  return { distance: best, pathDistance: bestDistance, track: bestTrack };
}
