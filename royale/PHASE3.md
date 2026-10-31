# Hero Showdown Royale — Phase 3 review guide

Developed from Phase 2 commit `6c81ad47dd7dc36176d2754d82c79d7597b75da8` on `feature/showdown-royale`. All Phase 3 changes are inside `royale/`.

## Play and upgrade

Private playtest: https://healthia-showdown-royale-phase1.gladcreek512.chatgpt.site/

Continue an existing hero or create one through the three-slot character selector. Earn XP from Coastal Beginnings monsters. Each level gained gives **one permanent Power Point**. Level 1 starts with zero; level 99 has earned 98 total. Existing Phase 1/2 heroes receive their previously earned points on migration.

The **Tree of Eris** is just to the right of Shore camp, at the beginning of the beach. Walk beside it and press **T**, tap its on-screen button, or use **Pause → Visit the Tree of Eris**. Select any of the nine powers, choose a quantity, inspect the before/after table, then review and confirm the permanent purchase. Each ability level costs one point. Cancellation keeps the points. There is no redistribution or respec. No ability exceeds level 20.

In **Pause → Your superpowers**, equip up to three learned active powers. Selecting an already-equipped power swaps the two slots. Speed is always passive and never appears in the slot selectors. Upgrades and loadout changes are blocked during combat. Unspent points earned during combat are credited immediately.

For quick review without grinding, open `royale/tests/powers.html` (**Combat lab**) on the same host. Select levels 1, 5, 10, 15 or 20, choose any three powers, toggle Speed, and reset the arena. Try regular monsters, a Legendary Boss fixture or airborne fixtures, and short/slender or tall/full heroes. This lab never reads or writes your saved heroes. Its boss and airborne fixtures are testing tools, not new region content.

## Implemented powers

The tier used below is 1 at ability levels 1–4, 2 at 5–9, 3 at 10–14, 4 at 15–19 and 5 at 20. Cooldowns run in simulation seconds, pause with the game, and are independent of attack speed.

| Power | Implemented behavior | Cooldown |
| --- | --- | --- |
| Super Strength | One forward punch, 1/2/3/4/5 targets by tier. Damage scales with ability level, hero strength and equipment stat inputs. Boss effectiveness increases linearly from 25% at level 1 to 100% at 20. Yellow arm/fist electricity intensifies with level and causes no additional damage. | 8 seconds from activation |
| Super Kick | 2/3/4/5/6 kicks by tier. Every landed kick deals the same calculated damage. Keeps its target while alive and in reach, then selects the nearest eligible target. Each kick hits at most one enemy. No hero teleport, glow or electrical effect. Uses the articulated kicking rig with alternating guard positions. | 6 seconds after the combination finishes |
| Fireball | 1 shot at levels 1–9, 2 at 10–19, 3 at 20. Shots travel straight in the activation direction without homing. Below 20, each ends at its first enemy; at 20, it hits two enemies for 100%, then 50%. Solid terrain blocks shots; one-way platforms do not. No burn/DoT. | 5 seconds from activation, including in Flight |
| Flight | Ground-only launch; duration 3 seconds at level 1, +1 per upgrade, 22 at 20. Steer horizontally and vertically. Press again to cancel. Gravity resumes immediately. Regular attacks cannot hit the hero; each valid boss attack has a 50% hit chance. Basic attacks and other offensive powers are disabled; existing Roots/Whirlwind end on takeoff. Fireball remains available. | **30 seconds after ending or cancelling** |
| Steel Body | Metallic rendition of the same customized hero. All incoming damage is reduced. Complete knockback immunity, with normal movement, jump/double-jump and attacks. Reduction/duration interpolate through 20%/3s at 1, 30%/4s at 5, 45%/5s at 10, 60%/6s at 15 and 75%/8s at 20. | 15 seconds after the transformation ends |
| Ground Roots | 1/2/3/4/5 targets for 2/3/4/5/6 seconds by tier. Regular grounded enemies cannot move or attack. Bosses continue attacking and move at half speed. Squeezing damage occurs once per second. Flying and airborne targets are excluded. | 10 seconds after release |
| Agility | Automatic independent dodge roll for each otherwise-valid incoming attack: 75% regular, 50% Legendary Boss. Duration increases linearly from 5 to 15 seconds. No movement/attack restrictions and no manual dodge button. | 10 seconds after expiry |
| Speed | Permanent passive: running bonus scales linearly from +5% to +60%; attack-speed bonus from +3% to +50%. Total attack-speed bonus, including equipment, is capped at 50%. Speeds melee animations and Super Kick cadence, not damage or cooldown clocks. Walking and jump height are unchanged. | None; no active slot |
| Whirlwind | 1/2/3/4/5 targets for 2/3/4/5/6 seconds. Regular enemies converge into a visible tornado, lift, spin and take damage once per second. Bosses take damage but remain free to move and attack. Released monsters fall under gravity and land on surfaces. Rooted regular enemies remain in their roots until released. | 12 seconds after the tornado ends |

Flight and Agility can combine: a Legendary Boss attack must pass Flight's 50% hit roll and then Agility's 50% dodge roll (25% combined hit chance). Ordinary boss fixtures without the Legendary flag use Agility's 75% dodge rate; the design only assigns the lower rate to Legendary Bosses. Spawn and post-hit invulnerability are checked before any random roll.

Basic punch/kick remain available on the ground and in the air, with their existing startup/contact/recovery and no separate cooldown or resource cost. Other than Flight's specified restrictions, abilities do not remove aerial steering. No mana, energy, stamina, dash, floating damage numbers or permanent minimap has been added.

## Provisional balance values

These are centralized in `powers.mjs`, not final endgame balance:

- Natural strength: `10 + 2 × (hero level − 1)`. Effective strength adds the equipment-strength input.
- Super Strength damage: `45 + 8 × (ability level − 1) + 2 × effective strength + equipment damage`.
- Super Kick damage per kick: `16 + 2 × (ability level − 1) + 0.5 × effective strength + equipment damage`.
- Fireball damage per projectile: `24 + 5 × (ability level − 1)`. Speed 520 world units/second, lifetime 1.6 seconds, burst spacing 0.12 seconds.
- Roots damage per tick: `6 + 2 × (ability level − 1)`. Whirlwind: `10 + 3 × (ability level − 1)`. First tick occurs after one full second; the last tick occurs at expiry.
- Roots/Whirlwind acquisition: within 260 horizontal units and less than 120 vertical units, nearest first. Tier target count is fixed at activation; no automatic new targets during the effect.
- Flight moves vertically at up to 250 units/second, with a short takeoff lift and an upper world boundary. Its 30-second post-flight cooldown ensures even a level-20 flight has a substantial vulnerable interval.
- Combat safety uses a four-second grace period after dealing/receiving attacks, active offensive effects/projectiles, and nearby enemies inside their aggression leash. Moving out of range does not immediately clear the grace timer.
- XP thresholds retain `50 + 30 × (hero level − 1)` for now. Coastal Beginnings remains a beginner region; the full 99-level XP curve needs later regional balance review.

Hero maximum health is exactly `100 + 15 × (level − 1)`, reaching 1,570 at level 99. Every level-up immediately heals to this maximum. Preview tables show calculated stats for the current hero and equipment inputs (fractional values displayed to four decimal places). Collision remains 34 × 88 for all body builds; punch/Strength reach is 59, kick/Super Kick reach is 76. Body customization never changes damage, defenses, mobility or reach.

## Controls and HUD

Defaults: **1 / 2 / 3** activate the three slots; **T** opens the nearby Tree; **W / up / Space** ascends during Flight; **S / down** descends. Existing A/D, arrows, Shift, Space, J/Z, K/X, E, P/Escape controls remain. On touch screens, drag the stick in two dimensions to steer Flight; the Jump button also ascends while held.

Three power buttons show their names and darken during recovery, without numerical countdowns. Active effects have a lit border. Health and XP remain visible above all gameplay menus. Menus hide the gameplay control footer to create more room on small screens.

**Pause → Keyboard, controller & touch settings** supports keyboard rebinding, per-action standard Gamepad API button assignment, and bounded mobile button size, stick/action offsets and vertical position. Escape remains an emergency menu/back key. Duplicate controller assignments swap; keyboard binding conflicts are reported. Settings are stored separately under `healthia.royale.controls.v1`. Touch dimensions are constrained by viewport width to keep controls reachable and clear of vitals.

Standard-controller defaults: left stick moves/steers Flight; A/button 0 jumps, X/2 punches, B/1 kicks, Y/3 rests; LB/4, RB/5 and RT/7 activate slots; LT/6 runs; Start/9 pauses/resumes; L3/10 opens the nearby Tree. D-pad also moves and steers. Non-standard gamepad layouts need a future mapping adapter. Physical controller behavior still needs hardware testing.

## Saving and extension points

Game snapshots are now version 3. The existing three-slot profile envelope/key stays version 2, retaining IDs, names, appearance, timestamps, XP, coins and checkpoints. Valid version-1/2 snapshots migrate automatically and receive `hero level − 1` unspent points. A version-3 ledger derives remaining points from earned levels minus permanent upgrades; overspent or malformed ledgers are rejected, not silently refunded or redistributed. The legacy backup key remains untouched.

Cooldowns persist across saves and hero switching. Reloading ends transient attacks/buffs/projectiles and retains their remaining active time plus full recovery as a cooldown. This prevents reloading to restore an invulnerability buff or skip recovery. Respawning cancels effects and starts their recovery without resetting existing cooldowns. Unequipping an active defensive power ends it and starts its full cooldown; swapping its slot preserves the active effect. No wall-clock/offline recharge or cloud save is claimed.

`resolveAbilitySlots()` accepts an optional future equipment entitlement for a fourth slot, only for a complete three-piece suit, with a 0.5 cooldown multiplier. Phase 3 supplies no such entitlement and exposes only three slots. The adapter is tested; no Villain Merge suit, inventory, unlock, or fourth-slot UI is implemented. `equipmentStats()` is likewise a bounded future stat input, not an equipment acquisition system.

## Verification and deferred scope

Run `node --test royale/tests/*.test.mjs`, then `node royale/tests/compare-phase1.mjs` and `node royale/tests/verify-isolation.mjs`. Open `royale/tests/mobile.html` to run input, creator/save and power/upgrade browser checks at five sizes. Each run uses disposable session-storage namespaces. Synthetic pointers and controller fixtures do not constitute physical-device testing.

See `PHASE3-VALIDATION.md` for completed results, browser review and measured performance. In the combat lab, **Measure 30 seconds** reports actual rendered-frame FPS, mean/max draw time and p95 frame interval in that browser. A fixed 60 Hz simulation step is not proof of sustained 60 FPS rendering.

Actual regional boss encounters, equipment acquisition, full Villain Merge, other Tree features, additional regions and account/cloud services remain deferred. Phase 4 has not begun. Physical iPhone/Android/tablet/controller tests, broader Safari/Firefox runs, long-session behavior and final balancing remain review work.
