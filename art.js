/* =========================================================
   BLOONS TD 5 — SUNSET GROVE
   Procedural character and bloon artwork.
   ========================================================= */
(() => {
  "use strict";
  const BTD = (window.BTD = window.BTD || {});
  const { TOWERS, BLOONS, TAU, roundRect } = BTD;

  const FUR = "#986238";
  const FUR_DARK = "#633a1c";
  const FUR_LIGHT = "#c28a51";
  const TAN = "#e6bb84";

  function ellipse(ctx, x, y, rx, ry, fill) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
  }

  function star(ctx, x, y, r, points = 5, fill = "#fff") {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / points;
      const rr = i % 2 ? r * 0.45 : r;
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  // -------------------------------------------------------
  // Monkey artwork
  // -------------------------------------------------------
  function drawMonkey(ctx, type, scale, time = 0, aim = -Math.PI / 2, level = 0, seed = 0) {
    const def = TOWERS[type];
    if (!def) return;
    const p = def.palette;
    const bob = Math.sin(time * 2.15 + seed) * 0.55;

    ctx.save();
    ctx.scale(scale, scale);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // Ground shadow and grass platform
    ctx.fillStyle = "rgba(22, 45, 18, 0.28)";
    ellipse(ctx, 0, 2.5, 19, 5.6);
    ctx.fillStyle = "rgba(70, 112, 43, 0.8)";
    ellipse(ctx, 0, 0.5, 15.5, 4.2);
    ctx.fillStyle = "rgba(113, 169, 68, 0.55)";
    ellipse(ctx, -2, -0.2, 12.5, 3);
    // Little stones
    ctx.fillStyle = "rgba(214, 195, 152, 0.5)";
    ellipse(ctx, -12, 0.8, 3.1, 1.5);
    ellipse(ctx, 11.5, 1.2, 2.5, 1.2);

    ctx.translate(0, bob);

    // Cape for the super monkey
    if (type === "super") {
      const flap = Math.sin(time * 3 + seed) * 1.5;
      ctx.fillStyle = "#9b2029";
      ctx.beginPath();
      ctx.moveTo(-11, -33);
      ctx.quadraticCurveTo(-25 - flap, -21, -22, -4);
      ctx.quadraticCurveTo(-13, -8, -7, -11);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(63, 11, 16, 0.45)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = "#f0c13a";
      ellipse(ctx, -15, -20, 2.2, 2.2);
    }

    // Tail
    ctx.strokeStyle = p.furDark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-7, -17);
    ctx.bezierCurveTo(-24, -15, -21, -3, -12, -1.5);
    ctx.stroke();
    ctx.fillStyle = p.fur;
    ellipse(ctx, -12, -1.6, 2.4, 2.4);

    // Legs and feet
    ctx.fillStyle = p.furDark;
    roundRect(ctx, -8.5, -13, 6, 11, 3);
    ctx.fill();
    roundRect(ctx, 2.5, -13, 6, 11, 3);
    ctx.fill();
    ctx.fillStyle = p.fur;
    ellipse(ctx, -5.5, -2.2, 4.4, 2.5);
    ellipse(ctx, 5.5, -2.2, 4.4, 2.5);
    ctx.fillStyle = TAN;
    ellipse(ctx, -5.5, -2.6, 3, 1.2);
    ellipse(ctx, 5.5, -2.6, 3, 1.2);

    // Body
    const bodyGrad = ctx.createLinearGradient(0, -34, 0, -9);
    bodyGrad.addColorStop(0, p.shirt);
    bodyGrad.addColorStop(1, p.shirtDark);
    ctx.fillStyle = bodyGrad;
    ellipse(ctx, 0, -22, 13.2, 14.2);
    ctx.strokeStyle = "rgba(35, 22, 14, 0.4)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Shirt belly / belt
    ctx.fillStyle = "rgba(255, 244, 208, 0.2)";
    ellipse(ctx, 0, -21, 8.4, 9.2);
    ctx.fillStyle = "rgba(32, 25, 17, 0.4)";
    roundRect(ctx, -12, -13.2, 24, 3.6, 1.8);
    ctx.fill();
    ctx.fillStyle = p.accent;
    roundRect(ctx, -2.5, -13.5, 5, 4.2, 1.2);
    ctx.fill();

    // Neck
    ctx.fillStyle = p.fur;
    roundRect(ctx, -4.5, -37, 9, 8, 3.5);
    ctx.fill();

    // Ears (behind head)
    ctx.fillStyle = p.furDark;
    ellipse(ctx, -13.4, -46, 6, 6.4);
    ellipse(ctx, 13.4, -46, 6, 6.4);
    ctx.fillStyle = TAN;
    ellipse(ctx, -13.2, -46, 3.4, 3.9);
    ellipse(ctx, 13.2, -46, 3.4, 3.9);

    // Head
    const headGrad = ctx.createRadialGradient(-4, -51, 2, 0, -44, 17);
    headGrad.addColorStop(0, p.fur);
    headGrad.addColorStop(1, p.furDark);
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(0, -44.5, 13.2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(56, 33, 16, 0.45)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Hair tuft
    ctx.strokeStyle = p.furDark;
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.moveTo(-4.5, -56.5);
    ctx.quadraticCurveTo(-5, -60, -1.5, -58.5);
    ctx.moveTo(0.2, -57.2);
    ctx.quadraticCurveTo(2, -61, 4.4, -58);
    ctx.stroke();

    // Muzzle
    ctx.fillStyle = TAN;
    ellipse(ctx, 0, -39.5, 9.6, 7.4);
    ctx.fillStyle = "rgba(255, 236, 203, 0.38)";
    ellipse(ctx, 0, -40.5, 6.4, 4.2);

    // Eyes
    const lookX = Math.cos(aim) * 1.15;
    const lookY = Math.sin(aim) * 1.1;
    ctx.fillStyle = "#fffdf2";
    ellipse(ctx, -4.6, -47, 3.5, 4.1);
    ellipse(ctx, 4.6, -47, 3.5, 4.1);
    ctx.fillStyle = "#241b13";
    ellipse(ctx, -4.4 + lookX, -46.8 + lookY, 1.75, 2.1);
    ellipse(ctx, 4.8 + lookX, -46.8 + lookY, 1.75, 2.1);
    ctx.fillStyle = "rgba(255,255,255,.8)";
    ellipse(ctx, -5 + lookX, -47.8 + lookY, 0.6, 0.7);

    // Brows and smile
    ctx.strokeStyle = "rgba(58, 34, 17, 0.75)";
    ctx.lineWidth = 1.35;
    ctx.beginPath();
    ctx.moveTo(-7.5, -51.6);
    ctx.lineTo(-2.3, -50.8);
    ctx.moveTo(2.3, -50.8);
    ctx.lineTo(7.5, -51.6);
    ctx.stroke();
    ctx.strokeStyle = "rgba(92, 51, 24, 0.8)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(0, -39, 3.5, 0.18 * Math.PI, 0.82 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = "rgba(100, 56, 26, 0.55)";
    ellipse(ctx, -1.8, -42.5, 0.8, 0.55);
    ellipse(ctx, 1.8, -42.5, 0.8, 0.55);

    // Accessories and the aiming arm
    drawAccessory(ctx, type, p, time, seed);
    drawArmsAndWeapon(ctx, type, p, aim, time, level);

    // Level sparks
    if (level > 0) {
      const sparkle = 0.4 + Math.sin(time * 3 + seed) * 0.22;
      ctx.save();
      ctx.globalAlpha = sparkle;
      ctx.fillStyle = "#ffdd66";
      star(ctx, -17, -38, 2.6);
      star(ctx, 17, -44, 2.1);
      if (level > 1) star(ctx, 16, -26, 1.8);
      ctx.restore();
    }

    ctx.restore();
  }

  function drawAccessory(ctx, type, p, time, seed) {
    switch (type) {
      case "dart": {
        ctx.strokeStyle = p.accent;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(-11, -49.5);
        ctx.quadraticCurveTo(0, -52.3, 11, -49.5);
        ctx.stroke();
        ctx.fillStyle = p.accent;
        ctx.beginPath();
        ctx.moveTo(-10, -49);
        ctx.lineTo(-16, -53);
        ctx.lineTo(-14, -46);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case "tack": {
        ctx.strokeStyle = "#d8d2c1";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-11, -50);
        ctx.lineTo(11, -50);
        ctx.stroke();
        ctx.fillStyle = "#8e8a7c";
        for (let i = -1; i <= 1; i++) ellipse(ctx, i * 6, -50.5, 1.1, 1.1);
        break;
      }
      case "boomerang": {
        ctx.strokeStyle = p.accent;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(-11, -50);
        ctx.quadraticCurveTo(0, -52.5, 11, -50);
        ctx.stroke();
        ctx.fillStyle = p.accent;
        ctx.beginPath();
        ctx.moveTo(10, -50);
        ctx.lineTo(16, -46);
        ctx.lineTo(13.5, -52);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case "glue": {
        ctx.strokeStyle = "#3d392b";
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        ctx.moveTo(-10.5, -51.5);
        ctx.quadraticCurveTo(0, -55, 10.5, -51.5);
        ctx.stroke();
        ctx.fillStyle = "rgba(205, 246, 248, .85)";
        ctx.strokeStyle = "#3e6e70";
        ctx.lineWidth = 1.4;
        ellipse(ctx, -4.4, -52.5, 3.4, 3);
        ctx.stroke();
        ellipse(ctx, 4.4, -52.5, 3.4, 3);
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,.65)";
        ellipse(ctx, -5.2, -53.3, 1.1, 0.8);
        break;
      }
      case "bomb": {
        ctx.fillStyle = "#2c2731";
        ctx.beginPath();
        ctx.moveTo(-11, -51);
        ctx.quadraticCurveTo(0, -54, 11, -51);
        ctx.lineTo(10, -46.5);
        ctx.quadraticCurveTo(0, -49.5, -10, -46.5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#2c2731";
        ctx.beginPath();
        ctx.moveTo(10, -49);
        ctx.lineTo(17, -54);
        ctx.lineTo(15, -47);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case "ice": {
        ctx.fillStyle = p.shirtDark;
        ctx.beginPath();
        ctx.arc(0, -50, 12.4, Math.PI, TAU);
        ctx.lineTo(12.4, -48.5);
        ctx.lineTo(-12.4, -48.5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = p.shirt;
        ctx.beginPath();
        ctx.arc(0, -50, 11.4, Math.PI, TAU);
        ctx.lineTo(11.4, -48.8);
        ctx.lineTo(-11.4, -48.8);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#e7fdff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-11.4, -48.8);
        ctx.lineTo(11.4, -48.8);
        ctx.stroke();
        ctx.fillStyle = "#f4ffff";
        ellipse(ctx, 0, -62, 3.6, 3.6);
        ctx.fillStyle = "#d3fbff";
        star(ctx, 0, -62, 2.6, 6);
        break;
      }
      case "sniper": {
        ctx.fillStyle = "#4f5b31";
        ctx.beginPath();
        ctx.ellipse(0, -53.5, 17, 4.6, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#687640";
        ctx.beginPath();
        ctx.arc(0, -53, 10.5, Math.PI, TAU);
        ctx.lineTo(10.5, -52);
        ctx.lineTo(-10.5, -52);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(38, 48, 23, .65)";
        ellipse(ctx, -5.5, -56.5, 3.6, 1.5);
        ellipse(ctx, 4.5, -55.5, 2.2, 1.1);
        ctx.strokeStyle = "#d4c694";
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(-9, -53.5);
        ctx.quadraticCurveTo(0, -50.5, 9, -53.5);
        ctx.stroke();
        break;
      }
      case "ninja": {
        ctx.fillStyle = "#252832";
        ctx.beginPath();
        ctx.moveTo(-12.8, -45);
        ctx.quadraticCurveTo(0, -37.5, 12.8, -45);
        ctx.lineTo(11.8, -48.5);
        ctx.quadraticCurveTo(0, -43, -11.8, -48.5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = p.accent;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(-11.5, -50.5);
        ctx.quadraticCurveTo(0, -53, 11.5, -50.5);
        ctx.stroke();
        ctx.fillStyle = p.accent;
        ctx.beginPath();
        ctx.moveTo(10.5, -50.5);
        ctx.lineTo(18, -55);
        ctx.lineTo(15, -48);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case "super": {
        ctx.fillStyle = "#9d2028";
        ctx.beginPath();
        ctx.moveTo(-11.5, -49);
        ctx.quadraticCurveTo(-6, -52.2, -1.5, -49.5);
        ctx.quadraticCurveTo(0, -48, 1.5, -49.5);
        ctx.quadraticCurveTo(6, -52.2, 11.5, -49);
        ctx.quadraticCurveTo(7, -44.3, 0, -45.6);
        ctx.quadraticCurveTo(-7, -44.3, -11.5, -49);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ffd95c";
        star(ctx, 0, -25, 3.4);
        break;
      }
      default:
        break;
    }
  }

  function drawArmsAndWeapon(ctx, type, p, aim, time, level) {
    if (type === "tack") {
      // Spiked collar ring around the monkey
      ctx.save();
      ctx.translate(0, -22);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU + 0.18;
        const r1 = 13.5;
        const r2 = 23;
        const w = 3.1;
        ctx.fillStyle = "#c9c7b6";
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r1 - Math.sin(a) * w, -Math.sin(a) * r1 + -Math.cos(a) * w);
        ctx.lineTo(Math.cos(a) * r2, -Math.sin(a) * r2);
        ctx.lineTo(Math.cos(a) * r1 + Math.sin(a) * w, -Math.sin(a) * r1 + Math.cos(a) * w);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(74, 70, 59, .45)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      ctx.strokeStyle = "#e6e1d0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 13.4, 0, TAU);
      ctx.stroke();
      ctx.restore();
      // Simple hands at sides
      ctx.fillStyle = p.fur;
      ellipse(ctx, -13.5, -20, 3.3, 4.1);
      ellipse(ctx, 13.5, -20, 3.3, 4.1);
      return;
    }

    const dirX = Math.cos(aim);
    const dirY = Math.sin(aim);
    const side = dirX >= 0 ? 1 : -1;
    const shoulderX = side * 10;
    const handX = side * 6 + dirX * 14;
    const handY = -27 + dirY * 9;
    const leftHandX = -11;
    const leftHandY = -16;

    // Hanging arm
    ctx.strokeStyle = p.fur;
    ctx.lineWidth = 4.6;
    ctx.beginPath();
    ctx.moveTo(-10, -29);
    ctx.quadraticCurveTo(-14, -23, leftHandX, leftHandY);
    ctx.stroke();
    ctx.fillStyle = p.fur;
    ellipse(ctx, leftHandX, leftHandY, 3.1, 3.6);

    // Aiming arm
    ctx.strokeStyle = p.fur;
    ctx.lineWidth = 4.8;
    ctx.beginPath();
    ctx.moveTo(shoulderX, -29);
    ctx.quadraticCurveTo(shoulderX + dirX * 8, -29 + dirY * 5, handX, handY);
    ctx.stroke();
    ctx.fillStyle = p.fur;
    ellipse(ctx, handX, handY, 3.3, 3.7);
    ctx.strokeStyle = "rgba(80, 45, 21, .4)";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.save();
    ctx.translate(handX, handY);
    ctx.rotate(aim);

    if (type === "dart") {
      // Dart shaft
      ctx.strokeStyle = "#d9b477";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(15, 0);
      ctx.stroke();
      ctx.fillStyle = "#f5eee0";
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(13, -2.6);
      ctx.lineTo(13, 2.6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#e05b3e";
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(-9, -3.8);
      ctx.lineTo(-2.5, -1.4);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(-9, 3.8);
      ctx.lineTo(-2.5, 1.4);
      ctx.closePath();
      ctx.fill();
    } else if (type === "boomerang") {
      ctx.rotate(time * 0.8);
      ctx.strokeStyle = "#b66a26";
      ctx.lineWidth = 4.4;
      ctx.beginPath();
      ctx.moveTo(-8, -3);
      ctx.quadraticCurveTo(4, -9, 10, 1);
      ctx.quadraticCurveTo(4, -2, -2, 2);
      ctx.stroke();
      ctx.strokeStyle = "#f2bd52";
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.moveTo(-7, -3.5);
      ctx.quadraticCurveTo(3, -8, 8.5, 0);
      ctx.stroke();
    } else if (type === "bomb") {
      ctx.fillStyle = "#25232a";
      ctx.beginPath();
      ctx.arc(4, 1, 6.2, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#5c5963";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.4)";
      ellipse(ctx, 1.8, -1.5, 1.5, 1);
      ctx.strokeStyle = "#9e7040";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(4, -5);
      ctx.quadraticCurveTo(9, -9, 11, -5);
      ctx.stroke();
      ctx.fillStyle = "#ffd25c";
      star(ctx, 11, -5, 2.2, 4);
    } else if (type === "glue") {
      ctx.fillStyle = "#4b6d1e";
      roundRect(ctx, 0, -4, 12, 8, 3);
      ctx.fill();
      ctx.fillStyle = "#9bcf47";
      roundRect(ctx, 2, -3, 9, 3, 1.5);
      ctx.fill();
      ctx.fillStyle = "#6f9d2f";
      roundRect(ctx, 11, -2.4, 8, 4.8, 2.2);
      ctx.fill();
      ctx.fillStyle = "#d7f45a";
      ellipse(ctx, 19, 0, 2.8, 2.5);
    } else if (type === "ice") {
      ctx.strokeStyle = "#b89a68";
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(16, 0);
      ctx.stroke();
      ctx.fillStyle = "#bffcff";
      star(ctx, 17, 0, 5, 6);
      ctx.fillStyle = "rgba(255,255,255,.85)";
      star(ctx, 17, 0, 2.7, 6);
    } else if (type === "sniper") {
      ctx.strokeStyle = "#3d342a";
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      ctx.moveTo(-9, 0);
      ctx.lineTo(27, 0);
      ctx.stroke();
      ctx.fillStyle = "#715b3d";
      roundRect(ctx, -10, -2, 12, 4, 1.5);
      ctx.fill();
      ctx.fillStyle = "#556044";
      roundRect(ctx, 2, -3.6, 10, 3, 1.3);
      ctx.fill();
      ctx.fillStyle = "#242a25";
      ctx.beginPath();
      ctx.arc(8, -3.2, 2.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#d8caa0";
      ellipse(ctx, 26, 0, 2.5, 1.2);
    } else if (type === "ninja") {
      ctx.rotate(time * 2 + 0.4);
      ctx.fillStyle = "#c7ccd1";
      star(ctx, 1, 0, 6.5, 4);
      ctx.fillStyle = "#787f86";
      star(ctx, 1, 0, 3.1, 4);
      ctx.fillStyle = "#3b3f48";
      ellipse(ctx, 1, 0, 1.2, 1.2);
    } else if (type === "super") {
      // Radiant fist / dart
      const glow = ctx.createRadialGradient(8, 0, 1, 8, 0, 12);
      glow.addColorStop(0, "rgba(255, 250, 170, .9)");
      glow.addColorStop(0.45, "rgba(255, 211, 70, .5)");
      glow.addColorStop(1, "rgba(255, 180, 40, 0)");
      ctx.fillStyle = glow;
      ellipse(ctx, 8, 0, 12, 9);
      ctx.strokeStyle = "#d9b477";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-2, 0);
      ctx.lineTo(14, 0);
      ctx.stroke();
      ctx.fillStyle = "#fff6c9";
      ctx.beginPath();
      ctx.moveTo(19, 0);
      ctx.lineTo(12, -2.5);
      ctx.lineTo(12, 2.5);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  // -------------------------------------------------------
  // Bloons
  // -------------------------------------------------------
  function balloonPath(ctx, r) {
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.16);
    ctx.bezierCurveTo(r * 0.97, -r * 1.08, r * 1.04, r * 0.53, r * 0.24, r * 0.96);
    ctx.quadraticCurveTo(0, r * 1.08, -r * 0.24, r * 0.96);
    ctx.bezierCurveTo(-r * 1.04, r * 0.53, -r * 0.97, -r * 1.08, 0, -r * 1.16);
    ctx.closePath();
  }

  function drawBloon(ctx, x, y, typeKey, scale, time, phase, opts = {}) {
    const def = BLOONS[typeKey];
    if (!def) return;
    if (def.big) {
      drawBlimp(ctx, x, y, typeKey, scale, time, phase, opts);
      return;
    }

    const r = def.radius * scale;
    const sway = Math.sin(time * 2.1 + phase) * 0.07;
    const bob = Math.sin(time * 2.7 + phase) * r * 0.08;

    ctx.save();
    // Ground shadow
    ctx.fillStyle = "rgba(27, 48, 19, 0.2)";
    ellipse(ctx, x + r * 0.35, y + r * 1.75, r * 0.72, r * 0.25);

    // String
    ctx.save();
    ctx.translate(x, y + r * 1.02);
    ctx.rotate(sway);
    ctx.strokeStyle = "rgba(39, 54, 27, 0.45)";
    ctx.lineWidth = Math.max(0.7, scale * 0.85);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(r * 0.45, r * 0.35, -r * 0.4, r * 0.7, r * 0.25, r * 1.12);
    ctx.stroke();
    ctx.restore();

    ctx.translate(x, y + bob);
    ctx.rotate(sway * 0.75);

    // Body
    balloonPath(ctx, r);
    let grad = ctx.createRadialGradient(-r * 0.36, -r * 0.43, r * 0.08, 0, 0, r * 1.35);
    grad.addColorStop(0, def.light);
    grad.addColorStop(0.34, def.color);
    grad.addColorStop(0.82, def.color);
    grad.addColorStop(1, def.dark);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "rgba(30, 27, 25, .38)";
    ctx.lineWidth = Math.max(0.8, scale * 0.8);
    ctx.stroke();

    // Pattern overlays
    ctx.save();
    balloonPath(ctx, r);
    ctx.clip();

    if (typeKey === "zebra") {
      ctx.fillStyle = "rgba(22, 20, 27, .94)";
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.ellipse(-r * 0.26 + i * r * 0.52, r * 0.05, r * 0.15, r * 1.22, -0.24, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(255,255,255,.18)";
      ctx.fillRect(-r, -r * 1.2, r * 2, r * 0.35);
    } else if (typeKey === "rainbow") {
      const colors = ["#ff5c55", "#ffb43f", "#ffe449", "#5dd55d", "#54a9ff", "#b370ff"];
      for (let i = 0; i < colors.length; i++) {
        ctx.fillStyle = colors[i];
        ctx.fillRect(-r * 0.08 + i * r * 0.28 - r * 0.84, -r * 1.25, r * 0.3, r * 2.5);
      }
      const sheen = ctx.createRadialGradient(-r * 0.45, -r * 0.5, 0, -r * 0.45, -r * 0.5, r * 1.35);
      sheen.addColorStop(0, "rgba(255,255,255,.45)");
      sheen.addColorStop(0.5, "rgba(255,255,255,.05)");
      sheen.addColorStop(1, "rgba(0,0,0,.3)");
      ctx.fillStyle = sheen;
      ctx.fillRect(-r * 1.2, -r * 1.3, r * 2.4, r * 2.6);
    } else if (typeKey === "ceramic") {
      ctx.strokeStyle = "rgba(76, 39, 24, .55)";
      ctx.lineWidth = Math.max(0.7, r * 0.1);
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, -r * 0.55);
      ctx.lineTo(-r * 0.25, -r * 0.2);
      ctx.lineTo(-r * 0.46, r * 0.17);
      ctx.lineTo(-r * 0.05, r * 0.52);
      ctx.moveTo(r * 0.58, -r * 0.7);
      ctx.lineTo(r * 0.28, -r * 0.28);
      ctx.lineTo(r * 0.54, r * 0.14);
      ctx.moveTo(r * 0.1, -r * 0.8);
      ctx.lineTo(r * 0.22, -r * 0.96);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 216, 172, .28)";
      ctx.lineWidth = Math.max(0.7, r * 0.09);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.72, -2.2, 0.1);
      ctx.stroke();
      ctx.fillStyle = "rgba(90, 45, 23, .18)";
      ctx.fillRect(-r, r * 0.58, r * 2, r * 0.55);
    } else if (typeKey === "black") {
      const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, 0, 0, 0, r * 1.2);
      g.addColorStop(0, "rgba(125, 106, 155, .6)");
      g.addColorStop(0.38, "rgba(60, 51, 77, .15)");
      g.addColorStop(1, "rgba(8, 6, 12, .75)");
      ctx.fillStyle = g;
      ctx.fillRect(-r * 1.2, -r * 1.2, r * 2.4, r * 2.4);
    } else if (typeKey === "white") {
      ctx.fillStyle = "rgba(255, 255, 255, .28)";
      ctx.fillRect(-r * 1.2, -r * 1.2, r * 2.4, r * 0.7);
    }

    // Frost overlay
    if (opts.frozen) {
      const fg = ctx.createLinearGradient(-r, -r, r, r);
      fg.addColorStop(0, "rgba(191, 251, 255, .68)");
      fg.addColorStop(0.55, "rgba(89, 200, 255, .25)");
      fg.addColorStop(1, "rgba(236, 255, 255, .62)");
      ctx.fillStyle = fg;
      ctx.fillRect(-r * 1.2, -r * 1.3, r * 2.4, r * 2.6);
    }

    // Glue overlay
    if (opts.glued) {
      ctx.fillStyle = "rgba(129, 197, 47, .56)";
      ellipse(ctx, -r * 0.35, r * 0.48, r * 0.38, r * 0.24);
      ellipse(ctx, r * 0.32, -r * 0.48, r * 0.28, r * 0.36);
      ellipse(ctx, r * 0.08, r * 0.87, r * 0.2, r * 0.24);
    }
    ctx.restore();

    // Gloss
    ctx.save();
    balloonPath(ctx, r);
    ctx.clip();
    const shine = ctx.createRadialGradient(-r * 0.45, -r * 0.55, 0, -r * 0.45, -r * 0.55, r * 1.1);
    shine.addColorStop(0, "rgba(255,255,255,.66)");
    shine.addColorStop(0.4, "rgba(255,255,255,.18)");
    shine.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = shine;
    ctx.fillRect(-r * 1.3, -r * 1.3, r * 2.6, r * 2.6);
    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.beginPath();
    ctx.ellipse(-r * 0.4, -r * 0.46, r * 0.25, r * 0.12, -0.7, 0, TAU);
    ctx.fill();
    ctx.restore();

    // Tie / knot
    ctx.fillStyle = def.dark;
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, r * 1.0);
    ctx.lineTo(0, r * 1.28);
    ctx.lineTo(r * 0.2, r * 1.0);
    ctx.closePath();
    ctx.fill();

    // Ice crystals when frozen
    if (opts.frozen) {
      ctx.strokeStyle = "rgba(227, 255, 255, .92)";
      ctx.lineWidth = Math.max(0.8, scale * 1.05);
      for (let i = 0; i < 3; i++) {
        const a = -1.2 + i * 0.8 + phase;
        const cx = Math.cos(a) * r * 0.72;
        const cy = Math.sin(a) * r * 0.67;
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.24, cy);
        ctx.lineTo(cx + r * 0.24, cy);
        ctx.moveTo(cx, cy - r * 0.24);
        ctx.lineTo(cx, cy + r * 0.24);
        ctx.stroke();
      }
    }

    // Damage flash
    if (opts.flash > 0) {
      ctx.globalAlpha = Math.min(0.7, opts.flash * 8);
      balloonPath(ctx, r);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  function drawBlimp(ctx, x, y, typeKey, scale, time, phase, opts = {}) {
    const def = BLOONS[typeKey];
    const u = scale;
    const half = def.radius * 2.2 * u;
    const h = def.radius * 1.02 * u;
    const bfb = typeKey === "bfb";

    ctx.save();
    ctx.fillStyle = "rgba(25, 40, 16, .25)";
    ellipse(ctx, x + half * 0.2, y + h * 1.5, half * 0.74, h * 0.24);

    ctx.translate(x, y);
    // Propellers behind body
    const props = [
      [-half * 0.55, -h * 0.9],
      [half * 0.2, -h * 1.05],
      [-half * 0.42, h * 0.92],
      [half * 0.32, h * 1.04]
    ];
    for (let i = 0; i < (bfb ? 4 : 3); i++) {
      const [px, py] = props[i];
      ctx.strokeStyle = "#4b3d3a";
      ctx.lineWidth = 1.2 * u;
      ctx.beginPath();
      ctx.moveTo(px, py > 0 ? h * 0.58 : -h * 0.58);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(time * 15 + i * 1.7);
      ctx.strokeStyle = "rgba(54, 50, 47, .75)";
      ctx.lineWidth = 1.8 * u;
      ctx.beginPath();
      ctx.moveTo(-h * 0.45, 0);
      ctx.lineTo(h * 0.45, 0);
      ctx.moveTo(0, -h * 0.2);
      ctx.lineTo(0, h * 0.2);
      ctx.stroke();
      ctx.fillStyle = "#b7a58d";
      ellipse(ctx, 0, 0, 2.1 * u, 2.1 * u);
      ctx.restore();
    }

    // Tail fin
    ctx.fillStyle = def.dark;
    ctx.beginPath();
    ctx.moveTo(-half * 0.78, -h * 0.3);
    ctx.lineTo(-half * 1.05, -h * 1.02);
    ctx.lineTo(-half * 0.62, -h * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-half * 0.78, h * 0.3);
    ctx.lineTo(-half * 1.05, h * 1.02);
    ctx.lineTo(-half * 0.62, h * 0.42);
    ctx.closePath();
    ctx.fill();

    // Body
    const grad = ctx.createLinearGradient(0, -h, 0, h);
    grad.addColorStop(0, def.light);
    grad.addColorStop(0.26, def.color);
    grad.addColorStop(0.72, def.color);
    grad.addColorStop(1, def.dark);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, half, h, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(38, 19, 22, .58)";
    ctx.lineWidth = Math.max(1, 1.3 * u);
    ctx.stroke();

    // Nose cap
    const nose = ctx.createLinearGradient(half * 0.3, 0, half, 0);
    nose.addColorStop(0, "rgba(255,255,255,.08)");
    nose.addColorStop(0.6, "rgba(40, 22, 24, .28)");
    nose.addColorStop(1, "rgba(27, 14, 16, .55)");
    ctx.fillStyle = nose;
    ctx.beginPath();
    ctx.ellipse(half * 0.53, 0, half * 0.47, h * 0.98, 0, -Math.PI / 2, Math.PI / 2);
    ctx.fill();

    // Stripes
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, half, h, 0, 0, TAU);
    ctx.clip();
    ctx.fillStyle = "rgba(255, 222, 160, .22)";
    ctx.fillRect(-half * 0.33, -h, half * 0.11, h * 2);
    ctx.fillRect(half * 0.05, -h, half * 0.07, h * 2);
    ctx.fillStyle = "rgba(44, 18, 23, .32)";
    ctx.fillRect(-half * 0.88, -h, half * 0.12, h * 2);
    ctx.fillRect(half * 0.39, -h, half * 0.08, h * 2);
    ctx.fillStyle = "rgba(255,255,255,.18)";
    ctx.beginPath();
    ctx.ellipse(-half * 0.08, -h * 0.52, half * 0.7, h * 0.18, -0.1, 0, TAU);
    ctx.fill();
    ctx.restore();

    // Rivets
    ctx.fillStyle = "rgba(255, 222, 160, .45)";
    for (let i = -3; i <= 3; i++) {
      ellipse(ctx, i * half * 0.2, -h * 0.62, 1.25 * u, 1.25 * u);
    }

    // Angry eye marking near nose
    ctx.fillStyle = "rgba(28, 16, 17, .72)";
    ctx.beginPath();
    ctx.moveTo(half * 0.37, -h * 0.26);
    ctx.lineTo(half * 0.56, -h * 0.1);
    ctx.lineTo(half * 0.36, -h * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffd257";
    ellipse(ctx, half * 0.46, -h * 0.12, h * 0.09, h * 0.06);

    // Belly bomb bay
    ctx.fillStyle = "rgba(38, 21, 22, .68)";
    roundRect(ctx, -half * 0.18, h * 0.58, half * 0.5, h * 0.22, h * 0.08);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 208, 120, .2)";
    for (let i = 0; i < 3; i++) ellipse(ctx, -half * 0.08 + i * half * 0.13, h * 0.69, h * 0.025, h * 0.025);

    // Health bar above
    if (opts.hpRatio !== undefined) {
      const bw = half * 1.5;
      const bh = Math.max(3, 3.5 * u);
      const bx = -bw / 2;
      const by = -h - 12 * u;
      ctx.fillStyle = "rgba(13, 21, 12, .7)";
      roundRect(ctx, bx - 1, by - 1, bw + 2, bh + 2, bh);
      ctx.fill();
      const hpGrad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      hpGrad.addColorStop(0, bfb ? "#ff9a52" : "#ff6f5d");
      hpGrad.addColorStop(1, "#ffe06a");
      ctx.fillStyle = hpGrad;
      roundRect(ctx, bx, by, Math.max(0, bw * opts.hpRatio), bh, bh);
      ctx.fill();
    }

    if (opts.frozen) {
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = "#bdf8ff";
      ctx.beginPath();
      ctx.ellipse(0, 0, half, h, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  function drawTowerIcon(canvas, type) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    const s = (height / 64) * 0.92;
    ctx.save();
    ctx.translate(width / 2, height * 0.88);
    drawMonkey(ctx, type, s, 0.3, -1.15, 0, 0);
    ctx.restore();
  }

  BTD.Art = { drawMonkey, drawBloon, drawTowerIcon, star, ellipse };
})();
