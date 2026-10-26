# Integration contract and isolation

Baseline: `41cbc7ebe38b676b61a454fc1f3f1ccf7f63bd28`.

Only new files are added. Both production HTML entry points and every existing art, audio, video, Story, co-op, hazard and animation source remain byte-identical. The new build is opt-in through `playable-villains-test.html`; neither production HTML file loads `assets/competitive`.

## Animation adapter

`HealthiaCompetitiveAnimation.register(characterId, renderer)` registers an optional renderer and returns an unregister function. The renderer receives `{ ctx, fighter, opponent, state, phase, world, ground }`. It must only draw: never apply damage, call boss AI, launch gameplay projectiles, or mutate another fighter. Each fighter owns its action, meter, animation clock and status independently.

States: `idle`, `walk`, `dash`, `jump`, `punch`, `kick`, `block`, `hit`, `knockdown`, `recovery`, `special`, `victory`, `defeat`. Action phases: `windup`, `active`, `recovery`, `idle`. Inspect `fighter.action.key` for punch/heavyPunch/kick/heavyKick/sweep/uppercut/shoot/skill/special. Timings come from `fighter.action.spec` and `fighter.action.age`.

The default adapter scopes the legacy hero/boss globals inside try/finally and restores them after each draw. It calls the loaded renderers (`fighter`, `drawWastelander`, `drawDrStyro`, etc.) and existing sprite helpers. It never calls `updateWastelander`, `updateBushman` or other boss logic. Hero combos use the existing combo sheets. It maps a competitive character's feet, direction and states to the legacy renderers; movement and hitbox sizes are separate data.

For Wastelander: current fallback calls the currently loaded `drawWastelander` and maps competitive states to its mallet/trash/acid poses. It does not assume the other session's unmerged files or new state fields exist. If that session changes its renderer contract, add a registration after its new renderer loads, or update only this new adapter to supply the documented state fields. Do not replace its renderer or sprite files.

## Combat boundary

`roster.js`: immutable identity and competitive move tuning.
`combat.js`: pure 120 Hz simulation, human-equivalent cooldowns, hitboxes, input queues, guard, damage, knockdown protection, projectiles, ground effects and result resolution.
`cpu.js`: input decisions only; difficulty does not alter statistics or physics.
`animation-adapter.js`: draw-only bridge and optional custom renderers.
`versus.js`: opt-in menus, keyboard/touch/gamepad bridge, original music and arena reuse, symmetric hazard damage, result handling. It snapshots/restores the legacy fight views when entering/leaving competitive play. Story and co-op continue through the original engine.

No network PvP protocol is added. Existing PeerJS co-op, including its 1,000 HP boss, is untouched.

## After the animation session finishes

1. Fetch its approved commits and latest main. Compare filenames before any integration.
2. Keep all approved animation files. This branch has no modifications to those files; the generated test HTML is derived output.
3. On a separate integration branch, apply both projects and regenerate the isolated entry with `python3 tools/build-playable-villains.py`.
4. Update the new adapter if renderer contracts changed. Run all tests below and review the art in both facing directions and mirror matches.
5. Test physical keyboard/controller/mobile inputs, Story Chapters 1–3, co-op and the live timing on target devices.
6. Request explicit approval before merging or replacing production. Do not enable auto-merge or deploy this branch to GitHub Pages/Hostinger.

## Reproduce checks

```sh
node --test tests/competitive.test.cjs tests/bushman.test.cjs tests/story-switch.test.cjs
node tests/competitive.browser.cjs
node tests/competitive-story.browser.cjs
node tests/competitive-performance.browser.cjs
```

Browser tests require Playwright and Chromium. `CHROMIUM_PATH` may select an existing Chromium binary; `COMPETITIVE_QA_DIR` controls screenshot/report output. The tests start ephemeral localhost servers themselves, never production. The Story wrapper adjusts only the existing test suite's output paths and test entry at runtime; it does not edit existing tests.
