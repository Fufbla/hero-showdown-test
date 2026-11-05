# Ultimate Pollution Boss — Batch 3 validation

Base: **24f29cb3fcac896983d4a17b998d0256b42369a9**, verified remotely on `feature/royale-boss-sprites`. All 106 combined Batch 1/2 package files match the corrected base by Git blob hash. The prior upload-path repair is already remote; no Batch 3 files were committed or pushed.

## Automated results

| Check | Result | Evidence |
| --- | --- | --- |
| Unchanged base, dependencies installed | 649 pass, 1 fail | `baseline-tests.txt` |
| Final Node suite | 657 pass, 0 fail, 0 skip | `automated-tests.txt` |
| Focused boss tests | 44 pass, 0 fail, 0 skip | `focused-tests.txt` |
| Browser atlas decode/draw and combat isolation | 61 checks pass | `browser-render-checks.json` |
| Actual game UI regression | 725 assertions pass | `browser-gameplay-final.txt` |
| Native raster review | All 36 poses render; no empty or clipped packed cells | `regional-7-contact-sheet.png` |
| Repository preservation | All existing boss assets, combat, regular monsters, Story and Versus unchanged | `preservation-audit.json` |

The baseline failure was a historical audit bug: the Batch 2 test treated its own newly committed additions as unauthorized changes. It now checks modifications/deletions to files existing at that baseline. The new Batch 3 preservation test guards the repaired base, including all six completed boss assets and the scorpion rig. No gameplay rule was relaxed.

The browser game suite covers every regional boss at 390×844, 844×390, 320×568, 768×1024 and 1280×800. It verifies boss and hero HUD layout, touch controls, phase transitions, three-helper waves, no reward before all helpers fall, first-victory chest/inventory behavior, save persistence and reload, and arena exit. Node tests cover attack timing, collision and damage logic, phase thresholds, reinforcement caps, rewards, rematches, Legendary persistence and existing progression mechanics.

New sprite checks verify all 36 distinct RGBA frames, padded cell bounds, shared foot origin, collapsing silhouette, all five attack mappings, exact active contact frame, warning/recovery ordering, pause behavior, non-mutating render steps and nine-row atlas decoding through the bounded cache. Previous batch tests still pass.

## Manual visual review (separate from automated tests)

Inspected the definitive Corrupted Guardian concept, newly authored full-body sheets, native contact sheet, and actual game desktop and mobile-sized landscape renders. The orange chest reactor, black armor, crest, fists and feet are visible, with correct facing and grounded placement. The original name and 42,000 HP appear in the live HUD. Existing attack warning labels and ground telegraphs remain in the game. A separate Phase 3 screenshot records the final-phase presentation.

Evidence: `integrated-ultimate-pollution.jpg`, `mobile-sized-ultimate-pollution.jpg`, `phase3-ultimate-pollution.jpg`, and `regional-7-contact-sheet.png`. The PNG desktop/phone-shaped images are native renderer evidence, not browser or physical-device screenshots.

## Performance and limits

Full-game measurements are recorded in `full-game-performance-desktop.json` and `full-game-performance-mobile.json`. These are actual cloud Chromium samples, not inferred from native draw timings. The desktop sample measured approximately 1.38 FPS over 30.35 seconds (42 frames), with 9.79 ms average draw cost. The simulation advanced only 3.28 seconds because the existing timestep clamp limits long frame gaps. The mobile-sized sample measured 1.14 FPS over 30.70 seconds (35 frames), with 4.27 ms average draw cost. This environment does not demonstrate sustained 60 FPS.

`raster-performance.json` measures 600 warmed native draws per viewport, isolating boss rendering cost. It is not a game FPS benchmark. The browser sample and native costs measure different things and must not be substituted for one another.

No physical device or Safari testing occurred. Four authored poses per row are distinct and usable, but more hand-drawn in-betweens could improve animation fluidity; 45 ms non-contact blends cannot replace extra artwork. Final visual approval remains with the user. No supplied concept miniatures were presented as finished animation frames. No additional artwork is required to exercise the implemented nine states, but the optional in-between refinement remains explicitly identified.

All eight Legendary redesigns remain unfinished and outside Batch 3. Stop after export and wait for manual upload confirmation.
