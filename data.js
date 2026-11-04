/* =========================================================
   BLOONS TD 5 — SUNSET GROVE
   Game data, wave scripts, and small math helpers.
   ========================================================= */
(() => {
  "use strict";
  const BTD = (window.BTD = window.BTD || {});

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist2 = (x1, y1, x2, y2) => (x1 - x2) ** 2 + (y1 - y2) ** 2;
  const dist = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  function makeRng(seed) {
    let t = seed >>> 0;
    return () => {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function formatMoney(v) {
    return Math.max(0, Math.floor(v)).toLocaleString("en-US");
  }

  // -------------------------------------------------------
  // Towers
  // -------------------------------------------------------
  // Every tower has three upgrades. `mods` are added to stats
  // unless they end in `Mul`, in which case they multiply.
  const TOWER_ORDER = ["dart", "tack", "boomerang", "glue", "bomb", "ice", "sniper", "ninja", "super"];

  const TOWERS = {
    dart: {
      name: "Dart Monkey",
      short: "Dart",
      cost: 200,
      role: "Balanced starter",
      desc: "A reliable all-rounder. Throws sharp darts that pierce two bloons.",
      base: { range: 182, cd: 0.78, dmg: 1, pierce: 2, speed: 660, shots: 1, spread: 0.12 },
      palette: { fur: "#986235", furDark: "#69401f", shirt: "#dd5e3c", shirtDark: "#9b3823", accent: "#f4c64e" },
      upgrades: [
        { name: "Sharp Shots", desc: "+1 damage per dart.", cost: 140, mods: { dmg: 1 } },
        { name: "Long Range Darts", desc: "+38 range and faster darts.", cost: 220, mods: { range: 38, speed: 120 } },
        { name: "Triple Darts", desc: "Throws three darts at once.", cost: 620, mods: { shots: 2, spread: 0.17 } }
      ]
    },
    tack: {
      name: "Tack Shooter",
      short: "Tack",
      cost: 300,
      role: "Close swarm",
      desc: "Fires a ring of tacks in every direction. Loves tight corners.",
      base: { range: 112, cd: 1.25, dmg: 1, pierce: 1, speed: 560, shots: 8 },
      palette: { fur: "#9a6438", furDark: "#643b1d", shirt: "#d84b43", shirtDark: "#8d2624", accent: "#f2ead3" },
      upgrades: [
        { name: "Faster Shooting", desc: "35% faster tack volleys.", cost: 240, mods: { cdMul: 0.65 } },
        { name: "More Tacks", desc: "Four extra tacks per volley.", cost: 380, mods: { shots: 4 } },
        { name: "Ring of Fire", desc: "Ignites a burning ring around the tower.", cost: 1750, mods: { dmg: 1 }, special: "ringOfFire" }
      ]
    },
    boomerang: {
      name: "Boomerang Monkey",
      short: "Boomerang",
      cost: 350,
      role: "Piercing curve",
      desc: "Hurls a boomerang that curves back through the bloons.",
      base: { range: 196, cd: 1.25, dmg: 1, pierce: 3, speed: 470, shots: 1 },
      palette: { fur: "#9a6438", furDark: "#633b1e", shirt: "#e9a72f", shirtDark: "#9f6416", accent: "#3c8150" },
      upgrades: [
        { name: "Multi-Target", desc: "Boomerangs pierce two more bloons.", cost: 280, mods: { pierce: 2 } },
        { name: "Sonic Boom", desc: "+1 damage and faster throws.", cost: 420, mods: { dmg: 1, cdMul: 0.82 } },
        { name: "Glaive Lord", desc: "Heavy glaives pierce deeply and hit twice as hard.", cost: 2100, mods: { pierce: 5, dmg: 2, range: 25 }, special: "glaive" }
      ]
    },
    glue: {
      name: "Glue Gunner",
      short: "Glue",
      cost: 300,
      role: "Crowd control",
      desc: "Soaks bloons in sticky glue. Slowed bloons stay in range longer.",
      base: { range: 190, cd: 1.05, dmg: 0, pierce: 1, speed: 490, shots: 1, spread: 0.04, slow: 0.56, duration: 3.2 },
      palette: { fur: "#9a6438", furDark: "#643b1d", shirt: "#7ebe39", shirtDark: "#477b20", accent: "#e0f35d" },
      upgrades: [
        { name: "Stickier Glue", desc: "Bloons move at 42% speed.", cost: 180, mods: { slow: -0.14, duration: 0.5 } },
        { name: "Stronger Glue", desc: "Glue lasts 2.2 seconds longer.", cost: 300, mods: { duration: 2.2 } },
        { name: "Glue Hose", desc: "Rapidly sprays two glue streams.", cost: 1400, mods: { cdMul: 0.52, shots: 1, spread: 0.1, pierce: 1 }, special: "glueHose" }
      ]
    },
    bomb: {
      name: "Bomb Shooter",
      short: "Bomb",
      cost: 550,
      role: "Area damage",
      desc: "Lobs explosives that damage every bloon in the blast. Black bloons resist blasts.",
      base: { range: 208, cd: 1.65, dmg: 2, splash: 46, speed: 380, shots: 1 },
      palette: { fur: "#916038", furDark: "#60391d", shirt: "#465262", shirtDark: "#29313d", accent: "#ff8b3d" },
      upgrades: [
        { name: "Bigger Bombs", desc: "+1 damage and a larger blast.", cost: 480, mods: { dmg: 1, splash: 20 } },
        { name: "Faster Reload", desc: "Reloads 35% faster.", cost: 580, mods: { cdMul: 0.65 } },
        { name: "Cluster Bombs", desc: "Each bomb scatters three mini-blasts.", cost: 1750, mods: { splash: 8 }, special: "cluster" }
      ]
    },
    ice: {
      name: "Ice Monkey",
      short: "Ice",
      cost: 500,
      role: "Freeze pulse",
      desc: "Freezes nearby bloons in a burst of frost. White bloons resist ice.",
      base: { range: 124, cd: 2.45, dmg: 1, freeze: 1.35, speed: 0, shots: 1 },
      palette: { fur: "#9b683f", furDark: "#633d23", shirt: "#67badd", shirtDark: "#34769b", accent: "#dffbff" },
      upgrades: [
        { name: "Permafrost", desc: "Frozen bloons stay slowed after thawing.", cost: 300, mods: { slowAfter: 2.4, dmg: 1 } },
        { name: "Deep Freeze", desc: "Longer freezes and a wider pulse.", cost: 450, mods: { freeze: 1.1, range: 24 } },
        { name: "Absolute Zero", desc: "A huge pulse that freezes almost everything.", cost: 1900, mods: { freeze: 1.4, range: 38, dmg: 1 }, special: "absoluteZero" }
      ]
    },
    sniper: {
      name: "Sniper Monkey",
      short: "Sniper",
      cost: 400,
      role: "Global reach",
      desc: "Picks off the strongest target anywhere on the map with a hitscan round.",
      base: { range: 560, cd: 1.65, dmg: 2, pierce: 1, speed: 0, shots: 1 },
      palette: { fur: "#956139", furDark: "#613a1c", shirt: "#748448", shirtDark: "#46532b", accent: "#e3d5a7" },
      upgrades: [
        { name: "Full Metal Jacket", desc: "+2 damage per shot.", cost: 450, mods: { dmg: 2 } },
        { name: "Faster Firing", desc: "40% faster shots.", cost: 600, mods: { cdMul: 0.6 } },
        { name: "Cripple MOAB", desc: "Devastating rounds that slow MOAB-class bloons.", cost: 2400, mods: { dmg: 3 }, special: "cripple" }
      ]
    },
    ninja: {
      name: "Ninja Monkey",
      short: "Ninja",
      cost: 600,
      role: "Rapid precision",
      desc: "Throws fast shurikens with exceptional range for the price.",
      base: { range: 164, cd: 0.52, dmg: 1, pierce: 2, speed: 740, shots: 1, spread: 0.03 },
      palette: { fur: "#875631", furDark: "#553116", shirt: "#343b48", shirtDark: "#1d222a", accent: "#df4d43" },
      upgrades: [
        { name: "Ninja Discipline", desc: "25% faster shurikens.", cost: 320, mods: { cdMul: 0.75 } },
        { name: "Sharp Shurikens", desc: "+1 damage and +2 pierce.", cost: 480, mods: { dmg: 1, pierce: 2 } },
        { name: "Grandmaster Ninja", desc: "Throws three blades at blistering speed.", cost: 2200, mods: { shots: 2, spread: 0.12, cdMul: 0.78, dmg: 1 }, special: "grandmaster" }
      ]
    },
    super: {
      name: "Super Monkey",
      short: "Super",
      cost: 3400,
      role: "Late-game power",
      desc: "The grove's legendary defender. Fires an unrelenting stream of darts.",
      base: { range: 236, cd: 0.105, dmg: 1, pierce: 1, speed: 1150, shots: 1, spread: 0.03 },
      palette: { fur: "#976238", furDark: "#643c1f", shirt: "#d53d41", shirtDark: "#8d2029", accent: "#f4ce3d" },
      upgrades: [
        { name: "Laser Blasts", desc: "+1 damage per blast.", cost: 2300, mods: { dmg: 1 } },
        { name: "Epic Range", desc: "+70 range and +damage.", cost: 1800, mods: { range: 70, dmg: 1 } },
        { name: "Sun God", desc: "Solar blasts explode with radiant fire.", cost: 4400, mods: { dmg: 2, splash: 38, cdMul: 0.82 }, special: "sunGod" }
      ]
    }
  };

  // -------------------------------------------------------
  // Bloons
  // -------------------------------------------------------
  const BLOONS = {
    red: { label: "Red", speed: 1, radius: 10.2, hp: 1, color: "#ff5d50", light: "#ffb1a4", dark: "#a92121", cash: 1, score: 10, leak: 1, rbe: 1, children: [] },
    blue: { label: "Blue", speed: 1.3, radius: 9.8, hp: 1, color: "#5db2ff", light: "#bfe6ff", dark: "#1c5cb0", cash: 1, score: 15, leak: 2, rbe: 2, children: ["red"] },
    green: { label: "Green", speed: 1.58, radius: 9.8, hp: 1, color: "#58d35e", light: "#c5ffc4", dark: "#207e32", cash: 1, score: 20, leak: 3, rbe: 3, children: ["blue"] },
    yellow: { label: "Yellow", speed: 1.92, radius: 9.5, hp: 1, color: "#ffe44f", light: "#fff9bb", dark: "#bd8212", cash: 1, score: 25, leak: 4, rbe: 4, children: ["green"] },
    pink: { label: "Pink", speed: 2.3, radius: 9.5, hp: 1, color: "#ff86d2", light: "#ffd9f3", dark: "#ba3d84", cash: 1, score: 30, leak: 5, rbe: 5, children: ["yellow"] },
    black: { label: "Black", speed: 2.42, radius: 9.8, hp: 1, color: "#4c4558", light: "#9186a2", dark: "#17141e", cash: 2, score: 55, leak: 11, rbe: 11, children: ["pink", "pink"], immuneExplosion: true },
    white: { label: "White", speed: 2.5, radius: 9.8, hp: 1, color: "#f9f7ee", light: "#ffffff", dark: "#aaa49b", cash: 2, score: 55, leak: 11, rbe: 11, children: ["pink", "pink"], freezeResist: true },
    zebra: { label: "Zebra", speed: 2.35, radius: 10.2, hp: 1, color: "#f5f1e6", light: "#ffffff", dark: "#17151c", cash: 3, score: 110, leak: 23, rbe: 23, children: ["black", "white"], freezeResist: true },
    rainbow: { label: "Rainbow", speed: 2.5, radius: 10.5, hp: 1, color: "#ff6d66", light: "#fff4b7", dark: "#34325b", cash: 4, score: 220, leak: 47, rbe: 47, children: ["zebra", "zebra"], freezeResist: true },
    ceramic: { label: "Ceramic", speed: 2.28, radius: 12.2, hp: 10, color: "#e38044", light: "#ffd19f", dark: "#71321c", cash: 6, score: 470, leak: 25, rbe: 104, children: ["rainbow", "rainbow"], freezeResist: true },
    moab: { label: "MOAB", speed: 0.86, radius: 25, hp: 130, color: "#c4493c", light: "#f6a088", dark: "#67221e", cash: 28, score: 2600, leak: 45, rbe: 424, children: ["ceramic", "ceramic", "ceramic", "ceramic"], big: true, freezeResist: true },
    bfb: { label: "BFB", speed: 0.69, radius: 34, hp: 330, color: "#a33d61", light: "#e89ab1", dark: "#4c1a30", cash: 70, score: 8000, leak: 90, rbe: 1300, children: ["moab", "moab", "moab"], big: true, freezeResist: true }
  };

  const SPEED_SCALE = 0.041;

  // -------------------------------------------------------
  // Rounds
  // -------------------------------------------------------
  const G = (type, count, gap, delay = 0) => ({ type, count, gap, delay });

  const ROUNDS = [
    [G("red", 10, 0.82)],
    [G("red", 20, 0.55)],
    [G("red", 12, 0.6), G("blue", 8, 0.72, 2.5)],
    [G("blue", 16, 0.58), G("red", 12, 0.34, 2.2)],
    [G("green", 10, 0.78), G("red", 18, 0.32, 1.2)],
    [G("green", 18, 0.54), G("blue", 12, 0.42, 3)],
    [G("green", 12, 0.55), G("yellow", 10, 0.7, 2.5)],
    [G("yellow", 22, 0.46)],
    [G("yellow", 14, 0.55), G("pink", 10, 0.68, 2.5)],
    [G("pink", 20, 0.48), G("green", 10, 0.34, 1.4)],
    [G("black", 12, 0.58), G("white", 10, 0.62, 2)],
    [G("zebra", 13, 0.62), G("pink", 14, 0.28, 1)],
    [G("rainbow", 11, 0.68)],
    [G("ceramic", 5, 1.18), G("pink", 16, 0.34)],
    [G("zebra", 16, 0.48), G("rainbow", 6, 0.82, 2)],
    [G("ceramic", 9, 1.02), G("pink", 22, 0.25)],
    [G("rainbow", 15, 0.54), G("zebra", 12, 0.5, 2)],
    [G("ceramic", 12, 0.86)],
    [G("rainbow", 22, 0.44), G("black", 12, 0.42, 2)],
    [G("moab", 1, 1), G("pink", 20, 0.3, 2)],
    [G("ceramic", 15, 0.72)],
    [G("moab", 2, 5.5), G("rainbow", 20, 0.4, 1.4)],
    [G("ceramic", 18, 0.58), G("rainbow", 15, 0.34, 2.5)],
    [G("moab", 3, 4.2), G("ceramic", 10, 0.74, 1)],
    [G("bfb", 1, 1), G("rainbow", 24, 0.36, 1.2)],
    [G("ceramic", 25, 0.5)],
    [G("moab", 4, 3.4), G("zebra", 20, 0.3, 1)],
    [G("ceramic", 30, 0.46)],
    [G("moab", 5, 3.0), G("rainbow", 24, 0.3, 1)],
    [G("bfb", 1, 1), G("moab", 3, 4.2, 3.2), G("ceramic", 18, 0.52, 1)]
  ];

  BTD.TAU = TAU;
  BTD.clamp = clamp;
  BTD.lerp = lerp;
  BTD.dist = dist;
  BTD.dist2 = dist2;
  BTD.rand = rand;
  BTD.pick = pick;
  BTD.$ = $;
  BTD.$$ = $$;
  BTD.makeRng = makeRng;
  BTD.roundRect = roundRect;
  BTD.formatMoney = formatMoney;
  BTD.TOWER_ORDER = TOWER_ORDER;
  BTD.TOWERS = TOWERS;
  BTD.BLOONS = BLOONS;
  BTD.SPEED_SCALE = SPEED_SCALE;
  BTD.ROUNDS = ROUNDS;
})();
