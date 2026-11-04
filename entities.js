/* =========================================================
   BLOONS TD 5 — SUNSET GROVE
   Towers, bloons, and projectiles.
   ========================================================= */
(() => {
  "use strict";
  const BTD = (window.BTD = window.BTD || {});
  const { TOWERS, BLOONS, TAU, clamp, dist } = BTD;

  let nextId = 1;
  const TARGET_MODES = [
    { key: "first", label: "First", hint: "Targets the bloon furthest along the track." },
    { key: "last", label: "Last", hint: "Targets the bloon furthest behind." },
    { key: "close", label: "Close", hint: "Targets the bloon nearest this tower." },
    { key: "strong", label: "Strong", hint: "Targets the toughest bloon in range." }
  ];

  // -------------------------------------------------------
  // Tower
  // -------------------------------------------------------
  class Tower {
    constructor(game, type, nx, ny, opts = {}) {
      this.game = game;
      this.id = nextId++;
      this.type = type;
      this.def = TOWERS[type];
      this.nx = nx;
      this.ny = ny;
      this.level = 0;
      this.mode = 0;
      this.cooldown = 0.2 + Math.random() * 0.25;
      this.aim = -Math.PI / 2;
      this.seed = Math.random() * TAU;
      this.recoil = 0;
      this.flash = 0;
      this.age = 0;
      this.placeAnim = 0;
      this.isScout = !!opts.scout;
      this.spent = opts.scout ? 0 : this.def.cost;
      this.specials = new Set();
      this.stats = this.computeStats();
    }

    get x() { return this.nx * this.game.w; }
    get y() { return this.ny * this.game.h; }
    get scale() { return this.game.scale; }
    get range() { return this.stats.range * this.scale; }
    get sellValue() { return this.isScout ? Math.floor(this.spent * 0.7) : Math.floor(this.spent * 0.7); }
    get upgrade() { return this.def.upgrades[this.level] || null; }
    get maxed() { return this.level >= this.def.upgrades.length; }

    computeStats() {
      const s = { ...this.def.base };
      const specials = new Set();
      for (let i = 0; i < this.level; i++) {
        const up = this.def.upgrades[i];
        if (!up) continue;
        if (up.special) specials.add(up.special);
        for (const [key, value] of Object.entries(up.mods || {})) {
          if (key.endsWith("Mul")) {
            const baseKey = key.slice(0, -3);
            s[baseKey] = (s[baseKey] || 0) * value;
          } else {
            s[key] = (s[key] || 0) + value;
          }
        }
      }
      this.specials = specials;
      return s;
    }

    recompute() {
      this.stats = this.computeStats();
    }

    upgradeTower() {
      if (this.maxed) return false;
      const up = this.upgrade;
      if (this.game.money < up.cost) return false;
      this.game.money -= up.cost;
      this.spent += up.cost;
      this.level++;
      this.recompute();
      this.placeAnim = 0.5;
      this.game.sound("upgrade");
      this.game.addRing(this.x, this.y, 10 * this.scale, 56 * this.scale, "#ffd45e", 0.55, true);
      this.game.addParticles(this.x, this.y - 25 * this.scale, "#ffd45e", 14, 80 * this.scale, 0.7, "star");
      this.game.addFloater(this.x, this.y - 50 * this.scale, "UPGRADED!", "#ffe27d", 1.1, 13);
      this.game.dirty = true;
      return true;
    }

    cycleMode() {
      this.mode = (this.mode + 1) % TARGET_MODES.length;
      this.game.sound("click");
      this.game.dirty = true;
      return TARGET_MODES[this.mode];
    }

    modeInfo() { return TARGET_MODES[this.mode]; }

    sell() {
      const value = this.sellValue;
      this.game.money += value;
      this.game.towers = this.game.towers.filter((t) => t !== this);
      this.game.addParticles(this.x, this.y - 15 * this.scale, "#ffe08a", 14, 70 * this.scale, 0.7, "star");
      this.game.addFloater(this.x, this.y - 38 * this.scale, `+$${value}`, "#ffe27d", 0.9, 12);
      this.game.sound("sell");
      this.game.dirty = true;
      return value;
    }

    update(dt) {
      this.age += dt;
      this.placeAnim = Math.max(0, this.placeAnim - dt);
      this.recoil = Math.max(0, this.recoil - dt * 6);
      this.flash = Math.max(0, this.flash - dt);
      this.cooldown -= dt;

      if (this.specials.has("ringOfFire")) {
        const target = this.game.findTarget(this);
        if (target) {
          this.aim = Math.atan2(target.position().y - this.y, target.position().x - this.x);
          if (this.cooldown <= 0) {
            this.game.ringOfFire(this);
            this.cooldown = 0.34;
          }
        } else {
          this.cooldown = Math.max(this.cooldown, 0.12);
        }
        return;
      }

      const target = this.game.findTarget(this);
      if (!target) return;
      const p = target.position();
      this.aim = Math.atan2(p.y - (this.y - 28 * this.scale), p.x - this.x);
      if (this.cooldown <= 0) {
        this.cooldown = this.stats.cd;
        this.recoil = 1;
        this.flash = 0.08;
        this.game.fireTower(this, target);
      }
    }
  }

  // -------------------------------------------------------
  // Bloon
  // -------------------------------------------------------
  class Bloon {
    constructor(game, type, t = 0, offset = 0, opts = {}) {
      this.game = game;
      this.id = nextId++;
      this.type = type;
      this.def = BLOONS[type];
      this.t = t;
      this.offset = offset;
      this.hp = this.def.hp;
      this.dead = false;
      this.leaked = false;
      this.flash = 0;
      this.phase = Math.random() * TAU;
      this.slowUntil = 0;
      this.slowFactor = 1;
      this.freezeUntil = 0;
      this.age = 0;
      this.spawnPop = opts.silent ? 0.22 : 0;
    }

    get radius() { return this.def.radius * this.game.scale; }
    get big() { return !!this.def.big; }

    position() {
      const p = this.game.track.pointAt(this.t);
      return {
        x: p.x + p.nx * this.offset,
        y: p.y + p.ny * this.offset,
        angle: p.angle,
        nx: p.nx,
        ny: p.ny
      };
    }

    get speed() {
      if (this.freezeUntil > this.game.time) return 0;
      if (this.slowUntil > this.game.time) return this.slowFactor;
      return 1;
    }

    update(dt) {
      this.age += dt;
      this.flash = Math.max(0, this.flash - dt);
      this.spawnPop = Math.max(0, this.spawnPop - dt);
      const slow = this.speed;
      if (slow > 0) {
        this.t += this.def.speed * BTD.SPEED_SCALE * slow * dt;
      }
      if (this.t >= 1) {
        this.t = 1;
        this.leak();
      }
    }

    applyGlue(factor, duration) {
      this.slowFactor = Math.min(this.slowFactor === 1 ? factor : this.slowFactor, factor);
      this.slowUntil = Math.max(this.slowUntil, this.game.time + duration);
    }

    freeze(duration) {
      if (this.def.freezeResist) return false;
      this.freezeUntil = Math.max(this.freezeUntil, this.game.time + duration);
      return true;
    }

    leak() {
      if (this.dead) return;
      this.dead = true;
      this.leaked = true;
      const p = this.position();
      this.game.onLeak(this, p);
    }

    damage(amount, source = {}) {
      if (this.dead || amount <= 0) return;
      if (source.kind === "explosion" && this.def.immuneExplosion) {
        this.flash = 0.06;
        if (Math.random() < 0.25) this.game.addFloater(this.position().x, this.position().y - 6, "resist", "#d7d2c0", 0.5, 8);
        return;
      }
      this.hp -= amount;
      this.flash = 0.13;
      if (this.hp > 0) {
        if (amount >= 2 || this.big) this.game.addParticles(this.position().x, this.position().y, this.def.light, 3, 45, 0.35, "spark");
        return;
      }

      const overflow = -this.hp;
      this.dead = true;
      this.game.onBloonPopped(this);
      const p = this.position();
      const children = this.def.children || [];
      for (let i = 0; i < children.length; i++) {
        const child = this.game.spawnBloon(children[i], this.t, this.offset + BTD.rand(-6, 6), { silent: true });
        if (child && overflow > 0 && i === 0) {
          child.damage(overflow, source);
        }
      }
      if (this.big && children.length) {
        this.game.addRing(p.x, p.y, 8, this.radius * 2.5, this.def.light, 0.5, true);
        this.game.shake = Math.max(this.game.shake, 6);
      }
    }
  }

  // -------------------------------------------------------
  // Projectile
  // -------------------------------------------------------
  class Projectile {
    constructor(game, opts) {
      this.game = game;
      this.id = nextId++;
      Object.assign(this, {
        kind: "dart",
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        speed: 500,
        damage: 1,
        pierce: 1,
        life: 1.4,
        maxLife: 1.4,
        angle: 0,
        spin: 0,
        returning: false,
        returnAfter: 0.42,
        age: 0,
        dead: false,
        hitSet: new Set(),
        trail: [],
        splash: 0,
        source: null,
        color: "#fff",
        size: 1,
        isBig: false
      }, opts);
      this.maxLife = this.life;
      if (this.speed > 0 && this.kind !== "bomb") {
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
      }
    }

    update(dt) {
      this.age += dt;
      this.life -= dt;
      if (this.life <= 0) {
        this.dead = true;
        if (this.kind === "bomb") this.explode();
        return;
      }

      if (this.kind === "bomb") {
        const t = clamp(this.age / this.duration, 0, 1);
        this.x = this.sx + (this.tx - this.sx) * t;
        this.y = this.sy + (this.ty - this.sy) * t;
        this.z = Math.sin(t * Math.PI) * this.arc;
        if (t >= 1) this.explode();
        return;
      }

      if (this.kind === "boomerang") {
        if (this.age > this.returnAfter) {
          const tx = this.source ? this.source.x : this.sx;
          const ty = this.source ? this.source.y : this.sy;
          const a = Math.atan2(ty - this.y, tx - this.x);
          this.vx += Math.cos(a) * this.speed * 3.2 * dt;
          this.vy += Math.sin(a) * this.speed * 3.2 * dt;
          const sp = Math.hypot(this.vx, this.vy);
          const cap = this.speed * 1.25;
          if (sp > cap) {
            this.vx = (this.vx / sp) * cap;
            this.vy = (this.vy / sp) * cap;
          }
          if (this.age > this.returnAfter && dist(this.x, this.y, tx, ty) < 22 * this.game.scale) this.dead = true;
        }
        this.spin += dt * 15;
      }

      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.trail.push({ x: this.x, y: this.y, life: 0.14 });
      if (this.trail.length > 9) this.trail.shift();
      for (const t of this.trail) t.life -= dt;

      if (this.x < -100 * this.game.scale || this.x > this.game.w + 100 * this.game.scale || this.y < -100 * this.game.scale || this.y > this.game.h + 100 * this.game.scale) {
        this.dead = true;
      }
    }

    explode() {
      if (this.dead) return;
      this.dead = true;
      this.game.explode(this.tx, this.ty, this.splash || 46, this.damage || 2, this.source, { cluster: this.cluster, color: this.color, sun: this.sun });
    }
  }

  BTD.Tower = Tower;
  BTD.Bloon = Bloon;
  BTD.Projectile = Projectile;
  BTD.TARGET_MODES = TARGET_MODES;
})();
