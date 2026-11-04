/* =========================================================
   BLOONS TD 5 — SUNSET GROVE
   Interface, input, and the main loop.
   ========================================================= */
(() => {
  "use strict";
  const BTD = window.BTD;
  const { TOWERS, TOWER_ORDER, ROUNDS, BLOONS, formatMoney, Sound, $, clamp } = BTD;

  const canvas = $("#game");
  const stage = $("#stage");
  const game = new BTD.Game(canvas, stage);
  window.BTD.game = game;

  const els = {
    lives: $("#livesValue"),
    cash: $("#cashValue"),
    wave: $("#waveValue"),
    score: $("#scoreValue"),
    shop: $("#towerShop"),
    startBtn: $("#startBtn"),
    startLabel: $("#startLabel"),
    startHint: $("#startHint"),
    roundEyebrow: $("#roundEyebrow"),
    roundNumber: $("#roundNumber"),
    roundSub: $("#roundSub"),
    waveProgress: $("#waveProgress"),
    autoBtn: $("#autoBtn"),
    speedBtn: $("#speedBtn"),
    speedLabel: $("#speedLabel"),
    pauseBtn: $("#pauseBtn"),
    soundBtn: $("#soundBtn"),
    pauseOverlay: $("#pauseOverlay"),
    resumeBtn: $("#resumeBtn"),
    banner: $("#roundBanner"),
    bannerKicker: $("#bannerKicker"),
    bannerTitle: $("#bannerTitle"),
    bannerSub: $("#bannerSub"),
    toast: $("#toast"),
    toastText: $("#toastText"),
    coach: $("#coach"),
    coachClose: $("#coachClose"),
    placementBar: $("#placementBar"),
    placementText: $("#placementText"),
    cancelPlacement: $("#cancelPlacement"),
    panel: $("#towerPanel"),
    inspectorIcon: $("#inspectorIcon"),
    towerName: $("#towerName"),
    towerLevel: $("#towerLevel"),
    towerPips: $("#towerPips"),
    towerDesc: $("#towerDesc"),
    upgradeBtn: $("#upgradeBtn"),
    upgradeName: $("#upgradeName"),
    upgradeDesc: $("#upgradeDesc"),
    upgradeCost: $("#upgradeCost"),
    targetBtn: $("#targetBtn"),
    sellBtn: $("#sellBtn"),
    sellValue: $("#sellValue"),
    inspectorClose: $("#inspectorClose"),
    bossWarning: $("#bossWarning"),
    helpBtn: $("#helpBtn"),
    helpOverlay: $("#helpOverlay"),
    helpClose: $("#helpClose"),
    helpStart: $("#helpStart"),
    endOverlay: $("#endOverlay"),
    endCard: $(".end-card", $("#endOverlay")),
    endKicker: $("#endKicker"),
    endTitle: $("#endTitle"),
    endSub: $("#endSub"),
    endRounds: $("#endRounds"),
    endPops: $("#endPops"),
    endScore: $("#endScore"),
    playAgain: $("#playAgainBtn")
  };

  let bannerTimer = 0;
  let toastTimer = 0;
  let bossTimer = 0;
  let helpWasPaused = false;
  let lastHudAt = 0;
  let inspectorKey = "";
  let lastValues = {};
  const shopCards = new Map();

  // -----------------------------------------------------
  // Shop cards
  // -----------------------------------------------------
  function buildShop() {
    TOWER_ORDER.forEach((type, index) => {
      const def = TOWERS[type];
      const button = document.createElement("button");
      button.className = "tower-card";
      button.type = "button";
      button.dataset.type = type;
      button.setAttribute("aria-label", `${def.name}, $${def.cost}. ${def.desc}`);
      button.title = `${def.name} — $${def.cost}\n${def.desc}\nHotkey ${index + 1}`;
      button.innerHTML = `
        <span class="card-key">${index + 1}</span>
        <canvas width="92" height="92" aria-hidden="true"></canvas>
        <span class="card-lock" aria-hidden="true"></span>
        <span class="card-name">${def.name.replace(" Monkey", "")}</span>
        <span class="card-cost">${def.cost}</span>`;
      button.addEventListener("click", () => {
        Sound.init();
        if (game.gameOver || game.paused) return;
        game.selectBuild(type);
        syncSelection();
        updateHud(true);
      });
      els.shop.appendChild(button);
      shopCards.set(type, button);
      BTD.Art.drawTowerIcon(button.querySelector("canvas"), type);
    });
  }

  // -----------------------------------------------------
  // Selection / inspector
  // -----------------------------------------------------
  function syncSelection() {
    for (const [type, card] of shopCards) {
      card.classList.toggle("selected", game.selectedType === type);
      card.setAttribute("aria-pressed", game.selectedType === type ? "true" : "false");
    }
    const showPanel = !!game.selectedTower && !game.gameOver;
    els.panel.classList.toggle("show", showPanel);
    els.placementBar.classList.toggle("show", !!game.selectedType && !game.gameOver && !game.paused);
    els.coach.classList.toggle("hide", game.tutorialDismissed || !!game.selectedType || !!game.selectedTower || game.round > 0 || game.gameOver);
    if (game.selectedType) {
      updatePlacementText();
    }
    if (showPanel) updateInspector(true);
    else inspectorKey = "";
  }

  function updatePlacementText() {
    if (!game.selectedType) return;
    const def = TOWERS[game.selectedType];
    if (game.pointer.inside && !game.ghostValid) {
      els.placementText.textContent = game.ghostReason || "Find a little more open grass.";
    } else {
      els.placementText.textContent = `Place ${def.name} — tap the grass near the track`;
    }
  }

  function updateInspector(force = false) {
    const t = game.selectedTower;
    if (!t) {
      els.panel.classList.remove("show");
      return;
    }
    const up = t.upgrade;
    const key = `${t.id}:${t.level}:${game.money >= (up ? up.cost : 0) ? 1 : 0}:${t.mode}:${t.sellValue}`;
    if (!force && key === inspectorKey) return;
    inspectorKey = key;

    BTD.Art.drawTowerIcon(els.inspectorIcon, t.type);
    els.towerName.textContent = t.def.name;
    els.towerLevel.textContent = t.isScout ? "Free scout" : `Level ${t.level + 1}`;
    [...els.towerPips.children].forEach((pip, i) => pip.classList.toggle("on", i < t.level));

    const mode = t.modeInfo();
    els.towerDesc.textContent = t.level === 0
      ? t.def.desc
      : `${t.def.desc} ${mode.hint}`;

    if (t.maxed) {
      els.upgradeBtn.classList.add("maxed");
      els.upgradeBtn.disabled = true;
      els.upgradeName.textContent = "Fully upgraded";
      els.upgradeDesc.textContent = "This monkey has reached its full potential.";
      els.upgradeCost.textContent = "MAX";
      els.upgradeCost.style.color = "#8ce36c";
    } else {
      els.upgradeBtn.classList.remove("maxed");
      els.upgradeName.textContent = up.name;
      els.upgradeDesc.textContent = up.desc;
      els.upgradeCost.textContent = `$${formatMoney(up.cost)}`;
      els.upgradeCost.style.color = "";
      els.upgradeBtn.disabled = game.money < up.cost || game.gameOver;
    }

    els.targetBtn.querySelector("b").textContent = mode.label;
    els.targetBtn.title = mode.hint;
    const value = t.sellValue;
    els.sellValue.textContent = value > 0 ? `$${formatMoney(value)}` : "Free";
    els.sellBtn.disabled = value <= 0 || t.isScout && value <= 0;
  }

  // -----------------------------------------------------
  // HUD and round console
  // -----------------------------------------------------
  function updateHud(force = false) {
    const now = performance.now();
    if (!force && now - lastHudAt < 80) return;
    lastHudAt = now;

    const displayRound = game.roundActive
      ? game.round
      : game.round === 0
        ? 1
        : game.round < ROUNDS.length
          ? game.round + 1
          : game.round;
    const alive = game.bloons.length;
    const remainingSpawns = game.spawnPlan.length;

    const values = {
      lives: String(game.lives),
      cash: formatMoney(game.money),
      wave: game.round || 1,
      score: formatMoney(Math.round(game.score)),
      round: displayRound
    };
    if (force || values.lives !== lastValues.lives) els.lives.textContent = values.lives;
    if (force || values.cash !== lastValues.cash) els.cash.textContent = values.cash;
    if (force || values.wave !== lastValues.wave) els.wave.innerHTML = `${values.wave}<em>/${ROUNDS.length}</em>`;
    if (force || values.score !== lastValues.score) els.score.textContent = values.score;
    if (force || values.round !== lastValues.round) {
      els.roundNumber.innerHTML = `${displayRound} <em>/ ${ROUNDS.length}</em>`;
    }
    lastValues = values;

    if (game.roundActive) {
      els.roundEyebrow.textContent = `WAVE ${game.round} IN PROGRESS`;
      els.roundSub.textContent = `${alive} bloon${alive === 1 ? "" : "s"} on the field${remainingSpawns ? ` · ${remainingSpawns} incoming` : ""}`;
    } else if (game.round === 0) {
      els.roundEyebrow.textContent = "NEXT ROUND";
      els.roundSub.textContent = BTD.describeRound(1);
    } else if (game.round < ROUNDS.length) {
      els.roundEyebrow.textContent = "NEXT ROUND";
      if (game.autoStart && game.autoTimer > 0) {
        els.roundSub.textContent = `Auto-starting in ${Math.ceil(game.autoTimer)}s`;
      } else {
        els.roundSub.textContent = BTD.describeRound(game.round + 1);
      }
    } else {
      els.roundEyebrow.textContent = "FINAL WAVE";
      els.roundSub.textContent = game.gameOver && game.won ? "The grove is safe." : BTD.describeRound(ROUNDS.length);
    }

    const disabled = game.roundActive || game.gameOver;
    els.startBtn.disabled = disabled;
    if (game.roundActive) {
      els.startLabel.textContent = "Wave in progress";
      els.startHint.textContent = `${alive + remainingSpawns} bloons remaining`;
    } else if (game.gameOver) {
      els.startLabel.textContent = game.won ? "Grove defended" : "Defense failed";
      els.startHint.textContent = game.won ? "Victory!" : "Try again";
    } else if (game.round >= ROUNDS.length) {
      els.startLabel.textContent = "Victory!";
      els.startHint.textContent = "All rounds cleared";
      els.startBtn.disabled = true;
    } else {
      els.startLabel.textContent = "Start Round";
      els.startHint.textContent = "Space";
    }

    const progress = game.roundActive && game.roundTotal
      ? clamp(game.roundSpawned / game.roundTotal, 0, 1)
      : game.round > 0 && !game.roundActive
        ? 1
        : 0;
    els.waveProgress.style.width = `${(progress * 100).toFixed(1)}%`;

    els.autoBtn.setAttribute("aria-pressed", game.autoStart ? "true" : "false");
    els.speedLabel.textContent = `${game.speed}×`;
    els.soundBtn.classList.toggle("is-muted", Sound.muted);
    els.soundBtn.setAttribute("aria-label", Sound.muted ? "Unmute game" : "Mute game");

    for (const [type, card] of shopCards) {
      card.classList.toggle("unaffordable", game.money < TOWERS[type].cost);
    }

    updateInspector(false);
    if (game.selectedType) updatePlacementText();
    els.placementBar.classList.toggle("show", !!game.selectedType && !game.gameOver && !game.paused);
    els.coach.classList.toggle("hide", game.tutorialDismissed || !!game.selectedType || !!game.selectedTower || game.round > 0 || game.gameOver);
  }

  // -----------------------------------------------------
  // Notifications
  // -----------------------------------------------------
  function showToast(text, ms = 2600) {
    els.toastText.textContent = text;
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => els.toast.classList.remove("show"), ms);
  }

  function showBanner(kicker, title, sub, boss = false, ms = 3200) {
    els.bannerKicker.textContent = kicker;
    els.bannerTitle.textContent = title;
    els.bannerSub.textContent = sub;
    els.banner.classList.toggle("boss", boss);
    els.banner.classList.add("show");
    clearTimeout(bannerTimer);
    bannerTimer = window.setTimeout(() => els.banner.classList.remove("show"), ms);
  }

  function showBossWarning(text = "MOAB INCOMING") {
    els.bossWarning.querySelector("b").textContent = text;
    els.bossWarning.classList.add("show");
    clearTimeout(bossTimer);
    bossTimer = window.setTimeout(() => els.bossWarning.classList.remove("show"), 4300);
  }

  function hideBossWarning() {
    clearTimeout(bossTimer);
    els.bossWarning.classList.remove("show");
  }

  // -----------------------------------------------------
  // Game hooks
  // -----------------------------------------------------
  game.hooks.roundStart = ({ round, groups }) => {
    const big = groups.find((g) => BLOONS[g.type].big);
    hideBossWarning();
    if (big) {
      const isBfb = big.type === "bfb";
      showBanner(`ROUND ${round}`, isBfb ? "BFB INCOMING!" : "MOAB INCOMING!", BTD.describeRound(round), true, 3600);
      showBossWarning(isBfb ? "BFB INCOMING" : "MOAB INCOMING");
    } else {
      showBanner(`ROUND ${round}`, round === 1 ? "RED BLOONS INCOMING!" : "HERE THEY COME!", BTD.describeRound(round), false, 2800);
    }
    els.coach.classList.add("hide");
    syncSelection();
    updateHud(true);
  };

  game.hooks.roundComplete = ({ round, reward }) => {
    if (round >= ROUNDS.length) {
      showBanner("FINAL ROUND CLEAR", "THE GROVE HOLDS!", `+$${reward} round bonus`, false, 1900);
    } else {
      showBanner(`ROUND ${round} CLEAR`, "NICE POPPING!", `+$${reward} round bonus`, false, 2200);
      showToast(`Round ${round} cleared! +$${reward}`, 2300);
    }
    hideBossWarning();
    updateHud(true);
  };

  game.hooks.gameover = ({ won, round, pops, score }) => {
    hideBossWarning();
    els.endCard.classList.toggle("lost", !won);
    els.endKicker.textContent = won ? "SUNSET GROVE SURVIVES" : "THE BLOONS BROKE THROUGH";
    els.endTitle.textContent = won ? "VICTORY!" : "GAME OVER";
    els.endSub.textContent = won
      ? "Every last bloon has been popped. The grove can finally rest."
      : "The bloons slipped past your defenses. Regroup and try a new strategy.";
    els.endRounds.textContent = `${round}`;
    els.endPops.textContent = pops.toLocaleString("en-US");
    els.endScore.textContent = score.toLocaleString("en-US");
    els.endOverlay.classList.add("show");
    els.pauseOverlay.classList.remove("show");
    els.helpOverlay.classList.remove("show");
    els.pauseBtn.classList.remove("is-paused");
    game.paused = false;
    syncSelection();
    updateHud(true);
  };

  game.hooks.reset = () => {
    els.endOverlay.classList.remove("show");
    els.pauseOverlay.classList.remove("show");
    els.helpOverlay.classList.remove("show");
    els.pauseBtn.classList.remove("is-paused");
    hideBossWarning();
    inspectorKey = "";
    syncSelection();
    updateHud(true);
    showToast("A new defense begins. Place your monkeys!", 3000);
  };

  game.hooks.toast = (text) => showToast(text);
  game.hooks.leak = ({ amount, lives }) => {
    if (lives > 0 && amount >= 20) showToast(`Breach! −${amount} lives`, 1800);
  };
  game.hooks.bossPop = ({ type }) => {
    showToast(`${BLOONS[type].label} destroyed!`, 2400);
  };

  // -----------------------------------------------------
  // Actions
  // -----------------------------------------------------
  function startRound() {
    Sound.init();
    if (game.gameOver || game.paused) return;
    if (game.selectedType) game.cancelBuild();
    if (game.startRound()) {
      syncSelection();
      updateHud(true);
    }
  }

  function togglePause() {
    if (game.gameOver) return;
    if (els.helpOverlay.classList.contains("show")) {
      closeHelp();
      return;
    }
    game.paused = !game.paused;
    els.pauseOverlay.classList.toggle("show", game.paused);
    els.pauseBtn.classList.toggle("is-paused", game.paused);
    if (game.paused) Sound.play("click");
    syncSelection();
    updateHud(true);
  }

  function cycleSpeed() {
    const speeds = [1, 2, 3];
    const idx = speeds.indexOf(game.speed);
    game.speed = speeds[(idx + 1) % speeds.length];
    els.speedLabel.textContent = `${game.speed}×`;
    showToast(`Game speed: ${game.speed}×`, 1200);
    Sound.play("click");
  }

  function toggleSound() {
    Sound.init();
    Sound.setMuted(!Sound.muted);
    els.soundBtn.classList.toggle("is-muted", Sound.muted);
    els.soundBtn.setAttribute("aria-label", Sound.muted ? "Unmute game" : "Mute game");
    try { localStorage.setItem("btd5-muted", Sound.muted ? "1" : "0"); } catch {}
  }

  function toggleAuto() {
    game.autoStart = !game.autoStart;
    if (game.autoStart) {
      if (!game.roundActive && game.round > 0 && game.round < ROUNDS.length && game.autoTimer <= 0) {
        game.autoTimer = 3;
      }
      showToast("Auto-start enabled. Next round will begin automatically.", 2300);
    } else {
      game.autoTimer = 0;
      showToast("Auto-start disabled.", 1600);
    }
    Sound.play("click");
    updateHud(true);
  }

  function openHelp() {
    if (els.helpOverlay.classList.contains("show")) return;
    helpWasPaused = game.paused;
    game.paused = true;
    hideBossWarning();
    els.helpOverlay.classList.add("show");
  }

  function closeHelp() {
    if (!els.helpOverlay.classList.contains("show")) return;
    els.helpOverlay.classList.remove("show");
    if (!helpWasPaused) game.paused = false;
    else {
      game.paused = true;
      els.pauseOverlay.classList.add("show");
      els.pauseBtn.classList.add("is-paused");
    }
    syncSelection();
    updateHud(true);
  }

  function playAgain() {
    game.restart();
    els.playAgain.blur();
    Sound.play("click");
  }

  // -----------------------------------------------------
  // Pointer input
  // -----------------------------------------------------
  function localPoint(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  canvas.addEventListener("pointermove", (e) => {
    if (game.gameOver) return;
    const p = localPoint(e);
    game.setPointer(p.x, p.y, true);
    if (!game.selectedType) {
      canvas.style.cursor = game.hoveredTower ? "pointer" : "default";
    } else {
      canvas.style.cursor = game.ghostValid ? "crosshair" : "not-allowed";
    }
    if (game.selectedType) updatePlacementText();
  });

  canvas.addEventListener("pointerleave", () => {
    game.setPointer(-999, -999, false);
    canvas.style.cursor = "default";
    if (game.selectedType) updatePlacementText();
  });

  canvas.addEventListener("pointerdown", (e) => {
    Sound.init();
    if (game.gameOver || game.paused) return;
    if (e.button !== undefined && e.button !== 0) return;
    const p = localPoint(e);
    game.setPointer(p.x, p.y, true);
    if (game.selectedType) {
      if (game.tryPlace(game.selectedType, p.x, p.y)) {
        syncSelection();
        updateHud(true);
        // Stay in build mode for rapid placement while affordable.
        canvas.style.cursor = game.selectedType ? "crosshair" : "pointer";
        return;
      }
      const hit = game.towerAt(p.x, p.y);
      if (hit) {
        game.cancelBuild();
        game.selectTower(hit);
        syncSelection();
        updateHud(true);
      }
      return;
    }
    const hit = game.towerAt(p.x, p.y);
    if (hit) {
      game.selectTower(hit);
      Sound.play("click");
    } else {
      game.closeInspector();
    }
    syncSelection();
    updateHud(true);
  });

  canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    if (game.selectedType) {
      game.cancelBuild();
      syncSelection();
    }
  });

  // -----------------------------------------------------
  // Buttons and keyboard
  // -----------------------------------------------------
  els.startBtn.addEventListener("click", startRound);
  els.autoBtn.addEventListener("click", toggleAuto);
  els.speedBtn.addEventListener("click", cycleSpeed);
  els.pauseBtn.addEventListener("click", togglePause);
  els.resumeBtn.addEventListener("click", togglePause);
  els.soundBtn.addEventListener("click", toggleSound);
  els.helpBtn.addEventListener("click", openHelp);
  els.helpClose.addEventListener("click", closeHelp);
  els.helpStart.addEventListener("click", closeHelp);
  els.playAgain.addEventListener("click", playAgain);
  els.inspectorClose.addEventListener("click", () => {
    game.closeInspector();
    syncSelection();
    updateHud(true);
  });
  els.cancelPlacement.addEventListener("click", () => {
    game.cancelBuild();
    syncSelection();
    updateHud(true);
  });
  els.coachClose.addEventListener("click", () => {
    game.tutorialDismissed = true;
    els.coach.classList.add("hide");
  });

  els.upgradeBtn.addEventListener("click", () => {
    Sound.init();
    const t = game.selectedTower;
    if (!t || game.gameOver) return;
    if (t.maxed) return;
    const up = t.upgrade;
    if (game.money < up.cost) {
      showToast(`Need $${formatMoney(up.cost - game.money)} more for ${up.name}.`, 2000);
      Sound.play("error");
      return;
    }
    if (t.upgradeTower()) {
      updateInspector(true);
      updateHud(true);
      showToast(`${t.def.name} upgraded: ${up.name}!`, 2200);
    }
  });

  els.targetBtn.addEventListener("click", () => {
    const t = game.selectedTower;
    if (!t) return;
    const mode = t.cycleMode();
    updateInspector(true);
    updateHud(true);
    showToast(`Target priority: ${mode.label}`, 1300);
  });

  els.sellBtn.addEventListener("click", () => {
    const t = game.selectedTower;
    if (!t) return;
    if (t.sellValue <= 0) {
      showToast("The free scout can't be sold.", 1600);
      return;
    }
    const name = t.def.name;
    const value = t.sell();
    game.closeInspector();
    syncSelection();
    updateHud(true);
    showToast(`${name} sold for $${value}.`, 1800);
  });

  els.helpOverlay.addEventListener("click", (e) => {
    if (e.target === els.helpOverlay) closeHelp();
  });
  els.pauseOverlay.addEventListener("click", (e) => {
    if (e.target === els.pauseOverlay) togglePause();
  });

  document.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (e.target && ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
    const key = e.key.toLowerCase();

    if (els.helpOverlay.classList.contains("show")) {
      if (key === "escape" || key === "enter") {
        e.preventDefault();
        closeHelp();
      }
      return;
    }

    if (key === " " || key === "spacebar") {
      if (game.gameOver) return;
      e.preventDefault();
      startRound();
      return;
    }
    if (key === "p") {
      e.preventDefault();
      togglePause();
      return;
    }
    if (key === "f") {
      e.preventDefault();
      cycleSpeed();
      return;
    }
    if (key === "m") {
      e.preventDefault();
      toggleSound();
      return;
    }
    if (key === "a") {
      e.preventDefault();
      toggleAuto();
      return;
    }
    if (key === "h" || (key === "?" && e.shiftKey)) {
      e.preventDefault();
      openHelp();
      return;
    }
    if (key === "escape") {
      if (game.selectedType) {
        game.cancelBuild();
      } else if (game.selectedTower) {
        game.closeInspector();
      } else if (game.paused) {
        togglePause();
        return;
      }
      syncSelection();
      updateHud(true);
      return;
    }
    if (key === "u" && game.selectedTower) {
      els.upgradeBtn.click();
      return;
    }
    if (/^[1-9]$/.test(key)) {
      const type = TOWER_ORDER[Number(key) - 1];
      if (type) {
        game.selectBuild(type);
        syncSelection();
        updateHud(true);
      }
    }
  });

  // Unlock audio on the first gesture
  document.addEventListener("pointerdown", () => Sound.init(), { once: true });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && game.roundActive && !game.paused && !game.gameOver) {
      game.paused = true;
      els.pauseOverlay.classList.add("show");
      els.pauseBtn.classList.add("is-paused");
      syncSelection();
    }
  });

  // -----------------------------------------------------
  // Resize and main loop
  // -----------------------------------------------------
  const resizeObserver = new ResizeObserver(() => {
    game.resize();
    game.dirty = true;
    updateHud(true);
  });
  resizeObserver.observe(stage);

  window.addEventListener("resize", () => {
    game.resize();
    updateHud(true);
  });

  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - (frame.last || now)) / 1000));
    frame.last = now;
    if (!document.hidden) game.step(dt);
    game.render(now);
    updateHud(false);
    requestAnimationFrame(frame);
  }

  // -----------------------------------------------------
  // Boot
  // -----------------------------------------------------
  buildShop();
  try {
    const muted = localStorage.getItem("btd5-muted") === "1";
    Sound.setMuted(muted);
    els.soundBtn.classList.toggle("is-muted", muted);
  } catch {}
  syncSelection();
  updateHud(true);
  requestAnimationFrame(frame);
})();
