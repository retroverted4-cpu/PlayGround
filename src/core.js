// Pure game rules and map data. Kept separate from rendering so it can be tested.

export const WORLD = { width: 1600, height: 900 };
export const PORTRAIT_WORLD = { width: 820, height: 1580 };
export const MAX_WAVES = 30;
export const STARTING_CASH = 750;
export const STARTING_LIVES = 100;

export const TRACK_CONTROL = [
  { x: -90, y: 235 },
  { x: 270, y: 235 },
  { x: 270, y: 620 },
  { x: 610, y: 620 },
  { x: 610, y: 275 },
  { x: 925, y: 275 },
  { x: 925, y: 650 },
  { x: 1235, y: 650 },
  { x: 1235, y: 225 },
  { x: 1685, y: 225 },
];

export const PORTRAIT_TRACK_CONTROL = [
  { x: -30, y: 150 },
  { x: 240, y: 150 },
  { x: 240, y: 380 },
  { x: 620, y: 380 },
  { x: 620, y: 620 },
  { x: 180, y: 620 },
  { x: 180, y: 880 },
  { x: 650, y: 880 },
  { x: 650, y: 1100 },
  { x: 300, y: 1100 },
  { x: 300, y: 1320 },
  { x: 860, y: 1320 },
];

export const MAP_OBSTACLES = [
  { x: 110, y: 105, r: 48, type: 'tree' },
  { x: 438, y: 100, r: 37, type: 'tree' },
  { x: 790, y: 102, r: 45, type: 'tree' },
  { x: 1108, y: 112, r: 34, type: 'tree' },
  { x: 1478, y: 390, r: 44, type: 'tree' },
  { x: 1438, y: 780, r: 42, type: 'tree' },
  { x: 760, y: 790, r: 39, type: 'tree' },
  { x: 470, y: 790, r: 33, type: 'tree' },
  { x: 86, y: 762, r: 40, type: 'tree' },
  { x: 122, y: 454, r: 76, type: 'pond' },
  { x: 1540, y: 96, r: 30, type: 'rock' },
  { x: 360, y: 335, r: 24, type: 'rock' },
  { x: 820, y: 470, r: 24, type: 'rock' },
  { x: 1360, y: 505, r: 25, type: 'rock' },
  { x: 700, y: 658, r: 22, type: 'rock' },
];

export const PORTRAIT_MAP_OBSTACLES = [
  { x: 88, y: 260, r: 42, type: 'tree' },
  { x: 746, y: 228, r: 40, type: 'tree' },
  { x: 450, y: 270, r: 66, type: 'pond' },
  { x: 75, y: 500, r: 30, type: 'rock' },
  { x: 430, y: 500, r: 42, type: 'tree' },
  { x: 758, y: 512, r: 38, type: 'tree' },
  { x: 405, y: 752, r: 43, type: 'tree' },
  { x: 700, y: 770, r: 24, type: 'rock' },
  { x: 65, y: 760, r: 38, type: 'tree' },
  { x: 405, y: 990, r: 34, type: 'rock' },
  { x: 758, y: 950, r: 38, type: 'tree' },
  { x: 145, y: 1175, r: 36, type: 'tree' },
  { x: 548, y: 1180, r: 30, type: 'rock' },
  { x: 745, y: 1180, r: 34, type: 'tree' },
  { x: 150, y: 1410, r: 40, type: 'tree' },
  { x: 610, y: 1430, r: 36, type: 'tree' },
];


// Chaikin's corner-cutting produces a smooth, evenly sampled track.
function chaikin(points, iterations = 4) {
  let result = points.slice();
  for (let pass = 0; pass < iterations; pass += 1) {
    const next = [result[0]];
    for (let i = 0; i < result.length - 1; i += 1) {
      const a = result[i];
      const b = result[i + 1];
      next.push({ x: a.x + (b.x - a.x) * 0.25, y: a.y + (b.y - a.y) * 0.25 });
      next.push({ x: a.x + (b.x - a.x) * 0.75, y: a.y + (b.y - a.y) * 0.75 });
    }
    next.push(result[result.length - 1]);
    result = next;
  }
  return result;
}

export function buildTrack(control = TRACK_CONTROL) {
  const points = chaikin(control, 4);
  const cumulative = [0];
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    cumulative.push(cumulative[i - 1] + Math.hypot(dx, dy));
  }
  return { points, cumulative, length: cumulative[cumulative.length - 1] };
}

export const TRACK = buildTrack();
export const PORTRAIT_TRACK = buildTrack(PORTRAIT_TRACK_CONTROL);

export function sampleTrack(track, distance) {
  const d = Math.max(0, Math.min(track.length, distance));
  let lo = 0;
  let hi = track.cumulative.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (track.cumulative[mid] <= d) lo = mid;
    else hi = mid;
  }
  const a = track.points[lo];
  const b = track.points[Math.min(track.points.length - 1, lo + 1)];
  const span = Math.max(0.0001, track.cumulative[lo + 1] - track.cumulative[lo]);
  const t = (d - track.cumulative[lo]) / span;
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    angle: Math.atan2(b.y - a.y, b.x - a.x),
  };
}

export function distanceToSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const len2 = vx * vx + vy * vy;
  const t = len2 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2)) : 0;
  return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
}

export function distanceToTrack(track, x, y) {
  let min = Infinity;
  for (let i = 1; i < track.points.length; i += 1) {
    const a = track.points[i - 1];
    const b = track.points[i];
    const d = distanceToSegment(x, y, a.x, a.y, b.x, b.y);
    if (d < min) min = d;
  }
  return min;
}

export function isPlacementValid(track, towers, x, y, towerRadius = 29, world = WORLD, obstacles = MAP_OBSTACLES) {
  if (x < 48 || x > world.width - 48 || y < 132 || y > world.height - 150) return false;
  if (distanceToTrack(track, x, y) < 56 + towerRadius * 0.25) return false;
  for (const obstacle of obstacles) {
    if (Math.hypot(x - obstacle.x, y - obstacle.y) < obstacle.r + towerRadius * 0.7) return false;
  }
  for (const tower of towers) {
    if (Math.hypot(x - tower.x, y - tower.y) < 58) return false;
  }
  return true;
}

export const BALLOON_TYPES = {
  red: {
    id: 'red', name: 'Red', speed: 56, hp: 1, width: 27, height: 35, cash: 1,
    color: '#e94b4f', dark: '#a72535', light: '#ff9091', children: [],
  },
  blue: {
    id: 'blue', name: 'Blue', speed: 66, hp: 2, width: 27, height: 35, cash: 1,
    color: '#3f8ff0', dark: '#2256aa', light: '#9fd2ff', children: [],
  },
  green: {
    id: 'green', name: 'Green', speed: 73, hp: 3, width: 28, height: 36, cash: 1,
    color: '#38b95d', dark: '#20733b', light: '#9cf2a8', children: [],
  },
  yellow: {
    id: 'yellow', name: 'Yellow', speed: 86, hp: 4, width: 28, height: 36, cash: 1,
    color: '#f2cf36', dark: '#a78017', light: '#fff7a3', children: [],
  },
  pink: {
    id: 'pink', name: 'Pink', speed: 108, hp: 5, width: 29, height: 37, cash: 1,
    color: '#fa72b8', dark: '#bd367f', light: '#ffc2e2', children: [],
  },
  black: {
    id: 'black', name: 'Black', speed: 82, hp: 7, width: 29, height: 37, cash: 2,
    color: '#353845', dark: '#11131a', light: '#7b8092', children: ['pink', 'pink'],
  },
  white: {
    id: 'white', name: 'White', speed: 92, hp: 7, width: 29, height: 37, cash: 2,
    color: '#f8f5e9', dark: '#bcb7a8', light: '#ffffff', children: ['pink', 'pink'],
  },
  zebra: {
    id: 'zebra', name: 'Zebra', speed: 78, hp: 11, width: 30, height: 38, cash: 3,
    color: '#f3efe2', dark: '#262733', light: '#ffffff', children: ['black'],
  },
  rainbow: {
    id: 'rainbow', name: 'Rainbow', speed: 74, hp: 20, width: 31, height: 39, cash: 4,
    color: '#ff7d47', dark: '#d14653', light: '#fff4aa', children: ['zebra', 'zebra'],
  },
  ceramic: {
    id: 'ceramic', name: 'Ceramic', speed: 64, hp: 38, width: 34, height: 41, cash: 6,
    color: '#c5763d', dark: '#71371e', light: '#ffd08b', children: ['rainbow', 'rainbow'],
  },
  moab: {
    id: 'moab', name: 'MOAB', speed: 23, hp: 320, width: 112, height: 52, cash: 30,
    color: '#df3c44', dark: '#73151f', light: '#ffb08e', children: ['ceramic', 'ceramic', 'ceramic'],
    boss: true,
  },
};

export const TOWER_ORDER = ['dart', 'tack', 'boomerang', 'bomb', 'ice', 'sniper', 'super'];

export const TOWER_TYPES = {
  dart: {
    id: 'dart',
    name: 'Dart Monkey',
    short: 'Dart',
    cost: 200,
    color: '#f0a43a',
    accent: '#fff1c9',
    blurb: 'A reliable all-rounder. Throws sharp darts at the first bloon.',
    base: { range: 132, cooldown: 0.82, damage: 1, pierce: 1, projectiles: 1, projectileSpeed: 690 },
    paths: {
      top: [
        { name: 'Sharp Shots', cost: 120, desc: '+1 dart damage', mods: { damage: 1 } },
        { name: 'Razor Sharp Shots', cost: 280, desc: '+1 damage, +14 range', mods: { damage: 1, range: 14 } },
        { name: 'Spike-o-pult', cost: 850, desc: '+2 damage, +25 range, pierces 3', mods: { damage: 2, range: 25, pierce: 2, projectileSpeed: -80 } },
      ],
      bottom: [
        { name: 'Quick Shots', cost: 140, desc: '30% faster throwing', mods: { cooldownMul: 0.7 } },
        { name: 'Very Quick Shots', cost: 310, desc: 'Another 25% faster', mods: { cooldownMul: 0.75 } },
        { name: 'Triple Darts', cost: 720, desc: '+2 darts per throw', mods: { projectiles: 2 } },
      ],
    },
  },
  tack: {
    id: 'tack',
    name: 'Tack Shooter',
    short: 'Tack',
    cost: 380,
    color: '#e56c3c',
    accent: '#ffe0b8',
    blurb: 'Fires a ring of tacks in every direction. Loves tight corners.',
    base: { range: 102, cooldown: 1.45, damage: 1, pierce: 1, projectiles: 8, projectileSpeed: 510, pattern: 'ring' },
    paths: {
      top: [
        { name: 'Faster Shooting', cost: 230, desc: '25% faster tacks', mods: { cooldownMul: 0.75 } },
        { name: 'Even Faster Shooting', cost: 390, desc: 'Another 25% faster', mods: { cooldownMul: 0.75 } },
        { name: 'Ring of Fire', cost: 980, desc: '+3 damage and burning tacks', mods: { damage: 3, range: 12, fire: true } },
      ],
      bottom: [
        { name: 'More Tacks', cost: 270, desc: '+4 tacks per volley', mods: { projectiles: 4 } },
        { name: 'Even More Tacks', cost: 430, desc: '+4 more tacks', mods: { projectiles: 4 } },
        { name: 'Blade Shooter', cost: 920, desc: '+3 damage, +34 range', mods: { damage: 3, range: 34, blades: true } },
      ],
    },
  },
  boomerang: {
    id: 'boomerang',
    name: 'Boomerang Monkey',
    short: 'Rang',
    cost: 470,
    color: '#2ca8a0',
    accent: '#c9fff1',
    blurb: 'Curving throws can strike the same bloon twice. Great coverage.',
    base: { range: 158, cooldown: 1.12, damage: 2, pierce: 3, projectiles: 1, projectileSpeed: 460, curve: 3.4 },
    paths: {
      top: [
        { name: 'Improved Rangs', cost: 240, desc: '+1 damage', mods: { damage: 1 } },
        { name: 'Glaives', cost: 520, desc: '+2 damage, +2 pierce', mods: { damage: 2, pierce: 2 } },
        { name: 'Glaive Lord', cost: 1480, desc: '+3 damage, +4 pierce', mods: { damage: 3, pierce: 4, projectileSpeed: 80 } },
      ],
      bottom: [
        { name: 'Faster Throwing', cost: 250, desc: '25% faster throws', mods: { cooldownMul: 0.75 } },
        { name: 'Multi-Target', cost: 480, desc: '+1 boomerang', mods: { projectiles: 1 } },
        { name: 'Bionic Boomer', cost: 1120, desc: '+1 rang, 30% faster', mods: { projectiles: 1, cooldownMul: 0.7 } },
      ],
    },
  },
  bomb: {
    id: 'bomb',
    name: 'Bomb Tower',
    short: 'Bomb',
    cost: 620,
    color: '#586174',
    accent: '#ffd36e',
    blurb: 'Lobs explosives that damage every bloon in the blast.',
    base: { range: 148, cooldown: 1.72, damage: 3, pierce: 1, projectiles: 1, projectileSpeed: 410, blastRadius: 64, pattern: 'lob' },
    paths: {
      top: [
        { name: 'Bigger Bombs', cost: 310, desc: '+2 damage, +14 blast radius', mods: { damage: 2, blastRadius: 14 } },
        { name: 'Heavy Bombs', cost: 620, desc: '+3 damage, +18 blast radius', mods: { damage: 3, blastRadius: 18 } },
        { name: 'MOAB Mauler', cost: 1380, desc: '+8 damage, huge vs MOABs', mods: { damage: 8, moabBonus: 10 } },
      ],
      bottom: [
        { name: 'Faster Reload', cost: 270, desc: '25% faster firing', mods: { cooldownMul: 0.75 } },
        { name: 'Extra Range', cost: 420, desc: '+42 range, +10% reload', mods: { range: 42, cooldownMul: 0.9 } },
        { name: 'Cluster Bombs', cost: 1040, desc: 'Bombs split into 3 bomblets', mods: { cluster: 3, damage: -1 } },
      ],
    },
  },
  ice: {
    id: 'ice',
    name: 'Ice Monkey',
    short: 'Ice',
    cost: 450,
    color: '#71c9dc',
    accent: '#e3ffff',
    blurb: 'Pulses frost in a circle, slowing and damaging nearby bloons.',
    base: { range: 116, cooldown: 2.3, damage: 1, slow: 0.48, slowDuration: 2.2, pattern: 'pulse' },
    paths: {
      top: [
        { name: 'Permafrost', cost: 250, desc: 'Stronger, longer slow', mods: { slow: 0.16, slowDuration: 0.8 } },
        { name: 'Deep Freeze', cost: 520, desc: '+1 damage, +1s freeze', mods: { damage: 1, slowDuration: 1 } },
        { name: 'Absolute Zero', cost: 1220, desc: '+2 damage, freezes the whole map', mods: { damage: 2, globalFreeze: true } },
      ],
      bottom: [
        { name: 'Faster Cooldown', cost: 290, desc: '30% faster pulses', mods: { cooldownMul: 0.7 } },
        { name: 'Larger Radius', cost: 390, desc: '+38 frost radius', mods: { range: 38 } },
        { name: 'Ice Shards', cost: 920, desc: '+2 damage, fires 8 shards', mods: { damage: 2, shards: 8 } },
      ],
    },
  },
  sniper: {
    id: 'sniper',
    name: 'Sniper Monkey',
    short: 'Sniper',
    cost: 510,
    color: '#738a3c',
    accent: '#f7ffcc',
    blurb: 'Unlimited range and a powerful rifle. Prioritises the strongest bloon.',
    base: { range: 9999, cooldown: 1.55, damage: 5, pierce: 1, projectiles: 1, pattern: 'hitscan' },
    paths: {
      top: [
        { name: 'Full Metal Jacket', cost: 340, desc: '+3 damage', mods: { damage: 3 } },
        { name: 'Point Five Oh', cost: 680, desc: '+5 damage', mods: { damage: 5 } },
        { name: 'Cripple MOAB', cost: 1540, desc: '+10 damage, +25 vs MOABs', mods: { damage: 10, moabBonus: 25 } },
      ],
      bottom: [
        { name: 'Faster Firing', cost: 300, desc: '30% faster shots', mods: { cooldownMul: 0.7 } },
        { name: 'Even Faster Firing', cost: 520, desc: 'Another 25% faster', mods: { cooldownMul: 0.75 } },
        { name: 'Deadly Precision', cost: 1140, desc: '+6 damage, 25% crits', mods: { damage: 6, crit: 0.25 } },
      ],
    },
  },
  super: {
    id: 'super',
    name: 'Super Monkey',
    short: 'Super',
    cost: 3100,
    color: '#cf3e4d',
    accent: '#ffe37b',
    blurb: 'A tiny hero with a blur of darts. The ultimate late-game defender.',
    base: { range: 190, cooldown: 0.11, damage: 1, pierce: 1, projectiles: 1, projectileSpeed: 850 },
    paths: {
      top: [
        { name: 'Laser Blasts', cost: 1350, desc: '+1 damage, pierce 3', mods: { damage: 1, pierce: 2 } },
        { name: 'Plasma Blasts', cost: 2800, desc: '+2 damage, pierce 5', mods: { damage: 2, pierce: 2 } },
        { name: 'Sun God', cost: 6200, desc: '+4 damage, +2 darts', mods: { damage: 4, projectiles: 2, range: 30 } },
      ],
      bottom: [
        { name: 'Super Range', cost: 780, desc: '+52 range', mods: { range: 52 } },
        { name: 'Epic Range', cost: 1520, desc: '+58 range, faster', mods: { range: 58, cooldownMul: 0.9 } },
        { name: 'Robo Monkey', cost: 3480, desc: '+2 darts, 25% faster', mods: { projectiles: 2, cooldownMul: 0.75 } },
      ],
    },
  },
};

export function getTowerStats(type, levels = { top: 0, bottom: 0 }) {
  const def = TOWER_TYPES[type];
  if (!def) throw new Error(`Unknown tower type: ${type}`);
  const stats = { ...def.base };
  for (const path of ['top', 'bottom']) {
    const count = levels[path] || 0;
    for (let i = 0; i < count; i += 1) {
      const upgrade = def.paths[path][i];
      if (!upgrade) continue;
      const mods = upgrade.mods || {};
      for (const [key, value] of Object.entries(mods)) {
        if (key.endsWith('Mul')) {
          const statKey = key.slice(0, -3);
          stats[statKey] = (stats[statKey] || 0) * value;
        } else if (key === 'slow') {
          stats.slow = Math.min(0.9, (stats.slow || 0) + value);
        } else {
          stats[key] = (stats[key] || 0) + value;
        }
      }
    }
  }
  return stats;
}

export function getTowerInvestment(tower) {
  let total = TOWER_TYPES[tower.type].cost;
  for (const path of ['top', 'bottom']) {
    const count = tower.levels?.[path] || 0;
    for (let i = 0; i < count; i += 1) total += TOWER_TYPES[tower.type].paths[path][i].cost;
  }
  return total;
}

export function getSellValue(tower) {
  return Math.floor(getTowerInvestment(tower) * 0.7);
}

export function getNextUpgrade(type, levels, path) {
  const list = TOWER_TYPES[type].paths[path];
  const index = levels[path] || 0;
  return index < list.length ? list[index] : null;
}

export function getTotalLevel(tower) {
  return (tower.levels?.top || 0) + (tower.levels?.bottom || 0);
}

const g = (type, count, gap = 0.6, delay = 0) => ({ type, count, gap, delay });

// Hand-tuned waves. Later waves mix in layered bloons and bosses.
export const WAVES = [
  [g('red', 10, 0.72)],
  [g('red', 18, 0.55)],
  [g('red', 14, 0.55), g('blue', 8, 0.7, 4.5)],
  [g('blue', 16, 0.55), g('green', 8, 0.75, 5)],
  [g('green', 18, 0.5), g('yellow', 8, 0.7, 5)],
  [g('yellow', 16, 0.48), g('pink', 10, 0.62, 5)],
  [g('pink', 18, 0.44), g('black', 8, 0.8, 5)],
  [g('black', 10, 0.7), g('white', 10, 0.7, 2), g('yellow', 14, 0.35, 8)],
  [g('zebra', 8, 0.9), g('white', 12, 0.45, 4), g('pink', 18, 0.3, 9)],
  [g('moab', 1, 1, 2), g('red', 20, 0.35, 0)],
  [g('rainbow', 5, 1.1), g('black', 14, 0.42, 4), g('yellow', 20, 0.26, 8)],
  [g('zebra', 14, 0.6), g('pink', 24, 0.26, 3), g('white', 12, 0.55, 9)],
  [g('rainbow', 8, 0.9), g('black', 18, 0.36, 4), g('white', 14, 0.45, 9)],
  [g('ceramic', 3, 1.5), g('zebra', 16, 0.5, 4), g('rainbow', 6, 0.9, 10)],
  [g('rainbow', 12, 0.65), g('black', 24, 0.28, 4), g('pink', 30, 0.2, 9)],
  [g('ceramic', 5, 1.2), g('white', 24, 0.3, 4), g('zebra', 14, 0.55, 9)],
  [g('rainbow', 16, 0.55), g('ceramic', 4, 1.6, 6), g('pink', 30, 0.18, 10)],
  [g('ceramic', 7, 1), g('rainbow', 12, 0.6, 5), g('black', 30, 0.24, 10)],
  [g('zebra', 30, 0.3), g('rainbow', 14, 0.55, 5), g('ceramic', 6, 1.1, 11)],
  [g('moab', 2, 4, 2), g('rainbow', 8, 0.7, 0), g('pink', 24, 0.25, 8)],
  [g('ceramic', 10, 0.85), g('rainbow', 20, 0.42, 5), g('white', 30, 0.22, 10)],
  [g('moab', 1, 1, 2), g('ceramic', 8, 1, 6), g('rainbow', 18, 0.4, 12)],
  [g('rainbow', 30, 0.32), g('ceramic', 10, 0.8, 6), g('zebra', 20, 0.35, 12)],
  [g('ceramic', 14, 0.7), g('rainbow', 24, 0.32, 5), g('moab', 1, 1, 14)],
  [g('moab', 3, 3, 2), g('ceramic', 10, 0.8, 7), g('rainbow', 24, 0.3, 13)],
  [g('ceramic', 18, 0.6), g('rainbow', 30, 0.28, 5), g('black', 30, 0.2, 12)],
  [g('moab', 2, 5, 1), g('ceramic', 16, 0.55, 6), g('rainbow', 30, 0.25, 13)],
  [g('ceramic', 24, 0.45), g('rainbow', 36, 0.24, 5), g('moab', 2, 4, 14)],
  [g('moab', 4, 2.5, 1), g('ceramic', 20, 0.5, 6), g('rainbow', 40, 0.2, 12)],
  [g('moab', 6, 2, 1), g('ceramic', 30, 0.38, 5), g('rainbow', 50, 0.16, 12)],
];

export function getWave(waveNumber) {
  const index = Math.max(0, Math.min(WAVES.length - 1, waveNumber - 1));
  const groups = WAVES[index].map((group, i) => ({ ...group, order: i }));
  const spawns = [];
  for (const group of groups) {
    for (let i = 0; i < group.count; i += 1) {
      spawns.push({
        type: group.type,
        at: group.delay + i * group.gap,
        lane: (i % 5) - 2,
      });
    }
  }
  spawns.sort((a, b) => a.at - b.at || a.lane - b.lane);
  const rbe = groups.reduce((sum, group) => {
    const countRbe = balloonRbe(group.type);
    return sum + countRbe * group.count;
  }, 0);
  return {
    number: waveNumber,
    groups,
    spawns,
    duration: spawns.length ? spawns[spawns.length - 1].at : 0,
    rbe,
    reward: 22 + waveNumber * 7,
    boss: groups.some((group) => BALLOON_TYPES[group.type]?.boss),
  };
}

export function balloonRbe(typeId) {
  const type = BALLOON_TYPES[typeId];
  if (!type) return 0;
  return type.hp + type.children.reduce((sum, child) => sum + balloonRbe(child), 0);
}

export function getLeakDamage(typeId) {
  if (typeId === 'moab') return 25;
  return 1;
}

export function formatMoney(value) {
  return value >= 10000 ? `${(value / 1000).toFixed(value >= 100000 ? 0 : 1)}k` : `${Math.floor(value)}`;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}
