/* =========================================================
   BLOONS TD 5 — SUNSET GROVE
   Hand-drawn jungle scenery.
   ========================================================= */
(() => {
  "use strict";
  const BTD = (window.BTD = window.BTD || {});
  const { TAU, roundRect } = BTD;
  const { ellipse, star } = BTD.Art;

  function drawTree(ctx, x, y, s, rng, palm = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = "rgba(20, 42, 15, .22)";
    ellipse(ctx, 15, 2, 27, 8);

    if (palm) {
      ctx.strokeStyle = "#74502d";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-4, -40, 7, -76);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 218, 143, .18)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-1, -2);
      ctx.quadraticCurveTo(-5, -40, 6, -73);
      ctx.stroke();
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI * 0.95 + (i / 6) * Math.PI * 0.92;
        const tx = 7 + Math.cos(a) * 37;
        const ty = -75 + Math.sin(a) * 22;
        const grad = ctx.createLinearGradient(7, -75, tx, ty);
        grad.addColorStop(0, "#2d7a37");
        grad.addColorStop(1, "#57a949");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 7;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(7, -75);
        ctx.quadraticCurveTo((7 + tx) / 2 + rng() * 6, (ty - 75) / 2 - 8, tx, ty + 5);
        ctx.stroke();
        ctx.strokeStyle = "rgba(178, 231, 111, .24)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.fillStyle = "#8c5d2c";
      ellipse(ctx, 0, -1, 7, 3.5);
      ctx.restore();
      return;
    }

    // Trunk with roots
    ctx.fillStyle = "#72502e";
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.quadraticCurveTo(-3, -22, -4, -45);
    ctx.lineTo(4, -45);
    ctx.quadraticCurveTo(3, -21, 6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(52, 34, 19, .4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-1, -1);
    ctx.lineTo(-1, -42);
    ctx.stroke();
    ctx.fillStyle = "#6a4a2b";
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(-13, 3);
    ctx.lineTo(-4, 4);
    ctx.lineTo(0, 1);
    ctx.lineTo(4, 4);
    ctx.lineTo(13, 2);
    ctx.lineTo(5, 0);
    ctx.closePath();
    ctx.fill();

    // Canopy clusters
    const blobs = [
      [-17, -57, 20],
      [15, -59, 22],
      [-2, -77, 25],
      [-26, -75, 17],
      [26, -78, 18],
      [0, -92, 16]
    ];
    // Dark silhouette
    ctx.fillStyle = "#1e5a2b";
    for (const [bx, by, br] of blobs) {
      ellipse(ctx, bx + 2, by + 5, br + 2, br * 0.92 + 2);
    }
    for (let i = 0; i < blobs.length; i++) {
      const [bx, by, br] = blobs[i];
      const grad = ctx.createRadialGradient(bx - br * 0.3, by - br * 0.38, 2, bx, by, br * 1.06);
      grad.addColorStop(0, i % 2 ? "#79bf52" : "#69b349");
      grad.addColorStop(0.55, i % 2 ? "#478f3a" : "#3f8636");
      grad.addColorStop(1, "#266b2d");
      ctx.fillStyle = grad;
      ellipse(ctx, bx, by, br, br * 0.88);
    }
    // Leaf glints
    ctx.fillStyle = "rgba(190, 235, 116, .25)";
    for (let i = 0; i < 18; i++) {
      const a = rng() * TAU;
      const rr = rng() * 31;
      ellipse(ctx, Math.cos(a) * rr - 2, -73 + Math.sin(a) * rr * 0.55, 1.3 + rng() * 2, 0.9 + rng());
    }
    ctx.restore();
  }

  function drawBush(ctx, x, y, s, rng, berries = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = "rgba(26, 55, 18, .18)";
    ellipse(ctx, 3, 2, 22, 6);
    const lobes = [
      [-13, -8, 10],
      [0, -13, 12],
      [13, -7, 9],
      [-4, -5, 11],
      [7, -4, 10]
    ];
    ctx.fillStyle = "#2f7132";
    for (const [bx, by, br] of lobes) ellipse(ctx, bx, by + 2, br + 1, br * 0.9 + 1);
    for (let i = 0; i < lobes.length; i++) {
      const [bx, by, br] = lobes[i];
      const g = ctx.createRadialGradient(bx - 3, by - 4, 1, bx, by, br);
      g.addColorStop(0, "#83c95e");
      g.addColorStop(0.55, "#51a044");
      g.addColorStop(1, "#2d7532");
      ctx.fillStyle = g;
      ellipse(ctx, bx, by, br, br * 0.86);
    }
    if (berries) {
      ctx.fillStyle = "#db4c42";
      for (let i = 0; i < 4; i++) {
        ellipse(ctx, -10 + i * 7 + rng() * 3, -8 - rng() * 5, 1.8, 1.8);
      }
      ctx.fillStyle = "rgba(255,255,255,.5)";
      for (let i = 0; i < 3; i++) ellipse(ctx, -9 + i * 7, -8.5 - i, 0.6, 0.5);
    }
    ctx.restore();
  }

  function drawFlower(ctx, x, y, s, rng) {
    const colors = ["#ffe16c", "#ff8a8a", "#d7a4ff", "#fff3e5", "#ffb04f"];
    const color = colors[(rng() * colors.length) | 0];
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.strokeStyle = "#3c7b33";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-1.5, -5, 0, -9);
    ctx.stroke();
    ctx.fillStyle = "#55a342";
    ellipse(ctx, -2.5, -3.5, 2.3, 1.1);
    ctx.fillStyle = color;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + rng() * 0.4;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 3, -9 + Math.sin(a) * 3, 2.3, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = "#f5b62e";
    ellipse(ctx, 0, -9, 1.5, 1.5);
    ctx.restore();
  }

  function drawRock(ctx, x, y, s, rng) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = "rgba(25, 42, 19, .2)";
    ellipse(ctx, 2, 1, 11, 3.5);
    const g = ctx.createLinearGradient(0, -9, 0, 1);
    g.addColorStop(0, "#a6a795");
    g.addColorStop(0.55, "#7d806f");
    g.addColorStop(1, "#575c4d");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.lineTo(-7, -6);
    ctx.lineTo(-2, -9 + rng() * 1.5);
    ctx.lineTo(5, -8);
    ctx.lineTo(9, -2);
    ctx.lineTo(6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(57, 62, 50, .45)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 251, 226, .18)";
    ctx.beginPath();
    ctx.moveTo(-6, -6);
    ctx.lineTo(-2, -8);
    ctx.lineTo(3, -6.4);
    ctx.lineTo(-1, -5);
    ctx.closePath();
    ctx.fill();
    if (rng() < 0.55) {
      ctx.fillStyle = "#5a8c3d";
      ellipse(ctx, 6, -3, 3.3, 1.7);
      ellipse(ctx, 8, -4, 2, 1.2);
    }
    ctx.restore();
  }

  function drawGrassTuft(ctx, x, y, s, rng, flip = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip ? -s : s, s);
    ctx.strokeStyle = rng() < 0.45 ? "rgba(45, 107, 39, .8)" : "rgba(110, 161, 61, .75)";
    ctx.lineWidth = 1.3;
    ctx.lineCap = "round";
    for (let i = 0; i < 5; i++) {
      const ox = (i - 2) * 3.1;
      ctx.beginPath();
      ctx.moveTo(ox, 0);
      ctx.quadraticCurveTo(ox + (rng() - 0.5) * 5, -5, ox + (i - 2) * 2.6, -9 - rng() * 5);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMushroom(ctx, x, y, s, rng) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.strokeStyle = "#e7dbbd";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -5);
    ctx.stroke();
    ctx.fillStyle = rng() < 0.5 ? "#d9523d" : "#e1a24a";
    ctx.beginPath();
    ctx.arc(0, -5, 5.5, Math.PI, TAU);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255, 246, 220, .75)";
    ellipse(ctx, -2, -8, 1.3, 0.9);
    ellipse(ctx, 2, -7, 0.8, 0.6);
    ctx.restore();
  }

  function drawPond(ctx, x, y, rx, ry, rng) {
    ctx.save();
    const g = ctx.createRadialGradient(x - rx * 0.2, y - ry * 0.3, 2, x, y, rx);
    g.addColorStop(0, "#8ed9c8");
    g.addColorStop(0.45, "#54b7b5");
    g.addColorStop(0.85, "#267d86");
    g.addColorStop(1, "#1c5d6a");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, -0.08, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(35, 84, 52, .55)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = "rgba(191, 255, 244, .3)";
    ctx.lineWidth = 1.3;
    for (let i = 0; i < 5; i++) {
      const yy = y - ry * 0.42 + i * ry * 0.23;
      const xx = x + (rng() - 0.5) * rx * 0.45;
      ctx.beginPath();
      ctx.ellipse(xx, yy, rx * (0.16 + rng() * 0.15), 1.2 + rng(), 0, 0, TAU);
      ctx.stroke();
    }
    // Lily pads
    for (let i = 0; i < 3; i++) {
      const px = x + (rng() - 0.5) * rx * 1.2;
      const py = y + (rng() - 0.5) * ry * 1.1;
      ctx.fillStyle = "#4a9e3f";
      ctx.beginPath();
      ctx.ellipse(px, py, 6 + rng() * 3, 3 + rng() * 1.5, rng() * 0.5, 0.3, TAU - 0.3);
      ctx.fill();
      if (rng() < 0.45) {
        ctx.fillStyle = "#ffd3e4";
        ellipse(ctx, px + 2, py - 1, 2.1, 1.6);
      }
    }
    ctx.restore();
  }

  function drawSign(ctx, x, y, s, text = "START") {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = "rgba(28, 47, 20, .22)";
    ellipse(ctx, 5, 2, 16, 4);
    ctx.fillStyle = "#68472a";
    roundRect(ctx, -2, -23, 5, 24, 2);
    ctx.fill();
    ctx.fillStyle = "#835b34";
    roundRect(ctx, -19, -34, 41, 17, 3);
    ctx.fill();
    ctx.strokeStyle = "#4f321c";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 238, 191, .16)";
    roundRect(ctx, -16, -32, 35, 5, 2);
    ctx.fill();
    ctx.fillStyle = "#f8e5bb";
    ctx.font = "800 8px 'Trebuchet MS', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 2, -25.5);
    ctx.fillStyle = "#f4c858";
    ctx.beginPath();
    ctx.moveTo(17, -25.5);
    ctx.lineTo(12, -29);
    ctx.lineTo(12, -22);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawGate(ctx, x, y, s, time = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = "rgba(23, 40, 16, .24)";
    ellipse(ctx, 8, 4, 27, 7);
    ctx.fillStyle = "#67462a";
    roundRect(ctx, -24, -36, 7, 37, 2);
    ctx.fill();
    roundRect(ctx, 17, -36, 7, 37, 2);
    ctx.fill();
    ctx.fillStyle = "#7d5732";
    roundRect(ctx, -28, -41, 56, 8, 3);
    ctx.fill();
    ctx.strokeStyle = "#4d311b";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // Hanging leaves and little charm
    ctx.strokeStyle = "#3d7d34";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-21, -34);
    ctx.quadraticCurveTo(-17, -25, -22, -18);
    ctx.moveTo(20, -34);
    ctx.quadraticCurveTo(24, -24, 20, -17);
    ctx.stroke();
    ctx.fillStyle = "#4e9a3e";
    ellipse(ctx, -22, -18, 4, 2);
    ellipse(ctx, 20, -17, 4, 2);
    ctx.fillStyle = "#f4c858";
    ctx.beginPath();
    ctx.moveTo(0, -47);
    ctx.lineTo(7, -37);
    ctx.lineTo(0, -27);
    ctx.lineTo(-7, -37);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#8d5a1b";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#fff2bf";
    star(ctx, 0, -38, 3.1);
    ctx.restore();
  }

  function drawTorch(ctx, x, y, s, time = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = "rgba(30, 44, 17, .24)";
    ellipse(ctx, 2, 2, 7, 2.5);
    ctx.fillStyle = "#654328";
    roundRect(ctx, -2, -25, 4.5, 26, 2);
    ctx.fill();
    ctx.fillStyle = "#3f6b30";
    roundRect(ctx, -4.8, -24, 10, 4, 2);
    ctx.fill();
    ctx.fillStyle = "#86592c";
    roundRect(ctx, -6, -30, 12, 5, 2.5);
    ctx.fill();
    const flick = Math.sin(time * 12 + x) * 1.4;
    const fg = ctx.createRadialGradient(0, -35, 1, 0, -35, 13);
    fg.addColorStop(0, "rgba(255, 249, 176, .95)");
    fg.addColorStop(0.35, "rgba(255, 185, 52, .9)");
    fg.addColorStop(1, "rgba(255, 82, 20, 0)");
    ctx.fillStyle = fg;
    ellipse(ctx, flick * 0.3, -36 - Math.abs(flick) * 0.3, 8 + flick, 13);
    ctx.fillStyle = "rgba(255, 250, 196, .9)";
    ellipse(ctx, flick * 0.2, -35, 2.6, 5.5);
    ctx.restore();
  }

  function drawButterfly(ctx, x, y, s, time, phase, color = "#ffd55c") {
    const flap = Math.abs(Math.sin(time * 9 + phase));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(time * 2.4 + phase) * 0.2);
    ctx.scale(s, s);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(-4, 0, 4.5, 3 + flap * 2.3, -0.4, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(4, 0, 4.5, 3 + flap * 2.3, 0.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.35)";
    ellipse(ctx, -4.5, -1, 1.6, 1.2);
    ellipse(ctx, 4.5, -1, 1.6, 1.2);
    ctx.fillStyle = "#4b3c2b";
    ellipse(ctx, 0, 0, 0.9, 3.2);
    ctx.restore();
  }

  BTD.WorldArt = {
    drawTree,
    drawBush,
    drawFlower,
    drawRock,
    drawGrassTuft,
    drawMushroom,
    drawPond,
    drawSign,
    drawGate,
    drawTorch,
    drawButterfly
  };
})();
