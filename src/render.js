// All rendering: baked meadow background, towers, bloons, projectiles, FX.

import { W, H, BLOONS, TOWER_BY_ID, towerStats, mulberry32 } from "./config.js";

export class Renderer {
  constructor(canvas, track, pathWidth) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
    this.track = track;
    this.pathWidth = pathWidth;
    this.dpr = 1;
    this.balloonGrads = new Map();
    this.spriteCache = new Map();
    this.decor = [];
    this.blockers = [];
    this.pond = { x: 104, y: 646, rx: 112, ry: 58 };
    this.makeDecor();
    this.buildBackground();
    this.resize();
  }

  resize() {
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(320, Math.round(rect.width * dpr));
    const h = Math.max(180, Math.round(rect.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.cacheBackground();
    }
    this.dpr = dpr;
  }

  cacheBackground() {
    if (!this.bg) return;
    if (!this.bgFrame) this.bgFrame = document.createElement("canvas");
    this.bgFrame.width = this.canvas.width;
    this.bgFrame.height = this.canvas.height;
    const c = this.bgFrame.getContext("2d");
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = "high";
    c.drawImage(this.bg, 0, 0, this.bgFrame.width, this.bgFrame.height);
  }

  makeDecor() {
    const rng = mulberry32(90210);
    const t = this.track;
    const tooCloseToPond = (x, y) => {
      const dx = (x - this.pond.x) / (this.pond.rx + 26);
      const dy = (y - this.pond.y) / (this.pond.ry + 26);
      return dx * dx + dy * dy < 1;
    };
    const free = (x, y, margin, scale = 1) => {
      if (x < 30 * scale || x > W - 30 * scale || y < 40 || y > H - 20) return false;
      if (t.distanceTo(x, y) < margin) return false;
      if (tooCloseToPond(x, y)) return false;
      for (const d of this.decor) {
        if (Math.hypot(d.x - x, d.y - y) < (d.r + 24) * scale) return false;
      }
      return true;
    };

    const tryPlace = (kind, count, margin, rMin, rMax, blocking) => {
      let placed = 0;
      let guard = 0;
      while (placed < count && guard++ < 900) {
        const x = 40 + rng() * (W - 80);
        const y = 70 + rng() * (H - 100);
        const r = rMin + rng() * (rMax - rMin);
        if (!free(x, y, margin + r)) continue;
        const d = { kind, x, y, r, blocking, seed: rng(), lean: (rng() - 0.5) * 0.3 };
        this.decor.push(d);
        if (blocking) this.blockers.push(d);
        placed++;
      }
    };

    tryPlace("tree", 15, this.pathWidth / 2 + 6, 25, 38, true);
    tryPlace("bush", 26, 43, 13, 20, true);
    tryPlace("rock", 9, 40, 8, 13, true);

    for (let i = 0; i < 85; i++) {
      const x = 20 + rng() * (W - 40);
      const y = 60 + rng() * (H - 80);
      if (t.distanceTo(x, y) < 35 + rng() * 8) continue;
      if (tooCloseToPond(x, y)) continue;
      const kind = rng() < 0.55 ? "tuft" : rng() < 0.62 ? "flower" : "pebble";
      this.decor.push({ kind, x, y, r: 3 + rng() * 5, blocking: false, seed: rng(), hue: rng() });
    }

    // A few hand-placed clumps framing the start and exit.
    for (const [x, y, r] of [[58, 46, 22], [1100, 48, 19], [1230, 560, 17], [390, 662, 19], [780, 674, 17], [57, 300, 20]]) {
      if (t.distanceTo(x, y) > 48) {
        const d = { kind: "tree", x, y, r, blocking: true, seed: 0.4, lean: 0.1 };
        this.decor.push(d);
        this.blockers.push(d);
      }
    }
    this.decor.sort((a, b) => a.y - b.y);
    this.blockers = this.decor.filter((d) => d.blocking);
  }

  buildBackground() {
    const bg = document.createElement("canvas");
    bg.width = W * 2;
    bg.height = H * 2;
    const c = bg.getContext("2d");
    c.scale(2, 2);
    const rng = mulberry32(424242);

    // Base grass.
    const grad = c.createLinearGradient(0, 0, W * 0.3, H);
    grad.addColorStop(0, "#8ccb5d");
    grad.addColorStop(0.45, "#79bd4e");
    grad.addColorStop(1, "#63a83f");
    c.fillStyle = grad;
    c.fillRect(0, 0, W, H);

    // Mown bands.
    for (let i = 0; i < 17; i++) {
      c.fillStyle = i % 2 ? "rgba(255,255,220,0.035)" : "rgba(20,70,20,0.045)";
      c.beginPath();
      c.moveTo(0, i * 44);
      c.lineTo(W, i * 44 - 70);
      c.lineTo(W, i * 44 - 20);
      c.lineTo(0, i * 44 + 50);
      c.closePath();
      c.fill();
    }

    // Fine grass texture.
    for (let i = 0; i < 5200; i++) {
      const x = rng() * W;
      const y = rng() * H;
      const a = 0.04 + rng() * 0.08;
      c.strokeStyle = rng() < 0.5 ? `rgba(30,80,20,${a})` : `rgba(220,255,190,${a})`;
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + (rng() - 0.5) * 3, y - 2 - rng() * 4);
      c.stroke();
    }

    this.drawPond(c, rng);
    this.drawPath(c, rng);
    this.drawStartGate(c);
    this.drawExitGate(c);

    // Decorative ground items go under the big trees.
    for (const d of this.decor) {
      if (d.kind === "tuft" || d.kind === "flower" || d.kind === "pebble") this.drawGroundItem(c, d, rng);
    }
    // Flat shadows for trees/bushes then bodies.
    for (const d of this.decor) {
      if (d.kind === "tree" || d.kind === "bush" || d.kind === "rock") this.drawDecorShadow(c, d);
    }
    for (const d of this.decor) {
      if (d.kind === "tree") this.drawTree(c, d, rng);
      else if (d.kind === "bush") this.drawBush(c, d, rng);
      else if (d.kind === "rock") this.drawRock(c, d);
    }

    // Soft corner shading.
    const vign = c.createRadialGradient(W * 0.5, H * 0.48, H * 0.28, W * 0.5, H * 0.5, H * 0.92);
    vign.addColorStop(0, "rgba(15,40,12,0)");
    vign.addColorStop(0.75, "rgba(15,40,12,0.06)");
    vign.addColorStop(1, "rgba(10,28,8,0.22)");
    c.fillStyle = vign;
    c.fillRect(0, 0, W, H);

    this.bg = bg;
  }

  drawPond(c, rng) {
    const { x, y, rx, ry } = this.pond;
    const g = c.createRadialGradient(x - rx * 0.2, y - ry * 0.3, 4, x, y, rx);
    g.addColorStop(0, "#63c7d6");
    g.addColorStop(0.55, "#3d99b5");
    g.addColorStop(1, "#2a7895");
    c.save();
    c.beginPath();
    c.ellipse(x, y, rx + 9, ry + 9, 0, 0, Math.PI * 2);
    c.fillStyle = "rgba(48,83,30,0.45)";
    c.fill();
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    c.fillStyle = g;
    c.fill();
    c.clip();
    c.strokeStyle = "rgba(220,248,255,0.3)";
    c.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.ellipse(x - 20 + i * 18, y - 8 + i * 6, 30 + i * 4, 8, -0.2, 0.2, Math.PI * 0.9);
      c.stroke();
    }
    c.restore();

    c.strokeStyle = "rgba(50,84,32,0.75)";
    c.lineWidth = 3;
    c.beginPath();
    c.ellipse(x, y, rx + 1, ry + 1, 0, 0, Math.PI * 2);
    c.stroke();

    // Lily pads.
    for (const [lx, ly, lr, rot] of [[-42, 14, 17, 0.4], [28, 22, 13, 2.1], [-5, -18, 11, 4.2], [56, -6, 14, 1.2], [-62, -20, 10, 3.4]]) {
      c.beginPath();
      c.ellipse(lx * 0.6 + x, ly * 0.55 + y, lr, lr * 0.72, rot, 0.2, Math.PI * 2 - 0.1);
      c.lineTo(lx * 0.6 + x, ly * 0.55 + y);
      c.closePath();
      c.fillStyle = "#5aa84a";
      c.fill();
      c.strokeStyle = "rgba(30,80,35,.5)";
      c.lineWidth = 1;
      c.stroke();
    }
    // Reeds at edges.
    for (let i = 0; i < 9; i++) {
      const ang = Math.PI * (0.15 + rng() * 0.7) + Math.PI;
      const bx = x + Math.cos(ang) * (rx - 4);
      const by = y + Math.sin(ang) * (ry - 2);
      c.strokeStyle = "#4c8a39";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(bx, by);
      c.quadraticCurveTo(bx + 4, by - 16, bx + 1 + rng() * 5, by - 30);
      c.stroke();
      c.fillStyle = "#7d5234";
      c.beginPath();
      c.ellipse(bx + 2, by - 30, 2.5, 6, 0.1, 0, Math.PI * 2);
      c.fill();
    }
  }

  drawPath(c, rng) {
    const path = new Path2D();
    const pts = this.track.points;
    path.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) path.lineTo(pts[i].x, pts[i].y);

    c.lineCap = "round";
    c.lineJoin = "round";
    c.strokeStyle = "rgba(40,60,24,0.28)";
    c.lineWidth = 80;
    c.save();
    c.translate(0, 5);
    c.stroke(path);
    c.restore();

    c.strokeStyle = "#4a331d";
    c.lineWidth = 76;
    c.stroke(path);

    c.strokeStyle = "#9d7544";
    c.lineWidth = 67;
    c.stroke(path);

    c.strokeStyle = "#c49a5f";
    c.lineWidth = 56;
    c.stroke(path);

    c.strokeStyle = "rgba(224,190,137,0.55)";
    c.lineWidth = 30;
    c.stroke(path);

    // Worn tyre-track style lines.
    c.strokeStyle = "rgba(120,86,48,0.24)";
    c.lineWidth = 3;
    c.setLineDash([16, 22]);
    c.stroke(path);
    c.setLineDash([]);

    // Edge stones.
    for (let d = 14; d < this.track.length - 6; d += 26) {
      const p = this.track.pointAt(d);
      const n = this.track.normalAt(d);
      for (const side of [-1, 1]) {
        const off = 35 + rng() * 3;
        const sx = p.x + n.x * off * side;
        const sy = p.y + n.y * off * side;
        const r = 3.5 + rng() * 3.5;
        c.fillStyle = rng() < 0.5 ? "#8a6639" : "#a47c48";
        c.beginPath();
        c.ellipse(sx, sy, r, r * 0.72, rng() * 3, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "rgba(255,235,190,0.22)";
        c.beginPath();
        c.ellipse(sx - 0.8, sy - 1, r * 0.55, r * 0.36, 0, 0, Math.PI * 2);
        c.fill();
      }
    }

    // Pebbles in the track.
    for (let d = 10; d < this.track.length; d += 17) {
      const p = this.track.pointAt(d);
      const n = this.track.normalAt(d);
      const off = (rng() - 0.5) * 46;
      c.fillStyle = `rgba(110,78,42,${0.1 + rng() * 0.16})`;
      c.beginPath();
      c.ellipse(p.x + n.x * off, p.y + n.y * off, 1 + rng() * 2.6, 1 + rng() * 1.6, rng() * 3, 0, Math.PI * 2);
      c.fill();
    }
  }

  drawStartGate(c) {
    const p = this.track.pointAt(78);
    c.save();
    c.translate(p.x - 8, p.y);
    // Cave mouth.
    const hole = c.createRadialGradient(-10, 0, 4, 0, 0, 54);
    hole.addColorStop(0, "#141b0d");
    hole.addColorStop(0.7, "#1f2a14");
    hole.addColorStop(1, "#33401f");
    c.fillStyle = hole;
    c.beginPath();
    c.ellipse(-6, 2, 40, 52, 0, 0, Math.PI * 2);
    c.fill();
    // Rocks around it.
    const rocks = [[-34, -38, 20], [-12, -50, 18], [14, -44, 16], [28, -20, 13], [30, 16, 15], [18, 42, 17], [-8, 50, 16], [-32, 38, 18], [-42, 8, 15]];
    for (const [x, y, r] of rocks) {
      c.fillStyle = "#6c6a5c";
      c.beginPath();
      c.ellipse(x, y, r, r * 0.8, (x + y) * 0.02, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "rgba(40,44,34,.55)";
      c.lineWidth = 2;
      c.stroke();
      c.fillStyle = "rgba(200,200,170,.24)";
      c.beginPath();
      c.ellipse(x - r * 0.25, y - r * 0.3, r * 0.45, r * 0.28, 0, 0, Math.PI * 2);
      c.fill();
    }
    // Vines.
    c.strokeStyle = "#3f7a34";
    c.lineWidth = 3;
    for (const [vx, vy, len] of [[-30, -44, 26], [-2, -52, 34], [22, -40, 20]]) {
      c.beginPath();
      c.moveTo(vx, vy);
      c.quadraticCurveTo(vx + 5, vy + len * 0.6, vx - 2, vy + len);
      c.stroke();
      c.fillStyle = "#5ea148";
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.ellipse(vx + 2 + i * 3, vy + (len * (i + 1)) / 3.5, 3, 5, 0.6, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.restore();
  }

  drawExitGate(c) {
    const p = this.track.pointAt(this.track.length - 100);
    c.save();
    c.translate(p.x - 6, p.y);
    // Stone wall.
    c.fillStyle = "#7e7a6b";
    c.beginPath();
    c.roundRect(-34, -38, 76, 78, 8);
    c.fill();
    c.strokeStyle = "rgba(40,40,30,.55)";
    c.lineWidth = 3;
    c.stroke();
    const blocks = [[-24, -28, 20, 14], [4, -30, 22, 15], [-24, -6, 18, 13], [2, -8, 20, 13], [-20, 16, 20, 13], [6, 16, 18, 13]];
    for (const [x, y, w, h] of blocks) {
      c.fillStyle = "#98927e";
      c.beginPath();
      c.roundRect(x, y, w, h, 3);
      c.fill();
      c.strokeStyle = "rgba(60,58,46,.35)";
      c.lineWidth = 1.5;
      c.stroke();
    }
    // Dark gate.
    c.fillStyle = "#20261d";
    c.beginPath();
    c.roundRect(-12, -2, 32, 42, [15, 15, 2, 2]);
    c.fill();
    c.strokeStyle = "#5f5a49";
    c.lineWidth = 3;
    c.stroke();
    // Red flag.
    c.strokeStyle = "#4c3f2a";
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(22, -38);
    c.lineTo(22, -72);
    c.stroke();
    c.fillStyle = "#e14b4b";
    c.beginPath();
    c.moveTo(23, -70);
    c.lineTo(46, -62);
    c.lineTo(23, -52);
    c.closePath();
    c.fill();
    c.fillStyle = "rgba(0,0,0,.2)";
    c.beginPath();
    c.moveTo(23, -70);
    c.lineTo(35, -66);
    c.lineTo(23, -52);
    c.closePath();
    c.fill();
    c.restore();
  }

  drawGroundItem(c, d, rng) {
    const { x, y } = d;
    if (d.kind === "tuft") {
      c.strokeStyle = "rgba(42,105,34,.65)";
      c.lineWidth = 1.4;
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(x, y);
        c.quadraticCurveTo(x + (i - 1) * 4, y - 5, x + (i - 1) * 7, y - 3 - d.r);
        c.stroke();
      }
    } else if (d.kind === "flower") {
      const colors = ["#fff6b8", "#ffd0e8", "#c9b3ff", "#ffffff"];
      const col = colors[Math.floor(d.hue * colors.length) % colors.length];
      c.strokeStyle = "rgba(40,100,30,.6)";
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x, y - 8);
      c.stroke();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        c.fillStyle = col;
        c.beginPath();
        c.ellipse(x + Math.cos(a) * 2.6, y - 8 + Math.sin(a) * 2.6, 2, 1.7, a, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = "#f0b83e";
      c.beginPath();
      c.arc(x, y - 8, 1.6, 0, Math.PI * 2);
      c.fill();
    } else {
      c.fillStyle = "rgba(120,95,60,.5)";
      c.beginPath();
      c.ellipse(x, y, d.r, d.r * 0.6, 0, 0, Math.PI * 2);
      c.fill();
    }
  }

  drawDecorShadow(c, d) {
    c.fillStyle = "rgba(24,60,20,0.26)";
    c.beginPath();
    c.ellipse(d.x + 6, d.y + 4, d.r * 1.05, d.r * 0.52, d.lean, 0, Math.PI * 2);
    c.fill();
  }

  drawTree(c, d, rng) {
    const { x, y, r } = d;
    const s = r / 30;
    // Trunk.
    c.fillStyle = "#6d4a2a";
    c.beginPath();
    c.roundRect(x - 4 * s, y - 8 * s, 8 * s, 20 * s, 3 * s);
    c.fill();
    c.strokeStyle = "rgba(50,30,12,.35)";
    c.lineWidth = 1.2;
    c.stroke();
    // Canopy clumps.
    const clumps = [[0, -32, 22], [-16, -18, 16], [17, -18, 15], [0, -12, 17]];
    for (const [cx, cy, cr] of clumps) {
      const g = c.createRadialGradient(x + cx * s - cr * s * 0.3, y + cy * s - cr * s * 0.35, 2, x + cx * s, y + cy * s, cr * s * 1.3);
      g.addColorStop(0, "#74b84a");
      g.addColorStop(0.6, "#4e9636");
      g.addColorStop(1, "#2f6f27");
      c.fillStyle = g;
      c.beginPath();
      c.arc(x + cx * s, y + cy * s, cr * s, 0, Math.PI * 2);
      c.fill();
    }
    // Leaf speckles.
    for (let i = 0; i < 7; i++) {
      const a = rng() * Math.PI * 2;
      const rr = rng() * 20 * s;
      c.fillStyle = "rgba(180,240,140,.3)";
      c.beginPath();
      c.arc(x + Math.cos(a) * rr, y - 24 * s + Math.sin(a) * rr, 1.6, 0, Math.PI * 2);
      c.fill();
    }
  }

  drawBush(c, d, rng) {
    const { x, y, r } = d;
    const s = r / 16;
    const g = c.createRadialGradient(x - r * 0.3, y - r * 0.5, 2, x, y, r * 1.4);
    g.addColorStop(0, "#7cc252");
    g.addColorStop(0.7, "#4e9838");
    g.addColorStop(1, "#347229");
    c.fillStyle = g;
    for (const [ox, oy, rr] of [[-9, 0, 10], [8, 0, 10], [0, -7, 12]]) {
      c.beginPath();
      c.arc(x + ox * s, y + oy * s, rr * s, 0, Math.PI * 2);
      c.fill();
    }
    for (let i = 0; i < 4; i++) {
      c.fillStyle = "rgba(200,250,160,.3)";
      c.beginPath();
      c.arc(x - 8 + rng() * 16, y - 8 + rng() * 8, 1.2, 0, Math.PI * 2);
      c.fill();
    }
    if (rng() < 0.6) {
      c.fillStyle = "#ff7ea8";
      c.beginPath();
      c.arc(x + 5, y - 8, 2.2, 0, Math.PI * 2);
      c.fill();
    }
  }

  drawRock(c, d) {
    const { x, y, r } = d;
    c.fillStyle = "#827c6b";
    c.beginPath();
    c.moveTo(x - r, y + r * 0.35);
    c.lineTo(x - r * 0.55, y - r * 0.8);
    c.lineTo(x + r * 0.3, y - r);
    c.lineTo(x + r, y - r * 0.2);
    c.lineTo(x + r * 0.6, y + r * 0.6);
    c.lineTo(x - r * 0.4, y + r * 0.7);
    c.closePath();
    c.fill();
    c.strokeStyle = "rgba(50,50,40,.4)";
    c.lineWidth = 1.4;
    c.stroke();
    c.fillStyle = "rgba(220,220,200,.28)";
    c.beginPath();
    c.ellipse(x - r * 0.25, y - r * 0.4, r * 0.4, r * 0.22, -0.4, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "rgba(90,120,60,.55)";
    c.beginPath();
    c.ellipse(x + r * 0.4, y + r * 0.45, r * 0.25, r * 0.1, 0.2, 0, Math.PI * 2);
    c.fill();
  }

  // ---------------------------------------------------------------- frame

  draw(game, time) {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const shake = game.shake || 0;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (this.bgFrame) ctx.drawImage(this.bgFrame, 0, 0);
    else ctx.clearRect(0, 0, cw, ch);
    ctx.setTransform(cw / W, 0, 0, ch / H, 0, 0);
    if (shake > 0.1) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }

    // Range/placement indicators under entities.
    if (game.placing && game.pointer) {
      const def = TOWER_BY_ID[game.placing];
      if (def) this.drawRange(ctx, game.pointer.x, game.pointer.y, towerStats(def, 0).range, game.placementValid ? "#8ce06b" : "#ff5c68", 0.13);
    }
    if (game.selected) {
      this.drawRange(ctx, game.selected.x, game.selected.y, game.selected.stats.range, "#ffcf5c", 0.1);
    }

    for (const b of game.balloons) if (b.type !== "moab") this.drawBalloon(ctx, b, time);
    for (const b of game.balloons) if (b.type === "moab") this.drawBalloon(ctx, b, time);
    for (const t of game.towers) this.drawTower(ctx, t, time);

    for (const p of game.projectiles) this.drawProjectile(ctx, p, time);
    this.drawEffects(ctx, game, time);

    for (const p of game.particles) this.drawParticle(ctx, p);
    for (const t of game.texts) this.drawText(ctx, t);

    if (game.selected) this.drawSelection(ctx, game.selected, time);
    if (game.placing && game.pointer) this.drawGhost(ctx, game, time);

    // Screen flash on life loss.
    if (game.damageFlash > 0) {
      ctx.fillStyle = `rgba(255, 40, 55, ${Math.min(0.4, game.damageFlash * 0.4)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  drawRange(ctx, x, y, range, color, alpha) {
    if (range > 3000) {
      ctx.save();
      ctx.setLineDash([10, 12]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = hexA(color, 0.32);
      ctx.strokeRect(10, 10, W - 20, H - 20);
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, range, 0, Math.PI * 2);
    ctx.fillStyle = hexA(color, alpha);
    ctx.fill();
    ctx.setLineDash([7, 7]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = hexA(color, 0.72);
    ctx.stroke();
    ctx.restore();
  }

  drawSelection(ctx, t, time) {
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(time * 0.8);
    ctx.setLineDash([5, 8]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255, 207, 92, 0.75)";
    ctx.beginPath();
    ctx.arc(0, 0, 31, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawGhost(ctx, game, time) {
    const def = TOWER_BY_ID[game.placing];
    if (!def) return;
    const p = game.pointer;
    ctx.save();
    ctx.globalAlpha = 0.62;
    this.drawTowerBody(ctx, def.id, 0, -Math.PI / 2, time, p.x, p.y, 1);
    ctx.restore();
    // Footprint.
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 26, 0, Math.PI * 2);
    ctx.strokeStyle = game.placementValid ? "rgba(190,255,160,.9)" : "rgba(255,110,120,.9)";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------- bloons

  drawBalloon(ctx, b, time) {
    const def = BLOONS[b.type];
    const r = b.radius;
    if (b.type === "moab") {
      this.drawMoab(ctx, b, time);
      return;
    }
    const bob = Math.sin(time * 3.1 + b.phase) * 1.6;
    const sway = Math.sin(time * 2.2 + b.phase) * 0.055;
    const spr = this.getBalloonSprite(b.type);

    // Ground shadow.
    ctx.fillStyle = "rgba(28,60,22,0.16)";
    ctx.beginPath();
    ctx.ellipse(b.x + 3, b.y + 7, r * 0.85, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // String.
    ctx.strokeStyle = "rgba(60,55,40,0.45)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(b.x + Math.sin(sway) * r * 0.3, b.y + r * 0.98);
    ctx.quadraticCurveTo(b.x + Math.sin(time * 2 + b.phase) * 5, b.y + r * 1.5, b.x + Math.sin(time * 1.5 + b.phase) * 7, b.y + r * 2.15);
    ctx.stroke();

    ctx.save();
    ctx.translate(b.x, b.y + bob);
    ctx.rotate(sway);
    ctx.drawImage(spr.body, -spr.cx, -spr.cy, spr.w, spr.h);
    if (b.hitFlash > 0) {
      ctx.globalAlpha = Math.min(0.85, b.hitFlash * 3);
      ctx.drawImage(spr.flash, -spr.cx, -spr.cy, spr.w, spr.h);
      ctx.globalAlpha = 1;
    }
    if (b.slowTimer > 0) {
      ctx.drawImage(spr.frost, -spr.cx, -spr.cy, spr.w, spr.h);
    }
    ctx.restore();

    if (b.maxHp > 1) this.drawHpBar(ctx, b.x, b.y - r * 1.35, r * 2.1, b.hp / b.maxHp);
  }

  getBalloonSprite(type) {
    if (this.spriteCache.has(type)) return this.spriteCache.get(type);
    const def = BLOONS[type];
    const r = def.radius;
    const S = 2;
    const padX = r * 0.28;
    const padTop = r * 0.22;
    const padBottom = r * 0.55;
    const w = r * 1.8 + padX * 2;
    const h = r * 2.2 + padTop + padBottom;
    const cx = w / 2;
    const cy = padTop + r * 1.1;

    const make = (draw) => {
      const cv = document.createElement("canvas");
      cv.width = Math.ceil(w * S);
      cv.height = Math.ceil(h * S);
      const c = cv.getContext("2d");
      c.scale(S, S);
      c.translate(cx, cy);
      draw(c);
      return cv;
    };

    const body = make((c) => {
      c.fillStyle = def.shade;
      c.beginPath();
      c.moveTo(-3.6, r * 0.88);
      c.lineTo(3.6, r * 0.88);
      c.lineTo(0, r * 1.14);
      c.closePath();
      c.fill();

      const g = c.createRadialGradient(-r * 0.35, -r * 0.48, r * 0.08, 0, 0, r * 1.15);
      if (def.pattern === "rainbow") {
        g.addColorStop(0, "#fff1c9");
        g.addColorStop(1, "#ff7ab8");
      } else if (def.pattern === "white") {
        g.addColorStop(0, "#ffffff");
        g.addColorStop(0.6, "#eef3fb");
        g.addColorStop(1, "#b9c7dd");
      } else if (def.pattern === "black") {
        g.addColorStop(0, "#7a8798");
        g.addColorStop(0.5, "#3b4553");
        g.addColorStop(1, "#161b23");
      } else {
        g.addColorStop(0, def.accent);
        g.addColorStop(0.42, def.color);
        g.addColorStop(1, def.shade);
      }
      c.beginPath();
      c.ellipse(0, 0, r * 0.9, r * 1.1, 0, 0, Math.PI * 2);
      c.fillStyle = g;
      c.fill();

      if (def.pattern === "zebra") {
        c.save();
        c.beginPath();
        c.ellipse(0, 0, r * 0.9, r * 1.1, 0, 0, Math.PI * 2);
        c.clip();
        c.fillStyle = "#20242b";
        for (let i = -3; i <= 3; i++) {
          c.save();
          c.translate(i * 6.5, 0);
          c.rotate(0.5);
          c.fillRect(-2, -r * 1.4, 3.2, r * 2.8);
          c.restore();
        }
        c.restore();
      } else if (def.pattern === "rainbow") {
        c.save();
        c.beginPath();
        c.ellipse(0, 0, r * 0.9, r * 1.1, 0, 0, Math.PI * 2);
        c.clip();
        const rg = c.createLinearGradient(-r, -r, r, r);
        rg.addColorStop(0, "#ff5d68");
        rg.addColorStop(0.22, "#ffb84d");
        rg.addColorStop(0.44, "#ffe94d");
        rg.addColorStop(0.62, "#69e06a");
        rg.addColorStop(0.8, "#5bb8ff");
        rg.addColorStop(1, "#c07bff");
        c.fillStyle = rg;
        c.fillRect(-r, -r, r * 2, r * 2);
        c.restore();
      } else if (def.pattern === "ceramic") {
        c.save();
        c.beginPath();
        c.ellipse(0, 0, r * 0.9, r * 1.1, 0, 0, Math.PI * 2);
        c.clip();
        c.strokeStyle = "rgba(90,52,22,.5)";
        c.lineWidth = 1.3;
        c.beginPath();
        c.moveTo(-r * 0.6, -r * 0.6);
        c.lineTo(-r * 0.2, -r * 0.2);
        c.lineTo(-r * 0.5, r * 0.15);
        c.moveTo(r * 0.55, -r * 0.7);
        c.lineTo(r * 0.2, -r * 0.3);
        c.lineTo(r * 0.55, r * 0.05);
        c.moveTo(-r * 0.1, r * 0.5);
        c.lineTo(r * 0.25, r * 0.65);
        c.stroke();
        c.restore();
      }

      const hl = c.createRadialGradient(-r * 0.34, -r * 0.5, 0.5, -r * 0.34, -r * 0.5, r * 0.62);
      hl.addColorStop(0, "rgba(255,255,255,0.85)");
      hl.addColorStop(0.5, "rgba(255,255,255,0.22)");
      hl.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = hl;
      c.beginPath();
      c.ellipse(-r * 0.3, -r * 0.42, r * 0.4, r * 0.5, -0.5, 0, Math.PI * 2);
      c.fill();

      c.strokeStyle = hexA(def.shade, 0.5);
      c.lineWidth = 1.2;
      c.beginPath();
      c.ellipse(0, 0, r * 0.9, r * 1.1, 0, 0, Math.PI * 2);
      c.stroke();
    });

    const flash = make((c) => {
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.ellipse(0, 0, r * 0.9, r * 1.1, 0, 0, Math.PI * 2);
      c.fill();
    });

    const frost = make((c) => {
      c.fillStyle = "rgba(160,235,255,0.28)";
      c.beginPath();
      c.ellipse(0, 0, r * 0.9, r * 1.1, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "rgba(230,252,255,0.75)";
      c.lineWidth = 1.1;
      c.beginPath();
      c.moveTo(-r * 0.5, -r * 0.2);
      c.lineTo(-r * 0.25, 0);
      c.lineTo(-r * 0.5, r * 0.3);
      c.moveTo(r * 0.45, -r * 0.45);
      c.lineTo(r * 0.2, -r * 0.1);
      c.lineTo(r * 0.5, r * 0.1);
      c.stroke();
      c.strokeStyle = "rgba(210,248,255,0.5)";
      c.beginPath();
      c.ellipse(0, 0, r * 0.9, r * 1.1, 0, 0, Math.PI * 2);
      c.stroke();
    });

    const spr = { body, flash, frost, w, h, cx, cy };
    this.spriteCache.set(type, spr);
    return spr;
  }

  drawMoab(ctx, b, time) {
    const r = b.radius;
    const angle = b.heading || 0;
    ctx.save();
    ctx.fillStyle = "rgba(28,60,22,0.2)";
    ctx.beginPath();
    ctx.ellipse(b.x + 5, b.y + 24, 55, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(b.x, b.y);
    ctx.rotate(angle);
    const g = ctx.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, "#d5dde8");
    g.addColorStop(0.35, "#a7b2c0");
    g.addColorStop(0.75, "#77818f");
    g.addColorStop(1, "#4f5968");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.6, r * 0.86, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(45,52,64,.6)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Nose cap.
    ctx.fillStyle = "#b7c2d0";
    ctx.beginPath();
    ctx.ellipse(r * 1.14, 0, r * 0.5, r * 0.66, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.35)";
    ctx.stroke();

    // Fins.
    ctx.fillStyle = "#5b6675";
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-r * 1.3, 0);
      ctx.lineTo(-r * 1.7, s * r * 0.8);
      ctx.lineTo(-r * 1.05, s * r * 0.45);
      ctx.closePath();
      ctx.fill();
    }

    // Stripes.
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.58, r * 0.84, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "rgba(214,64,68,.85)";
    ctx.fillRect(-r * 0.45, -r, r * 0.22, r * 2);
    ctx.fillRect(r * 0.05, -r, r * 0.12, r * 2);
    ctx.fillStyle = "rgba(255,255,255,.12)";
    ctx.fillRect(-r * 1.6, -r * 0.72, r * 3.2, r * 0.22);
    ctx.restore();

    // Rivets.
    ctx.fillStyle = "rgba(50,58,70,.6)";
    for (let i = -5; i <= 5; i++) {
      ctx.beginPath();
      ctx.arc(i * 8.5, r * 0.5, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyes.
    ctx.fillStyle = "#242b35";
    ctx.beginPath();
    ctx.ellipse(r * 0.68, -r * 0.18, 7.5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    const eyeGlow = 0.55 + Math.sin(time * 4) * 0.25;
    ctx.fillStyle = `rgba(255,90,80,${eyeGlow})`;
    ctx.beginPath();
    ctx.arc(r * 0.7, -r * 0.18, 3, 0, Math.PI * 2);
    ctx.fill();

    // Propeller.
    ctx.strokeStyle = "rgba(80,90,104,.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 1.55, 0);
    ctx.lineTo(-r * 1.8, 0);
    ctx.stroke();
    ctx.save();
    ctx.translate(-r * 1.82, 0);
    ctx.rotate(time * 14);
    ctx.fillStyle = "rgba(220,228,238,.6)";
    ctx.fillRect(-1.6, -10, 3.2, 20);
    ctx.restore();

    if (b.hitFlash > 0) {
      ctx.globalAlpha = Math.min(0.6, b.hitFlash * 2.5);
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.6, r * 0.86, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    this.drawHpBar(ctx, b.x, b.y - 42, 78, b.hp / b.maxHp, "#ff6c6c");
    // Label.
    ctx.fillStyle = "rgba(255,246,223,.85)";
    ctx.font = "800 9px 'Trebuchet MS', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("MOAB", b.x, b.y - 48);
  }

  drawHpBar(ctx, x, y, w, frac, color = "#7be36b") {
    const h = 4;
    ctx.fillStyle = "rgba(20,28,20,.65)";
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y, w, h, 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y, Math.max(1, w * Math.max(0, frac)), h, 2);
    ctx.fill();
  }

  balloonGradient(ctx, type, r) {
    const key = type + ":" + Math.round(r);
    if (this.balloonGrads.has(key)) return this.balloonGrads.get(key);
    const def = BLOONS[type];
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.48, r * 0.08, 0, 0, r * 1.15);
    if (def.pattern === "rainbow") {
      g.addColorStop(0, "#fff1c9");
      g.addColorStop(1, "#ff7ab8");
    } else if (def.pattern === "white") {
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.6, "#eef3fb");
      g.addColorStop(1, "#b9c7dd");
    } else if (def.pattern === "black") {
      g.addColorStop(0, "#7a8798");
      g.addColorStop(0.5, "#3b4553");
      g.addColorStop(1, "#161b23");
    } else {
      g.addColorStop(0, def.accent);
      g.addColorStop(0.42, def.color);
      g.addColorStop(1, def.shade);
    }
    this.balloonGrads.set(key, g);
    return g;
  }

  // ---------------------------------------------------------------- towers

  drawTower(ctx, t, time) {
    ctx.save();
    ctx.fillStyle = "rgba(20,48,16,0.24)";
    ctx.beginPath();
    ctx.ellipse(t.x + 4, t.y + 9, 28, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    this.drawTowerBody(ctx, t.def.id, t.level, t.angle, time, t.x, t.y, 1.08, t.flash > 0);
  }

  drawTowerBody(ctx, id, level, angle, time, x, y, scale, flash = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Platform.
    const base = ctx.createRadialGradient(-6, -8, 3, 0, 0, 27);
    base.addColorStop(0, "#9a7549");
    base.addColorStop(0.7, "#715030");
    base.addColorStop(1, "#48311c");
    ctx.fillStyle = base;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3a2715";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,232,184,.3)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 19.5, 0, Math.PI * 2);
    ctx.stroke();

    // Plank grain.
    ctx.strokeStyle = "rgba(50,30,12,.24)";
    ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, 12 + i * 4, 0.35, Math.PI - 0.35);
      ctx.stroke();
    }

    // Bolts.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      ctx.fillStyle = "#c9a96a";
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 21, Math.sin(a) * 21, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(60,40,18,.55)";
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 21 + 0.5, Math.sin(a) * 21 + 0.5, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Level pips.
    for (let i = 0; i < level; i++) {
      ctx.fillStyle = "#ffcf5c";
      ctx.strokeStyle = "rgba(80,55,10,.6)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(-8 + i * 8, 20, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    switch (id) {
      case "dart": this.artDart(ctx, angle, flash); break;
      case "tack": this.artTack(ctx, time, flash, level); break;
      case "boomerang": this.artBoomerang(ctx, angle, time, flash); break;
      case "bomb": this.artBomb(ctx, angle, flash); break;
      case "ice": this.artIce(ctx, time, level); break;
      case "sniper": this.artSniper(ctx, angle, flash); break;
      case "ninja": this.artNinja(ctx, angle, time, level); break;
      case "wizard": this.artWizard(ctx, angle, time, level); break;
      case "super": this.artSuper(ctx, angle, time, level); break;
    }
    ctx.restore();
  }

  artMonkey(ctx, fur = "#8a5732", accent = "#5ad0ff", angle = 0) {
    // Body.
    ctx.fillStyle = fur;
    ctx.strokeStyle = "rgba(45,24,10,.45)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, 5, 12.5, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Ears.
    for (const s of [-1, 1]) {
      ctx.fillStyle = fur;
      ctx.beginPath();
      ctx.arc(s * 11, -9, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e8b986";
      ctx.beginPath();
      ctx.arc(s * 11, -9, 2.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Head.
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.arc(0, -8, 11.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Face.
    ctx.fillStyle = "#f0c68e";
    ctx.beginPath();
    ctx.ellipse(0, -6.2, 7.6, 7.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes.
    const lookX = Math.cos(angle) * 1.5;
    const lookY = Math.sin(angle) * 1.2;
    for (const s of [-1, 1]) {
      ctx.fillStyle = "#fffaf0";
      ctx.beginPath();
      ctx.arc(s * 3.4, -9.2, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#202018";
      ctx.beginPath();
      ctx.arc(s * 3.4 + lookX, -9.2 + lookY, 1.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.9)";
      ctx.beginPath();
      ctx.arc(s * 3.4 + lookX - 0.5, -9.2 + lookY - 0.6, 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    // Nostrils + smile.
    ctx.fillStyle = "rgba(110,65,30,.55)";
    ctx.beginPath();
    ctx.arc(-1.3, -5, 0.7, 0, Math.PI * 2);
    ctx.arc(1.3, -5, 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(90,50,20,.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, -3.4, 2.6, 0.25, Math.PI - 0.25);
    ctx.stroke();

    // Headband.
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.roundRect(-11, -16, 22, 4.4, 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(20,40,60,.5)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // Band tails.
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(10, -15);
    ctx.lineTo(18, -13);
    ctx.lineTo(10, -11);
    ctx.closePath();
    ctx.fill();
  }

  armAndDart(ctx, angle, color = "#d8dde6") {
    ctx.save();
    ctx.rotate(angle);
    // Arm.
    ctx.fillStyle = "#8a5732";
    ctx.beginPath();
    ctx.ellipse(10, 0, 6, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Dart.
    ctx.fillStyle = "#7d5a34";
    ctx.beginPath();
    ctx.roundRect(12, -1.6, 17, 3.2, 1.4);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(29, -3.2);
    ctx.lineTo(36, 0);
    ctx.lineTo(29, 3.2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ff6b6b";
    ctx.beginPath();
    ctx.moveTo(13, -1.6);
    ctx.lineTo(18, -5);
    ctx.lineTo(19, -1.6);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(13, 1.6);
    ctx.lineTo(18, 5);
    ctx.lineTo(19, 1.6);
    ctx.closePath();
    ctx.fill();
    // Hand.
    ctx.fillStyle = "#e8b986";
    ctx.beginPath();
    ctx.arc(13.5, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  artDart(ctx, angle, flash) {
    this.artMonkey(ctx, "#8a5732", "#5ad0ff", angle);
    this.armAndDart(ctx, angle);
    if (flash) this.muzzle(ctx, angle, 34, "#b8f0ff");
  }

  artTack(ctx, time, flash, level) {
    ctx.save();
    ctx.rotate(time * 0.35);
    // Spikes.
    const count = 8 + level * 2;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      ctx.save();
      ctx.rotate(a);
      ctx.fillStyle = "#c9d2dd";
      ctx.beginPath();
      ctx.moveTo(14, -3.2);
      ctx.lineTo(26, 0);
      ctx.lineTo(14, 3.2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(60,70,84,.6)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();
    }
    // Disc.
    ctx.fillStyle = "#3f4854";
    ctx.beginPath();
    ctx.arc(0, 0, 15.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#222a33";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = "#596676";
    ctx.beginPath();
    ctx.arc(-3, -4, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffcf5c";
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8e6514";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    if (flash) {
      ctx.fillStyle = "rgba(255,220,150,.28)";
      ctx.beginPath();
      ctx.arc(0, 0, 25, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  artBoomerang(ctx, angle, time, flash) {
    this.artMonkey(ctx, "#a0683a", "#ffd35c", angle);
    ctx.save();
    ctx.rotate(angle);
    // Hand + boomerang.
    ctx.fillStyle = "#e8b986";
    ctx.beginPath();
    ctx.arc(13, 0, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(24, 0);
    ctx.rotate(time * 1.5);
    ctx.strokeStyle = "#e9b64a";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-7, -7);
    ctx.quadraticCurveTo(4, 0, -7, 7);
    ctx.stroke();
    ctx.strokeStyle = "rgba(120,75,15,.55)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-7, -7);
    ctx.quadraticCurveTo(4, 0, -7, 7);
    ctx.stroke();
    ctx.restore();
    if (flash) this.muzzle(ctx, angle, 30, "#ffe9a8");
  }

  artBomb(ctx, angle, flash) {
    // Wheels.
    for (const s of [-1, 1]) {
      ctx.fillStyle = "#2c3138";
      ctx.beginPath();
      ctx.arc(s * 9, 8, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#7a8494";
      ctx.beginPath();
      ctx.arc(s * 9, 8, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    ctx.rotate(angle);
    // Barrel.
    const g = ctx.createLinearGradient(0, -8, 0, 8);
    g.addColorStop(0, "#5c6674");
    g.addColorStop(0.5, "#333b46");
    g.addColorStop(1, "#1b2129");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(-8, -8, 34, 16, 6);
    ctx.fill();
    ctx.strokeStyle = "#141920";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#d65252";
    ctx.fillRect(18, -8, 4, 16);
    ctx.fillStyle = "#262c35";
    ctx.beginPath();
    ctx.ellipse(26, 0, 4, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#596270";
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Fuse.
    ctx.strokeStyle = "#a9906b";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-8, -4);
    ctx.quadraticCurveTo(-16, -10, -18, -3);
    ctx.stroke();
    if (flash) this.muzzle(ctx, angle, 28, "#ffb45c");
  }

  artIce(ctx, time, level) {
    const pulse = 0.5 + Math.sin(time * 3) * 0.2;
    ctx.fillStyle = "rgba(155,231,255,0.16)";
    ctx.beginPath();
    ctx.arc(0, 0, 21, 0, Math.PI * 2);
    ctx.fill();
    // Snow mound.
    ctx.fillStyle = "#eaf9ff";
    ctx.beginPath();
    ctx.ellipse(0, 7, 17, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(150,210,235,.45)";
    ctx.beginPath();
    ctx.ellipse(7, 9, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Crystals.
    const crystals = [
      [0, -16, 9, 22, "#bff2ff"],
      [-10, -9, 5, 13, "#8fdcf7"],
      [10, -8, 5, 14, "#a9e8ff"],
    ];
    for (const [cx, cy, w, h, col] of crystals) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(cx, cy - h / 2);
      ctx.lineTo(cx + w / 2, cy + h / 2);
      ctx.lineTo(cx, cy + h / 2 - 3);
      ctx.lineTo(cx - w / 2, cy + h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(70,150,190,.5)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.7)";
      ctx.beginPath();
      ctx.moveTo(cx, cy - h / 2 + 2);
      ctx.lineTo(cx - 1.5, cy + 2);
      ctx.lineTo(cx + 1.5, cy + 1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = `rgba(190,245,255,${0.1 + pulse * 0.15})`;
    ctx.beginPath();
    ctx.arc(0, -4, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  artSniper(ctx, angle, flash) {
    this.artMonkey(ctx, "#6f7a42", "#9fe870", angle);
    // Cap.
    ctx.fillStyle = "#4d5c2d";
    ctx.beginPath();
    ctx.ellipse(0, -16, 10.5, 5, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-10.5, -16, 21, 2.2);
    ctx.fillStyle = "#39461f";
    ctx.beginPath();
    ctx.ellipse(4, -14, 9, 2.4, 0.08, 0, Math.PI * 2);
    ctx.fill();
    // Rifle.
    ctx.save();
    ctx.rotate(angle);
    ctx.fillStyle = "#6e4a28";
    ctx.beginPath();
    ctx.roundRect(4, -2.4, 14, 5, 2);
    ctx.fill();
    ctx.fillStyle = "#2f343c";
    ctx.beginPath();
    ctx.roundRect(16, -2, 22, 3.6, 1.5);
    ctx.fill();
    ctx.fillStyle = "#1e2228";
    ctx.beginPath();
    ctx.roundRect(14, -4.5, 7, 2.5, 1);
    ctx.fill();
    ctx.fillStyle = "#8fe0ff";
    ctx.beginPath();
    ctx.arc(18, -4.2, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (flash) this.muzzle(ctx, angle, 39, "#ffd98a");
  }

  artNinja(ctx, angle, time, level) {
    // Scarf.
    ctx.strokeStyle = "#d24b4b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(3, -8);
    ctx.quadraticCurveTo(-12 - Math.sin(time * 4) * 3, -2, -20 - Math.sin(time * 4) * 4, 4);
    ctx.stroke();
    ctx.fillStyle = "#4a3f6e";
    ctx.beginPath();
    ctx.ellipse(0, 4, 12.5, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2b2442";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // Head.
    ctx.fillStyle = "#332c4d";
    ctx.beginPath();
    ctx.arc(0, -8, 11.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Mask.
    ctx.fillStyle = "#221d35";
    ctx.beginPath();
    ctx.ellipse(0, -6, 9.5, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eyes.
    for (const s of [-1, 1]) {
      ctx.fillStyle = "#ff8d6e";
      ctx.beginPath();
      ctx.ellipse(s * 4, -9, 2.4, 1.5, s * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    // Headband knot.
    ctx.fillStyle = "#d24b4b";
    ctx.fillRect(-11, -15.5, 22, 2.4);
    // Shuriken.
    ctx.save();
    ctx.rotate(angle);
    ctx.translate(15, 0);
    ctx.rotate(time * 6);
    ctx.fillStyle = "#c9d2dd";
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(2.6, -2.4);
      ctx.lineTo(0, 0);
      ctx.lineTo(-2.6, -2.4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "#59636f";
    ctx.beginPath();
    ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (level >= 3) {
      ctx.save();
      ctx.rotate(angle + Math.PI);
      ctx.translate(15, 0);
      ctx.rotate(-time * 6);
      ctx.fillStyle = "#c9d2dd";
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(2.6, -2.4);
        ctx.lineTo(0, 0);
        ctx.lineTo(-2.6, -2.4);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  artWizard(ctx, angle, time, level) {
    // Robe.
    ctx.fillStyle = "#5f3f92";
    ctx.beginPath();
    ctx.moveTo(-13, 14);
    ctx.lineTo(-7, -8);
    ctx.lineTo(7, -8);
    ctx.lineTo(13, 14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#3a245c";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // Stars on robe.
    ctx.fillStyle = "rgba(255,214,92,.8)";
    for (const [sx, sy] of [[-5, 5], [4, 8], [0, 0]]) {
      this.drawStar(ctx, sx, sy, 2.2, 4);
    }
    // Face.
    ctx.fillStyle = "#f0c68e";
    ctx.beginPath();
    ctx.arc(0, -12, 8.5, 0, Math.PI * 2);
    ctx.fill();
    // Beard.
    ctx.fillStyle = "#e8e4d8";
    ctx.beginPath();
    ctx.moveTo(-7, -9);
    ctx.quadraticCurveTo(0, 2, 7, -9);
    ctx.quadraticCurveTo(4, -3, 0, -4);
    ctx.quadraticCurveTo(-4, -3, -7, -9);
    ctx.fill();
    // Eyes.
    for (const s of [-1, 1]) {
      ctx.fillStyle = "#2a2340";
      ctx.beginPath();
      ctx.arc(s * 3, -13, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Hat.
    ctx.fillStyle = "#4d3278";
    ctx.beginPath();
    ctx.moveTo(-12, -18);
    ctx.lineTo(0, -40);
    ctx.lineTo(12, -18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#2f1d4c";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = "#3a2560";
    ctx.beginPath();
    ctx.ellipse(0, -18, 15, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffcf5c";
    this.drawStar(ctx, 0, -28, 2.4, 4.5);
    if (level >= 1) this.drawStar(ctx, 7, -21, 1.5, 3);
    // Staff with orb.
    ctx.save();
    ctx.rotate(angle);
    ctx.strokeStyle = "#7a5835";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(6, 4);
    ctx.lineTo(26, 0);
    ctx.stroke();
    const glow = 0.6 + Math.sin(time * 4) * 0.25;
    ctx.fillStyle = `rgba(199,139,255,${glow})`;
    ctx.beginPath();
    ctx.arc(28, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.85)";
    ctx.beginPath();
    ctx.arc(26.7, -1.5, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  artSuper(ctx, angle, time, level) {
    // Cape.
    ctx.fillStyle = "#d63d4b";
    ctx.beginPath();
    ctx.moveTo(-2, -16);
    ctx.quadraticCurveTo(-24 - Math.sin(time * 3) * 3, 0, -20 - Math.sin(time * 3) * 4, 20);
    ctx.lineTo(3, 14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(110,20,30,.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
    // Suit.
    ctx.fillStyle = "#2f6cc4";
    ctx.beginPath();
    ctx.ellipse(0, 4, 12.5, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffcf5c";
    ctx.beginPath();
    ctx.moveTo(-5, -2);
    ctx.lineTo(0, 6);
    ctx.lineTo(5, -2);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    // Head (monkey).
    ctx.fillStyle = "#8a5732";
    ctx.beginPath();
    ctx.arc(0, -9, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f0c68e";
    ctx.beginPath();
    ctx.ellipse(0, -7, 7.4, 7.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Mask.
    ctx.fillStyle = "#2f6cc4";
    ctx.beginPath();
    ctx.roundRect(-10, -17, 20, 6, 3);
    ctx.fill();
    // Glowing eyes.
    const glow = 0.7 + Math.sin(time * 6) * 0.2;
    for (const s of [-1, 1]) {
      ctx.fillStyle = `rgba(255,235,120,${glow})`;
      ctx.beginPath();
      ctx.ellipse(s * 3.3, -9.6, 2.4, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.9)";
      ctx.beginPath();
      ctx.arc(s * 3.3, -9.8, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    ctx.rotate(angle);
    ctx.fillStyle = "#ffcf5c";
    ctx.beginPath();
    ctx.arc(14, 0, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Level aura.
    if (level >= 3) {
      ctx.strokeStyle = `rgba(255,220,100,${0.35 + Math.sin(time * 5) * 0.15})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawStar(ctx, x, y, inner, outer, points = 5) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 ? inner : outer;
      const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  }

  muzzle(ctx, angle, dist, color) {
    ctx.save();
    ctx.rotate(angle);
    const g = ctx.createRadialGradient(dist, 0, 1, dist, 0, 14);
    g.addColorStop(0, "rgba(255,255,255,.95)");
    g.addColorStop(0.35, hexA(color, 0.8));
    g.addColorStop(1, "rgba(255,200,80,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(dist, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------- projectiles & fx

  drawProjectile(ctx, p, time) {
    if (p.kind === "bomb") {
      const pos = bombPos(p);
      const f = Math.min(1, p.t);
      const groundY = p.sy + (p.ty - p.sy) * f + 8;
      ctx.save();
      ctx.fillStyle = "rgba(20,40,16,.22)";
      ctx.beginPath();
      ctx.ellipse(pos.x, groundY, 5, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(p.spin);
      ctx.fillStyle = "#232a33";
      ctx.beginPath();
      ctx.arc(0, 0, 5.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#586375";
      ctx.beginPath();
      ctx.arc(-1.4, -1.6, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#b8996a";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(3, -3.5);
      ctx.quadraticCurveTo(7, -7, 4, -9);
      ctx.stroke();
      ctx.fillStyle = "#ffd45c";
      ctx.beginPath();
      ctx.arc(4, -9.5, 1.6 + Math.sin(time * 20) * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(p.x, p.y);
    const ang = Math.atan2(p.vy, p.vx);

    if (p.kind === "dart") {
      ctx.rotate(ang);
      ctx.fillStyle = "#6f4e2c";
      ctx.beginPath();
      ctx.roundRect(-8, -1.4, 13, 2.8, 1);
      ctx.fill();
      ctx.fillStyle = "#e8edf4";
      ctx.beginPath();
      ctx.moveTo(5, -2.6);
      ctx.lineTo(10, 0);
      ctx.lineTo(5, 2.6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#5ac8ff";
      ctx.beginPath();
      ctx.moveTo(-8, -1.4);
      ctx.lineTo(-11, -3.8);
      ctx.lineTo(-6, -1.4);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-8, 1.4);
      ctx.lineTo(-11, 3.8);
      ctx.lineTo(-6, 1.4);
      ctx.closePath();
      ctx.fill();
    } else if (p.kind === "tack") {
      ctx.rotate(p.spin || ang);
      ctx.fillStyle = "#c2cbd6";
      ctx.beginPath();
      ctx.moveTo(0, -5.5);
      ctx.lineTo(1.8, 2);
      ctx.lineTo(-1.8, 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(60,70,84,.7)";
      ctx.lineWidth = 0.7;
      ctx.stroke();
    } else if (p.kind === "boomerang") {
      ctx.rotate(p.spin);
      ctx.strokeStyle = "#e8b64a";
      ctx.lineWidth = 4.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-7, -6);
      ctx.quadraticCurveTo(4, 0, -7, 6);
      ctx.stroke();
      ctx.strokeStyle = "rgba(110,70,15,.6)";
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-7, -6);
      ctx.quadraticCurveTo(4, 0, -7, 6);
      ctx.stroke();
    } else if (p.kind === "magic") {
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 9);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.3, "#d9a6ff");
      g.addColorStop(1, "rgba(160,80,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#b96bff";
      ctx.beginPath();
      ctx.arc(0, 0, 3.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === "laser") {
      ctx.rotate(ang);
      const g = ctx.createLinearGradient(-16, 0, 8, 0);
      g.addColorStop(0, "rgba(255,220,80,0)");
      g.addColorStop(0.5, "#ffe066");
      g.addColorStop(1, "#fffbe0");
      ctx.strokeStyle = g;
      ctx.lineWidth = 3.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-15, 0);
      ctx.lineTo(8, 0);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawEffects(ctx, game, time) {
    for (const e of game.effects) {
      if (e.kind === "ring") {
        const f = 1 - e.life / e.maxLife;
        const r = e.r0 + (e.r1 - e.r0) * easeOut(f);
        ctx.strokeStyle = hexA(e.color, (1 - f) * 0.8);
        ctx.lineWidth = e.width * (1 - f * 0.6);
        ctx.beginPath();
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
        ctx.stroke();
        if (e.fill) {
          ctx.fillStyle = hexA(e.color, (1 - f) * 0.12);
          ctx.beginPath();
          ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (e.kind === "explosion") {
        const f = 1 - e.life / e.maxLife;
        const r = e.r * easeOut(f);
        const g = ctx.createRadialGradient(e.x, e.y, 1, e.x, e.y, Math.max(2, r));
        g.addColorStop(0, `rgba(255,255,220,${(1 - f) * 0.9})`);
        g.addColorStop(0.4, `rgba(255,180,60,${(1 - f) * 0.5})`);
        g.addColorStop(1, "rgba(255,90,30,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(e.x, e.y, Math.max(2, r), 0, Math.PI * 2);
        ctx.fill();
      } else if (e.kind === "tracer") {
        const a = Math.max(0, e.life / e.maxLife);
        ctx.strokeStyle = `rgba(255, 240, 170, ${a * 0.9})`;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(e.x1, e.y1);
        ctx.lineTo(e.x2, e.y2);
        ctx.stroke();
        ctx.strokeStyle = `rgba(255, 255, 255, ${a * 0.7})`;
        ctx.lineWidth = 0.9;
        ctx.stroke();
      } else if (e.kind === "text") {
        // handled in texts
      }
    }
    // Ice frost sparkles around chilled bloons.
    for (const b of game.balloons) {
      if (b.slowTimer > 0 && b.type !== "moab") {
        for (let i = 0; i < 2; i++) {
          const a = time * 2 + b.phase + i * 2.4;
          ctx.fillStyle = "rgba(220,250,255,.55)";
          ctx.beginPath();
          ctx.arc(b.x + Math.cos(a) * 12, b.y + Math.sin(a) * 16, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  drawParticle(ctx, p) {
    const f = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = Math.min(1, f * 1.6);
    ctx.fillStyle = p.color;
    if (p.shape === "spark") {
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + f * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawText(ctx, t) {
    const f = Math.max(0, t.life / t.maxLife);
    ctx.save();
    ctx.globalAlpha = Math.min(1, f * 1.8);
    ctx.font = t.big ? "900 20px 'Trebuchet MS', sans-serif" : "800 13px 'Trebuchet MS', sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(20,30,15,.65)";
    const y = t.y - (1 - f) * 26;
    ctx.strokeText(t.text, t.x, y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, y);
    ctx.restore();
  }
}

function bombPos(p) {
  const f = p.t;
  const x = p.sx + (p.tx - p.sx) * f;
  const y = p.sy + (p.ty - p.sy) * f;
  return { x, y: y - Math.sin(f * Math.PI) * p.arcHeight };
}

export { bombPos };

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function hexA(hex, a) {
  if (hex.startsWith("rgba")) return hex;
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
