# Phase 5 validation

Development parent: `a8064a5e626e151c77e4f30b18471a5531c69be2`. Branch: `feature/showdown-royale`. Validation completed October 30, 2026 (America/New_York). All Phase 5 changes are within `royale/`.

## Automated results

| Check | Result |
|---|---|
| Node test suite | **311 passed, 0 failed, 0 skipped**: 211 existing tests, 91 Phase 5 tests and 9 artwork/rig tests |
| Boss browser matrix | **688 passing assertions**: seven bosses at five viewport sizes, plus artwork rendering checks |
| Phase 1–4 browser regression | **1,330 passing assertions**, across 20 runs: input (18), creator (131), powers (65) and world (52), each at all five viewport sizes |
| Phase 1 differential | **7,200 matching simulation steps** for movement, collision and basic attack timing |
| Original project isolation | Passed: Story, Versus and approved shared assets are byte-for-byte unchanged |
| Phase 5 isolation | Passed: only `royale/` changes; all 20 boss artwork dependencies match the Phase 4 tree |
| Deployment asset check | All 21 deployed shared dependencies, including the existing motion helper, match repository bytes |
| Final source checks | All 46 JavaScript modules parse; `git diff --check` passes |

The boss matrix sizes were 390×844, 844×390, 320×568, 768×1024 and 1280×800. Assertions repeat across regions and sizes; they are not 688 distinct scenarios. These are remote Chromium iframe layouts with synthetic DOM pointer/keyboard events, not actual iPhone, Android, tablet or controller hardware.

Evidence: [Node log](qa/phase5-node-log.txt), [boss browser log](qa/phase5-browser-log.txt), [earlier-phase browser log](qa/phase5-regression-log.txt), [asset checksums](qa/phase5-asset-manifest.json).

### Coverage

- All seven bosses' defined HP/damage, immediate entry, legal early entry and distinct phase attack catalogues. Exact 50% / 20% boundaries and immediate bar/phase updates.
- All 21 recommended-level/loadout combinations — brawler, ranged and control for each boss — finish using real combat input and normal allocated Power Points, mixing grounded basic attacks with their powers. Those integration simulations isolate survival with invulnerability; they verify attack execution/encounter completion, **not human difficulty or dodge skill**.
- No reinforcements in Phases 1–2; exactly three per wave, maximum three waves/nine helpers, spacing and delaying new waves while helpers live. No further waves after boss death. Dead helpers never respawn.
- Boss death leaves helpers alive; helpers grant XP only. Final completion requires boss and helpers dead and hero alive, including simultaneous-death rejection. First reward 100 coins, repeat 10, no duplicated completion.
- Entire encounter reset on death and retreat; checkpoint/full-HP restoration, exact XP penalty and preserved resources. No retreat XP penalty. Real connected passages and map gates unlock only after a confirmed victory.
- All nine powers against actual regional bosses: Flight hit rolls/helper immunity/offensive restrictions, Steel mitigation/knockback, regular/Legendary Agility distinction, Roots slowing without disabling attacks, no boss lift, Strength effectiveness, equal Super Kick hits, Fireball piercing and no burn, Speed caps.
- Health Root use during encounters, fixed capacity, no cooldown; no helper coins/items/Roots.
- First-only stable chest rolls, regional rarity limits, preview before collection, seven carried items including equipped pieces, explicit replacement/discard confirmation, cancel behavior, Root capacity and idempotent claims.
- Browser-local save versions 1–5, preserved Phase 1–4 progress, independent heroes, pre-entry restart snapshots, no partial boss/wave saves, stable unopened chests and persisted claimed chests/rewards.
- Active encounters block manual saving, Tree and all pause travel. HUD/HP/XP, controls, chest previews and inventory confirmation remain reachable without horizontal overflow at all five sizes.
- Approved artwork loads and renders with distinct silhouettes; placeholder labels match the two missing exact designs. Scorpion IK joint lengths, eight legs, at most four swinging feet, world-space foot planting at normal/aggressive speeds and reversals, claws, ten tail segments, pause stability and pose/combat separation.

## Manual and performance review

Manual playtesting used the remote Chromium practice page and actual keyboard/on-screen controls. It was separate from the automated assertions above.

- Giant Scorpion: inspected the front-facing eight-leg rig, connected claws and curving stinger, warning zones and health bars. Ran, jumped, activated Steel Body and used basic/combo kicks. A two-hit Super Kick reduced boss HP from 2,200 to 2,008. A Health Root restored hero HP from 209 to 418 of 835 and consumed one Root during combat.
- Staged the scorpion's Phase 3 using the visibly labeled scenario controls. Three helpers spawned. Defeating the boss alone left the encounter active with no reward. Clearing the helpers then awarded 100 coins, boss XP and the first chest. These fixture-assisted checks are not an unassisted boss clear.
- Previewed a chest containing 36 coins, one Health Root and equipment beside a full seven-item inventory. Collected the currencies, canceled an equipment replacement, then confirmed it. The inventory stayed at seven; existing items were not silently deleted.
- Venomis: inspected the approved scientist design at night, activated Flight and Fireball with the visible controls, and observed straight projectiles. Running left exited the arena normally; retreat preserved resources and restored exploration with the ordinary combat grace period.
- AtomDust: after three fixture-defeated helpers awarded 4,200 XP and no coins, triggered defeat while the boss lived. The hero returned to the checkpoint at full 1,285 HP, retaining coins, Roots, level and Power Points. Current-level XP fell from 4,200 to 303 after the normal 3,897-XP penalty; the encounter reset.
- Visually reviewed Bushman, Wastelander and AtomDust's reused artwork, and the clearly marked temporary Trash Monster and Ultimate Pollution Boss designs. The final boss appeared at 42,000 HP against the Level 99 hero with 1,570 maximum HP.
- Reopened the existing Phase 3 power combat lab and confirmed its generic Legendary Boss test target still renders; this remains a test fixture, not a new Legendary encounter. Resetting the new boss practice page also clears its previous scenario status.

Evidence: [scorpion combat](qa/phase5-scorpion.jpg), [cleared arena](qa/phase5-arena-cleared.jpg), [chest preview](qa/phase5-chest-preview.jpg), [Venomis in Flight](qa/phase5-venomis.jpg).

One rendered-frame sample ran during active Giant Scorpion Phase 3 combat with three helpers, movement and held kicks. The remote browser reported:

| Measurement | Result |
|---|---|
| Sample duration / viewport | 30.6 seconds / 1348×781 |
| Rendered FPS | **1.5** |
| Average / maximum drawing time | 1.63 ms / 7.90 ms |
| 95th-percentile frame interval | 1,016.5 ms |

The [raw performance result](qa/phase5-performance.txt) shows poor frame delivery in this cloud-browser session despite short measured drawing times. It does **not** demonstrate smooth or sustained 60 FPS. Performance on physical devices remains unverified. No full unassisted human clear of all seven bosses or continuous seven-region playthrough is claimed.

## Limits and phase boundary

No physical device, Safari/Firefox or real controller was tested. Actual hardware ergonomics, sustained performance, underleveled challenge runs, all boss difficulty curves and a continuous seven-region playthrough need review. A fixed 60 Hz simulation and fast Node execution do not demonstrate sustained rendered 60 FPS.

HP, damage, warning/recovery timing, reinforcement spacing, boss XP and chest rolls are provisional. Trash Monster and Ultimate Pollution Boss have visibly temporary artwork. Venomis uses the approved scientist's existing frames adapted to vine/poison attacks; bespoke additional frames remain an art refinement.

Closing an active encounter restores its safe entry snapshot, including hero resources. Unsaved helper XP and Root use since entry roll back on browser closure; same-session retreat/death preserve earned/used resources, with the normal death penalty. There is no new continuous combat autosave or account/cloud saving.

The final Phase 5 diff contains only `royale/` paths. `main` is `b11a1d8103f10e38d63788496660b99d4a8d9e6e`; original Story, Versus, characters, villains, animations and shared assets are unchanged. Phase 6, Legendary encounters/equipment, Villain Merge activation and accounts/cloud saves have not begun.
