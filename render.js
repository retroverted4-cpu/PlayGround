/* =========================================================
   BLOONS TD 5 — SUNSET GROVE
   Canvas rendering: scenery, characters, effects.
   ========================================================= */
(() => {
  "use strict";
  const BTD = (window.BTD = window.BTD || {});
  const { TAU, clamp, lerp } = BTD;
  const { Art, WorldArt } = BTD;
  const Game = BTD.Game;
  const { ellipse } = Art;

  Game.prototype.renderBackground = function (ctx) {
    const { w, h, scale, pathWidth } = this;
    const rng = BTD.makeRng(7301 + Math.round(w + h * 3));

    // Base grass wash
    const grass = ctx.createLinearGradient(0, 0, 0, h);
    grass.addColorStop(0, "#73b854");
    grass.addColorStop(0.4, "#65aa49");
    grass.addColorStop(1, "#4e913c");
    ctx.fillStyle = grass;
    ctx.fillRect(0, 0, w, h);

    // Warm sunlight pooling in the top-left
    const sunlight = ctx.createRadialGradient(w * 0.12, h * 0.05, 10, w * 0.12, h * 0.05, Math.max(w, h) * 0.65);
    sunlight.addColorStop(0, "rgba(255, 244, 160, .28)");
    sunlight.addColorStop(0.38, "rgba(255, 220, 115, .09)");
    sunlight.addColorStop(1, "rgba(255, 220, 115, 0)");
    ctx.fillStyle = sunlight;
    ctx.fillRect(0, 0, w, h);

    // Soft tonal patches
    for (let i = 0; i < 18; i++) {
      const x = rng() * w;
      const y = rng() * h;
      const r = (40 + rng() * 140) * scale;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const dark = rng() < 0.5;
      g.addColorStop(0, dark ? "rgba(38, 94, 34, .11)" : "rgba(196, 231, 116, .1)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // Fine grass texture
    ctx.lineCap = "round";
    for (let i = 0; i < 620; i++) {
      const x = rng() * w;
      const y = rng() * h;
      const len = (1.5 + rng() * 4) * scale;
      ctx.strokeStyle = rng() < 0.5 ? `rgba(42, 103, 38, ${0.08 + rng() * 0.12})` : `rgba(195, 230, 122, ${0.07 + rng() * 0.1})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rng() - 0.5) * 2.5, y - len);
      ctx.stroke();
    }

    // Pond before the track
    if (this.pond) {
      WorldArt.drawPond(ctx, this.pond.x, this.pond.y, this.pond.rx, this.pond.ry, rng);
      // Soggy bank
      ctx.strokeStyle = "rgba(104, 89, 42, .24)";
      ctx.lineWidth = 8 * scale;
      ctx.beginPath();
      ctx.ellipse(this.pond.x, this.pond.y, this.pond.rx + 1, this.pond.ry + 1, -0.08, 0, TAU);
      ctx.stroke();
    }

    // Dirt track
    this.track.draw(ctx, pathWidth, scale);

    // Grass tufts that hug the path edges
    for (let i = 0; i < 46; i++) {
      const t = rng();
      const p = this.track.pointAt(t);
      const side = rng() < 0.5 ? -1 : 1;
      const off = (pathWidth * 0.5 + (2 + rng() * 5) * scale) * side;
      WorldArt.drawGrassTuft(ctx, p.x + p.nx * off, p.y + p.ny * off, 0.7 + rng() * 0.65, rng, side < 0);
    }

    // Small ground clutter
    for (const f of this.scenery.flowers) WorldArt.drawFlower(ctx, f.x, f.y, f.s, rng);
    for (const g of this.scenery.grass) WorldArt.drawGrassTuft(ctx, g.x, g.y, g.s, rng, g.flip);
    for (const m of this.scenery.mushrooms) WorldArt.drawMushroom(ctx, m.x, m.y, m.s, rng);

    // Larger scenery sorted by depth
    const decor = [];
    for (const b of this.scenery.bushes) decor.push({ y: b.y, kind: "bush", item: b });
    for (const r of this.scenery.rocks) decor.push({ y: r.y, kind: "rock", item: r });
    for (const t of this.scenery.trees) decor.push({ y: t.y, kind: "tree", item: t });
    decor.sort((a, b) => a.y - b.y);
    for (const d of decor) {
      if (d.kind === "tree") {
        WorldArt.drawTree(ctx, d.item.x, d.item.y, d.item.s * scale, rng, d.item.palm);
      } else if (d.kind === "bush") {
        WorldArt.drawBush(ctx, d.item.x, d.item.y, d.item.s * scale, rng, d.item.berries);
      } else {
        WorldArt.drawRock(ctx, d.item.x, d.item.y, d.item.s * scale, rng);
      }
    }

    // Start sign and exit gate
    if (this.scenery.sign) {
      const s = this.scenery.sign;
      WorldArt.drawSign(ctx, s.x, s.y, clamp(0.88 * scale, 0.62, 1.25), "START");
    }
    if (this.scenery.gate) {
      const g = this.scenery.gate;
      WorldArt.drawGate(ctx, g.x, g.y, clamp(0.92 * scale, 0.65, 1.3));
    }

    // Framing shade
    const edge = ctx.createRadialGradient(w * 0.5, h * 0.48, Math.min(w, h) * 0.35, w * 0.5, h * 0.48, Math.max(w, h) * 0.8);
    edge.addColorStop(0, "rgba(15, 39, 16, 0)");
    edge.addColorStop(0.72, "rgba(15, 39, 16, .08)");
    edge.addColorStop(1, "rgba(8, 27, 11, .34)");
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, w, h);

    // Top-left sun haze
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = "#fff4a5";
    ctx.beginPath();
    ctx.arc(w * 0.09, h * 0.02, 90 * scale, 0, TAU);
    ctx.fill();
    ctx.restore();
  };

  Game.prototype.renderAmbient = function (ctx, now) {
    const { w, h, scale, time } = this;
    const t = now / 1000;

    // Moving sunbeams
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 4; i++) {
      const sway = Math.sin(t * 0.08 + i) * 25;
      const x = w * (0.05 + i * 0.2) + sway;
      const grad = ctx.createLinearGradient(x, 0, x + 140 * scale, h * 0.75);
      grad.addColorStop(0, "rgba(255, 245, 175, .09)");
      grad.addColorStop(0.6, "rgba(255, 232, 125, .03)");
      grad.addColorStop(1, "rgba(255, 232, 125, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(x - 55 * scale, 0);
      ctx.lineTo(x + 75 * scale, 0);
      ctx.lineTo(x + 240 * scale, h * 0.8);
      ctx.lineTo(x + 40 * scale, h * 0.8);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Pond shimmer
    if (this.pond) {
      const p = this.pond;
      ctx.save();
      ctx.strokeStyle = "rgba(205, 255, 247, .22)";
      ctx.lineWidth = 1.1;
      for (let i = 0; i < 3; i++) {
        const moving = (t * (9 + i * 3) + i * 35) % (p.rx * 1.3);
        ctx.beginPath();
        ctx.ellipse(p.x - p.rx * 0.6 + moving, p.y - p.ry * 0.15 + i * p.ry * 0.18, p.rx * 0.16, 1.4, 0, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Torches
    if (this.scenery.torches) {
      for (const torch of this.scenery.torches) {
        WorldArt.drawTorch(ctx, torch.x, torch.y, clamp(0.9 * scale, 0.65, 1.25), t);
      }
    }

    // Butterflies
    for (const b of this.butterflies) {
      const x = b.x + Math.sin(t * b.speed + b.phase) * b.range;
      const y = b.y + Math.cos(t * b.speed * 0.73 + b.phase * 1.7) * b.range * 0.35;
      WorldArt.drawButterfly(ctx, x, y, clamp(scale * 0.9, 0.58, 1.1), t, b.phase, b.color);
    }

    // Drifting leaves
    for (const leaf of this.leaves) {
      const x = (leaf.x + t * leaf.speed + Math.sin(t * 0.6 + leaf.phase) * 18) % (w + 40) - 20;
      const y = (leaf.y + t * leaf.speed * 0.33 + Math.cos(t * 0.5 + leaf.phase) * 10) % (h + 40) - 20;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 0.7 + leaf.phase);
      ctx.fillStyle = "rgba(184, 222, 104, .24)";
      ctx.beginPath();
      ctx.ellipse(0, 0, leaf.size * scale, leaf.size * 0.48 * scale, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // Floating pollen
    ctx.save();
    for (const m of this.motes) {
      const x = m.x + Math.sin(t * m.speed + m.phase) * 26;
      const y = m.y + Math.cos(t * m.speed * 0.8 + m.phase * 2) * 18;
      ctx.globalAlpha = 0.22 + Math.sin(t * 2 + m.phase) * 0.12;
      ctx.fillStyle = "#fff6bf";
      ctx.beginPath();
      ctx.arc(x, y, m.size * scale, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  };

  Game.prototype.render = function (now) {
    const ctx = this.ctx;
    const { w, h, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#2b522a";
    ctx.fillRect(0, 0, w, h);

    const shakeX = this.shake > 0.2 ? (Math.random() - 0.5) * this.shake : 0;
    const shakeY = this.shake > 0.2 ? (Math.random() - 0.5) * this.shake * 0.65 : 0;

    ctx.save();
    ctx.translate(shakeX, shakeY);

    if (this.background) ctx.drawImage(this.background, 0, 0, w, h);
    this.renderAmbient(ctx, now);
    this.drawRings(ctx);
    this.drawRanges(ctx);

    const items = [];
    for (const t of this.towers) items.push({ y: t.y, type: "tower", item: t });
    for (const b of this.bloons) {
      if (!b.dead) {
        const p = b.position();
        items.push({ y: p.y, type: "bloon", item: b });
      }
    }
    items.sort((a, b) => a.y - b.y);
    for (const entry of items) {
      if (entry.type === "tower") this.drawTower(ctx, entry.item, now);
      else this.drawBloon(ctx, entry.item, now);
    }

    this.drawProjectiles(ctx, now);
    this.drawTracers(ctx);
    this.drawParticles(ctx);
    this.drawFloaters(ctx);
    this.drawGhost(ctx, now);
    ctx.restore();

    // Edge damage pulse
    if (this.hurtFlash > 0.01) {
      const hurt = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.24, w / 2, h / 2, Math.max(w, h) * 0.72);
      hurt.addColorStop(0, "rgba(255, 51, 28, 0)");
      hurt.addColorStop(0.72, `rgba(255, 44, 25, ${this.hurtFlash * 0.12})`);
      hurt.addColorStop(1, `rgba(208, 24, 12, ${this.hurtFlash * 0.5})`);
      ctx.fillStyle = hurt;
      ctx.fillRect(0, 0, w, h);
    }

    // Subtle vignette
    const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.82);
    vig.addColorStop(0, "rgba(8, 25, 11, 0)");
    vig.addColorStop(1, "rgba(5, 19, 8, .22)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  };

  Game.prototype.drawRanges = function (ctx) {
    const selected = this.selectedTower;
    if (selected && this.towers.includes(selected)) {
      const r = selected.range;
      ctx.save();
      ctx.beginPath();
      ctx.arc(selected.x, selected.y, r, 0, TAU);
      ctx.fillStyle = "rgba(180, 255, 131, .055)";
      ctx.fill();
      ctx.setLineDash([6 * this.scale, 6 * this.scale]);
      ctx.lineWidth = 1.4 * this.scale;
      ctx.strokeStyle = "rgba(201, 255, 153, .5)";
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(selected.x, selected.y, 24 * this.scale, 0, TAU);
      ctx.strokeStyle = "rgba(255, 213, 82, .5)";
      ctx.lineWidth = 2 * this.scale;
      ctx.stroke();
      ctx.restore();
    }

    if (this.selectedType && this.pointer.inside) {
      const def = BTD.TOWERS[this.selectedType];
      if (def) {
        const x = this.pointer.x;
        const y = this.pointer.y;
        const r = def.base.range * this.scale;
        const check = this.canPlace(this.selectedType, x, y);
        const color = check.ok ? "149, 255, 108" : "255, 96, 79";
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fillStyle = `rgba(${color}, .065)`;
        ctx.fill();
        ctx.setLineDash([5 * this.scale, 6 * this.scale]);
        ctx.lineWidth = 1.35 * this.scale;
        ctx.strokeStyle = `rgba(${color}, .62)`;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(x, y, 18 * this.scale, 0, TAU);
        ctx.fillStyle = `rgba(${color}, .12)`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${color}, .75)`;
        ctx.lineWidth = 1.5 * this.scale;
        ctx.stroke();
        if (check.ok) {
          ctx.beginPath();
          ctx.arc(x, y, 25 * this.scale, 0, TAU);
          ctx.strokeStyle = "rgba(255, 220, 100, .25)";
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  };

  Game.prototype.drawRings = function (ctx) {
    for (const r of this.rings) {
      const progress = 1 - r.life / r.maxLife;
      const radius = lerp(r.r, r.maxR, Math.min(1, progress * 1.15));
      const alpha = Math.max(0, r.life / r.maxLife) * 0.72;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(r.x, r.y, radius, 0, TAU);
      if (r.fill) {
        ctx.fillStyle = r.color;
        ctx.globalAlpha = alpha * 0.1;
        ctx.fill();
        ctx.globalAlpha = alpha;
      }
      ctx.strokeStyle = r.color;
      ctx.lineWidth = Math.max(1, 3 * this.scale * (r.life / r.maxLife));
      ctx.stroke();
      ctx.restore();
    }
  };

  Game.prototype.drawTower = function (ctx, tower, now) {
    const type = tower.type;
    const scale = this.scale;
    const pop = 1 + Math.sin(clamp(tower.placeAnim / 0.5, 0, 1) * Math.PI) * 0.12;

    // Ring of fire aura
    if (tower.specials.has("ringOfFire")) {
      const r = tower.range * 1.04;
      ctx.save();
      ctx.translate(tower.x, tower.y);
      ctx.rotate(tower.age * 0.65);
      ctx.globalAlpha = 0.36;
      ctx.strokeStyle = "#ffb23f";
      ctx.lineWidth = 3.5 * scale;
      ctx.setLineDash([12 * scale, 9 * scale]);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      const glow = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
      glow.addColorStop(0, "rgba(255, 140, 30, 0)");
      glow.addColorStop(0.86, "rgba(255, 126, 21, .06)");
      glow.addColorStop(1, "rgba(255, 193, 61, .14)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    if (tower.specials.has("sunGod")) {
      const glow = ctx.createRadialGradient(tower.x, tower.y - 25 * scale, 2, tower.x, tower.y - 25 * scale, 48 * scale);
      glow.addColorStop(0, "rgba(255, 231, 123, .28)");
      glow.addColorStop(1, "rgba(255, 211, 75, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(tower.x, tower.y - 25 * scale, 48 * scale, 0, TAU);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(tower.x, tower.y);
    if (tower.flash > 0) {
      ctx.globalAlpha = 0.9;
    }
    Art.drawMonkey(ctx, type, scale * pop, now / 1000, tower.aim, tower.level, tower.seed);
    ctx.restore();

    if (tower === this.selectedTower) {
      ctx.save();
      const bob = Math.sin(now / 320) * 2 * scale;
      ctx.fillStyle = "#ffe173";
      ctx.beginPath();
      ctx.moveTo(tower.x, tower.y - 65 * scale + bob);
      ctx.lineTo(tower.x - 5 * scale, tower.y - 73 * scale + bob);
      ctx.lineTo(tower.x + 5 * scale, tower.y - 73 * scale + bob);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  };

  Game.prototype.drawBloon = function (ctx, b, now) {
    const p = b.position();
    const frozen = b.freezeUntil > this.time;
    const glued = b.slowUntil > this.time;
    Art.drawBloon(ctx, p.x, p.y, b.type, this.scale, now / 1000, b.phase, {
      frozen,
      glued,
      flash: b.flash,
      hpRatio: b.big ? clamp(b.hp / b.def.hp, 0, 1) : undefined
    });
  };

  Game.prototype.drawProjectiles = function (ctx, now) {
    const scale = this.scale;
    for (const p of this.projectiles) {
      // Trail
      ctx.save();
      for (let i = 0; i < p.trail.length; i++) {
        const tr = p.trail[i];
        const a = Math.max(0, tr.life / 0.14);
        if (a <= 0) continue;
        ctx.globalAlpha = a * 0.28;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(tr.x, tr.y - (p.kind === "bomb" ? p.z || 0 : 0), Math.max(0.6, (p.size || 2) * 0.5 * (i / p.trail.length)), 0, TAU);
        ctx.fill();
      }
      ctx.restore();

      if (p.kind === "bomb") {
        const altitude = p.z || 0;
        ctx.save();
        ctx.fillStyle = "rgba(28, 43, 18, .25)";
        ellipse(ctx, p.x, p.y, 6 * scale, 2.4 * scale);
        ctx.translate(p.x, p.y - altitude);
        const trailT = clamp(p.age / p.duration, 0, 1);
        ctx.globalAlpha = 1 - trailT * 0.25;
        ctx.fillStyle = "#252329";
        ctx.beginPath();
        ctx.arc(0, 0, 5 * scale, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,.15)";
        ctx.lineWidth = 0.9;
        ctx.stroke();
        ctx.fillStyle = "#ffd15f";
        ctx.beginPath();
        ctx.arc(4 * scale, -4.5 * scale, 1.8 * scale, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "#8b6234";
        ctx.lineWidth = 1.2 * scale;
        ctx.beginPath();
        ctx.moveTo(1 * scale, -4 * scale);
        ctx.quadraticCurveTo(4 * scale, -8 * scale, 6 * scale, -4 * scale);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      if (p.kind === "dart") {
        ctx.strokeStyle = "#f6e8c9";
        ctx.lineWidth = 1.6 * scale;
        ctx.beginPath();
        ctx.moveTo(-7 * scale, 0);
        ctx.lineTo(9 * scale, 0);
        ctx.stroke();
        ctx.fillStyle = "#fdf7e9";
        ctx.beginPath();
        ctx.moveTo(12 * scale, 0);
        ctx.lineTo(7 * scale, -2 * scale);
        ctx.lineTo(7 * scale, 2 * scale);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#e15b3f";
        ctx.beginPath();
        ctx.moveTo(-7 * scale, 0);
        ctx.lineTo(-11 * scale, -2.5 * scale);
        ctx.lineTo(-5 * scale, -0.8 * scale);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-7 * scale, 0);
        ctx.lineTo(-11 * scale, 2.5 * scale);
        ctx.lineTo(-5 * scale, 0.8 * scale);
        ctx.closePath();
        ctx.fill();
      } else if (p.kind === "tack") {
        ctx.fillStyle = "#ddd8c6";
        ctx.beginPath();
        ctx.moveTo(4 * scale, 0);
        ctx.lineTo(-3 * scale, -2.4 * scale);
        ctx.lineTo(-2 * scale, 0);
        ctx.lineTo(-3 * scale, 2.4 * scale);
        ctx.closePath();
        ctx.fill();
      } else if (p.kind === "boomerang") {
        ctx.rotate(p.spin);
        ctx.strokeStyle = "#9a5a21";
        ctx.lineWidth = 4.8 * scale;
        ctx.beginPath();
        ctx.moveTo(-7 * scale, -2 * scale);
        ctx.quadraticCurveTo(3 * scale, -8 * scale, 9 * scale, 2 * scale);
        ctx.stroke();
        ctx.strokeStyle = "#f0b84b";
        ctx.lineWidth = 2.3 * scale;
        ctx.beginPath();
        ctx.moveTo(-6 * scale, -2.5 * scale);
        ctx.quadraticCurveTo(2 * scale, -6.7 * scale, 8 * scale, 1 * scale);
        ctx.stroke();
      } else if (p.kind === "glue") {
        ctx.fillStyle = "#8dcb34";
        ctx.beginPath();
        ctx.ellipse(0, 0, 4.4 * scale, 3.2 * scale, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "rgba(233, 255, 167, .75)";
        ellipse(ctx, -1 * scale, -1 * scale, 1.4 * scale, 0.9 * scale);
      } else if (p.kind === "shuriken") {
        ctx.rotate(p.age * 18);
        ctx.fillStyle = "#d8dfe4";
        Art.star(ctx, 0, 0, 5.2 * scale, 4);
        ctx.fillStyle = "#79828a";
        Art.star(ctx, 0, 0, 2.1 * scale, 4);
      } else if (p.kind === "super" || p.kind === "sun") {
        const radius = (p.kind === "sun" ? 11 : 7) * scale;
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        grad.addColorStop(0, "#fffbed");
        grad.addColorStop(0.28, p.kind === "sun" ? "#ffe06a" : "#ffbacd");
        grad.addColorStop(0.6, p.kind === "sun" ? "rgba(255, 152, 38, .7)" : "rgba(255, 118, 162, .5)");
        grad.addColorStop(1, "rgba(255, 130, 80, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#fffef5";
        ctx.beginPath();
        ctx.arc(0, 0, (p.kind === "sun" ? 3.5 : 2.2) * scale, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  };

  Game.prototype.drawTracers = function (ctx) {
    for (const t of this.tracers) {
      const a = t.life / t.maxLife;
      ctx.save();
      ctx.globalAlpha = a;
      const grad = ctx.createLinearGradient(t.x1, t.y1, t.x2, t.y2);
      grad.addColorStop(0, "rgba(255, 255, 225, .95)");
      grad.addColorStop(0.7, "rgba(255, 230, 128, .75)");
      grad.addColorStop(1, "rgba(255, 190, 80, 0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = t.width;
      ctx.beginPath();
      ctx.moveTo(t.x1, t.y1);
      ctx.lineTo(t.x2, t.y2);
      ctx.stroke();
      ctx.restore();
    }
  };

  Game.prototype.drawParticles = function (ctx) {
    for (const p of this.particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      if (p.kind === "smoke") {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = a * 0.22;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (2 - a * 0.7), 0, TAU);
        ctx.fill();
      } else if (p.kind === "spark") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(0.7, p.size * 0.55);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.025, p.y - p.vy * 0.025);
        ctx.stroke();
      } else if (p.kind === "ice") {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        Art.star(ctx, 0, 0, p.size, 6);
      } else if (p.kind === "star") {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        Art.star(ctx, 0, 0, p.size * 1.15);
      } else if (p.kind === "fire") {
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.4);
        grad.addColorStop(0, "#fff7ba");
        grad.addColorStop(0.35, p.color);
        grad.addColorStop(1, "rgba(255, 77, 10, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.4, 0, TAU);
        ctx.fill();
      } else if (p.kind === "confetti") {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size, -p.size * 0.45, p.size * 2, p.size * 0.9);
      } else if (p.kind === "goo") {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size, p.size * 0.8, p.rot, 0, TAU);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * a, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  };

  Game.prototype.drawFloaters = function (ctx) {
    for (const f of this.floaters) {
      const a = clamp(f.life / f.maxLife, 0, 1);
      const pop = 1 + Math.sin((1 - a) * Math.PI) * 0.1;
      ctx.save();
      ctx.globalAlpha = Math.min(1, a * 1.6);
      ctx.translate(f.x, f.y);
      ctx.scale(pop, pop);
      ctx.font = `900 ${Math.max(8, f.size * this.scale)}px "Trebuchet MS", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = Math.max(2, 3 * this.scale);
      ctx.strokeStyle = "rgba(18, 31, 15, .72)";
      ctx.strokeText(f.text, 0, 0);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, 0, 0);
      ctx.restore();
    }
  };

  Game.prototype.drawGhost = function (ctx, now) {
    if (!this.selectedType || !this.pointer.inside) return;
    const x = this.pointer.x;
    const y = this.pointer.y;
    const check = this.canPlace(this.selectedType, x, y);
    const scale = this.scale;
    // Translucent preview
    ctx.save();
    ctx.globalAlpha = check.ok ? 0.72 : 0.42;
    ctx.translate(x, y);
    Art.drawMonkey(ctx, this.selectedType, scale, now / 1000, -1.2, 0, 0.4);
    if (!check.ok) {
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = "rgba(255, 52, 35, .4)";
      ctx.fillRect(-40 * scale, -70 * scale, 80 * scale, 72 * scale);
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = check.ok ? "rgba(197, 255, 169, .86)" : "rgba(255, 112, 91, .88)";
    ctx.lineWidth = 2 * scale;
    ctx.setLineDash([5 * scale, 4 * scale]);
    ctx.beginPath();
    ctx.arc(x, y, 21 * scale, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    if (!check.ok) {
      ctx.strokeStyle = "rgba(255, 91, 72, .9)";
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.moveTo(x - 5 * scale, y - 30 * scale);
      ctx.lineTo(x + 5 * scale, y - 20 * scale);
      ctx.moveTo(x + 5 * scale, y - 30 * scale);
      ctx.lineTo(x - 5 * scale, y - 20 * scale);
      ctx.stroke();
    }
    ctx.restore();
  };

  // keep the linter honest about the helper that is intentionally shared
  void ellipse;
})();
