# Phase 5 — Regional boss battles

Built on Phase 4 `a8064a5e626e151c77e4f30b18471a5531c69be2`, exclusively in `royale/` on `feature/showdown-royale`.

## Play and access

[Open the existing private playtest](https://healthia-showdown-royale-phase1.gladcreek512.chatgpt.site), then choose **Practice all seven bosses** from character selection for immediate review. The practice page has all seven recommended-level heroes, three legal Power Point loadouts, day/night selection, optional scenario controls and a 30-second performance sampler. These disposable session-storage fixtures never read or write your three normal local hero slots. Fixture victories are not real saved-hero progress.

For a normal hero, follow the visible path to the far end of each region. At the labeled arena entrance, press **E** or tap **Passage**. Entry has no hero-level minimum. Leave ordinary combat for five seconds before entering. The boss is present immediately; no cinematic plays. Approved artwork preloads while exploring the current region; on a slow connection simulation waits until the art is ready.

Move with A/D or arrows, Shift to run, Space/W/Up to jump/double-jump, J/Z to punch, K/X to kick, 1/2/3 for equipped powers, H for Health Roots. Existing controller mappings, touch stick/buttons and customization remain available. Walk left through the arena exit to retreat at any time. Victory opens the next region's normal passage and world-map destination. Previously unlocked regions and boss rematches stay accessible.

After a first clear, approach the chest and press E or tap **View treasure**. Preview every reward, then collect coins/Roots and choose equipment. Equipment never enters your seven carried slots without your choice. A full inventory shows owned items alongside rewards and requires explicit confirmation to replace/discard. Cancel leaves everything intact. Unclaimed equipment stays pending across safe saves.

## Bosses and initial balance

These are provisional regional-boss values, not Legendary Boss durability. Base attack damage is multiplied by the selected attack's listed factor in `boss-data.mjs`; night never changes a boss's HP, damage, powers or victory rewards.

| Region | Boss | Recommended level | HP | Base damage | Base victory XP | Reinforcement |
|---|---|---:|---:|---:|---:|---|
| Coastal Beginnings | Trash Monster | 10 | 950 | 18 | 250 | Trash Slimes |
| Polluted Forest | Bushman | 20 | 2,600 | 32 | 800 | Thorn Sprouts |
| Industrial Wasteland | Wastelander | 35 | 6,000 | 52 | 2,200 | Scrap Crawlers |
| Toxic Underground | Giant Scorpion | 50 | 11,000 | 82 | 4,500 | Cave Scorpions |
| Mutated Territories | Venomis | 65 | 18,000 | 120 | 8,500 | Mutant Stalkers |
| Dark Energy Realm | AtomDust | 80 | 28,000 | 175 | 15,000 | Energy Phantoms |
| Final Showdown | Ultimate Pollution Boss | 99 | 42,000 | 235 | 28,000 | Apocalypse Mutants |

XP uses the existing low-level-reward reduction; Level 99 earns no additional XP. Summoned helpers use the boss's recommended level for XP comparison, their existing regional monster HP/damage and their existing animations. They grant XP only: no coins, Roots, equipment or respawn.

- **Trash Monster:** slow throws and swipes; faster throws and slams; aggressive desperation patterns with slow trudging pursuit.
- **Bushman:** vines and short strikes; thorns and branch sweeps; stronger ground roots. Its approach weaves in pace. Approved fiery bark/lion appearance is retained.
- **Wastelander:** punches and toxic shots; shockwaves/slams; multiple hazardous ground zones and a heavy, uneven walking cadence.
- **Giant Scorpion:** claws and targeted stinger; paired claw sweeps and heavier stinger strikes; faster combinations and short backward scuttles when crowded. Uses the approved front-facing body, eight connected walking legs, planted support feet, articulated claws, abdomen and ten-link tail. Stinger warning and damage share one reachable target, with damage at the plunge contact timing.
- **Venomis:** thorn/vine attacks; poison fans and vine sweeps; powerful root patterns, keeping distance and retreating when crowded. Uses the approved Venomis scientist artwork; the separate Thornbear companion is not substituted for Venomis.
- **AtomDust:** concentrated blasts; expanding waves and falling debris; doubled atomic shockwaves with ranged spacing and lateral drift.
- **Ultimate Pollution Boss:** pollution fans and heavy slams; fallout and aggressive movement; powerful double shockwaves and the closest, fastest pursuit in desperation.

The two missing exact designs — **Trash Monster and Ultimate Pollution Boss** — use clearly marked temporary comic-style vector sprites. No established artwork was replaced. Five bosses reuse approved repository artwork; `BOSS_ART_DEPENDENCIES` lists every unchanged dependency. Venomis's existing sheets are adapted to these attacks; additional bespoke attack frames can be reviewed later without altering combat rules.

## Encounter rules

Phase 1 is above 50% HP; Phase 2 begins at exactly 50%; Phase 3 begins at exactly 20%. The large boss bar shows name, HP and phase, changes color immediately and displays attack warnings/recovery cues. No damage numbers appear. Attack warnings are initially 0.95–1.30 seconds, multiplied by 0.92 in Phase 2 and 0.85 in Phase 3, with a 0.65-second floor. Recovery windows are 1.10–1.50 seconds, multiplied by 0.88 / 0.80. Idle gaps shrink from 1.25 to 0.80 to 0.55 seconds. These values and each boss’s preferred spacing/gait are configurable in `boss-data.mjs`.

Phase 3's first wave warns for two seconds, then spawns exactly three helpers. Further waves are at least 12 seconds apart and wait until the previous helpers are defeated. Maximum: three waves, nine total helpers, three living helpers at once. Spawns choose zones away from the hero and have 1.2 seconds of spawn protection. Boss death cancels future waves and its projectiles, but surviving helpers remain dangerous.

Victory requires a dead boss, no living helpers and a living hero. It is atomic and idempotent: first victory gives 100 coins, subsequent victories 10; XP follows the table, next region unlocks, and only the first victory creates a chest. Simultaneous hero death prevents completion. Level-up HP refills and Power Points work during combat.

Death returns to the last checkpoint at full HP, applies the existing 10%-of-next-level-requirement penalty without losing levels or going below zero, and resets the entire attempt. Level 99 has no ordinary XP penalty. Same-session retreat/death retain XP earned from helpers, subject to the death penalty, and retain owned gear, coins, points and unused Roots. Retreat applies no XP penalty. Re-entry starts at full boss HP, Phase 1 and zero waves.

## Powers, healing and travel

The established nine-power implementation is unchanged. Flight gives boss attacks a 50% hit roll and makes helpers unable to hit; Fireball is the only offensive flight power. Steel Body reduces all damage and blocks knockback. Agility retains 75% regional-boss dodge; the reserved Legendary interaction stays 50%. Ground Roots halve grounded boss movement without disabling attacks, with squeezing ticks; airborne targets remain excluded. Whirlwind damages bosses without lifting them. Super Strength preserves 25%→100% boss effectiveness, with zero boss displacement. Fireball remains straight, non-burning and level-20 piercing. Super Kick retains equal-damage hits and retargeting without teleportation. Speed's existing caps stay intact.

Roots restore 25% maximum HP per use, have no cooldown and remain separate from equipment, capped at four. During an active boss attempt, all world-map travel, Tree access, checkpoint return, hero switching, gear changes, loadout changes and saving are blocked. The physical left exit remains available. Ordinary exploration keeps its five-second combat grace period.

## Chest rolls and persistence

Initial first-chest roll: 20–40 coins, 1–2 Roots, one equipment item with a 35% chance of a second. Each equipment item has a provisional 30% rare chance in Regions 4–7; Regions 1–3 can only give ordinary equipment. Root overflow cannot be carried; existing inventory is never deleted. Rematches neither reroll nor regenerate a claimed chest. An unopened chest remains available after leaving/reloading and after a later rematch.

Snapshot version 5 extends the existing three-slot browser-local envelope with per-region victory counts, stable rolled chest contents/claim status and an arena restore marker. Versions 1–4 migrate while preserving progress. Legacy victory flags are retained as completed records without inventing retroactive treasure. Invalid/future data and write conflicts remain protected.

**Closing during a battle restores its safe entry snapshot and starts the entire boss attempt again.** No partial boss HP, helper count or wave progress is saved. This also rolls back the unsaved helper XP and consumable use since entry. Same-session defeat/retreat preserve those earned/used resources as described above. A single snapshot is taken while still safe, just before entering. Completed victories and chest choices are saved once safely clear. The existing Phase 4 safe autosave remains unchanged; no continuous combat autosave or cloud/auth system was introduced. Manual saving remains restricted to safe states.

## Verification and phase boundary

Run from the repository root:

```sh
python3 royale/serve.py
node --test royale/tests/*.test.mjs
node royale/tests/compare-phase1.mjs
node royale/tests/verify-isolation.mjs
node royale/tests/verify-phase5.mjs
```

`royale/tests/phase5-browser.html` runs the boss/treasure/save/responsive matrix. `royale/tests/mobile.html` runs the Phase 1–4 browser regressions. `royale/tests/bosses.html` is the manual boss practice page. For phones on the same network use `python3 royale/serve.py --lan`, then the printed LAN address. No packages need installing.

See [PHASE5-VALIDATION.md](PHASE5-VALIDATION.md) for actual results and device/performance limits. Fireball-only strategies take much longer against late-region HP pools because its approved damage scales with ability level only; grounded basic attacks also scale with hero level. This disparity needs balancing review without changing approved power rules. Long-form boss difficulty, underleveled challenge runs and real device responsiveness need review. Phase 6, Legendary encounters/equipment, Villain Merge activation, accounts and cloud saving have not begun. `main`, Story, Versus and shared approved assets are untouched.
