HERO SHOWDOWN — BUSHMAN VERSUS UPDATE

READY TO UPLOAD
Built on the current main branch, commit 0bdfe555bef33a9d6a734d94a5741c8215d21b97.
This is an update for your existing game, not a standalone copy of the whole game.
Storm Rooftop, the public Story mode, and the existing ending video are preserved.

UPLOAD
1. Unzip this package.
2. Replace index.html and hero-showdown.html in the root of your existing game.
3. Add the entire assets/bushman folder under your existing assets folder.
4. Keep all the game's other files and folders.
5. Reload the published game after your upload finishes. Choose Versus, then BUSHMAN.

The tests folder and this README are optional for hosting. They do not affect gameplay.
Nothing has been uploaded to your GitHub repository or deployed by this update.

BUSHMAN'S ATTACKS
- Fire punch and flame kick: 14 damage, with damage timed to the contact pose.
- Hand-launched fireballs: 14 damage. They travel from the palm and can be blocked.
- Scorch: marks one location, throws fire there, and burns that fixed spot for 5.5 seconds.
  The patch deals 4 damage per successful burn tick. Move away or jump over it.
  A new ignition replaces the previous patch; fire never covers the whole board.
- Wildfire Blast: Bushman crosses his arms to charge, then releases a large flame cone.
  It deals 28 damage, exactly twice his regular hit.
- He must land FOUR distinct punches, kicks, or fireball hits before the blast unlocks.
  Misses, blocked hits, invulnerable targets, ground-fire ticks, and the blast itself
  do not charge the meter. Hitting two teammates with one swing earns one charge.
- Four glowing embers show when the blast is ready. Charge resets when it fires.
  Interrupting the charge before release preserves his earned hits.
- Blocking follows the game's existing directional guard rules and chip damage.
  Storm Rooftop's tornado continues to have its separate zero-damage block rule.

ANIMATION AND ARTWORK
20 whole-body poses: 8 movement/guard/defeat frames and 12 attack/reaction frames.
6 fire effects: two traveling fireballs, an impact, two ground fires, and the blast.
Movement frames advance with actual travel. Attack poses stay planted, face the target,
and share their timing with damage. Hit reactions, guard, and recovery interrupt poses.
Fire and animation freeze during pause and special cinematics. Round end clears hazards.

Final game assets, relative to the game root:
  assets/bushman/motion.webp
  assets/bushman/combat.webp
  assets/bushman/fire-fx.webp
  assets/bushman/portrait.webp

Artwork method: built-in image generation using the supplied Bushman character sheet.
Generated alpha was preserved in WebP. The portrait is cropped from the movement sheet.

Final production prompt set (condensed):
1. Movement: a polished transparent 4-column by 2-row game sprite atlas of the reference
   Bushman, a compact faceless charred-bark humanoid with branch claws, root feet,
   ember fissures and long flaming dreadlocks. Face left. Maintain the same character,
   scale and lighting across guard idle, relaxed idle, four distinct walking poses,
   forearm block, and kneeling defeat. Keep full bodies and room between cells.
2. Combat: transparent 4-column by 3-row full-body sprite atlas of the same Bushman,
   facing left. Punch windup, extended fire punch, punch recovery, kick chamber,
   extended fire kick, kick recovery, fireball gather, palm release, crossed-arm
   charge, stronger crossed-arm charge, crossed-arm blast release, and recoil.
   Refine the layout with clear separation, no clipped limbs or neighboring sprites,
   planted root feet, readable anatomy and consistent character identity.
3. Fire effects: transparent 3-column by 2-row atlas. Two left-traveling orange/gold
   fireballs with tails to the right, one radial fire impact, two low wide ground-fire
   frames, and a large cone of fire with its narrow source at the right expanding left.
   Detailed bright flame cores, translucent flame edges, no text or scenery.

VALIDATION
114 automated checks passed:
- 50 combat-rule, Story-switch, and tornado logic checks.
- 40 browser checks for Bushman, covering all three heroes, all five venues, attack
  timing, hit charging, blocking, jumping, interruptions, co-op state, round cleanup,
  desktop/mobile selection, Story access, and both HTML entry points.
- 24 existing Storm Rooftop browser regression checks.
No browser runtime errors were observed. Sprite placement was also visually reviewed.
Network state exchange was checked locally; a live remote two-device session was not run.

Run the included Bushman rule checks with Node:
  node --test tests/bushman.test.cjs
