# Power Armor integration review

Base: `b331004c1b90f30cc5e5be4235219fa7e57420fc`.
Integration branch: `feature/royale-power-armor-integration`.

## Source inspection

The remote Power Armor head matched the approved Batch 9 commit. Creature integration
`67c885e14cb8a41bb55772802d3849d498ea3913` and approved Style C heroes
`dad657dfa04b2b3ac7a3b8612fa728621cad7c4b` are already ancestors. The mobile repair
`eebe04a7d862fef40620822a0707e20fca4307fa` is included. No later gameplay or audio work
was found on accessible remote branches. Main, Story, Versus and other branch refs
are not updated by this integration.

## Review entry

Open `royale/armor-review.html`. All nine collections expose nine tiers, approved
front/rear/profile artwork, both presentations, four builds, hairstyles, face shapes,
skin color, cape visibility, all existing animation previews, and a 1× renderer view.
The stat comparison uses learned level 20 and review hero level 99, including
Fireball's existing individual-piece damage bonuses. Speed keeps its existing caps.

Play this suit launches an equipped trial. Try buying this suit launches the ordinary
Tree of Eris shop with only the exact suit price and no owned equipment. Both use a
new `armor-review-<random ID>` session. `reviewProfile` only constructs data; the review
page writes it to `sessionStorage` under `royale-test-<session>:`. The ordinary app
uses that same namespace, including its separate permanent Villain Merge ledger.
Real local hero slots, coins, upgrades and ownership are never awarded trial items.
The regular-heroes link exits review mode. Trial saves are session-only.

No existing game implementation or artwork is changed. The existing costume catalog
already integrates all 81 suits and 243 pieces into Eris. This branch adds a coherent
review entry and cross-collection regressions rather than modifying combat.

## Verification

- Clean baseline: 1,142 tests passed, zero failures.
- Integration suite: 1,155 tests passed, zero failures (13 new cross-collection checks).
- Browser shop trial: all nine categories visible; Firmament complete purchase deducted
  exactly 40,000 coins and changed inventory from 0/7 to 3/7 in an isolated session.
- Catalog: nine collections, 81 sets, 243 unique persistent piece IDs, tiers 10–90.
- Every set: whole and individual purchase, level gate, exact total coin cost, equip,
  effective level 21–29, mixed-tier rejection, removal, cooldown retention, resale,
  validation and save/reload. All 324 review fixture combinations validate.
- Existing suite covers inventory capacity seven, coin/XP rules, permanent upgrades,
  Villain Merge, passive Speed caps, active restrictions and regional progression.
- Creature raster suite: all 36 creatures, 9,288 checks passed.
- All 81 suits rendered across two presentations, four builds and 25 existing poses:
  16,200 no-exception checks. These do not prove zero clipping in every possible
  customization and time sample. Existing artwork remains approved and unchanged.
- Flight touch replay: seven checks passed for simultaneous Flight activation, third-finger
  attacks, Fireball, joystick cancellation, stable scale, manual end and natural landing.
- Chrome synthetic pointer replays passed all 17 checks at 390×844 and 844×390:
  rapid Punch/Kick/Jump, multitouch, stick drag outside bounds, capture loss,
  selection/context/drag/double-tap guards, compatibility click suppression,
  viewport/scroll/canvas stability, focus recovery, menus and portal travel.

## Performance and limits

Ten-second cloud Chrome samples with equipped production rendering and live combat:

| Viewport | Scene | Mean FPS | p95 frame ms | Mean draw ms |
|---|---|---:|---:|---:|
| 1280×800 | Monsters | 13.19 | 83.3 | 4.02 |
| 1280×800 | Effects | 2.93 | 1033.2 | 5.82 |
| 1280×800 | Legendary | 30.12 | 50.0 | 1.20 |
| 390×844 | Monsters | 23.08 | 50.0 | 2.18 |
| 390×844 | Effects | 17.76 | 50.1 | 1.81 |
| 390×844 | Legendary | 30.21 | 50.0 | 0.98 |

Frame pacing is uneven and does not establish a smooth 60 FPS target. These samples
use one fixed simulation step per callback, rotate Level-90 suits and measure the
cloud browser's requestAnimationFrame scheduling; they are not physical-device
benchmarks. JS heap was approximately 55–57 MB; this excludes total graphics memory.
Material lookup used a warm cache (0–0.2 ms), not a cold network download measurement.
The CPU-only benchmark runs 6,000 steps per sample, seven interleaved repetitions:
current medians ranged 5–107 ms across six scenarios. Gameplay code is byte-identical
to the approved baseline; no performance or combat rebalance was attempted.

No physical iPhone/Safari or Android/Chrome device was available. Browser-native
reserved gestures remain outside the game's control. Cloud authentication is disabled
in the existing playable build; review and regular local saves work independently.
Native Canvas galleries/gameplay frames are actual production renderer output,
not generated replacement artwork. Back galleries hide capes only for inspection.
Final merge awaits user approval.
