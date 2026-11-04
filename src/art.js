import {
  BALLOON_TYPES,
  MAP_OBSTACLES,
  TOWER_TYPES,
  TRACK,
  WORLD,
  clamp,
  distanceToTrack,
  lerp,
} from './core.js';

const TAU = Math.PI * 2;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pathFromTrack(track) {
  const path = new Path2D();
  const points = track.points;
  path.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) path.lineTo(points[i].x, points[i].y);
  return path;
}

function ellipse(ctx, x, y, rx, ry, rotation = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, 0, TAU);
}

/* ------------------------------------------------------------------ */
/* Static island background                                            */
/* ------------------------------------------------------------------ */

function drawTree(ctx, x, y, r, seed = 1) {
  const rand = mulberry32(seed);
  ctx.save();
  ellipse(ctx, x + 13, y + 17, r * 1.18, r * 0.45, 0.1);
  ctx.fillStyle = 'rgba(25, 59, 30, 0.24)';
  ctx.fill();

  ctx.fillStyle = '#79532e';
  ctx.beginPath();
  ctx.roundRect(x - r * 0.15, y - r * 0.1, r * 0.3, r * 0.85, r * 0.12);
  ctx.fill();
  ctx.fillStyle = '#9c7440';
  ctx.fillRect(x - r * 0.09, y, r * 0.07, r * 0.66);

  const blobs = [
    { dx: -0.42, dy: -0.18, s: 0.72, c: '#347a3d' },
    { dx: 0.38, dy: -0.2, s: 0.76, c: '#3f8946' },
    { dx: -0.12, dy: -0.58, s: 0.82, c: '#4b9950' },
    { dx: 0.08, dy: -0.05, s: 0.85, c: '#448d48' },
  ];
  for (const [i, blob] of blobs.entries()) {
    const bx = x + r * blob.dx;
    const by = y + r * blob.dy - r * 0.28;
    const br = r * blob.s * 0.67;
    const grad = ctx.createRadialGradient(bx - br * 0.35, by - br * 0.4, br * 0.05, bx, by, br);
    grad.addColorStop(0, i === 2 ? '#78bb5d' : '#5da654');
    grad.addColorStop(0.6, blob.c);
    grad.addColorStop(1, '#286431');
    ellipse(ctx, bx, by, br, br * 0.9);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(25, 66, 31, 0.34)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  for (let i = 0; i < 5; i += 1) {
    const fx = x + (rand() - 0.5) * r * 1.1;
    const fy = y - r * (0.35 + rand() * 0.5);
    ellipse(ctx, fx, fy, 2.8, 2.4);
    ctx.fillStyle = i % 2 ? '#e4544d' : '#ffd15b';
    ctx.fill();
    ctx.strokeStyle = 'rgba(80, 43, 22, 0.35)';
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255, 255, 220, 0.12)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.7, r * 0.22, Math.PI * 0.95, Math.PI * 1.8);
  ctx.stroke();
  ctx.restore();
}

function drawRock(ctx, x, y, r, seed = 1) {
  const rand = mulberry32(seed);
  ctx.save();
  ellipse(ctx, x + 5, y + 5, r * 1.1, r * 0.4);
  ctx.fillStyle = 'rgba(41, 70, 38, 0.22)';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - r, y - r * 0.1);
  ctx.lineTo(x - r * 0.52, y - r * 0.9);
  ctx.lineTo(x + r * 0.16, y - r * 1.05);
  ctx.lineTo(x + r, y - r * 0.32);
  ctx.lineTo(x + r * 0.7, y + r * 0.38);
  ctx.lineTo(x - r * 0.45, y + r * 0.48);
  ctx.closePath();
  const grad = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  grad.addColorStop(0, '#d2d0b3');
  grad.addColorStop(0.52, '#9c9d85');
  grad.addColorStop(1, '#6b725f');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(58, 66, 47, 0.42)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 230, 0.3)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.54, y - r * 0.54);
  ctx.lineTo(x + r * 0.06, y - r * 0.78);
  ctx.stroke();
  for (let i = 0; i < 3; i += 1) {
    ellipse(ctx, x + (rand() - 0.5) * r, y + (rand() - 0.3) * r * 0.6, 2 + rand() * 4, 1.5 + rand() * 2.5);
    ctx.fillStyle = 'rgba(92, 112, 66, 0.5)';
    ctx.fill();
  }
  ctx.restore();
}

function drawPond(ctx, x, y, r) {
  ctx.save();
  ellipse(ctx, x + 8, y + 11, r * 1.2, r * 0.85);
  ctx.fillStyle = 'rgba(22, 68, 37, 0.3)';
  ctx.fill();

  ellipse(ctx, x, y, r * 1.1, r * 0.78);
  ctx.fillStyle = '#446f40';
  ctx.fill();
  ctx.strokeStyle = '#31562f';
  ctx.lineWidth = 6;
  ctx.stroke();

  ellipse(ctx, x, y, r * 1.0, r * 0.69);
  const water = ctx.createRadialGradient(x - r * 0.24, y - r * 0.25, 4, x, y, r);
  water.addColorStop(0, '#7edcca');
  water.addColorStop(0.48, '#45b7ba');
  water.addColorStop(1, '#247d94');
  ctx.fillStyle = water;
  ctx.fill();

  for (let i = 0; i < 4; i += 1) {
    ellipse(ctx, x - r * 0.45 + i * r * 0.28, y - r * 0.22 + (i % 2) * r * 0.34, r * (0.25 + i * 0.025), r * 0.055);
    ctx.strokeStyle = `rgba(236, 255, 236, ${0.24 - i * 0.035})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  const pads = [
    { x: -0.42, y: 0.28, s: 0.15, rot: 0.4 },
    { x: 0.2, y: -0.36, s: 0.12, rot: -0.5 },
    { x: 0.55, y: 0.22, s: 0.11, rot: 1.3 },
  ];
  for (const pad of pads) {
    ellipse(ctx, x + r * pad.x, y + r * pad.y, r * pad.s, r * pad.s * 0.55, pad.rot);
    ctx.fillStyle = '#61a74c';
    ctx.fill();
    ctx.strokeStyle = '#3b7d37';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + r * pad.x, y + r * pad.y);
    ctx.lineTo(x + r * pad.x + Math.cos(pad.rot) * r * pad.s, y + r * pad.y + Math.sin(pad.rot) * r * pad.s * 0.55);
    ctx.strokeStyle = 'rgba(218, 246, 189, 0.5)';
    ctx.stroke();
  }

  for (let i = 0; i < 7; i += 1) {
    const a = -0.4 + i * 0.28;
    const rx = x + Math.cos(a) * r * 0.98;
    const ry = y + Math.sin(a) * r * 0.62;
    ctx.strokeStyle = i % 2 ? '#4b7d3e' : '#679849';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.quadraticCurveTo(rx + 2, ry - 18 - (i % 3) * 4, rx + 7, ry - 25 - (i % 3) * 4);
    ctx.stroke();
    ellipse(ctx, rx + 7, ry - 27 - (i % 3) * 4, 2.6, 5.5, 0.4);
    ctx.fillStyle = '#8a6234';
    ctx.fill();
  }
  ctx.restore();
}

function drawFlower(ctx, x, y, color, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = '#39763a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(1, -5, 0, -10);
  ctx.stroke();
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * TAU;
    ellipse(ctx, Math.cos(a) * 3.6, -10 + Math.sin(a) * 3.6, 2.6, 1.8, a);
    ctx.fillStyle = color;
    ctx.fill();
  }
  ellipse(ctx, 0, -10, 2.1, 2.1);
  ctx.fillStyle = '#f6d45b';
  ctx.fill();
  ctx.restore();
}

function drawTuft(ctx, x, y, scale, seed) {
  const rand = mulberry32(seed);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo((i - 1.5) * 2.6, 0);
    ctx.quadraticCurveTo((i - 1.5) * 4.4 + (rand() - 0.5) * 5, -6 - rand() * 5, (i - 1.5) * 7, -10 - rand() * 7);
    ctx.strokeStyle = i % 2 ? 'rgba(45, 118, 48, 0.58)' : 'rgba(112, 172, 70, 0.5)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  ctx.restore();
}

function drawSign(ctx, x, y, text, flip = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.06 * flip);
  ctx.fillStyle = 'rgba(33, 58, 26, 0.2)';
  ctx.beginPath();
  ctx.ellipse(6, 32, 38, 10, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#76512c';
  ctx.fillRect(-27, 0, 6, 38);
  ctx.fillRect(21, 0, 6, 38);
  ctx.fillStyle = '#9b6534';
  ctx.beginPath();
  ctx.roundRect(-48, -25, 96, 39, 5);
  ctx.fill();
  ctx.strokeStyle = '#5c4020';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = '#5c3c1d';
  ctx.beginPath();
  ctx.arc(-38, -15, 2, 0, TAU);
  ctx.arc(38, -15, 2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff1c4';
  ctx.font = '900 11px ui-rounded, "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, -5);
  ctx.restore();
}

export function createBackground(track = TRACK, obstacles = MAP_OBSTACLES, world = WORLD, variant = 'landscape') {
  const scale = 2;
  const b = document.createElement('canvas');
  b.width = world.width * scale;
  b.height = world.height * scale;
  const c = b.getContext('2d');
  c.scale(scale, scale);
  const rand = mulberry32(7719);

  const grass = c.createLinearGradient(0, 0, world.width, world.height);
  grass.addColorStop(0, '#87ca63');
  grass.addColorStop(0.45, '#6eb753');
  grass.addColorStop(1, '#559e48');
  c.fillStyle = grass;
  c.fillRect(0, 0, world.width, world.height);

  const light = c.createRadialGradient(world.width * 0.25, world.height * 0.18, 40, world.width * 0.25, world.height * 0.18, world.width * 0.75);
  light.addColorStop(0, 'rgba(255, 249, 176, 0.2)');
  light.addColorStop(1, 'rgba(255, 249, 176, 0)');
  c.fillStyle = light;
  c.fillRect(0, 0, world.width, world.height);

  for (let i = 0; i < 1200; i += 1) {
    const x = rand() * world.width;
    const y = rand() * world.height;
    c.fillStyle = rand() > 0.5 ? 'rgba(36, 108, 45, 0.10)' : 'rgba(225, 251, 159, 0.12)';
    c.fillRect(x, y, 1 + rand() * 2.2, 1 + rand() * 2.2);
  }

  for (let i = 0; i < 16; i += 1) {
    const x = rand() * world.width;
    const y = rand() * world.height;
    const r = 50 + rand() * 120;
    const grad = c.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(35, 103, 45, 0.07)');
    grad.addColorStop(1, 'rgba(35, 103, 45, 0)');
    c.fillStyle = grad;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }

  for (const obstacle of obstacles) {
    if (obstacle.type === 'pond') drawPond(c, obstacle.x, obstacle.y, obstacle.r);
  }

  const path = pathFromTrack(track);
  c.save();
  c.lineJoin = 'round';
  c.lineCap = 'round';

  c.strokeStyle = 'rgba(36, 73, 35, 0.36)';
  c.lineWidth = 116;
  c.save();
  c.translate(4, 10);
  c.stroke(path);
  c.restore();

  c.strokeStyle = '#4e883f';
  c.lineWidth = 106;
  c.stroke(path);

  c.strokeStyle = '#8a7a48';
  c.lineWidth = 96;
  c.stroke(path);

  c.strokeStyle = '#cfb474';
  c.lineWidth = 88;
  c.stroke(path);

  const pathGradient = c.createLinearGradient(0, 120, 0, world.height - 180);
  pathGradient.addColorStop(0, '#ead19b');
  pathGradient.addColorStop(0.5, '#e3c38c');
  pathGradient.addColorStop(1, '#d5ae76');
  c.strokeStyle = pathGradient;
  c.lineWidth = 78;
  c.stroke(path);

  c.strokeStyle = 'rgba(255, 243, 194, 0.3)';
  c.lineWidth = 3;
  c.setLineDash([8, 15]);
  c.stroke(path);
  c.setLineDash([]);

  const stoneColors = ['#d6b47d', '#dbba85', '#c9a46f', '#e0c28d', '#ccaa75'];
  for (let d = 8; d < track.length; d += 23) {
    const p = sample(track, d);
    const nx = Math.cos(p.angle + Math.PI / 2);
    const ny = Math.sin(p.angle + Math.PI / 2);
    for (let row = -1; row <= 1; row += 1) {
      if (rand() > 0.82) continue;
      const offset = row * 24 + (rand() - 0.5) * 10;
      const jitter = (rand() - 0.5) * 8;
      const x = p.x + nx * offset + Math.cos(p.angle) * jitter;
      const y = p.y + ny * offset + Math.sin(p.angle) * jitter;
      ellipse(c, x, y, 5 + rand() * 6, 2.2 + rand() * 2.4, p.angle + (rand() - 0.5) * 0.5);
      c.fillStyle = stoneColors[Math.floor(rand() * stoneColors.length)];
      c.fill();
      c.strokeStyle = 'rgba(126, 91, 46, 0.15)';
      c.lineWidth = 0.6;
      c.stroke();
    }
  }

  for (let d = 120; d < track.length - 100; d += 280) {
    const p = sample(track, d);
    c.save();
    c.translate(p.x, p.y);
    c.rotate(p.angle);
    c.strokeStyle = 'rgba(255, 250, 214, 0.19)';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(-12, -10);
    c.lineTo(0, 0);
    c.lineTo(-12, 10);
    c.stroke();
    c.restore();
  }

  c.restore();

  for (let i = 0; i < 950; i += 1) {
    const x = 20 + rand() * (world.width - 40);
    const y = 90 + rand() * (world.height - 150);
    if (distanceToTrack(track, x, y) < 61) continue;
    let blocked = false;
    for (const obstacle of obstacles) {
      if (Math.hypot(x - obstacle.x, y - obstacle.y) < obstacle.r * 0.78) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;
    drawTuft(c, x, y, 0.6 + rand() * 0.75, Math.floor(rand() * 10000));
  }

  const flowerColors = ['#fff4d2', '#ffd267', '#f1818b', '#d8b8ff', '#ff9f54'];
  for (let i = 0; i < 130; i += 1) {
    const x = 30 + rand() * (world.width - 60);
    const y = 90 + rand() * (world.height - 140);
    if (distanceToTrack(track, x, y) < 66) continue;
    let blocked = false;
    for (const obstacle of obstacles) {
      if (Math.hypot(x - obstacle.x, y - obstacle.y) < obstacle.r * 0.75) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;
    drawFlower(c, x, y, flowerColors[Math.floor(rand() * flowerColors.length)], 0.6 + rand() * 0.5);
  }

  for (const obstacle of obstacles) {
    if (obstacle.type === 'tree') {
      drawTree(c, obstacle.x, obstacle.y, obstacle.r, Math.floor(obstacle.x * 7 + obstacle.y));
    }
    if (obstacle.type === 'rock') {
      drawRock(c, obstacle.x, obstacle.y, obstacle.r, Math.floor(obstacle.x * 3 + obstacle.y));
    }
  }

  if (variant === 'portrait') {
    drawSign(c, 100, 55, 'BLOON ENTRY', 1);
    drawSign(c, 688, 1225, 'POP ZONE →', -1);
  } else {
    drawSign(c, 98, 128, 'BLOON ENTRY', 1);
    drawSign(c, 1488, 128, 'POP ZONE →', -1);
  }

  c.save();
  c.strokeStyle = 'rgba(42, 84, 37, 0.18)';
  c.lineWidth = 5;
  c.setLineDash([2, 13]);
  c.beginPath();
  c.moveTo(36, 112);
  c.lineTo(world.width - 36, 112);
  c.stroke();
  c.restore();

  const vignette = c.createRadialGradient(world.width / 2, world.height / 2, world.height * 0.28, world.width / 2, world.height / 2, world.width * 0.74);
  vignette.addColorStop(0, 'rgba(20, 56, 26, 0)');
  vignette.addColorStop(1, 'rgba(16, 50, 25, 0.2)');
  c.fillStyle = vignette;
  c.fillRect(0, 0, world.width, world.height);

  return b;
}

function sample(track, d) {
  const dist = clamp(d, 0, track.length);
  let lo = 0;
  let hi = track.cumulative.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (track.cumulative[mid] <= dist) lo = mid;
    else hi = mid;
  }
  const a = track.points[lo];
  const b = track.points[Math.min(track.points.length - 1, lo + 1)];
  const span = Math.max(0.0001, track.cumulative[lo + 1] - track.cumulative[lo]);
  const t = (dist - track.cumulative[lo]) / span;
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    angle: Math.atan2(b.y - a.y, b.x - a.x),
  };
}

/* ------------------------------------------------------------------ */
/* Monkeys                                                             */
/* ------------------------------------------------------------------ */

function drawCape(ctx, color, time) {
  ctx.save();
  const sway = Math.sin(time * 2.5) * 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-13, -47);
  ctx.quadraticCurveTo(-30 + sway, -22, -23 + sway, -2);
  ctx.quadraticCurveTo(-9, -10, 0, -29);
  ctx.quadraticCurveTo(9, -10, 23 + sway, -2);
  ctx.quadraticCurveTo(30 + sway, -22, 13, -47);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(78, 23, 23, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawHeldItem(ctx, type, angle, time, kick) {
  ctx.save();
  ctx.translate(16, -34 + kick * 2);
  ctx.rotate(angle);
  if (type === 'dart') {
    ctx.strokeStyle = '#7a5226';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(19, 0);
    ctx.stroke();
    ctx.fillStyle = '#e8e5cf';
    ctx.beginPath();
    ctx.moveTo(19, 0);
    ctx.lineTo(12, -4);
    ctx.lineTo(12, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e64647';
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(-12, -4);
    ctx.lineTo(-9, 0);
    ctx.lineTo(-12, 4);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'boomerang') {
    ctx.rotate(time * 1.3);
    ctx.strokeStyle = '#a9682d';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, 7);
    ctx.quadraticCurveTo(-3, -11, 12, -1);
    ctx.stroke();
    ctx.strokeStyle = '#f6c263';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-9, 5);
    ctx.quadraticCurveTo(-2, -8, 9, -2);
    ctx.stroke();
  } else if (type === 'bomb') {
    ellipse(ctx, 5, 0, 8, 8);
    const grad = ctx.createRadialGradient(2, -3, 1, 5, 0, 9);
    grad.addColorStop(0, '#6e7481');
    grad.addColorStop(1, '#252a33');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#171b22';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.strokeStyle = '#d8b15b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(9, -7);
    ctx.quadraticCurveTo(14, -14, 18, -9);
    ctx.stroke();
    ellipse(ctx, 19, -9, 2.4, 2.4);
    ctx.fillStyle = '#ffca50';
    ctx.fill();
    ctx.strokeStyle = '#d85724';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else if (type === 'ice') {
    ctx.rotate(-0.25);
    ctx.fillStyle = 'rgba(198, 250, 255, 0.9)';
    ctx.beginPath();
    ctx.moveTo(4, -12);
    ctx.lineTo(10, -3);
    ctx.lineTo(5, 1);
    ctx.lineTo(2, 10);
    ctx.lineTo(-4, 2);
    ctx.lineTo(-9, -3);
    ctx.lineTo(-3, -7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#4495bb';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(2, -8);
    ctx.lineTo(5, -1);
    ctx.stroke();
  } else if (type === 'sniper') {
    ctx.rotate(-0.18);
    ctx.fillStyle = '#4d3c29';
    ctx.fillRect(-12, -3.5, 37, 6);
    ctx.fillStyle = '#7f6747';
    ctx.fillRect(-14, -2, 17, 4);
    ctx.fillStyle = '#2e2b27';
    ctx.fillRect(8, -7, 13, 5);
    ctx.fillStyle = '#c7d4c0';
    ctx.fillRect(21, -2.4, 13, 2.5);
    ctx.fillStyle = '#3f5c37';
    ctx.fillRect(3, -5, 8, 9);
  } else if (type === 'tack') {
    ctx.rotate(time * 2.6);
    ctx.fillStyle = '#d8d4c1';
    for (let i = 0; i < 3; i += 1) {
      ctx.save();
      ctx.rotate((i / 3) * TAU);
      ctx.beginPath();
      ctx.moveTo(1, -2);
      ctx.lineTo(14, 0);
      ctx.lineTo(1, 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ellipse(ctx, 0, 0, 4, 4);
    ctx.fillStyle = '#79673f';
    ctx.fill();
  } else if (type === 'super') {
    const glow = ctx.createRadialGradient(4, 0, 1, 4, 0, 16);
    glow.addColorStop(0, '#fffbd1');
    glow.addColorStop(0.35, '#ffe45d');
    glow.addColorStop(1, 'rgba(255, 186, 43, 0)');
    ellipse(ctx, 4, 0, 16, 16);
    ctx.fillStyle = glow;
    ctx.fill();
    ellipse(ctx, 4, 0, 5, 5);
    ctx.fillStyle = '#fff7b0';
    ctx.fill();
  }
  ctx.restore();
}

export function drawMonkey(ctx, type, x, y, angle, time, kick = 0, options = {}) {
  const def = TOWER_TYPES[type];
  const icon = Boolean(options.icon);
  const scale = options.scale || 1;
  const bob = Math.sin(time * 2.2 + x * 0.027) * 1.1;
  const recoil = kick * 2.2;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  if (!icon) {
    ellipse(ctx, 2, 5, 33, 12);
    ctx.fillStyle = 'rgba(28, 66, 30, 0.26)';
    ctx.fill();
    ellipse(ctx, 0, -1, 31, 11);
    ctx.fillStyle = '#72532d';
    ctx.fill();
    ellipse(ctx, 0, -7, 30, 10);
    const baseGrad = ctx.createLinearGradient(-26, -15, 26, 4);
    baseGrad.addColorStop(0, '#d9c58b');
    baseGrad.addColorStop(1, '#b4975d');
    ctx.fillStyle = baseGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(92, 64, 27, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ellipse(ctx, 0, -8, 23, 7.4);
    ctx.fillStyle = 'rgba(255, 250, 214, 0.28)';
    ctx.fill();
    for (let i = 0; i < 3; i += 1) {
      ellipse(ctx, -15 + i * 15, -5 - (i % 2) * 2, 3.2, 2);
      ctx.fillStyle = 'rgba(96, 72, 32, 0.24)';
      ctx.fill();
    }
  }

  if (type === 'super') drawCape(ctx, '#b92f3e', time);

  const bodyGrad = ctx.createLinearGradient(-15, -45, 16, -14);
  bodyGrad.addColorStop(0, def.color);
  bodyGrad.addColorStop(1, shade(def.color, -22));
  ellipse(ctx, 0, -29 + bob, 16.5, 19);
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(45, 49, 26, 0.35)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  const belly = ctx.createLinearGradient(0, -34, 0, -14);
  belly.addColorStop(0, def.accent);
  belly.addColorStop(1, shade(def.accent, -14));
  ellipse(ctx, 0, -27, 10.5, 12);
  ctx.fillStyle = belly;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.strokeStyle = '#7c4f27';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-12, -33 + bob);
  ctx.lineTo(-17, -22 + bob);
  ctx.moveTo(12, -33 + bob);
  ctx.lineTo(18, -31 + bob - recoil);
  ctx.stroke();

  ctx.fillStyle = '#5d381c';
  ellipse(ctx, -9, -10, 6.5, 4.5);
  ctx.fill();
  ellipse(ctx, 9, -10, 6.5, 4.5);
  ctx.fill();
  ctx.fillStyle = '#9c6a39';
  ellipse(ctx, -9, -11.5, 4.2, 2.6);
  ctx.fill();
  ellipse(ctx, 9, -11.5, 4.2, 2.6);
  ctx.fill();

  const headY = -57 + bob;
  ctx.fillStyle = '#754321';
  ellipse(ctx, -18, headY + 2, 9.5, 10.5);
  ctx.fill();
  ellipse(ctx, 18, headY + 2, 9.5, 10.5);
  ctx.fill();
  ctx.fillStyle = '#c18756';
  ellipse(ctx, -18, headY + 2, 5.5, 6.5);
  ctx.fill();
  ellipse(ctx, 18, headY + 2, 5.5, 6.5);
  ctx.fill();

  const headGrad = ctx.createRadialGradient(-7, headY - 8, 2, 0, headY, 24);
  headGrad.addColorStop(0, '#b77b46');
  headGrad.addColorStop(1, '#7a4924');
  ellipse(ctx, 0, headY, 21, 19.5);
  ctx.fillStyle = headGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(71, 39, 17, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const face = ctx.createLinearGradient(0, headY - 10, 0, headY + 12);
  face.addColorStop(0, '#f7d6a4');
  face.addColorStop(1, '#e6b87e');
  ellipse(ctx, 0, headY + 3, 14.5, 12.5);
  ctx.fillStyle = face;
  ctx.fill();
  ctx.strokeStyle = 'rgba(133, 79, 38, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const eyeX = clamp(Math.cos(angle) * 1.6, -1.8, 1.8);
  const eyeY = clamp(Math.sin(angle) * 1.2, -1.2, 1.2);
  ellipse(ctx, -6.3, headY - 3, 3.9, 4.5);
  ctx.fillStyle = '#fff9e9';
  ctx.fill();
  ellipse(ctx, 6.3, headY - 3, 3.9, 4.5);
  ctx.fillStyle = '#fff9e9';
  ctx.fill();
  ellipse(ctx, -6.1 + eyeX, headY - 2.8 + eyeY, 2.1, 2.5);
  ctx.fillStyle = '#252015';
  ctx.fill();
  ellipse(ctx, 6.5 + eyeX, headY - 2.8 + eyeY, 2.1, 2.5);
  ctx.fillStyle = '#252015';
  ctx.fill();
  ellipse(ctx, -7.2 + eyeX, headY - 3.7 + eyeY, 0.75, 0.85);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ellipse(ctx, 5.4 + eyeX, headY - 3.7 + eyeY, 0.75, 0.85);
  ctx.fillStyle = '#fff';
  ctx.fill();

  ellipse(ctx, 0, headY + 6.5, 7.6, 4.4);
  ctx.fillStyle = '#f0c48d';
  ctx.fill();
  ellipse(ctx, -2, headY + 5.1, 1.1, 0.85);
  ctx.fillStyle = '#8b5a31';
  ctx.fill();
  ellipse(ctx, 2, headY + 5.1, 1.1, 0.85);
  ctx.fillStyle = '#8b5a31';
  ctx.fill();
  ctx.strokeStyle = '#744025';
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, headY + 6.4, 5.2, 0.2, Math.PI - 0.2);
  ctx.stroke();

  if (type === 'dart') {
    ctx.save();
    ctx.translate(0, headY - 11);
    ctx.rotate(-0.12);
    ctx.fillStyle = '#4d923d';
    ctx.beginPath();
    ctx.ellipse(-1, 0, 19, 10, 0, Math.PI, TAU);
    ctx.fill();
    ctx.strokeStyle = '#326729';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.fillStyle = '#67aa4c';
    ctx.beginPath();
    ctx.roundRect(-2, -1, 23, 4, 2);
    ctx.fill();
    ctx.strokeStyle = '#326729';
    ctx.stroke();
    ctx.fillStyle = '#f7e8b8';
    ellipse(ctx, -9, -4, 2.2, 1.4);
    ctx.fill();
    ctx.restore();
  } else if (type === 'tack') {
    ctx.save();
    ctx.translate(0, headY - 8);
    ctx.rotate(-0.05);
    ctx.fillStyle = '#d8522d';
    ctx.beginPath();
    ctx.roundRect(-20, -2, 40, 6, 3);
    ctx.fill();
    ctx.fillStyle = '#f47b46';
    ctx.beginPath();
    ctx.moveTo(-19, -2);
    ctx.quadraticCurveTo(0, 5, 19, -2);
    ctx.lineTo(15, 2);
    ctx.quadraticCurveTo(0, 8, -15, 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe1a2';
    ctx.beginPath();
    ctx.arc(-11, 1, 2, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(0, -17);
    ctx.rotate(time * 1.1);
    for (let i = 0; i < 8; i += 1) {
      ctx.save();
      ctx.rotate((i / 8) * TAU);
      ctx.fillStyle = i % 2 ? '#e9d7a4' : '#c1a66d';
      ctx.beginPath();
      ctx.moveTo(25, -3);
      ctx.lineTo(38, 0);
      ctx.lineTo(25, 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  } else if (type === 'boomerang') {
    ctx.fillStyle = '#345a53';
    ctx.beginPath();
    ctx.roundRect(-19, headY - 9, 38, 6, 3);
    ctx.fill();
    ctx.fillStyle = '#5ec8b6';
    ctx.beginPath();
    ctx.moveTo(15, headY - 10);
    ctx.lineTo(26, headY - 20);
    ctx.lineTo(20, headY - 7);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'bomb') {
    ctx.fillStyle = '#3b4150';
    ctx.beginPath();
    ctx.ellipse(0, headY - 9, 19, 9, 0, Math.PI, TAU);
    ctx.fill();
    ctx.fillStyle = '#5d6779';
    ctx.beginPath();
    ctx.roundRect(-17, headY - 11, 34, 5, 2);
    ctx.fill();
    ellipse(ctx, 0, headY - 15, 4, 3.5);
    ctx.fillStyle = '#ffc349';
    ctx.fill();
    ctx.strokeStyle = 'rgba(86, 62, 24, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = '#4e596b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, headY - 2, 12, 0.15, Math.PI - 0.15);
    ctx.stroke();
    ellipse(ctx, -7, headY - 2, 4.3, 3.6);
    ctx.fillStyle = 'rgba(166, 224, 255, 0.72)';
    ctx.fill();
    ellipse(ctx, 7, headY - 2, 4.3, 3.6);
    ctx.fillStyle = 'rgba(166, 224, 255, 0.72)';
    ctx.fill();
  } else if (type === 'ice') {
    ctx.save();
    ctx.translate(0, headY - 12);
    ctx.fillStyle = '#d7fbff';
    ctx.strokeStyle = '#5caec3';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-15 + i * 15, 0);
      ctx.lineTo(-11 + i * 15, -12 - (i === 1 ? 6 : 0));
      ctx.lineTo(-7 + i * 15, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(215, 252, 255, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -29, 32, time * 0.3, time * 0.3 + Math.PI * 1.2);
    ctx.stroke();
  } else if (type === 'sniper') {
    ctx.save();
    ctx.translate(0, headY - 11);
    ctx.rotate(-0.08);
    ctx.fillStyle = '#53663c';
    ctx.beginPath();
    ctx.ellipse(-3, 0, 20, 8, 0, Math.PI, TAU);
    ctx.fill();
    ctx.fillStyle = '#78904c';
    ctx.beginPath();
    ctx.roundRect(-6, -3, 28, 5, 2.5);
    ctx.fill();
    ctx.strokeStyle = '#374629';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#e4d49e';
    ellipse(ctx, -12, -4, 2.3, 1.6);
    ctx.fill();
    ctx.restore();
  } else if (type === 'super') {
    ctx.fillStyle = '#ce3547';
    ctx.beginPath();
    ctx.moveTo(-22, headY - 12);
    ctx.quadraticCurveTo(0, headY - 20, 22, headY - 12);
    ctx.lineTo(17, headY - 3);
    ctx.quadraticCurveTo(0, headY - 8, -17, headY - 3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#81222f';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = '#ffe15f';
    ctx.beginPath();
    ctx.moveTo(-4, headY - 16);
    ctx.lineTo(3, headY - 11);
    ctx.lineTo(-1, headY - 11);
    ctx.lineTo(5, headY - 5);
    ctx.lineTo(-6, headY - 10);
    ctx.lineTo(-1, headY - 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 239, 140, 0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, -34, 27, time * 0.9, time * 0.9 + 1.5);
    ctx.stroke();
  }

  if (!icon) {
    const levels = options.levels || 0;
    for (let i = 0; i < Math.min(6, levels); i += 1) {
      const a = -Math.PI * 0.9 + (i / 5) * Math.PI * 0.8;
      ellipse(ctx, Math.cos(a) * 26, -3 + Math.sin(a) * 8, 1.8, 1.8);
      ctx.fillStyle = i < 3 ? '#ffd45b' : '#7fd25b';
      ctx.fill();
    }
  }

  drawHeldItem(ctx, type, angle, time, kick);
  ctx.restore();
}

function shade(hex, amount) {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  const r = clamp((num >> 16) + amount, 0, 255);
  const g = clamp(((num >> 8) & 255) + amount, 0, 255);
  const b = clamp((num & 255) + amount, 0, 255);
  return `rgb(${r}, ${g}, ${b})`;
}

export function drawTowerIcon(canvasEl, type, levels = {}) {
  const context = canvasEl.getContext('2d');
  const w = canvasEl.width;
  const h = canvasEl.height;
  context.clearRect(0, 0, w, h);
  context.save();
  const scale = (w / 96) * 1.04;
  context.translate(w / 2, h * 0.94);
  drawMonkey(context, type, 0, 0, -0.55, 1.2, 0, {
    icon: true,
    scale,
    levels: (levels.top || 0) + (levels.bottom || 0),
  });
  context.restore();
}

export function drawTower(ctx, tower, time, selected = false) {
  if (selected) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, 37 + Math.sin(time * 3) * 2, 0, TAU);
    ctx.strokeStyle = 'rgba(255, 226, 103, 0.9)';
    ctx.lineWidth = 3;
    ctx.setLineDash([7, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
  const def = TOWER_TYPES[tower.type];
  ctx.save();
  drawMonkey(ctx, tower.type, tower.x, tower.y, tower.angle, time, tower.kick || 0, {
    levels: (tower.levels.top || 0) + (tower.levels.bottom || 0),
  });
  if (tower.upgradedFlash > 0) {
    ctx.globalAlpha = tower.upgradedFlash;
    ctx.beginPath();
    ctx.arc(tower.x, tower.y - 30, 35 + (1 - tower.upgradedFlash) * 20, 0, TAU);
    ctx.strokeStyle = def.accent;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Balloons                                                            */
/* ------------------------------------------------------------------ */

function balloonGradient(ctx, type, rx, ry) {
  const grad = ctx.createRadialGradient(-rx * 0.35, -ry * 0.4, 1, 0, 0, Math.max(rx, ry));
  if (type.id === 'black') {
    grad.addColorStop(0, '#565b6f');
    grad.addColorStop(0.55, '#2b2e3a');
    grad.addColorStop(1, '#11131a');
  } else if (type.id === 'white') {
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.65, '#f4f0df');
    grad.addColorStop(1, '#c9c4b4');
  } else {
    grad.addColorStop(0, type.light);
    grad.addColorStop(0.45, type.color);
    grad.addColorStop(1, type.dark);
  }
  return grad;
}

function drawNormalBalloon(ctx, b, type, time) {
  const rx = type.width * 0.52;
  const ry = type.height * 0.52;
  const bob = Math.sin(time * 3.4 + b.seed) * 1.7;
  const tilt = Math.sin(time * 2.2 + b.seed) * 0.05;

  ctx.save();
  ellipse(ctx, b.x + 4, b.y + 7, rx * 0.8, 4.5);
  ctx.fillStyle = 'rgba(44, 68, 35, 0.18)';
  ctx.fill();

  ctx.translate(b.x, b.y - ry - 7 + bob);
  ctx.rotate(tilt);

  ctx.strokeStyle = 'rgba(255, 248, 220, 0.52)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, ry * 0.98);
  ctx.bezierCurveTo(6, ry + 10, -5, ry + 18, 2, ry + 28);
  ctx.stroke();

  ctx.fillStyle = type.dark;
  ctx.beginPath();
  ctx.moveTo(-4, ry * 0.96);
  ctx.lineTo(4, ry * 0.96);
  ctx.lineTo(0, ry + 7);
  ctx.closePath();
  ctx.fill();

  if (type.id === 'white') {
    ctx.shadowColor = 'rgba(255, 255, 240, 0.72)';
    ctx.shadowBlur = 12;
  }

  ellipse(ctx, 0, 0, rx, ry);
  ctx.fillStyle = balloonGradient(ctx, type, rx, ry);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = type.dark;
  ctx.lineWidth = 1.7;
  ctx.stroke();

  if (type.id === 'zebra') {
    ctx.save();
    ellipse(ctx, 0, 0, rx, ry);
    ctx.clip();
    ctx.strokeStyle = '#2a2c38';
    ctx.lineWidth = 5.5;
    for (let i = -3; i <= 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-rx + i * 8, -ry - 8);
      ctx.quadraticCurveTo(-2 + i * 8, 0, -rx + i * 8 + 12, ry + 8);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = '#2a2c38';
    ctx.lineWidth = 1.7;
    ellipse(ctx, 0, 0, rx, ry);
    ctx.stroke();
  } else if (type.id === 'rainbow') {
    ctx.save();
    ellipse(ctx, 0, 0, rx, ry);
    ctx.clip();
    const grad = ctx.createLinearGradient(-rx, -ry, rx, ry);
    ['#ff5b55', '#ff9d39', '#ffe34e', '#55c95d', '#3f9cf0', '#a65fe4'].forEach((color, index) => {
      grad.addColorStop(index / 5, color);
    });
    ctx.fillStyle = grad;
    ctx.fillRect(-rx, -ry, rx * 2, ry * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.17)';
    ctx.fillRect(-rx, -ry, rx * 2, ry * 0.7);
    ctx.restore();
    ctx.strokeStyle = '#974155';
    ctx.lineWidth = 1.8;
    ellipse(ctx, 0, 0, rx, ry);
    ctx.stroke();
  } else if (type.id === 'ceramic') {
    ctx.save();
    ellipse(ctx, 0, 0, rx, ry);
    ctx.clip();
    ctx.strokeStyle = 'rgba(115, 54, 27, 0.38)';
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.ellipse(0, i * ry * 0.44, rx * 1.05, ry * 0.16, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = '#743a22';
    ctx.lineWidth = 2.6;
    ellipse(ctx, 0, 0, rx, ry);
    ctx.stroke();
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * TAU;
      ellipse(ctx, Math.cos(a) * rx * 1.02, Math.sin(a) * ry * 1.02, 2.2, 2.2);
      ctx.fillStyle = '#f2d49b';
      ctx.fill();
    }
    if (b.hp < type.hp * 0.55) {
      ctx.strokeStyle = 'rgba(78, 39, 20, 0.7)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-rx * 0.45, -ry * 0.2);
      ctx.lineTo(-rx * 0.12, -ry * 0.02);
      ctx.lineTo(-rx * 0.25, ry * 0.3);
      ctx.lineTo(rx * 0.1, ry * 0.44);
      ctx.stroke();
    }
  } else if (type.id === 'black') {
    ellipse(ctx, -rx * 0.36, -ry * 0.48, rx * 0.18, ry * 0.22, -0.4);
    ctx.fillStyle = 'rgba(148, 151, 184, 0.25)';
    ctx.fill();
  }

  ellipse(ctx, -rx * 0.36, -ry * 0.45, rx * 0.25, ry * 0.18, -0.62);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.fill();
  ellipse(ctx, -rx * 0.16, -ry * 0.57, rx * 0.09, ry * 0.06, -0.7);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fill();

  if (b.flash > 0) {
    ellipse(ctx, 0, 0, rx + 1, ry + 1);
    ctx.strokeStyle = 'rgba(255, 255, 240, 0.9)';
    ctx.lineWidth = 3.5;
    ctx.stroke();
  }
  ctx.restore();
}

function drawMoab(ctx, b, type, time) {
  const hpRatio = clamp(b.hp / b.maxHp, 0, 1);
  const bob = Math.sin(time * 1.7 + b.seed) * 2;
  const angle = b.angle;

  ctx.save();
  ellipse(ctx, b.x + 6, b.y + 9, 62, 17);
  ctx.fillStyle = 'rgba(40, 54, 31, 0.24)';
  ctx.fill();

  ctx.translate(b.x, b.y - 31 + bob);
  ctx.rotate(angle);

  const bodyGrad = ctx.createLinearGradient(0, -28, 0, 26);
  bodyGrad.addColorStop(0, '#ff9a7d');
  bodyGrad.addColorStop(0.2, '#e84b4c');
  bodyGrad.addColorStop(0.7, '#bd303b');
  bodyGrad.addColorStop(1, '#791c2b');
  ellipse(ctx, 0, 0, 58, 25);
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.strokeStyle = '#641522';
  ctx.lineWidth = 2.4;
  ctx.stroke();

  ctx.save();
  ellipse(ctx, 0, 0, 58, 25);
  ctx.clip();
  ctx.fillStyle = 'rgba(255, 211, 171, 0.18)';
  ctx.fillRect(-58, -25, 116, 11);
  ctx.strokeStyle = 'rgba(104, 17, 30, 0.38)';
  ctx.lineWidth = 1.5;
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 17, -25);
    ctx.lineTo(i * 17 + 4, 25);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = '#d7d3c4';
  ctx.beginPath();
  ctx.moveTo(42, -13);
  ctx.quadraticCurveTo(61, -7, 63, 0);
  ctx.quadraticCurveTo(61, 7, 42, 13);
  ctx.quadraticCurveTo(52, 4, 52, 0);
  ctx.quadraticCurveTo(52, -4, 42, -13);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#77736b';
  ctx.lineWidth = 1.3;
  ctx.stroke();

  ctx.fillStyle = '#922333';
  ctx.beginPath();
  ctx.moveTo(-42, -18);
  ctx.lineTo(-60, -36);
  ctx.lineTo(-52, -7);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-42, 18);
  ctx.lineTo(-60, 36);
  ctx.lineTo(-52, 7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#621622';
  ctx.stroke();

  ctx.save();
  ctx.translate(-49, 0);
  ctx.rotate(time * 17);
  ctx.strokeStyle = '#f5d198';
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i += 1) {
    ctx.rotate(TAU / 3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(18, 0);
    ctx.stroke();
  }
  ellipse(ctx, 0, 0, 4, 4);
  ctx.fillStyle = '#ded5bc';
  ctx.fill();
  ctx.restore();

  ellipse(ctx, -15, -8, 24, 9);
  ctx.fillStyle = 'rgba(255, 214, 177, 0.22)';
  ctx.fill();
  ellipse(ctx, 26, -7, 15, 3);
  ctx.fillStyle = 'rgba(255, 245, 208, 0.5)';
  ctx.fill();

  ctx.font = '900 10px ui-rounded, "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 245, 211, 0.92)';
  ctx.fillText('MOAB', -2, 1);
  ctx.restore();

  ctx.save();
  ctx.translate(b.x, b.y - 76);
  const barW = 112;
  ctx.fillStyle = 'rgba(31, 20, 12, 0.7)';
  ctx.beginPath();
  ctx.roundRect(-barW / 2 - 2, -2, barW + 4, 12, 5);
  ctx.fill();
  ctx.fillStyle = '#ffca4f';
  ctx.beginPath();
  ctx.roundRect(-barW / 2, 0, barW * hpRatio, 8, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 250, 222, 0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.font = '900 8px ui-rounded, "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff1c1';
  ctx.fillText(`${Math.ceil(b.hp)} HP`, 0, -7);
  ctx.restore();
}

export function drawBalloon(ctx, b, time) {
  const type = BALLOON_TYPES[b.type];
  if (!type) return;
  if (type.boss) drawMoab(ctx, b, type, time);
  else drawNormalBalloon(ctx, b, type, time);
}

/* ------------------------------------------------------------------ */
/* Projectiles                                                         */
/* ------------------------------------------------------------------ */

export function drawProjectile(ctx, p, time) {
  if (p.trail && p.trail.length > 1) {
    for (let i = 1; i < p.trail.length; i += 1) {
      const a = i / p.trail.length;
      ctx.strokeStyle = p.kind === 'super'
        ? `rgba(255, 238, 115, ${a * 0.3})`
        : `rgba(255, 247, 214, ${a * 0.2})`;
      ctx.lineWidth = p.kind === 'super' ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(p.trail[i - 1].x, p.trail[i - 1].y);
      ctx.lineTo(p.trail[i].x, p.trail[i].y);
      ctx.stroke();
    }
  }

  const x = p.x;
  const y = p.kind === 'bomb' ? p.y - (p.z || 0) : p.y;

  if (p.kind === 'dart') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(p.angle);
    ctx.strokeStyle = '#7c5328';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(9, 0);
    ctx.stroke();
    ctx.fillStyle = '#fff4cf';
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(3, -4);
    ctx.lineTo(3, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d7c68b';
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(-13, -4);
    ctx.lineTo(-10, 0);
    ctx.lineTo(-13, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (p.kind === 'super') {
    ctx.save();
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 11);
    glow.addColorStop(0, '#ffffff');
    glow.addColorStop(0.28, '#fff27a');
    glow.addColorStop(1, 'rgba(255, 205, 64, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff7ad';
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, TAU);
    ctx.fill();
    ctx.restore();
  } else if (p.kind === 'tack' || p.kind === 'fireTack') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(p.angle);
    if (p.kind === 'fireTack') {
      ctx.shadowColor = '#ff9d32';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#ffb53b';
    } else {
      ctx.fillStyle = '#e8e3cb';
    }
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(0, -3.2);
    ctx.lineTo(-6, 0);
    ctx.lineTo(0, 3.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = p.kind === 'fireTack' ? '#b94e18' : '#8b846d';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  } else if (p.kind === 'rang') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(p.spin);
    ctx.strokeStyle = '#a8662c';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, 7);
    ctx.quadraticCurveTo(-3, -11, 12, -1);
    ctx.stroke();
    ctx.strokeStyle = '#f7ca70';
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.restore();
  } else if (p.kind === 'bomb') {
    ellipse(ctx, p.x + 4, p.y + 2, 8, 3);
    ctx.fillStyle = 'rgba(35, 60, 31, 0.24)';
    ctx.fill();
    ctx.save();
    ctx.translate(x, y);
    ellipse(ctx, 0, 0, 8.5, 8.5);
    const grad = ctx.createRadialGradient(-3, -4, 1, 0, 0, 10);
    grad.addColorStop(0, '#737987');
    grad.addColorStop(1, '#22262e');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#171a20';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.strokeStyle = '#d4ad56';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(5, -7);
    ctx.quadraticCurveTo(10, -14, 14, -9);
    ctx.stroke();
    ellipse(ctx, 15, -9, 3, 3);
    ctx.fillStyle = `hsl(${35 + Math.sin(time * 25) * 7} 100% 60%)`;
    ctx.fill();
    ctx.restore();
  } else if (p.kind === 'iceShard') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(p.angle + 0.6);
    ctx.fillStyle = 'rgba(214, 252, 255, 0.94)';
    ctx.strokeStyle = '#5db2c5';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(-2, -4);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-2, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else {
    ellipse(ctx, x, y, 4, 4);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }
}

export function drawRangeRing(ctx, x, y, radius, time, color = 'rgba(255, 235, 130, 0.92)') {
  if (radius > 5000) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fillStyle = 'rgba(255, 249, 192, 0.075)';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([9, 7]);
  ctx.lineDashOffset = -time * 18;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.arc(x, y, radius - 5, 0, TAU);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

export function drawPlacementGhost(ctx, type, x, y, valid, time) {
  const stats = optionsStats(type);
  drawRangeRing(ctx, x, y, stats.range, time, valid ? 'rgba(147, 245, 104, 0.95)' : 'rgba(255, 109, 93, 0.95)');
  ctx.save();
  ctx.globalAlpha = valid ? 0.68 : 0.38;
  drawMonkey(ctx, type, x, y, -Math.PI / 2, time, 0, {});
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y - 18, 42, 0, TAU);
  ctx.strokeStyle = valid ? 'rgba(201, 255, 167, 0.9)' : 'rgba(255, 120, 104, 0.9)';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([5, 5]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function optionsStats(type) {
  return TOWER_TYPES[type].base;
}

export function drawSelectionAura(ctx, tower, time) {
  const stats = tower.stats || TOWER_TYPES[tower.type].base;
  drawRangeRing(ctx, tower.x, tower.y, stats.range, time, 'rgba(255, 239, 148, 0.95)');
  ctx.save();
  ctx.beginPath();
  ctx.arc(tower.x, tower.y + 3, 34, 0, TAU);
  ctx.fillStyle = 'rgba(255, 225, 89, 0.11)';
  ctx.fill();
  ctx.restore();
}

export function drawParticles(ctx, particles) {
  for (const p of particles) {
    const alpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    if (p.kind === 'spark') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, TAU);
      ctx.fill();
    } else if (p.kind === 'confetti') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size, -p.size * 0.45, p.size * 2, p.size * 0.9);
      ctx.restore();
    } else if (p.kind === 'smoke') {
      ctx.globalAlpha = alpha * 0.34;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (2 - alpha), 0, TAU);
      ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
  }
  ctx.globalAlpha = 1;
}

export function drawShockwaves(ctx, waves) {
  for (const wave of waves) {
    const progress = 1 - wave.life / wave.maxLife;
    ctx.globalAlpha = Math.max(0, 1 - progress) * 0.75;
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, wave.radius * progress, 0, TAU);
    ctx.strokeStyle = wave.color;
    ctx.lineWidth = wave.width || 4;
    ctx.stroke();
    if (wave.fill) {
      ctx.globalAlpha = Math.max(0, 1 - progress) * 0.1;
      ctx.fillStyle = wave.color;
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

export function drawTracers(ctx, tracers) {
  for (const tracer of tracers) {
    const a = clamp(tracer.life / tracer.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = tracer.color || 'rgba(255, 240, 151, 0.9)';
    ctx.lineWidth = tracer.width || 2;
    ctx.shadowColor = tracer.color || '#ffe66e';
    ctx.shadowBlur = 7;
    ctx.beginPath();
    ctx.moveTo(tracer.x1, tracer.y1);
    ctx.lineTo(tracer.x2, tracer.y2);
    ctx.stroke();
    ctx.restore();
  }
}

export function drawFloaters(ctx, floaters) {
  for (const f of floaters) {
    const a = clamp(f.life / f.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.font = `900 ${f.size || 12}px ui-rounded, "Trebuchet MS", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = 'rgba(47, 38, 18, 0.55)';
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

export function drawAmbientMotes(ctx, time, world = WORLD) {
  for (let i = 0; i < 20; i += 1) {
    const x = ((i * 193 + time * (4 + (i % 5) * 2)) % (world.width + 80)) - 40;
    const y = 120 + ((i * 109 + Math.sin(time * 0.5 + i) * 35) % (world.height - 200));
    const a = 0.14 + Math.sin(time * 1.3 + i * 2) * 0.1;
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = i % 3 === 0 ? '#fff2a6' : '#e9ffd2';
    ctx.beginPath();
    ctx.arc(x, y, i % 4 === 0 ? 2.2 : 1.2, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
