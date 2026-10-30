# Phase 2 validation — October 30, 2026

Base: `d2fd2bfb902c1a778d50a2608fbf56a5e5dc54b4`, branch `feature/showdown-royale`.
All Phase 2 source, tests, documentation and review captures stay inside `royale/`.

## Automated model and storage checks

`node --test royale/tests/*.test.mjs`: **38 passed, 0 failed** (20 existing Phase 1 tests and 18 Phase 2 tests).

The original suite covers movement, run/walk speeds, double-jump limits, air steering, coyote time, buffering, one-way platforms, walls/ceilings, swept collisions, connected coast traversal, ground/air attack hits, chaining, facing, rewards, leveling, monster respawns, telegraphs, leashing, invulnerability, pause, checkpoints and defeat recovery.

The Phase 2 suite checks every appearance enum/color/range, Unicode name validation, fixed equipment palette guards, appearance persistence, legacy migration, three independent slots, stable IDs/timestamps/regions, deletion, malformed/future saves, quota failures, and stale writes from other tabs. It also checks **128 extreme proportion combinations** for identical gameplay outcomes, fixed bone lengths, connected joints, grounded stance feet, consistent visual attack endpoints and standard cape length across all animation states and views.

`node royale/tests/compare-phase1.mjs`: **passed**. Compares 7,200 fixed steps directly with code loaded from the approved Phase 1 commit. Hero physics, collisions, combat, enemy state, rewards, checkpoints and emitted events match exactly, including damage and respawn. Only appearance/save data and added visual timers are outside this comparison. The script also asserts that Phase 2 changes stay inside `royale/`.

`node royale/tests/verify-isolation.mjs`: **passed**. Original assets, videos, Story/Versus code and tests are unchanged. Relative to the original pre-Royale base, only the three already-approved Phase 1 Royale menu tiles differ outside the Royale directory. Phase 2 makes no further changes to those entry points.

`git diff --check`: **passed**.

## Automated browser checks (viewport simulation)

Run in the connected Chromium browser via the visible `royale/tests/mobile.html` harness against the same static source packaged for the private playtest.

| Simulated viewport | Creator / save / render checks | Movement / input / layout checks |
| --- | ---: | ---: |
| Phone portrait, 390 × 844 | 131 / 131 | 18 / 18 |
| Phone landscape, 844 × 390 | 131 / 131 | 18 / 18 |
| Small phone, 320 × 568 | 131 / 131 | 18 / 18 |
| Tablet, 768 × 1024 | 131 / 131 | 18 / 18 |
| Desktop, 1280 × 800 | 131 / 131 | 18 / 18 |

Total: **655 creator/save/render checks and 90 movement/input checks passed**. The creator checks were rerun at all five sizes after the final rig refinement.

Creator checks exercise the real form, invalid/valid name submission, immediate view changes, reachability of every field, persistent action buttons, all saved appearance fields, respawn/reload, canceling edits and new-slot creation, all three slots, deletion confirmation and preservation of the old Phase 1 backup. Pixel checks render every appearance option at a fixed clock, compare front/back output and verify each animation produces a distinct pose.

Input checks exercise real app handlers through DOM keyboard/pointer events: walking, faster running, jump/double jump, air steering, pause, simultaneous stick+jump, cancellation, touch attacks, blur pause, release clearing and edit/cancel return. **Synthetic pointer capture is stubbed only during the synthetic event sequence and restored afterward.** These checks do not certify hardware touch capture. Each run uses a separate session-storage namespace; real local hero slots are not replaced.

## Visual review

Inspected the live desktop creator, phone portrait suit editor, three-slot roster and a gallery of every pose. Reviewed front/back, tall/full and short/slender proportions, moving limbs, attack extension and cape placement. Direct browser clicks also opened a saved customized hero and its pause/editor flow.

The review found and corrected an over-bent punch/kick pose and possible floating stance feet at long strides. Regression checks now assert fixed limb lengths and grounded stance feet across the tested builds. See `qa/character-creator-phase2.jpg` for the final creator view and `tests/animations.html` for repeatable pose review.

## Performance and physical-device status

The simulation remains fixed at 60 Hz with interpolated rendering and a **60 FPS target**. Sampled canvas draw work during the five input runs was approximately **0.66–0.84 ms per frame**. The instrumented cloud browser reported approximately **12–21 FPS** at the sampled completion points. The environment's frame scheduling is variable; these measurements do **not** establish sustained 60 FPS on real devices.

**No physical iPhone, Android phone, tablet, laptop or desktop hardware testing was performed in this environment.** Actual iOS Safari/Android browser behavior, safe areas, mobile keyboard resizing, pointer capture, orientation changes during gestures, audio, long-session performance and sustained frame rate still need hands-on testing. Browser viewport simulation is reported separately above. Cross-browser Safari/Firefox verification is also outstanding.

## Scope remaining

Phase 2's creator, animation states, local hero selection and migration are implemented. The art remains procedural prototype artwork and can receive further feedback/polish. Account authentication, cloud synchronization, equipment acquisition, the nine-power system and all other Phase 3 systems are intentionally absent. Fixed palettes are a data/rendering boundary only; no equipment is obtainable beyond the starter suit. The existing levels 1–10 balance and Coastal Beginnings content remain intact.
