# Batch 1 validation — 2026-10-31

Base: `838d0ccaa41eb7c2ca616619f8c8c0f806ca1cdf`. Branch: `feature/royale-boss-sprites`. No GitHub upload or merge was performed for this manual-upload batch.

## Automated results

| Check | Result | Evidence |
| --- | --- | --- |
| Verified-base Node suite | 622 passed, 0 failed | baseline-tests.txt |
| Updated full Node suite | 637 passed, 0 failed, 0 skipped | automated-tests.txt |
| Focused boss/regional/Legendary suite | 210 passed, 0 failed, 0 skipped (subset of the full suite) | focused-tests.txt |
| Browser renderer | 75 checks passed | browser-renderer-tests.json |
| Browser gameplay and viewport checks | 321 assertions passed | browser-gameplay-tests.txt |

The PNG tests decode every frame, verify the saved atlas hashes, RGBA transparency, distinct pixel data for all 96 frames, padded bounds, shared grounded foot origins, and a real four-pose collapse. Attack tests sample every existing attack pattern in each combat phase and check that warnings precede the contact frame at the existing active damage tick. Frozen-entity checks verify that pose selection does not modify combat/save fields. Other checks cover movement, hit priority, death, pause, bounded image caching, error fallback, and exclusion of Legendary bosses and helpers.

The existing simulation/regression suites cover regional progression and rematches, HP/damage/timing, three-phase combat, reinforcements, hero abilities, boss rewards and first-win chests, save behavior, Legendary permanence/remains, Villain Merge and fourth-power behavior. Their implementation files were not changed. The newly redesigned Legendary appearances are outside this batch.

The gameplay browser checks used the real game in disposable fixtures, for each of the three bosses at **390×844, 844×390, 320×568, 768×1024 and 1280×800**. Assertions include HP/name/status, HUD/touch layout, phase changes, exactly three Phase 3 helpers, no premature rewards while helpers remain, coin/XP and first-victory progression, chest/inventory behavior, save-failure rollback, reload persistence and retreat. These are synthetic browser viewports, not physical phones or tablets.

Reproduce with:

```sh
node --test royale/tests/*.test.mjs
node --test royale/tests/boss-art.test.mjs royale/tests/boss-sprites.test.mjs royale/tests/phase5.test.mjs royale/tests/phase7.test.mjs
```

Serve the repository over HTTP. Open `royale/tests/boss-sprites.html` and select **Run browser checks**. Open `royale/tests/phase5-browser.html?spriteBatch=1` to run the gameplay/layout suite. The preservation audit requires Git history containing the base commit; it reports a skip in exported source-only or shallow checkouts that lack that history. It ran and passed here with no skips.

## Manual visual review — separate from automated tests

The 96 final contact-sheet poses were inspected for silhouette, clipping, stray neighboring-pose fragments, foot placement, attack extension and collapse. Three browser animation-review views were inspected and captured. A paused Wastelander contact pose was additionally checked against the unchanged body hitbox and foot marker. A playable encounter screenshot is included separately. The contact-sheet layout was spaced so adjacent cells cannot obscure extended limbs.

Evidence: `regional-1-contact-sheet.png`, `regional-2-contact-sheet.png`, `regional-3-contact-sheet.png`, `browser-trash-review.jpg`, `browser-bushman-review.jpg`, `browser-wastelander-review.jpg`, `browser-attack-alignment.jpg`, and `browser-playable-encounter.jpg`. Desktop and mobile-shaped native raster screenshots are also included, explicitly distinct from browser screenshots.

The required animation states have different authored poses; no single static concept image stands in for all states. Basic/special attacks follow the existing timers, with four poses for windup/contact/recovery. Shared foot placement and 45 ms non-contact crossfades reduce abrupt transitions. Frame continuity can be inspected with the review's single-step control. Sustained animation smoothness cannot be signed off from this slow cloud-browser session. Final visual approval remains pending.

## Performance measured in this session

These are actual measurements, not estimated FPS. They apply only to the listed environments and scenes. The **60 FPS target is not verified**. No physical device was tested.

### Browser animation preview — 10-second samples

| Boss | Sampled frames | Average FPS | Mean frame ms | p95 frame ms |
| --- | ---: | ---: | ---: | ---: |
| Trash Monster | 18 | 1.74 | 574.87 | 1016.50 |
| Bushman | 15 | 1.44 | 693.19 | 1016.50 |
| Wastelander | 15 | 1.46 | 685.41 | 1016.50 |

### Playable browser encounters — 30-second samples

The built-in game instrumentation records wall-clock frame pacing, simulation, draw and HUD costs. These samples use the existing practice fixtures and are not a benchmark of prolonged battles with every possible effect or Phase 3 reinforcement combination.

| Boss | Wall seconds | Rendered frames | Average FPS | p95 frame ms | Mean draw ms | Simulated seconds |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Trash Monster | 30.64 | 35 | 1.14 | 1016.50 | 8.93 | 3.13 |
| Bushman | 30.75 | 36 | 1.17 | 1016.50 | 10.56 | 3.22 |
| Wastelander | 30.75 | 35 | 1.14 | 1016.50 | 11.16 | 3.18 |

The observed frame pacing is much slower than the draw durations alone; the cause was not established. Native draw timings below do not override these browser results. Further performance testing on a normal foreground browser and target hardware is required before claiming 60 FPS.

### Native headless raster — renderer-only cost

After 60 warmup frames, 600 draws were measured per boss at each canvas size. This uses the actual boss adapter with `@napi-rs/canvas`, not a browser, input device or complete game loop. These numbers must not be converted into a full-game FPS claim.

| Boss | Canvas | Mean draw ms | p95 draw ms |
| --- | --- | ---: | ---: |
| Trash Monster | 1280×720 | 0.164 | 1.087 |
| Trash Monster | 390×844 | 0.115 | 0.973 |
| Bushman | 1280×720 | 0.144 | 1.125 |
| Bushman | 390×844 | 0.113 | 0.939 |
| Wastelander | 1280×720 | 0.095 | 0.791 |
| Wastelander | 390×844 | 0.110 | 0.915 |

Raw evidence: `browser-preview-performance.json`, `browser-bushman-performance.json`, `browser-wastelander-performance.json`, `browser-game-performance.json`, and `raster-performance.json`.

## Unfinished work and preservation

All required Batch 1 state artwork and integration are supplied for review. The remaining twelve redesigned bosses, including the Giant Scorpion redesign and eight-leg animation work, are not completed. Their existing appearances remain. No new Legendary artwork is represented as finished.

The three recovered source sheets and reference panels remain byte-identical to local checkpoint `d6b667ef3a8a8a6af7637ac4290c8b0dd3e8dbc9`. This local SHA is not a verified GitHub commit. The manual package includes those recovered files relative to the verified remote base, so no inaccessible local checkpoint is required to apply it.

Only boss presentation/HUD and review/test files were changed. Original boss names, gameplay values and mechanics, rewards, saves, regular-monster artwork/animation/integration, shared world rendering, main, Story and Versus files were preserved. The manifest lists every added and modified path plus hashes and the base SHA. There are no deletions. No branch was overwritten or merged. The next batch waits for the user's manual upload confirmation.
