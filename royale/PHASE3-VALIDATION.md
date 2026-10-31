# Phase 3 validation — October 31, 2026 (UTC)

Base: `6c81ad47dd7dc36176d2754d82c79d7597b75da8`. Branch: `feature/showdown-royale`.

## Automated model, animation, progression and storage checks

`node --test royale/tests/*.test.mjs`: **141 passed, 0 failed**. This includes the 38 existing movement/customization tests, updated for the intentionally changed level cap and HP growth, plus 103 Phase 3 cases.

Every power is tested at levels **1, 4, 5, 9, 10, 14, 15, 19 and 20**, covering all target/combo/projectile tier boundaries as well as initial, intermediate and maximum levels. Coverage includes:

- Forward target limits, no back hits, Strength's hero/equipment damage and boss scaling; equal-damage Super Kick hits, one target per kick, retargeting after defeat, no hero teleport and end-of-combo cooldown.
- Straight Fireball bursts, first/second hit damage, disappearance, no burn, swept solid-wall collision and off-axis misses.
- Flight ground-only launch, exact duration, cancellation, gravity resumption, input/attack restrictions and Fireball's independent cooldown. Ordinary immunity and boss hit rolls are checked separately.
- Steel reduction/duration anchors, unchanged movement/double-jump/attacks, complete knockback immunity and expiry timing.
- Ground-only Roots target caps, immobilization, one-second damage ticks, boss movement reduction and continued boss attacks.
- Agility duration and independent valid-attack rolls, with deterministic stratified samples verifying 75% regular and 50% Legendary dodge thresholds. These are probability-rule tests, not observations of real bosses on hardware.
- Speed's running/attack bonuses, unchanged damage, passive slot exclusion and combined equipment attack-speed cap.
- Whirlwind target caps, lift/spin trajectories, damage ticks, unlifted boss behavior, falling gravity, solid-wall/ceiling sweeps, landing and restoration of the original respawn surface.
- Combat safety, Tree location, immediate points/health on leveling, one/multiple upgrades, previews without mutation, no refunds, max-level/budget checks, slot swapping, delayed cooldown persistence, pause, respawn, reload and active-power unequipping.
- Legacy migration, invalid/overspent ledgers, unknown/prototype-property ability IDs, settings normalization and the disabled-by-default future fourth-slot adapter with half cooldown.

The existing Phase 2 tests continue to cover all appearance values, fixed outfit palettes, 128 extreme proportion/collision combinations, limb connectivity and length, fixed visual contact points, cape length, all three save slots and failure/conflict handling.

`node royale/tests/compare-phase1.mjs`: **passed**, 7,200 fixed steps against the actual approved Phase 1 source. Position, velocity, jumps, collision, basic attacks, enemy behavior, rewards, checkpoints and events match. Health is compared as damage taken relative to maximum because Phase 3 intentionally increases HP growth from 10 to 15 per level; the new maximum/healing rules have their own assertions. Power state and new visual timers are outside this no-powers comparison.

`node royale/tests/verify-isolation.mjs`: **passed**. Phase 3 changes only `royale/`. Original Story/Versus systems, approved artwork/assets, shared animation code, videos and original tests remain unchanged. The three pre-existing Phase 1 menu links are the only differences outside Royale relative to the pre-Royale repository.

All Royale `.mjs` files passed `node --check`; `git diff --check` passed.

## Automated browser checks

Ran the visible `tests/mobile.html` harness in Chromium, using real app DOM handlers inside a same-origin iframe. This is viewport simulation, not physical iPhone/Android/tablet testing.

| Viewport | Movement/input | Creator/save/render | Powers/upgrades/controls |
| --- | ---: | ---: | ---: |
| 390 × 844 portrait | 18 / 18 | 131 / 131 | 64 / 64 |
| 844 × 390 landscape | 18 / 18 | 131 / 131 | 64 / 64 |
| 320 × 568 small phone | 18 / 18 | 131 / 131 | 64 / 64 |
| 768 × 1024 tablet | 18 / 18 | 131 / 131 | 64 / 64 |
| 1280 × 800 desktop | 18 / 18 | 131 / 131 | 64 / 64 |

**1,065 checks passed in the full matrix.** The raw results are in `qa/phase3-browser-log.txt`.

Power checks exercise legacy point/HP migration, all nine stat previews and confirmed purchases, multi-level upgrades, cancellation, the cap, passive exclusion, slot swaps, key remapping, maximum touch layout bounds, darkened cooldown buttons without countdowns, combat locking/unlocking, reload persistence, touch Flight activation/cancellation, and simulated standard-controller jump/pause/resume. Menus preserve visible health and XP.

After the matrix run, final refinements covered Escape while a settings field has focus, active defensive-power unequipping, strict ability-ID validation, and a roster link to the practice lab. Core guards passed the final Node suite. The final power suite then passed **65/65 on both 320 × 568 and 1280 × 800**, including the extra Escape check (130 additional checks). Results are in `qa/phase3-final-ui-log.txt`.

Synthetic pointer capture is stubbed only for synthetic events and restored. Gamepad API fixtures are temporary and restored after their checks. Tests use isolated `sessionStorage` namespaces, not real hero saves. A harness correction re-queries a power-picker button after the UI replaces it; the initial stale-node assertion was not treated as a passing result. The picker also now retains the selected item in view after re-rendering. Controller mock releases wait for animation frames so the polling loop observes the release before a second press.

## Browser-operated visual review and performance

Used direct browser controls to continue a migrated hero, move with the on-screen stick, visit the Tree, select Fireball and preview a 19-level purchase without confirming it. Reviewed the full upgrade panel, selected-power navigation, retained vitals and point balance. The review capture is `qa/tree-of-eris-phase3.jpg`.

In the isolated lab, reviewed the tall/full hero with level-20 Steel Body, Whirlwind and passive Speed. Five of six regular fixtures were visibly lifted and spun; the hero retained the approved articulated shape with a temporary metallic palette. Also operated the short/slender hero’s Super Kick, Super Strength and Flight controls. Inspected the kicking pose and flying cape/limb placement; confirmed that Fireball entered recovery while Flight stayed active. These are browser-operated reviews, separate from the automated suites and from physical-device playtesting.

The lab recorded **30.3 seconds at 1.4 rendered FPS**, with **1.19 ms average / 3.00 ms maximum draw time**, and **1,016.5 ms p95 frame interval** in the remote Chromium browser at 1363 × 936. The sample began with a tall/full hero, six regular fixtures, level-20 Steel Body and Whirlwind, and passive Speed. The raw output is `qa/phase3-performance.txt`.

**This does not meet or verify the 60 FPS rendering target in this environment.** The low drawing cost and long callback intervals are reported separately; no cause or target-device performance is assumed. The sample is not a physical mobile/desktop benchmark, and stable target-device frame rates remain unverified.

## Physical-device testing and remaining review

**No physical iPhone, Android phone, tablet or controller was tested.** Safari, Firefox, hardware pointer capture, controller-specific button layouts, mobile browser chrome/keyboard/safe-area behavior, long sessions and sustained device performance still require hands-on review.

The game targets a 60 Hz simulation. That is not a claim of sustained 60 FPS rendering. Use the practice lab's 30-second measurement button on each target device and record browser, device, orientation, selected abilities and target count.

Damage formulas, range, Flight's 30-second post-effect cooldown, combat grace and the retained XP curve are provisional values documented in `PHASE3.md`. Actual regional boss fights, equipment acquisition, full Villain Merge, other Tree services, other regions, accounts and cloud saving are outside Phase 3. No Phase 4 work is included.
