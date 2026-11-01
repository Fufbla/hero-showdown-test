# Royale boss sprites — Batch 4

Lightning Spree, Air Pollution Monster and Styrodog use their approved Legendary designs. Base: **7316438e5c1eb21a07f862b6adc24615d0d6d6a5**, verified against the remote boss branch. All 137 prior batch package files match that commit. Development remains isolated to `feature/royale-boss-sprites`; no merge is part of this batch.

## Artwork and integration

The three transparent RGBA atlases contain 36, 36 and 40 distinct full-body poses respectively. Each uses four columns, 512-pixel cells, foot anchor `[224,480]` and reference height 224. Idle, movement, each existing attack, hit and collapse have their own sequences; Styrodog also has a landing-impact row. Exact source sheets, approved references, generation prompts, source rectangles and SHA-256 hashes are included. These are newly authored animation poses, not cropped miniature concept poses.

`legendary-sprites.mjs` adapts presentation to the existing simulation. `boss-art.mjs` routes only these three Legendary IDs to it; helpers, seven regional bosses and the remaining five Legendary bosses retain their prior paths. This is the only shared presentation change to consider during later monster/boss integration. No shared world renderer or regular-monster module changed.

One decoded PNG is reused for all states of a boss, with a two-atlas cache. Non-contact transitions blend over 45 ms on a reusable transparent canvas. Active attacks bypass blending so their contact pose is immediate. Styrodog's leap reaches its impact pose at the existing 98% landing tick. All poses use the entity's interpolated world position, facing and original height. Three-phase particles read existing phase state without creating gameplay timers or damage. Lightning's single yellow ground-warning area remains in the untouched combat renderer.

## Review and validation

Serve the repository root and open `royale/tests/boss-sprites-batch4.html` for every animation, phase, facing, elevated surface, hitbox overlay and atlas download. Its playable-practice link opens the existing isolated Level-99 Legendary test heroes. These fixtures do not use adventure save slots. Open `royale/qa/boss-sprites/batch4/` for test logs, screenshots, all-pose contact sheets, source provenance and measured performance.

Run `node --test royale/tests/*.test.mjs` from the repository root. Baseline: 657 passing tests. Batch 4 adds 15 targeted tests for distinct alpha frames, padding/alignment, collapse, timing, immutable combat state, helper routing, cache bounds and protected files. The browser review validates all 112 poses in both facings at ground/elevated origins (448 actual canvas draws). Existing Phase 7 browser tests cover all eight Legendary bosses at five viewport sizes, level gating, 50% restoration, protected fourth power, waves, permanent defeat, reward claims, revisits/remains and save compatibility.

Repack only Batch 4 with `node royale/tools/pack-boss-sprites-batch4.mjs`; native review uses `node royale/tools/review-boss-sprites-batch4.mjs`. These development tools require pngjs/sharp and @napi-rs/canvas respectively. They do not rebuild regional art. Runtime has no added package dependency.

Measured cloud gameplay (30-second runs): Lightning Spree desktop, 1.32 FPS; Air Pollution Monster landscape-phone size, 1.17 FPS; Styrodog landscape-phone size, 1.33 FPS. Average whole-game draw cost was 2.42–3.41 ms. Frame scheduling was much slower than drawing; the cause was not established. Sustained 60 FPS remains unverified. See raw JSON reports; these are not physical-device benchmarks.

## Limits and protected scope

Four poses per sequence plus short blends are a compact animation treatment, not dense hand-drawn animation. Fine armor/smoke detail can vary across generated poses. The source sheets include rejected overlapping rows; the manifest selects replacement sheets for Lightning's idle/walk and Styrodog's claw/lunge. Raster timing measures only the boss renderer, not total game FPS. Browser performance is reported separately; no physical-device testing is claimed.

All original names, HP, damage, cooldowns, attacks, hitboxes, thresholds, waves, rewards, progression, saves, disruption, fourth abilities and skeletal remains code are unchanged. All seven regional boss assets and the 21 regular monsters remain byte-identical. No Story, Versus, main, or Royale branch changes are included. No Batch 5 work has begun.

---

# Archived Batch 3 implementation notes

Batch 3 was subsequently verified on `feature/royale-boss-sprites` at **7316438e5c1eb21a07f862b6adc24615d0d6d6a5**. The notes below describe its original package.

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
