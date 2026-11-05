# Phase 10 — technical quality review

Baseline: `42a3760deb46ce22d86d37509e0295d4b7859c0c`. Work is confined to `royale/` on `feature/showdown-royale`. Read [the initial audit](PHASE10-AUDIT.md) and [measured validation](PHASE10-VALIDATION.md). No Phase 11 or authentication deployment is included.

## Corrected behavior

- **Manual saving:** existing heroes no longer receive ordinary five-second, pause, visibility, portal, checkpoint, boss-entry or roster autosaves. Save Game records their exact safe location. Initial creation and confirmed economic/permanent transactions still save deliberately. The older regression fixtures now explicitly save when asserting persistence.
- **Hero deletion:** strict IndexedDB hero-ID tombstones precede local slot removal. Stale cache recovery removes only the deleted hero; reward commits to that ID are rejected. A failed durable deletion leaves the hero intact. If the tombstone succeeds but the cache write fails, the current slot is removed from memory and the UI requests reload to synchronize. New heroes receive new IDs.
- **Chest transaction failure:** chest collection now uses the existing transaction wrapper. A rejected durable save restores boss-chest state together with inventory, coins and Roots.
- **Projectile collisions:** scalar swept collision retains wall-before-hero priority and Level-20 Fireball piercing order. Bouncing shots use the actual struck floor height; side walls do not act like floors. This fixes elevated solid-surface bounces without changing damage, speed or cooldowns.
- **Input lifecycle:** listeners share an AbortController and can be disposed together. Destroyed handlers stop polling controllers. Held pointer checks and gamepad sets reuse state. The joystick has a bounded 76–106 px size option, with existing screen constraints and reset defaults.

## Performance work

Enemy/boss shots use a bounded 64-record pool; Fireballs use a 12-record pool. Existing regular-monster and Legendary emission limits remain. Expired lists compact in place; source references and hit sets clear on reuse. Region/arena changes return shots to pools. The existing 96-particle pool remains.

Nearest-wall scans avoid filter/map/sort allocations, and one hero hitbox is reused per projectile update. Bounded normalized Speed/equipment values avoid repeated hot-path normalization. Cosmetic equipped-outfit caching invalidates on inventory, piece or base-outfit changes. Offscreen projectiles are culled; unchanged canvas dimensions no longer reset the drawing surface. HUD text/attributes and Rest markup update only when changed, and power-button references are reused.

The Phase 9 bounded sprite/background caches and offscreen monster culling remain. The 24-enemy regular-board simulation remains deterministic; no approximate offscreen AI or new pathfinding was introduced. Fixed 1/60 simulation and bounded catch-up remain. Movement physics and body-independent collision/reach are unchanged.

QA modules load only for explicit isolated test sessions. The normal My Heroes screen no longer advertises fixture shortcuts. The benchmark suite reports frame FPS, 1% low, p95 frame interval, simulation/draw/HUD costs, ready time and optional JS heap. These are measurements, not a promise of 60 FPS.

## Audio

Seven original short synthesized region loops have distinct tempos, motifs and timbres; a separate regular-boss motif and the existing eight Legendary motifs remain distinct. Scene changes fade over 350 ms with at most two music players. Effects are bounded to 12 concurrent voices and disconnect when finished. Music continues in pause/Eris and stops when the page is hidden. Sound requires a user gesture.

Music defaults to 35%, effects to 65%, with independently persisted sliders in Pause → Keyboard, controller & touch settings. These lightweight loops are provisional arrangements, not full recorded soundtracks. Creative listening review and environmental ambience coverage remain open.

## Combat and progression review

No numerical combat, loot, XP, equipment-price or boss balance tables changed. [The reproducible balance report](qa/phase10/balance.json) gives all 21 monster values, nighttime damage, equal-level XP costs, ordinary-set punch bounds and all seven boss HP/damage values. Its uninterrupted-hit estimates are analytical lower bounds, not unassisted clear times. They exclude travel, missed hits, evasion, helpers and specials; long-session human balance testing is still needed.

All seven regular regions remain freely accessible. Ground plus four elevated tiers and all 84 required ascent segments remain. All 21 regular species retain aggression at/below half HP, no threshold pushback/damage bonus, and intentional Roots/Whirlwind control. Bosses retain their independent phase logic.

Nine powers retain L1/intermediate/L20 rules. Regional and Legendary encounters retain phase thresholds, finite waves, XP-only helpers, complete-clear victories and rewards. The final regional boss remains 42,000 HP; every Legendary remains 126,000 HP. Complete/mixed Merge sets, protected fourth abilities, half cooldown and permanent loss rules remain.

## Review workflow

1. Launch with `python3 royale/serve.py` or use the deployed playtest. Create/continue a normal local hero.
2. Pause → World map to visit Regions 1–7 without boss wins. Climb using Jump/Double Jump; Down + Jump descends.
3. Pause → Tree of Eris for powers, outfit purchases/equipping/resale, paid appearance, Roots and Merge. Return preserves the exact previous location.
4. Pause → Save Game, then reopen to verify the saved location. Use disposable review fixtures for deliberate deletion, crash recovery and Legendary loss tests.
5. Open [the Phase 10 review page](tests/phase10-browser.html) to run integration checks or desktop/phone-sized performance matrices. [Boss](tests/bosses.html), [Legendary](tests/legendary.html), [power](tests/powers.html), [world](tests/world.html) and [Eris](tests/eris.html) labs provide controlled late-game access without real-save cheats.

The seven-region world lab supplies day/night transition fixtures. Normal Regions 1–2 stay daytime, and Regions 3–7 retain the 30/10-minute persistent clock. Backend authority and cross-device synchronization remain unconfigured.

## Limits

Cloud deployment/providers are not operationally verified and were not rebuilt. Browser-local durable storage is not server authority. Clearing browser data, restoring a complete old browser backup or malicious client modification remains outside its guarantees. Missing/corrupt authority records block irreversible Legendary play.

Artwork placeholders remain: Trash Monster, Ultimate Pollution Boss, eight adaptive Merge motifs pending missing canonical references, and decorative skeletons. Approved existing villain sheets are unchanged. Physical mobile/controllers, Safari/Firefox, long-session balance and sustained performance remain separate validation work. This is a review build, not a release-ready claim.
