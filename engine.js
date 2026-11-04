/* =========================================================
   BLOONS TD 5 — SUNSET GROVE
   Core simulation: economy, waves, combat, particles.
   ========================================================= */
(() => {
  "use strict";
  const BTD = (window.BTD = window.BTD || {});
  const { TOWERS, BLOONS, ROUNDS, TAU, clamp, dist, rand, formatMoney, Sound } = BTD;
  const { Tower, Bloon, Projectile, TARGET_MODES } = BTD;

  class Game {
    constructor(canvas, stage) {
      this.canvas = canvas;
      this.stage = stage;
      this.ctx = canvas.getContext("2d");
      this.hooks = {};
      this.dpr = 1;
      this.w = 0;
      this.h = 0;
      this.scale = 1;
      this.pathWidth = 52;
      this.track = null;
      this.pond = null;
      this.scenery = { trees: [], bushes: [], flowers: [], rocks: [], grass: [], mushrooms: [], torches: [], sign: null, gate: null };
      this.background = null;
      this.butterflies = [];
      this.motes = [];
      this.leaves = [];

      this.money = 1800;
      this.lives = 200;
      this.score = 0;
      this.pops = 0;
      this.round = 0;
      this.roundActive = false;
      this.roundClock = 0;
      this.spawnPlan = [];
      this.roundTotal = 0;
      this.roundSpawned = 0;
      this.autoTimer = 0;
      this.autoStart = false;
      this.endDelay = 0;
      this.gameOver = false;
      this.won = false;
      this.paused = false;
      this.speed = 1;
      this.time = 0;
      this.realTime = 0;
      this.shake = 0;
      this.hurtFlash = 0;
      this.dirty = true;

      this.towers = [];
      this.bloons = [];
      this.projectiles = [];
      this.particles = [];
      this.rings = [];
      this.floaters = [];
      this.tracers = [];

      this.selectedType = null;
      this.selectedTower = null;
      this.hoveredTower = null;
      this.pointer = { x: -999, y: -999, inside: false };
      this.ghostValid = false;
      this.ghostReason = "";
      this.tutorialDismissed = false;

      this.resize();
      this.placeStarter();
    }

    // -----------------------------------------------------
    // Layout
    // -----------------------------------------------------
    resize() {
      const rect = this.stage.getBoundingClientRect();
      const w = Math.max(240, rect.width);
      const h = Math.max(240, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = w;
      this.h = h;
      this.dpr = dpr;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.canvas.style.width = w + "px";
      this.canvas.style.height = h + "px";
      this.scale = clamp(Math.min(w / 1180, h / 670), 0.64, 1.12);
      this.pathWidth = 52 * this.scale;
      this.track = new BTD.Track(w, h);
      this.setupScenery();
      this.nudgeTowers();
      this.buildBackground();
      this.dirty = true;
    }

    setupScenery() {
      const { w, h, track, scale } = this;
      const rng = BTD.makeRng(4281 + Math.round(w * 3 + h * 7));
      this.pond = null;
      const pondCandidates = [
        [0.09, 0.84], [0.9, 0.84], [0.87, 0.13], [0.1, 0.13], [0.86, 0.46]
      ];
      for (const [nx, ny] of pondCandidates) {
        const x = nx * w;
        const y = ny * h;
        const rx = clamp(64 * scale, 39, 78);
        const ry = rx * 0.62;
        if (x - rx < 8 || x + rx > w - 8 || y - ry < 8 || y + ry > h - 8) continue;
        if (track.nearest(x, y).distance > rx + this.pathWidth * 0.85 + 12) {
          this.pond = { x, y, rx, ry };
          break;
        }
      }

      const isClear = (x, y, pad) => {
        if (x < -20 || x > w + 20 || y < -20 || y > h + 20) return false;
        if (track.nearest(x, y).distance < this.pathWidth * 0.5 + pad) return false;
        if (this.pond) {
          const dx = (x - this.pond.x) / (this.pond.rx + pad);
          const dy = (y - this.pond.y) / (this.pond.ry + pad);
          if (dx * dx + dy * dy < 1) return false;
        }
        return true;
      };

      const treeCount = Math.round(clamp(Math.min(w, h) / 35, 11, 22));
      this.scenery.trees = [];
      for (let i = 0; i < treeCount * 5 && this.scenery.trees.length < treeCount; i++) {
        let x, y;
        if (rng() < 0.72) {
          if (rng() < 0.5) x = rng() * w * 0.16;
          else x = w - rng() * w * 0.16;
          y = rng() * h;
        } else {
          x = rng() * w;
          y = rng() < 0.55 ? rng() * h * 0.12 : h - rng() * h * 0.12;
        }
        const palm = rng() < 0.18;
        const s = (palm ? 1.05 : 0.72) + rng() * 0.48;
        const pad = (palm ? 22 : 28) * s * scale;
        if (!isClear(x, y, pad)) continue;
        if (this.scenery.trees.some((t) => dist(t.x, t.y, x, y) < 42 * scale * Math.max(1, s))) continue;
        this.scenery.trees.push({ x, y, s, palm });
      }

      const bushCount = Math.round(clamp((w * h) / 26000, 12, 30));
      this.scenery.bushes = [];
      for (let i = 0; i < bushCount * 6 && this.scenery.bushes.length < bushCount; i++) {
        const x = rng() * w;
        const y = rng() * h;
        const s = 0.75 + rng() * 0.8;
        if (!isClear(x, y, 13 * s * scale)) continue;
        this.scenery.bushes.push({ x, y, s, berries: rng() < 0.3 });
      }

      const flowerCount = Math.round(clamp((w * h) / 11500, 25, 70));
      this.scenery.flowers = [];
      for (let i = 0; i < flowerCount * 4 && this.scenery.flowers.length < flowerCount; i++) {
        const x = rng() * w;
        const y = rng() * h;
        if (!isClear(x, y, 4)) continue;
        this.scenery.flowers.push({ x, y, s: 0.8 + rng() * 0.8 });
      }

      const rockCount = Math.round(clamp((w * h) / 62000, 6, 15));
      this.scenery.rocks = [];
      for (let i = 0; i < rockCount * 5 && this.scenery.rocks.length < rockCount; i++) {
        const x = rng() * w;
        const y = rng() * h;
        const s = 0.8 + rng() * 1.2;
        if (!isClear(x, y, 9 * s * scale)) continue;
        this.scenery.rocks.push({ x, y, s });
      }

      const grassCount = Math.round(clamp((w * h) / 9000, 30, 90));
      this.scenery.grass = [];
      for (let i = 0; i < grassCount * 3 && this.scenery.grass.length < grassCount; i++) {
        const x = rng() * w;
        const y = rng() * h;
        if (!isClear(x, y, 2)) continue;
        this.scenery.grass.push({ x, y, s: 0.7 + rng() * 0.7, flip: rng() < 0.5 });
      }

      this.scenery.mushrooms = [];
      for (let i = 0; i < 13; i++) {
        const x = rng() * w;
        const y = rng() * h;
        if (!isClear(x, y, 4)) continue;
        this.scenery.mushrooms.push({ x, y, s: 0.8 + rng() * 0.7 });
      }

      // Entrance sign and exit gate
      const start = track.pointAt(0.035);
      const end = track.pointAt(0.965);
      const insideSign = start.x < w * 0.5 ? 1 : -1;
      this.scenery.sign = {
        x: start.x + start.nx * (this.pathWidth * 0.5 + 30 * scale) * insideSign,
        y: start.y + start.ny * (this.pathWidth * 0.5 + 30 * scale) * insideSign
      };
      const insideGate = end.x < w * 0.5 ? 1 : -1;
      this.scenery.gate = {
        x: end.x + end.nx * (this.pathWidth * 0.5 + 35 * scale) * insideGate,
        y: end.y + end.ny * (this.pathWidth * 0.5 + 35 * scale) * insideGate
      };
      this.scenery.torches = [];
      for (const t of [0.1, 0.56, 0.89]) {
        const p = track.pointAt(t);
        const side = t === 0.1 ? -1 : 1;
        this.scenery.torches.push({
          x: p.x + p.nx * (this.pathWidth * 0.5 + 14 * scale) * side,
          y: p.y + p.ny * (this.pathWidth * 0.5 + 14 * scale) * side
        });
      }

      const count = Math.round(w / 170);
      this.butterflies = [];
      for (let i = 0; i < clamp(count, 3, 8); i++) {
        this.butterflies.push({
          x: rng() * w,
          y: h * (0.18 + rng() * 0.65),
          phase: rng() * TAU,
          speed: 0.3 + rng() * 0.5,
          range: 26 + rng() * 54,
          color: rng() < 0.45 ? "#ffd15e" : rng() < 0.6 ? "#f7a7c2" : "#bce8ff"
        });
      }

      this.motes = [];
      for (let i = 0; i < 24; i++) {
        this.motes.push({ x: rng() * w, y: rng() * h, phase: rng() * TAU, speed: 0.2 + rng() * 0.4, size: 0.7 + rng() * 1.3 });
      }

      this.leaves = [];
      for (let i = 0; i < 9; i++) {
        this.leaves.push({ x: rng() * w, y: rng() * h, phase: rng() * TAU, speed: 8 + rng() * 14, size: 2.4 + rng() * 2.4, drift: 10 + rng() * 18 });
      }
    }

    buildBackground() {
      const c = document.createElement("canvas");
      c.width = Math.round(this.w * this.dpr);
      c.height = Math.round(this.h * this.dpr);
      const ctx = c.getContext("2d");
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.renderBackground(ctx);
      this.background = c;
    }

    isSpotClear(x, y, ignore = null) {
      const margin = 18 * this.scale;
      if (x < margin || y < margin || x > this.w - margin || y > this.h - margin) return false;
      if (this.track.nearest(x, y).distance < this.pathWidth * 0.5 + 13 * this.scale) return false;
      if (this.pond) {
        const dx = (x - this.pond.x) / (this.pond.rx + 9 * this.scale);
        const dy = (y - this.pond.y) / (this.pond.ry + 9 * this.scale);
        if (dx * dx + dy * dy < 1) return false;
      }
      for (const t of this.towers) {
        if (t === ignore) continue;
        if (dist(t.x, t.y, x, y) < 30 * this.scale) return false;
      }
      return true;
    }

    canPlace(type, x, y) {
      if (!type) return { ok: false, reason: "No monkey selected." };
      const def = TOWERS[type];
      if (this.money < def.cost) return { ok: false, reason: `Need $${formatMoney(def.cost - this.money)} more.` };
      if (!this.isSpotClear(x, y)) {
        if (this.track.nearest(x, y).distance < this.pathWidth * 0.5 + 13 * this.scale) return { ok: false, reason: "Too close to the track." };
        return { ok: false, reason: "Find a little more open grass." };
      }
      return { ok: true, reason: "" };
    }

    placeStarter() {
      if (this.towers.some((t) => t.isScout)) return;
      const candidates = this.w / this.h < 1.18
        ? [[0.68, 0.29], [0.34, 0.57], [0.7, 0.47], [0.25, 0.31], [0.54, 0.75], [0.47, 0.21]]
        : [[0.5, 0.31], [0.29, 0.5], [0.61, 0.35], [0.77, 0.48], [0.53, 0.68], [0.13, 0.51]];
      let spot = null;
      const clearance = this.pathWidth * 0.5 + 30 * this.scale;
      for (const [nx, ny] of candidates) {
        const x = nx * this.w;
        const y = ny * this.h;
        if (this.track.nearest(x, y).distance < clearance) continue;
        if (this.isSpotClear(x, y)) {
          spot = { x, y };
          break;
        }
      }
      if (!spot) {
        for (let i = 0; i < 160; i++) {
          const x = rand(0.12, 0.88) * this.w;
          const y = rand(0.12, 0.88) * this.h;
          if (this.isSpotClear(x, y)) {
            spot = { x, y };
            break;
          }
        }
      }
      if (!spot) spot = { x: this.w * 0.5, y: this.h * 0.5 };
      const t = new Tower(this, "dart", spot.x / this.w, spot.y / this.h, { scout: true });
      this.towers.push(t);
      this.dirty = true;
    }

    nudgeTowers() {
      for (const t of this.towers) {
        let x = t.nx * this.w;
        let y = t.ny * this.h;
        if (this.isSpotClear(x, y, t)) continue;
        let found = false;
        for (let ring = 1; ring <= 20 && !found; ring++) {
          const radius = ring * 12 * this.scale;
          for (let i = 0; i < 18; i++) {
            const a = (i / 18) * TAU + ring * 0.35;
            const nx = x + Math.cos(a) * radius;
            const ny = y + Math.sin(a) * radius;
            if (this.isSpotClear(nx, ny, t)) {
              t.nx = nx / this.w;
              t.ny = ny / this.h;
              found = true;
              break;
            }
          }
        }
        if (!found) {
          t.nx = 0.5;
          t.ny = 0.5;
        }
      }
    }

    // -----------------------------------------------------
    // Input helpers
    // -----------------------------------------------------
    setPointer(x, y, inside) {
      this.pointer.x = x;
      this.pointer.y = y;
      this.pointer.inside = inside;
      if (this.selectedType && inside) {
        const check = this.canPlace(this.selectedType, x, y);
        this.ghostValid = check.ok;
        this.ghostReason = check.reason;
      }
      if (!this.selectedType && inside) {
        this.hoveredTower = this.towerAt(x, y);
      } else {
        this.hoveredTower = null;
      }
    }

    towerAt(x, y) {
      let best = null;
      let bestD = 26 * this.scale;
      for (const t of this.towers) {
        const d = dist(t.x, t.y - 18 * this.scale, x, y);
        if (d < bestD) {
          bestD = d;
          best = t;
        }
      }
      return best;
    }

    selectBuild(type) {
      if (this.gameOver || this.paused) return;
      this.selectedTower = null;
      this.selectedType = type === this.selectedType ? null : type;
      if (this.selectedType) {
        this.ghostValid = false;
        if (this.pointer.inside) {
          const check = this.canPlace(this.selectedType, this.pointer.x, this.pointer.y);
          this.ghostValid = check.ok;
          this.ghostReason = check.reason;
        }
      }
      this.dirty = true;
    }

    cancelBuild() {
      this.selectedType = null;
      this.ghostValid = false;
      this.dirty = true;
    }

    selectTower(t) {
      this.selectedType = null;
      this.selectedTower = t;
      this.dirty = true;
    }

    closeInspector() {
      this.selectedTower = null;
      this.dirty = true;
    }

    tryPlace(type, x, y) {
      const check = this.canPlace(type, x, y);
      if (!check.ok) {
        this.sound("error");
        this.emit("toast", check.reason);
        return false;
      }
      const def = TOWERS[type];
      this.money -= def.cost;
      const t = new Tower(this, type, x / this.w, y / this.h);
      this.towers.push(t);
      this.addRing(x, y, 8 * this.scale, 46 * this.scale, "#d7ff8e", 0.55, true);
      this.addParticles(x, y - 10 * this.scale, def.palette.accent, 15, 80 * this.scale, 0.65, "star");
      this.sound("place");
      this.tutorialDismissed = true;
      this.emit("placed", { type });
      this.dirty = true;
      if (this.money < def.cost) this.selectedType = null;
      return true;
    }

    // -----------------------------------------------------
    // Economy / rounds
    // -----------------------------------------------------
    startRound() {
      if (this.roundActive || this.gameOver || this.round >= ROUNDS.length) return false;
      Sound.init();
      this.round++;
      this.roundActive = true;
      this.roundClock = 0;
      this.roundSpawned = 0;
      this.autoTimer = 0;
      this.selectedTower = null;
      this.selectedType = null;
      this.spawnPlan = [];
      const groups = ROUNDS[this.round - 1];
      for (const group of groups) {
        for (let i = 0; i < group.count; i++) {
          this.spawnPlan.push({
            type: group.type,
            at: group.delay + i * group.gap,
            offset: rand(-6, 6) * this.scale
          });
        }
      }
      this.spawnPlan.sort((a, b) => a.at - b.at);
      this.roundTotal = this.spawnPlan.length;
      this.tutorialDismissed = true;
      const boss = groups.some((g) => BLOONS[g.type].big);
      this.emit("roundStart", { round: this.round, groups, boss });
      this.sound("round");
      if (boss) {
        this.sound("boss");
        this.shake = Math.max(this.shake, 8);
      }
      this.dirty = true;
      return true;
    }

    updateRound(dt) {
      if (!this.roundActive) return;
      this.roundClock += dt;
      while (this.spawnPlan.length && this.spawnPlan[0].at <= this.roundClock) {
        const item = this.spawnPlan.shift();
        this.spawnBloon(item.type, 0, item.offset);
        this.roundSpawned++;
      }
    }

    spawnBloon(type, t = 0, offset = 0, opts = {}) {
      if (!BLOONS[type]) return null;
      const b = new Bloon(this, type, t, offset, opts);
      this.bloons.push(b);
      return b;
    }

    checkRoundEnd() {
      if (!this.roundActive || this.gameOver) return;
      if (this.spawnPlan.length || this.bloons.length) return;
      this.roundActive = false;
      const reward = 120 + this.round * 22;
      this.money += reward;
      this.score += reward * 2;
      this.emit("roundComplete", { round: this.round, reward });
      this.sound("upgrade");
      if (this.round >= ROUNDS.length) {
        this.endDelay = 1.9;
      } else if (this.autoStart) {
        this.autoTimer = 4.6;
      }
      this.dirty = true;
    }

    updateAuto(dt) {
      if (this.gameOver || this.roundActive) return;
      if (this.autoStart && this.round > 0 && this.round < ROUNDS.length && this.autoTimer > 0) {
        this.autoTimer -= dt;
        if (this.autoTimer <= 0) {
          this.autoTimer = 0;
          this.startRound();
        }
      }
      if (this.endDelay > 0) {
        this.endDelay -= dt;
        if (this.endDelay <= 0) this.endGame(true);
      }
    }

    endGame(won) {
      if (this.gameOver) return;
      this.gameOver = true;
      this.won = won;
      this.roundActive = false;
      this.autoStart = false;
      this.autoTimer = 0;
      this.selectedType = null;
      this.selectedTower = null;
      this.paused = false;
      if (won) {
        this.sound("win");
        for (let i = 0; i < 90; i++) {
          this.particles.push({
            x: rand(0, this.w),
            y: rand(-this.h * 0.2, this.h * 0.35),
            vx: rand(-30, 30),
            vy: rand(40, 130),
            gravity: 22,
            life: rand(2.2, 4.5),
            maxLife: 4.5,
            size: rand(2.5, 5.5) * this.scale,
            color: BTD.pick(["#ffd45e", "#ff8e70", "#8be66f", "#7fcfff", "#ff9ddc"]),
            kind: "confetti",
            rot: rand(0, TAU),
            vr: rand(-8, 8)
          });
        }
      } else {
        this.sound("lose");
        this.shake = 14;
      }
      this.emit("gameover", {
        won,
        round: this.round,
        pops: this.pops,
        score: Math.round(this.score),
        lives: this.lives,
        money: this.money
      });
      this.dirty = true;
    }

    restart() {
      this.money = 1800;
      this.lives = 200;
      this.score = 0;
      this.pops = 0;
      this.round = 0;
      this.roundActive = false;
      this.roundClock = 0;
      this.spawnPlan = [];
      this.roundTotal = 0;
      this.roundSpawned = 0;
      this.autoTimer = 0;
      this.autoStart = false;
      this.endDelay = 0;
      this.gameOver = false;
      this.won = false;
      this.paused = false;
      this.speed = 1;
      this.time = 0;
      this.shake = 0;
      this.hurtFlash = 0;
      this.towers = [];
      this.bloons = [];
      this.projectiles = [];
      this.particles = [];
      this.rings = [];
      this.floaters = [];
      this.tracers = [];
      this.selectedType = null;
      this.selectedTower = null;
      this.hoveredTower = null;
      this.tutorialDismissed = false;
      this.ghostValid = false;
      this.placeStarter();
      this.emit("reset");
      this.dirty = true;
    }

    // -----------------------------------------------------
    // Simulation
    // -----------------------------------------------------
    step(rawDt) {
      if (this.paused || this.gameOver) return;
      this.realTime += rawDt;
      let remaining = Math.min(rawDt, 0.05) * this.speed;
      let iterations = 0;
      while (remaining > 0.0001 && iterations++ < 10) {
        const dt = Math.min(remaining, 1 / 60);
        this.update(dt);
        remaining -= dt;
        if (this.gameOver) break;
      }
    }

    update(dt) {
      this.time += dt;
      this.updateRound(dt);
      if (this.gameOver) return;

      for (const t of [...this.towers]) t.update(dt);
      if (this.selectedTower && !this.towers.includes(this.selectedTower)) this.selectedTower = null;

      for (const p of [...this.projectiles]) {
        p.update(dt);
        if (!p.dead && p.kind !== "bomb") this.collideProjectile(p);
      }

      for (const b of [...this.bloons]) {
        if (!b.dead) b.update(dt);
        if (this.gameOver) break;
      }

      this.bloons = this.bloons.filter((b) => !b.dead);
      this.projectiles = this.projectiles.filter((p) => !p.dead);
      this.updateEffects(dt);
      this.shake = Math.max(0, this.shake - dt * 22);
      this.hurtFlash = Math.max(0, this.hurtFlash - dt * 1.8);
      this.checkRoundEnd();
      this.updateAuto(dt);
    }

    findTarget(tower) {
      const range = tower.range;
      const range2 = range * range;
      const tx = tower.x;
      const ty = tower.y - 20 * this.scale;
      let best = null;
      let bestScore = -Infinity;
      for (const b of this.bloons) {
        if (b.dead) continue;
        const p = b.position();
        const d2 = BTD.dist2(tx, ty, p.x, p.y);
        if (d2 > range2) continue;
        let score;
        switch (TARGET_MODES[tower.mode].key) {
          case "last": score = -b.t; break;
          case "close": score = -d2; break;
          case "strong": score = b.def.rbe * 1000 + b.hp; break;
          default: score = b.t; break;
        }
        if (score > bestScore) {
          bestScore = score;
          best = b;
        }
      }
      return best;
    }

    // Lead a moving bloon so projectiles meet it instead of hitting where it was.
    interceptPoint(ox, oy, target, projectileSpeed) {
      const p = target.position();
      if (!projectileSpeed || projectileSpeed <= 0) return p;
      let time = dist(ox, oy, p.x, p.y) / projectileSpeed;
      let result = p;
      for (let i = 0; i < 4; i++) {
        const travel = clamp(target.t + target.def.speed * BTD.SPEED_SCALE * target.speed * time, 0, 1);
        const base = this.track.pointAt(travel);
        result = {
          x: base.x + base.nx * target.offset,
          y: base.y + base.ny * target.offset
        };
        time = dist(ox, oy, result.x, result.y) / projectileSpeed;
      }
      return result;
    }

    fireTower(tower, target) {
      const stats = tower.stats;
      const scale = this.scale;
      const p = this.interceptPoint(tower.x, tower.y - 27 * scale, target, (stats.speed || 0) * scale);
      const ox = tower.x;
      const oy = tower.y - 27 * scale;
      const aim = Math.atan2(p.y - oy, p.x - ox);
      const kind = tower.type;

      if (kind === "dart") {
        const n = Math.max(1, Math.round(stats.shots));
        for (let i = 0; i < n; i++) {
          const a = aim + (i - (n - 1) / 2) * stats.spread;
          this.projectiles.push(new Projectile(this, {
            kind: "dart", x: ox, y: oy, angle: a,
            speed: stats.speed * scale, damage: stats.dmg, pierce: stats.pierce,
            life: 1.35, size: 2.4 * scale, source: tower, color: "#f9e7c2"
          }));
        }
        this.sound("shoot");
      } else if (kind === "tack") {
        const n = Math.round(stats.shots);
        const base = tower.age * 0.25;
        for (let i = 0; i < n; i++) {
          const a = base + (i / n) * TAU;
          this.projectiles.push(new Projectile(this, {
            kind: "tack", x: tower.x, y: tower.y - 19 * scale, angle: a,
            speed: stats.speed * scale, damage: stats.dmg, pierce: stats.pierce,
            life: 0.37, size: 2.2 * scale, source: tower, color: "#eee8d4"
          }));
        }
        this.sound("shoot");
      } else if (kind === "boomerang") {
        this.projectiles.push(new Projectile(this, {
          kind: "boomerang", x: ox, y: oy, angle: aim,
          speed: stats.speed * scale, damage: stats.dmg, pierce: stats.pierce,
          life: 1.65, size: 4.5 * scale, source: tower, color: "#e2a636",
          returning: true, returnAfter: 0.4, spin: 0
        }));
        this.sound("boomerang");
      } else if (kind === "glue") {
        const n = Math.max(1, Math.round(stats.shots));
        for (let i = 0; i < n; i++) {
          const a = aim + (i - (n - 1) / 2) * (stats.spread || 0.04);
          this.projectiles.push(new Projectile(this, {
            kind: "glue", x: ox, y: oy, angle: a,
            speed: stats.speed * scale, damage: 0, pierce: stats.pierce,
            life: 1.2, size: 3.2 * scale, source: tower, color: "#9ad33b",
            slowFactor: stats.slow, slowDuration: stats.duration
          }));
        }
        this.sound("glue");
      } else if (kind === "bomb") {
        const distance = Math.max(20, dist(ox, oy, p.x, p.y));
        const duration = clamp(distance / (stats.speed * scale), 0.35, 1.2);
        this.projectiles.push(new Projectile(this, {
          kind: "bomb", x: ox, y: oy, sx: ox, sy: oy, tx: p.x, ty: p.y,
          duration, age: 0, life: duration + 0.1, z: 0, arc: 55 * scale,
          splash: stats.splash * scale, damage: stats.dmg, source: tower,
          size: 5 * scale, color: "#25232a",
          cluster: tower.specials.has("cluster")
        }));
        this.sound("bomb");
      } else if (kind === "ice") {
        this.icePulse(tower);
      } else if (kind === "sniper") {
        let dmg = stats.dmg;
        const p2 = target.position();
        if (tower.specials.has("cripple") && target.def.big) {
          dmg += 8;
          target.applyGlue(0.55, 2.5);
        }
        this.tracers.push({
          x1: ox, y1: oy, x2: p2.x, y2: p2.y,
          life: 0.14, maxLife: 0.14, color: "#ffe8a3", width: 1.7 * scale
        });
        target.damage(dmg, { kind: "bullet", tower });
        this.addParticles(p2.x, p2.y, "#ffe8a3", 5, 80 * scale, 0.35, "spark");
        this.addParticles(ox, oy, "#ffd08a", 3, 45 * scale, 0.22, "spark");
        this.sound("sniper");
      } else if (kind === "ninja") {
        const n = Math.max(1, Math.round(stats.shots));
        for (let i = 0; i < n; i++) {
          const a = aim + (i - (n - 1) / 2) * (stats.spread || 0.03);
          this.projectiles.push(new Projectile(this, {
            kind: "shuriken", x: ox, y: oy, angle: a,
            speed: stats.speed * scale, damage: stats.dmg, pierce: stats.pierce,
            life: 1.0, size: 4 * scale, source: tower, color: "#d9e0e6", spin: 0
          }));
        }
        this.sound("shoot");
      } else if (kind === "super") {
        const sun = tower.specials.has("sunGod");
        this.projectiles.push(new Projectile(this, {
          kind: sun ? "sun" : "super", x: ox, y: oy, angle: aim,
          speed: stats.speed * scale, damage: stats.dmg, pierce: 1,
          life: 0.75, size: (sun ? 6 : 3.4) * scale, source: tower,
          color: sun ? "#ffd45e" : "#ffe8f0",
          splash: sun ? stats.splash * scale : 0,
          isBig: sun
        }));
        this.sound("shoot");
      }
    }

    icePulse(tower) {
      const stats = tower.stats;
      const scale = this.scale;
      let range = stats.range * scale;
      if (tower.specials.has("absoluteZero")) range *= 1.16;
      this.addRing(tower.x, tower.y, 9 * scale, range, "#c5f9ff", 0.55, true);
      this.addRing(tower.x, tower.y, 4 * scale, range * 0.82, "#e8ffff", 0.42, false);
      const snap = [...this.bloons];
      for (const b of snap) {
        if (b.dead) continue;
        const p = b.position();
        if (dist(tower.x, tower.y, p.x, p.y) <= range + b.radius) {
          b.damage(stats.dmg || 0, { kind: "ice", tower });
          if (!b.dead) {
            b.freeze(stats.freeze);
            if (stats.slowAfter) b.applyGlue(0.52, stats.freeze + stats.slowAfter);
            this.addParticles(p.x, p.y, "#c9f9ff", 4, 55 * scale, 0.45, "ice");
          }
        }
      }
      this.addParticles(tower.x, tower.y - 24 * scale, "#d7ffff", 18, 100 * scale, 0.7, "ice");
      this.sound("freeze");
    }

    ringOfFire(tower) {
      const range = tower.range * 1.04;
      this.addRing(tower.x, tower.y, 8 * this.scale, range, "#ffb13b", 0.38, true);
      this.addParticles(tower.x, tower.y - 14 * this.scale, "#ff9e2f", 8, 100 * this.scale, 0.45, "fire");
      const snap = [...this.bloons];
      for (const b of snap) {
        if (b.dead) continue;
        const p = b.position();
        if (dist(tower.x, tower.y, p.x, p.y) <= range + b.radius) {
          b.damage(tower.stats.dmg || 1, { kind: "fire", tower });
        }
      }
      if (Math.random() < 0.45) this.sound("bomb");
    }

    collideProjectile(p) {
      const snap = this.bloons;
      for (const b of snap) {
        if (b.dead || p.dead) continue;
        if (p.hitSet.has(b.id)) continue;
        const bp = b.position();
        const rr = b.radius + (p.size || 3);
        if (BTD.dist2(p.x, p.y, bp.x, bp.y) > rr * rr) continue;

        p.hitSet.add(b.id);
        if (p.kind === "sun" && p.splash) {
          p.dead = true;
          this.explode(p.x, p.y, p.splash, p.damage, p.source, { sun: true });
          return;
        }
        if (p.kind === "glue") {
          b.applyGlue(p.slowFactor, p.slowDuration);
          this.addParticles(bp.x, bp.y, "#9ad33b", 4, 45 * this.scale, 0.42, "goo");
        } else {
          b.damage(p.damage, { kind: p.kind === "super" ? "energy" : "projectile", tower: p.source });
        }
        this.addParticles(bp.x, bp.y, p.color || "#fff", 3, 55 * this.scale, 0.28, "spark");
        p.pierce--;
        if (p.pierce <= 0) {
          p.dead = true;
          return;
        }
      }
    }

    explode(x, y, radius, damage, tower, opts = {}) {
      this.addRing(x, y, 7 * this.scale, radius * (opts.sun ? 1.5 : 1.25), opts.sun ? "#ffe37a" : "#ffb04a", 0.5, true);
      this.addParticles(x, y, opts.sun ? "#ffe37a" : "#ff9c3b", opts.sun ? 20 : 13, 120 * this.scale, 0.65, opts.sun ? "fire" : "smoke");
      this.addParticles(x, y, "#40342c", 6, 60 * this.scale, 0.85, "smoke");
      this.shake = Math.max(this.shake, opts.sun ? 4 : 3);
      this.sound("bomb");
      const snap = [...this.bloons];
      for (const b of snap) {
        if (b.dead) continue;
        const p = b.position();
        if (dist(x, y, p.x, p.y) <= radius + b.radius) {
          b.damage(damage, { kind: "explosion", tower });
        }
      }
      if (opts.cluster && !opts.noCluster) {
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * TAU + 0.4;
          const cx = x + Math.cos(a) * radius * 0.72;
          const cy = y + Math.sin(a) * radius * 0.55;
          this.explode(cx, cy, radius * 0.48, Math.max(1, Math.floor(damage * 0.55)), tower, { noCluster: true, sun: false });
        }
      }
    }

    onBloonPopped(b) {
      const p = b.position();
      const def = b.def;
      this.pops++;
      this.score += def.score;
      this.money += def.cash;
      const scale = this.scale;
      this.addParticles(p.x, p.y, def.light, b.big ? 28 : 6, (b.big ? 160 : 75) * scale, b.big ? 1.1 : 0.48, "dot");
      this.addParticles(p.x, p.y, def.color, b.big ? 16 : 3, (b.big ? 130 : 55) * scale, 0.38, "spark");
      if (b.big) {
        this.addRing(p.x, p.y, 8, b.radius * 3.2, def.light, 0.65, true);
        this.addFloater(p.x, p.y - b.radius, `${def.label} POPPED!`, "#ffe27d", 1.4, 16);
        this.shake = Math.max(this.shake, 9);
        this.sound("bigPop");
        this.emit("bossPop", { type: b.type });
      } else {
        this.sound("pop", BLOONS[b.type].rbe);
        if (def.cash >= 4) this.addFloater(p.x, p.y - 8, `+$${def.cash}`, "#ffe27d", 0.75, 10);
      }
      this.dirty = true;
    }

    onLeak(b, p) {
      const leak = b.def.leak;
      this.lives = Math.max(0, this.lives - leak);
      this.hurtFlash = Math.min(1, this.hurtFlash + 0.7);
      this.shake = Math.max(this.shake, 7);
      this.addFloater(p.x, p.y - 12, `-${leak}`, "#ff7d6f", 1.1, 15);
      this.addRing(p.x, p.y, 8, 60 * this.scale, "#ff5b4d", 0.55, true);
      this.sound("life");
      this.emit("leak", { amount: leak, lives: this.lives });
      this.dirty = true;
      if (this.lives <= 0) this.endGame(false);
    }

    // -----------------------------------------------------
    // Effects
    // -----------------------------------------------------
    addParticles(x, y, color, count = 6, speed = 60, life = 0.55, kind = "dot") {
      for (let i = 0; i < count; i++) {
        const a = rand(0, TAU);
        const v = speed * rand(0.25, 1);
        const l = life * rand(0.65, 1.25);
        this.particles.push({
          x, y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v - (kind === "smoke" ? rand(8, 25) : 0),
          gravity: kind === "confetti" ? 25 : kind === "smoke" ? -8 : 120,
          life: l,
          maxLife: l,
          size: rand(1.4, 3.7) * this.scale * (kind === "smoke" ? 2.1 : kind === "star" ? 1.7 : 1),
          color,
          kind,
          rot: rand(0, TAU),
          vr: rand(-8, 8)
        });
      }
      if (this.particles.length > 600) this.particles.splice(0, this.particles.length - 600);
    }

    addRing(x, y, r, maxR, color, life = 0.5, fill = false) {
      this.rings.push({ x, y, r, maxR, color, life, maxLife: life, fill });
      if (this.rings.length > 60) this.rings.shift();
    }

    addFloater(x, y, text, color = "#fff", life = 0.9, size = 11) {
      this.floaters.push({ x, y, text, color, life, maxLife: life, size });
      if (this.floaters.length > 70) this.floaters.shift();
    }

    updateEffects(dt) {
      for (const p of this.particles) {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += p.gravity * dt;
        p.vx *= kindDrag(p.kind, dt);
        p.rot += p.vr * dt;
        if (p.kind === "smoke") p.size += dt * 14 * this.scale;
      }
      this.particles = this.particles.filter((p) => p.life > 0);
      for (const r of this.rings) r.life -= dt;
      this.rings = this.rings.filter((r) => r.life > 0);
      for (const f of this.floaters) {
        f.life -= dt;
        f.y -= dt * 24 * this.scale;
      }
      this.floaters = this.floaters.filter((f) => f.life > 0);
      for (const t of this.tracers) t.life -= dt;
      this.tracers = this.tracers.filter((t) => t.life > 0);
    }

    sound(name, pitch) {
      Sound.play(name, pitch);
    }

    emit(name, data) {
      const fn = this.hooks[name];
      if (fn) fn(data);
    }
  }

  function kindDrag(kind, dt) {
    if (kind === "spark" || kind === "ice") return Math.max(0, 1 - dt * 1.8);
    if (kind === "smoke") return Math.max(0, 1 - dt * 1.1);
    if (kind === "confetti") return Math.max(0, 1 - dt * 0.25);
    return Math.max(0, 1 - dt * 0.6);
  }

  BTD.Game = Game;
  BTD.describeRound = function (round) {
    const groups = ROUNDS[round - 1];
    if (!groups) return "";
    const totals = new Map();
    for (const g of groups) totals.set(g.type, (totals.get(g.type) || 0) + g.count);
    return [...totals.entries()].map(([type, n]) => `${n} ${BLOONS[type].label.toLowerCase()}${n === 1 ? "" : "s"}`).join(", ");
  };
})();
