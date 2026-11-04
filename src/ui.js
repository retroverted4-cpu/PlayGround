// DOM UI: HUD, armory cards, tower inspector, overlays, toasts.

import { TOWERS, TOWER_BY_ID, TARGET_LABEL, MAX_ROUND } from "./config.js";

export class UI {
  constructor(game, renderer, hooks = {}) {
    this.game = game;
    this.renderer = renderer;
    this.hooks = hooks;
    this.cache = {};
    this.inspectorSig = "";
    this.toastTimer = null;
    this.overlayMode = null;
    this.helpWasPaused = false;

    this.el = {
      lives: document.getElementById("hud-lives"),
      cash: document.getElementById("hud-cash"),
      round: document.getElementById("hud-round"),
      speed: document.getElementById("btn-speed"),
      pause: document.getElementById("btn-pause"),
      sound: document.getElementById("btn-sound"),
      help: document.getElementById("btn-help"),
      roundLabel: document.getElementById("round-label"),
      progress: document.getElementById("round-progress"),
      auto: document.getElementById("auto-start"),
      start: document.getElementById("btn-start"),
      shop: document.getElementById("shop"),
      inspector: document.getElementById("inspector"),
      overlay: document.getElementById("overlay"),
      toast: document.getElementById("toast"),
      hint: document.getElementById("place-hint"),
    };

    this.buildShop();
    this.bind();
  }

  // ------------------------------------------------------------- build

  buildShop() {
    const wrap = this.el.shop;
    wrap.innerHTML = "";
    TOWERS.forEach((def, i) => {
      const card = document.createElement("button");
      card.className = "tower-card";
      card.dataset.tower = def.id;
      card.style.animationDelay = `${i * 30}ms`;
      const cv = document.createElement("canvas");
      cv.width = 84;
      cv.height = 84;
      cv.setAttribute("aria-hidden", "true");
      const ctx = cv.getContext("2d");
      ctx.translate(42, 45);
      this.renderer.drawTowerBody(ctx, def.id, 0, -Math.PI / 2 + 0.2, 0.6, 0, 0, 1.15);
      card.appendChild(cv);
      const body = document.createElement("div");
      body.className = "tc-body";
      const name = document.createElement("div");
      name.className = "tc-name";
      name.textContent = def.name;
      const price = document.createElement("div");
      price.className = "price";
      price.textContent = String(def.cost);
      body.appendChild(name);
      body.appendChild(price);
      card.appendChild(body);
      const key = document.createElement("span");
      key.className = "key";
      key.textContent = String(i + 1);
      card.appendChild(key);
      card.title = `${def.name} — $${def.cost}\n${def.blurb}`;
      card.addEventListener("click", () => {
        this.game.armTower(def.id);
        this.game.emit("ui");
      });
      wrap.appendChild(card);
    });
  }

  bind() {
    this.el.start.addEventListener("click", () => {
      if (!this.game.started) this.game.startGame();
      this.game.startRound();
      this.game.emit("ui");
    });

    this.el.auto.addEventListener("change", () => {
      this.game.autoStart = this.el.auto.checked;
      if (this.game.autoStart && this.game.started && !this.game.roundActive && !this.game.over && !this.game.victory) {
        this.game.autoTimer = Math.max(this.game.autoTimer, 2.4);
      }
    });

    this.el.speed.addEventListener("click", () => {
      const next = this.game.speed === 1 ? 2 : this.game.speed === 2 ? 3 : 1;
      this.game.speed = next;
      this.game.emit("ui");
    });

    this.el.pause.addEventListener("click", () => this.togglePause());
    this.el.sound.addEventListener("click", () => this.hooks.onSound?.());
    this.el.help.addEventListener("click", () => this.showHelp());

    this.el.inspector.addEventListener("click", (e) => {
      const action = e.target.closest("[data-action]")?.dataset.action;
      if (action === "close") {
        this.game.selected = null;
        this.game.emit("deselect");
      } else if (action === "target") {
        this.game.cycleTarget();
      } else if (action === "upgrade") {
        this.game.upgradeSelected();
      } else if (action === "sell") {
        this.game.sellSelected();
      }
    });

    this.el.overlay.addEventListener("click", (e) => {
      const action = e.target.closest("[data-action]")?.dataset.action;
      if (!action) return;
      if (action === "play") {
        this.hideOverlay();
        this.game.startGame();
        this.game.emit("ui");
        this.hooks.onUnlock?.();
      } else if (action === "help") {
        this.showHelp();
      } else if (action === "resume") {
        this.hideOverlay();
        this.game.paused = false;
        this.game.emit("ui");
      } else if (action === "restart") {
        this.hideOverlay();
        this.hooks.onRestart?.();
      } else if (action === "close-help") {
        this.hideOverlay();
        if (!this.helpWasPaused) this.game.paused = false;
        this.helpWasPaused = false;
        this.game.emit("ui");
      } else if (action === "close-help-paused") {
        this.hideOverlay();
        this.game.emit("ui");
      } else if (action === "resume-help") {
        this.hideOverlay();
        this.game.paused = false;
        this.game.emit("ui");
      }
    });
  }

  // ------------------------------------------------------------- overlays

  showOverlay(html, mode) {
    this.overlayMode = mode;
    this.el.overlay.innerHTML = html;
    this.el.overlay.classList.remove("hidden");
  }

  hideOverlay() {
    this.overlayMode = null;
    this.el.overlay.classList.add("hidden");
    this.el.overlay.innerHTML = "";
  }

  get overlayOpen() {
    return this.overlayMode !== null;
  }

  togglePause() {
    if (!this.game.started || this.game.over || this.game.victory) return;
    if (this.overlayOpen) {
      if (this.overlayMode === "pause") {
        this.hideOverlay();
        this.game.paused = false;
      }
      return;
    }
    if (this.game.paused) {
      this.game.paused = false;
      this.el.pause.classList.remove("on");
    } else {
      this.game.paused = true;
      this.el.pause.classList.add("on");
      this.showPause();
    }
    this.game.emit("ui");
  }

  showIntro() {
    const best = this.game.bestRound > 0 ? `<p class="lede" style="margin-top:14px;color:#ffcf5c;font-weight:800;font-size:12px">Your best: wave ${this.game.bestRound}</p>` : "";
    this.showOverlay(`
      <div class="panel">
        <p class="eyebrow">Sunny Meadow · 40 waves</p>
        <h2>They float.<br><span class="accent">They pop.</span></h2>
        <p class="lede">A parade of balloons is heading for the village. Build a ridiculous army of monkeys, wizards and war machines to stop every last one.</p>
        ${best}
        <div class="how">
          <div><b>1 · Build</b>Pick a tower from the armory, then tap the grass to place it.</div>
          <div><b>2 · Pop</b>Bloons split into smaller, faster bloons. Pop those too.</div>
          <div><b>3 · Upgrade</b>Tap any tower for three tiers of upgrades and targeting.</div>
          <div><b>4 · Survive</b>Leaks cost lives. Clear all 40 waves to win the meadow.</div>
        </div>
        <button class="big-btn" data-action="play">
          <svg viewBox="0 0 24 24"><path d="M8 5.5v13l10-6.5z" fill="currentColor"/></svg>
          Start Defending
        </button>
      </div>
    `, "intro");
  }

  showHelp() {
    if (this.overlayMode === "help") return;
    this.helpWasPaused = this.game.paused;
    if (this.game.started && !this.game.over && !this.game.victory) this.game.paused = true;
    const inGame = this.game.started && !this.game.over && !this.game.victory;
    this.showOverlay(`
      <div class="panel">
        <p class="eyebrow">Field Manual</p>
        <h2>How to play</h2>
        <p class="lede">Every bloon that reaches the gate costs lives. Keep the track covered and upgrade early — later waves get spicy.</p>
        <div class="how">
          <div><b>Placement</b>Towers can't sit on the dirt track or on trees and rocks.</div>
          <div><b>Targeting</b>First, Last, Closest or Strongest. Snipers hit anywhere.</div>
          <div><b>Money</b>Every pop pays. Clear a wave for a cash bonus. Sell for 80% back.</div>
          <div><b>Speed</b>1× / 2× / 3× with F. Pause with P. Mute with M.</div>
          <div><b>Hotkeys</b>1–9 select towers. Esc cancels. S sells. U upgrades.</div>
          <div><b>Bosses</b>MOAB blimps arrive from wave 25. They hit hard and split.</div>
        </div>
        <button class="big-btn" data-action="${inGame ? "close-help" : "play"}">${inGame ? "Back to the meadow" : "Start Defending"}</button>
      </div>
    `, "help");
  }

  showPause() {
    this.showOverlay(`
      <div class="panel">
        <p class="eyebrow">Take a breath</p>
        <h2>Paused</h2>
        <p class="lede">The bloons are politely waiting. Upgrade something while you're here.</p>
        <button class="big-btn" data-action="resume">Resume</button>
        <button class="ghost-btn" data-action="restart">Restart Run</button>
      </div>
    `, "pause");
  }

  showGameOver() {
    const g = this.game;
    this.showOverlay(`
      <div class="panel">
        <p class="eyebrow">Defeat</p>
        <h2>The bloons<br><span class="accent">got through.</span></h2>
        <p class="lede">The meadow needs a better plan. Try a tighter bend, more upgrades, or a wall of ice.</p>
        <div class="result-stats">
          <div class="result-stat"><span>Wave</span><b>${Math.min(g.round, MAX_ROUND)}</b></div>
          <div class="result-stat"><span>Bloons popped</span><b>${g.popped}</b></div>
          <div class="result-stat"><span>Best</span><b>${g.bestRound}</b></div>
        </div>
        <button class="big-btn" data-action="restart">Try Again</button>
      </div>
    `, "gameover");
  }

  showVictory() {
    const g = this.game;
    this.showOverlay(`
      <div class="panel">
        <p class="eyebrow">Victory · 40 / 40 waves</p>
        <h2>Meadow<br><span class="accent">secured.</span></h2>
        <p class="lede">Every last bloon has been popped. The village is safe, the monkeys are celebrating, and the grass will never be the same.</p>
        <div class="result-stats">
          <div class="result-stat"><span>Lives left</span><b>${g.lives}</b></div>
          <div class="result-stat"><span>Popped</span><b>${g.popped}</b></div>
          <div class="result-stat"><span>Earned</span><b>$${g.cashEarned}</b></div>
        </div>
        <button class="big-btn" data-action="restart">Play Again</button>
      </div>
    `, "victory");
  }

  // ------------------------------------------------------------- per-frame

  sync() {
    const g = this.game;
    if (this.cache.lives !== g.lives) {
      this.el.lives.textContent = g.lives;
      this.cache.lives = g.lives;
    }
    if (this.cache.cash !== g.cash) {
      this.el.cash.textContent = g.cash;
      this.cache.cash = g.cash;
    }
    if (this.cache.round !== g.round) {
      this.el.round.textContent = Math.min(g.round, MAX_ROUND);
      this.cache.round = g.round;
    }

    const speedLabel = g.speed + "×";
    if (this.cache.speed !== speedLabel) {
      this.el.speed.textContent = speedLabel;
      this.el.speed.classList.toggle("on", g.speed > 1);
      this.cache.speed = speedLabel;
    }

    // Start button.
    let startHTML;
    let disabled = false;
    if (g.roundActive) {
      startHTML = `<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10-6.5z" fill="currentColor"/></svg><span>Wave in Progress</span>`;
      disabled = true;
    } else if (g.round > MAX_ROUND) {
      startHTML = `<span>All Waves Cleared</span>`;
      disabled = true;
    } else {
      startHTML = `<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10-6.5z" fill="currentColor"/></svg><span>Start Wave ${g.round}</span>`;
    }
    const startSig = startHTML + (disabled ? "1" : "0");
    if (this.cache.start !== startSig) {
      this.el.start.innerHTML = startHTML;
      this.el.start.disabled = disabled;
      this.el.start.classList.toggle("pulse", !disabled && !g.roundActive && g.started && !this.overlayOpen);
      this.cache.start = startSig;
    }

    const label = g.roundActive
      ? `Wave ${g.round} · ${g.balloons.length + (g.spawnQueue.length - g.spawnIndex)} left`
      : g.started
        ? `Wave ${Math.min(g.round, MAX_ROUND)} / ${MAX_ROUND}`
        : "Get ready";
    if (this.cache.label !== label) {
      this.el.roundLabel.textContent = label;
      this.cache.label = label;
    }
    const prog = g.roundActive ? `${Math.round(g.waveProgress() * 100)}%` : "0%";
    if (this.cache.prog !== prog) {
      this.el.progress.style.width = prog;
      this.cache.prog = prog;
    }

    if (this.cache.auto !== g.autoStart) {
      this.el.auto.checked = g.autoStart;
      this.cache.auto = g.autoStart;
    }

    // Shop affordability + selection.
    const cards = this.el.shop.children;
    for (const card of cards) {
      const def = TOWER_BY_ID[card.dataset.tower];
      const poor = g.cash < def.cost;
      if (card.classList.contains("poor") !== poor) card.classList.toggle("poor", poor);
      const sel = g.placing === def.id;
      if (card.classList.contains("selected") !== sel) card.classList.toggle("selected", sel);
    }

    // Placement hint.
    if (g.placing) {
      const def = TOWER_BY_ID[g.placing];
      const text = `Placing ${def.name} · $${def.cost} — tap the grass · Esc to cancel`;
      if (this.el.hint.textContent !== text) this.el.hint.textContent = text;
      this.el.hint.classList.remove("hidden");
    } else if (!this.el.hint.classList.contains("hidden")) {
      this.el.hint.classList.add("hidden");
    }

    // Pause button state.
    const paused = g.paused;
    if (this.cache.paused !== paused) {
      this.el.pause.classList.toggle("on", paused);
      this.el.pause.innerHTML = paused
        ? `<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10-6.5z" fill="currentColor"/></svg>`
        : `<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1.2" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1.2" fill="currentColor"/></svg>`;
      this.cache.paused = paused;
    }

    this.syncInspector();
  }

  syncInspector() {
    const g = this.game;
    const t = g.selected;
    if (!t) {
      if (this.cache.inspecting) {
        this.el.inspector.classList.add("hidden");
        this.el.inspector.innerHTML = "";
        this.inspectorSig = "";
        this.cache.inspecting = false;
      }
      return;
    }
    this.cache.inspecting = true;
    const sig = `${t.id}:${t.level}:${t.targetMode}`;
    if (sig !== this.inspectorSig) {
      this.inspectorSig = sig;
      this.el.inspector.classList.remove("hidden");
      this.el.inspector.innerHTML = this.inspectorHTML(t);
      const cv = this.el.inspector.querySelector("canvas");
      if (cv) {
        const ctx = cv.getContext("2d");
        ctx.translate(44, 47);
        this.renderer.drawTowerBody(ctx, t.def.id, t.level, -Math.PI / 2 + 0.2, 0.6, 0, 0, 1.15);
      }
    }
    // Live affordability / refund.
    const upBtn = this.el.inspector.querySelector('[data-action="upgrade"]');
    if (upBtn) {
      const next = t.def.upgrades[t.level];
      const poor = g.cash < next.cost;
      if (upBtn.disabled !== poor) upBtn.disabled = poor;
      const cost = upBtn.querySelector(".cost");
      if (cost) cost.textContent = "$" + next.cost;
    }
    const sell = this.el.inspector.querySelector('[data-action="sell"] .val');
    if (sell) {
      const val = "$" + Math.floor(t.spent * 0.8);
      if (sell.textContent !== val) sell.textContent = val;
    }
  }

  inspectorHTML(t) {
    const s = t.stats;
    const up = t.def.upgrades[t.level];
    const refund = Math.floor(t.spent * 0.8);
    const stats = `
      <div class="ins-stats">
        <div class="ins-stat"><span>Damage</span><b>${fmt(s.damage)}</b></div>
        <div class="ins-stat"><span>Range</span><b>${s.range > 3000 ? "∞" : Math.round(s.range)}</b></div>
        <div class="ins-stat"><span>Rate</span><b>${(1 / s.cooldown).toFixed(1)}/s</b></div>
      </div>`;
    let upgradeArea;
    if (up) {
      upgradeArea = `
        <button class="ins-upgrade" data-action="upgrade" ${this.game.cash < up.cost ? "disabled" : ""}>
          <span class="plus">+</span>
          <span class="txt"><b>${up.name}</b><span>Tier ${t.level + 1} · ${up.desc}</span></span>
          <span class="cost">$${up.cost}</span>
        </button>`;
    } else {
      upgradeArea = `<div class="ins-maxed">★ Fully Upgraded ★</div>`;
    }
    return `
      <div class="ins-head">
        <canvas class="ins-icon" width="88" height="88"></canvas>
        <div class="ins-title">
          <h3>${t.def.name}</h3>
          <p>Tier ${t.level}${t.level >= 3 ? " · Max" : ""} · ${t.kills} pops</p>
        </div>
        <button class="ins-close" data-action="close" aria-label="Close">×</button>
      </div>
      ${stats}
      <button class="ins-target" data-action="target">Targeting <em>${TARGET_LABEL[t.targetMode]} ⇄</em></button>
      ${upgradeArea}
      <div class="ins-foot">
        <button class="ins-sell" data-action="sell">Sell <span class="val">$${refund}</span></button>
      </div>
    `;
  }

  // ------------------------------------------------------------- toast

  toast(message, kind = "", duration = 2000) {
    const el = this.el.toast;
    el.textContent = message;
    el.className = "toast show " + kind;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      el.classList.remove("show");
    }, duration);
  }
}

function fmt(n) {
  return Number.isInteger(n) ? n : n.toFixed(1);
}
