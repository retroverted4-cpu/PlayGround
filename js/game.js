import {
  W, H, TOTAL_ROUNDS, BLOONS, BLOON_ORDER, TOWERS, TOWER_ORDER, TARGET_MODES,
  getWave, waveThreat, difficultyFor, MAPS, MAP_ORDER, MAP_DIFFICULTIES, getMap,
} from './data.js';
import {
  setPaths, getPaths, getPathCount, getPathTotal, pathPoint, distanceToPaths,
  closestPathInfo, createPath,
} from './path.js';
import { Sound } from './audio.js';

const $ = (selector, root = document) => root.querySelector(selector);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;
const distance = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
const TAU = Math.PI * 2;
const formatNumber = (value) => Math.floor(value).toLocaleString('en-US');
const pad = (value) => String(value).padStart(2, '0');
const pick = (items) => items[Math.floor(Math.random() * items.length)];

function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function loadSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem('bloon-blitz-settings') || '{}');
    return {
      sound: parsed.sound !== false,
      autoStart: parsed.autoStart !== false,
      best: Number(parsed.best) || 0,
      map: MAPS[parsed.map] ? parsed.map : 'meadow',
    };
  } catch {
    return { sound: true, autoStart: true, best: 0, map: 'meadow' };
  }
}

function saveSettings() {
  try {
    localStorage.setItem('bloon-blitz-settings', JSON.stringify({
      sound: settings.sound,
      autoStart: settings.autoStart,
      best: settings.best,
      map: settings.map,
    }));
  } catch { /* Storage can be unavailable in private mode. */ }
}

const settings = loadSettings();
const sound = new Sound(settings.sound);
let currentMap = getMap(settings.map);
setPaths(currentMap.tracks);

const canvas = $('#gameCanvas');
const context = canvas.getContext('2d');
const view = { scale: 1, ox: 0, oy: 0, dpr: 1, width: 0, height: 0 };
const backgroundCanvas = document.createElement('canvas');
backgroundCanvas.width = W;
backgroundCanvas.height = H;

const dom = {
  board: $('#boardCard'),
  lives: $('#livesValue'),
  cash: $('#cashValue'),
  round: $('#roundValue'),
  roundTotal: $('#roundTotal'),
  waveTotal: $('#waveTotal'),
  waveEyebrow: $('#waveEyebrow'),
  nextWaveValue: $('#nextWaveValue'),
  difficultyPill: $('#difficultyPill'),
  threatBloons: $('#threatBloons'),
  threatTitle: $('#threatTitle'),
  threatSub: $('#threatSub'),
  waveProgressBar: $('#waveProgressBar'),
  waveState: $('#waveState'),
  pops: $('#popsValue'),
  shopGrid: $('#shopGrid'),
  shopPanel: $('#shopPanel'),
  towerPanel: $('#towerPanel'),
  sidebar: $('.sidebar'),
  startBtn: $('#startBtn'),
  autoBtn: $('#autoBtn'),
  speedBtn: $('#speedBtn'),
  speedLabel: $('#speedLabel'),
  pauseBtn: $('#pauseBtn'),
  pauseIcon: $('#pauseIcon'),
  pauseScreen: $('#pauseScreen'),
  resumeBtn: $('#resumeBtn'),
  soundBtn: $('#soundBtn'),
  soundIcon: $('#soundIcon'),
  helpBtn: $('#helpBtn'),
  helpDialog: $('#helpDialog'),
  helpClose: $('#helpClose'),
  helpPlay: $('#helpPlay'),
  resultDialog: $('#resultDialog'),
  resultEmblem: $('#resultEmblem'),
  resultKicker: $('#resultKicker'),
  resultTitle: $('#resultTitle'),
  resultText: $('#resultText'),
  resultWaves: $('#resultWaves'),
  resultPops: $('#resultPops'),
  resultCash: $('#resultCash'),
  resultRestart: $('#resultRestart'),
  resultContinue: $('#resultContinue'),
  toast: $('#toast'),
  boardTip: $('#boardTip'),
  buildHint: $('#buildHint'),
  banner: $('#roundBanner'),
  bannerKicker: $('#bannerKicker'),
  bannerTitle: $('#bannerTitle'),
  best: $('#bestValue'),
  mapDifficulty: $('#mapDifficulty'),
  mapName: $('#mapName'),
  mapBtn: $('#mapBtn'),
  brandMapName: $('#brandMapName'),
  mapDialog: $('#mapDialog'),
  mapClose: $('#mapClose'),
  mapGrid: $('#mapGrid'),
  mapStartBtn: $('#mapStartBtn'),
  mapStartLabel: $('#mapStartLabel'),
  mapSelectionNote: $('#mapSelectionNote'),
  sandboxBtn: $('#sandboxBtn'),
  sandboxBar: $('#sandboxBar'),
  sandboxBloons: $('#sandboxBloons'),
  sandboxCash: $('#sandboxCash'),
  sandboxClear: $('#sandboxClear'),
  sandboxExit: $('#sandboxExit'),
  pauseTitle: $('#pauseTitle'),
  pauseCopy: $('#pauseCopy'),
  boardCta: $('#boardCta'),
  towerCount: $('#towerCount'),
};

const state = {
  phase: 'ready',
  paused: false,
  speed: 1,
  lives: currentMap.lives,
  cash: currentMap.cash,
  round: 0,
  mapId: currentMap.id,
  sandbox: false,
  sandboxTrack: 0,
  freeplay: false,
  towers: [],
  bloons: [],
  projectiles: [],
  particles: [],
  effects: [],
  spawnQueue: [],
  spawnElapsed: 0,
  waveTotal: 0,
  waveSpawned: 0,
  autoTimer: 0,
  selectedType: null,
  selectedTower: null,
  hoverTower: null,
  pointer: { x: W / 2, y: H / 2, inside: false },
  buildValid: false,
  buildReason: '',
  visualTime: 0,
  shake: 0,
  stats: { pops: 0, leaks: 0, cashEarned: 0 },
  resultShown: false,
  toastTimer: 0,
  lastFrame: performance.now(),
  lastUI: 0,
  lastBoom: 0,
  nextId: 1,
};

const ui = {
  threatKey: '',
  toastTimeout: 0,
  lastCash: currentMap.cash,
  lastLives: currentMap.lives,
  lastRound: 0,
  modalWasPaused: false,
  mapWasPaused: false,
  selectedMapId: currentMap.id,
};

let TREES = currentMap.trees;

const ambientMotes = (() => {
  const random = mulberry32(91);
  return Array.from({ length: 34 }, () => ({
    x: random() * W,
    y: random() * H,
    phase: random() * TAU,
    speed: .2 + random() * .5,
    size: .8 + random() * 1.7,
  }));
})();

function resizeCanvas() {
  const rect = dom.board.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  view.width = rect.width;
  view.height = rect.height;
  view.dpr = dpr;
  view.scale = Math.min(rect.width / W, rect.height / H);
  view.ox = (rect.width - W * view.scale) / 2;
  view.oy = (rect.height - H * view.scale) / 2;
}

function toWorld(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left - view.ox) / view.scale,
    y: (clientY - rect.top - view.oy) / view.scale,
  };
}

function strokePolyline(ctx, poly, width, color, offsetX = 0, offsetY = 0) {
  if (!poly.length) return;
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i += 1) {
    ctx.lineTo(poly[i].x, poly[i].y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}

function pathStroke(ctx, width, color, offsetX = 0, offsetY = 0) {
  for (const path of getPaths()) {
    strokePolyline(ctx, path.poly, width, color, offsetX, offsetY);
  }
}

function drawTree(ctx, tree, random) {
  const { x, y, size } = tree;
  const palette = currentMap.theme.tree;
  const height = 74 * size;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = palette.shadow;
  ctx.beginPath();
  ctx.ellipse(7, 4, 34 * size, 12 * size, 0, 0, TAU);
  ctx.fill();

  if (currentMap.treeStyle === 'cactus') {
    ctx.fillStyle = palette.dark;
    ctx.beginPath();
    ctx.roundRect(-8 * size, -height, 16 * size, height + 2, 8 * size);
    ctx.fill();
    ctx.fillStyle = palette.light;
    ctx.beginPath();
    ctx.roundRect(-5 * size, -height + 3, 5 * size, height - 8, 3 * size);
    ctx.fill();
    ctx.fillStyle = palette.dark;
    ctx.beginPath();
    ctx.roundRect(-24 * size, -height * .68, 11 * size, 10 * size, 5 * size);
    ctx.roundRect(-24 * size, -height * .68, 8 * size, 28 * size, 4 * size);
    ctx.roundRect(13 * size, -height * .8, 11 * size, 10 * size, 5 * size);
    ctx.roundRect(18 * size, -height * .8, 8 * size, 32 * size, 4 * size);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -height + 8);
    ctx.lineTo(0, -10 * size);
    ctx.stroke();
    ctx.fillStyle = '#ffe08a';
    ctx.beginPath();
    ctx.arc(0, -height - 1 * size, 3 * size, 0, TAU);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (currentMap.treeStyle === 'pine') {
    ctx.fillStyle = palette.trunk;
    ctx.fillRect(-5 * size, -height * .32, 10 * size, height * .32 + 2);
    const layers = [
      [-.98, 1.0], [-.78, .86], [-.57, .7], [-.36, .54],
    ];
    for (const [cy, width] of layers) {
      ctx.fillStyle = palette.dark;
      ctx.beginPath();
      ctx.moveTo(0, cy * height - 30 * size * width);
      ctx.lineTo(-31 * size * width, cy * height + 12 * size);
      ctx.lineTo(31 * size * width, cy * height + 12 * size);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = palette.light;
      ctx.beginPath();
      ctx.moveTo(0, cy * height - 30 * size * width);
      ctx.lineTo(-10 * size * width, cy * height + 10 * size);
      ctx.lineTo(4 * size * width, cy * height + 10 * size);
      ctx.closePath();
      ctx.fill();
      if (palette.snow) {
        ctx.fillStyle = palette.snow;
        ctx.beginPath();
        ctx.moveTo(0, cy * height - 30 * size * width);
        ctx.lineTo(-13 * size * width, cy * height - 5 * size);
        ctx.quadraticCurveTo(0, cy * height + 3 * size, 13 * size * width, cy * height - 5 * size);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
    return;
  }

  if (currentMap.treeStyle === 'dead') {
    ctx.strokeStyle = palette.trunk;
    ctx.lineCap = 'round';
    ctx.lineWidth = 9 * size;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-6 * size, -height * .5, 2 * size, -height);
    ctx.stroke();
    ctx.lineWidth = 4 * size;
    ctx.beginPath();
    ctx.moveTo(-2 * size, -height * .62);
    ctx.lineTo(-24 * size, -height * .9);
    ctx.moveTo(0, -height * .78);
    ctx.lineTo(20 * size, -height * 1.02);
    ctx.moveTo(-1 * size, -height * .46);
    ctx.lineTo(18 * size, -height * .58);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 142, 76, .45)';
    ctx.lineWidth = 1.6 * size;
    ctx.beginPath();
    ctx.moveTo(-4 * size, -height * .45);
    ctx.lineTo(-11 * size, -height * .3);
    ctx.moveTo(3 * size, -height * .7);
    ctx.lineTo(10 * size, -height * .55);
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.fillStyle = palette.trunk;
  ctx.beginPath();
  ctx.moveTo(-6 * size, 0);
  ctx.quadraticCurveTo(-3 * size, -height * .55, -8 * size, -height);
  ctx.lineTo(8 * size, -height);
  ctx.quadraticCurveTo(3 * size, -height * .55, 6 * size, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  ctx.fillRect(-3 * size, -height * .7, 3 * size, height * .55);
  const clusters = [
    [-20, -.83, 27], [18, -.85, 26], [-4, -1.02, 29], [0, -.74, 31],
  ];
  for (const [cx, cy, cr] of clusters) {
    const radius = cr * size;
    ctx.fillStyle = cy < -.9 ? palette.dark : palette.light;
    ctx.beginPath();
    ctx.arc(cx * size, cy * height, radius, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(201, 245, 131, .14)';
    ctx.beginPath();
    ctx.arc(cx * size - radius * .25, cy * height - radius * .3, radius * .55, 0, TAU);
    ctx.fill();
  }
  for (let i = 0; i < 5; i += 1) {
    const angle = random() * TAU;
    const radius = (8 + random() * 16) * size;
    ctx.fillStyle = 'rgba(221, 252, 158, .26)';
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * radius, -height * .86 + Math.sin(angle) * radius * .55, 1.5 * size, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawSign(ctx, x, y, label, accent, flip = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(flip ? .045 : -.035);
  ctx.fillStyle = 'rgba(22, 38, 19, .24)';
  ctx.beginPath();
  ctx.ellipse(3, 22, 18, 5, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#76502d';
  ctx.fillRect(-3, -3, 6, 27);
  ctx.fillStyle = '#c49150';
  ctx.beginPath();
  ctx.roundRect(-28, -22, 56, 23, 5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(88, 52, 26, .65)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = '900 9px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, -10);
  ctx.restore();
}

function buildBackground() {
  const bg = backgroundCanvas.getContext('2d');
  const random = mulberry32(8102);
  const theme = currentMap.theme;
  const paths = getPaths();
  const ground = bg.createLinearGradient(0, 0, W, H);
  ground.addColorStop(0, theme.ground[0]);
  ground.addColorStop(.45, theme.ground[1]);
  ground.addColorStop(1, theme.ground[2]);
  bg.fillStyle = ground;
  bg.fillRect(0, 0, W, H);

  for (let i = 0; i < 55; i += 1) {
    const x = random() * W;
    const y = random() * H;
    const rx = 35 + random() * 130;
    const ry = 20 + random() * 75;
    bg.fillStyle = random() > .45 ? theme.patchLight : theme.patchDark;
    bg.beginPath();
    bg.ellipse(x, y, rx, ry, random() * Math.PI, 0, TAU);
    bg.fill();
  }

  for (let i = 0; i < 760; i += 1) {
    const x = random() * W;
    const y = random() * H;
    const length = 2 + random() * 6;
    bg.strokeStyle = random() > .55 ? theme.bladeDark : theme.bladeLight;
    bg.lineWidth = .8 + random() * .8;
    bg.beginPath();
    bg.moveTo(x, y);
    bg.quadraticCurveTo(x + 1, y - length * .6, x + (random() - .5) * 3, y - length);
    bg.stroke();
  }

  for (let i = 0; i < 70; i += 1) {
    const x = 20 + random() * (W - 40);
    const y = 20 + random() * (H - 40);
    if (distanceToPaths(x, y) < 44) continue;
    const color = theme.flowers[Math.floor(random() * theme.flowers.length)];
    const size = 1.3 + random() * 2.2;
    for (let petal = 0; petal < 5; petal += 1) {
      const angle = (petal / 5) * TAU + random() * .3;
      bg.fillStyle = color;
      bg.beginPath();
      bg.arc(x + Math.cos(angle) * size * 1.5, y + Math.sin(angle) * size * 1.5, size, 0, TAU);
      bg.fill();
    }
    bg.fillStyle = theme.flowerCore;
    bg.beginPath();
    bg.arc(x, y, size * .75, 0, TAU);
    bg.fill();
  }

  for (let i = 0; i < 30; i += 1) {
    const x = 20 + random() * (W - 40);
    const y = 20 + random() * (H - 40);
    if (distanceToPaths(x, y) < 56) continue;
    bg.fillStyle = theme.pebble;
    bg.beginPath();
    bg.ellipse(x, y, 3 + random() * 7, 2 + random() * 4, random() * TAU, 0, TAU);
    bg.fill();
    bg.fillStyle = theme.pebbleShine;
    bg.beginPath();
    bg.ellipse(x - 1, y - 1, 2 + random() * 3, 1 + random() * 2, 0, 0, TAU);
    bg.fill();
  }

  pathStroke(bg, 88, theme.pathShadow, 0, 9);
  pathStroke(bg, 84, theme.pathEdge);
  pathStroke(bg, 78, theme.pathOutline);
  pathStroke(bg, 70, theme.pathBase);
  pathStroke(bg, 61, theme.pathInner);
  pathStroke(bg, 47, theme.pathCenter);
  pathStroke(bg, 42, theme.pathLight, 0, -1);

  for (const path of paths) {
    for (let i = 0; i < 105; i += 1) {
      const d = random() * path.total;
      const p = pathPoint(paths.indexOf(path), d, {});
      const side = random() > .5 ? 1 : -1;
      const offset = side * (31 + random() * 9);
      const x = p.x + p.nx * offset;
      const y = p.y + p.ny * offset;
      bg.fillStyle = random() > .5 ? theme.pathGrit : theme.pathSpark;
      bg.beginPath();
      bg.ellipse(x, y, 1 + random() * 3, .8 + random() * 2, random() * TAU, 0, TAU);
      bg.fill();
    }

    for (let i = 0; i < 34; i += 1) {
      const d = random() * path.total;
      const p = pathPoint(paths.indexOf(path), d, {});
      const side = random() > .5 ? 1 : -1;
      const offset = side * (39 + random() * 9);
      bg.strokeStyle = theme.grassTuft;
      bg.lineWidth = 1.4;
      bg.beginPath();
      const x = p.x + p.nx * offset;
      const y = p.y + p.ny * offset;
      bg.moveTo(x, y);
      bg.lineTo(x + (random() - .5) * 5, y - 4 - random() * 5);
      bg.stroke();
    }

    for (let d = 150; d < path.total - 110; d += 185) {
      const p = pathPoint(paths.indexOf(path), d, {});
      bg.save();
      bg.translate(p.x, p.y);
      bg.rotate(p.angle);
      bg.fillStyle = theme.arrow;
      for (let arrow = -1; arrow <= 1; arrow += 1) {
        bg.beginPath();
        bg.moveTo(-3 + arrow * 9, -7);
        bg.lineTo(5 + arrow * 9, 0);
        bg.lineTo(-3 + arrow * 9, 7);
        bg.lineTo(0 + arrow * 9, 0);
        bg.closePath();
        bg.fill();
      }
      bg.restore();
    }
  }

  for (const tree of TREES) drawTree(bg, tree, random);

  paths.forEach((path, track) => {
    const start = pathPoint(track, Math.min(path.total * .14, 145), {});
    const finish = pathPoint(track, Math.max(0, path.total - 135), {});
    drawSign(bg, start.x + 12, Math.max(44, start.y - 52), 'START', theme.signStart);
    drawSign(bg, finish.x - 6, Math.max(44, finish.y - 52), 'EXIT', theme.signExit, true);
  });

  const vignette = bg.createRadialGradient(W * .5, H * .48, H * .2, W * .5, H * .5, W * .72);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, theme.vignette);
  bg.fillStyle = vignette;
  bg.fillRect(0, 0, W, H);
}

function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawTowerBody(ctx, tower, def, options = {}) {
  const time = options.time ?? 0;
  const portrait = options.portrait ?? false;
  const bob = portrait ? 0 : Math.sin(time * 2.15 + (tower.seed || 0)) * .55;
  const bounce = tower.recoil ? tower.recoil * 1.4 : 0;
  const facing = tower.facing ?? -1.1;
  ctx.save();
  ctx.translate(0, -bob + bounce);

  if (tower.type === 'super') {
    ctx.fillStyle = '#b42a33';
    ctx.beginPath();
    ctx.moveTo(-9, -23);
    ctx.quadraticCurveTo(-22, -11, -20, 1);
    ctx.lineTo(-5, -3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    ctx.beginPath();
    ctx.moveTo(-13, -21);
    ctx.lineTo(-18, -2);
    ctx.lineTo(-10, -4);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = def.furDark;
  ellipse(ctx, -8, -4, 6, 4.4, def.furDark);
  ellipse(ctx, 8, -4, 6, 4.4, def.furDark);

  ctx.fillStyle = def.shirt;
  ctx.beginPath();
  ctx.ellipse(0, -14, 13.5, 13.5, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.13)';
  ctx.beginPath();
  ctx.ellipse(-3, -18, 7, 5, -.4, 0, TAU);
  ctx.fill();

  ctx.fillStyle = def.fur;
  ellipse(ctx, -13, -16, 5, 4.8, def.fur);
  ellipse(ctx, 13, -16, 5, 4.8, def.fur);

  ctx.fillStyle = def.fur;
  ellipse(ctx, -12.5, -32, 5.3, 5.6, def.fur);
  ellipse(ctx, 12.5, -32, 5.3, 5.6, def.fur);
  ctx.fillStyle = '#dda27e';
  ellipse(ctx, -12.5, -32, 2.8, 3.2, '#dda27e');
  ellipse(ctx, 12.5, -32, 2.8, 3.2, '#dda27e');

  ctx.fillStyle = def.fur;
  ctx.beginPath();
  ctx.arc(0, -29, 13.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  ctx.beginPath();
  ctx.arc(-4.5, -34, 7.4, 0, TAU);
  ctx.fill();

  const lookX = Math.cos(facing) * 1.2;
  const lookY = Math.sin(facing) * .75;
  ctx.fillStyle = def.face;
  ctx.beginPath();
  ctx.ellipse(0, -24.5, 9.3, 7.7, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle = '#fffaf0';
  ellipse(ctx, -4.1, -29.2, 3.2, 3.7, '#fffaf0');
  ellipse(ctx, 4.1, -29.2, 3.2, 3.7, '#fffaf0');
  ctx.fillStyle = '#241911';
  ellipse(ctx, -4 + lookX, -29 + lookY, 1.45, 1.7, '#241911');
  ellipse(ctx, 4 + lookX, -29 + lookY, 1.45, 1.7, '#241911');
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.beginPath();
  ctx.arc(-4.5 + lookX, -29.6 + lookY, .45, 0, TAU);
  ctx.arc(3.6 + lookX, -29.6 + lookY, .45, 0, TAU);
  ctx.fill();

  ctx.fillStyle = '#6a3c26';
  ctx.beginPath();
  ctx.ellipse(0, -22.2, 1.35, 1.15, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(104, 56, 34, .7)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, -21.5, 3.8, .25, Math.PI - .25);
  ctx.stroke();

  if (tower.type === 'dart') {
    ctx.fillStyle = def.accent;
    ctx.beginPath();
    ctx.moveTo(-12.5, -34);
    ctx.quadraticCurveTo(0, -39.5, 12.5, -34);
    ctx.lineTo(11.7, -31.2);
    ctx.quadraticCurveTo(0, -36.2, -11.7, -31.2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#8c3821';
    ctx.beginPath();
    ctx.moveTo(12, -33.3);
    ctx.lineTo(18.5, -35);
    ctx.lineTo(16, -30.5);
    ctx.closePath();
    ctx.fill();
  } else if (tower.type === 'tack') {
    ctx.fillStyle = '#8c99a1';
    ctx.beginPath();
    ctx.arc(0, -35, 11.5, Math.PI, 0);
    ctx.lineTo(11.5, -31);
    ctx.lineTo(-11.5, -31);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c6d5d9';
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * 5 - 2, -44);
      ctx.lineTo(i * 5 + 2, -44);
      ctx.lineTo(i * 5, -35);
      ctx.closePath();
      ctx.fill();
    }
  } else if (tower.type === 'boomerang') {
    ctx.fillStyle = '#d27a2b';
    ctx.beginPath();
    ctx.arc(0, -36, 11.5, Math.PI, 0);
    ctx.lineTo(17, -32.5);
    ctx.quadraticCurveTo(0, -27.5, -17, -32.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f7b848';
    ctx.beginPath();
    ctx.arc(0, -36, 8.2, Math.PI, 0);
    ctx.lineTo(8.2, -33.5);
    ctx.quadraticCurveTo(0, -30.5, -8.2, -33.5);
    ctx.closePath();
    ctx.fill();
  } else if (tower.type === 'bomb') {
    ctx.fillStyle = '#2f516b';
    ctx.beginPath();
    ctx.arc(0, -33.5, 12.5, Math.PI, 0);
    ctx.lineTo(12.5, -30.5);
    ctx.lineTo(-12.5, -30.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#25384c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12, -31);
    ctx.lineTo(-14, -22);
    ctx.stroke();
  } else if (tower.type === 'ice') {
    ctx.fillStyle = '#c9f8ff';
    ctx.beginPath();
    ctx.moveTo(-10, -38);
    ctx.lineTo(-6, -48);
    ctx.lineTo(-1, -40);
    ctx.lineTo(2, -51);
    ctx.lineTo(7, -39);
    ctx.lineTo(11, -47);
    ctx.lineTo(12, -35);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.beginPath();
    ctx.moveTo(-5, -41);
    ctx.lineTo(-1, -40);
    ctx.lineTo(2, -47);
    ctx.closePath();
    ctx.fill();
  } else if (tower.type === 'glue') {
    ctx.strokeStyle = '#37402b';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, -30, 11, Math.PI * .94, Math.PI * 2.06);
    ctx.stroke();
    ctx.fillStyle = '#d4ff68';
    ellipse(ctx, -4.6, -29.5, 3.8, 3.8, '#d4ff68');
    ellipse(ctx, 4.6, -29.5, 3.8, 3.8, '#d4ff68');
    ctx.strokeStyle = '#41522e';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-1, -29.5);
    ctx.lineTo(1, -29.5);
    ctx.stroke();
  } else if (tower.type === 'sniper') {
    ctx.fillStyle = '#7d8b48';
    ctx.beginPath();
    ctx.ellipse(0, -37, 19, 4.2, -.04, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#6c7a3c';
    ctx.beginPath();
    ctx.arc(0, -39, 10.5, Math.PI, 0);
    ctx.lineTo(10.5, -36);
    ctx.lineTo(-10.5, -36);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3b4126';
    ctx.fillRect(-12.5, -39, 25, 2.4);
  } else if (tower.type === 'ninja') {
    ctx.fillStyle = '#202332';
    ctx.beginPath();
    ctx.arc(0, -27, 10.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#dce0e6';
    ellipse(ctx, -4.1, -30, 2.8, 2.3, '#dce0e6');
    ellipse(ctx, 4.1, -30, 2.8, 2.3, '#dce0e6');
    ctx.fillStyle = '#191b26';
    ellipse(ctx, -4, -30, 1.15, 1.4, '#191b26');
    ellipse(ctx, 4, -30, 1.15, 1.4, '#191b26');
    ctx.fillStyle = '#d63c45';
    ctx.fillRect(-11.5, -36, 23, 3.1);
    ctx.beginPath();
    ctx.moveTo(10, -35);
    ctx.lineTo(19, -31);
    ctx.lineTo(15, -38);
    ctx.closePath();
    ctx.fill();
  } else if (tower.type === 'super') {
    ctx.fillStyle = '#b52e36';
    ctx.beginPath();
    ctx.ellipse(0, -29, 12.7, 7.2, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#f6d652';
    ctx.beginPath();
    const starX = 0;
    const starY = -22.5;
    for (let i = 0; i < 10; i += 1) {
      const angle = -Math.PI / 2 + i * Math.PI / 5;
      const radius = i % 2 === 0 ? 3.6 : 1.6;
      if (i === 0) ctx.moveTo(starX + Math.cos(angle) * radius, starY + Math.sin(angle) * radius);
      else ctx.lineTo(starX + Math.cos(angle) * radius, starY + Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();
  } else if (tower.type === 'farm') {
    ctx.fillStyle = '#e5bd61';
    ctx.beginPath();
    ctx.ellipse(0, -38, 20, 4.5, -.03, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#c99a3f';
    ctx.beginPath();
    ctx.arc(0, -40, 10.5, Math.PI, 0);
    ctx.lineTo(10.5, -37);
    ctx.lineTo(-10.5, -37);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f2d16e';
    ctx.fillRect(-10, -39, 20, 2.4);
    ctx.fillStyle = '#5b7b2d';
    ctx.fillRect(-6, -12, 12, 10);
    ctx.fillStyle = '#ffe15d';
    ctx.beginPath();
    ctx.arc(-2, -6.5, 2.1, 0, TAU);
    ctx.arc(2.5, -6.5, 2.1, 0, TAU);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(5, -16);
  ctx.rotate(facing);
  ctx.strokeStyle = def.fur;
  ctx.lineWidth = 4.2;
  ctx.lineCap = 'round';
  if (tower.type !== 'farm') {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(9, 0);
    ctx.stroke();
  }

  if (tower.type === 'dart') {
    ctx.fillStyle = '#f4e7bd';
    ctx.beginPath();
    ctx.moveTo(25, 0);
    ctx.lineTo(11, 3.2);
    ctx.lineTo(13, 0);
    ctx.lineTo(11, -3.2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d95736';
    ctx.beginPath();
    ctx.moveTo(25, 0);
    ctx.lineTo(17, 2.4);
    ctx.lineTo(17, -2.4);
    ctx.closePath();
    ctx.fill();
  } else if (tower.type === 'boomerang' || tower.type === 'glaive') {
    ctx.strokeStyle = tower.type === 'glaive' ? '#c7b5ff' : '#d77c2b';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(20, 0, 7.5, -.7, 1.7);
    ctx.stroke();
    ctx.strokeStyle = tower.type === 'glaive' ? '#f3edff' : '#f4bf54';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(20, 0, 7.5, -.7, 1.7);
    ctx.stroke();
  } else if (tower.type === 'bomb') {
    ctx.fillStyle = '#242c33';
    ctx.beginPath();
    ctx.arc(21, 0, 6.5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#8e7451';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(23, -5.5);
    ctx.quadraticCurveTo(26, -10, 22, -11);
    ctx.stroke();
    ctx.fillStyle = '#ffb24c';
    ctx.beginPath();
    ctx.arc(22, -11, 2.2, 0, TAU);
    ctx.fill();
  } else if (tower.type === 'ice') {
    ctx.strokeStyle = '#e4d9bb';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(27, 0);
    ctx.stroke();
    ctx.fillStyle = '#9defff';
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const angle = i / 8 * TAU;
      const radius = i % 2 === 0 ? 6.2 : 2.8;
      ctx.lineTo(27 + Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();
  } else if (tower.type === 'glue') {
    ctx.fillStyle = '#52682b';
    ctx.fillRect(7, -3.2, 17, 6.4);
    ctx.fillStyle = '#a8d94c';
    ctx.beginPath();
    ctx.arc(25, 0, 3.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#d8ff6e';
    ctx.beginPath();
    ctx.arc(27.5, 0, 1.6, 0, TAU);
    ctx.fill();
  } else if (tower.type === 'sniper') {
    ctx.fillStyle = '#4a3b2b';
    ctx.fillRect(6, -2.2, 24, 4.4);
    ctx.fillStyle = '#88926d';
    ctx.fillRect(14, -4.2, 9, 3.8);
    ctx.fillStyle = '#303a2c';
    ctx.fillRect(28, -1, 5, 2);
    ctx.fillStyle = '#ffd15c';
    ctx.beginPath();
    ctx.arc(19, -2.4, 1.8, 0, TAU);
    ctx.fill();
  } else if (tower.type === 'ninja') {
    ctx.save();
    ctx.translate(20, 0);
    ctx.rotate(time * 5);
    ctx.fillStyle = '#d7dbe8';
    for (let i = 0; i < 4; i += 1) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(2.2, -1.5);
      ctx.lineTo(0, 0);
      ctx.lineTo(-2.2, -1.5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#4c425d';
    ctx.beginPath();
    ctx.arc(0, 0, 1.8, 0, TAU);
    ctx.fill();
    ctx.restore();
  } else if (tower.type === 'super') {
    ctx.fillStyle = 'rgba(255, 226, 96, .28)';
    ctx.beginPath();
    ctx.arc(18, 0, 8.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffe35c';
    ctx.beginPath();
    ctx.arc(18, 0, 4.6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fffbd3';
    ctx.beginPath();
    ctx.arc(17, -1, 1.8, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

function drawTower(ctx, tower, options = {}) {
  const def = TOWERS[tower.type];
  const alpha = options.alpha ?? 1;
  const ghost = options.ghost ?? false;
  const invalid = options.invalid ?? false;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(tower.x, tower.y);

  ctx.fillStyle = 'rgba(12, 42, 20, .26)';
  ctx.beginPath();
  ctx.ellipse(2, 5, 23, 9, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle = ghost ? (invalid ? 'rgba(255, 103, 86, .7)' : 'rgba(200, 245, 62, .7)') : '#8c7b51';
  ctx.beginPath();
  ctx.ellipse(0, 2.5, 20, 8, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = ghost ? (invalid ? 'rgba(255, 139, 118, .8)' : 'rgba(226, 255, 133, .8)') : '#c2ad7a';
  ctx.beginPath();
  ctx.ellipse(0, 0.5, 18, 6.3, 0, 0, TAU);
  ctx.fill();
  if (!ghost) {
    ctx.strokeStyle = 'rgba(78, 83, 38, .4)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(0, 2, 21, 8.5, 0, 0, TAU);
    ctx.stroke();
  }

  drawTowerBody(ctx, tower, def, { time: state.visualTime, portrait: false });

  if (!ghost && tower.level > 0) {
    for (let i = 0; i < 3; i += 1) {
      const angle = -Math.PI * .82 + i * Math.PI * .32;
      const px = Math.cos(angle) * 23;
      const py = Math.sin(angle) * 8 + 2;
      ctx.fillStyle = i < tower.level ? '#ffd15c' : 'rgba(255,255,255,.16)';
      ctx.beginPath();
      ctx.arc(px, py, 2.1, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawPortrait(targetCanvas, type, scale = 1) {
  const def = TOWERS[type];
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const logical = 48;
  targetCanvas.width = Math.round(logical * ratio);
  targetCanvas.height = Math.round(logical * ratio);
  const ctx = targetCanvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, logical, logical);
  ctx.save();
  ctx.translate(24, 45);
  ctx.scale(scale, scale);
  drawTowerBody(ctx, {
    type, level: 0, facing: -Math.PI / 2, recoil: 0, seed: 1,
  }, def, { portrait: true, time: 0 });
  ctx.restore();
}

function drawBloon(ctx, bloon, time) {
  const kind = BLOONS[bloon.type];
  if (!kind) return;
  const bob = Math.sin(time * 3.4 + bloon.seed) * (kind.blimp ? .7 : 1.2);
  const scale = bloon.spawnScale ?? 1;
  const bodyY = bloon.y + bob;

  ctx.save();
  ctx.globalAlpha = bloon.dead ? .2 : 1;

  ctx.fillStyle = 'rgba(13, 48, 22, .18)';
  ctx.beginPath();
  ctx.ellipse(bloon.groundX, bloon.groundY + 3, kind.size * (kind.blimp ? .95 : .58), kind.size * (kind.blimp ? .24 : .15), 0, 0, TAU);
  ctx.fill();

  if (kind.blimp) {
    drawBlimp(ctx, bloon, kind, bodyY, scale);
    ctx.restore();
    return;
  }

  ctx.translate(bloon.x, bodyY);
  ctx.scale(scale, scale);
  ctx.rotate(Math.sin(time * 2.6 + bloon.seed) * .045);

  ctx.strokeStyle = 'rgba(44, 54, 36, .38)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, kind.size * .82);
  ctx.quadraticCurveTo(3, kind.size * 1.12, -1, bloon.groundY - bodyY);
  ctx.stroke();

  const rx = kind.size * .82;
  const ry = kind.size;
  const gradient = ctx.createRadialGradient(-rx * .34, -ry * .4, 1, 0, 0, ry * 1.1);
  gradient.addColorStop(0, kind.shine);
  gradient.addColorStop(.28, kind.color);
  gradient.addColorStop(1, kind.color2);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
  ctx.clip();

  if (kind.stripes) {
    ctx.strokeStyle = 'rgba(28, 28, 30, .84)';
    ctx.lineWidth = kind.size * .22;
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.arc(i * kind.size * .55, 0, kind.size * .8, -.55, .55);
      ctx.stroke();
    }
  }
  if (kind.rainbow) {
    const colors = ['#ff6b6b', '#ffb84d', '#ffe45c', '#66d36e', '#5fbcff', '#b277ff'];
    ctx.globalAlpha = .46;
    colors.forEach((color, index) => {
      ctx.fillStyle = color;
      ctx.fillRect(-rx, -ry + index * (ry * 2 / colors.length), rx * 2, ry * 2 / colors.length + 1);
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fillRect(-rx, -ry * .15, rx * 2, ry * .3);
  }
  if (kind.ceramic) {
    ctx.strokeStyle = 'rgba(88, 42, 19, .34)';
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.ellipse(0, i * kind.size * .37, rx * 1.1, ry * .26, 0, 0, TAU);
      ctx.stroke();
    }
    const damage = 1 - bloon.hp / bloon.maxHp;
    if (damage > .05) {
      ctx.strokeStyle = `rgba(55, 28, 13, ${.28 + damage * .5})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-rx * .42, -ry * .62);
      ctx.lineTo(-rx * .12, -ry * .15);
      ctx.lineTo(-rx * .33, ry * .12);
      ctx.lineTo(rx * .18, ry * .55);
      ctx.stroke();
      if (damage > .45) {
        ctx.beginPath();
        ctx.moveTo(rx * .35, -ry * .45);
        ctx.lineTo(rx * .05, -ry * .15);
        ctx.lineTo(rx * .3, ry * .24);
        ctx.stroke();
      }
    }
  }
  if (kind.name === 'Black' || kind.name === 'White') {
    ctx.strokeStyle = 'rgba(255,255,255,.15)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, ry * .58, Math.PI * 1.1, Math.PI * 1.7);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = 'rgba(27, 34, 22, .34)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,.66)';
  ctx.beginPath();
  ctx.ellipse(-rx * .36, -ry * .42, rx * .18, ry * .29, -.55, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.3)';
  ctx.beginPath();
  ctx.ellipse(-rx * .16, -ry * .66, rx * .1, ry * .12, -.4, 0, TAU);
  ctx.fill();

  ctx.fillStyle = kind.color2;
  ctx.beginPath();
  ctx.moveTo(0, ry * .88);
  ctx.lineTo(-rx * .35, ry * 1.12);
  ctx.lineTo(rx * .35, ry * 1.12);
  ctx.closePath();
  ctx.fill();

  if (kind.ceramic && bloon.hp < bloon.maxHp) {
    const width = kind.size * 1.7;
    ctx.fillStyle = 'rgba(4, 26, 15, .55)';
    ctx.fillRect(-width / 2, -ry - 10, width, 3);
    ctx.fillStyle = '#ffb44d';
    ctx.fillRect(-width / 2, -ry - 10, width * Math.max(0, bloon.hp / bloon.maxHp), 3);
  }

  if (bloon.freezeTimer > 0) {
    ctx.globalAlpha = .42;
    ctx.fillStyle = '#c5f8ff';
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 1.08, ry * 1.04, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = .85;
    ctx.fillStyle = '#e8ffff';
    for (let i = 0; i < 5; i += 1) {
      const angle = i / 5 * TAU + .35;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * rx * .78, Math.sin(angle) * ry * .78);
      ctx.lineTo(Math.cos(angle) * rx * 1.26, Math.sin(angle) * ry * 1.26);
      ctx.lineTo(Math.cos(angle + .05) * rx * .9, Math.sin(angle + .05) * ry * .9);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  if (bloon.slowTimer > 0) {
    ctx.fillStyle = 'rgba(170, 236, 72, .32)';
    ctx.beginPath();
    ctx.ellipse(0, ry * .2, rx * .76, ry * .4, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(204, 255, 96, .45)';
    ctx.beginPath();
    ctx.arc(-rx * .35, ry * .4, 2.3, 0, TAU);
    ctx.arc(rx * .22, ry * .65, 1.7, 0, TAU);
    ctx.fill();
  }

  if (bloon.hitFlash > 0) {
    ctx.globalAlpha = Math.min(.65, bloon.hitFlash * 4);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
    ctx.fill();
  }

  ctx.restore();
}

function drawBlimp(ctx, bloon, kind, bodyY, scale) {
  ctx.save();
  ctx.translate(bloon.x, bodyY);
  ctx.rotate(bloon.angle || 0);
  ctx.scale(scale, scale);
  const length = kind.size * 1.08;
  const height = kind.size * .4;

  ctx.fillStyle = 'rgba(14, 32, 44, .55)';
  ctx.beginPath();
  ctx.ellipse(-length * .95, 0, length * .24, height * .48, -.35, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#334158';
  ctx.beginPath();
  ctx.moveTo(-length * .88, 0);
  ctx.lineTo(-length * 1.22, -height * .88);
  ctx.lineTo(-length * .99, -height * .08);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-length * .88, 0);
  ctx.lineTo(-length * 1.25, height * .82);
  ctx.lineTo(-length * .98, height * .08);
  ctx.closePath();
  ctx.fill();

  const grad = ctx.createLinearGradient(0, -height, 0, height);
  grad.addColorStop(0, kind.shine);
  grad.addColorStop(.24, kind.color);
  grad.addColorStop(1, kind.color2);
  ctx.beginPath();
  ctx.ellipse(0, 0, length, height, 0, 0, TAU);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(16, 28, 49, .55)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.beginPath();
  ctx.ellipse(-length * .2, -height * .48, length * .42, height * .22, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle = '#d9f1ff';
  ctx.beginPath();
  ctx.ellipse(length * .52, -height * .1, length * .13, height * .34, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(31, 54, 79, .5)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.fillStyle = 'rgba(20, 37, 60, .5)';
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.arc(length * .14, i * height * .3, 1.8, 0, TAU);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(16, 29, 51, .36)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, height * .42, 0, TAU);
  ctx.stroke();

  if (kind.boss) {
    ctx.fillStyle = '#ffd45c';
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const angle = -Math.PI / 2 + i * Math.PI / 5;
      const radius = i % 2 === 0 ? height * .72 : height * .3;
      ctx.lineTo(length * .55 + Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(10, 20, 35, .6)';
  ctx.beginPath();
  ctx.ellipse(-length * .96, 0, length * .2, height * .75, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  if (bloon.hp < bloon.maxHp) {
    const width = kind.size * 1.65;
    const y = bodyY - kind.size * .68;
    ctx.fillStyle = 'rgba(3, 22, 13, .66)';
    ctx.fillRect(bloon.x - width / 2, y, width, 5);
    ctx.fillStyle = kind.boss ? '#ff8068' : '#7fe3ff';
    ctx.fillRect(bloon.x - width / 2, y, width * Math.max(0, bloon.hp / bloon.maxHp), 5);
  }

  if (bloon.freezeTimer > 0) {
    ctx.globalAlpha = .25;
    ctx.fillStyle = '#c5f8ff';
    ctx.beginPath();
    ctx.ellipse(bloon.x, bodyY, kind.size * 1.14, kind.size * .58, bloon.angle || 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawProjectile(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(Math.atan2(p.vy, p.vx));

  if (p.trail && p.trail.length > 1) {
    ctx.strokeStyle = p.type === 'plasma'
      ? 'rgba(189, 126, 255, .28)'
      : p.type === 'laser' ? 'rgba(255, 100, 115, .25)' : 'rgba(255, 244, 193, .2)';
    ctx.lineWidth = p.type === 'plasma' ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(p.trail[0].x - p.x, p.trail[0].y - p.y);
    for (let i = 1; i < p.trail.length; i += 1) {
      ctx.lineTo(p.trail[i].x - p.x, p.trail[i].y - p.y);
    }
    ctx.stroke();
  }

  if (p.type === 'dart' || p.type === 'super') {
    ctx.fillStyle = p.type === 'super' ? '#ffe35d' : '#f2e2b0';
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-5, 3);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-5, -3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = p.type === 'super' ? '#ffb31f' : '#d85d35';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.lineTo(-7, 0);
    ctx.stroke();
  } else if (p.type === 'spike') {
    ctx.fillStyle = '#858d92';
    ctx.beginPath();
    ctx.moveTo(11, 0);
    ctx.lineTo(-6, 6);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, -6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.36)';
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-3, 2.4);
    ctx.lineTo(-1, 0);
    ctx.closePath();
    ctx.fill();
  } else if (p.type === 'tack') {
    ctx.fillStyle = p.fire ? '#ff9c42' : '#b7c3c4';
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-4, 3);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-4, -3);
    ctx.closePath();
    ctx.fill();
    if (p.fire) {
      ctx.fillStyle = 'rgba(255, 210, 89, .7)';
      ctx.beginPath();
      ctx.arc(-5, 0, 2.4, 0, TAU);
      ctx.fill();
    }
  } else if (p.type === 'boomerang' || p.type === 'glaive') {
    ctx.rotate(state.visualTime * 13);
    ctx.strokeStyle = p.type === 'glaive' ? '#d8c6ff' : '#e8a23a';
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.arc(0, 0, 7, -.7, 1.7);
    ctx.stroke();
    ctx.strokeStyle = p.type === 'glaive' ? '#fbffef' : '#ffd061';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, 7, -.7, 1.7);
    ctx.stroke();
  } else if (p.type === 'bomb') {
    ctx.fillStyle = '#232a30';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffba4e';
    ctx.beginPath();
    ctx.arc(-5, -5, 2.2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#8d6b43';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-3, -5);
    ctx.quadraticCurveTo(-7, -9, -1, -10);
    ctx.stroke();
  } else if (p.type === 'glue') {
    ctx.fillStyle = '#b9ea54';
    ctx.beginPath();
    ctx.ellipse(0, 0, 5.2, 4, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.beginPath();
    ctx.arc(-1.5, -1.4, 1.5, 0, TAU);
    ctx.fill();
  } else if (p.type === 'shuriken') {
    ctx.rotate(state.visualTime * 20);
    ctx.fillStyle = '#d6dbe6';
    for (let i = 0; i < 4; i += 1) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(2.5, -1.8);
      ctx.lineTo(0, 0);
      ctx.lineTo(-2.5, -1.8);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#4b3f5f';
    ctx.beginPath();
    ctx.arc(0, 0, 2.1, 0, TAU);
    ctx.fill();
  } else if (p.type === 'laser') {
    ctx.fillStyle = '#ff5267';
    ctx.shadowColor = '#ff415c';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 2.5, 0, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffe6e8';
    ctx.beginPath();
    ctx.ellipse(2, 0, 5, 1.1, 0, 0, TAU);
    ctx.fill();
  } else if (p.type === 'plasma') {
    ctx.shadowColor = '#ab6dff';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#b77bff';
    ctx.beginPath();
    ctx.arc(0, 0, 5.4, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#f5e6ff';
    ctx.beginPath();
    ctx.arc(1, -1, 2, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function addBurst(x, y, color, count = 5, options = {}) {
  const {
    speed = 75, size = 2.6, life = .55, gravity = 120, shape = 'dot',
  } = options;
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * TAU;
    const velocity = speed * (.35 + Math.random() * .9);
    state.particles.push({
      kind: shape,
      x, y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity - 18,
      size: size * (.55 + Math.random() * .9),
      color,
      life: life * (.65 + Math.random() * .65),
      maxLife: life,
      gravity,
      rotation: Math.random() * TAU,
      spin: (Math.random() - .5) * 9,
    });
  }
}

function addRing(x, y, radius, color, options = {}) {
  state.effects.push({
    kind: 'ring',
    x, y,
    radius: options.startRadius || 8,
    targetRadius: radius,
    color,
    life: options.life || .42,
    maxLife: options.life || .42,
    width: options.width || 3,
    fade: options.fade ?? true,
  });
}

function addTracer(x1, y1, x2, y2, color = '#ffe9a1') {
  state.effects.push({
    kind: 'tracer', x1, y1, x2, y2, color, life: .22, maxLife: .22,
  });
}

function addFloatText(x, y, text, color = '#ffe28a', size = 14) {
  state.effects.push({
    kind: 'text', x, y, text, color, size, life: .95, maxLife: .95,
  });
}

function addMuzzle(x, y, angle, color = '#ffe6a3') {
  state.effects.push({
    kind: 'muzzle', x, y, angle, color, life: .12, maxLife: .12,
  });
}

function updateVisuals(dt) {
  for (const p of state.particles) {
    p.life -= dt;
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - dt * .9;
    p.rotation += p.spin * dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  if (state.particles.length > 420) state.particles.splice(0, state.particles.length - 420);

  for (const effect of state.effects) {
    effect.life -= dt;
    if (effect.kind === 'ring') {
      const progress = 1 - effect.life / effect.maxLife;
      effect.radius = lerp(effect.startRadius, effect.targetRadius, 1 - Math.pow(1 - progress, 3));
    }
    if (effect.kind === 'text') effect.y -= dt * 25;
  }
  state.effects = state.effects.filter((effect) => effect.life > 0);
  state.shake = Math.max(0, state.shake - dt * 28);
}

function createBloon(type, pathDistance = 0, lane = null, track = 0) {
  const kind = BLOONS[type];
  if (!kind) throw new Error(`Unknown bloon type: ${type}`);
  const trackIndex = clamp(Number(track) || 0, 0, Math.max(0, getPathCount() - 1));
  const total = getPathTotal(trackIndex);
  const b = {
    id: state.nextId++,
    type,
    kind,
    track: trackIndex,
    hp: kind.hp,
    maxHp: kind.hp,
    dist: clamp(pathDistance, 0, total - .1),
    lane: lane ?? (Math.random() * 2 - 1) * (kind.blimp ? 4 : 7),
    speed: kind.speed,
    x: 0,
    y: 0,
    groundX: 0,
    groundY: 0,
    angle: 0,
    slowTimer: 0,
    slowMul: 1,
    freezeTimer: 0,
    dot: 0,
    dotLeft: 0,
    dotTick: 1,
    hitFlash: 0,
    spawnScale: kind.blimp ? .55 : .25,
    seed: Math.random() * TAU,
    dead: false,
    leaked: false,
  };
  updateBloonPosition(b);
  state.bloons.push(b);
  return b;
}

const positionScratch = {};

function updateBloonPosition(b) {
  const p = pathPoint(b.track, b.dist, positionScratch);
  const lane = b.lane;
  b.groundX = p.x + p.nx * lane;
  b.groundY = p.y + p.ny * lane;
  b.x = b.groundX;
  b.y = b.groundY - b.kind.size * (b.kind.blimp ? .34 : .88);
  b.angle = p.angle;
}

function destroyBloon(bloon, pending) {
  if (bloon.dead) return;
  const kind = bloon.kind;
  bloon.dead = true;
  bloon.hp = 0;
  state.stats.pops += 1;
  state.cash += kind.cash;
  state.stats.cashEarned += kind.cash;
  state.shake = Math.max(state.shake, kind.blimp ? 12 : kind.ceramic ? 2 : 0);
  const color = kind.color;
  addBurst(bloon.x, bloon.y, color, kind.blimp ? 26 : kind.ceramic ? 12 : 5, {
    speed: kind.blimp ? 145 : 86,
    size: kind.blimp ? 5 : 2.6,
    life: kind.blimp ? .9 : .55,
  });
  if (kind.blimp) {
    addBurst(bloon.x, bloon.y, kind.shine, 18, { speed: 190, size: 3.2, life: .75 });
    addRing(bloon.x, bloon.y, kind.size * 1.5, '#ffd875', { life: .7, width: 4 });
    for (let i = 0; i < 4; i += 1) {
      addRing(bloon.x + (Math.random() - .5) * 40, bloon.y + (Math.random() - .5) * 30, 55, '#ffb255', {
        life: .5 + Math.random() * .2, width: 2,
      });
    }
    sound.boom();
  } else {
    sound.pop(kind.ceramic || kind.rainbow);
  }
  if (kind.children && kind.children.length) {
    for (const child of kind.children) {
      const childBloon = createBloon(
        child,
        Math.max(0, bloon.dist + (Math.random() - .5) * 6),
        clamp(bloon.lane + (Math.random() - .5) * 7, -9, 9),
        bloon.track,
      );
      childBloon.spawnScale = .35;
      pending.push(childBloon);
    }
  }
}

function damageBloon(bloon, amount, options = {}) {
  if (!bloon || bloon.dead || amount <= 0) return 0;
  let remaining = amount;
  let destroyed = 0;
  const pending = [bloon];
  while (remaining > .0001 && pending.length) {
    const current = pending.shift();
    if (!current || current.dead || current.leaked) continue;
    if (current.hp > remaining + .0001) {
      current.hp -= remaining;
      current.hitFlash = .15;
      remaining = 0;
    } else {
      remaining -= current.hp;
      destroyBloon(current, pending);
      destroyed += 1;
    }
  }
  return destroyed;
}

function applySlow(bloon, tower) {
  bloon.slowTimer = Math.max(bloon.slowTimer, tower.slowTime || 2.5);
  bloon.slowMul = Math.min(bloon.slowTimer > 0 ? bloon.slowMul : 1, tower.slow || .6);
  if (tower.dot) {
    bloon.dot = Math.max(bloon.dot, tower.dot);
    bloon.dotLeft = Math.max(bloon.dotLeft, (tower.slowTime || 2.5) + 1.2);
    bloon.dotTick = Math.min(bloon.dotTick, .8);
  }
}

function applyFreeze(bloon, duration) {
  bloon.freezeTimer = Math.max(bloon.freezeTimer, duration);
}

function loseLives(amount, bloon) {
  if (state.sandbox) return;
  if (state.phase !== 'active') return;
  state.lives = Math.max(0, state.lives - amount);
  state.stats.leaks += amount;
  state.shake = Math.max(state.shake, Math.min(15, 3 + amount * .08));
  addFloatText(bloon?.groundX || W - 80, bloon?.groundY || H / 2, `-${amount}`, '#ff8c7f', 16);
  sound.leak();
  if (state.lives <= 0) {
    state.lives = 0;
    state.phase = 'defeat';
    state.paused = false;
    state.selectedType = null;
    state.selectedTower = null;
    sound.defeat();
    settings.best = Math.max(settings.best, state.round);
    saveSettings();
    window.setTimeout(() => showResult(false), 650);
  }
}

function validPlacement(x, y) {
  if (x < 30 || x > W - 30 || y < 38 || y > H - 32) {
    return { ok: false, reason: 'Too close to the edge of the map.' };
  }
  if (distanceToPaths(x, y) < 55) {
    return { ok: false, reason: 'The bloons need that track clear.' };
  }
  for (const tower of state.towers) {
    if (distance(x, y, tower.x, tower.y) < 47) {
      return { ok: false, reason: 'Give your monkeys a little elbow room.' };
    }
  }
  for (const tree of TREES) {
    if (distance(x, y, tree.x, tree.y) < tree.r + 24) {
      return { ok: false, reason: 'That landmark is already occupied.' };
    }
  }
  return { ok: true, reason: '' };
}

function chooseTarget(tower) {
  const def = TOWERS[tower.type];
  let best = null;
  let bestScore = -Infinity;
  for (const bloon of state.bloons) {
    if (bloon.dead || bloon.leaked) continue;
    const d = distance(tower.x, tower.y - 18, bloon.x, bloon.y);
    if (!def.global && d > tower.range + bloon.kind.size * .4) continue;
    let score;
    const progress = bloon.dist / Math.max(1, getPathTotal(bloon.track));
    switch (tower.targetMode) {
      case 'last': score = -progress; break;
      case 'close': score = -d; break;
      case 'strong': score = bloon.kind.rbe + bloon.hp * .2; break;
      case 'first':
      default: score = progress; break;
    }
    if (score > bestScore) {
      bestScore = score;
      best = bloon;
    }
  }
  return best;
}

function fireProjectile(tower, target, angle, options = {}) {
  const def = TOWERS[tower.type];
  const type = options.type || def.projectile || 'dart';
  const speed = options.speed ?? (type === 'bomb' ? 430 : type === 'boomerang' ? 500 : 650);
  const originX = tower.x + Math.cos(angle) * 12;
  const originY = tower.y - 24 + Math.sin(angle) * 10;
  const projectile = {
    id: state.nextId++,
    type,
    x: originX,
    y: originY,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    speed,
    target,
    homing: options.homing ?? true,
    damage: options.damage ?? tower.damage,
    pierce: options.pierce ?? tower.pierce,
    radius: options.radius ?? 5,
    splash: options.splash || 0,
    glue: options.glue || false,
    slow: tower.slow,
    slowTime: tower.slowTime,
    dot: tower.dot,
    bonusBlimp: tower.blimpDamage || 0,
    tower,
    age: 0,
    life: options.life ?? 1.9,
    hitSet: new Set(),
    trail: [],
    dead: false,
    returning: false,
    peakAge: options.peakAge || .38,
    originX: tower.x,
    originY: tower.y - 20,
  };
  state.projectiles.push(projectile);
  addMuzzle(originX, originY, angle, type === 'glue' ? '#b8ed58' : '#ffe7a0');
  return projectile;
}

function fireSniper(tower, target) {
  const damage = tower.damage + (target.kind.blimp ? (tower.blimpDamage || 0) : 0);
  damageBloon(target, damage);
  addTracer(tower.x, tower.y - 34, target.x, target.y, '#fff0b0');
  addBurst(target.x, target.y, '#ffe38a', 4, { speed: 50, size: 1.8, life: .3 });
  tower.recoil = 1;
  tower.facing = Math.atan2(target.y - (tower.y - 22), target.x - tower.x);
  if (state.visualTime - state.lastBoom > .15) {
    state.lastBoom = state.visualTime;
    sound.noise(.08, .06, { frequency: 950, type: 'bandpass', q: .8 });
    sound.tone(130, .12, { type: 'square', gain: .04, slide: -40 });
  }
}

function pulseIce(tower) {
  const def = TOWERS[tower.type];
  let found = false;
  const victims = [];
  for (const bloon of state.bloons) {
    if (bloon.dead || bloon.leaked) continue;
    if (distance(tower.x, tower.y, bloon.x, bloon.y) <= tower.range + bloon.kind.size * .3) {
      found = true;
      victims.push(bloon);
    }
  }
  if (!found) return false;
  addRing(tower.x, tower.y - 12, tower.range, '#bff8ff', { life: .52, width: 3 });
  addRing(tower.x, tower.y - 12, tower.range * .6, '#eaffff', { life: .38, width: 1.5 });
  for (const bloon of victims) {
    applyFreeze(bloon, tower.freeze);
    bloon.hitFlash = .1;
    if (tower.damage > 0) damageBloon(bloon, tower.damage);
    addBurst(bloon.x, bloon.y, '#d6fbff', 2, { speed: 32, size: 1.4, life: .35 });
  }
  addBurst(tower.x, tower.y - 14, '#d9fbff', 9, { speed: 95, size: 2, life: .5, gravity: 25 });
  sound.freeze();
  tower.recoil = 1;
  return true;
}

function attackTower(tower, target) {
  const def = TOWERS[tower.type];
  const angle = Math.atan2(target.y - (tower.y - 24), target.x - tower.x);

  if (def.radial) {
    const shots = tower.shots;
    for (let i = 0; i < shots; i += 1) {
      const shotAngle = (i / shots) * TAU + (state.visualTime * .12);
      fireProjectile(tower, null, shotAngle, {
        speed: 390,
        damage: tower.damage,
        pierce: tower.pierce,
        radius: 4,
        homing: false,
        life: (tower.range + 18) / 390,
        type: 'tack',
      });
    }
    sound.shoot('tack');
    return true;
  }

  if (tower.type === 'sniper') {
    fireSniper(tower, target);
    return true;
  }

  if (tower.type === 'bomb') {
    fireProjectile(tower, target, angle, {
      type: 'bomb',
      speed: 410,
      damage: tower.damage,
      pierce: 1,
      radius: 7,
      splash: tower.splash,
      homing: true,
      life: .95,
    });
    sound.shoot('bomb');
    return true;
  }

  if (tower.type === 'glue') {
    fireProjectile(tower, target, angle, {
      type: 'glue',
      speed: 560,
      damage: 0,
      pierce: 1,
      radius: 5,
      glue: true,
      homing: true,
      life: 1.2,
    });
    sound.glue();
    return true;
  }

  if (tower.type === 'boomerang' || def.projectile === 'glaive') {
    fireProjectile(tower, target, angle, {
      type: def.projectile,
      speed: 520,
      damage: tower.damage,
      pierce: tower.pierce,
      radius: 8,
      homing: true,
      life: 1.55,
      peakAge: .38,
    });
    sound.shoot('boomerang');
    return true;
  }

  const shots = tower.shots || 1;
  const spread = shots > 1 ? .12 : 0;
  for (let i = 0; i < shots; i += 1) {
    const offset = (i - (shots - 1) / 2) * spread;
    fireProjectile(tower, target, angle + offset, {
      type: def.projectile,
      speed: def.projectile === 'super' ? 760 : 650,
      damage: tower.damage,
      pierce: tower.pierce,
      radius: 5,
      homing: true,
      life: 1.8,
    });
  }
  sound.shoot(def.projectile);
  return true;
}

function updateTower(tower, dt) {
  tower.recoil = Math.max(0, tower.recoil - dt * 7);
  tower.attackGlow = Math.max(0, (tower.attackGlow || 0) - dt * 4);
  const def = TOWERS[tower.type];
  if (tower.type === 'farm') {
    tower.idleSeed = (tower.idleSeed || 0) + dt;
    return;
  }
  tower.cooldownLeft = Math.max(0, (tower.cooldownLeft || 0) - dt);
  if (tower.type === 'ice') {
    if (tower.cooldownLeft <= 0 && pulseIce(tower)) {
      tower.cooldownLeft = tower.cooldown;
      tower.attackGlow = 1;
    }
    return;
  }

  const target = chooseTarget(tower);
  if (!target) return;
  const targetAngle = Math.atan2(target.y - (tower.y - 24), target.x - tower.x);
  let delta = ((targetAngle - tower.facing + Math.PI * 3) % TAU) - Math.PI;
  tower.facing += delta * Math.min(1, dt * 13);

  if (tower.cooldownLeft <= 0) {
    if (attackTower(tower, target)) {
      tower.cooldownLeft = tower.cooldown;
      tower.recoil = 1;
      tower.attackGlow = 1;
    }
  }
}

function updateSpawnQueue(dt) {
  state.spawnElapsed += dt;
  while (state.spawnQueue.length && state.spawnQueue[0].time <= state.spawnElapsed) {
    const entry = state.spawnQueue.shift();
    createBloon(entry.type, 0, entry.lane ?? (Math.random() * 2 - 1) * (BLOONS[entry.type].blimp ? 3 : 7), entry.track ?? 0);
    state.waveSpawned += 1;
  }
}

function updateBloons(dt) {
  const snapshot = state.bloons.slice();
  for (const bloon of snapshot) {
    if (bloon.dead || bloon.leaked) continue;
    bloon.hitFlash = Math.max(0, bloon.hitFlash - dt);
    bloon.spawnScale = Math.min(1, bloon.spawnScale + dt * 4.5);
    bloon.slowTimer = Math.max(0, bloon.slowTimer - dt);
    bloon.freezeTimer = Math.max(0, bloon.freezeTimer - dt);
    if (bloon.slowTimer <= 0) bloon.slowMul = 1;

    if (bloon.dotLeft > 0) {
      bloon.dotLeft -= dt;
      bloon.dotTick -= dt;
      if (bloon.dotTick <= 0) {
        bloon.dotTick = 1;
        damageBloon(bloon, bloon.dot);
        if (bloon.dead) continue;
        addBurst(bloon.x, bloon.y, '#bfe960', 2, { speed: 30, size: 1.5, life: .28 });
      }
    }

    if (bloon.freezeTimer > 0) {
      updateBloonPosition(bloon);
      continue;
    }

    const slow = bloon.slowTimer > 0 ? bloon.slowMul : 1;
    bloon.dist += bloon.speed * slow * dt;
    const total = getPathTotal(bloon.track);
    if (bloon.dist >= total) {
      bloon.leaked = true;
      const p = pathPoint(bloon.track, total - 2, {});
      addBurst(p.x, p.y, bloon.kind.color, bloon.kind.blimp ? 16 : 5, { speed: 65, size: 2.5, life: .5 });
      loseLives(bloon.kind.leak, bloon);
      continue;
    }
    updateBloonPosition(bloon);
  }
}

function explodeAt(projectile) {
  const radius = projectile.splash || 40;
  addRing(projectile.x, projectile.y, radius, '#ffc15b', { life: .48, width: 4 });
  addRing(projectile.x, projectile.y, radius * .55, '#fff0b3', { life: .3, width: 2 });
  addBurst(projectile.x, projectile.y, '#ffb24c', 13, {
    speed: 160, size: 3.3, life: .65, gravity: 90,
  });
  addBurst(projectile.x, projectile.y, 'rgba(85, 70, 54, .5)', 6, {
    speed: 55, size: 6, life: .8, gravity: -15, shape: 'smoke',
  });
  if (state.visualTime - state.lastBoom > .07) {
    state.lastBoom = state.visualTime;
    sound.boom();
  }
  state.shake = Math.max(state.shake, 3.2);
  const victims = state.bloons.filter((b) => !b.dead && !b.leaked
    && distance(projectile.x, projectile.y, b.x, b.y) <= radius + b.kind.size * .35);
  for (const bloon of victims) {
    addBurst(bloon.x, bloon.y, '#ffd27f', 2, { speed: 40, size: 1.6, life: .3 });
    damageBloon(bloon, projectile.damage + (bloon.kind.blimp ? projectile.bonusBlimp : 0));
  }
  projectile.dead = true;
}

function updateProjectiles(dt) {
  for (const projectile of state.projectiles) {
    if (projectile.dead) continue;
    projectile.age += dt;

    if (projectile.trail) {
      projectile.trail.push({ x: projectile.x, y: projectile.y });
      if (projectile.trail.length > 4) projectile.trail.shift();
    }

    if (projectile.type === 'boomerang' || projectile.type === 'glaive') {
      if (projectile.age > projectile.peakAge) {
        if (!projectile.returning) {
          projectile.returning = true;
          projectile.hitSet.clear();
          projectile.target = null;
        }
        const backAngle = Math.atan2(projectile.originY - projectile.y, projectile.originX - projectile.x);
        projectile.vx = Math.cos(backAngle) * projectile.speed;
        projectile.vy = Math.sin(backAngle) * projectile.speed;
        if (distance(projectile.x, projectile.y, projectile.originX, projectile.originY) < 18) {
          projectile.dead = true;
          continue;
        }
      } else if (projectile.target && !projectile.target.dead) {
        const angle = Math.atan2(projectile.target.y - projectile.y, projectile.target.x - projectile.x);
        projectile.vx = Math.cos(angle) * projectile.speed;
        projectile.vy = Math.sin(angle) * projectile.speed;
      }
    } else if (projectile.homing && projectile.target && !projectile.target.dead) {
      const desired = Math.atan2(projectile.target.y - projectile.y, projectile.target.x - projectile.x);
      const current = Math.atan2(projectile.vy, projectile.vx);
      let delta = ((desired - current + Math.PI * 3) % TAU) - Math.PI;
      delta = clamp(delta, -dt * 10, dt * 10);
      const angle = current + delta;
      projectile.vx = Math.cos(angle) * projectile.speed;
      projectile.vy = Math.sin(angle) * projectile.speed;
    }

    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;

    if (projectile.type === 'bomb') {
      const closeToTarget = projectile.target && !projectile.target.dead
        && distance(projectile.x, projectile.y, projectile.target.x, projectile.target.y) < 13;
      if (closeToTarget || projectile.age > .82) {
        explodeAt(projectile);
        continue;
      }
    }

    if (projectile.x < -80 || projectile.x > W + 80 || projectile.y < -80 || projectile.y > H + 80) {
      projectile.dead = true;
      continue;
    }

    for (const bloon of state.bloons) {
      if (bloon.dead || bloon.leaked || projectile.hitSet.has(bloon.id)) continue;
      if (distance(projectile.x, projectile.y, bloon.x, bloon.y) > bloon.kind.size * .72 + projectile.radius) continue;
      if (projectile.splash) {
        explodeAt(projectile);
        break;
      }
      projectile.hitSet.add(bloon.id);
      bloon.hitFlash = .12;
      if (projectile.glue) {
        applySlow(bloon, projectile);
        addBurst(bloon.x, bloon.y, '#bfe960', 4, { speed: 35, size: 2, life: .4 });
        sound.glue();
      } else {
        const damage = projectile.damage
          + (bloon.kind.blimp ? projectile.bonusBlimp : 0);
        damageBloon(bloon, damage);
        addBurst(projectile.x, projectile.y, bloon.kind.color, 3, {
          speed: 60, size: 1.8, life: .3, gravity: 40,
        });
        if (state.visualTime - state.lastBoom > .09) {
          state.lastBoom = state.visualTime;
          sound.pop(bloon.kind.ceramic);
        }
      }
      projectile.pierce -= 1;
      if (projectile.pierce <= 0) {
        projectile.dead = true;
        break;
      }
    }

    if (projectile.age > projectile.life) projectile.dead = true;
  }
  state.projectiles = state.projectiles.filter((projectile) => !projectile.dead);
}

function simulate(dt) {
  updateSpawnQueue(dt);
  updateBloons(dt);
  for (const tower of state.towers) updateTower(tower, dt);
  updateProjectiles(dt);
  updateVisuals(dt);

  state.bloons = state.bloons.filter((bloon) => !bloon.dead && !bloon.leaked);
  if (!state.sandbox && state.phase === 'active' && state.spawnQueue.length === 0 && state.bloons.length === 0) {
    completeWave();
  }
}

function waveBanner(groups) {
  const types = groups.map((group) => group.type);
  if (types.includes('bfb')) return ['The sky darkens', 'BFB incoming!'];
  if (types.includes('moab')) return ['Heavy traffic', 'MOAB incoming!'];
  if (types.includes('ceramic')) return ['Reinforced hulls', 'Ceramic convoy!'];
  if (types.includes('rainbow')) return ['Colour storm', 'Rainbow rush!'];
  return ['The bloons are rolling', pick(['Here they come!', 'Hold the line!', 'Pop till you drop!'])];
}

function beginWave() {
  if (state.sandbox) return;
  if (state.paused) return;
  if (state.phase !== 'ready' && state.phase !== 'between') return;
  if (state.round >= TOTAL_ROUNDS && !state.freeplay) return;
  state.round += 1;
  const wave = getWave(state.round);
  const trackCount = Math.max(1, getPathCount());
  const queue = [];
  let spawnIndex = 0;
  for (const group of wave.groups) {
    for (let i = 0; i < group.count; i += 1) {
      queue.push({
        type: group.type,
        time: group.delay + i * group.gap + .45,
        track: spawnIndex % trackCount,
      });
      spawnIndex += 1;
    }
  }
  queue.sort((a, b) => a.time - b.time);
  state.spawnQueue = queue;
  state.spawnElapsed = 0;
  state.waveTotal = queue.length;
  state.waveSpawned = 0;
  state.phase = 'active';
  state.autoTimer = 0;
  state.paused = false;
  state.projectiles = [];
  const [kicker, title] = waveBanner(wave.groups);
  showBanner(state.freeplay ? `Freeplay wave ${state.round}` : `Wave ${state.round} of ${TOTAL_ROUNDS}`, title);
  showToast(kicker, '');
  sound.wave();
  dom.boardTip.textContent = 'Pop the bloons before they reach the village. Build more towers any time!';
  dom.boardTip.classList.remove('is-hidden');
  updateUI(performance.now(), true);
}

function completeWave() {
  if (state.phase !== 'active') return;
  const clearedRound = state.round;
  const bonus = 55 + clearedRound * 7;
  let farmIncome = 0;
  for (const tower of state.towers) {
    if (tower.type !== 'farm') continue;
    farmIncome += tower.income;
    addFloatText(tower.x, tower.y - 52, `+$${formatNumber(tower.income)}`, '#ffe47c', 15);
    addBurst(tower.x, tower.y - 36, '#ffe05d', 7, { speed: 48, size: 2.5, life: .7, gravity: 25 });
  }
  state.cash += bonus + farmIncome;
  state.stats.cashEarned += bonus + farmIncome;
  state.selectedType = null;
  settings.best = Math.max(settings.best, clearedRound);
  saveSettings();
  sound.cash();

  if (clearedRound >= TOTAL_ROUNDS && !state.freeplay) {
    state.phase = 'victory';
    state.selectedTower = null;
    showBanner(`${currentMap.name} defended`, 'Victory!');
    sound.victory();
    addRing(W / 2, H / 2, 380, '#e8ff8c', { life: 1.1, width: 5 });
    window.setTimeout(() => showResult(true), 900);
    syncSidebar();
    updateUI(performance.now(), true);
    return;
  }

  state.phase = 'between';
  state.autoTimer = settings.autoStart ? 6.5 : 0;
  showBanner(`Wave ${clearedRound} cleared`, farmIncome > 0 ? `+$${formatNumber(bonus + farmIncome)} bananas` : `+$${formatNumber(bonus)}`);
  addFloatText(W - 150, 205, `+$${formatNumber(bonus)}`, '#ffe47c', 16);
  dom.boardTip.textContent = 'Wave cleared! Spend those bananas before the next wave.';
  dom.boardTip.classList.remove('is-hidden');
  updateUI(performance.now(), true);
}

function showBanner(kicker, title) {
  dom.bannerKicker.textContent = kicker;
  dom.bannerTitle.textContent = title;
  dom.banner.classList.remove('is-visible');
  void dom.banner.offsetWidth;
  dom.banner.classList.add('is-visible');
}

function showToast(message, type = '') {
  dom.toast.textContent = message;
  dom.toast.className = 'toast';
  if (type) dom.toast.classList.add(`is-${type}`);
  void dom.toast.offsetWidth;
  dom.toast.classList.add('is-visible');
  window.clearTimeout(ui.toastTimeout);
  ui.toastTimeout = window.setTimeout(() => {
    dom.toast.classList.remove('is-visible');
  }, 2500);
}

function selectBuild(type) {
  if (state.phase === 'victory' || state.phase === 'defeat') return;
  if (state.selectedType === type) {
    cancelBuild();
    return;
  }
  const def = TOWERS[type];
  if (state.cash < def.cost) {
    showToast(`Need $${formatNumber(def.cost - state.cash)} more for ${def.name}.`, 'warn');
    sound.deny();
    return;
  }
  state.selectedType = type;
  state.selectedTower = null;
  state.buildValid = false;
  state.pointer = { x: W / 2, y: H / 2, inside: false };
  syncSidebar();
  updateShopSelection();
  dom.boardTip.textContent = `Tap the grass to place a ${def.name}.`;
  dom.boardTip.classList.remove('is-hidden');
  dom.buildHint.hidden = false;
  sound.click();
}

function cancelBuild() {
  if (!state.selectedType) return;
  state.selectedType = null;
  state.buildValid = false;
  dom.buildHint.hidden = true;
  updateShopSelection();
  dom.boardTip.textContent = 'Choose a tower from the crew, then tap the grass to build.';
  updateUI(performance.now(), true);
}

function selectTower(tower) {
  state.selectedTower = tower;
  state.selectedType = null;
  dom.buildHint.hidden = true;
  updateShopSelection();
  syncSidebar();
  if (tower) {
    const def = TOWERS[tower.type];
    const canTarget = !def.support && !def.pulse && !def.radial;
    dom.boardTip.textContent = canTarget
      ? `${def.name} selected — upgrade it or change its targeting.`
      : `${def.name} selected — upgrade it or review its stats.`;
    dom.boardTip.classList.remove('is-hidden');
    sound.click();
  } else {
    dom.boardTip.textContent = 'Choose a tower from the crew, then tap the grass to build.';
  }
  updateUI(performance.now(), true);
}

function placeTower(x, y) {
  if (!state.selectedType) return false;
  if (state.phase === 'victory' || state.phase === 'defeat') return false;
  const type = state.selectedType;
  const def = TOWERS[type];
  if (state.cash < def.cost) {
    showToast(`Not enough bananas for a ${def.name}.`, 'warn');
    sound.deny();
    return false;
  }
  const check = validPlacement(x, y);
  if (!check.ok) {
    showToast(check.reason, 'warn');
    sound.deny();
    return false;
  }
  const tower = {
    id: state.nextId++,
    type,
    x,
    y,
    level: 0,
    range: def.range,
    cooldown: def.cooldown,
    damage: def.damage,
    pierce: def.pierce,
    shots: def.shots,
    projectile: def.projectile,
    splash: def.splash,
    slow: def.slow,
    slowTime: def.slowTime,
    dot: def.dot,
    income: def.income,
    freeze: def.freeze,
    fire: false,
    blimpDamage: 0,
    cooldownLeft: 0,
    targetMode: 'first',
    facing: -Math.PI / 2,
    recoil: 0,
    seed: Math.random() * TAU,
    spent: def.cost,
    attackGlow: 0,
  };
  state.cash -= def.cost;
  state.towers.push(tower);
  addRing(x, y, 34, '#d9ff86', { life: .4, width: 2 });
  addBurst(x, y - 12, '#ddff88', 8, { speed: 55, size: 2, life: .5, gravity: 60 });
  sound.build();
  showToast(`${def.name} is on ${currentMap.name}!`, 'good');
  state.selectedType = null;
  dom.buildHint.hidden = true;
  updateShopSelection();
  selectTower(tower);
  return true;
}

function refreshWindowAffordability() {
  for (const card of dom.shopGrid.querySelectorAll('.shop-card')) {
    const def = TOWERS[card.dataset.type];
    card.classList.toggle('is-unaffordable', state.cash < def.cost);
    card.classList.toggle('is-selected', state.selectedType === card.dataset.type);
  }
  if (!state.selectedTower) return;
  const tower = state.selectedTower;
  const def = TOWERS[tower.type];
  for (const row of dom.towerPanel.querySelectorAll('.upgrade-row')) {
    const index = Number(row.dataset.upgrade);
    if (index !== tower.level || index >= def.upgrades.length) continue;
    const cost = def.upgrades[index].cost;
    const costEl = row.querySelector('.upgrade-cost');
    if (costEl) costEl.classList.toggle('is-short', state.cash < cost);
  }
  const sellEl = dom.towerPanel.querySelector('#sellTower');
  if (sellEl) sellEl.disabled = false;
}

function upgradeSelected(index) {
  const tower = state.selectedTower;
  if (!tower) return;
  const def = TOWERS[tower.type];
  if (index !== tower.level || tower.level >= def.upgrades.length) return;
  const upgrade = def.upgrades[index];
  if (state.cash < upgrade.cost) {
    showToast(`Need $${formatNumber(upgrade.cost - state.cash)} more for ${upgrade.name}.`, 'warn');
    sound.deny();
    return;
  }
  state.cash -= upgrade.cost;
  tower.spent += upgrade.cost;
  upgrade.apply(tower);
  tower.level += 1;
  tower.recoil = 1;
  addRing(tower.x, tower.y - 15, 48, '#ffe070', { life: .55, width: 3 });
  addBurst(tower.x, tower.y - 32, '#ffe481', 12, { speed: 65, size: 2.4, life: .65, gravity: 35 });
  addFloatText(tower.x, tower.y - 55, 'UPGRADED!', '#ffe47c', 12);
  sound.upgrade();
  showToast(`${upgrade.name} unlocked!`, 'good');
  renderTowerPanel();
  updateUI(performance.now(), true);
}

function cycleTargeting() {
  const tower = state.selectedTower;
  if (!tower) return;
  const def = TOWERS[tower.type];
  if (def.support || def.pulse || def.radial) return;
  const index = TARGET_MODES.findIndex((mode) => mode.key === tower.targetMode);
  const next = TARGET_MODES[(index + 1) % TARGET_MODES.length];
  tower.targetMode = next.key;
  const label = dom.towerPanel.querySelector('.target-label');
  if (label) label.textContent = next.label;
  showToast(`Targeting: ${next.label}`, '');
  sound.click();
}

function sellSelected() {
  const tower = state.selectedTower;
  if (!tower) return;
  const refund = Math.floor(tower.spent * .7);
  state.cash += refund;
  state.stats.cashEarned += refund;
  state.towers = state.towers.filter((item) => item !== tower);
  addBurst(tower.x, tower.y - 20, '#ffd27d', 12, { speed: 75, size: 2.4, life: .6, gravity: 60 });
  addFloatText(tower.x, tower.y - 45, `+$${formatNumber(refund)}`, '#ffe47c', 14);
  sound.sell();
  showToast(`Sold for $${formatNumber(refund)}.`, '');
  state.selectedTower = null;
  state.selectedType = null;
  dom.boardTip.textContent = 'Choose a tower from the crew, then tap the grass to build.';
  dom.boardTip.classList.remove('is-hidden');
  syncSidebar();
  updateShopSelection();
  updateUI(performance.now(), true);
}

function buildShop() {
  dom.shopGrid.innerHTML = TOWER_ORDER.map((type) => {
    const def = TOWERS[type];
    return `
      <button class="shop-card" type="button" data-type="${type}" style="--tint:${def.tint}"
        aria-label="Build ${def.name} for ${def.cost} bananas" title="${def.name} — ${def.blurb}">
        <span class="shop-portrait"><canvas aria-hidden="true"></canvas></span>
        <span class="shop-info">
          <span class="shop-name">${def.short}</span>
          <span class="shop-cost"><svg aria-hidden="true"><use href="#i-banana"/></svg>${formatNumber(def.cost)}</span>
        </span>
      </button>`;
  }).join('');
  for (const card of dom.shopGrid.querySelectorAll('.shop-card')) {
    drawPortrait(card.querySelector('canvas'), card.dataset.type, 1.02);
  }
  dom.towerCount.textContent = String(TOWER_ORDER.length);
}

function updateShopSelection() {
  for (const card of dom.shopGrid.querySelectorAll('.shop-card')) {
    card.classList.toggle('is-selected', card.dataset.type === state.selectedType);
  }
}

function renderTowerPanel() {
  const tower = state.selectedTower;
  if (!tower) return;
  const def = TOWERS[tower.type];
  const isSupport = !!def.support;
  const canTarget = !def.support && !def.pulse && !def.radial;
  const currentMode = TARGET_MODES.find((mode) => mode.key === tower.targetMode) || TARGET_MODES[0];
  const rangeText = def.global ? 'Global' : isSupport ? '—' : `${Math.round(tower.range)}`;
  const damageText = isSupport ? `$${formatNumber(tower.income)}` : def.pulse ? (tower.damage ? `${tower.damage} + freeze` : 'Freeze') : def.slow ? (tower.dot ? `${tower.dot} / sec` : 'Slow') : `${tower.damage}`;
  const rateText = isSupport ? 'Per wave' : tower.cooldown > 0 ? `${(1 / tower.cooldown).toFixed(1)}/s` : '—';
  const sellValue = Math.floor(tower.spent * .7);
  const upgradeRows = def.upgrades.map((upgrade, index) => {
    const owned = index < tower.level;
    const next = index === tower.level;
    const locked = index > tower.level;
    const className = owned ? 'is-maxed' : next ? 'is-next' : 'is-locked';
    const short = next && state.cash < upgrade.cost;
    return `
      <button class="upgrade-row ${className}" type="button" data-upgrade="${index}" ${locked || owned ? 'disabled' : ''}
        aria-label="${owned ? `${upgrade.name} owned` : `Buy ${upgrade.name} for ${upgrade.cost}`}">
        <span class="upgrade-tier">${owned ? '<svg aria-hidden="true"><use href="#i-check"/></svg>' : next ? index + 1 : '<svg aria-hidden="true"><use href="#i-lock"/></svg>'}</span>
        <span class="upgrade-copy"><strong>${upgrade.name}</strong><span>${upgrade.desc}</span></span>
        <span class="upgrade-cost ${short ? 'is-short' : ''} ${owned ? 'is-done' : ''}">${owned ? 'Owned' : `<svg aria-hidden="true"><use href="#i-banana"/></svg>${formatNumber(upgrade.cost)}`}</span>
      </button>`;
  }).join('');

  dom.towerPanel.innerHTML = `
    <div class="tower-head">
      <span class="tower-portrait" style="--tint:${def.tint}"><canvas aria-hidden="true"></canvas></span>
      <div class="tower-head-copy">
        <h2>${def.name}</h2>
        <p>${def.blurb}</p>
        <span class="tower-stars" aria-label="Level ${tower.level} of 3">
          ${[0, 1, 2].map((i) => `<svg class="${i < tower.level ? 'is-lit' : ''}" aria-hidden="true"><use href="#i-star"/></svg>`).join('')}
          <span>Level ${tower.level}</span>
        </span>
      </div>
      <button class="close-inspector" id="closeInspector" type="button" aria-label="Back to towers"><svg><use href="#i-close"/></svg></button>
    </div>
    <div class="tower-stat-row">
      <div class="tower-stat"><span>Range</span><strong>${rangeText}</strong></div>
      <div class="tower-stat"><span>${isSupport ? 'Income' : def.slow ? 'Slow' : def.pulse ? 'Effect' : 'Damage'}</span><strong>${damageText}</strong></div>
      <div class="tower-stat"><span>${isSupport ? 'Payout' : 'Rate'}</span><strong>${rateText}</strong></div>
    </div>
    <div class="upgrade-heading"><span>Upgrades</span><span>Next: ${tower.level >= 3 ? 'maxed' : def.upgrades[tower.level].name}</span></div>
    <div class="upgrade-list">${upgradeRows}</div>
    <div class="tower-actions">
      <button class="tower-action" id="cycleTarget" type="button" ${canTarget ? '' : 'disabled'}>
        <svg aria-hidden="true"><use href="#i-target"/></svg>
        <span>${canTarget ? `<span class="target-label">${currentMode.label}</span>` : (isSupport ? 'Income' : 'Area')}</span>
      </button>
      <button class="tower-action sell" id="sellTower" type="button">
        <svg aria-hidden="true"><use href="#i-sell"/></svg><span>Sell $${formatNumber(sellValue)}</span>
      </button>
    </div>
    <p class="tower-tip">${isSupport ? 'Farms pay out after every cleared wave.' : 'Tip: pair hard-hitting towers with ice or glue to keep bloons in range.'}</p>`;
  drawPortrait(dom.towerPanel.querySelector('.tower-portrait canvas'), tower.type, 1.12);
}

function syncSidebar() {
  const inspecting = !!state.selectedTower;
  dom.shopPanel.hidden = inspecting;
  dom.towerPanel.hidden = !inspecting;
  dom.sidebar.classList.toggle('inspecting', inspecting);
  if (inspecting) renderTowerPanel();
}

function updateStartButton() {
  const small = dom.startBtn.querySelector('.start-copy small');
  const strong = dom.startBtn.querySelector('.start-copy strong');
  const alive = state.bloons.length + state.spawnQueue.length;
  if (state.sandbox) {
    small.textContent = 'Sandbox mode';
    strong.textContent = 'Spawn bloons below';
    dom.startBtn.disabled = true;
    dom.startBtn.classList.remove('is-countdown');
    return;
  }
  dom.startBtn.classList.toggle('is-countdown', state.phase === 'between' && state.autoTimer > 0);
  if (state.phase === 'ready') {
    small.textContent = 'Build a little, then go';
    strong.textContent = 'Start wave 1';
    dom.startBtn.disabled = false;
  } else if (state.phase === 'active') {
    small.textContent = `Wave ${state.round} in progress`;
    strong.textContent = `${alive} bloon${alive === 1 ? '' : 's'} left`;
    dom.startBtn.disabled = true;
  } else if (state.phase === 'between') {
    const next = state.round + 1;
    if (state.autoTimer > 0) {
      small.textContent = `Auto-start in ${Math.ceil(state.autoTimer)}s`;
      strong.textContent = `Start wave ${next} now`;
    } else {
      small.textContent = 'Build phase';
      strong.textContent = `Start wave ${next}`;
    }
    dom.startBtn.disabled = false;
  } else if (state.phase === 'victory') {
    small.textContent = 'All 50 waves cleared';
    strong.textContent = `${currentMap.name} defended`;
    dom.startBtn.disabled = true;
  } else {
    small.textContent = 'The village is overrun';
    strong.textContent = 'Try again';
    dom.startBtn.disabled = true;
  }
}

function updateThreatPanel() {
  if (state.sandbox) {
    const alive = state.bloons.length;
    const counts = new Map();
    for (const bloon of state.bloons) counts.set(bloon.type, (counts.get(bloon.type) || 0) + 1);
    const entries = [...counts.entries()].sort((a, b) => BLOON_ORDER.indexOf(b[0]) - BLOON_ORDER.indexOf(a[0]));
    dom.nextWaveValue.textContent = '∞';
    dom.waveEyebrow.textContent = 'Sandbox';
    dom.difficultyPill.textContent = 'Sandbox';
    dom.difficultyPill.className = 'difficulty-pill is-sandbox';
    dom.threatBloons.innerHTML = entries.slice(0, 5).map(([type]) => {
      const kind = BLOONS[type];
      return `<span class="threat-bloon ${kind.blimp ? 'is-blimp' : ''}" style="--bloon-color:${kind.color}" title="${kind.name}"></span>`;
    }).join('') || '<span class="threat-bloon" style="--bloon-color:#c8f53e" title="Lab clear"></span>';
    dom.threatTitle.textContent = alive ? `${alive} bloon${alive === 1 ? '' : 's'} loose` : 'Sandbox lab';
    dom.threatSub.textContent = `${currentMap.tracks.length} tracks · unlimited cash`;
    ui.threatKey = `sandbox-${alive}-${entries.map((entry) => entry[0]).join('')}`;
    return;
  }
  let displayRound = state.phase === 'between' || state.phase === 'ready'
    ? state.round + 1
    : state.round;
  if (displayRound < 1) displayRound = 1;
  if (displayRound > TOTAL_ROUNDS && !state.freeplay) displayRound = TOTAL_ROUNDS;
  const wave = getWave(displayRound);
  const threat = waveThreat(wave.groups);
  const difficulty = difficultyFor(displayRound);

  if (state.phase === 'victory') {
    dom.nextWaveValue.textContent = pad(TOTAL_ROUNDS);
    dom.difficultyPill.textContent = 'Cleared';
    dom.difficultyPill.className = 'difficulty-pill';
    dom.threatBloons.innerHTML = '<span class="threat-bloon" style="--bloon-color:#c8f53e" title="All clear"></span>';
    dom.threatTitle.textContent = `${currentMap.name} secured`;
    dom.threatSub.textContent = 'Every bloon has been popped.';
    dom.waveEyebrow.textContent = `${currentMap.name} secured`;
    ui.threatKey = `${state.phase}-${state.round}-${state.freeplay}`;
    return;
  }

  dom.nextWaveValue.textContent = pad(displayRound);
  dom.difficultyPill.textContent = difficulty.label;
  dom.difficultyPill.className = `difficulty-pill ${difficulty.className}`;

  if (state.phase === 'active') dom.waveEyebrow.textContent = `Wave ${state.round} active`;
  else if (state.phase === 'victory') dom.waveEyebrow.textContent = `${currentMap.name} secured`;
  else if (state.phase === 'defeat') dom.waveEyebrow.textContent = 'Overrun';
  else dom.waveEyebrow.textContent = displayRound === 1 ? 'Get ready' : 'Next wave';

  const entries = [...threat.counts].sort((a, b) => {
    const ai = BLOON_ORDER.indexOf(a[0]);
    const bi = BLOON_ORDER.indexOf(b[0]);
    if (bi !== ai) return bi - ai;
    return b[1] - a[1];
  });
  dom.threatBloons.innerHTML = entries.slice(0, 4).map(([type]) => {
    const kind = BLOONS[type];
    return `<span class="threat-bloon ${kind.blimp ? 'is-blimp' : ''}" style="--bloon-color:${kind.color}" title="${kind.name}"></span>`;
  }).join('') + (entries.length > 4 ? `<span class="threat-bloon" style="--bloon-color:#9fc6a5" title="More bloons"></span>` : '');

  if (entries.length === 0) {
    dom.threatTitle.textContent = 'No bloons detected';
    dom.threatSub.textContent = 'The map is quiet... for now.';
  } else {
    const hasBfb = threat.counts.some(([type]) => type === 'bfb');
    const hasMoab = threat.counts.some(([type]) => type === 'moab');
    const primary = entries[0];
    if (hasBfb) {
      dom.threatTitle.textContent = 'BFB with escort';
    } else if (hasMoab) {
      dom.threatTitle.textContent = 'MOAB incoming';
    } else if (entries.length === 1) {
      dom.threatTitle.textContent = `${primary[1]} ${BLOONS[primary[0]].name} bloon${primary[1] === 1 ? '' : 's'}`;
    } else {
      dom.threatTitle.textContent = `${BLOONS[primary[0]].name} + ${entries.length - 1} type${entries.length === 2 ? '' : 's'}`;
    }
    dom.threatSub.textContent = `${threat.total} bloons · ${entries.length} type${entries.length === 1 ? '' : 's'}`;
  }
  ui.threatKey = `${state.phase}-${state.round}-${state.freeplay}`;
}

function updateUI(now, force = false) {
  if (!force && now - state.lastUI < 110) return;
  state.lastUI = now;
  const lives = Math.max(0, Math.floor(state.lives));
  const cash = Math.floor(state.cash);
  if (dom.lives.textContent !== String(lives)) dom.lives.textContent = String(lives);
  if (dom.cash.textContent !== formatNumber(cash)) dom.cash.textContent = formatNumber(cash);
  if (state.sandbox) {
    dom.round.textContent = '∞';
    dom.roundTotal.textContent = '';
  } else {
    if (dom.round.textContent !== String(state.round)) dom.round.textContent = String(state.round);
    dom.roundTotal.textContent = state.freeplay ? '/∞' : `/${TOTAL_ROUNDS}`;
  }
  dom.waveTotal.textContent = state.freeplay ? '/ ∞' : `/ ${TOTAL_ROUNDS}`;
  dom.best.textContent = settings.best
    ? `${settings.best} / ${state.freeplay || settings.best > TOTAL_ROUNDS ? '∞' : TOTAL_ROUNDS}`
    : '—';
  dom.pops.textContent = `${formatNumber(state.stats.pops)} pops`;
  dom.speedLabel.textContent = `${state.speed}×`;
  dom.pauseIcon.setAttribute('href', state.paused ? '#i-play' : '#i-pause');
  dom.soundIcon.setAttribute('href', settings.sound ? '#i-volume' : '#i-mute');
  dom.soundBtn.setAttribute('aria-label', settings.sound ? 'Mute sound' : 'Enable sound');
  dom.autoBtn.classList.toggle('is-on', settings.autoStart);
  dom.autoBtn.setAttribute('aria-pressed', String(settings.autoStart));
  dom.pauseScreen.hidden = !state.paused;
  dom.pauseBtn.setAttribute('aria-label', state.paused ? 'Resume game' : 'Pause game');

  const key = `${state.phase}-${state.round}-${state.freeplay}`;
  if (key !== ui.threatKey) updateThreatPanel();

  const alive = state.bloons.length + state.spawnQueue.length;
  if (state.sandbox) {
    dom.waveState.textContent = `${state.bloons.length} bloons in the lab`;
    dom.waveProgressBar.style.width = '0%';
  } else if (state.phase === 'active') {
    dom.waveState.textContent = `${alive} bloon${alive === 1 ? '' : 's'} left`;
    const fraction = state.waveTotal ? state.waveSpawned / state.waveTotal : 0;
    dom.waveProgressBar.style.width = `${Math.min(100, fraction * 100)}%`;
  } else if (state.phase === 'between' && state.autoTimer > 0) {
    dom.waveState.textContent = `Auto in ${Math.ceil(state.autoTimer)}s`;
    dom.waveProgressBar.style.width = '0%';
  } else if (state.phase === 'victory') {
    dom.waveState.textContent = 'All clear';
    dom.waveProgressBar.style.width = '100%';
  } else if (state.phase === 'defeat') {
    dom.waveState.textContent = 'Overrun';
    dom.waveProgressBar.style.width = '100%';
  } else {
    dom.waveState.textContent = state.round === 0 ? 'Build phase' : 'Build phase';
    dom.waveProgressBar.style.width = '0%';
  }

  updateStartButton();
  refreshWindowAffordability();
}

function setPaused(paused) {
  if (state.phase === 'ready' && paused) return;
  if (state.phase === 'victory' || state.phase === 'defeat') return;
  state.paused = paused;
  dom.pauseScreen.hidden = !paused;
  sound.click();
  updateUI(performance.now(), true);
}

function toggleSpeed() {
  state.speed = state.speed === 1 ? 2 : state.speed === 2 ? 3 : 1;
  showToast(`Game speed: ${state.speed}×`, '');
  updateUI(performance.now(), true);
  sound.click();
}

function toggleAutoStart() {
  settings.autoStart = !settings.autoStart;
  if (settings.autoStart && state.phase === 'between') state.autoTimer = Math.max(state.autoTimer, 6.5);
  if (!settings.autoStart) state.autoTimer = 0;
  saveSettings();
  showToast(settings.autoStart ? 'Auto-start is on.' : 'Auto-start is off — take your time.', '');
  updateUI(performance.now(), true);
  sound.click();
}

function toggleSound() {
  settings.sound = !settings.sound;
  sound.setEnabled(settings.sound);
  saveSettings();
  if (settings.sound) sound.click();
  updateUI(performance.now(), true);
}

function openHelp() {
  if (dom.helpDialog.open) return;
  ui.modalWasPaused = state.paused;
  if ((state.phase === 'active' || state.phase === 'between') && !state.paused) setPaused(true);
  dom.helpDialog.showModal();
}

function closeHelp() {
  if (!dom.helpDialog.open) return;
  dom.helpDialog.close();
  if (!ui.modalWasPaused && (state.phase === 'active' || state.phase === 'between') && state.paused) setPaused(false);
}

function showResult(victory) {
  if (state.resultShown) return;
  state.resultShown = true;
  dom.resultKicker.textContent = victory ? `${currentMap.name} defended` : 'The village is overrun';
  dom.resultTitle.textContent = victory ? 'Victory!' : 'Bloons win this one.';
  dom.resultText.textContent = victory
    ? `Fifty waves, one very tired crew, and not a single bloon left to pop. ${currentMap.name} is safe.`
    : 'The bloons broke through. Rebuild your defense, mix up your towers, and give them another go.';
  dom.resultEmblem.innerHTML = `<svg><use href="${victory ? '#i-trophy' : '#i-bloon'}"/></svg>`;
  dom.resultEmblem.style.background = victory
    ? ''
    : 'radial-gradient(circle at 40% 28%, rgba(255,255,255,.22), transparent 48%), linear-gradient(145deg, #ff9a76, #c44540)';
  dom.resultWaves.textContent = String(settings.best || state.round);
  dom.resultPops.textContent = formatNumber(state.stats.pops);
  dom.resultCash.textContent = formatNumber(state.stats.cashEarned);
  dom.resultContinue.hidden = !victory;
  if (!dom.resultDialog.open) dom.resultDialog.showModal();
}

function drawAmbient(ctx, time) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const mote of ambientMotes) {
    const x = (mote.x + time * mote.speed * 14) % W;
    const y = mote.y + Math.sin(time * .7 + mote.phase) * 7;
    const alpha = .08 + (Math.sin(time * 1.4 + mote.phase) * .5 + .5) * .2;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = currentMap.theme.mote;
    ctx.beginPath();
    ctx.arc(x, y, mote.size, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawRangeCircle(x, y, radius, color, fillAlpha = .055) {
  if (!Number.isFinite(radius) || radius > 2000) return;
  context.save();
  context.beginPath();
  context.arc(x, y, radius, 0, TAU);
  context.fillStyle = color.replace('ALPHA', String(fillAlpha));
  context.fill();
  context.strokeStyle = color.replace('ALPHA', '.35');
  context.lineWidth = 1.2;
  context.setLineDash([5, 7]);
  context.stroke();
  context.restore();
}

function drawEffects(ctx) {
  for (const effect of state.effects) {
    const alpha = clamp(effect.life / effect.maxLife, 0, 1);
    if (effect.kind === 'ring') {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = effect.width * (.5 + alpha * .5);
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius, 0, TAU);
      ctx.stroke();
      ctx.restore();
    } else if (effect.kind === 'tracer') {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 2.2;
      ctx.shadowColor = effect.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(effect.x1, effect.y1);
      ctx.lineTo(effect.x2, effect.y2);
      ctx.stroke();
      ctx.restore();
    } else if (effect.kind === 'text') {
      ctx.save();
      ctx.globalAlpha = Math.min(1, alpha * 1.8);
      ctx.fillStyle = effect.color;
      ctx.font = `900 ${effect.size}px "Trebuchet MS", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 20, 8, .55)';
      ctx.shadowBlur = 4;
      ctx.fillText(effect.text, effect.x, effect.y);
      ctx.restore();
    } else if (effect.kind === 'muzzle') {
      ctx.save();
      ctx.translate(effect.x, effect.y);
      ctx.rotate(effect.angle);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = effect.color;
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const angle = i / 6 * TAU;
        const radius = i % 2 === 0 ? 7 : 2.5;
        ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawParticles(ctx) {
  for (const particle of state.particles) {
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    if (particle.kind === 'smoke') {
      ctx.globalAlpha = alpha * .32;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * (1.8 - alpha * .25), 0, TAU);
      ctx.fill();
    } else if (particle.kind === 'shard') {
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.fillRect(-particle.size, -particle.size * .4, particle.size * 2, particle.size * .8);
    } else {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawBoardBackdrop(ctx) {
  const dpr = view.dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = currentMap.theme.frame;
  ctx.fillRect(0, 0, view.width, view.height);

  const coverScale = Math.max(view.width / W, view.height / H);
  const coverWidth = W * coverScale;
  const coverHeight = H * coverScale;
  ctx.globalAlpha = .52;
  ctx.drawImage(
    backgroundCanvas,
    (view.width - coverWidth) / 2,
    (view.height - coverHeight) / 2,
    coverWidth,
    coverHeight,
  );
  ctx.globalAlpha = 1;

  const mapTop = view.oy;
  const mapBottom = view.oy + H * view.scale;
  if (mapTop > 1) {
    const topFade = ctx.createLinearGradient(0, 0, 0, mapTop);
    topFade.addColorStop(0, 'rgba(3, 18, 11, .66)');
    topFade.addColorStop(.72, 'rgba(3, 18, 11, .25)');
    topFade.addColorStop(1, 'rgba(3, 18, 11, 0)');
    ctx.fillStyle = topFade;
    ctx.fillRect(0, 0, view.width, mapTop + 1);
  }
  if (view.height - mapBottom > 1) {
    const bottomFade = ctx.createLinearGradient(0, mapBottom - 1, 0, view.height);
    bottomFade.addColorStop(0, 'rgba(3, 18, 11, 0)');
    bottomFade.addColorStop(.3, 'rgba(3, 18, 11, .3)');
    bottomFade.addColorStop(1, 'rgba(3, 18, 11, .72)');
    ctx.fillStyle = bottomFade;
    ctx.fillRect(0, mapBottom - 1, view.width, view.height - mapBottom + 2);
  }

  const sideFade = Math.max(view.ox, 0);
  if (sideFade > 1) {
    const left = ctx.createLinearGradient(0, 0, sideFade, 0);
    left.addColorStop(0, 'rgba(3, 18, 11, .6)');
    left.addColorStop(1, 'rgba(3, 18, 11, 0)');
    ctx.fillStyle = left;
    ctx.fillRect(0, 0, sideFade + 1, view.height);
    const right = ctx.createLinearGradient(view.width - sideFade, 0, view.width, 0);
    right.addColorStop(0, 'rgba(3, 18, 11, 0)');
    right.addColorStop(1, 'rgba(3, 18, 11, .6)');
    ctx.fillStyle = right;
    ctx.fillRect(view.width - sideFade - 1, 0, sideFade + 2, view.height);
  }
}

function render() {
  const ctx = context;
  drawBoardBackdrop(ctx);

  const dpr = view.dpr;
  ctx.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.ox, dpr * view.oy);
  ctx.drawImage(backgroundCanvas, 0, 0);

  const shakeX = state.shake > 0 ? (Math.random() - .5) * state.shake : 0;
  const shakeY = state.shake > 0 ? (Math.random() - .5) * state.shake : 0;
  ctx.save();
  ctx.translate(shakeX, shakeY);

  drawAmbient(ctx, state.visualTime);

  const selected = state.selectedTower;
  if (selected) {
    const def = TOWERS[selected.type];
    drawRangeCircle(selected.x, selected.y - 10, selected.range, 'rgba(200,245,62,ALPHA)', .045);
    if (!def.support) {
      ctx.save();
      ctx.globalAlpha = .38 + Math.sin(state.visualTime * 2.4) * .08;
      ctx.strokeStyle = '#c8f53e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(selected.x, selected.y, 27, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  if (!selected && state.hoverTower) {
    drawRangeCircle(state.hoverTower.x, state.hoverTower.y - 10, state.hoverTower.range, 'rgba(231,255,189,ALPHA)', .025);
  }

  const drawables = [];
  for (const tower of state.towers) {
    drawables.push({ y: tower.y + 2, type: 'tower', object: tower });
  }
  for (const bloon of state.bloons) {
    drawables.push({ y: bloon.groundY + (bloon.kind.blimp ? 12 : 2), type: 'bloon', object: bloon });
  }
  drawables.sort((a, b) => a.y - b.y);
  for (const item of drawables) {
    if (item.type === 'tower') drawTower(ctx, item.object);
    else drawBloon(ctx, item.object, state.visualTime);
  }

  for (const projectile of state.projectiles) drawProjectile(ctx, projectile);
  drawEffects(ctx);
  drawParticles(ctx);

  if (state.selectedType && state.pointer.inside) {
    const def = TOWERS[state.selectedType];
    const check = validPlacement(state.pointer.x, state.pointer.y);
    state.buildValid = check.ok;
    state.buildReason = check.reason;
    drawRangeCircle(
      state.pointer.x,
      state.pointer.y,
      def.range,
      check.ok ? 'rgba(200,245,62,ALPHA)' : 'rgba(255,110,86,ALPHA)',
      .055,
    );
    drawTower(ctx, {
      type: state.selectedType,
      x: state.pointer.x,
      y: state.pointer.y,
      level: 0,
      facing: -Math.PI / 2,
      recoil: 0,
      seed: 0,
    }, { ghost: true, invalid: !check.ok, alpha: .78 });
    if (check.ok) {
      ctx.save();
      ctx.strokeStyle = 'rgba(207, 255, 112, .55)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 7]);
      ctx.beginPath();
      ctx.ellipse(state.pointer.x, state.pointer.y, 24, 10, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  ctx.restore();
}

function updateHoverAndCursor(clientX, clientY) {
  const point = toWorld(clientX, clientY);
  state.pointer = {
    x: point.x,
    y: point.y,
    inside: point.x >= 0 && point.x <= W && point.y >= 0 && point.y <= H,
  };
  if (state.selectedType) {
    canvas.classList.add('is-building');
    canvas.classList.remove('is-inspecting');
  } else {
    canvas.classList.remove('is-building');
    const tower = state.hoverTower;
    canvas.classList.toggle('is-inspecting', !!tower);
  }
  if (!state.selectedType && state.pointer.inside) {
    state.hoverTower = findTowerAt(point.x, point.y);
    canvas.classList.toggle('is-inspecting', !!state.hoverTower);
  } else if (!state.selectedType) {
    state.hoverTower = null;
  }
}

function findTowerAt(x, y) {
  for (let i = state.towers.length - 1; i >= 0; i -= 1) {
    const tower = state.towers[i];
    if (distance(x, y, tower.x, tower.y - 20) < 29) return tower;
  }
  return null;
}

function resetGame() {
  window.clearTimeout(ui.toastTimeout);
  if (dom.resultDialog.open) dom.resultDialog.close();
  if (dom.helpDialog.open) dom.helpDialog.close();
  Object.assign(state, {
    phase: 'ready',
    paused: false,
    speed: 1,
    lives: currentMap.lives,
    cash: currentMap.cash,
    round: 0,
    mapId: currentMap.id,
    sandbox: false,
    sandboxTrack: 0,
    freeplay: false,
    towers: [],
    bloons: [],
    projectiles: [],
    particles: [],
    effects: [],
    spawnQueue: [],
    spawnElapsed: 0,
    waveTotal: 0,
    waveSpawned: 0,
    autoTimer: 0,
    selectedType: null,
    selectedTower: null,
    hoverTower: null,
    buildValid: false,
    buildReason: '',
    shake: 0,
    resultShown: false,
    nextId: 1,
    stats: { pops: 0, leaks: 0, cashEarned: 0 },
  });
  state.pointer = { x: W / 2, y: H / 2, inside: false };
  ui.threatKey = '';
  ui.lastCash = state.cash;
  ui.lastLives = state.lives;
  ui.lastRound = 0;
  dom.pauseScreen.hidden = true;
  dom.buildHint.hidden = true;
  dom.sandboxBar.hidden = true;
  dom.boardCta.hidden = false;
  dom.board.classList.remove('is-sandbox');
  dom.sandboxBtn.classList.remove('is-on');
  dom.sandboxBtn.setAttribute('aria-pressed', 'false');
  dom.toast.classList.remove('is-visible');
  dom.banner.classList.remove('is-visible');
  dom.boardTip.textContent = 'Choose a tower from the crew, then tap the grass to build.';
  dom.boardTip.classList.remove('is-hidden');
  canvas.classList.remove('is-building', 'is-inspecting');
  syncSidebar();
  updateShopSelection();
  updateUI(performance.now(), true);
  state.lastFrame = performance.now();
  showToast('Pick a monkey and build your defense. Ready when you are!', 'good');
}

function continueFreeplay() {
  if (dom.resultDialog.open) dom.resultDialog.close();
  state.freeplay = true;
  state.phase = 'between';
  state.round = TOTAL_ROUNDS;
  state.autoTimer = settings.autoStart ? 6.5 : 0;
  state.resultShown = false;
  updateUI(performance.now(), true);
  showToast(`Freeplay unlocked — see how long ${currentMap.name} can hold.`, 'good');
}

function previewPathData(anchors) {
  const { poly } = createPath(anchors, 3);
  let d = '';
  poly.forEach((point, index) => {
    d += `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  });
  return d;
}

function mapCardMarkup(id) {
  const map = MAPS[id];
  const difficulty = MAP_DIFFICULTIES[map.difficulty];
  const theme = map.theme;
  const trackWord = `${map.tracks.length} track${map.tracks.length === 1 ? '' : 's'}`;
  const previewPaths = map.tracks.map((anchors) => {
    const d = previewPathData(anchors);
    return `<path d="${d}" fill="none" stroke="${theme.pathShadow}" stroke-width="96" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 9)"/>`
      + `<path d="${d}" fill="none" stroke="${theme.pathEdge}" stroke-width="86" stroke-linecap="round" stroke-linejoin="round"/>`
      + `<path d="${d}" fill="none" stroke="${theme.pathOutline}" stroke-width="76" stroke-linecap="round" stroke-linejoin="round"/>`
      + `<path d="${d}" fill="none" stroke="${theme.pathBase}" stroke-width="66" stroke-linecap="round" stroke-linejoin="round"/>`
      + `<path d="${d}" fill="none" stroke="${theme.pathCenter}" stroke-width="42" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join('');
  return `
    <button class="map-card ${id === ui.selectedMapId ? 'is-selected' : ''}" data-map="${id}" type="button" aria-pressed="${id === ui.selectedMapId}">
      <span class="map-preview-wrap">
        <svg class="map-preview" viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <linearGradient id="map-grad-${id}" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="${theme.ground[0]}"/>
              <stop offset=".55" stop-color="${theme.ground[1]}"/>
              <stop offset="1" stop-color="${theme.ground[2]}"/>
            </linearGradient>
          </defs>
          <rect width="1200" height="760" fill="url(#map-grad-${id})"/>
          <circle cx="160" cy="650" r="150" fill="${theme.patchLight}"/>
          <circle cx="990" cy="120" r="170" fill="${theme.patchLight}"/>
          ${previewPaths}
        </svg>
        <span class="map-chip ${difficulty.className}">${difficulty.label}</span>
        <span class="map-track-count">${trackWord}</span>
        ${id === currentMap.id ? '<span class="map-current">Current</span>' : ''}
      </span>
      <span class="map-card-body">
        <strong>${map.name}</strong>
        <small>${map.description}</small>
        <span class="map-card-meta">
          <span><svg><use href="#i-heart"/></svg>${map.lives} lives</span>
          <span><svg><use href="#i-banana"/></svg>$${formatNumber(map.cash)}</span>
        </span>
      </span>
    </button>`;
}

function syncMapSelection() {
  const map = getMap(ui.selectedMapId);
  const difficulty = MAP_DIFFICULTIES[map.difficulty];
  for (const card of dom.mapGrid.querySelectorAll('.map-card')) {
    const selected = card.dataset.map === map.id;
    card.classList.toggle('is-selected', selected);
    card.setAttribute('aria-pressed', String(selected));
  }
  dom.mapSelectionNote.textContent = `${map.name} · ${difficulty.label} · ${map.tracks.length} track${map.tracks.length === 1 ? '' : 's'} · ${map.lives} lives · $${formatNumber(map.cash)} start. Starting a map begins a fresh run.`;
  dom.mapStartLabel.textContent = map.id === currentMap.id ? 'Restart this map' : `Start ${map.name}`;
}

function renderMapCards() {
  if (!dom.mapGrid) return;
  dom.mapGrid.innerHTML = MAP_ORDER.map(mapCardMarkup).join('');
  syncMapSelection();
}

function openMapPicker() {
  if (dom.mapDialog.open) return;
  ui.mapWasPaused = state.paused;
  if ((state.phase === 'active' || state.phase === 'between' || state.phase === 'sandbox') && !state.paused) {
    setPaused(true);
  }
  ui.selectedMapId = currentMap.id;
  renderMapCards();
  dom.mapDialog.showModal();
}

function closeMapPicker(restorePause = true) {
  if (!dom.mapDialog.open) return;
  dom.mapDialog.close();
  if (restorePause && !ui.mapWasPaused
    && (state.phase === 'active' || state.phase === 'between' || state.phase === 'sandbox')
    && state.paused) {
    setPaused(false);
  }
}

function updateMapLabels() {
  const difficulty = MAP_DIFFICULTIES[currentMap.difficulty];
  const trackWord = `${currentMap.tracks.length} track${currentMap.tracks.length === 1 ? '' : 's'}`;
  dom.mapName.textContent = currentMap.name;
  dom.mapDifficulty.textContent = `${difficulty.label} · ${trackWord}`;
  dom.brandMapName.textContent = currentMap.name;
  dom.pauseTitle.textContent = `${currentMap.name} paused`;
  dom.pauseCopy.textContent = `The ${currentMap.name} bloons can wait. Take a breath.`;
  document.title = `Bloon Blitz TD — ${currentMap.name}`;
  canvas.setAttribute('aria-label', `${currentMap.name} game board`);
}

function applySelectedMap() {
  const map = getMap(ui.selectedMapId);
  closeMapPicker(false);
  if (dom.resultDialog.open) dom.resultDialog.close();
  settings.map = map.id;
  saveSettings();
  currentMap = map;
  TREES = currentMap.trees;
  setPaths(currentMap.tracks);
  state.mapId = map.id;
  buildBackground();
  updateMapLabels();
  renderMapCards();
  resetGame();
  showToast(`Fresh run on ${map.name} — ${map.tracks.length} track${map.tracks.length === 1 ? '' : 's'} and $${formatNumber(map.cash)} to spend.`, 'good');
}

function buildSandboxButtons() {
  dom.sandboxBloons.innerHTML = BLOON_ORDER.map((type) => {
    const kind = BLOONS[type];
    const track = kind.blimp ? 'is-blimp' : '';
    return `<button class="sandbox-bloon ${track}" data-bloon="${type}" type="button" title="Spawn a ${kind.name}" style="--bloon-color:${kind.color}">
      <span class="sandbox-bloon-dot"></span><span>${kind.name}</span>
    </button>`;
  }).join('');
}

function enterSandbox() {
  if (state.sandbox) return;
  resetGame();
  Object.assign(state, {
    phase: 'sandbox',
    paused: false,
    lives: 9999,
    cash: 50000,
    round: 0,
    sandbox: true,
    sandboxTrack: 0,
    freeplay: false,
    selectedType: null,
    selectedTower: null,
    bloons: [],
    projectiles: [],
    particles: [],
    effects: [],
    spawnQueue: [],
    spawnElapsed: 0,
    resultShown: false,
  });
  dom.sandboxBar.hidden = false;
  dom.boardCta.hidden = true;
  dom.board.classList.add('is-sandbox');
  dom.sandboxBtn.classList.add('is-on');
  dom.sandboxBtn.setAttribute('aria-pressed', 'true');
  dom.boardTip.textContent = 'Sandbox: spawn bloons, build every monkey, and test upgrades. Nothing can cost you lives.';
  dom.boardTip.classList.remove('is-hidden');
  updateUI(performance.now(), true);
  showToast('Sandbox mode — unlimited cash and every bloon on tap. Have fun.', 'good');
}

function exitSandbox() {
  if (!state.sandbox) return;
  state.sandbox = false;
  resetGame();
  showToast('Sandbox closed. Back to a real run.', '');
}

function toggleSandbox() {
  if (state.sandbox) exitSandbox();
  else enterSandbox();
}

function spawnSandboxBloon(type) {
  if (!state.sandbox || !BLOONS[type]) return;
  const trackCount = Math.max(1, getPathCount());
  const track = state.sandboxTrack % trackCount;
  state.sandboxTrack = (state.sandboxTrack + 1) % trackCount;
  const lane = (Math.random() * 2 - 1) * (BLOONS[type].blimp ? 3 : 7);
  createBloon(type, 0, lane, track);
  sound.pop(type === 'ceramic' || type === 'rainbow');
  updateUI(performance.now(), true);
}

function clearSandbox() {
  if (!state.sandbox) return;
  state.bloons = [];
  state.projectiles = [];
  state.particles = [];
  state.effects = [];
  updateUI(performance.now(), true);
  showToast('Sandbox cleared.', '');
}

function bindEvents() {
  new ResizeObserver(() => resizeCanvas()).observe(dom.board);
  window.addEventListener('resize', resizeCanvas);

  dom.shopGrid.addEventListener('click', (event) => {
    const card = event.target.closest('.shop-card');
    if (!card) return;
    selectBuild(card.dataset.type);
  });

  dom.startBtn.addEventListener('click', () => {
    if (state.phase === 'between' || state.phase === 'ready') beginWave();
  });
  dom.autoBtn.addEventListener('click', toggleAutoStart);
  dom.speedBtn.addEventListener('click', toggleSpeed);
  dom.pauseBtn.addEventListener('click', () => setPaused(!state.paused));
  dom.resumeBtn.addEventListener('click', () => setPaused(false));
  dom.soundBtn.addEventListener('click', toggleSound);
  dom.helpBtn.addEventListener('click', openHelp);
  dom.sandboxBtn.addEventListener('click', toggleSandbox);
  dom.mapBtn.addEventListener('click', openMapPicker);
  dom.mapClose.addEventListener('click', () => closeMapPicker());
  dom.mapDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeMapPicker();
  });
  dom.mapDialog.addEventListener('click', (event) => {
    if (event.target === dom.mapDialog) closeMapPicker();
  });
  dom.mapGrid.addEventListener('click', (event) => {
    const card = event.target.closest('.map-card');
    if (!card) return;
    ui.selectedMapId = card.dataset.map;
    syncMapSelection();
    sound.click();
  });
  dom.mapStartBtn.addEventListener('click', applySelectedMap);
  dom.sandboxBloons.addEventListener('click', (event) => {
    const button = event.target.closest('[data-bloon]');
    if (button) spawnSandboxBloon(button.dataset.bloon);
  });
  dom.sandboxCash.addEventListener('click', () => {
    if (!state.sandbox) return;
    state.cash += 5000;
    sound.cash();
    updateUI(performance.now(), true);
  });
  dom.sandboxClear.addEventListener('click', clearSandbox);
  dom.sandboxExit.addEventListener('click', exitSandbox);
  dom.helpClose.addEventListener('click', closeHelp);
  dom.helpPlay.addEventListener('click', closeHelp);
  dom.helpDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeHelp();
  });
  dom.helpDialog.addEventListener('click', (event) => {
    if (event.target === dom.helpDialog) closeHelp();
  });

  dom.towerPanel.addEventListener('click', (event) => {
    const upgrade = event.target.closest('[data-upgrade]');
    if (upgrade) {
      upgradeSelected(Number(upgrade.dataset.upgrade));
      return;
    }
    if (event.target.closest('#closeInspector')) {
      selectTower(null);
      return;
    }
    if (event.target.closest('#cycleTarget')) {
      cycleTargeting();
      return;
    }
    if (event.target.closest('#sellTower')) sellSelected();
  });

  dom.resultRestart.addEventListener('click', resetGame);
  dom.resultContinue.addEventListener('click', continueFreeplay);
  dom.resultDialog.addEventListener('cancel', (event) => event.preventDefault());
  dom.resultDialog.addEventListener('click', (event) => {
    if (event.target === dom.resultDialog) event.preventDefault();
  });

  canvas.addEventListener('pointermove', (event) => {
    event.preventDefault();
    updateHoverAndCursor(event.clientX, event.clientY);
  });
  canvas.addEventListener('pointerleave', () => {
    state.pointer.inside = false;
    state.hoverTower = null;
    canvas.classList.remove('is-inspecting');
  });
  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    sound.ensure();
    if (state.paused || state.phase === 'victory' || state.phase === 'defeat') return;
    if (event.button === 2) {
      cancelBuild();
      selectTower(null);
      return;
    }
    const point = toWorld(event.clientX, event.clientY);
    if (point.x < 0 || point.x > W || point.y < 0 || point.y > H) return;
    if (state.selectedType) {
      placeTower(point.x, point.y);
      return;
    }
    const tower = findTowerAt(point.x, point.y);
    if (tower) {
      selectTower(tower);
      return;
    }
    selectTower(null);
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  window.addEventListener('keydown', (event) => {
    if (dom.helpDialog.open || dom.resultDialog.open || dom.mapDialog.open) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    if (event.key >= '1' && event.key <= '9') {
      const index = Number(event.key) - 1;
      if (TOWER_ORDER[index]) {
        event.preventDefault();
        selectBuild(TOWER_ORDER[index]);
      }
    } else if (event.key === '0') {
      if (TOWER_ORDER[9]) {
        event.preventDefault();
        selectBuild(TOWER_ORDER[9]);
      }
    } else if (event.code === 'Space') {
      event.preventDefault();
      if (state.phase === 'active' || state.phase === 'between') setPaused(!state.paused);
      else if (state.phase === 'ready') beginWave();
    } else if (event.key === 'p' || event.key === 'P') {
      setPaused(!state.paused);
    } else if (event.key === 'f' || event.key === 'F') {
      toggleSpeed();
    } else if (event.key === 'm' || event.key === 'M') {
      toggleSound();
    } else if (event.key === 't' || event.key === 'T') {
      cycleTargeting();
    } else if (event.key === 'Escape') {
      if (state.selectedType) cancelBuild();
      else if (state.selectedTower) selectTower(null);
      else if (state.paused) setPaused(false);
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      if (state.selectedTower) {
        event.preventDefault();
        sellSelected();
      }
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.phase === 'active' && !state.paused) setPaused(true);
  });

  window.addEventListener('pointerdown', () => sound.ensure(), { once: true });
}

function frame(now) {
  requestAnimationFrame(frame);
  const raw = Math.min(.05, Math.max(0, (now - state.lastFrame) / 1000));
  state.lastFrame = now;
  state.visualTime += raw;

  if (!state.paused) {
    if (state.phase === 'active' || state.phase === 'sandbox') {
      let remaining = raw * state.speed;
      while (remaining > 0 && (state.phase === 'active' || state.phase === 'sandbox')) {
        const step = Math.min(1 / 45, remaining);
        simulate(step);
        remaining -= step;
      }
    } else {
      updateVisuals(raw);
      if (state.phase === 'between' && settings.autoStart) {
        state.autoTimer -= raw;
        if (state.autoTimer <= 0) beginWave();
      }
    }
  }

  updateUI(now);
  render();
}

function init() {
  resizeCanvas();
  updateMapLabels();
  buildBackground();
  buildSandboxButtons();
  buildShop();
  bindEvents();
  syncSidebar();
  dom.autoBtn.classList.toggle('is-on', settings.autoStart);
  dom.soundIcon.setAttribute('href', settings.sound ? '#i-volume' : '#i-mute');
  updateUI(performance.now(), true);
  window.setTimeout(() => {
    if (state.round === 0 && state.towers.length === 0) {
      showToast(`Welcome to ${currentMap.name} — pick a tower, then tap the grass to build.`, 'good');
    }
  }, 650);
  requestAnimationFrame((now) => {
    state.lastFrame = now;
    frame(now);
  });
}

window.__bloonBlitz = {
  state,
  beginWave,
  resetGame,
  continueFreeplay,
  damageBloon,
  createBloon,
  selectBuild,
  placeTower,
  addCash: (amount) => { state.cash += amount; updateUI(performance.now(), true); },
  completeWave,
  showResult,
  getWave,
  TOWERS,
  BLOONS,
  MAPS,
  MAP_ORDER,
  getMap,
  setMap: (id) => { ui.selectedMapId = id; applySelectedMap(); },
  openMapPicker,
  enterSandbox,
  exitSandbox,
  spawnSandboxBloon,
  clearSandbox,
  getPathCount,
  getPathTotal,
  pathPoint,
};

init();
