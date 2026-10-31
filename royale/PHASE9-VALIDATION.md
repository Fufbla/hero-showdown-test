# Phase 9 validation — 31 October 2026

Baseline: `5cfe1a5c80648ea1f66e76fb780119e9c7caa541`. All modifications are inside `royale/` on `feature/showdown-royale`. Remote `main` was checked at `b11a1d8103f10e38d63788496660b99d4a8d9e6e` and is not modified. Versus, Story and the 35 shared approved art/motion dependencies are byte-identical. Authentication/backend, durable save modules, power/boss balance tables and equipment catalogs remain unchanged.

## Automated results

| Check | Result | Evidence |
|---|---:|---|
| Node gameplay/data suites, Phases 1–9 | 580 passed, 0 failed | [Log](qa/phase9-node.txt) |
| Phase 1 movement/collision/basic timing differential | 7,200 matched steps | `node royale/tests/compare-phase1.mjs`; identical historical terrain, cosmetic timestamps excluded |
| Phase 9 vertical browser matrix | 595 passed | [Log](qa/phase9-browser.txt) |
| Phase 7 Legendary/Merge browser regression | 920 passed | [Log](qa/phase9-legendary.txt) |
| Phase 5 regional boss browser regression | 688 passed | [Log](qa/phase9-bosses.txt) |
| Phase 8 portals/slots/account UI regression | 120 passed | [Log](qa/phase9-portals.txt) |
| Branch/file isolation and shared artwork | Passed | `verify-isolation.mjs`, `verify-phase9.mjs`, `git diff --check` |

Browser tests used Chromium in a remote browser. The Phase 9 matrix covers 390×844, 844×390, 320×568, 768×1024 and 1280×800. Touch uses synthetic DOM pointer events; controller tests mock the standard Gamepad API. These are not physical device tests or real controller tests. Account UI regression does not establish that unconfigured sign-in providers operate.

New automated coverage includes all 84 region/board/tier ascent segments without Flight; 24 valid monster homes per region; patrol edges, elevated respawn and collisions; all 21 wounded species still approaching/attacking; unchanged threshold position/damage; anti-stunlock behavior; preserved intentional crowd control; all nine powers on every elevation; long-fall/Flight camera bounds; exact elevated save locations; unchanged night damage; three cape builds over 3,600 steps each; bounded caches and particle pool reset/reuse.

The Legendary and regional suites exercise phase thresholds, reinforcement limits, clear requirements, rewards, permanent defeat, mixed/complete suits and fourth-slot behavior. A discovered particle reset error was fixed and covered by a dedicated pool-reuse test before these final runs.

Run locally:

```sh
node --test royale/tests/*.test.mjs
node royale/tests/compare-phase1.mjs
node royale/tests/verify-isolation.mjs
node royale/tests/verify-phase9.mjs
python3 royale/serve.py
```

Open `royale/tests/phase9-browser.html`, `phase7-browser.html`, `phase5-browser.html` and `phase8-browser.html` for their respective browser matrices. Practice pages use isolated session storage, never real save slots.

## Manual browser review

Focused visual review covers the coastal before/after scene, staggered terrain readability, monster silhouettes, customized heroes and front/back Merge previews, approved boss sheet loading and responsive HUD controls. Keyboard play defeated an elevated Bottle Critter and credited 4 XP / 1 coin, verified a jump from Tier 1, and dropped from Tier 4 with Down + Jump while the vertical camera followed. The Tier 4 Dark Energy night fixture showed active enemy damage and yellow eyes. Native second-jump timing was not certified in this low-cadence session; the automated input matrix covers double jumps. Screenshots: [before](qa/phase9-before.jpg), [after](qa/phase9-after.jpg), [highest tier](qa/phase9-high-platform.jpg), [custom heroes/Merges](qa/phase9-heroes-merges.jpg). Automated fixture climbing is reported above rather than described as a person manually completing every route or boss.

Actual physical iPhone, Android, tablets and controllers were not available. Safari/Firefox, extended gamepad play and long-session combat balancing remain untested. Remote-browser frame cadence is insufficient to certify animation smoothness on real hardware.

## Performance

Actual 30-second rendered-frame samples from `tests/performance.html` are recorded in [the raw measurement log](qa/phase9-performance.txt). This sampler measures requestAnimationFrame cadence and synchronous drawing cost, not GPU/compositor time. Loading measurements end when the playable UI appears and use uncontrolled cache state; they are not cold-network benchmarks. All 24 regular monsters are simulated, with viewport culling and bounded visual caches.

| Sample | Rendered FPS | Drawing avg / max | Frame p95 | UI ready |
|---|---:|---:|---:|---:|
| Coast, 1280×720, 30.4 s | 1.5 | 1.50 / 4.40 ms | 1016.5 ms | 253 ms |
| Coast, 390×740, 30.6 s | 1.1 | 1.00 / 1.40 ms | 1016.5 ms | 266 ms |
| Final Showdown night, 844×390, 30.6 s | 1.3 | 1.39 / 5.00 ms | 1016.5 ms | 302 ms |
| Dark Energy Tier 4 night, 1363×784, 30.7 s | 1.1 | 1.00 / 2.30 ms | 1016.5 ms | Not sampled |

The first three are idle safe-camp samples; the fourth observes the hero among elevated enemies with incoming combat. They are remote-browser samples, not sustained active player combat or physical-phone results. The approximately one-second frame intervals are observed; drawing cost alone does not explain or certify presentation cadence.

The 60 FPS target is **not verified**. Remote-browser measurements cannot substitute for physical mobile profiling or prove sustained desktop performance. Use the same visible performance page on the intended devices, then test combat with several monsters and effects across elevations.

## Remaining limitations

- Two regional bosses retain explicitly temporary art: Trash Monster and Ultimate Pollution Boss.
- All eight adaptive Merge suit motifs and the existing decorative skeletal drawings remain provisional. The specified canonical Merge illustration references are absent from the repository.
- The graphics pass improves code-native artwork and reuses approved boss sheets; it does not claim every requested canonical animation was redrawn or signed off.
- The unfinished Phase 8 Supabase/provider deployment remains untouched. Local play and migration data remain available; operational cloud login is not claimed.
- Existing straight Fireballs retain their established launch height and targeting rules; very short creatures can be below a level shot. No homing or balance changes were introduced.
- No Phase 10 features or changes to main, Versus or Story are included.
