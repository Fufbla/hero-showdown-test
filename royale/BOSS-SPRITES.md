# Royale boss sprites — Batch 3

Manual-upload patch for `feature/royale-boss-sprites`, based on verified commit **24f29cb3fcac896983d4a17b998d0256b42369a9**. No Batch 3 commit or push was performed. Wait for the user's upload confirmation before Legendary work.

## Completed regional appearances

| Original game name | Approved appearance | Runtime |
| --- | --- | --- |
| Trash Monster | Trash Monster | Preserved Batch 1 atlas |
| Bushman | Thorn Beast | Preserved Batch 1 atlas |
| Wastelander | Sludge Beast | Preserved Batch 1 atlas |
| Giant Scorpion | Venom Crawler | Preserved Batch 2 articulated eight-leg rig |
| Venomis | Mutant Stalker | Preserved Batch 2 atlas |
| AtomDust | Energy Phantom | Preserved Batch 2 atlas |
| Ultimate Pollution Boss | Corrupted Guardian | New 36-pose transparent atlas |

The first six bosses' artwork, metadata and scorpion rig are byte-identical to the verified base. The original names remain in gameplay and UI.

## Batch 3 artwork and playback

`assets/boss-sprites/atlases/regional-ultimate-pollution.png` is a 1536 × 3456 RGBA atlas: four columns, nine rows, 384-pixel cells, shared foot anchor `[192,352]`, reference height 192. Rows are idle, walk, punch, pollution, environment, slam, cataclysm, hit, defeat. Every row has four distinct newly generated full-body poses. The final defeat pose lies collapsed on the ground.

The source PNG sheets and exact prompts are included. `tools/pack-boss-sprites-batch3.mjs` deterministically packs the new artwork; it never rebuilds prior batches. Generated alpha is preserved. Component isolation removes neighboring fragments and detached debris; moving gameplay projectiles, warnings and area effects still come from the existing combat renderer.

The existing animation adapter accepts a per-profile row count for this nine-row atlas. Older profiles retain their original dimensions, anchors and timings. The two-image cache and 45 ms non-contact blend remain. Contact appears immediately on the authoritative active tick, without blending through a late pose. Existing phase particles read phase state without modifying simulation state.

## Preservation boundaries

No simulation, boss-data, hitbox, damage, cooldown, phase threshold, helper-wave, reward, treasure, rematch, save, progression, hero ability, Legendary or Villain Merge files changed. The 21 regular monsters and shared Story/Versus assets remain untouched. No merge into main or Royale was performed.

Presentation changes are confined to `boss-sprites.mjs` (region 7 profile, five attack rows, per-profile row count) and `boss-art.mjs` (region 7 no longer marked temporary). Review pages, documentation and tests are also updated. There are no shared world-renderer changes to reconcile with monster integration.

The older Batch 2 preservation test now compares modifications/deletions of files that existed at its base, so committed additions no longer produce a false failure. A new Batch 3 guard protects every pre-existing boss asset and all unrelated tracked files against the repaired base.

## Review and test

Serve the full repository root with `python3 -m http.server 8000`, then open:

- `/royale/tests/boss-sprites-batch3.html`: all nine animation states, phase/facing controls, pause/step, hitbox overlay and atlas download.
- `/royale/tests/bosses.html?region=7`: actual playable encounter using a disposable practice hero.
- `/royale/tests/phase5-browser.html?spriteBatch=3`: Ultimate Pollution Boss at five viewport sizes.
- `/royale/tests/phase5-browser.html`: all seven regional bosses at five viewport sizes.

Run `npm ci` within `royale`, then `node --test royale/tests/*.test.mjs` from the repository root. Authoring tools additionally use `pngjs`, `sharp` and `@napi-rs/canvas`, with a Work-runtime fallback. Runtime playback has no new package dependencies.

See `qa/boss-sprites/batch3/VALIDATION.md` and `test-summary.json` for final results, screenshots and limitations. Four-pose loops are review-ready; more hand-drawn in-betweens remain an optional refinement. No physical-device or sustained 60 FPS certification is claimed. All eight Legendary redesigns remain outside this batch.
