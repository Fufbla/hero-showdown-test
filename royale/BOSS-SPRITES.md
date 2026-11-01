# Boss sprites — manual upload Batch 2

Target branch: `feature/royale-boss-sprites`. This package is for manual upload. Do not push, merge, or start Batch 3 until the user confirms this upload.

## Verified base and recovery

Batch 2 starts at **`f140ba3083090a6959f3d8951d2bcc063fa5385d`** (`Add files via upload`, inspected 2026-11-01). All 50 files in the previous Batch 1 ZIP exactly match the remote Git tree by Git blob SHA. There are no missing or mismatched Batch 1 files. The unchanged base passes 637 tests. Details: `qa/boss-sprites/batch2/base-verification.json`.

Batch 1 artwork checkpoints were recovered and retained. No completed Batch 2 redesigned animation checkpoint was available. The approved references and existing scorpion rig were reused; only missing Batch 2 artwork was generated. Earlier local-only commits are not assumed to exist remotely.

## Included appearances

The game continues to show the original boss names.

| Batch | Game name | Approved appearance | Presentation |
| --- | --- | --- | --- |
| 1, preserved | Trash Monster | Trash Monster | Existing 32-pose atlas |
| 1, preserved | Bushman | Thorn Beast | Existing 32-pose atlas |
| 1, preserved | Wastelander, regional | Sludge Beast | Existing 32-pose atlas |
| 2 | Giant Scorpion | Venom Crawler | New transparent component atlas on the continuous eight-leg rig |
| 2 | Venomis, regional | Mutant Stalker | New 32-pose transparent atlas |
| 2 | AtomDust, regional | Energy Phantom | New 32-pose transparent atlas |

Venomis rows: idle, movement, thorn strike/combo, thorn volley, poison, rising thorns, hit, collapse. AtomDust rows: idle, movement, energy blast, expansion/shockwave, debris, atomic surge, hit, collapse. Each row contains four distinct newly authored poses. They are not crops of concept thumbnails. Detached projectiles and area effects still come from the existing combat renderer.

Batch 2 pose atlases are 2048 × 4096, with 512-pixel cells. Venomis and AtomDust use anchor `[208,480]` and reference height 192. Giant Scorpion's exported inspection atlas uses anchor `[256,480]` and the existing 165-unit body height. Its runtime uses the component atlas and continuous IK, so it can aim at the actual frozen attack target. The exported 32 scorpion samples are not a replacement for that targeting rig. Batch 1 retains its original 416-pixel cells, anchors, artwork, and playback timings.

Scorpion anatomy retains eight independent three-segment leg chains, planted feet, moving abdomen, two articulated claws, ten tail links, and the connected stinger. Its component source follows the existing UV layout; the rig reuses a source leg pair to draw the fourth pair, as before. New Royale-only hit and collapse poses do not change the shared Story rig. Collapse keeps feet planted while the abdomen and tail settle.

## Integration boundaries

JavaScript runtime edits are limited to `boss-art.mjs`, `boss-sprites.mjs`, and the new `scorpion-sprites.mjs`. The new atlas metadata extends the existing cache and allows per-profile cell sizes. At most two pose atlases are decoded; canvas blend buffers and scorpion component masks are reused. The short non-contact crossfade from Batch 1 remains. Attack contact never waits for a blend.

All simulation files remain byte-identical to the verified base: HP, damage, cooldowns, attack patterns and timing, phase thresholds, reinforcement limits, hitboxes, rewards, first-win chests, rematches, progression and saves. Scorpion contact still lands at 65% of its existing active interval; Venomis and AtomDust contact frames begin at their existing active tick. Phase effects only read current phase state.

Legendary names route through their existing artwork and combat. Permanent defeat, remains, Villain Merge and fourth-power rules are unchanged and remain covered by the existing tests. No regular-monster artwork, animation or integration code changed. The boss-only stylesheet also places the status panel beside the hero/status panels in short landscape layouts to keep warnings and artwork visible. No shared world renderer, Story, Versus or root game files changed. Main and Royale branches were not written or merged.

For eventual branch integration, reconcile the boss presentation adapter and boss-HUD stylesheet changes if the separate monster branch also touches those adapters. No shared renderer change is required by this batch.

## Review locally

From the complete repository root, run `python3 -m http.server 8000`, then open:

- `http://localhost:8000/royale/tests/boss-sprites-batch2.html`: all states, phases, facing, pause/step, body hitbox, eight-leg overlay and atlas downloads.
- `http://localhost:8000/royale/tests/bosses.html?region=4`: playable practice encounters with disposable heroes and viewport controls.
- `http://localhost:8000/royale/tests/phase5-browser.html?spriteBatch=2`: three bosses at five viewport sizes.
- `http://localhost:8000/royale/tests/boss-sprites.html`: preserved Batch 1 animation review.

These files extend the existing game. The upload ZIP is a patch, not a standalone repository. Serve through HTTP rather than opening HTML as local files.

Automated suite: `node --test royale/tests/*.test.mjs`. Run `npm ci` inside `royale` first if dependencies are absent. Optional authoring tools: `node royale/tools/pack-boss-sprites-batch2.mjs` (`pngjs`, `sharp`) and `node royale/tools/review-boss-sprites-batch2.mjs` (`@napi-rs/canvas`). They use the installed Work runtime as a fallback. Uploaded PNGs do not require these tooling dependencies at runtime.

See `qa/boss-sprites/batch2/VALIDATION.md` for measured results and limitations. Batch 2 is ready for visual review and manual upload; sustained 60 FPS and physical-device behavior are not certified. The remaining nine redesigned bosses, including all eight Legendary redesigns, are outside this package. Batch 3 waits for upload confirmation.
