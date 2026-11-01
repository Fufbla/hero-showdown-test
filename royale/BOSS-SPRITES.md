# Boss sprites — manual upload Batch 1

Target branch: `feature/royale-boss-sprites`. The user uploads this batch manually. Do not push, merge into Royale/main, or begin the next batch until the user confirms the upload.

## Starting point and recovery

Verified remote base: `838d0ccaa41eb7c2ca616619f8c8c0f806ca1cdf`. Both the Royale and boss branches pointed here when inspected on 2026-10-31. Main was `b11a1d8103f10e38d63788496660b99d4a8d9e6e`.

The local-only checkpoint `d6b667ef3a8a8a6af7637ac4290c8b0dd3e8dbc9` contained three full animation source sheets, reference panels, and the baseline audit. Those files were recovered unchanged; this batch did not regenerate them. The downloadable patch includes the checkpoint files as additions relative to the verified remote base. The local checkpoint is not claimed to exist on GitHub.

The supplied `002sprites(1).zip` contains the fifteen approved concept designs. Its artwork is reference material, not a ready-made animation atlas. The recovered source sheets were generated separately from those references during the earlier session. They are not crops of the miniature concept poses.

## Included bosses

| Original game name | Approved appearance | Animation rows, four distinct frames per row |
| --- | --- | --- |
| Trash Monster | Trash Monster | idle, walk, swipe, throw, slam, hit, defeat, phase surge |
| Bushman | Thorn Beast | idle, walk, branch sweep, vine strike, thorns, roots, hit, defeat |
| Wastelander (regional) | Sludge Beast | idle, walk, punch, toxic shot, slam/shockwave, ground hazard, hit, defeat |

Each transparent RGBA atlas has 32 different frames in a 4 × 8 grid. Cells are 416 × 416; atlases are 1664 × 3328. Frames share the foot origin `[176,384]` and a 192-unit reference height. The packer isolates whole source poses, removes neighboring fragments, preserves alpha, and does not stretch collapse poses. The source sheets remain available for future art corrections.

`boss-sprites.mjs` handles these three regional bosses only. It reads the existing state, phase, velocity, hit flash and attack timers. Windup poses precede contact; the contact pose appears at the existing active damage tick. Phase effects are cosmetic. A short offscreen crossfade smooths non-contact pose changes. Image caching keeps at most two decoded new atlases. No frame allocates a new image.

## Review and test

Serve the repository root over HTTP, for example `python3 -m http.server 8000`, then open:

- `http://localhost:8000/royale/tests/boss-sprites.html` — animation, phase, facing, hitbox, single-step and measurement controls, plus atlas/contact-sheet downloads.
- `http://localhost:8000/royale/tests/bosses.html` — playable encounters using the existing boss practice fixtures.
- `http://localhost:8000/royale/tests/phase5-browser.html?spriteBatch=1` — gameplay and layout checks for this batch at five viewport sizes.

The review is an addition to the existing repository, not a standalone replacement game. Do not open its HTML with a `file://` URL.

Automated tests: `node --test royale/tests/*.test.mjs`.

Optional artwork tooling: `node royale/tools/pack-boss-sprites.mjs` (requires `pngjs` and `sharp`) and `node royale/tools/review-boss-sprites.mjs` (requires `@napi-rs/canvas`). These are offline authoring dependencies, not game runtime dependencies. The tools also use the installed Work runtime when present. The uploaded PNGs are ready to use without running either tool.

See `qa/boss-sprites/VALIDATION.md` for automated results, visual observations, measured performance, and outstanding review. The three browser previews measured 1.44–1.74 FPS in this cloud session, so sustained 60 FPS is **not verified**. Native raster timings are not browser FPS. No physical desktop, phone or tablet was tested.

## Integration boundaries

Changes to existing runtime files are confined to the boss presentation adapter and its artwork-status HUD label. `boss-art.mjs` dispatches regional bosses 1–3 to the new renderer; explicit legacy routing preserves the Legendary Wastelander and its helpers. This adapter change must be accounted for when the boss branch is eventually integrated with the monster branch. No shared world-renderer change was needed.

The original names, HP, damage, cooldowns, phase thresholds, helper limits, attack patterns, rewards, chests, rematches, Legendary permanence/remains, Villain Merge, fourth power, hero abilities and save format remain unchanged. Existing shared art, regular-monster artwork/integration, main, Story and Versus files are untouched. No branch was merged or uploaded by this batch.

The remaining twelve bosses retain their existing appearances. Their redesigned artwork and animations are not completed by this package. Giant Scorpion anatomy/rig changes are not part of this batch. Further work waits for the user's upload confirmation.
