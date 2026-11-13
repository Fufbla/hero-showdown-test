# Ten costumes and universal face-only hoods

Complete local collection for animation review. **Not deployed.**
Review branch: `codex/face-only-costumes-review`. Current staging baseline:
`3e594b9338dd1dc4b26d1e0fab4fa0c7fa98aef1` (armor and boss work preserved).
Exact upload state and file hashes are in `upload-progress.json`.

## Review files

- [Actual animation video](review/costume-animation-review.mp4): running both ways,
  jump, double jump, punch, kick, strength, super kick, fireball, flight, Steel
  Body and restored costumes. 18 seconds at 24 fps.
- [All ten costumes](review/ten-costumes.png).
- [Hood hair visibility](review/hair-visibility.png).
- Individual 48-pose sheets: `review/*-sprites.png`.
- Interactive review: serve the repository root and open
  `royale-v3-staging/costumes/review.html`. Motion, direction, hairstyle, skin,
  eyes, presentation and facial hair are adjustable. Remove/Restore costumes
  shows the unchanged original appearance and hairstyle.

| Costume | Hair | Coins | Poses |
|---|---|---:|---:|
| Dolphin | Hidden | 700 | 48 |
| Pink Shark | Hidden | 700 | 48 |
| Hamburger | Hidden | 700 | 48 |
| Stuffed Animal | Hidden | 700 | 48 |
| Zombie | Preserved | 700 | 48 |
| Reaper | Hidden | 700 | 48 |
| I Love Fishsticks | Hidden | 700 | 48 |
| Pizza Slice | Hidden | 700 | 48 |
| Black Business Suit / white tie | Preserved | 700 | 48 |
| White Business Suit / light blue tie | Preserved | 700 | 48 |

## Implementation

All ten source sheets were recovered unchanged. Each outfit uses one complete
48-pose body atlas and the existing FullBodyAnimator. No independent limb rigs
were added. The existing personalized face is composed inside each hood opening.
Hoods omit hair rendering without changing saved appearance. Uncovered costumes
retain the full personalized head. Cyan skin markers are recolored inside their
marker regions, preserving blue fabric and dolphin tails. Fishstick lettering
remains readable on the left-facing body.

The collection is isolated to V3 staging. Existing armor inventory, stat bonuses,
powers, physics, portals and boss work are preserved. Steel Body temporarily uses
its existing metallic atlas, then restores the costume. Existing clothing and
the separate twelve-outfit test wardrobe remain available. Ownership uses the
existing purchase, revision and save safeguards.

Public test code `0000000000` uses browser-local saves; its store confirms local
persistence. Real account purchases still require a cloud acknowledgement.
The public test code cannot establish real Supabase cloud synchronization.

## Verification

The final costume suite passes **10/10 tests**: 480 distinct padded poses,
supported animator states, both directions, 16,464 hood/pose/hair combinations,
face customization, skin, Steel Body, 700-coin purchases, duplicate/stale-write
rejection, save decoding, cloud policy, independent co-op/network appearances,
and unchanged simulation/save behavior. The new skin regression checks cyan
markers on the black suit and preservation of the dolphin's blue tail.

Recovered passing logs for 19 full-body/outfit tests and 86 shared purchase,
co-op and travel tests are retained under `verification/`. These were not
repeated because their implementation inputs were unchanged. They are prior-run
evidence, not new live online or cloud tests.

Browser verification on November 13, 2026 loaded all ten atlases. Running and
left-facing kicking were observed for all ten. Removing costumes restored braids
in the review. The actual test game displayed all ten store cards. Dolphin was
purchased for 700 coins (20,000 to 19,300), equipped, displayed in gameplay and
retained ownership and equipped state after reload. Removal preserved ownership
without another debit. Other costume purchase/save cases are covered by the
automated suite; this session did not buy all ten separately in the browser.

## Remaining deployment gates

- Review and approve these finished animations before merging or deploying.
- Reconcile with the latest main before deployment.
- Deploy matching client and cloud cosmetic policy only after deployment approval.
- Then verify real-account cloud round trips, cross-device restoration and
  physical multiplayer controllers. No cloud function was deployed here.

## Reproduce

```sh
node tools/build-kingjames-staging.cjs
node --import ./royale-v3-staging/costumes/tests/register.mjs --test royale-v3-staging/costumes/tests/costumes.test.mjs
node tools/render-costume-review.mjs --video
ffmpeg -y -framerate 24 -i docs/costumes/review/motion-frames/%04d.png -c:v libx264 -crf 18 -pix_fmt yuv420p -movflags +faststart docs/costumes/review/costume-animation-review.mp4
```

Artwork recovery creates only missing files. Do not regenerate approved sources
or overwrite recovered atlases. Intermediate video frames are ignored by Git.
