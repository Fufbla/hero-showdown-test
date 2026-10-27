# Combined build integration

The isolated entry combines animation/performance commit `2d8c8dde9617795028f45fd2e5ebadbe87fc0426` with competitive source `faf12a4bf76b6c32b83c63c27e7fb49884720b9b` from `feature/playable-villains-versus`. The pinned sources and imported blob hashes are recorded in `docs/combined-versus-source.json`.

The production entries and approved animation modules remain byte-identical to the performance build. Only `playable-villains-test.html` loads the competitive scripts. Regenerate it with `python3 tools/build-playable-villains.py`; the script supports the repository's `dist/` layout and a flat website export.

`animation-state.js` converts competitive startup, release, and recovery times into native presentation clocks. It supplies real release flags for Bushman and Spree, contact timing for all villain attacks, and special poses for hero powers. Air's draw-only bridge uses its approved atlas and pure pose selector so walking/gliding does not depend on native boss AI. No approved art or renderer source was replaced.

`animation-adapter.js` scopes native globals in `try/finally`. Both fighters use separate presentation views. Rendering does not advance combat, apply damage, or create gameplay projectiles. Diagnostics are off during ordinary play. The existing `HealthiaCompetitiveAnimation.register(id, renderer)` draw-only extension remains available.

Combat, move tuning, CPU decisions, and move guides are unchanged from the pinned competitive source. The pure combat engine runs at 120 Hz. All 12 fighters use 100 HP; CPU difficulty changes decisions only. Original Story and co-op continue through their original engine. Online competitive PvP is not included.

## Reproduce validation

Open `combined-versus-review.html` using the included local server. Choose **Run integration checks**, **Show roster poses**, or **Play match**. The review uses synthetic keyboard/touch events and virtual gamepads; it cannot certify physical hardware or live two-device co-op.

For Node tests on a Unix-like system, from the extracted root:

```sh
ln -s dist/assets assets
node --test --test-concurrency=1 tests/*.test.cjs
unlink assets
```

The `assets` link supplies the original suites' historical root-relative paths. Do not overwrite an existing assets directory. The obsolete branch-specific Playwright wrapper was replaced here by the optional review page; no browser installation is needed to run that page.

The next step is hands-on target-device playtesting and review. No merge into production or deployment has been performed.
