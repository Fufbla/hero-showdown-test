# Ten costumes and universal face-only hoods

Status: implementation review; not deployed. The costume designs were approved,
but approval of these finished sprite frames is still required before publishing
to V3 staging. This work is isolated to `codex/face-only-costumes-review`, based on
`bba835f089f2664fd9605b4a8c44309fcad6178e`.

## Review files

- [All ten costumes on the same personalized hero](review/ten-costumes.png)
- [Actual running, jumping, double-jumping, punching, kicking, flight and Steel Body playback](review/costume-animation-review.mp4)
- [Hood on / costume removed, with original hair restored](review/hair-visibility.png)
- Individual complete sprite-sheet previews: `review/*-sprites.png`.
- Interactive review: `royale-v3-staging/costumes/review.html` served from the
  repository root. It supports both facing directions, saved face variations,
  hairstyles, skin tones, facial hair and removing/restoring the costume.

| Outfit | Hair under costume | Price | Authored poses |
|---|---|---:|---:|
| Dolphin Costume | Hidden | 700 | 48 |
| Pink Shark Costume | Hidden | 700 | 48 |
| Hamburger Costume | Hidden | 700 | 48 |
| Stuffed Animal Costume | Hidden | 700 | 48 |
| Zombie Costume | Preserved | 700 | 48 |
| Reaper Costume | Hidden | 700 | 48 |
| I Love Fishsticks Costume | Hidden | 700 | 48 |
| Pizza Slice Costume | Hidden | 700 | 48 |
| Black Business Suit | Preserved | 700 | 48 |
| White Business Suit | Preserved | 700 | 48 |

## Implementation

Each outfit is one complete, authored full-body atlas. The existing
`FullBodyAnimator` chooses the pose. There are no new limb rigs, independent
clothing physics, weapons, collision changes or gameplay stat adjustments.
Each atlas has 48 distinct poses, mapped to 20 existing renderer states. Complete
poses are mirrored for left-facing play; they are not separate hairstyle variants.

The existing customized face is composited inside an authored opening. Hooded
costumes never call the hair painter. Zombie and business suits use the saved
full head. Skin material on exposed hands follows the saved skin tone. Hair
visibility is derived from the equipped costume and is never written into the
saved hairstyle. Fishstick shirt lettering is a fixed material on each composed
pose and remains readable when facing left.

Steel Body selects the existing complete metallic animation atlas and suppresses
the costume, face and hair. When it ends, the same equipped costume is drawn.
Costumes take priority over the older V2 test sprites and armor artwork; armor
inventory and bonuses remain untouched. Online snapshot animation owners are
kept outside saved data, separately for every peer, so a packet cannot restart
another player's running animation.

The Tree of Eris catalog retains the existing 36 offers and adds ten complete
outfits. The earlier 12 approved test-wardrobe outfits are also retained. New
ownership and equipped IDs use the existing cosmetic transaction and save
schema. The server-side policy includes the same new IDs, prices and complete-set
rules. Duplicate purchases, stale revisions and removal of existing ownership
remain rejected.

The public code `0000000000` is a browser-local development shortcut in the
existing application, not a Supabase cloud profile. Its store transactions now
use an explicit local save acknowledgement and say that they saved on this
browser. Real V3 profiles still require their existing cloud acknowledgement.

## Verification completed

114 automated checks passed locally (rerun on November 12, 2026):

- 9 costume checks covering all 480 frames, padded complete poses, distinct
  motion, every supported hair class under hoods, customized faces, skin and
  facial hair, 700-coin purchases, duplicate/stale-write rejection, save decoding,
  cloud save policy, independent network owners and co-op save packets.
- All seven hooded costumes were checked across all 48 frames in both directions
  with braids and a large afro; their rendered pixels match the same face with
  hair omitted. All 49 supported hairstyles were checked under every hood.
  Unequipping, saving and decoding restores the exact original appearance data
  and the original rendered hero for all 343 costume/hairstyle combinations.
- The actual staging renderer was exercised with every costume through movement,
  attacks, strength, super kick, fireball, flight, speed and Steel Body.
- 19 existing full-body, twelve-outfit and Steel/Speed regression checks.
- 86 existing clothing, co-op, independent account, save conflict/retry, travel,
  combat checkpoint and equipment-related regression checks.
- A full staging rebuild reproduced the generated adapters without changes.

Browser checks used a disposable local Slot 2 fixture under public code
`0000000000`; the existing Slot 1 was preserved. All ten outfits were purchased
and equipped through the actual store, with exactly 700 coins deducted each
time. A full reload preserved all ten ownership records and the equipped white
suit. Actual gameplay displayed the white suit with saved braids, jump/punch/kick
poses and the approved metallic Steel Body. The interactive review confirmed
that the dolphin hood hides braids and removing it restores them.

The extraction tool finds each entire connected authored pose before packing,
including any pixels that cross nominal source-grid boundaries. This prevents
clipped hood/tail edges and removes fragments from neighboring cells. It does
not synthesize movement from a still or redraw the approved costume design.

## Remaining live checks and deployment gate

No Pages deployment or Supabase function deployment was performed. Real cloud
round trips, cross-device appearance, physical controllers and live online play
must still be verified after the finished sprites are approved and the staging
client/server policy is deployed. Automated save validation is not reported as
a live cloud test, and the public local test code cannot establish cloud sync.

After approval, first reconcile this branch with the latest main without
overwriting unrelated work. Deploy the matching
`royale-v3-staging/cloud/backend-v3/index.ts` dependency bundle and its updated
cosmetic policy, then deploy the approved staging client. Verify the deployed
commit, asset responses, purchases, independent saves and two-device restoration.

## Reproduction

Install the repository test dependencies (`@napi-rs/canvas` and `sharp`).

```sh
node tools/build-approved-costumes.cjs
node tools/build-kingjames-staging.cjs
node --import ./royale-v3-staging/costumes/tests/register.mjs --test royale-v3-staging/costumes/tests/costumes.test.mjs
node --test royale-v3-staging/kingjames/tests/engine.test.mjs royale-v3-staging/kingjames/tests/steel-motion.test.mjs royale-v3-staging/kingjames/tests/outfits.test.mjs
node --test royale/tests/clothing-purchases.test.mjs royale/local-coop/tests/*.test.mjs royale/tests/travel-cloud.test.mjs
node tools/render-costume-review.mjs --video
ffmpeg -y -framerate 24 -i docs/costumes/review/motion-frames/%04d.png -c:v libx264 -crf 18 -pix_fmt yuv420p -movflags +faststart docs/costumes/review/costume-animation-review.mp4
```

Source art was created with the built-in image generation tool from the approved
reference. The prompts and asset notes are retained under `art/`. Generated
intermediate movie frames are reproducible and excluded from Git. The local
fixture is under a `tests/` directory, which the Pages packaging workflow excludes.
