# Hero Showdown Royale — Phase 7

An isolated game mode in Hero Showdown — James Clan Comics. Development stays on `feature/showdown-royale`; Phase 7 builds on `7e19386f7e2d9b8fd3936bda755d27ae6a1dccc0`. No Phase 7 files outside `royale/` are changed.

**[Playtest](https://healthia-showdown-royale-phase1.gladcreek512.chatgpt.site)** · **[Phase 7 guide](PHASE7.md)** · **[Validation report](PHASE7-VALIDATION.md)**

## Launch

From the repository root:

```sh
python3 royale/serve.py
```

Open `http://localhost:8000/royale/`, or use the existing macOS/Windows launchers. Use `--lan` for phones/tablets on the same Wi-Fi; the launcher prints possible LAN addresses. `--port 8001` chooses another port. Serve the repository root so the unchanged shared animation helper resolves correctly.

## New in Phase 7

At Level 99, Pause → **World Map** → **The Legendary Frontier** opens eight dedicated boss arenas. Each boss has three times the final regional boss HP, distinct telegraphed attacks, three phases, limited helpers, a disrupted normal power and one permanent victory per hero. Clear the entire arena to review a full three-piece Villain Merge reward. At **Tree of Eris → Villain Merge**, preview/equip complete or mixed suits. Three matching pieces unlock a protected fourth ability at half cooldown. Discarded Legendary pieces cannot be recovered or earned again; strict atomic IndexedDB records prevent stale manual saves from restoring them.

Choose **Practice all eight Legendary bosses** on character selection for disposable Level-99 review heroes. Read [PHASE7.md](PHASE7.md) for all eight bosses, abilities, balance values, artwork and storage limits. All previous sanctuary/shop services remain available; their guide is [PHASE6.md](PHASE6.md).

## What is playable

- The complete Phase 2 character creator, animated customized heroes, three browser-local slots and original Coast movement/platforming.
- All nine Phase 3 powers, permanent Power Points, three active slots, independent cooldowns and no dash/energy costs.
- Seven region environments, 21 monster types, connected boards, camps, timed/return respawning, ranged/flying/pouncing monsters and visible health bars.
- Level 99, nonlinear XP, reduced low-level rewards, level-up healing, death XP penalty, automatic coins, Health Roots and ordinary/rare fixed-color equipment.
- World map, safe travel, Tree purchases/upgrades, strict seven-item inventory, confirmed reward comparisons, and a persistent real-time day/night cycle.

All seven regional bosses now have three combat phases, telegraphed attacks, limited reinforcements, first-victory treasure, rematches and permanent region unlocks. Enter the marked arena at each region’s far end with E or the touch Passage button. Walk left to retreat. Choose **Practice all seven bosses** on character selection for immediate, disposable recommended-level tests; it does not change saved heroes. See [PHASE5.md](PHASE5.md) for boss stats, controls and artwork status.

Pause opens the World Map, Equipment, Tree and control settings. Save/travel/upgrade/equipment changes require five seconds without attacking or taking damage and no active offensive effect or boss encounter. H uses a Health Root without cooldown; a touch button beside the HUD does the same. See [PHASE4.md](PHASE4.md) for the full controls, XP table, monster stats, drop rules and provisional balancing.

## Day/night review

In the seven-region practice page, choose Region 3–7 and **Night**, **Night starts in 5 seconds**, or **Day starts in 5 seconds**, then load. Pause or visit the Tree and watch the clock advance. Normal durations remain 30 minutes of day / 10 minutes of night. Regions 1–2 always stay daytime. Practice offers a full-inventory reward demo and a 30-second browser performance measurement.

## Saving

The existing `healthia.royale.profiles.v2` three-slot envelope now contains version-7 snapshots. Versions 1–6 migrate without resetting earned levels, numeric XP, coins, customization, checkpoints or powers. The original Phase 1 key remains as a backup. World location, current health, clock, region unlocks, checkpoint history, monster progress, Roots, equipment and Eris return locations persist. Economic revisions and retired item IDs protect against stale transactions; failed durable transaction saves roll back.

Autosave runs only safely outside combat. Closing during ordinary combat restores the last safe save. Boss entry makes one safe snapshot; reopening during a boss attempt restarts the whole encounter from that snapshot, including its hero resources. Boss wins and chest claims are stored independently per hero. The clock uses real elapsed time even while closed. Malformed/future data and conflicting writes remain protected from overwrite; unavailable storage shows a warning. Legendary victories, reward claims and permanent item destruction additionally commit an atomic authority record before confirmation; unsupported storage locks Legendary play. Clearing browser data or restoring an older complete browser backup is outside this local guarantee. There are no game accounts, cloud saves or cross-device synchronization.

## Tests

Node 20+; no dependencies to install:

```sh
node --test royale/tests/*.test.mjs
node royale/tests/compare-phase1.mjs
node royale/tests/verify-isolation.mjs
node royale/tests/verify-phase7.mjs
```

`tests/phase7-browser.html` checks all eight Legendary encounters at five sizes, actual IndexedDB concurrency/crash recovery, full-inventory selection and mixed equipment; `tests/legendary.html` is the isolated practice page. `tests/phase6-browser.html` checks the sanctuary/shop flows across five sizes; `tests/eris.html` offers manual economic practice. `tests/phase5-browser.html` checks all seven bosses across five viewport sizes; `tests/bosses.html` offers manual boss practice and performance sampling. `tests/mobile.html` runs actual DOM input, creator/save/render, power, and world/economy suites in five viewport sizes. All fixture storage is isolated. `tests/world.html` is the seven-region practice world; `tests/powers.html` is the nine-power combat lab; `tests/animations.html` is the pose gallery. The Phase 1 differential now compares movement, collisions and basic attack timing, because Phase 4 deliberately changes rewards, AI, XP and defeat rules. Those have separate tests.

Browser emulation is separate from physical-device testing. Physical iPhone/Android/tablet/controller testing, Safari/Firefox coverage, sustained performance and long-session balancing require hands-on review. Never infer 60 FPS from the fixed 60 Hz simulation; use actual rendered-frame measurements.

## Architecture

- `legendary-data.mjs`, `legendary-bosses.mjs`, `legendary-state.mjs`: endgame bosses, permanent rewards and validation.
- `legendary-ledger.mjs`: strict atomic durable authority and stale-cache recovery.
- `merge-powers.mjs`, `merge-costume-art.mjs`, `legendary-art.mjs`, `legendary-music.mjs`: eight distinct fourth powers, personalized suits, arena/remains art and original synthesized music.
- `legendary-ui.mjs`, `legendary.css`: map entrances, paused reward choice and Eris complete/mixed transformations.
- `boss-data.mjs`, `bosses.mjs`, `boss-state.mjs`, `boss-art.mjs`, `boss-ui.mjs`: regional encounter rules, saves, canonical artwork adapters, boss HUD and treasure.
- `core.mjs`: fixed-step hero movement, collision, combat integration and snapshot conversion.
- `powers.mjs`, `power-menu.mjs`, `power-art.mjs`: established nine-power system and Tree upgrades.
- `progression.mjs`: XP curve, clock, loot/respawn constants and the boss-reward boundary.
- `world.mjs`, `world-state.mjs`: seven-region geometry, 21 species and validated world saves.
- `journey.mjs`, `monsters.mjs`: progression, economy, inventory actions, travel and advanced enemy behavior.
- `costume-catalog.mjs`, `equipment.mjs`: configurable three-piece catalog, fixed colors, rarity rolls, seven-space validation and equipped-stat adapter.
- `eris.mjs`, `eris-ui.mjs`, `eris.css`: dedicated sanctuary, atomic economy, appearance services and responsive central shop.
- `journey-menu.mjs`, `journey.css`, `world-art.mjs`: map, inventory, Root shop, scenery and new monster art.
- `appearance.mjs`, `creator.mjs`, `hero-rig.mjs`, `hero-art.mjs`: existing cosmetic creator and shared animated rig. Equipment follows the same joints.
- `input.mjs`, `controls.mjs`: remappable keyboard/controller and multi-pointer touch controls.
- `saves.mjs`: three local profiles, migration, warnings and write-conflict protection.
- `renderer.mjs`, `app.mjs`: canvas rendering, camera, HUD, sound and browser loop.
- `../assets/animation/motion-core.js`: reused **unchanged** interpolation helper.

The private playtest deploys Royale plus unchanged shared artwork/helpers enumerated in `boss-art.mjs`. It does not deploy or modify Story or Versus. Earlier guides remain historical records; [PHASE7-VALIDATION.md](PHASE7-VALIDATION.md) describes current verification. Trash Monster and Ultimate Pollution Boss artwork is explicitly temporary. Phase 8 has not begun.
