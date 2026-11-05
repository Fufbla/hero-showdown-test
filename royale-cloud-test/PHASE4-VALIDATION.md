# Phase 4 validation

Tested October 30, 2026 (America/New_York), on top of Phase 3 commit `cbc57946a39228b9d3866f71f9da86e6a0e8143c`. All changes for this phase are inside `royale/`.

## Automated results

| Check | Result |
|---|---|
| `node --test royale/tests/*.test.mjs` | **211 passed, 0 failed, 0 skipped**: 141 prior tests and 70 Phase 4 tests |
| `node royale/tests/compare-phase1.mjs` | **7,200 simulation steps passed** for movement, collision and basic attack timing |
| `node royale/tests/verify-isolation.mjs` | Passed: original gameplay and shared assets remain byte-for-byte unchanged |
| Existing browser input / creator / nine-power suites | **1,070 passing assertions**: 214 at each of five viewport sizes |
| Phase 4 browser matrix | **255 passing assertions**: 51 at each of five viewport sizes |
| Final small-phone and desktop rechecks | **104 passing assertions**: 52 at each size, including the new Root touch and binding-migration checks |
| Module syntax and `git diff --check` | Passed |

The viewport matrix was 390×844, 844×390, 320×568, 768×1024 and 1280×800. These are Chromium iframe layouts with synthetic pointer, keyboard and gamepad input, not physical phones, tablets or controllers. The final two rechecks use 320×568 and 1280×800. The 1,429 browser assertions include repeated checks across sizes; they are not 1,429 distinct test cases.

Evidence: [Node log](qa/phase4-node-log.txt), [existing-system browser log](qa/phase4-regression-log.txt), [world matrix](qa/phase4-world-log.txt), [final UI rechecks](qa/phase4-final-ui-log.txt).

The old Phase 1 differential deliberately excludes enemies and camp interaction. Monster AI, XP, coins, respawn timing, camp protection and death penalties intentionally change in Phase 4 and have dedicated tests instead of an invalid expectation of unchanged behavior.

### Covered rules

- All 98 level gains through Level 99, the nonlinear XP table, low-level reward reductions, immediate full healing and one Power Point per gained level; death penalties without lost levels or negative XP.
- All seven regions, their connected boards/camps/gates, all 21 monster definitions, AI attacks, ground/flying behavior, timer/revisit respawns and safe spawn distances.
- Exact deterministic probability grids for Health Roots and all seven regional rarity rates, automatic day/night coins, XP-only summoned enemies, four-Root capacity, healing and purchases.
- Seven total carried equipment items, pending reward comparison, explicit discard confirmation, fixed colors, equipment stats and the combined attack-speed cap.
- Instant day/night boundaries, permanent day in Regions 1–2, persistent elapsed time across reload/paused simulation, two-coin rewards and doubled regular damage with no boss bonus.
- Locked/unlocked map travel, safe destination camps, backward paths, five-second combat recovery, incoming/outgoing projectile restrictions, Tree return location and save restrictions.
- Snapshot versions 1–4, appearance/level/XP/coins/abilities/points retention, clock and world history, enemy respawn timers, inventory, air-save location/momentum/double-jump state and fractional HP.
- All nine Phase 3 abilities, their thresholds, cooldowns, Flight restrictions, protection/dodge rules and future fourth-slot seam remain covered by the existing suite.
- Browser layouts, Root touch use, old custom H/controller-button-11 mappings, all seven environments, all 18 new species' distinct silhouettes, yellow eye rendering and constant rare glow through movement and hit-flashes.

## Focused manual browser playtesting

Performed separately from the scripted assertions, using the visible isolated practice world in remote Chromium:

- Walk/run stick movement and held kicks on the Region 5 monster trail; a night Thorn Beast hit reduced HP from 1,060 to 930 (130 = twice its 65 base damage).
- Used a Health Root while in combat: count fell from three to two and HP returned to 1,060; activated Fireball and saw its button darken for recovery.
- Visually reviewed the Mutated Territories night scene, connected lower route/platforms, monster health bars, bright yellow eyes and readable HP/XP/coin/Root HUD. No floating damage numbers appeared.
- Loaded Industrial Wasteland just before night, opened Pause/Tree, and observed the night countdown continue while simulation time stayed fixed.
- Bought a fourth Root at the Tree: coins changed from 200 to 150, capacity became 4/4, and the buy button disabled.
- Opened the seven-region map and traveled to Toxic Underground: the hero arrived at its safe camp at x=160, y=600 with Roots and coins retained.
- Loaded the full-inventory fixture in Final Showdown, reviewed the exact-stat comparison, confirmed one replacement, and verified the inventory remained 7/7. The fixture showed Level 99, 1,570 HP and MAX LEVEL.
- Checked that practice regions are labeled as fixtures and that boss encounters remain explicitly deferred to Phase 5.

Screenshots: [night gameplay](qa/phase4-night.jpg), [world map](qa/phase4-world-map.jpg), [Tree shop](qa/phase4-tree.jpg).

## Measured performance and limits

The final **30.4-second active-gameplay sample** in remote Chromium, Region 5 at night, 17 current-region enemies, 1363×799 game viewport, measured:

| Measurement | Result |
|---|---:|
| Rendered FPS | **1.3** |
| Average canvas draw time | 1.13 ms |
| Maximum canvas draw time | 1.80 ms |
| 95th-percentile frame interval | 1,016.5 ms |

Walking/running and held attacks were exercised during the sample. [Raw result](qa/phase4-performance.txt). The measurement now resumes gameplay before sampling and cancels if gameplay pauses or the document becomes hidden. An earlier exploratory sample included a paused interval and is not used as the active-play result.

**Sustained 60 FPS has not been demonstrated.** The low frame delivery rate in this remote browser prevents a reliable assessment of responsive physical-device play; short canvas draw times alone do not prove 60 FPS. The existing fixed-step movement loop is retained. Physical iPhone/Android/tablet/desktop hardware, Safari/Firefox and real controller testing are still required. No physical device was tested in this session.

The XP/drop/AI/gear values are provisional. Automated simulations verify the formulas, not the enjoyment or pacing of a full Level 1–99 playthrough. Longer playtests should evaluate regular-enemy time-to-kill, group danger, late-level grind and touch ergonomics.

## Phase boundary and isolation

Normal forward region unlocks remain blocked by unimplemented boss encounters. The practice world is the review route for Regions 2–7; it never writes to real hero slots. Only the future boss reward/unlock adapter and labeled arena entrances exist. No boss battle or real boss victory is claimed.

Phase 5, Legendary equipment, Villain Merge activation, personal accounts and cloud saves remain unimplemented as planned. The existing three browser-local slots and private Site audience are preserved.

The development parent is on `feature/showdown-royale`. The final diff against that parent contains only `royale/` paths. `main` remains at `b11a1d8103f10e38d63788496660b99d4a8d9e6e`; Versus, Story, original characters, villains, animations and shared assets are untouched. No merge is performed.
