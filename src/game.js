// Game simulation: waves, towers, bloons, projectiles, economy.

import {
  W, H, BLOONS, TOWER_BY_ID, towerStats, buildWave, roundBonus,
  START_CASH, START_LIVES, MAX_ROUND, TARGET_MODES,
} from "./config.js";

let nextEntityId = 1;

export class Game {
  constructor(track, blockers) {
    this.track = track;
    this.blockers = blockers;
    this.onEvent = () => {};
    this.pointer = null;
    this.placing = null;
    this.placementValid = false;
    this.reset();
  }

  reset() {
    this.cash = START_CASH;
    this.lives = START_LIVES;
    this.round = 1;
    this.bestRound = Number(localStorage.getItem("bloonPatrolBest") || 0);
    this.balloons = [];
    this.towers = [];
    this.projectiles = [];
    this.particles = [];
    this.effects = [];
    this.texts = [];
    this.selected = null;
    this.placing = null;
    this.pointer = null;
    this.placementValid = false;
    this.roundActive = false;
    this.spawnQueue = [];
    this.spawnIndex = 0;
    this.spawnClock = 0;
    this.totalInWave = 0;
    this.aliveSpawned = 0;
    this.autoStart = false;
    this.autoTimer = 0;
    this.started = false;
    this.paused = false;
    this.over = false;
    this.victory = false;
    this.speed = 1;
    this.time = 0;
    this.shake = 0;
    this.damageFlash = 0;
    this.popped = 0;
    this.cashEarned = 0;
    this.leaked = 0;
    this.roundsCleared = 0;
    this.pendingRoundClear = false;
  }

  emit(name, data = {}) {
    this.onEvent(name, data);
  }

  startGame() {
    if (this.started) return;
    this.started = true;
    this.paused = false;
    this.emit("start");
  }

  // ------------------------------------------------------------- placement

  placementInfo(typeId, x, y) {
    const def = TOWER_BY_ID[typeId];
    if (!def) return { valid: false, reason: "Unknown tower" };
    if (x < 28 || x > W - 28 || y < 30 || y > H - 20) return { valid: false, reason: "Off the field" };
    if (this.track.distanceTo(x, y) < 48) return { valid: false, reason: "Can't build on the track" };
    for (const t of this.towers) {
      if (Math.hypot(t.x - x, t.y - y) < 44) return { valid: false, reason: "Too close to another tower" };
    }
    for (const d of this.blockers) {
      if (Math.hypot(d.x - x, d.y - y) < d.r + 15) return { valid: false, reason: "Blocked by scenery" };
    }
    if (this.cash < def.cost) return { valid: false, reason: "Not enough cash" };
    return { valid: true, reason: "" };
  }

  setPointer(pos) {
    this.pointer = pos;
    if (pos && this.placing) {
      const info = this.placementInfo(this.placing, pos.x, pos.y);
      this.placementValid = info.valid;
    }
  }

  armTower(typeId) {
    if (this.selected) this.selected = null;
    this.placing = this.placing === typeId ? null : typeId;
    if (this.placing) {
      const def = TOWER_BY_ID[typeId];
      if (this.cash < def.cost) {
        this.placing = null;
        this.emit("error", { message: "Not enough cash for " + def.name });
        return;
      }
      this.emit("arm", { typeId });
    }
  }

  disarmTower() {
    this.placing = null;
    this.placementValid = false;
  }

  tryPlaceAt(x, y) {
    if (!this.placing) return false;
    const typeId = this.placing;
    const def = TOWER_BY_ID[typeId];
    const info = this.placementInfo(typeId, x, y);
    if (!info.valid) {
      this.emit("error", { message: info.reason });
      this.emit("bad");
      return false;
    }
    this.cash -= def.cost;
    const stats = towerStats(def, 0);
    const tower = {
      id: nextEntityId++,
      def,
      x, y,
      level: 0,
      stats,
      angle: -Math.PI / 2,
      cooldown: 0.3,
      flash: 0,
      targetMode: "first",
      spent: def.cost,
      kills: 0,
      damageDealt: 0,
      shots: 0,
    };
    this.towers.push(tower);
    this.selected = tower;
    this.placing = null;
    this.placementValid = false;
    this.emit("place", { tower });
    return true;
  }

  selectAt(x, y) {
    for (let i = this.towers.length - 1; i >= 0; i--) {
      const t = this.towers[i];
      if (Math.hypot(t.x - x, t.y - y) < 34) {
        this.selected = t;
        this.placing = null;
        this.emit("select", { tower: t });
        return true;
      }
    }
    if (this.selected) {
      this.selected = null;
      this.emit("deselect");
    }
    return false;
  }

  selectTower(tower) {
    this.selected = tower;
    this.placing = null;
    this.emit("select", { tower });
  }

  cycleTarget() {
    const t = this.selected;
    if (!t) return;
    const i = TARGET_MODES.indexOf(t.targetMode);
    t.targetMode = TARGET_MODES[(i + 1) % TARGET_MODES.length];
    this.emit("target", { tower: t });
  }

  upgradeSelected() {
    const t = this.selected;
    if (!t) return false;
    const def = t.def;
    if (t.level >= def.upgrades.length) return false;
    const up = def.upgrades[t.level];
    if (this.cash < up.cost) {
      this.emit("error", { message: "Need $" + up.cost + " for " + up.name });
      this.emit("bad");
      return false;
    }
    this.cash -= up.cost;
    t.spent += up.cost;
    t.level++;
    t.stats = towerStats(def, t.level);
    this.emit("upgrade", { tower: t, upgrade: up });
    return true;
  }

  sellSelected() {
    const t = this.selected;
    if (!t) return false;
    const refund = Math.floor(t.spent * 0.8);
    this.cash += refund;
    this.towers = this.towers.filter((x) => x !== t);
    this.selected = null;
    this.emit("sell", { refund, tower: t });
    return true;
  }

  // ------------------------------------------------------------- waves

  startRound() {
    if (!this.started || this.over || this.victory) return false;
    if (this.roundActive || this.round > MAX_ROUND) return false;
    this.spawnQueue = buildWave(this.round);
    this.spawnIndex = 0;
    this.spawnClock = 0;
    this.totalInWave = this.spawnQueue.length;
    this.roundActive = true;
    this.autoTimer = 0;
    this.emit("waveStart", { round: this.round, count: this.totalInWave });
    return true;
  }

  finishRound() {
    this.roundActive = false;
    this.roundsCleared++;
    if (this.round > this.bestRound) {
      this.bestRound = this.round;
      try { localStorage.setItem("bloonPatrolBest", String(this.bestRound)); } catch {}
    }
    const bonus = roundBonus(this.round);
    this.cash += bonus;
    this.cashEarned += bonus;
    this.emit("roundClear", { round: this.round, bonus });
    this.round++;
    if (this.round > MAX_ROUND) {
      this.victory = true;
      this.emit("victory");

      return;
    }
    if (this.autoStart) this.autoTimer = 4.5;
  }

  gameOver() {
    this.over = true;
    this.roundActive = false;
    this.placing = null;
    this.selected = null;
    if (this.round > this.bestRound) {
      this.bestRound = this.round;
      try { localStorage.setItem("bloonPatrolBest", String(this.bestRound)); } catch {}
    }
    this.emit("gameover");
  }

  // ------------------------------------------------------------- update

  update(rawDt) {
    if (!this.started || this.paused || this.over || this.victory) {
      this.updateVisuals(rawDt);
      return;
    }
    const dt = Math.min(0.12, rawDt);
    this.time += dt;

    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);
    if (this.damageFlash > 0) this.damageFlash = Math.max(0, this.damageFlash - dt * 2.2);

    if (this.roundActive) {
      this.spawnClock += dt;
      while (this.spawnIndex < this.spawnQueue.length && this.spawnQueue[this.spawnIndex].time <= this.spawnClock) {
        this.spawnBloon(this.spawnQueue[this.spawnIndex].type);
        this.spawnIndex++;
      }
    } else if (this.autoStart && this.autoTimer > 0) {
      this.autoTimer -= dt;
      if (this.autoTimer <= 0) this.startRound();
    }

    this.updateBalloons(dt);
    this.updateTowers(dt);
    this.updateProjectiles(dt);
    this.updateVisuals(dt);

    if (this.roundActive && this.spawnIndex >= this.spawnQueue.length && this.balloons.length === 0) {
      this.finishRound();
    }
  }

  updateVisuals(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= 0.985;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.life -= dt;
      if (e.life <= 0) this.effects.splice(i, 1);
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
  }

  spawnBloon(type, distance = 0, sideOffset = 0) {
    const def = BLOONS[type];
    const d = Math.max(0, Math.min(this.track.length - 1, distance));
    const p = this.track.pointAt(d);
    const n = this.track.normalAt(d);
    const hpScale = type === "moab" ? 1 + Math.max(0, this.round - 25) * 0.075 : 1;
    const hp = Math.max(1, Math.round(def.hp * hpScale));
    const b = {
      id: nextEntityId++,
      type,
      def,
      hp,
      maxHp: hp,
      distance: d,
      radius: def.radius,
      phase: Math.random() * Math.PI * 2,
      slowFactor: 1,
      slowTimer: 0,
      hitFlash: 0,
      x: p.x + n.x * sideOffset,
      y: p.y + n.y * sideOffset,
      sideOffset,
      heading: 0,
      dead: false,
    };
    const tan = this.track.tangentAt(d);
    b.heading = Math.atan2(tan.y, tan.x);
    this.balloons.push(b);
    if (type === "moab") this.emit("moab");
    return b;
  }

  updateBalloons(dt) {
    const len = this.track.length;
    for (let i = this.balloons.length - 1; i >= 0; i--) {
      const b = this.balloons[i];
      if (b.dead) { this.balloons.splice(i, 1); continue; }
      if (b.hitFlash > 0) b.hitFlash = Math.max(0, b.hitFlash - dt * 4);
      if (b.slowTimer > 0) {
        b.slowTimer -= dt;
        if (b.slowTimer <= 0) { b.slowTimer = 0; b.slowFactor = 1; }
      }
      const speed = b.def.speed * (b.slowFactor || 1);
      b.distance += speed * dt;
      if (b.distance >= len) {
        this.balloons.splice(i, 1);
        this.lives -= b.def.leak;
        this.leaked++;
        this.damageFlash = 1;
        this.shake = Math.min(12, 5 + b.def.leak);
        this.addText(`-${b.def.leak}`, b.x, b.y - 20, "#ff8b92", true);
        this.emit("leak", { balloon: b });
        if (this.lives <= 0) {
          this.lives = 0;
          this.gameOver();
          return;
        }
        continue;
      }
      const p = this.track.pointAt(b.distance);
      const n = this.track.normalAt(b.distance);
      b.x = p.x + n.x * (b.sideOffset || 0);
      b.y = p.y + n.y * (b.sideOffset || 0);
      const tan = this.track.tangentAt(b.distance);
      b.heading = Math.atan2(tan.y, tan.x);
      // Children wobble back toward the center line.
      if (b.sideOffset) b.sideOffset *= 1 - Math.min(1, dt * 0.7);
    }
  }

  updateTowers(dt) {
    for (const t of this.towers) {
      if (t.flash > 0) t.flash = Math.max(0, t.flash - dt);
      t.cooldown = Math.max(0, t.cooldown - dt);
      const target = this.findTarget(t);
      if (target) {
        const want = Math.atan2(target.y - t.y, target.x - t.x);
        let diff = want - t.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        t.angle += diff * Math.min(1, dt * 14);
        if (t.cooldown <= 0) this.fire(t, target);
      }
    }
  }

  findTarget(t) {
    let best = null;
    let bestScore = -Infinity;
    const range = t.stats.range;
    for (const b of this.balloons) {
      if (b.dead) continue;
      if (!t.stats.global) {
        const reach = range + b.radius;
        if ((b.x - t.x) ** 2 + (b.y - t.y) ** 2 > reach * reach) continue;
      }
      let score;
      switch (t.targetMode) {
        case "last": score = -b.distance; break;
        case "close": score = -Math.hypot(b.x - t.x, b.y - t.y); break;
        case "strong": score = b.hp * 100000 + b.distance; break;
        default: score = b.distance; break;
      }
      if (score > bestScore) { bestScore = score; best = b; }
    }
    return best;
  }

  fire(t, target) {
    const s = t.stats;
    const def = t.def;
    t.flash = 0.1;
    t.cooldown = s.cooldown;
    t.shots++;

    if (s.pulse) {
      this.effects.push({ kind: "ring", x: t.x, y: t.y, r0: 12, r1: s.range, life: 0.5, maxLife: 0.5, color: "#a8ecff", width: 9, fill: true });
      let hit = false;
      const targets = this.balloons.slice();
      for (const b of targets) {
        if (b.dead) continue;
        if (Math.hypot(b.x - t.x, b.y - t.y) > s.range + b.radius) continue;
        hit = true;
        b.slowFactor = Math.min(b.slowFactor || 1, 1 - s.slow);
        b.slowTimer = Math.max(b.slowTimer, s.slowDur);
        this.damageBalloon(b, s.damage, t);
      }
      if (hit) this.emit("ice");
      return;
    }

    if (s.hitscan) {
      let victims = [target];
      if (s.pierce > 1) {
        victims = this.balloons
          .filter((b) => !b.dead && b !== target)
          .sort((a, b) => Math.abs(a.distance - target.distance) - Math.abs(b.distance - target.distance))
          .slice(0, Math.max(0, s.pierce - 1))
          .concat([target]);
      }
      for (const b of victims) {
        this.effects.push({ kind: "tracer", x1: t.x, y1: t.y - 8, x2: b.x, y2: b.y, life: 0.18, maxLife: 0.18 });
        this.damageBalloon(b, s.damage, t);
        this.burst(b.x, b.y, b.def.color, 4, 8);
      }
      this.emit("sniper");
      return;
    }

    if (s.radial) {
      const count = s.count;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + this.time * 0.3;
        this.projectiles.push({
          kind: "tack",
          x: t.x, y: t.y,
          vx: Math.cos(a) * s.speed,
          vy: Math.sin(a) * s.speed,
          speed: s.speed,
          damage: s.damage,
          pierce: s.pierce,
          life: s.life ?? 0.25,
          maxLife: s.life ?? 0.25,
          r: 4,
          spin: Math.random() * 6,
          owner: t,
          hits: new Set(),
        });
      }
      this.emit("shoot", { kind: "tack" });
      return;
    }

    // Predicted aim point.
    let aim = { x: target.x, y: target.y };
    if (s.bomb) {
      const dist = Math.hypot(target.x - t.x, target.y - t.y);
      const travel = dist / s.speed;
      const pred = this.track.pointAt(Math.min(this.track.length, target.distance + target.def.speed * (target.slowFactor || 1) * travel));
      aim = pred;
      const duration = Math.max(0.25, dist / s.speed);
      for (let i = 0; i < s.count; i++) {
        const spread = (i - (s.count - 1) / 2) * 26;
        const p = this.track.pointAt(Math.max(0, Math.min(this.track.length, target.distance + target.def.speed * (target.slowFactor || 1) * travel + spread)));
        this.projectiles.push({
          kind: "bomb",
          sx: t.x, sy: t.y - 6,
          x: t.x, y: t.y - 6,
          tx: p.x + (Math.random() - 0.5) * 10,
          ty: p.y + (Math.random() - 0.5) * 10,
          t: 0,
          duration: Math.max(0.2, duration + (Math.random() - 0.5) * 0.08),
          arcHeight: Math.max(30, Math.min(105, dist * 0.3)),
          damage: s.damage,
          splash: s.splash,
          spin: Math.random() * 6,
          owner: t,
        });
      }
      this.emit("shoot", { kind: "bomb" });
      return;
    }

    // Dart-like / magic / laser / boomerang.
    const travel = Math.hypot(aim.x - t.x, aim.y - t.y) / Math.max(1, s.speed);
    const future = this.track.pointAt(Math.min(this.track.length, target.distance + target.def.speed * (target.slowFactor || 1) * travel));
    let baseAngle = Math.atan2(future.y - t.y, future.x - t.x);
    if (s.boomerang) baseAngle = Math.atan2(target.y - t.y, target.x - t.x);

    const count = s.count || 1;
    for (let i = 0; i < count; i++) {
      const spread = count > 1 ? (i - (count - 1) / 2) * (s.radial ? 0 : 0.11) : 0;
      const a = baseAngle + spread;
      const kind = s.boomerang ? "boomerang" : s.laser ? "laser" : s.magic ? "magic" : "dart";
      this.projectiles.push({
        kind,
        x: t.x + Math.cos(a) * 14,
        y: t.y + Math.sin(a) * 14 - 4,
        vx: Math.cos(a) * s.speed,
        vy: Math.sin(a) * s.speed,
        speed: s.speed,
        damage: s.damage,
        pierce: s.pierce,
        splash: s.splash || 0,
        life: s.boomerang ? 3.5 : 2.2,
        maxLife: 3.5,
        r: 5,
        spin: 0,
        owner: t,
        hits: new Set(),
        boomerang: !!s.boomerang,
        returning: false,
        outTime: 0,
        turnTime: s.boomerang ? 0.42 : 0,
        hitCooldowns: s.boomerang ? new Map() : null,
      });
    }
    this.emit("shoot", { kind: s.boomerang ? "boomerang" : s.laser ? "laser" : s.magic ? "magic" : "dart" });
  }

  updateProjectiles(dt) {
    const targets = this.balloons.slice();
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.kind === "bomb") {
        p.t += dt / p.duration;
        const f = Math.min(1, p.t);
        p.x = p.sx + (p.tx - p.sx) * f;
        p.y = p.sy + (p.ty - p.sy) * f;
        p.spin += dt * 9;
        if (p.t >= 1) {
          this.explode(p);
          this.projectiles.splice(i, 1);
        }
        continue;
      }

      p.life -= dt;

      if (p.boomerang) {
        p.outTime += dt;
        if (!p.returning) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (p.outTime >= p.turnTime) p.returning = true;
        } else {
          const dx = p.owner.x - p.x;
          const dy = p.owner.y - p.y;
          const d = Math.hypot(dx, dy);
          if (d < 16) {
            this.projectiles.splice(i, 1);
            continue;
          }
          p.x += (dx / d) * p.speed * 1.25 * dt;
          p.y += (dy / d) * p.speed * 1.25 * dt;
        }
        p.spin = (p.spin || 0) + dt * 18;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.spin = (p.spin || 0) + dt * 8;
      }

      if (p.life <= 0 || p.x < -40 || p.x > W + 40 || p.y < -40 || p.y > H + 40) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Collisions.
      let consumed = false;
      for (const b of targets) {
        if (b.dead) continue;
        if (p.boomerang) {
          const last = p.hitCooldowns.get(b.id) ?? -1;
          if (this.time - last < 0.28) continue;
        } else if (p.hits.has(b.id)) continue;
        const reach = (b.def.big ? b.radius * 1.35 : b.radius) + p.r;
        if ((b.x - p.x) ** 2 + (b.y - p.y) ** 2 > reach * reach) continue;

        if (p.splash) {
          this.explodeAt(b.x, b.y, p.splash, p.damage, p.owner, "magic");
          this.projectiles.splice(i, 1);
          consumed = true;
          break;
        }

        this.damageBalloon(b, p.damage, p.owner);
        this.burst(b.x, b.y, b.def.color, 3, 6);
        if (p.boomerang) {
          p.hitCooldowns.set(b.id, this.time);
        } else {
          p.hits.add(b.id);
          p.pierce--;
          if (p.pierce <= 0) {
            this.projectiles.splice(i, 1);
            consumed = true;
            break;
          }
        }
      }
      if (consumed) continue;
    }
  }

  explode(p) {
    this.explodeAt(p.x, p.y, p.splash, p.damage, p.owner, "bomb");
  }

  explodeAt(x, y, radius, damage, owner, flavor = "bomb") {
    this.effects.push({ kind: "explosion", x, y, r: radius * 1.15, life: 0.34, maxLife: 0.34 });
    this.effects.push({ kind: "ring", x, y, r0: radius * 0.2, r1: radius, life: 0.3, maxLife: 0.3, color: flavor === "magic" ? "#d8a6ff" : "#ffb463", width: 4 });
    const targets = this.balloons.slice();
    for (const b of targets) {
      if (b.dead) continue;
      if (Math.hypot(b.x - x, b.y - y) > radius + b.radius) continue;
      this.damageBalloon(b, damage, owner);
    }
    this.burst(x, y, flavor === "magic" ? "#d9a6ff" : "#ffb45c", 10, 20);
    this.shake = Math.max(this.shake, 3);
    this.emit(flavor === "magic" ? "magicBoom" : "boom");
  }

  damageBalloon(b, dmg, owner) {
    if (b.dead || b.hp <= 0) return;
    b.hp -= dmg;
    b.hitFlash = 0.16;
    if (owner) owner.damageDealt += dmg;
    if (b.hp > 0) {
      this.burst(b.x, b.y, b.def.accent, 2, 4);
      return;
    }
    b.dead = true;
    if (owner) owner.kills++;
    this.popped++;
    const bounty = b.def.bounty;
    this.cash += bounty;
    this.cashEarned += bounty;
    const idx = this.balloons.indexOf(b);
    if (idx >= 0) this.balloons.splice(idx, 1);

    this.burst(b.x, b.y, b.def.color, b.def.big ? 34 : 8, b.def.big ? 42 : 12);
    if (b.def.big) {
      this.shake = 9;
      this.effects.push({ kind: "explosion", x: b.x, y: b.y, r: 90, life: 0.5, maxLife: 0.5 });
      this.emit("moabPop");
    }
    if (bounty >= 16 || Math.random() < 0.09) {
      this.addText(`+$${bounty}`, b.x, b.y - b.radius - 4, "#ffd866");
    }
    this.emit("pop", { type: b.type, big: b.def.big });

    if (b.def.children.length) {
      const kids = b.def.children;
      const spread = b.def.big ? 30 : 9;
      for (let i = 0; i < kids.length; i++) {
        const off = kids.length === 1 ? 0 : (i - (kids.length - 1) / 2) * spread;
        const child = this.spawnBloon(kids[i], b.distance + (i - (kids.length - 1) / 2) * 4, off + (Math.random() - 0.5) * 5);
        child.phase = Math.random() * Math.PI * 2;
      }
    }
  }

  // ------------------------------------------------------------- fx helpers

  burst(x, y, color, count = 8, speed = 12) {
    if (this.particles.length > 650) return;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.35 + Math.random() * 0.9);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp * 6,
        vy: Math.sin(a) * sp * 6 - 20,
        gravity: 380,
        life: 0.35 + Math.random() * 0.4,
        maxLife: 0.75,
        size: 1.8 + Math.random() * 3.2,
        color,
        shape: Math.random() < 0.2 ? "spark" : "dot",
      });
    }
  }

  addText(text, x, y, color = "#ffe9af", big = false) {
    if (this.texts.length > 45) this.texts.shift();
    this.texts.push({ text, x, y, color, big, life: 1.0, maxLife: 1.0 });
  }

  // ------------------------------------------------------------- UI helpers

  towerPreviewStats(t) {
    const s = t.stats;
    return {
      damage: s.damage,
      range: s.range > 3000 ? "∞" : Math.round(s.range),
      rate: s.cooldown > 0 ? `${(1 / s.cooldown).toFixed(1)}/s` : "—",
      pierce: s.pierce >= 90 ? "AoE" : s.pierce,
      count: s.count || 1,
    };
  }

  waveProgress() {
    if (!this.roundActive) return 0;
    const spawned = this.spawnIndex;
    const total = Math.max(1, this.totalInWave);
    return Math.min(1, spawned / total);
  }
}
