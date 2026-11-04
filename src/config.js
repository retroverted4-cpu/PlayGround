// Core game data: map, bloons, towers and upgrades.

export const W = 1280;
export const H = 720;
export const MAX_ROUND = 40;
export const START_CASH = 700;
export const START_LIVES = 100;

export const MAP = {
  name: "Sunny Meadow",
  waypoints: [
    { x: -60, y: 110 },
    { x: 150, y: 110 },
    { x: 268, y: 168 },
    { x: 300, y: 288 },
    { x: 226, y: 364 },
    { x: 205, y: 452 },
    { x: 298, y: 518 },
    { x: 468, y: 528 },
    { x: 584, y: 468 },
    { x: 620, y: 345 },
    { x: 736, y: 289 },
    { x: 864, y: 314 },
    { x: 944, y: 404 },
    { x: 906, y: 524 },
    { x: 1004, y: 610 },
    { x: 1330, y: 615 },
  ],
  pathWidth: 62,
};

// Each bloon's `children` is what pops out when it is destroyed.
export const BLOONS = {
  red: {
    name: "Red", color: "#ff525f", shade: "#c92f3d", accent: "#ffb4b9",
    hp: 1, speed: 56, radius: 14, bounty: 3, leak: 1, children: [],
  },
  blue: {
    name: "Blue", color: "#4b9dff", shade: "#2a63c4", accent: "#b5d9ff",
    hp: 1, speed: 72, radius: 14, bounty: 4, leak: 1, children: ["red"],
  },
  green: {
    name: "Green", color: "#4ddc69", shade: "#218f3a", accent: "#bdf7c7",
    hp: 1, speed: 88, radius: 14, bounty: 5, leak: 1, children: ["blue"],
  },
  yellow: {
    name: "Yellow", color: "#ffe34d", shade: "#c9a512", accent: "#fff4b2",
    hp: 1, speed: 108, radius: 14, bounty: 6, leak: 1, children: ["green"],
  },
  pink: {
    name: "Pink", color: "#ff7edc", shade: "#c43d9c", accent: "#ffd1f3",
    hp: 1, speed: 130, radius: 14, bounty: 7, leak: 1, children: ["yellow"],
  },
  black: {
    name: "Black", color: "#39424e", shade: "#161c24", accent: "#9aa9ba",
    hp: 1, speed: 112, radius: 14, bounty: 8, leak: 1, children: ["pink", "pink"],
    pattern: "black",
  },
  white: {
    name: "White", color: "#f4f7ff", shade: "#b7c4dd", accent: "#ffffff",
    hp: 1, speed: 136, radius: 14, bounty: 9, leak: 1, children: ["pink", "pink"],
    pattern: "white",
  },
  zebra: {
    name: "Zebra", color: "#eef2f8", shade: "#8e98ab", accent: "#ffffff",
    hp: 2, speed: 122, radius: 15, bounty: 12, leak: 1, children: ["black", "white"],
    pattern: "zebra",
  },
  rainbow: {
    name: "Rainbow", color: "#ff8a5c", shade: "#b83d7a", accent: "#ffffff",
    hp: 2, speed: 144, radius: 15, bounty: 16, leak: 1, children: ["zebra", "zebra"],
    pattern: "rainbow",
  },
  ceramic: {
    name: "Ceramic", color: "#c58b56", shade: "#7d4d26", accent: "#f4d6a8",
    hp: 11, speed: 94, radius: 17, bounty: 26, leak: 5, children: ["rainbow", "rainbow"],
    pattern: "ceramic", armored: true,
  },
  moab: {
    name: "MOAB", color: "#9aa4b2", shade: "#4a5361", accent: "#d9e2ee",
    hp: 220, speed: 42, radius: 32, bounty: 140, leak: 25,
    children: ["ceramic", "ceramic", "ceramic"], pattern: "moab", armored: true,
    big: true,
  },
};

export const TOWERS = [
  {
    id: "dart", name: "Dart Monkey", short: "Dart", cost: 200,
    color: "#64c6ff", blurb: "Steady single-target darts.",
    base: { range: 126, cooldown: 0.82, damage: 1, pierce: 2, speed: 560, count: 1 },
    upgrades: [
      { name: "Sharp Shots", cost: 130, desc: "+1 damage", mods: { damage: 1 } },
      { name: "Quick Draw", cost: 290, desc: "30% faster, +20 range", mods: { cooldownMul: 0.7, range: 20 } },
      { name: "Triple Darts", cost: 680, desc: "3 darts, +1 damage", mods: { count: 3, damage: 1, pierce: 1 } },
    ],
  },
  {
    id: "tack", name: "Tack Shooter", short: "Tack", cost: 350,
    color: "#ff9a5c", blurb: "Fires spikes in every direction.",
    base: { range: 98, cooldown: 1.12, damage: 1, pierce: 1, speed: 440, count: 8, radial: true, life: 0.24 },
    upgrades: [
      { name: "More Tacks", cost: 220, desc: "10 tacks", mods: { count: 2 } },
      { name: "Faster Firing", cost: 380, desc: "35% faster", mods: { cooldownMul: 0.65 } },
      { name: "Ring of Fire", cost: 760, desc: "16 tacks, +1 damage", mods: { count: 6, damage: 1 } },
    ],
  },
  {
    id: "boomerang", name: "Boomerang Monkey", short: "Boomer", cost: 450,
    color: "#ffd35c", blurb: "Throws a boomerang that hits twice.",
    base: { range: 150, cooldown: 1.05, damage: 2, pierce: 4, speed: 330, count: 1, boomerang: true },
    upgrades: [
      { name: "Long Throw", cost: 260, desc: "+40 range, faster", mods: { range: 40, speed: 60 } },
      { name: "Kylie Boomerang", cost: 460, desc: "+2 damage", mods: { damage: 2 } },
      { name: "Glaive Lord", cost: 980, desc: "Double glaives, +3 pierce", mods: { count: 2, pierce: 3, cooldownMul: 0.8 } },
    ],
  },
  {
    id: "bomb", name: "Bomb Shooter", short: "Bomb", cost: 600,
    color: "#ff6b6b", blurb: "Explosive shells damage groups.",
    base: { range: 150, cooldown: 1.45, damage: 2, pierce: 99, speed: 300, count: 1, splash: 62, bomb: true },
    upgrades: [
      { name: "Bigger Bombs", cost: 340, desc: "+18 blast radius", mods: { splash: 18 } },
      { name: "Heavy Shells", cost: 580, desc: "+2 damage", mods: { damage: 2 } },
      { name: "Cluster Bombs", cost: 1150, desc: "3 shells, faster", mods: { count: 3, cooldownMul: 0.7 } },
    ],
  },
  {
    id: "ice", name: "Ice Monkey", short: "Ice", cost: 500,
    color: "#9be7ff", blurb: "Chills every bloon around it.",
    base: { range: 104, cooldown: 2.1, damage: 0.5, pierce: 99, count: 1, slow: 0.45, slowDur: 1.7, pulse: true },
    upgrades: [
      { name: "Permafrost", cost: 300, desc: "Slow lasts 1s longer", mods: { slowDur: 1, damage: 0.5 } },
      { name: "Deep Freeze", cost: 520, desc: "Much stronger slow", mods: { slow: 0.18, slowDur: 0.6 } },
      { name: "Absolute Zero", cost: 1050, desc: "Wide pulse, stronger chill", mods: { range: 75, slow: 0.1, cooldownMul: 0.65 } },
    ],
  },
  {
    id: "sniper", name: "Sniper Monkey", short: "Sniper", cost: 420,
    color: "#c0ff7a", blurb: "Infinite range, heavy single shots.",
    base: { range: 99999, cooldown: 2.0, damage: 5, pierce: 1, speed: 0, count: 1, hitscan: true, global: true },
    upgrades: [
      { name: "Full Metal Jacket", cost: 380, desc: "+4 damage", mods: { damage: 4 } },
      { name: "Faster Scope", cost: 560, desc: "45% faster", mods: { cooldownMul: 0.55 } },
      { name: "Bouncing Bullet", cost: 1250, desc: "Hits 3 targets", mods: { pierce: 3, damage: 4 } },
    ],
  },
  {
    id: "ninja", name: "Ninja Monkey", short: "Ninja", cost: 560,
    color: "#b9a7ff", blurb: "Rapid shuriken volleys.",
    base: { range: 138, cooldown: 0.46, damage: 1, pierce: 3, speed: 700, count: 1 },
    upgrades: [
      { name: "Ninja Discipline", cost: 300, desc: "+25 range, +1 pierce", mods: { range: 25, pierce: 1 } },
      { name: "Sharp Shurikens", cost: 480, desc: "+1 damage", mods: { damage: 1 } },
      { name: "Double Shot", cost: 1100, desc: "2 shurikens, 25% faster", mods: { count: 2, cooldownMul: 0.75 } },
    ],
  },
  {
    id: "wizard", name: "Wizard Monkey", short: "Wizard", cost: 700,
    color: "#c78bff", blurb: "Splash-damage magic bolts.",
    base: { range: 152, cooldown: 1.2, damage: 2, pierce: 3, speed: 400, count: 1, splash: 38, magic: true },
    upgrades: [
      { name: "Guided Magic", cost: 400, desc: "+2 damage, +20 range", mods: { damage: 2, range: 20 } },
      { name: "Fireball", cost: 700, desc: "Bigger blast", mods: { splash: 28, damage: 1 } },
      { name: "Arcane Mastery", cost: 1450, desc: "3 bolts, 30% faster", mods: { count: 3, cooldownMul: 0.7 } },
    ],
  },
  {
    id: "super", name: "Super Monkey", short: "Super", cost: 3800,
    color: "#ffcf5c", blurb: "A laser-firing legend.",
    base: { range: 188, cooldown: 0.13, damage: 1, pierce: 3, speed: 900, count: 1, laser: true },
    upgrades: [
      { name: "Laser Vision", cost: 1600, desc: "+2 damage, +1 pierce", mods: { damage: 2, pierce: 1 } },
      { name: "Plasma Blasts", cost: 2600, desc: "+30 range, faster", mods: { range: 30, cooldownMul: 0.75 } },
      { name: "Sun God", cost: 5200, desc: "3 beams, huge damage", mods: { count: 3, damage: 4 } },
    ],
  },
];

export const TOWER_BY_ID = Object.fromEntries(TOWERS.map((t) => [t.id, t]));

export function towerStats(def, level) {
  const s = { ...def.base };
  for (let i = 0; i < level && i < def.upgrades.length; i++) {
    const mods = def.upgrades[i].mods;
    for (const [k, v] of Object.entries(mods)) {
      if (k.endsWith("Mul")) {
        const key = k.slice(0, -3);
        s[key] = (s[key] ?? 1) * v;
      } else if (typeof v === "number") {
        s[k] = (s[k] ?? 0) + v;
      }
    }
  }
  return s;
}

// Wave composition. Deterministic and tuned for a 40-wave run.
const UNLOCK = [
  [1, "red"], [3, "blue"], [5, "green"], [7, "yellow"], [10, "pink"],
  [13, "black"], [15, "white"], [17, "zebra"], [19, "rainbow"], [22, "ceramic"],
];

export function unlockedTypes(round) {
  return UNLOCK.filter(([r]) => round >= r).map(([, t]) => t);
}

export function buildWave(round) {
  const unlocked = unlockedTypes(round);
  const newest = unlocked.slice(-3);
  const queue = [];
  const add = (type, count, start, gap) => {
    for (let i = 0; i < count; i++) queue.push({ type, time: start + i * gap });
  };

  if (round === 1) {
    add("red", 10, 0, 0.62);
    return queue.sort((a, b) => a.time - b.time);
  }
  if (round === 2) {
    add("red", 14, 0, 0.5);
    return queue.sort((a, b) => a.time - b.time);
  }

  const heavyScale = { red: 1, blue: 0.9, green: 0.8, yellow: 0.7, pink: 0.62, black: 0.55, white: 0.55, zebra: 0.44, rainbow: 0.32, ceramic: 0.2 };
  const base = Math.min(120, Math.round((8 + round * 2.1) * 0.85));
  const gap = Math.max(0.24, 0.54 - round * 0.006);

  // Lead group: the newest unlocked bloon. Then support groups of older tiers.
  const lead = newest[newest.length - 1];
  const leadCount = Math.max(2, Math.round(base * (heavyScale[lead] ?? 0.5)));
  add(lead, leadCount, 0, lead === "ceramic" ? gap * 1.35 : gap);

  if (newest.length > 1) {
    const mid = newest[newest.length - 2];
    const midCount = Math.max(3, Math.round(base * 0.35 * (heavyScale[mid] ?? 0.5)));
    add(mid, midCount, 1.1, gap * 0.8);
  }
  if (round >= 12 && newest.length > 2) {
    const low = newest[0];
    const lowCount = Math.max(4, Math.round(base * 0.3));
    add(low, lowCount, 5.5, gap);
  }

  // MOAB bosses every 5 rounds from 25.
  if (round >= 25 && round % 5 === 0) {
    const moabs = 1 + Math.floor((round - 25) / 10);
    for (let i = 0; i < moabs; i++) {
      queue.push({ type: "moab", time: 2.5 + i * 4.2 });
    }
  }

  return queue.sort((a, b) => a.time - b.time);
}

export function roundBonus(round) {
  return 70 + round * 11;
}

export const TARGET_MODES = ["first", "last", "close", "strong"];
export const TARGET_LABEL = { first: "First", last: "Last", close: "Closest", strong: "Strongest" };

// Small deterministic RNG for map decoration.
export function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
