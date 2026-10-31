# Hero Showdown Royale — Phase 4

An isolated game mode in Hero Showdown — James Clan Comics. Development stays on `feature/showdown-royale`; Phase 4 builds on `cbc57946a39228b9d3866f71f9da86e6a0e8143c`. No Phase 4 files outside `royale/` are changed.

**[Playtest](https://healthia-showdown-royale-phase1.gladcreek512.chatgpt.site)** · **[Phase 4 guide](PHASE4.md)** · **[Validation report](PHASE4-VALIDATION.md)**

## Launch

From the repository root:

```sh
python3 royale/serve.py
```

Open `http://localhost:8000/royale/`, or use the existing macOS/Windows launchers. Use `--lan` for phones/tablets on the same Wi-Fi; the launcher prints possible LAN addresses. `--port 8001` chooses another port. Serve the repository root so the unchanged shared animation helper resolves correctly.

## What is playable

- The complete Phase 2 character creator, animated customized heroes, three browser-local slots and original Coast movement/platforming.
- All nine Phase 3 powers, permanent Power Points, three active slots, independent cooldowns and no dash/energy costs.
- Seven region environments, 21 monster types, connected boards, camps, timed/return respawning, ranged/flying/pouncing monsters and visible health bars.
- Level 99, nonlinear XP, reduced low-level rewards, level-up healing, death XP penalty, automatic coins, Health Roots and ordinary/rare fixed-color equipment.
- World map, safe travel, Tree purchases/upgrades, strict seven-item inventory, confirmed reward comparisons, and a persistent real-time day/night cycle.

**Boss battles are reserved for Phase 5.** Forward region unlocks require actual boss victories, so normal saves remain in Coastal Beginnings for now. To review later content, choose **Explore all seven regions** from character selection. Its practice fixtures use isolated session storage and do not change real heroes or record real boss victories.

Pause opens the World Map, Equipment, Tree and control settings. Save/travel/upgrade/equipment changes require five seconds without attacking or taking damage and no active offensive effect or boss encounter. H uses a Health Root without cooldown; a touch button beside the HUD does the same. See [PHASE4.md](PHASE4.md) for the full controls, XP table, monster stats, drop rules and provisional balancing.

## Day/night review

In the seven-region practice page, choose Region 3–7 and **Night**, **Night starts in 5 seconds**, or **Day starts in 5 seconds**, then load. Pause or visit the Tree and watch the clock advance. Normal durations remain 30 minutes of day / 10 minutes of night. Regions 1–2 always stay daytime. Practice offers a full-inventory reward demo and a 30-second browser performance measurement.

## Saving

The existing `healthia.royale.profiles.v2` three-slot envelope now contains version-4 snapshots. Versions 1–3 migrate without resetting earned levels, numeric XP, coins, customization, checkpoints or powers. The original Phase 1 key remains as a backup. World location, current health, clock, region unlocks, checkpoint history, monster progress, Roots and equipment now persist.

Autosave runs only safely outside combat. Closing during combat restores the last safe save. The clock uses real elapsed time even while closed. Malformed/future data and conflicting writes remain protected from overwrite; unavailable storage shows a warning. There are no game accounts, cloud saves or cross-device synchronization.

## Tests

Node 20+; no dependencies to install:

```sh
node --test royale/tests/*.test.mjs
node royale/tests/compare-phase1.mjs
node royale/tests/verify-isolation.mjs
```

`tests/mobile.html` runs actual DOM input, creator/save/render, power, and world/economy suites in five viewport sizes. All fixture storage is isolated. `tests/world.html` is the seven-region practice world; `tests/powers.html` is the nine-power combat lab; `tests/animations.html` is the pose gallery. The Phase 1 differential now compares movement, collisions and basic attack timing, because Phase 4 deliberately changes rewards, AI, XP and defeat rules. Those have separate tests.

Browser emulation is separate from physical-device testing. Physical iPhone/Android/tablet/controller testing, Safari/Firefox coverage, sustained performance and long-session balancing require hands-on review. Never infer 60 FPS from the fixed 60 Hz simulation; use actual rendered-frame measurements.

## Architecture

- `core.mjs`: fixed-step hero movement, collision, combat integration and snapshot conversion.
- `powers.mjs`, `power-menu.mjs`, `power-art.mjs`: established nine-power system and Tree upgrades.
- `progression.mjs`: XP curve, clock, loot/respawn constants and the future boss-reward boundary.
- `world.mjs`, `world-state.mjs`: seven-region geometry, 21 species and validated world saves.
- `journey.mjs`, `monsters.mjs`: progression, economy, inventory actions, travel and advanced enemy behavior.
- `equipment.mjs`: fixed item catalog, rarity rolls, seven-space validation and equipped-stat adapter.
- `journey-menu.mjs`, `journey.css`, `world-art.mjs`: map, inventory, Root shop, scenery and new monster art.
- `appearance.mjs`, `creator.mjs`, `hero-rig.mjs`, `hero-art.mjs`: existing cosmetic creator and shared animated rig. Equipment follows the same joints.
- `input.mjs`, `controls.mjs`: remappable keyboard/controller and multi-pointer touch controls.
- `saves.mjs`: three local profiles, migration, warnings and write-conflict protection.
- `renderer.mjs`, `app.mjs`: canvas rendering, camera, HUD, sound and browser loop.
- `../assets/animation/motion-core.js`: reused **unchanged** interpolation helper.

The private playtest deploys only Royale plus that helper. It does not deploy or modify Story or Versus. Historical Phase 2/3 guides and validation reports remain in the repository; [PHASE4-VALIDATION.md](PHASE4-VALIDATION.md) describes current verification. Phase 5 has not begun.
