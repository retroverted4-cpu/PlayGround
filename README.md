# PlayGround

<!-- omgithub:readme:start -->
## 🚀 Build, play, and remix with OMGithub

**Created using [OMGithub.com](https://go.ondev.store/).**

[![OMGithub](https://img.shields.io/badge/OMGithub-Open%20project-orange?style=for-the-badge)](https://go.ondev.store/retroverted4-cpu/PlayGround)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?logo=github&style=for-the-badge)](https://github.com/retroverted4-cpu/PlayGround)

- 🎮 [Open the project](https://go.ondev.store/retroverted4-cpu/PlayGround).
- ✨ [Remix this project](https://go.ondev.store/retroverted4-cpu/PlayGround?remix=1).
- 💻 [Explore the source](https://github.com/retroverted4-cpu/PlayGround).
- 🛠️ [Check build runs](https://github.com/retroverted4-cpu/PlayGround/actions).
- 🐛 [Report an issue](https://github.com/retroverted4-cpu/PlayGround/issues).
- 👤 [Explore the creator's projects](https://go.ondev.store/retroverted4-cpu).
- 🌍 [Create with OMGithub](https://go.ondev.store/).
<!-- omgithub:readme:end -->

## Bloon Blast TD

An original, BTD-inspired tower defence game built with Canvas 2D and vanilla JavaScript. No external assets, network calls, or build step needed — the whole island is drawn and synthesised in the browser.

### Play

Open the project page, choose **Play**, pick a monkey from the armory, then click or tap open grass to place it. Press **Start Round** when you are ready. Survive 30 rounds to save Monkey Island.

- **Desktop:** click to place and select, keyboard `1`–`7` picks a tower, `Space` pauses, `Enter` sends the next round, `Esc` deselects.
- **Mobile / tablet:** tap the armory card, tap the map to place, and tap any monkey to open its upgrade panel. The layout switches to a tall portrait map and touch-sized controls; the HUD, hint bar, and shop stay inside the viewport.

### Features

- 7 towers with two 3-tier upgrade paths each, plus targeting modes and selling.
- 30 hand-authored waves with layered balloons, ceramics, MOAB bosses, and escalating rewards.
- Pause, 1×/2×/3× speed, round meter, best-wave persistence, victory and defeat screens.
- Synthesised sound effects with mute control, floating damage, particles, and balloon-pop effects.
- Responsive desktop/landscape world plus a dedicated portrait world for phones (820 × 1580).
- Debug hooks available only with `?debug=1`.

### Run locally

This repo uses the OMGithub static runtime wrapper:

```bash
RUNTIME_DIR=/path/to/runtime PORT=3002 ./start.sh
```

Or serve the folder with any static file server, for example:

```bash
python3 -m http.server 3002
```

Then open `http://localhost:3002/`.

### Project layout

- `index.html` — HUD, overlays, menu, and modal markup.
- `styles.css` — responsive desktop, portrait-phone, and landscape-phone layouts.
- `src/core.js` — map data, tracks, waves, towers, balloons, and placement rules.
- `src/art.js` — generated background, monkeys, balloons, projectiles, and effects.
- `src/audio.js` — Web Audio synthesised sound engine.
- `src/game.js` — game loop, combat, economy, input, UI wiring, and debug API.

### Notes and assumptions

- The game is an original homage to the BTD formula; it does not copy Bloons TD assets.
- Best-wave progress is stored in `localStorage`; no account or backend is used.
- Portrait layout is locked once a round is in progress to avoid moving towers mid-wave. Rotate from the menu or after a round ends.
- All art and audio are generated at runtime, so the game works fully offline after the initial page load.
