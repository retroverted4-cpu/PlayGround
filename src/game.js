import {
  BALLOON_TYPES,
  MAX_WAVES,
  MAP_OBSTACLES,
  PORTRAIT_MAP_OBSTACLES,
  PORTRAIT_TRACK,
  PORTRAIT_WORLD,
  STARTING_CASH,
  STARTING_LIVES,
  TOWER_ORDER,
  TOWER_TYPES,
  TRACK,
  WORLD,
  clamp,
  distanceToTrack,
  formatMoney,
  getLeakDamage,
  getNextUpgrade,
  getSellValue,
  getTotalLevel,
  getTowerStats,
  getWave,
  isPlacementValid,
  sampleTrack,
} from './core.js';
import {
  createBackground,
  drawAmbientMotes,
  drawBalloon,
  drawFloaters,
  drawMonkey,
  drawParticles,
  drawPlacementGhost,
  drawProjectile,
  drawRangeRing,
  drawSelectionAura,
  drawShockwaves,
  drawTower,
  drawTowerIcon,
  drawTracers,
} from './art.js';
import { SoundEngine } from './audio.js';

let world = WORLD;
let W = world.width;
let H = world.height;
let track = TRACK;
let obstacles = MAP_OBSTACLES;
let layoutVariant = 'landscape';
const TAU = Math.PI * 2;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const stage = document.getElementById('gameFrame');
const shopEl = document.getElementById('shop');
const panelEl = document.getElementById('towerPanel');
const panelThumb = document.getElementById('panelThumb');
const panelName = document.getElementById('panelName');
const panelKicker = document.getElementById('panelKicker');
const panelLevel = document.getElementById('panelLevel');
const panelStats = document.getElementById('panelStats');
const upgradeList = document.getElementById('upgradeList');
const targetRow = document.getElementById('targetRow');
const sellBtn = document.getElementById('sellBtn');
const sellValue = document.getElementById('sellValue');
const livesEl = document.getElementById('livesValue');
const cashEl = document.getElementById('cashValue');
const roundEl = document.getElementById('roundValue');
const startBtn = document.getElementById('startBtn');
const startLabel = document.getElementById('startLabel');
const startKicker = document.getElementById('startKicker');
const roundMeterFill = document.getElementById('roundMeterFill');
const hintPill = document.getElementById('hintPill');
const hintText = document.getElementById('hintText');
const toastEl = document.getElementById('toast');
const roundFlash = document.getElementById('roundFlash');
const bossBanner = document.getElementById('bossBanner');
const shopStatusEl = document.getElementById('shopStatus');
const menuEl = document.getElementById('menu');
const helpModal = document.getElementById('helpModal');
const endModal = document.getElementById('endModal');
const bestWaveEl = document.getElementById('bestWave');
const soundBtn = document.getElementById('soundBtn');
const pauseBtn = document.getElementById('pauseBtn');
const endKicker = document.getElementById('endKicker');
const endTitle = document.getElementById('endTitle');
const endBody = document.getElementById('endBody');
const endRounds = document.getElementById('endRounds');
const endPops = document.getElementById('endPops');
const endMonkeys = document.getElementById('endMonkeys');
const speedButtons = [...document.querySelectorAll('.speed-btn')];

const sound = new SoundEngine();
const state = {
  mode: 'menu',
  paused: false,
  helpOpen: false,
  speed: 1,
  cash: STARTING_CASH,
  lives: STARTING_LIVES,
  waveIndex: 0,
  waveActive: false,
  wavePlan: null,
  waveElapsed: 0,
  spawnIndex: 0,
  bossVisible: false,
  balloons: [],
  towers: [],
  projectiles: [],
  blasts: [],
  particles: [],
  floaters: [],
  shockwaves: [],
  tracers: [],
  selectedShop: null,
  selectedTower: null,
  hover: null,
  hoverTower: null,
  time: 0,
  visualTime: 0,
  totalPops: 0,
  totalLeaks: 0,
  shake: 0,
  id: 1,
  muted: false,
  bossTimer: null,
  helpWasPaused: false,
};

let backgroundCanvas = null;
let dpr = 1;
let lastFrame = performance.now();
let lastHudAt = 0;
let lastPopSound = 0;
let lastAlertAt = 0;
let toastTimer = null;
let bestWave = 0;

try {
  bestWave = Number(localStorage.getItem('bloonBlastBest') || 0);
} catch {
  bestWave = 0;
}

/* ------------------------------------------------------------------ */
/* Utility                                                             */
/* ------------------------------------------------------------------ */

function setupCanvas() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
}

function detectPortrait() {
  return window.matchMedia('(orientation: portrait) and (max-width: 900px)').matches;
}

function isCoarsePointer() {
  return window.matchMedia('(pointer: coarse)').matches;
}

function inputVerb() {
  return isCoarsePointer() ? 'Tap' : 'Click';
}

function applyLayout(portrait, force = false) {
  if (!force && state.mode === 'playing') return false;
  const variant = portrait ? 'portrait' : 'landscape';
  if (layoutVariant === variant && backgroundCanvas) return false;
  layoutVariant = variant;
  if (variant === 'portrait') {
    world = PORTRAIT_WORLD;
    track = PORTRAIT_TRACK;
    obstacles = PORTRAIT_MAP_OBSTACLES;
  } else {
    world = WORLD;
    track = TRACK;
    obstacles = MAP_OBSTACLES;
  }
  W = world.width;
  H = world.height;
  stage.dataset.layout = variant;
  setupCanvas();
  backgroundCanvas = createBackground(track, obstacles, world, variant);
  return true;
}

function pointerToWorld(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * W,
    y: ((event.clientY - rect.top) / rect.height) * H,
  };
}

function angleLerp(a, b, t) {
  let diff = ((b - a + Math.PI * 3) % TAU) - Math.PI;
  return a + diff * t;
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function saveBest(value) {
  if (value <= bestWave) return;
  bestWave = value;
  try {
    localStorage.setItem('bloonBlastBest', String(bestWave));
  } catch {
    /* storage is optional */
  }
  updateBestLabel();
}

function updateBestLabel() {
  bestWaveEl.textContent = bestWave > 0 ? `ROUND ${bestWave}` : '—';
}

function showToast(message, type = '') {
  toastEl.textContent = message;
  toastEl.className = `toast show ${type}`.trim();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 2400);
}

function getPlacementError(x, y, type) {
  const def = TOWER_TYPES[type];
  if (x < 48 || x > W - 48 || y < 132 || y > H - 150) return 'That spot is off the island.';
  if (distanceToTrack(track, x, y) < 56 + 29 * 0.25) return 'Too close to the path!';
  for (const obstacle of obstacles) {
    if (Math.hypot(x - obstacle.x, y - obstacle.y) < obstacle.r + 29 * 0.7) return 'That spot is taken by scenery.';
  }
  for (const tower of state.towers) {
    if (Math.hypot(x - tower.x, y - tower.y) < 58) return 'Give your monkeys some elbow room.';
  }
  if (state.cash < def.cost) return `You need $${def.cost - state.cash} more for a ${def.name}.`;
  return '';
}

/* ------------------------------------------------------------------ */
/* Game state                                                          */
/* ------------------------------------------------------------------ */

function resetGame(mode = 'menu') {
  state.mode = mode;
  state.paused = false;
  state.helpOpen = false;
  state.speed = 1;
  state.cash = STARTING_CASH;
  state.lives = STARTING_LIVES;
  state.waveIndex = 0;
  state.waveActive = false;
  state.wavePlan = null;
  state.waveElapsed = 0;
  state.spawnIndex = 0;
  state.bossVisible = false;
  state.balloons = [];
  state.towers = [];
  state.projectiles = [];
  state.blasts = [];
  state.particles = [];
  state.floaters = [];
  state.shockwaves = [];
  state.tracers = [];
  state.selectedShop = null;
  state.selectedTower = null;
  state.hover = null;
  state.hoverTower = null;
  state.time = 0;
  state.totalPops = 0;
  state.totalLeaks = 0;
  state.shake = 0;
  state.id = 1;
  clearTimeout(state.bossTimer);
  bossBanner.classList.remove('show');
  panelEl.hidden = true;
  endModal.hidden = true;
  helpModal.hidden = true;
  clearTimeout(toastTimer);
  toastEl.classList.remove('show');
  speedButtons.forEach((button) => button.classList.toggle('active', button.dataset.speed === '1'));
  pauseBtn.classList.remove('paused');
  document.querySelectorAll('.shop-card').forEach((card) => card.classList.remove('selected'));
  updateHud(true);
  updateHint();
}

function beginGame() {
  applyLayout(detectPortrait(), true);
  sound.init();
  resetGame('playing');
  menuEl.classList.add('hidden');
  menuEl.setAttribute('aria-hidden', 'true');
  showToast('Pick a monkey from the armory, then tap the grass.');
  updateHud(true);
}

function returnToMenu() {
  applyLayout(detectPortrait(), true);
  resetGame('menu');
  endModal.hidden = true;
  menuEl.classList.remove('hidden');
  menuEl.removeAttribute('aria-hidden');
  updateBestLabel();
}

function startRound() {
  if (state.mode !== 'playing' || state.waveActive || state.waveIndex >= MAX_WAVES) return;
  sound.init();
  state.waveIndex += 1;
  state.wavePlan = getWave(state.waveIndex);
  state.waveActive = true;
  state.waveElapsed = 0;
  state.spawnIndex = 0;
  state.bossVisible = Boolean(state.wavePlan.boss);
  sound.startWave();
  flashRound(state.waveIndex);
  if (state.wavePlan.boss) {
    showBossBanner();
    showToast('MOAB incoming! Focus your fire!', 'error');
  }
  updateHud(true);
  updateHint();
}

function showBossBanner() {
  bossBanner.classList.add('show');
  clearTimeout(state.bossTimer);
  state.bossTimer = setTimeout(() => {
    bossBanner.classList.remove('show');
    state.bossVisible = false;
  }, 4600);
}

function flashRound(number) {
  roundFlash.querySelector('strong').textContent = String(number);
  roundFlash.classList.remove('pop');
  void roundFlash.offsetWidth;
  roundFlash.classList.add('pop');
}

function endGame(victory) {
  if (state.mode !== 'playing') return;
  state.mode = victory ? 'victory' : 'defeat';
  state.paused = false;
  state.waveActive = false;
  state.selectedShop = null;
  state.selectedTower = null;
  panelEl.hidden = true;
  bossBanner.classList.remove('show');
  hintPill.classList.remove('show');
  startBtn.disabled = true;
  if (victory) {
    saveBest(MAX_WAVES);
    sound.victory();
  } else {
    saveBest(state.waveIndex);
    sound.defeat();
  }
  updateHud(true);
  endKicker.textContent = victory ? 'ISLAND SAVED' : 'ISLAND OVERRUN';
  endTitle.textContent = victory ? 'Perfectly popped!' : 'The bloons got through…';
  endBody.textContent = victory
    ? 'Thirty rounds, zero regrets. The monkeys are throwing a party and you are invited.'
    : `You held out until round ${state.waveIndex}. Upgrade sooner, cover the corners, and try again.`;
  endRounds.textContent = String(state.waveIndex);
  endPops.textContent = String(state.totalPops);
  endMonkeys.textContent = String(state.towers.length);
  endModal.hidden = false;
}

function makeTower(type, x, y) {
  return {
    id: state.id += 1,
    type,
    x,
    y,
    angle: -Math.PI / 2,
    cooldown: 0.1,
    targetMode: type === 'sniper' ? 'strong' : 'first',
    levels: { top: 0, bottom: 0 },
    kick: 0,
    upgradedFlash: 0,
    specialTimer: 0,
    stats: getTowerStats(type),
  };
}

function placeTower(type, x, y) {
  const error = getPlacementError(x, y, type);
  if (error) {
    showToast(error, 'error');
    if (state.cash < TOWER_TYPES[type].cost) sound.alert();
    return false;
  }
  const tower = makeTower(type, x, y);
  state.cash -= TOWER_TYPES[type].cost;
  state.towers.push(tower);
  sound.place();
  spawnPlaceParticles(x, y, TOWER_TYPES[type].accent);
  showToast(`${TOWER_TYPES[type].name} placed!`);
  updateHud(true);
  return tower;
}

function selectShop(type) {
  if (state.mode !== 'playing') return;
  sound.click();
  state.selectedTower = null;
  panelEl.hidden = true;
  if (state.selectedShop === type) {
    state.selectedShop = null;
  } else {
    state.selectedShop = type;
    const def = TOWER_TYPES[type];
    hintText.textContent = isCoarsePointer()
      ? `Tap open grass to place the ${def.name}. Tap its armory card again to cancel.`
      : `Click open grass to place the ${def.name}. Press Esc to cancel.`;
  }
  syncShopSelection();
  updateHint();
}

function selectTower(tower) {
  state.selectedShop = null;
  state.selectedTower = tower;
  syncShopSelection();
  panelEl.hidden = false;
  renderPanel();
  updateHint();
}

function deselectAll() {
  state.selectedShop = null;
  state.selectedTower = null;
  panelEl.hidden = true;
  syncShopSelection();
  updateHint();
}

function syncShopSelection() {
  document.querySelectorAll('.shop-card').forEach((card) => {
    card.classList.toggle('selected', card.dataset.type === state.selectedShop);
    card.setAttribute('aria-selected', card.dataset.type === state.selectedShop ? 'true' : 'false');
  });
}

/* ------------------------------------------------------------------ */
/* Tower panel                                                         */
/* ------------------------------------------------------------------ */

function renderPanel() {
  const tower = state.selectedTower;
  if (!tower) {
    panelEl.hidden = true;
    return;
  }
  const def = TOWER_TYPES[tower.type];
  const stats = getTowerStats(tower.type, tower.levels);
  tower.stats = stats;
  panelEl.hidden = false;
  panelName.textContent = def.name;
  panelKicker.textContent = 'TOWER DOSSIER';
  panelLevel.textContent = `LEVEL ${getTotalLevel(tower)}${tower.levels.top === 3 ? ' · TOP MAX' : ''}${tower.levels.bottom === 3 ? ' · BOTTOM MAX' : ''}`;
  drawTowerIcon(panelThumb, tower.type, tower.levels);

  const range = stats.range >= 9999 ? '∞' : Math.round(stats.range);
  const rate = (1 / stats.cooldown).toFixed(1);
  const dps = Math.round((stats.damage * Math.max(1, stats.projectiles || 1)) / stats.cooldown);
  panelStats.innerHTML = `
    <div><span>DAMAGE</span><strong>${stats.damage}</strong></div>
    <div><span>RANGE</span><strong>${range}</strong></div>
    <div><span>RATE</span><strong>${rate}/s</strong></div>
    <div><span>POWER</span><strong>${dps}</strong></div>
  `;

  const branches = ['top', 'bottom'].map((path) => {
    const next = getNextUpgrade(tower.type, tower.levels, path);
    const label = path === 'top' ? 'A' : 'B';
    if (!next) {
      return `
        <button class="upgrade path-${path} maxed" type="button" disabled>
          <span class="upgrade-icon">★</span>
          <span class="upgrade-copy"><strong>${path === 'top' ? 'Top path complete' : 'Bottom path complete'}</strong><small>Maximum power reached</small></span>
          <span class="upgrade-cost">MAX</span>
        </button>`;
    }
    const disabled = state.cash < next.cost ? 'disabled' : '';
    return `
      <button class="upgrade path-${path}" type="button" data-path="${path}" data-cost="${next.cost}" ${disabled} title="${next.desc}">
        <span class="upgrade-icon">${label}</span>
        <span class="upgrade-copy"><strong>${next.name}</strong><small>${next.desc}</small></span>
        <span class="upgrade-cost">$${next.cost}</span>
      </button>`;
  });
  upgradeList.innerHTML = branches.join('');
  targetRow.querySelectorAll('button').forEach((button) => {
    button.classList.toggle('active', button.dataset.target === tower.targetMode);
  });
  sellValue.textContent = `$${formatMoney(getSellValue(tower))}`;
}

function buyUpgrade(path) {
  const tower = state.selectedTower;
  if (!tower) return;
  const next = getNextUpgrade(tower.type, tower.levels, path);
  if (!next) return;
  if (state.cash < next.cost) {
    sound.alert();
    showToast(`Need $${next.cost - state.cash} more for ${next.name}.`, 'error');
    return;
  }
  state.cash -= next.cost;
  tower.levels[path] += 1;
  tower.stats = getTowerStats(tower.type, tower.levels);
  tower.upgradedFlash = 1;
  sound.upgrade();
  spawnUpgradeParticles(tower.x, tower.y, TOWER_TYPES[tower.type].accent);
  showToast(`${next.name} unlocked!`);
  renderPanel();
  updateHud(true);
}

function sellSelectedTower() {
  const tower = state.selectedTower;
  if (!tower) return;
  const value = getSellValue(tower);
  state.cash += value;
  state.towers = state.towers.filter((item) => item !== tower);
  state.selectedTower = null;
  panelEl.hidden = true;
  sound.sell();
  state.floaters.push({ x: tower.x, y: tower.y - 50, vy: -22, life: 1.1, maxLife: 1.1, text: `+$${value}`, color: '#ffe278', size: 16 });
  showToast(`Monkey sold for $${value}.`);
  updateHud(true);
}

/* ------------------------------------------------------------------ */
/* Balloons and combat                                                 */
/* ------------------------------------------------------------------ */

function spawnBalloon(typeId, lane = 0, startDist = 0) {
  const type = BALLOON_TYPES[typeId];
  if (!type) return;
  const b = {
    id: state.id += 1,
    type: typeId,
    dist: Math.max(0, startDist),
    lane: clamp(lane, -4, 4),
    hp: type.hp,
    maxHp: type.hp,
    speed: type.speed,
    x: -60,
    y: track.points[0].y,
    angle: 0,
    seed: Math.random() * TAU,
    slowTimer: 0,
    slowAmount: 0,
    freezeTimer: 0,
    flash: 0,
    dead: false,
    leaked: false,
  };
  updateBalloonPosition(b, 0);
  state.balloons.push(b);
  if (type.boss) {
    state.shake = Math.max(state.shake, 4);
  }
}

function updateBalloonPosition(b, dt) {
  const type = BALLOON_TYPES[b.type];
  const slow = b.freezeTimer > 0 ? 1 : b.slowAmount;
  let mult = b.freezeTimer > 0 ? 0 : 1 - slow;
  if (b.freezeTimer > 0) {
    b.freezeTimer -= dt;
  } else if (b.slowTimer > 0) {
    b.slowTimer -= dt;
    if (b.slowTimer <= 0) b.slowAmount = 0;
  }
  if (type.id === 'moab' && b.slowTimer > 0) mult = 1 - slow * 0.42;
  if (b.freezeTimer > 0) mult = 0;
  b.dist += type.speed * Math.max(0, mult) * dt;
  const point = sampleTrack(track, b.dist);
  const normalX = Math.cos(point.angle + Math.PI / 2);
  const normalY = Math.sin(point.angle + Math.PI / 2);
  const wobble = Math.sin(state.time * 2.5 + b.seed) * 1.8;
  b.x = point.x + normalX * b.lane * 3.4 + normalX * wobble;
  b.y = point.y + normalY * b.lane * 3.4 + normalY * wobble;
  b.angle = point.angle;
  b.flash = Math.max(0, b.flash - dt * 6);
}

function damageBalloon(balloon, amount, options = {}) {
  if (!balloon || balloon.dead) return;
  const type = BALLOON_TYPES[balloon.type];
  const kind = options.kind || 'projectile';
  if (kind === 'explosion' && balloon.type === 'black') {
    balloon.flash = 0.12;
    return;
  }
  let damage = amount;
  if (options.moabBonus && balloon.type === 'moab') damage += options.moabBonus;
  if (kind === 'freeze' && balloon.type === 'white') {
    balloon.flash = 0.12;
    return;
  }
  balloon.hp -= damage;
  balloon.flash = 0.15;
  if (balloon.hp <= 0) popBalloon(balloon);
}

function popBalloon(balloon) {
  if (balloon.dead) return;
  balloon.dead = true;
  const type = BALLOON_TYPES[balloon.type];
  state.cash += type.cash;
  state.totalPops += 1;
  if (type.boss) {
    state.shake = Math.max(state.shake, 9);
    makePopBurst(balloon.x, balloon.y - 30, type, 34);
    state.shockwaves.push({ x: balloon.x, y: balloon.y, radius: 130, life: 0.6, maxLife: 0.6, color: '#ffd262', width: 8, fill: true });
    addFloater(balloon.x, balloon.y - 55, `+$${type.cash}`, '#ffe47c', 20);
    sound.pop(true);
  } else {
    makePopBurst(balloon.x, balloon.y - 22, type, 8);
    addFloater(balloon.x, balloon.y - 30, `+$${type.cash}`, '#fff0a6', 10);
    if (state.time - lastPopSound > 0.045) {
      lastPopSound = state.time;
      sound.pop(false);
    }
  }

  const children = type.children || [];
  for (let i = 0; i < children.length; i += 1) {
    const spread = children.length > 1 ? (i - (children.length - 1) / 2) * 1.5 : 0;
    spawnBalloon(children[i], clamp(balloon.lane + spread, -4, 4), Math.min(track.length - 6, balloon.dist + i * 1.2));
  }
  state.shake = Math.max(state.shake, type.boss ? 9 : 0.8);
}

function leakBalloon(balloon) {
  balloon.dead = true;
  balloon.leaked = true;
  state.totalLeaks += 1;
  const damage = getLeakDamage(balloon.type);
  state.lives -= damage;
  state.shake = Math.max(state.shake, balloon.type === 'moab' ? 10 : 3);
  if (state.time - lastAlertAt > 0.7) {
    lastAlertAt = state.time;
    sound.alert();
    showToast(balloon.type === 'moab' ? 'A MOAB escaped! −25 lives' : 'A bloon slipped through! −1 life', 'error');
  }
  if (state.lives <= 0) {
    state.lives = 0;
    endGame(false);
  }
}

function findTarget(tower, stats) {
  const candidates = [];
  for (const balloon of state.balloons) {
    if (balloon.dead) continue;
    const radius = BALLOON_TYPES[balloon.type]?.boss ? 48 : 18;
    if (stats.range > 5000 || Math.hypot(balloon.x - tower.x, balloon.y - tower.y) <= stats.range + radius) {
      candidates.push(balloon);
    }
  }
  if (!candidates.length) return null;
  const mode = tower.targetMode;
  candidates.sort((a, b) => {
    if (mode === 'last') return a.dist - b.dist;
    if (mode === 'close') return Math.hypot(a.x - tower.x, a.y - tower.y) - Math.hypot(b.x - tower.x, b.y - tower.y);
    if (mode === 'strong') {
      const bossA = BALLOON_TYPES[a.type]?.boss ? 1 : 0;
      const bossB = BALLOON_TYPES[b.type]?.boss ? 1 : 0;
      if (bossA !== bossB) return bossB - bossA;
      return b.hp - a.hp || b.dist - a.dist;
    }
    return b.dist - a.dist;
  });
  return candidates[0];
}

function spawnProjectile(options) {
  const projectile = {
    id: state.id += 1,
    kind: 'dart',
    x: 0,
    y: 0,
    angle: 0,
    speed: 600,
    damage: 1,
    pierce: 1,
    life: 1.2,
    maxLife: 1.2,
    hit: new Set(),
    trail: [],
    sourceKind: 'projectile',
    ...options,
  };
  state.projectiles.push(projectile);
  return projectile;
}

function fireTower(tower, stats, target) {
  const def = TOWER_TYPES[tower.type];
  const angle = Math.atan2(target.y - tower.y, target.x - tower.x);
  tower.angle = angle;
  tower.kick = 1;
  const muzzleX = tower.x + Math.cos(angle) * 19;
  const muzzleY = tower.y - 34 + Math.sin(angle) * 8;

  if (tower.type === 'dart' || tower.type === 'super') {
    const count = Math.max(1, Math.round(stats.projectiles || 1));
    for (let i = 0; i < count; i += 1) {
      const spread = (i - (count - 1) / 2) * (count > 3 ? 0.15 : 0.1);
      spawnProjectile({
        kind: tower.type === 'super' ? 'super' : 'dart',
        x: muzzleX,
        y: muzzleY,
        angle: angle + spread,
        speed: stats.projectileSpeed,
        damage: stats.damage,
        pierce: stats.pierce,
        life: Math.max(0.35, (stats.range + 50) / stats.projectileSpeed),
        maxLife: Math.max(0.35, (stats.range + 50) / stats.projectileSpeed),
        moabBonus: stats.moabBonus || 0,
      });
    }
    sound.shoot(tower.type === 'super' ? 'super' : 'dart');
  } else if (tower.type === 'tack') {
    const count = Math.max(4, Math.round(stats.projectiles || 8));
    const base = angle + randomRange(-0.2, 0.2);
    for (let i = 0; i < count; i += 1) {
      spawnProjectile({
        kind: stats.fire ? 'fireTack' : 'tack',
        x: tower.x,
        y: tower.y - 20,
        angle: base + (i / count) * TAU,
        speed: stats.projectileSpeed,
        damage: stats.damage,
        pierce: stats.pierce,
        life: 0.48,
        maxLife: 0.48,
        moabBonus: stats.moabBonus || 0,
        blades: Boolean(stats.blades),
      });
    }
    sound.shoot('tack');
  } else if (tower.type === 'boomerang') {
    const count = Math.max(1, Math.round(stats.projectiles || 1));
    for (let i = 0; i < count; i += 1) {
      spawnProjectile({
        kind: 'rang',
        x: tower.x,
        y: tower.y - 34,
        angle: angle + (i - (count - 1) / 2) * 0.22,
        speed: stats.projectileSpeed,
        damage: stats.damage,
        pierce: stats.pierce,
        life: 1.28,
        maxLife: 1.28,
        curve: (i % 2 === 0 ? 1 : -1) * (stats.curve || 3.2),
        spin: 0,
        moabBonus: stats.moabBonus || 0,
      });
    }
    sound.shoot('rang');
  } else if (tower.type === 'bomb') {
    const travelTime = clamp(Math.hypot(target.x - tower.x, target.y - tower.y) / stats.projectileSpeed, 0.28, 1.1);
    const lead = travelTime * 0.55;
    const targetX = target.x + Math.cos(target.angle) * (BALLOON_TYPES[target.type]?.speed || 0) * lead;
    const targetY = target.y + Math.sin(target.angle) * (BALLOON_TYPES[target.type]?.speed || 0) * lead;
    spawnProjectile({
      kind: 'bomb',
      x: tower.x,
      y: tower.y - 34,
      startX: tower.x,
      startY: tower.y - 34,
      targetX,
      targetY,
      angle,
      speed: stats.projectileSpeed,
      damage: stats.damage,
      pierce: 1,
      life: travelTime,
      maxLife: travelTime,
      elapsed: 0,
      duration: travelTime,
      z: 0,
      blastRadius: stats.blastRadius || 64,
      cluster: stats.cluster || 1,
      moabBonus: stats.moabBonus || 0,
      sourceKind: 'explosion',
    });
    sound.shoot('bomb');
  } else if (tower.type === 'ice') {
    if (stats.globalFreeze && tower.specialTimer <= 0) {
      tower.specialTimer = 9;
      state.shockwaves.push({ x: tower.x, y: tower.y, radius: 1400, life: 1.2, maxLife: 1.2, color: '#b6fbff', width: 9, fill: false });
      showToast('Absolute Zero freezes the whole island!');
      sound.upgrade();
    }
    const global = stats.globalFreeze && tower.specialTimer > 8.2;
    state.shockwaves.push({
      x: tower.x,
      y: tower.y - 10,
      radius: global ? 1450 : stats.range,
      life: 0.65,
      maxLife: 0.65,
      color: '#b8fbff',
      width: 4,
      fill: true,
    });
    const targets = state.balloons.slice();
    for (const balloon of targets) {
      if (balloon.dead) continue;
      const distance = Math.hypot(balloon.x - tower.x, balloon.y - tower.y);
      if (!global && distance > stats.range + 20) continue;
      if (balloon.type !== 'white') {
        balloon.slowAmount = Math.max(balloon.slowAmount, stats.slow || 0.45);
        balloon.slowTimer = Math.max(balloon.slowTimer, stats.slowDuration || 2);
      }
      damageBalloon(balloon, stats.damage, { kind: 'freeze', tower });
    }
    if (stats.shards) {
      for (let i = 0; i < stats.shards; i += 1) {
        spawnProjectile({
          kind: 'iceShard',
          x: tower.x,
          y: tower.y - 28,
          angle: (i / stats.shards) * TAU,
          speed: 520,
          damage: 1,
          pierce: 2,
          life: 0.65,
          maxLife: 0.65,
          sourceKind: 'freeze',
          moabBonus: 0,
        });
      }
    }
    sound.shoot('ice');
  } else if (tower.type === 'sniper') {
    let damage = stats.damage;
    let crit = false;
    if (stats.crit && Math.random() < stats.crit) {
      damage *= 3;
      crit = true;
    }
    state.tracers.push({
      x1: tower.x + Math.cos(angle) * 25,
      y1: tower.y - 40 + Math.sin(angle) * 4,
      x2: target.x,
      y2: target.y,
      life: 0.18,
      maxLife: 0.18,
      color: crit ? '#ff9a58' : '#fff1a1',
      width: crit ? 4 : 2,
    });
    makeHitParticles(target.x, target.y - 18, crit ? '#ffc75f' : '#fff5c4', crit ? 10 : 5);
    damageBalloon(target, damage, { kind: 'projectile', moabBonus: stats.moabBonus, tower });
    sound.shoot('sniper');
  }
  void def;
}

function explodeAt(x, y, radius, damage, options = {}) {
  state.shockwaves.push({ x, y, radius, life: 0.52, maxLife: 0.52, color: '#ffd06a', width: 6, fill: true });
  for (let i = 0; i < 18; i += 1) {
    const a = Math.random() * TAU;
    const speed = randomRange(40, 230);
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed - 30,
      gravity: 170,
      life: randomRange(0.3, 0.75),
      maxLife: 0.75,
      size: randomRange(2, 6),
      color: i % 3 === 0 ? '#fff2b1' : i % 3 === 1 ? '#ff9d3e' : '#d35b21',
      kind: i % 2 ? 'spark' : 'confetti',
      rot: Math.random() * TAU,
      spin: randomRange(-8, 8),
    });
  }
  state.particles.push({ x, y, vx: 0, vy: -12, gravity: -8, life: 0.6, maxLife: 0.6, size: radius * 0.4, color: '#8b7151', kind: 'smoke' });
  const targets = state.balloons.slice();
  for (const balloon of targets) {
    if (balloon.dead) continue;
    if (Math.hypot(balloon.x - x, balloon.y - y) <= radius + (BALLOON_TYPES[balloon.type]?.boss ? 20 : 8)) {
      damageBalloon(balloon, damage, { kind: 'explosion', tower: options.tower, moabBonus: options.moabBonus });
    }
  }
  sound.explode();
  state.shake = Math.max(state.shake, 5);
  if (options.cluster && options.cluster > 1) {
    for (let i = 0; i < options.cluster - 1; i += 1) {
      state.blasts.push({
        x: x + randomRange(-32, 32),
        y: y + randomRange(-24, 24),
        radius: radius * 0.6,
        damage: damage * 0.65,
        timer: 0.13 + i * 0.08,
        tower: options.tower,
        moabBonus: options.moabBonus,
      });
    }
  }
}

/* ------------------------------------------------------------------ */
/* Effects                                                             */
/* ------------------------------------------------------------------ */

function addFloater(x, y, text, color, size = 12) {
  state.floaters.push({ x, y, vy: -26, life: 1.2, maxLife: 1.2, text, color, size });
}

function makePopBurst(x, y, type, count) {
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * TAU;
    const speed = randomRange(30, 180);
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed - 35,
      gravity: 210,
      life: randomRange(0.35, 0.9),
      maxLife: 0.9,
      size: randomRange(2, 5.5),
      color: i % 3 === 0 ? type.light : i % 3 === 1 ? type.color : type.dark,
      kind: i % 2 ? 'confetti' : 'spark',
      rot: Math.random() * TAU,
      spin: randomRange(-10, 10),
    });
  }
}

function makeHitParticles(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * TAU;
    const speed = randomRange(20, 120);
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      gravity: 80,
      life: randomRange(0.18, 0.4),
      maxLife: 0.4,
      size: randomRange(1.2, 3.2),
      color,
      kind: 'spark',
      rot: 0,
      spin: 0,
    });
  }
}

function spawnPlaceParticles(x, y, color) {
  for (let i = 0; i < 16; i += 1) {
    const a = Math.random() * TAU;
    state.particles.push({
      x: x + Math.cos(a) * 18,
      y: y + Math.sin(a) * 6,
      vx: Math.cos(a) * randomRange(15, 80),
      vy: Math.sin(a) * randomRange(-12, 25),
      gravity: 70,
      life: randomRange(0.35, 0.75),
      maxLife: 0.75,
      size: randomRange(2, 4),
      color,
      kind: 'spark',
      rot: 0,
      spin: 0,
    });
  }
  state.shockwaves.push({ x, y: y + 2, radius: 38, life: 0.35, maxLife: 0.35, color: '#e7ffd0', width: 3, fill: false });
}

function spawnUpgradeParticles(x, y, color) {
  for (let i = 0; i < 28; i += 1) {
    const a = Math.random() * TAU;
    const speed = randomRange(25, 150);
    state.particles.push({
      x,
      y: y - 30,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      gravity: 35,
      life: randomRange(0.45, 0.9),
      maxLife: 0.9,
      size: randomRange(2, 5),
      color: i % 2 ? color : '#ffd86b',
      kind: 'spark',
      rot: 0,
      spin: 0,
    });
  }
  state.shockwaves.push({ x, y: y - 20, radius: 55, life: 0.45, maxLife: 0.45, color: color || '#ffdb70', width: 4, fill: false });
}

/* ------------------------------------------------------------------ */
/* Simulation                                                          */
/* ------------------------------------------------------------------ */

function simulate(dt) {
  state.time += dt;
  state.shake = Math.max(0, state.shake - dt * 28);
  updateWave(dt);
  updateBalloons(dt);
  updateTowers(dt);
  updateProjectiles(dt);
  updateEffects(dt);
  checkRoundEnd();
}

function updateWave(dt) {
  if (!state.waveActive || !state.wavePlan) return;
  state.waveElapsed += dt;
  while (state.spawnIndex < state.wavePlan.spawns.length) {
    const spawn = state.wavePlan.spawns[state.spawnIndex];
    if (spawn.at > state.waveElapsed) break;
    spawnBalloon(spawn.type, spawn.lane, 0);
    state.spawnIndex += 1;
  }
}

function updateBalloons(dt) {
  for (let i = state.balloons.length - 1; i >= 0; i -= 1) {
    const balloon = state.balloons[i];
    if (balloon.dead) continue;
    updateBalloonPosition(balloon, dt);
    if (balloon.dist >= track.length) {
      leakBalloon(balloon);
    }
  }
  if (state.balloons.some((balloon) => balloon.dead)) {
    state.balloons = state.balloons.filter((balloon) => !balloon.dead);
  }
}

function updateTowers(dt) {
  for (const tower of state.towers) {
    const stats = getTowerStats(tower.type, tower.levels);
    tower.stats = stats;
    tower.cooldown -= dt;
    tower.kick = Math.max(0, tower.kick - dt * 7);
    tower.upgradedFlash = Math.max(0, tower.upgradedFlash - dt * 2.2);
    tower.specialTimer = Math.max(0, tower.specialTimer - dt);
    const target = findTarget(tower, stats);
    if (target) {
      tower.angle = angleLerp(tower.angle, Math.atan2(target.y - tower.y, target.x - tower.x), Math.min(1, dt * 15));
    }
    if (target && tower.cooldown <= 0) {
      tower.cooldown = stats.cooldown;
      fireTower(tower, stats, target);
    } else if (!target) {
      tower.angle += Math.sin(state.time * 0.8 + tower.x) * dt * 0.06;
    }
  }
}

function segmentCircleHit(x1, y1, x2, y2, cx, cy, radius) {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const wx = cx - x1;
  const wy = cy - y1;
  const len2 = vx * vx + vy * vy;
  const t = len2 ? clamp((wx * vx + wy * vy) / len2, 0, 1) : 0;
  return Math.hypot(cx - (x1 + vx * t), cy - (y1 + vy * t)) <= radius;
}

function updateProjectiles(dt) {
  for (let i = state.projectiles.length - 1; i >= 0; i -= 1) {
    const p = state.projectiles[i];
    p.life -= dt;
    if (p.kind === 'bomb') {
      p.elapsed += dt;
      const t = clamp(p.elapsed / p.duration, 0, 1);
      p.x = p.startX + (p.targetX - p.startX) * t;
      p.y = p.startY + (p.targetY - p.startY) * t;
      p.z = Math.sin(t * Math.PI) * (55 + Math.min(65, p.duration * 42));
      p.angle = Math.atan2(p.targetY - p.startY, p.targetX - p.startX);
      p.trail.push({ x: p.x, y: p.y - p.z });
      if (p.trail.length > 8) p.trail.shift();
      if (t >= 1) {
        explodeAt(p.targetX, p.targetY, p.blastRadius, p.damage, {
          tower: p.tower,
          cluster: p.cluster,
          moabBonus: p.moabBonus,
        });
        state.projectiles.splice(i, 1);
      }
      continue;
    }

    const prevX = p.x;
    const prevY = p.y;
    if (p.kind === 'rang') {
      p.angle += p.curve * dt;
      p.spin += dt * 16;
    }
    p.x += Math.cos(p.angle) * p.speed * dt;
    p.y += Math.sin(p.angle) * p.speed * dt;
    if (p.kind === 'super' || p.kind === 'rang') {
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 7) p.trail.shift();
    }

    let remove = p.life <= 0;
    if (!remove) {
      for (const balloon of state.balloons) {
        if (balloon.dead || p.hit.has(balloon.id)) continue;
        const type = BALLOON_TYPES[balloon.type];
        const radius = type?.boss ? 42 : Math.max(11, (type?.width || 26) * 0.43);
        if (segmentCircleHit(prevX, prevY, p.x, p.y, balloon.x, balloon.y - (type?.boss ? 26 : 20), radius)) {
          p.hit.add(balloon.id);
          makeHitParticles(balloon.x, balloon.y - 20, p.kind === 'fireTack' ? '#ffb24c' : '#fff1ae', 4);
          damageBalloon(balloon, p.damage, {
            kind: p.sourceKind,
            tower: p.tower,
            moabBonus: p.moabBonus,
          });
          p.pierce -= 1;
          if (p.pierce <= 0) {
            remove = true;
            break;
          }
        }
      }
    }
    if (remove) state.projectiles.splice(i, 1);
  }
}

function updateEffects(dt) {
  for (let i = state.blasts.length - 1; i >= 0; i -= 1) {
    const blast = state.blasts[i];
    blast.timer -= dt;
    if (blast.timer <= 0) {
      explodeAt(blast.x, blast.y, blast.radius, blast.damage, { tower: blast.tower, cluster: 1, moabBonus: blast.moabBonus });
      state.blasts.splice(i, 1);
    }
  }
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      state.particles.splice(i, 1);
      continue;
    }
    p.vy += (p.gravity || 0) * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - dt * 1.2;
    if (p.rot !== undefined) p.rot += (p.spin || 0) * dt;
  }
  for (let i = state.floaters.length - 1; i >= 0; i -= 1) {
    const f = state.floaters[i];
    f.life -= dt;
    f.y += f.vy * dt;
    f.vy *= 1 - dt * 1.3;
    if (f.life <= 0) state.floaters.splice(i, 1);
  }
  for (let i = state.shockwaves.length - 1; i >= 0; i -= 1) {
    state.shockwaves[i].life -= dt;
    if (state.shockwaves[i].life <= 0) state.shockwaves.splice(i, 1);
  }
  for (let i = state.tracers.length - 1; i >= 0; i -= 1) {
    state.tracers[i].life -= dt;
    if (state.tracers[i].life <= 0) state.tracers.splice(i, 1);
  }
}

function checkRoundEnd() {
  if (!state.waveActive || !state.wavePlan) return;
  if (state.spawnIndex < state.wavePlan.spawns.length) return;
  if (state.balloons.length > 0) return;
  state.waveActive = false;
  const reward = state.wavePlan.reward;
  state.cash += reward;
  state.bossVisible = false;
  bossBanner.classList.remove('show');
  if (state.waveIndex >= MAX_WAVES) {
    endGame(true);
    return;
  }
  saveBest(state.waveIndex);
  sound.upgrade();
  addFloater(W / 2, layoutVariant === 'portrait' ? 200 : 180, `ROUND ${state.waveIndex} CLEAR  +$${reward}`, '#fff2b2', 18);
  showToast(`Round ${state.waveIndex} cleared! +$${reward} bonus. Next: round ${state.waveIndex + 1}.`);
  updateHud(true);
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (state.shake > 0.1) {
    ctx.translate(randomRange(-state.shake, state.shake), randomRange(-state.shake, state.shake));
  }
  if (backgroundCanvas) ctx.drawImage(backgroundCanvas, 0, 0, W, H);
  drawAmbientMotes(ctx, state.visualTime, world);

  if (state.mode !== 'menu') {
    if (state.selectedTower) {
      drawSelectionAura(ctx, state.selectedTower, state.visualTime);
    }
    if (state.hoverTower && state.hoverTower !== state.selectedTower) {
      const tower = state.hoverTower;
      ctx.save();
      ctx.beginPath();
      ctx.arc(tower.x, tower.y - 18, 38, 0, TAU);
      ctx.strokeStyle = 'rgba(255, 248, 207, 0.45)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    if (state.selectedShop && state.hover) {
      const type = state.selectedShop;
      const valid = !getPlacementError(state.hover.x, state.hover.y, type);
      drawPlacementGhost(ctx, type, state.hover.x, state.hover.y, valid, state.visualTime);
    }

    const sortedTowers = state.towers.slice().sort((a, b) => a.y - b.y);
    for (const tower of sortedTowers) drawTower(ctx, tower, state.visualTime, tower === state.selectedTower);

    const sortedBalloons = state.balloons.slice().sort((a, b) => a.y - b.y);
    for (const balloon of sortedBalloons) drawBalloon(ctx, balloon, state.visualTime);

    for (const projectile of state.projectiles) drawProjectile(ctx, projectile, state.visualTime);
    drawShockwaves(ctx, state.shockwaves);
    drawParticles(ctx, state.particles);
    drawTracers(ctx, state.tracers);
    drawFloaters(ctx, state.floaters);
  } else {
    for (const balloon of state.balloons) drawBalloon(ctx, balloon, state.visualTime);
  }

  if (state.paused && state.mode === 'playing' && !state.helpOpen) {
    ctx.fillStyle = 'rgba(8, 30, 19, 0.42)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 247, 218, 0.96)';
    ctx.font = '900 46px ui-rounded, "Trebuchet MS", sans-serif';
    ctx.fillText('PAUSED', W / 2, H / 2 - 6);
    ctx.font = '800 13px ui-rounded, "Trebuchet MS", sans-serif';
    ctx.fillStyle = 'rgba(255, 247, 218, 0.6)';
    ctx.fillText('Press Space to resume', W / 2, H / 2 + 37);
  }

  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* UI                                                                  */
/* ------------------------------------------------------------------ */

function updateHud(force = false) {
  const now = performance.now();
  if (!force && now - lastHudAt < 80) return;
  lastHudAt = now;

  livesEl.textContent = String(Math.max(0, state.lives));
  cashEl.textContent = formatMoney(state.cash);
  const roundNumber = state.waveActive ? state.waveIndex : Math.min(MAX_WAVES, state.waveIndex + 1);
  roundEl.textContent = String(roundNumber);

  if (state.waveActive) {
    startBtn.disabled = true;
    startBtn.classList.add('busy');
    startKicker.textContent = `ROUND ${state.waveIndex} LIVE`;
    startLabel.textContent = 'Round in Progress';
    const progress = state.wavePlan ? (state.spawnIndex / Math.max(1, state.wavePlan.spawns.length)) * 100 : 0;
    roundMeterFill.style.width = `${progress}%`;
  } else if (state.waveIndex >= MAX_WAVES) {
    startBtn.disabled = true;
    startBtn.classList.remove('busy');
    startKicker.textContent = 'ISLAND SAVED';
    startLabel.textContent = 'All Rounds Cleared';
    roundMeterFill.style.width = '100%';
  } else {
    startBtn.disabled = false;
    startBtn.classList.remove('busy');
    const next = state.waveIndex + 1;
    startKicker.textContent = next % 10 === 0 ? 'BOSS ROUND' : `READY · ROUND ${next}`;
    startLabel.textContent = 'Start Round';
    roundMeterFill.style.width = '0%';
  }

  if (state.selectedShop) {
    shopStatusEl.textContent = `Placing ${TOWER_TYPES[state.selectedShop].short} · $${TOWER_TYPES[state.selectedShop].cost}`;
  } else if (state.waveActive) {
    const count = state.balloons.length;
    shopStatusEl.textContent = `${count} bloon${count === 1 ? '' : 's'} on the field`;
  } else {
    const nextPlan = getWave(Math.min(MAX_WAVES, state.waveIndex + 1));
    const preview = nextPlan.groups
      .slice(0, 2)
      .map((group) => `${group.count} ${BALLOON_TYPES[group.type].name}`)
      .join(' + ');
    shopStatusEl.textContent = `Round ${nextPlan.number} · ${preview}`;
  }

  document.querySelectorAll('.shop-card').forEach((card) => {
    const def = TOWER_TYPES[card.dataset.type];
    card.classList.toggle('unaffordable', state.cash < def.cost);
  });

  if (state.selectedTower && !panelEl.hidden) {
    panelEl.querySelectorAll('.upgrade[data-cost]').forEach((button) => {
      button.disabled = Number(button.dataset.cost) > state.cash;
    });
  }
}

function updateHint() {
  if (state.mode !== 'playing') {
    hintPill.classList.remove('show');
    return;
  }
  if (state.selectedTower) {
    hintText.textContent = '';
    hintPill.classList.remove('show');
    return;
  }
  let text = '';
  if (state.selectedShop) {
    const def = TOWER_TYPES[state.selectedShop];
    text = `${inputVerb()} open grass to place the ${def.name} · $${def.cost}`;
  } else if (state.towers.length === 0 && !state.waveActive) {
    text = `Pick a monkey below, then ${inputVerb().toLowerCase()} the grass to place it.`;
  } else if (state.towers.length > 0 && !state.waveActive && state.waveIndex === 0) {
    text = `Looking good! ${inputVerb()} Start Round when you are ready.`;
  }
  hintText.textContent = text;
  hintPill.classList.toggle('show', Boolean(text));
}

function buildShop() {
  shopEl.innerHTML = TOWER_ORDER.map((type, index) => {
    const def = TOWER_TYPES[type];
    return `
      <button class="shop-card" type="button" role="option" aria-selected="false" data-type="${type}"
        aria-label="Select ${def.name}, costs $${def.cost}" title="${def.blurb}" style="--tower-color:${def.color}">
        <canvas class="shop-thumb" width="96" height="96" aria-hidden="true"></canvas>
        <span class="shop-copy">
          <strong>${def.name}</strong>
          <small>${def.blurb.split('.')[0]}</small>
          <span class="shop-cost">${def.cost}</span>
        </span>
        <span class="shop-key">${index + 1}</span>
      </button>`;
  }).join('');
  shopEl.querySelectorAll('.shop-card').forEach((card) => {
    const canvasEl = card.querySelector('canvas');
    drawTowerIcon(canvasEl, card.dataset.type, {});
  });
}

function togglePause() {
  if (state.mode !== 'playing' || state.helpOpen) return;
  state.paused = !state.paused;
  pauseBtn.classList.toggle('paused', state.paused);
  pauseBtn.setAttribute('aria-label', state.paused ? 'Resume game' : 'Pause game');
  sound.click();
  if (state.paused) {
    showToast(isCoarsePointer() ? 'Paused — tap pause to resume.' : 'Paused — press Space to resume.');
  }
}

function setSpeed(speed) {
  if (state.mode !== 'playing') return;
  state.speed = speed;
  speedButtons.forEach((button) => button.classList.toggle('active', Number(button.dataset.speed) === speed));
  sound.click();
}

function toggleSound() {
  state.muted = !state.muted;
  sound.init();
  sound.setEnabled(!state.muted);
  soundBtn.classList.toggle('muted', state.muted);
  soundBtn.setAttribute('aria-label', state.muted ? 'Enable sound' : 'Mute sound');
  if (!state.muted) sound.click();
}

function openHelp() {
  state.helpOpen = true;
  state.helpWasPaused = state.paused;
  if (state.mode === 'playing') state.paused = true;
  pauseBtn.classList.add('paused');
  helpModal.hidden = false;
  sound.click();
}

function closeHelp() {
  state.helpOpen = false;
  helpModal.hidden = true;
  if (state.mode === 'playing' && !state.helpWasPaused) {
    state.paused = false;
    pauseBtn.classList.remove('paused');
  }
  sound.click();
}

/* ------------------------------------------------------------------ */
/* Input                                                               */
/* ------------------------------------------------------------------ */

canvas.addEventListener('pointermove', (event) => {
  const point = pointerToWorld(event);
  state.hover = point;
  let nextHover = null;
  for (let i = state.towers.length - 1; i >= 0; i -= 1) {
    const tower = state.towers[i];
    if (Math.hypot(point.x - tower.x, point.y - (tower.y - 18)) < 39) {
      nextHover = tower;
      break;
    }
  }
  state.hoverTower = nextHover;
  canvas.style.cursor = state.selectedShop ? 'crosshair' : nextHover ? 'pointer' : 'default';
});

canvas.addEventListener('pointerleave', () => {
  state.hover = null;
  state.hoverTower = null;
});

canvas.addEventListener('pointerdown', (event) => {
  if (state.mode !== 'playing') return;
  sound.init();
  const point = pointerToWorld(event);
  state.hover = point;
  if (event.button === 2) {
    deselectAll();
    return;
  }
  let tower = null;
  for (let i = state.towers.length - 1; i >= 0; i -= 1) {
    if (Math.hypot(point.x - state.towers[i].x, point.y - (state.towers[i].y - 18)) < 39) {
      tower = state.towers[i];
      break;
    }
  }
  if (tower && !state.selectedShop) {
    selectTower(tower);
    return;
  }
  if (state.selectedShop) {
    if (tower) {
      selectTower(tower);
      return;
    }
    const placed = placeTower(state.selectedShop, point.x, point.y);
    if (placed) selectTower(placed);
    return;
  }
  if (!tower) deselectAll();
});

canvas.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  if (state.mode === 'playing') deselectAll();
});

shopEl.addEventListener('click', (event) => {
  const card = event.target.closest('.shop-card');
  if (!card) return;
  selectShop(card.dataset.type);
});

panelEl.addEventListener('click', (event) => {
  const close = event.target.closest('#panelClose');
  if (close) {
    state.selectedTower = null;
    panelEl.hidden = true;
    updateHint();
    sound.click();
    return;
  }
  const target = event.target.closest('[data-target]');
  if (target && state.selectedTower) {
    state.selectedTower.targetMode = target.dataset.target;
    renderPanel();
    sound.click();
    return;
  }
  const upgrade = event.target.closest('.upgrade[data-path]');
  if (upgrade && state.selectedTower) {
    buyUpgrade(upgrade.dataset.path);
    return;
  }
  if (event.target.closest('#sellBtn')) sellSelectedTower();
});

startBtn.addEventListener('click', startRound);
document.getElementById('playBtn').addEventListener('click', beginGame);
document.getElementById('replayBtn').addEventListener('click', () => {
  sound.init();
  resetGame('playing');
  endModal.hidden = true;
  showToast('Fresh monkeys, fresh balloons. Good luck!');
});
document.getElementById('menuBtn').addEventListener('click', returnToMenu);
document.getElementById('menuHowBtn').addEventListener('click', openHelp);
document.getElementById('helpBtn').addEventListener('click', openHelp);
document.getElementById('helpClose').addEventListener('click', closeHelp);
pauseBtn.addEventListener('click', togglePause);
soundBtn.addEventListener('click', toggleSound);
speedButtons.forEach((button) => {
  button.addEventListener('click', () => setSpeed(Number(button.dataset.speed)));
});
helpModal.addEventListener('click', (event) => {
  if (event.target === helpModal) closeHelp();
});
endModal.addEventListener('click', (event) => {
  if (event.target === endModal) returnToMenu();
});

window.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  if (state.helpOpen) {
    if (event.key === 'Escape' || event.key === 'Enter') closeHelp();
    return;
  }
  if (state.mode === 'menu') {
    if (event.key === 'Enter' || event.key === ' ') beginGame();
    return;
  }
  if (state.mode !== 'playing') return;
  const number = Number(event.key);
  if (number >= 1 && number <= TOWER_ORDER.length) {
    selectShop(TOWER_ORDER[number - 1]);
    return;
  }
  if (event.key === 'Escape') {
    deselectAll();
    return;
  }
  if (event.key === ' ') {
    event.preventDefault();
    togglePause();
    return;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    startRound();
    return;
  }
  if (event.key.toLowerCase() === 'm') toggleSound();
  if (event.key.toLowerCase() === 'p') togglePause();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.mode === 'playing' && !state.paused) {
    state.paused = true;
    pauseBtn.classList.add('paused');
  }
});

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const desired = detectPortrait();
    const current = layoutVariant === 'portrait';
    if (desired !== current) {
      if (state.mode === 'playing') {
        showToast('Finish this round before rotating the island.');
        return;
      }
      if (state.mode === 'menu') {
        applyLayout(desired, true);
        resetGame('menu');
      } else {
        returnToMenu();
      }
      return;
    }
    setupCanvas();
  }, 180);
});

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

function loop(timestamp) {
  const raw = Math.min(0.08, Math.max(0, (timestamp - lastFrame) / 1000));
  lastFrame = timestamp;
  state.visualTime = timestamp / 1000;
  if (state.mode === 'playing' && !state.paused && !state.helpOpen) {
    let remaining = Math.min(0.05, raw) * state.speed;
    let guard = 0;
    while (remaining > 0.0001 && guard < 12) {
      const step = Math.min(1 / 60, remaining);
      simulate(step);
      remaining -= step;
      guard += 1;
    }
  }
  updateHud();
  render();
  requestAnimationFrame(loop);
}

buildShop();
setupCanvas();
applyLayout(detectPortrait(), true);
updateBestLabel();
resetGame('menu');

if (new URLSearchParams(window.location.search).has('debug')) {
  window.__bloonBlast = {
    state,
    simulate,
    startRound,
    beginGame,
    placeTower,
    selectTower,
    renderPanel,
    getWave,
    getTowerStats,
  };
}

requestAnimationFrame(loop);
