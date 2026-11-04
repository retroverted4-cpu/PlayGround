export const W = 1200;
export const H = 760;
export const TOTAL_ROUNDS = 50;

export const PATH_ANCHORS = [
  [-70, 390],
  [130, 390],
  [250, 430],
  [300, 530],
  [390, 600],
  [540, 605],
  [635, 540],
  [645, 420],
  [565, 330],
  [520, 230],
  [565, 140],
  [700, 110],
  [835, 145],
  [900, 240],
  [875, 345],
  [800, 420],
  [785, 520],
  [835, 620],
  [960, 660],
  [1090, 610],
  [1130, 500],
  [1090, 390],
  [1100, 290],
  [1180, 210],
  [1290, 200],
];

export const BLOONS = {
  red: {
    name: 'Red', color: '#f0524d', color2: '#b7212b', shine: '#ffb0a9', size: 14,
    speed: 54, hp: 1, children: [], leak: 1, cash: 1, rbe: 1,
  },
  blue: {
    name: 'Blue', color: '#3d8df5', color2: '#1d55b8', shine: '#a8d4ff', size: 16,
    speed: 62, hp: 1, children: ['red'], leak: 2, cash: 1, rbe: 2,
  },
  green: {
    name: 'Green', color: '#48c95a', color2: '#1b7e36', shine: '#b7ffc1', size: 18,
    speed: 70, hp: 1, children: ['blue'], leak: 3, cash: 1, rbe: 3,
  },
  yellow: {
    name: 'Yellow', color: '#ffd83e', color2: '#cf8c0d', shine: '#fff4af', size: 20,
    speed: 82, hp: 1, children: ['green'], leak: 4, cash: 1, rbe: 4,
  },
  pink: {
    name: 'Pink', color: '#ff86c8', color2: '#cb3b8d', shine: '#ffd6ed', size: 22,
    speed: 94, hp: 1, children: ['yellow'], leak: 5, cash: 1, rbe: 5,
  },
  black: {
    name: 'Black', color: '#454650', color2: '#171820', shine: '#9295a8', size: 21,
    speed: 82, hp: 1, children: ['pink'], leak: 6, cash: 1, rbe: 6,
  },
  white: {
    name: 'White', color: '#f2f1e8', color2: '#aaa9a1', shine: '#ffffff', size: 21,
    speed: 82, hp: 1, children: ['pink'], leak: 6, cash: 1, rbe: 6,
  },
  zebra: {
    name: 'Zebra', color: '#f3f1e7', color2: '#8e8c86', shine: '#ffffff', size: 24,
    speed: 78, hp: 1, children: ['black', 'white'], leak: 12, cash: 1, rbe: 12,
    stripes: true,
  },
  rainbow: {
    name: 'Rainbow', color: '#ff749d', color2: '#7045d8', shine: '#fff0a8', size: 26,
    speed: 74, hp: 1, children: ['zebra', 'zebra'], leak: 20, cash: 2, rbe: 24,
    rainbow: true,
  },
  ceramic: {
    name: 'Ceramic', color: '#d28a45', color2: '#8b451e', shine: '#ffd29a', size: 28,
    speed: 62, hp: 7, children: ['rainbow', 'rainbow'], leak: 30, cash: 5, rbe: 55,
    ceramic: true,
  },
  moab: {
    name: 'MOAB', color: '#5591e8', color2: '#1c3e8a', shine: '#b7dbff', size: 56,
    speed: 40, hp: 180, children: ['ceramic', 'ceramic', 'ceramic', 'ceramic'],
    leak: 50, cash: 30, rbe: 400, blimp: true,
  },
  bfb: {
    name: 'BFB', color: '#e9554f', color2: '#7e1f24', shine: '#ffb39b', size: 72,
    speed: 32, hp: 620, children: ['moab', 'moab', 'moab'],
    leak: 100, cash: 80, rbe: 1820, blimp: true, boss: true,
  },
};

export const BLOON_ORDER = ['red', 'blue', 'green', 'yellow', 'pink', 'black', 'white', 'zebra', 'rainbow', 'ceramic', 'moab', 'bfb'];

export const TOWERS = {
  dart: {
    name: 'Dart Monkey', short: 'Dart', cost: 200, tint: '#e9b949', fur: '#9b673e', furDark: '#724625',
    face: '#f4ca9b', shirt: '#d7a52e', accent: '#e4572e', range: 142, cooldown: 0.72,
    damage: 1, pierce: 1, shots: 1, projectile: 'dart', blurb: 'Cheerful all-rounder with a trusty dart.',
    statsLabel: ['Range', 'Damage', 'Rate'],
    upgrades: [
      { name: 'Long Range Darts', cost: 140, desc: '+30% range', apply: (t) => { t.range *= 1.3; } },
      { name: 'Triple Darts', cost: 360, desc: 'Throws three darts', apply: (t) => { t.shots = 3; } },
      { name: 'Spike-o-pult', cost: 900, desc: 'Heavy spikes, +2 damage', apply: (t) => { t.damage = 3; t.pierce = 3; t.cooldown = 0.9; t.projectile = 'spike'; } },
    ],
  },
  tack: {
    name: 'Tack Shooter', short: 'Tack', cost: 340, tint: '#ff7a6a', fur: '#8f5d38', furDark: '#653e23',
    face: '#f1c596', shirt: '#c84747', accent: '#ffbf3c', range: 102, cooldown: 1.32,
    damage: 1, pierce: 1, shots: 8, radial: true, projectile: 'tack', blurb: 'Fires a ring of tacks in every direction.',
    upgrades: [
      { name: 'Faster Tacks', cost: 200, desc: '30% faster reload', apply: (t) => { t.cooldown *= 0.7; } },
      { name: 'More Tacks', cost: 350, desc: 'Fires 12 tacks', apply: (t) => { t.shots = 12; } },
      { name: 'Ring of Fire', cost: 1300, desc: '16 burning tacks, +1 damage', apply: (t) => { t.shots = 16; t.damage = 2; t.fire = true; } },
    ],
  },
  boomerang: {
    name: 'Boomerang Monkey', short: 'Boomerang', cost: 325, tint: '#ff9f43', fur: '#9a653b', furDark: '#714425',
    face: '#f5cd9f', shirt: '#d2782a', accent: '#ffe15a', range: 152, cooldown: 1.02,
    damage: 1, pierce: 2, shots: 1, projectile: 'boomerang', blurb: 'Curving throws hit twice on the way back.',
    upgrades: [
      { name: 'Faster Throw', cost: 220, desc: '30% faster reload', apply: (t) => { t.cooldown *= 0.7; } },
      { name: 'Glaive Ricochet', cost: 600, desc: '+1 damage, +3 pierce', apply: (t) => { t.damage = 2; t.pierce = 5; t.projectile = 'glaive'; } },
      { name: 'Glaive Lord', cost: 1700, desc: 'Glaives shred bloons', apply: (t) => { t.damage = 3; t.pierce = 8; t.cooldown *= 0.8; } },
    ],
  },
  bomb: {
    name: 'Bomb Tower', short: 'Bomb', cost: 525, tint: '#ffba5c', fur: '#8e613f', furDark: '#5f3c26',
    face: '#efc391', shirt: '#3b6f88', accent: '#ff8557', range: 148, cooldown: 1.28,
    damage: 2, pierce: 1, splash: 42, shots: 1, projectile: 'bomb', blurb: 'Lobs black powder with splash damage.',
    upgrades: [
      { name: 'Bigger Bombs', cost: 400, desc: '+55% blast radius', apply: (t) => { t.splash *= 1.55; } },
      { name: 'Faster Reload', cost: 500, desc: '35% faster reload', apply: (t) => { t.cooldown *= 0.65; } },
      { name: 'Cluster Bombs', cost: 1600, desc: '+2 damage, huge blasts', apply: (t) => { t.damage = 4; t.splash *= 1.35; } },
    ],
  },
  ice: {
    name: 'Ice Monkey', short: 'Ice', cost: 400, tint: '#81ddff', fur: '#7f9fb8', furDark: '#506d88',
    face: '#dff5ff', shirt: '#2f90b5', accent: '#c5f5ff', range: 112, cooldown: 2.2,
    damage: 0, pierce: 99, shots: 1, pulse: true, freeze: 0.95, blurb: 'Freezes every bloon that comes close.',
    upgrades: [
      { name: 'Larger Radius', cost: 240, desc: '+45% freeze radius', apply: (t) => { t.range *= 1.45; } },
      { name: 'Faster Freezing', cost: 400, desc: '40% faster pulses', apply: (t) => { t.cooldown *= 0.6; } },
      { name: 'Deep Freeze', cost: 1100, desc: 'Longer freeze and shatter damage', apply: (t) => { t.freeze = 1.55; t.damage = 1; } },
    ],
  },
  glue: {
    name: 'Glue Gunner', short: 'Glue', cost: 350, tint: '#b8e957', fur: '#8b653e', furDark: '#5e4128',
    face: '#f2cf9e', shirt: '#6f8f2a', accent: '#d4ff64', range: 142, cooldown: 1.35,
    damage: 0, pierce: 1, shots: 1, projectile: 'glue', slow: 0.55, slowTime: 2.7,
    blurb: 'Drenches bloons in sticky, slowing goo.',
    upgrades: [
      { name: 'Stronger Glue', cost: 250, desc: 'Stronger, longer slow', apply: (t) => { t.slow = 0.4; t.slowTime = 3.7; } },
      { name: 'Corrosive Glue', cost: 450, desc: 'Glue burns over time', apply: (t) => { t.dot = 1; } },
      { name: 'Bloon Dissolver', cost: 1400, desc: 'Acid glue, +2 damage over time', apply: (t) => { t.slow = 0.28; t.dot = 2; t.cooldown *= 0.7; } },
    ],
  },
  sniper: {
    name: 'Sniper Monkey', short: 'Sniper', cost: 425, tint: '#9fd19a', fur: '#9c7048', furDark: '#68482d',
    face: '#f1ca9b', shirt: '#6c7b3f', accent: '#ffd15c', range: 9999, cooldown: 1.6,
    damage: 2, pierce: 1, shots: 1, projectile: 'sniper', global: true, blurb: 'Picks off bloons anywhere on the map.',
    upgrades: [
      { name: 'Full Metal Jacket', cost: 450, desc: '+3 damage per shot', apply: (t) => { t.damage = 5; } },
      { name: 'Faster Firing', cost: 550, desc: '45% faster shots', apply: (t) => { t.cooldown *= 0.55; } },
      { name: 'Cripple MOAB', cost: 1800, desc: 'Massive blimp damage', apply: (t) => { t.damage = 12; t.blimpDamage = 42; } },
    ],
  },
  ninja: {
    name: 'Ninja Monkey', short: 'Ninja', cost: 500, tint: '#b7b6ff', fur: '#6b5a78', furDark: '#3f344d',
    face: '#e8cfa8', shirt: '#2c2f45', accent: '#ff525f', range: 132, cooldown: 0.56,
    damage: 1, pierce: 2, shots: 1, projectile: 'shuriken', blurb: 'A blur of shurikens and quiet precision.',
    upgrades: [
      { name: 'Ninja Discipline', cost: 300, desc: '35% faster attacks', apply: (t) => { t.cooldown *= 0.65; } },
      { name: 'Sharp Shurikens', cost: 550, desc: '+1 damage, +1 pierce', apply: (t) => { t.damage = 2; t.pierce = 3; } },
      { name: 'Bloonjitsu', cost: 1600, desc: 'Throws four shurikens', apply: (t) => { t.shots = 4; t.cooldown *= 0.82; } },
    ],
  },
  super: {
    name: 'Super Monkey', short: 'Super', cost: 2800, tint: '#ffdf62', fur: '#7e4e32', furDark: '#4f2b1a',
    face: '#f6cf9f', shirt: '#c52c35', accent: '#ffe352', range: 168, cooldown: 0.18,
    damage: 1, pierce: 1, shots: 1, projectile: 'super', blurb: 'A tiny cape, a mighty barrage of darts.',
    upgrades: [
      { name: 'Laser Vision', cost: 1200, desc: 'Eye lasers, +1 damage', apply: (t) => { t.damage = 2; t.projectile = 'laser'; } },
      { name: 'Plasma Blasts', cost: 1800, desc: '+1 damage, faster fire', apply: (t) => { t.damage = 3; t.cooldown *= 0.55; t.projectile = 'plasma'; } },
      { name: 'Sun God', cost: 4500, desc: 'Solar fury, +3 damage', apply: (t) => { t.damage = 6; t.cooldown *= 0.72; t.range *= 1.3; t.pierce = 3; } },
    ],
  },
  farm: {
    name: 'Banana Farm', short: 'Farm', cost: 900, tint: '#ffe368', fur: '#9c7047', furDark: '#68482d',
    face: '#f5cd9c', shirt: '#7e9f3c', accent: '#ffe15d', range: 0, cooldown: 0,
    damage: 0, pierce: 0, shots: 0, income: 150, support: true, blurb: 'Grows extra bananas at the end of every wave.',
    upgrades: [
      { name: 'More Bananas', cost: 400, desc: '+$180 wave income', apply: (t) => { t.income = 330; } },
      { name: 'Banana Plantation', cost: 800, desc: '+$370 wave income', apply: (t) => { t.income = 700; } },
      { name: 'Banana Republic', cost: 2000, desc: '+$1,300 wave income', apply: (t) => { t.income = 2000; } },
    ],
  },
};

export const TOWER_ORDER = ['dart', 'tack', 'boomerang', 'bomb', 'ice', 'glue', 'sniper', 'ninja', 'super', 'farm'];

export const TARGET_MODES = [
  { key: 'first', label: 'First' },
  { key: 'last', label: 'Last' },
  { key: 'close', label: 'Close' },
  { key: 'strong', label: 'Strong' },
];

function g(type, count, gap = 0.5, delay = 0) {
  return { type, count, gap, delay };
}

function wave(groups) {
  return { groups };
}

export const WAVES = [
  wave([g('red', 10, 0.78)]),
  wave([g('red', 20, 0.56)]),
  wave([g('red', 12, 0.58), g('blue', 8, 0.58, 5.2)]),
  wave([g('blue', 22, 0.5)]),
  wave([g('blue', 12, 0.5), g('green', 9, 0.55, 4.5)]),
  wave([g('green', 20, 0.46)]),
  wave([g('green', 12, 0.46), g('yellow', 9, 0.5, 4)]),
  wave([g('yellow', 20, 0.42)]),
  wave([g('yellow', 12, 0.44), g('pink', 9, 0.46, 4)]),
  wave([g('pink', 22, 0.4)]),
  wave([g('black', 7, 0.55), g('white', 7, 0.55, 0.4), g('pink', 10, 0.42, 4)]),
  wave([g('black', 11, 0.48), g('white', 11, 0.48, 0.24)]),
  wave([g('zebra', 6, 0.72), g('pink', 12, 0.4, 4.5)]),
  wave([g('zebra', 13, 0.55)]),
  wave([g('rainbow', 4, 0.95), g('zebra', 8, 0.55, 4)]),
  wave([g('rainbow', 8, 0.72)]),
  wave([g('rainbow', 6, 0.7), g('ceramic', 2, 1.15, 5)]),
  wave([g('ceramic', 6, 0.9)]),
  wave([g('ceramic', 8, 0.82), g('rainbow', 6, 0.55, 4.2)]),
  wave([g('ceramic', 10, 0.78)]),
  wave([g('ceramic', 7, 0.75), g('rainbow', 10, 0.44, 3.5), g('zebra', 8, 0.42, 7)]),
  wave([g('rainbow', 16, 0.48)]),
  wave([g('ceramic', 12, 0.68)]),
  wave([g('ceramic', 8, 0.7), g('rainbow', 12, 0.42, 4)]),
  wave([g('zebra', 14, 0.4), g('rainbow', 10, 0.48, 3.8)]),
  wave([g('ceramic', 14, 0.62)]),
  wave([g('rainbow', 18, 0.4), g('ceramic', 6, 0.85, 5)]),
  wave([g('ceramic', 18, 0.56)]),
  wave([g('ceramic', 12, 0.58), g('rainbow', 14, 0.38, 3.6)]),
  wave([g('ceramic', 22, 0.5)]),
  wave([g('rainbow', 26, 0.32)]),
  wave([g('ceramic', 24, 0.48)]),
  wave([g('ceramic', 16, 0.5), g('rainbow', 18, 0.34, 3.2)]),
  wave([g('ceramic', 28, 0.44)]),
  wave([g('ceramic', 20, 0.45), g('zebra', 20, 0.24, 4.4)]),
  wave([g('ceramic', 32, 0.4)]),
  wave([g('ceramic', 22, 0.42), g('rainbow', 18, 0.3, 3.2)]),
  wave([g('ceramic', 36, 0.36)]),
  wave([g('rainbow', 30, 0.26), g('ceramic', 20, 0.55, 3.8)]),
  wave([g('moab', 1, 1), g('ceramic', 12, 0.62, 4)]),
  wave([g('ceramic', 42, 0.33)]),
  wave([g('ceramic', 28, 0.36), g('rainbow', 22, 0.25, 3)]),
  wave([g('ceramic', 46, 0.3)]),
  wave([g('moab', 2, 1.4), g('ceramic', 14, 0.5, 5)]),
  wave([g('ceramic', 50, 0.28), g('rainbow', 24, 0.2, 2.8)]),
  wave([g('ceramic', 54, 0.26)]),
  wave([g('moab', 3, 1.2), g('ceramic', 16, 0.48, 4)]),
  wave([g('ceramic', 60, 0.24), g('rainbow', 22, 0.2, 3)]),
  wave([g('moab', 4, 1.1), g('ceramic', 18, 0.45, 4)]),
  wave([g('bfb', 1, 1), g('moab', 1, 1, 6), g('ceramic', 20, 0.4, 3)]),
];

export function getWave(round) {
  if (round <= WAVES.length) return WAVES[round - 1];
  const extra = round - WAVES.length;
  const scale = 1 + extra * 0.14;
  const groups = [
    g('ceramic', Math.round(45 + extra * 9), Math.max(0.15, 0.25 - extra * 0.004)),
    g('rainbow', Math.round(20 + extra * 5), 0.18, 2.4),
  ];
  if (extra % 2 === 0) groups.push(g('moab', 3 + Math.ceil(extra / 2), 1.1, 4));
  if (extra % 5 === 0) groups.push(g('bfb', 1 + Math.floor(extra / 5), 2, 8));
  return { groups, scale };
}

export function waveThreat(groups) {
  const counts = new Map();
  let total = 0;
  for (const group of groups) {
    counts.set(group.type, (counts.get(group.type) || 0) + group.count);
    total += group.count;
  }
  return { counts: [...counts.entries()], total };
}

export function difficultyFor(round) {
  if (round <= 10) return { label: 'Calm', className: '' };
  if (round <= 20) return { label: 'Breezy', className: '' };
  if (round <= 30) return { label: 'Tricky', className: 'is-hard' };
  if (round <= 40) return { label: 'Tough', className: 'is-hard' };
  if (round <= 48) return { label: 'Brutal', className: 'is-brutal' };
  return { label: 'Finale', className: 'is-brutal' };
}
