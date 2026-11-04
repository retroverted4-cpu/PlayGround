// Bootstrap: renderer, game, UI, input and main loop.

import { W, H, MAP, TOWERS, BLOONS } from "./config.js";
import { Track } from "./path.js";
import { Renderer } from "./render.js";
import { Game } from "./game.js";
import { UI } from "./ui.js";
import { AudioKit } from "./audio.js";

const canvas = document.getElementById("game");
const stage = document.getElementById("stage");
const stageWrap = document.querySelector(".stage-wrap");
const rotateOverlay = document.getElementById("rotate");
let rotateWasDismissed = false;
try { rotateWasDismissed = sessionStorage.getItem("bloonRotateDismissed") === "1"; } catch {}
const rotateDismissed = { value: rotateWasDismissed };
const track = new Track(MAP.waypoints, 30);
const renderer = new Renderer(canvas, track, MAP.pathWidth);
const game = new Game(track, renderer.blockers);
const audio = new AudioKit();

let muted = false;
try { muted = localStorage.getItem("bloonPatrolMute") === "1"; } catch {}

const ui = new UI(game, renderer, {
  onRestart: () => restartRun(),
  onSound: () => toggleSound(),
  onUnlock: () => audio.unlock(),
});

if (muted) {
  audio.enabled = false;
  ui.el.sound.classList.add("off");
  ui.el.sound.title = "Sound off";
}

const shootThrottle = new Map();

game.onEvent = (name, data = {}) => {
  switch (name) {
    case "start":
      rotateOverlay.classList.add("hidden");
      break;
    case "place":
      audio.place();
      break;
    case "upgrade":
      audio.upgrade();
      ui.toast(`${data.upgrade.name} unlocked!`, "good", 1500);
      break;
    case "sell":
      audio.sell();
      ui.toast(`Sold for $${data.refund}`, "", 1300);
      break;
    case "error":
      audio.error();
      ui.toast(data.message || "Can't do that", "bad", 1700);
      break;
    case "bad":
      break;
    case "waveStart":
      audio.waveStart();
      ui.toast(`Wave ${data.round} incoming — ${data.count} bloons`, "", 1900);
      break;
    case "roundClear":
      audio.roundClear();
      ui.toast(`Wave ${data.round} cleared · +$${data.bonus}`, "good", 2300);
      game.addText(`Wave Clear +$${data.bonus}`, W / 2, H * 0.32, "#ffe9a1", true);
      break;
    case "leak":
      audio.leak();
      if (data.balloon?.def.big) ui.toast(`MOAB leaked! -${data.balloon.def.leak} lives`, "bad", 1800);
      break;
    case "gameover":
      audio.lose();
      setTimeout(() => ui.showGameOver(), 700);
      break;
    case "victory":
      audio.win();
      setTimeout(() => ui.showVictory(), 700);
      break;
    case "pop": {
      const r = BLOONS[data.type]?.radius || 14;
      audio.pop(r);
      break;
    }
    case "moabPop":
      audio.boom();
      ui.toast("MOAB popped!", "good", 1500);
      break;
    case "moab":
      audio.moab();
      ui.toast("MOAB detected — focus fire!", "bad", 2200);
      break;
    case "boom":
    case "magicBoom":
      audio.boom();
      break;
    case "ice":
      audio.ice();
      break;
    case "sniper":
      audio.shoot("sniper");
      break;
    case "shoot": {
      const kind = data.kind || "dart";
      const now = performance.now();
      const last = shootThrottle.get(kind) || 0;
      if (now - last > 55) {
        shootThrottle.set(kind, now);
        audio.shoot(kind);
      }
      break;
    }
    default:
      break;
  }
};

function toggleSound() {
  muted = !muted;
  audio.unlock();
  audio.setEnabled(!muted);
  ui.el.sound.classList.toggle("off", muted);
  ui.el.sound.title = muted ? "Sound off" : "Sound on";
  try { localStorage.setItem("bloonPatrolMute", muted ? "1" : "0"); } catch {}
  if (!muted) audio.tone({ freq: 660, end: 880, dur: 0.12, type: "triangle", vol: 0.08 });
}

function restartRun() {
  game.reset();
  game.started = true;
  game.paused = false;
  ui.hideOverlay();
  ui.cache = {};
  ui.inspectorSig = "";
  ui.el.inspector.classList.add("hidden");
  ui.el.inspector.innerHTML = "";
  ui.el.pause.classList.remove("on");
  ui.toast("Fresh start — place your towers", "good", 2000);
  audio.place();
}

// ---------------------------------------------------------------- input

function toWorld(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * W,
    y: ((e.clientY - rect.top) / rect.height) * H,
  };
}

canvas.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  e.preventDefault();
  audio.unlock();
  if (ui.overlayOpen) return;
  if (!game.started || game.over || game.victory) return;
  const p = toWorld(e);
  if (game.placing) {
    game.setPointer(p);
    const ok = game.tryPlaceAt(p.x, p.y);
    if (!ok) game.emit("ui");
    return;
  }
  game.selectAt(p.x, p.y);
  game.emit("ui");
});

canvas.addEventListener("pointermove", (e) => {
  if (e.pointerType === "touch") return;
  const p = toWorld(e);
  game.setPointer(p);
  canvas.style.cursor = game.placing ? (game.placementValid ? "copy" : "not-allowed") : "crosshair";
});

canvas.addEventListener("pointerleave", () => {
  game.setPointer(null);
});

canvas.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  if (game.placing) {
    game.disarmTower();
    game.emit("ui");
  }
});

window.addEventListener("keydown", (e) => {
  if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
  audio.unlock();
  const key = e.key.toLowerCase();

  if (key === "escape") {
    if (ui.overlayMode === "pause") {
      ui.togglePause();
    } else if (ui.overlayMode === "help") {
      ui.closeHelp();
    } else if (!ui.overlayOpen) {
      if (game.placing) {
        game.disarmTower();
        game.emit("ui");
      } else if (game.selected) {
        game.selected = null;
        game.emit("deselect");
      }
    }
    return;
  }

  if (ui.overlayOpen) {
    if (key === "p" && ui.overlayMode === "pause") ui.togglePause();
    return;
  }
  if (!game.started || game.over || game.victory) return;

  if (/^[1-9]$/.test(key)) {
    const def = TOWERS[Number(key) - 1];
    if (def) {
      game.armTower(def.id);
      game.emit("ui");
    }
  } else if (key === " ") {
    e.preventDefault();
    game.startRound();
  } else if (key === "p") {
    ui.togglePause();
  } else if (key === "f") {
    game.speed = game.speed === 1 ? 2 : game.speed === 2 ? 3 : 1;
    game.emit("ui");
  } else if (key === "m") {
    toggleSound();
  } else if (key === "u") {
    game.upgradeSelected();
  } else if (key === "s") {
    game.sellSelected();
  } else if (key === "a") {
    game.autoStart = !game.autoStart;
    if (game.autoStart && !game.roundActive) game.autoTimer = Math.max(game.autoTimer, 2.4);
    game.emit("ui");
  } else if (key === "enter") {
    game.startRound();
  }
});

window.addEventListener("resize", () => fitStage());
if (window.ResizeObserver) {
  const ro = new ResizeObserver(() => fitStage());
  ro.observe(stageWrap);
}

function fitStage() {
  const rect = stageWrap.getBoundingClientRect();
  let w = rect.width;
  let h = w * (H / W);
  if (h > rect.height) {
    h = rect.height;
    w = h * (W / H);
  }
  stage.style.width = Math.max(240, Math.floor(w)) + "px";
  stage.style.height = Math.max(135, Math.floor(h)) + "px";
  document.documentElement.style.setProperty("--stage-w", Math.max(240, Math.floor(w)) + "px");
  renderer.resize();
  updateRotate();
}

function updateRotate() {
  const portraitPhone = window.innerWidth <= 700 && window.innerHeight > window.innerWidth;
  const show = portraitPhone && !rotateDismissed.value && !game.started;
  rotateOverlay.classList.toggle("hidden", !show);
}

document.getElementById("btn-play-anyway").addEventListener("click", () => {
  rotateDismissed.value = true;
  try { sessionStorage.setItem("bloonRotateDismissed", "1"); } catch {}
  rotateOverlay.classList.add("hidden");
  audio.unlock();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && game.started && game.roundActive && !game.paused && !ui.overlayOpen) {
    game.paused = true;
    ui.showPause();
    ui.el.pause.classList.add("on");
  }
});

// ---------------------------------------------------------------- loop

ui.showIntro();
fitStage();
ui.sync();

let last = performance.now();
let uiLast = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (game.started && !game.paused && !game.over && !game.victory && !ui.overlayOpen) {
    game.update(dt * game.speed);
  }
  renderer.draw(game, now / 1000);
  if (now - uiLast > 80) {
    ui.sync();
    uiLast = now;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Debug hook for automated checks.
window.__bloonPatrol = { game, ui, renderer, audio, track };
