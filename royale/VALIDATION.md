# Phase 1 validation — October 30, 2026

Base: `b11a1d8103f10e38d63788496660b99d4a8d9e6e`. Target: `feature/showdown-royale` only.

## Passed

| Check | Result |
| --- | --- |
| Deterministic gameplay tests | 20 / 20 |
| Desktop browser viewport, 1280 × 800 | 18 / 18 input and layout checks |
| Portrait phone viewport, 390 × 844 | 18 / 18 input and layout checks |
| Landscape phone viewport, 844 × 390 | 18 / 18 input and layout checks |
| Small phone viewport, 320 × 568 | 18 / 18 input and layout checks |
| Direct desktop UI at 1363 × 936 | Creator, full build, height control, hair selection, cape toggle, start/continue and walking exercised |
| Save reload | Creator offered the saved patrol on a fresh page load; round-trip and malformed saves covered by unit tests |
| JavaScript syntax and whitespace | Passed |
| Python launcher | Compiles and displays its launch options |
| Branch/file isolation | Passed: the only existing-file edits are the three locked Royale menu tiles |

Core tests cover acceleration and stopping, run/walk speeds, world boundaries, double-jump limits, air steering, coyote time, jump buffering, one-way platforms, solid walls/ceilings, swept landings, end-to-end coast traversal, single-hit attacks, facing, attack chaining, airborne hits, rewards, leveling, enemy respawns, enemy warning/recovery/invulnerability behavior, platform patrol bounds, pause, death recovery, camps, cosmetic build parity, and save validation.

Browser checks use the real input handlers and visible HUD/diagnostics. They cover viewport bounds, keyboard movement/run/jumps, simultaneous stick movement and jumping, touch attacks, pointer cancellation, focus-loss pause and release, pause freezing, and opening/canceling customization. Synthetic pointers cannot request native capture; the harness temporarily stubs only capture for those synthetic events and restores it afterward. These checks are **not physical-device testing**.

## Fixes during validation

- Corrected the custom hero's idle leg pose so the legs do not cross.
- Zoomed the world closer on short landscape displays and added gentle vertical camera follow for upper paths.
- Kept level-up notifications from being replaced by a reward notification on the same simulation step.
- Adjusted the QA harness to wait on the game's visible simulation clock and keep its iframe visible, avoiding false results from background/visibility timing.

## Performance and remaining limits

The simulation uses fixed 1/60-second steps and interpolated rendering, with a 60 FPS target. Observed canvas draw work was about **0.6–0.8 ms** per frame in the sampled landscape, compact phone, and desktop checks. The instrumented cloud browser's observed frame rate varied and often ran below 60 FPS (roughly 10–49 FPS in sampled QA states). This does not certify sustained 60 FPS, browser scheduling, or physical-device responsiveness.

Still needs hands-on validation: actual iPhone Safari and Android touch capture, orientation changes during a gesture, safe areas, longer sessions, audio on those devices, and sustained frame rate. The sprite/rig artwork is a prototype and remains open to visual and movement feedback.

The full 99-level curve, nine upgradeable powers, remaining regions, bosses, equipment, Tree of Eris, Villain Merge, accounts, three save slots and multiplayer are intentionally not implemented in this phase. Phase 1 balances levels 1–10 and uses a single independent local playtest save.

Existing Story/Versus code and all existing assets are byte-for-byte preserved, except for replacing each entry page's locked Royale menu tile with navigation to `royale/`. This is an isolation check, not a new full regression playthrough of those existing modes.
