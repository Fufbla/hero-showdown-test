# Phase 6 validation

Validation date: October 31, 2026 (UTC).

Scope: `feature/showdown-royale`, based on Phase 5 commit `3310c269b6b33a702235e68632dbe60b9ccd65ef`. Tests use isolated fixtures, not player saves. Browser results are automated Chromium viewport checks unless explicitly labeled manual. No physical iPhone, Android, tablet or controller was available.

## Automated engine, migration and isolation tests

- `node --test royale/tests/*.test.mjs`: **368 passed, 0 failed**. Includes the prior 311 tests and 57 Phase 6 tests. Full output: [phase6-node-log.txt](qa/phase6-node-log.txt).
- `node royale/tests/compare-phase1.mjs`: **7,200 simulation steps** match original movement, collisions and basic-attack timing.
- `node royale/tests/verify-phase6.mjs`: all changes are within `royale/`; **21 shared artwork/motion dependencies** are byte-identical to the Phase 5 base.
- `node royale/tests/verify-isolation.mjs`: original Story/Versus gameplay and assets are unchanged; only historical Royale menu entry tiles differ from the original main base.
- **53 ES modules** pass `node --check`; `git diff --check` passes.

The new tests cover five-second travel locks, boss encounter blocks, exact location/monster retention, persistent clock, Eris reload including cleared arenas, all nine powers' single/bulk/max transactions, permanent points, all 11 set totals, mixed equipment, caps, level restrictions, full-inventory outfit replacement, fixed colors, resale rounding, repeat submissions, discard confirmation/tombstones, all appearance price groups, makeover cap, free starter colors, Root purchase/use rules, reward reveal/acceptance, chest integration, old-save migration, stale/failed durable writes, all seven recommended-level boss damage relationships and long reward queues.

The earlier suites still test all regional encounters, boss phases/wave limits, XP-only helpers, victory/retreat/defeat, first-clear rewards, gates, 21 monster species, day/night rules, every ability's endpoints/intermediate values, animation constraints and creator save compatibility. Expected snapshot version assertions are updated from 5 to 6; reward tests now explicitly accept revealed drops instead of assuming automatic acquisition.

## Automated browser checks

| Browser suite | Result |
|---|---|
| Phase 6 sanctuary/shop matrix | **185 assertions passed** across 390×844, 844×390, 320×568, 768×1024 and 1280×800 |
| Focused Phase 1–4 regression | **266 assertions passed** at 390×844: input 18, creator 131, powers 65, world 52 |
| All seven bosses at five sizes | **688 assertions passed**, seven bosses × the same five viewport sizes |

Phase 6 coverage includes visible vitals, navigation, exact return position, maximum and bulk upgrades, cancellation and duplicate confirmation, full/individual/locked purchases, three-piece equipping, eight-stat comparison, front/back rendered previews, full-inventory replacement, one-time resale, Roots, paid/free appearance changes, persistence and no horizontal overflow. The focused regression also covers touch movement, jumping/double jump, air steering, attacks, loadouts, remapped controls, simulated controller input, clock, world gates and constant rare glow.

Evidence: [sanctuary matrix](qa/phase6-browser-log.txt), [focused regression](qa/phase6-regression-log.txt), [boss matrix](qa/phase6-boss-log.txt).

The browser harness dispatches synthetic keyboard, pointer and controller input. Those results establish browser event/UI behavior and are not physical-device/controller tests. A preview reload interrupted an early regression attempt; the recorded completed rerun is the evidence used below.

## Focused manual playtesting

Manual review used the remote Chromium Eris practice page and actual visible controls, separately from the scripted assertions.

- Visually inspected the peaceful tree/roots/green-energy scene, five service paths, locked Villain Merge entry and persistent HP/XP/clock.
- Canceled a 150-coin Shore Guardian outfit review: balance stayed 5,000. Then confirmed: balance 4,850, three owned pieces. Equipped all three and inspected front/back views. Applied bonuses were strength +6, damage +3, defense +2.5%, run +2%, attack speed +1.5% and Fireball +3, separately from natural strength 108.
- Sold its equipped 49-coin helmet for 12 coins: balance became 4,862, inventory 2/7, with the worn reference removed.
- Maximum-affordable Super Strength showed Level 20, five targets, 100% boss effectiveness and the unchanged eight-second cooldown. Confirming spent 20 of 49 points, leaving 29. A three-level Fireball transaction then left 26.
- Bought three Health Roots for 150 coins, reaching 4/4 and 4,712 coins. Used one at Eris: displayed HP rose from 543/835 to 752/835 (the exact fractional 25% heal is rounded up only for display), leaving three Roots.
- Previewed Locs for 100 coins and confirmed. Balance became 4,612 with level, two equipped items, powers and world progress retained. Returned to the same Toxic Underground location, x=123.5, y=600, and selected the learned powers through the existing Pause loadout.
- Observed the adventure clock count down while shopping and customizing. The five-size automated matrix covers the more extensive small-screen purchase/replacement/appearance cases.

Evidence: [sanctuary](qa/phase6-sanctuary.jpg), [equipped wardrobe](qa/phase6-wardrobe.jpg). This is not an unassisted seven-region clear or physical touch-hardware test.

## Performance

One 30.3-second visible adventure sample ran after the shop/appearance changes, in Region 4 at 1348×816, with two equipped pieces and 17 regular monsters. Keyboard movement was exercised during the sample.

| Measurement | Result |
|---|---:|
| Rendered FPS | **1.3** |
| Average / maximum draw time | 0.96 ms / 2.80 ms |
| 95th-percentile frame interval | 1,016.5 ms |

[Raw performance result](qa/phase6-performance.txt). Frame delivery in this remote browser was poor despite short measured drawing time. This does not establish performance on actual desktop or mobile hardware.

The game still uses a fixed 60 Hz simulation, which is not evidence of 60 rendered FPS. Eris skips drawing the suspended adventure canvas. The scene and shop previews are redrawn on demand. No sustained 60 FPS claim is made.

## Review boundaries

All six Phase 6 services are implemented, including the deliberately disabled Villain Merge entry. Legendary rewards and a functional fourth ability unlock remain outside this phase. Existing Phase 5 Trash Monster and Ultimate Pollution Boss sprites remain clearly marked temporary. New sanctuary and ordinary costume artwork is code-native; shared approved artwork is unchanged.

Prices, set stat budgets and the choice to charge presentation within the body-appearance group are provisional. The complete makeover price caps grouped changes at 750 coins. Legacy seven-category gear is preserved with explicit migration values and its original stats; all new drops use helmet/chest/boots. There are no accounts or cloud saves. Local revision/tombstone checks prevent ordinary stale and repeated app transactions, not manual edits to browser storage or external backup restoration.

Still needed: actual iPhone/Android/tablet/Safari/Firefox/controller testing, long sessions, production-device FPS measurements, and economy/difficulty feedback. These are not represented as completed tests.
