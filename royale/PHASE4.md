# Hero Showdown Royale — Phase 4

Built on `cbc57946a39228b9d3866f71f9da86e6a0e8143c`, exclusively inside `royale/` on `feature/showdown-royale`. Phase 3's nine powers, irreversible upgrades, cooldowns, Flight rules, body-independent hitboxes, character creator and three local hero slots remain in use.

## Play and review

Open the existing private playtest: **https://healthia-showdown-royale-phase1.gladcreek512.chatgpt.site**. Site access uses ChatGPT sign-in; hero saves remain local to the browser, with no game account or cloud save system. The same origin is retained for existing saves.

In normal play, use Pause for **World map**, **Equipment**, or **Tree of Eris**. Five seconds without attacking or taking damage are required for saving, travel, upgrades, equipment changes and hero switching. An active offensive effect/projectile or boss encounter also blocks safety. Pausing freezes combat recovery; resume gameplay to finish the five seconds. The world clock continues regardless.

**Normal forward progression remains gated by boss victories.** There are no completed boss battles in Phase 4, so a normal hero cannot unlock Region 2 yet. All seven regions and their regular enemies are implemented. Their arenas and gates display the intended boss name and clearly say that encounters arrive in Phase 5.

Choose **Explore all seven regions** from character selection to open `tests/world.html`. This separate practice world uses a disposable session namespace, a region-level hero, sample powers, 200 coins and three Health Roots. Its pre-unlocked regions are test fixtures, not earned victories, and never overwrite saved heroes. Choose a region, start at camp/the monster trail/the arena entrance, then press **Load practice region**. The full-inventory demo opens an unclaimed reward against seven carried items.

Local launch from the repository root:

```sh
python3 royale/serve.py
# Open http://localhost:8000/royale/
```

For a physical phone/tablet on the same Wi-Fi, run `python3 royale/serve.py --lan` and open the printed LAN URL. Existing macOS/Windows launcher files remain available. Keyboard defaults: A/D or arrows move, Shift runs, Space/W/Up jumps twice, J/Z punches, K/X kicks, 1/2/3 powers, H uses a Health Root, E rests/uses a passage, T visits a nearby Tree, P/Esc pauses. The Tree is also remotely accessible from Pause and preserves the exact previous location. Controller Health Root defaults to standard button 11; all controls remain remappable.

## World and monsters

Each region spans three connected boards with a traversable lower route, optional raised platforms, three camps, visible direction signs, backward passage, named arena entrance and forward boss seal. The coastline geometry and artwork are retained; later regions add their own palette, skyline, platform arrangement and original comic-ink monster silhouettes. Up to 17 enemies exist in the current region and at most 32 enemy projectiles are active. Other regions are not simulated.

| Region / levels | Boards | Regular monsters (level; HP / damage; XP) | Prepared boss entrance |
|---|---|---|---|
| Coastal Beginnings · 1–10 | Sunwash Strand, Driftwood Rise, Lighthouse Point | Bottle Critter (1; 34/5; 14), Trash Slime (4; 48/6; 20), Sand Crawler (8; 60/7; 26) | Trash Monster |
| Polluted Forest · 11–20 | Briar Approach, Sporewood Canopy, Hollow Clearing | Thorn Sprout (11; 120/10; 90), Toxic Mushroom (15; 180/14; 125), Bark Crawler (20; 250/18; 175) | Bushman |
| Industrial Wasteland · 21–35 | Scrapline Yard, Furnace Walk, Foundry Threshold | Scrap Crawler (21; 300/20; 200), Sludge Beast (28; 420/28; 280), Rust Drone (35; 550/35; 360) | Wastelander |
| Toxic Underground · 36–50 | Violet Descent, Acid Galleries, Scorpion Vault | Cave Scorpion (36; 650/40; 410), Acid Beetle (43; 820/50; 520), Venom Crawler (50; 1,000/60; 650) | Giant Scorpion |
| Mutated Territories · 51–65 | Overgrowth Verge, Twisted Wilds, Venomis Approach | Thorn Beast (51; 1,200/65; 720), Mutant Stalker (58; 1,550/78; 880), Poison Spitter (65; 1,900/90; 1,040) | Venomis |
| Dark Energy Realm · 66–80 | Fractured Horizon, Echo Causeway, AtomDust Seal | Shadow Wisp (66; 2,200/100; 1,160), Energy Phantom (73; 2,850/120; 1,400), Dark Sentinel (80; 3,500/140; 1,650) | AtomDust |
| Final Showdown · 81–99 | Last City Outskirts, Broken Boulevard, Final Gate | Apocalypse Mutant (81; 4,000/150; 1,800), Corrupted Guardian (90; 5,500/185; 2,250), Pollution Titan (99; 7,000/220; 2,800) | Ultimate Pollution Boss |

Bottle Critters and Trash Slimes remain peaceful through hero Level 3 unless attacked. The crawler is aggressive from the beginning. Later enemies have larger pursuit ranges, shorter warning/recovery times, lunges, hopping/pouncing attacks, slams/stings, or ranged spores, bolts, acid, spit, orbs and volleys. Rust Drones, Shadow Wisps and Energy Phantoms fly; Ground Roots cannot affect them. Projectiles use swept collisions against the hero and solid terrain, respect defensive powers and cannot hit through walls. Health bars stay above enemies; no damage numbers are drawn.

Common respawns: **18 seconds**; strong: **36 seconds**; elite Sentinels/Titans: **150 seconds**. Dead enemies also become eligible to respawn when their board is revisited; leaving and returning to a region repopulates it. Spawns defer while the hero is within 160 horizontal and vertical units. Spawn points are moved away from camps, and regular attacks cannot damage a hero inside the camp's 180×100 half-extent safe area. Boss encounters disable that sanctuary rule.

## XP, HP and defeat

Level 1 starts with 100 maximum HP and zero Power Points. Every level gained immediately grants one permanent Power Point and 15 maximum HP and fills health, including during a future boss encounter. Level 99 has **1,570 HP** and **98 lifetime earned Power Points**. Existing levels and spent points are retained.

The configurable next-level XP formula in `progression.mjs` uses `n = level − 1`:

```text
round((50 + 28n + 4n²) × (1 + 3 × (max(0, level − 69) / 29)²))
```

| Current hero level | XP required for the next level |
|---:|---:|
| 1 | 50 |
| 10 | 626 |
| 20 | 2,026 |
| 35 | 5,626 |
| 50 | 11,026 |
| 65 | 18,226 |
| 80 | 38,978 |
| 90 | 88,068 |
| 98 | 161,608 |

| Hero levels above the monster | XP multiplier |
|---:|---:|
| 3 or fewer (including higher-level enemies) | 100% |
| 4–6 | 75% |
| 7–10 | 35% |
| 11–15 | 10% |
| 16+ | 0% |

XP rewards round down to whole XP and never become negative. Coins and loot probabilities do not change with the XP multiplier. Level 99 stores zero ordinary level XP.

Defeat deducts `floor(10% × next-level cost)`, clamped to the current XP balance. It cannot remove a level, coins, equipment, ability levels, points or Health Roots. It is applied once per defeat, and does not apply at Level 99. Respawn restores full HP at the last activated checkpoint, even if it was in another unlocked region. Safely returning to a checkpoint through Pause is not a defeat and has no penalty.

To keep basic attacks usable against later-region HP, their provisional damage is the existing 13 punch / 19 kick, plus `3 × (hero level − 1)`, equipped damage, and half equipped strength. Body appearance never changes this calculation. Speed changes timing, not damage. Every special power's Phase 3 damage formula, target tier and cooldown remains unchanged.

## Coins, Health Roots and equipment

Regular kills automatically award **one coin by day / two at night**. The future boss reward adapter records a separate first-victory flag per region in each hero save: **100 coins first / 10 repeat**, unlocking only the next region. It is not wired to a fake victory button or completed encounter.

Each regular kill independently rolls **10%** for one Health Root. Carry at most four; each restores **25% of maximum HP**, with no cooldown, including in combat. Full-health use does not waste a Root. Death keeps unused Roots. At the Tree, each costs **50 coins**, subject to coins and capacity. Roots use no equipment inventory space. Future boss-summoned enemies use the `summoned` flag and award XP only: no coins, Roots or equipment.

Equipment has seven cosmetic part types: mask, suit, gauntlets, boots, belt, cape and emblem. There are **seven carried item spaces total**, shared by equipped and unequipped items. At most one item per part can be worn. There is no storage expansion or shop selling. The starter outfit does not consume a carried space and returns underneath unequipped pieces.

Every regular monster has a provisional **12% ordinary equipment chance**. An exclusive equipment rarity roll adds rare odds of 0/0/0/7/8/9/10% in Regions 1–7. A kill produces at most one equipment item. The part is chosen uniformly from seven types; the Root roll is independent. Bonuses are fixed by region/part/rarity in `equipment.mjs`: strength, damage and small attack-speed bonuses. The combined Speed/equipment attack-speed increase remains capped at 50%.

All obtained equipment has fixed catalog colors. Changing starter colors never recolors gear. Ordinary pieces have no glow. Rare pieces use a constant white outline/glow attached to the same animated rig; the glow is drawn separately from the hit-flash opacity. Green Legendary glow is a reserved rendering constant only; no Legendary items or full Villain Merge system are obtainable.

When all seven spaces are occupied, the drop stays **unclaimed** in a reward-selection panel. Compare it with carried gear, then explicitly confirm a replacement or confirm discarding the new reward. Pending rewards cannot be equipped or treated as an eighth item; gameplay waits for the selection to finish. Replacing worn gear unequips that old piece. Every ordinary inventory discard also requires confirmation. Nothing discarded can be recovered; no sell or recovery system is implied.

## Persistent day and night

Regions 1–2 are permanent daytime. Regions 3–7 use a saved real-time reference and `Date.now()`:

- Day: **30 real minutes**.
- Night: **10 real minutes**.
- Repeat: **40 minutes**, including time paused, at the Tree, or with the browser closed.
- Transitions are instantaneous. There is no sunrise/sunset animation.
- Night doubles regular enemy attack damage, awards two coins and gives bright yellow eyes. Maximum HP, XP and drop chances remain unchanged. Bosses ignore nighttime bonuses.
- A compact phase/countdown appears only in Regions 3–7. Paths keep bright edges and signs at night.

In **Explore all seven regions**, select Region 3–7, choose **Night**, **Night starts in 5 seconds**, or **Day starts in 5 seconds**, then load. Pause or visit the Tree and watch the countdown continue. The five-second transition choices change only the practice fixture's clock reference; normal cycle durations are never accelerated. Reload a practice game's iframe from its own browser context to check the saved reference, or use the automated real-time persistence tests. Real saves retain their clock when reopened. Device system-clock changes affect this offline clock; there is no authoritative server clock yet.

## Saves and compatibility

The existing `healthia.royale.profiles.v2` three-slot envelope and legacy key remain. Game snapshots now use **version 4** and accept versions 1–3. Migration retains numeric XP, level, coins, appearance, checkpoints, kills, permanent power levels and cooldown recovery. New fields default to Region 1, no Roots/equipment and a clock starting at migration. Existing saves are not reset to Level 1. The original Phase 1 key remains an untouched backup.

Version 4 adds health/location, current region, activated checkpoints, sequential region unlocks, boss-victory history, board visits, species kill counts, current-region enemy HP/respawn timers, clock reference, Roots and equipment (including pending rewards). Unearned regions and malformed inventories/snapshots fail validation without overwriting the stored record. Dead enemies restore with their remaining respawn timer; transient AI attacks restart as patrols. Power effect recovery retains Phase 3's anti-reset behavior.

Saving is attempted periodically, on safe menu changes/checkpoints, and on hiding/closing the page, **only when safe**. Closing during combat returns to the last safe save; there is no combat save bypass. Browser-local save state remains editable by its owner and is not a multiplayer anti-cheat or authentication system.

## Provisional values and phase boundary

XP coefficients and low-level cutoffs; monster damage/HP/XP, movement, warning/recovery, ranks and respawn timers; the 12% ordinary drop chance; uniform part selection; equipment stat formulas; basic attack level scaling; and camp/respawn distances are initial balance choices requiring longer playtests. Phase 3's 30-second post-Flight cooldown remains unchanged and provisional. Required Root prices/rates, rare drop odds, coin rewards and clock durations match the specification.

Phase 5 remains unstarted: no completed regional bosses, boss arenas with encounters, boss summons, actual Legendary/Villain Merge drops or fourth-slot activation. No accounts, cloud saves, additional Tree services, multiplayer or world-map bypass of boss gates. Physical iPhone/Android/tablet/controller and cross-browser performance testing remain separate from automated browser checks. See `PHASE4-VALIDATION.md` for measured results and limits.
