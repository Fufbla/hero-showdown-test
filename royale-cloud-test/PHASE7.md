# Phase 7 — Legendary Bosses & Villain Merge

Phase 7 extends Phase 6 commit `7e19386f7e2d9b8fd3936bda755d27ae6a1dccc0` on `feature/showdown-royale`. Only `royale/` is changed. No Phase 8 work, main merge, account service or cloud saves.

## Play and review

Open the Royale entry page. Your normal browser-local heroes migrate without losing progression. At **Level 99**, Pause → **World Map** → **The Legendary Frontier**. Equip at least one learned normal active power first, so the encounter can disrupt exactly one eligible power. The usual five-second safety rule applies; entry is grounded and blocked during another encounter or pending reward. Recommended regional progression remains intact: visiting a Legendary arena never unlocks an ordinary region or moves its checkpoints.

For immediate review, open **Practice all eight Legendary bosses** on the hero-selection screen, or `royale/tests/legendary.html`. Choose a boss, loadout and screen size, create the isolated practice hero, then Continue. This gives a disposable Level-99 hero with a legal 98-point budget. Three different loadouts exercise all eight normal active powers plus passive Speed. Staging buttons deliberately change boss HP/helper states for review; these are not earned victories or unassisted combat tests. Practice data uses separate session-storage and IndexedDB namespaces, never real hero slots.

- Keyboard: existing movement, double-jump, basic attacks, Health Roots and slots 1–3 are preserved. **4** activates the earned fourth ability; default standard-controller button **8** does the same. Rebind these in Pause → Controls. The fourth touch button appears only for a complete equipped suit. Cooldowns darken buttons without numeric countdowns.
- The disrupted normal button shows a lock; it returns automatically at 50% boss HP. Slot 4, Speed, basic punches/kicks and Health Roots cannot be selected for disruption.
- Walk through the left exit to retreat. Death returns to the ordinary checkpoint; no partial victory is retained. Reentry starts full boss HP, phase 1 and fresh disruption/waves. Closing an active encounter reloads the saved entry with a fresh fight.
- Toggle **sound** in the top bar for eight original synthesized battle motifs. Audio starts muted. No voice lines or introduction/victory cinematics.

## Eight encounters

Every Legendary boss derives its HP from `BOSSES[7].hp × 3`: currently **42,000 × 3 = 126,000 HP**. It never regenerates during an encounter. Damage below is the base before an attack-specific multiplier, equipment, Steel Body, Flight or dodge checks. These are provisional balancing values, not three-times damage.

| Boss | Dedicated arena | Base damage | Distinct combat |
|---|---|---:|---|
| Lightning Spree | Storm Fortress | 220 | Single yellow lightning marker, crystal beams, chain effects and conductive ground |
| Air Pollution Monster | Toxic Sky | 205 | Airborne smoke movement, slow smog, moving clouds, gusts and tornadoes |
| Styrodog | Styrofoam Wasteland | 235 | Three-headed claw attacks, physical lunges, articulated sprite leaps and charges |
| Sonic Tusk | Echoing Caverns | 225 | Directional sonic shots, tusk strikes, charges and layered sound waves |
| Dr. Styro | Abandoned Laboratory | 210 | Bouncing foam, temporary damage-reducing barrier, marked traps and falling machinery |
| Wastelander | Toxic Ruins | 240 | Heavy punches, toxic shots, slams, paired shockwaves and ground hazards |
| Venomis | Poison Garden | 210 | Thorn volleys, vine strikes/sweeps, poison patches and marked vine fields |
| AtomDust | Atomic Core | 245 | Energy blasts, paired rings, radioactive debris and atomic shockwaves |

Phases are >50%, >20% and ≤20% HP. Later phases shorten attack spacing; major attacks keep warnings and recovery. Lightning normal strikes warn for 1.5 seconds (phase acceleration yields a minimum 1.38 seconds); stronger storms warn longer. Only one lightning ground marker exists at once. Conductive ground persists briefly after impact.

Only phase 3 can summon. Each wave has exactly three helpers, at most three waves/nine helpers. The first wave warns for 2.5 seconds; subsequent waves wait at least 14 simulation seconds and until the preceding helpers die. Helpers use 1,400 HP and 100 base damage, with villain-themed approved miniature sprites. They award XP only, with the ordinary Level-99 XP cap. They cannot drop coins, Roots or equipment and receive no night bonuses. Bosses are also unchanged by the day/night clock.

The boss and every living helper must be defeated while the hero survives. A boss dying with helpers alive does not unlock rewards. Victory starts the permanent transaction and pauses gameplay; the full suit screen opens only after durable completion. No ordinary-region first-clear chest or extra boss coin reward is fabricated for these Legendary encounters.

## Rewards and equipment

Each victory reserves all three unique pieces in one transaction: helmet, chest and boots. Preview the **actual customized hero** front/back, exact equipment bonuses, the new ability and existing gear before choosing. Unselected new pieces are permanently destroyed only after a strong confirmation. Full inventories show all owned items beside the three rewards. Equipped and unequipped items share seven total spaces; no item is silently removed. Roots remain separate.

Pause → Tree of Eris → **Villain Merge** shows earned/locked sets, owned counts, preview/comparison, complete-suit activation, mixed equipment selection and return to normal equipment. Only Eris allows equipping or changing Legendary pieces. Rewards do not auto-equip. Discarding a worn piece outside combat can remove a transformation immediately, but cannot activate a replacement. Legendary gear is never sold and never appears in ordinary loot, chests or shop catalogs.

Each piece has its own fixed colors and distinct villain-inspired costume motifs on the existing hero rig. Open headpieces retain the player's face and hairstyle. Helmet/chest/boots contribute 33%/33%/34% of the configured set stats; there is no second matching-set stat multiplier. Mixed suits add their own piece bonuses. Running (+60%) and attack-speed (+50%) caps include equipment. Constant green outlines follow the actual joints during idle, run, jump, Flight, combat and defeat, with fixed brightness and no gameplay effect.

### Fourth abilities — provisional balance

Only three matching, owned and equipped pieces unlock the protected fourth slot. Removing or mixing any required piece locks it immediately; all three normal powers remain. Cooldowns persist through saves and are exactly half their configurable normal values.

| Suit | Ability | Behavior | Normal → equipped cooldown |
|---|---|---|---|
| Lightning Spree | Lightning Strike | Delayed single area strike 220 units forward; 950 damage, 90-unit radius | 14 → **7 s** |
| Air Pollution Monster | Toxic Tornado | Moving vortex, 220 damage/second for 3 seconds, up to five targets; lifts regular enemies, never bosses | 24 → **12 s**, after effect |
| Styrodog | Beast Charge | Grounded 0.6-second physical charge, 1,050 damage once per enemy; normal collision and vulnerability | 16 → **8 s**, after effect |
| Sonic Tusk | Sonic Blast | Straight sonic projectile, 800 damage, pierces up to eight enemies | 12 → **6 s** |
| Dr. Styro | Styro Barrier | Absorbs 650 damage after ordinary reductions for up to 6 seconds; no healing | 24 → **12 s**, after expiry/break |
| Wastelander | Toxic Shockwave | Two opposite ground waves, 900 damage each; misses airborne targets | 18 → **9 s** |
| Venomis | Poison Vines | Five grounded targets, four 210-damage ticks; regular immobilization/boss half movement | 20 → **10 s**, after effect |
| AtomDust | Atomic Burst | Delayed radial burst, 1,250 damage once to each target within 240 units | 20 → **10 s** |

Flight still allows **Fireball only** as offense. Activating Flight ends offensive Merge effects; Styro Barrier remains usable defensively. Steel/Agility/Flight hit checks, Ground Roots boss slow, Whirlwind no-lift rule, Super Strength boss scaling, equal Super Kick hits and normal Fireball rules are reused.

## Permanent progress and storage

Snapshot v7 migrates versions 1–6. Each hero has its own permanent defeat records, exactly three reserved reward IDs per boss, ownership/claimed states, destroyed-item tombstones, equipped references, derived transformation and fourth-power recovery. Cleared arenas are accessible but contain only decorative anatomy-specific remains, no living boss, reward trigger, popup or rematch.

`legendary-ledger.mjs` uses a separate IndexedDB authority, `healthia.royale.permanent.v1`. Each irreversible event writes the **full safe snapshot and monotonic Legendary revision in one strict-durability read/write transaction**. A serialized compare-and-swap rejects stale competing tabs. It commits before updating the ordinary localStorage profile cache. Startup reconciles the authoritative record over stale manual saves, including a crash between these two writes. Reward claims and destruction of any owned Legendary piece use the same mechanism. Missing/corrupt authority records lock Legendary play rather than inventing ownership or respawning defeated bosses. Unsupported durable storage also blocks irreversible play; existing heroes without Legendary records remain playable.

No periodic Legendary autosave was added. The ordinary safe-save behavior remains; a boss entry captures a restart snapshot, and irreversible victory/claim/destruction events commit immediately. A failed write holds a blocking retry/reload screen and never exposes confirmed rewards. Closing before the transaction completes resumes the last successfully recorded state. After completion, a stale ordinary save cannot roll it back.

This is browser-local durability, not a server authority or anti-cheat service. Clearing **both** browser stores, manually editing the database, browser eviction, device failure, or restoring an entire older browser backup cannot be prevented locally. No cloud saving is claimed. Preserve browser site data; physical Safari/iPhone/Android storage behavior still requires device testing.

## Artwork and remaining review

All eight Legendary bosses reuse approved Healthia atlases without modifying source assets. In particular: Lightning Spree is the multicolored crystal design; Air Pollution has no legs; Styrodog has three heads; Sonic Tusk keeps its horns/tusks/speaker discs; Venomis is the red-haired scientist, not Thornbear; AtomDust retains its battery anatomy. The adapter imports atlas data, never Story/Versus motion controllers.

Villain Merge outfits are new rig-following costume geometry inspired by those designs and the supplied transformation UI reference; they are **not final hand-authored costume illustrations**. Decorative skeletal/crystal/foam/battery remains are new procedural artwork and require visual approval. No approved remains sprites were available. Existing regular Trash Monster and Ultimate Pollution Boss placeholders remain explicitly labeled from Phase 5. Battle music is original synthesized prototype audio rather than recorded production tracks.

Review long-fight difficulty, suit balance, audio mix and final costume/remains art. Physical iPhone, Android, tablets, controllers and non-Chromium browsers remain untested. See `PHASE7-VALIDATION.md` for measured performance and separate automated/manual evidence. Phase 8 has not begun.

## Local launch

From the repository root: `python3 -m http.server 4173`, then open `http://localhost:4173/royale/` (localhost is needed for durable browser storage). Use `royale/tests/legendary.html` for disposable practice, `phase7-browser.html` for responsive and persistence tests, and `node --test royale/tests/*.test.mjs` for the full engine suite. HTTP file hosting is required; opening `index.html` as a local file will not load ES modules correctly.
