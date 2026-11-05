# All 21 regular monster animations

All seven regions are integrated on `feature/showdown-royale`. The original verified base is `838d0ccaa41eb7c2ca616619f8c8c0f806ca1cdf`; the final region starts from verified Region 6 commit `acbf14dc9688da093ce8ed5b03113985acf3573f`. No boss merge is included.

## Delivered assets

**628 distinct transparent PNG frames, 21 atlases, five states per monster.** Every monster has idle, movement, attack, hit and defeat sequences. Rust Drone has five idle and movement frames and six per other state (28 total); all other monsters have six per state (30 total). Each frame is 320×256 with a common [160,240] foot anchor. The 1920×1280 atlases use explicit clip metadata and fixed display scaling.

The original approved reference PNGs and ZIP-derived source images remain unchanged. Region 1's existing animation checkpoint was recovered rather than regenerated. New animation drawings follow the approved designs, with retained AI-generated source masters and per-region provenance. **The new poses have not received separate user/artist visual sign-off.** Generated art can still need artistic refinement; automated uniqueness/alpha checks cannot establish natural motion or perfect anatomy.

| Region | Monsters | Frames | Verified region commit |
| --- | --- | ---: | --- |
| 1 Coastal Beginnings | Bottle Critter, Trash Slime, Sand Crawler | 90 | `2d4bd8046eb5f53740737c70b197ba351d492eac` |
| 2 Polluted Forest | Thorn Sprout, Toxic Mushroom, Bark Crawler | 90 | `b09b9dac5167251f2a398279f81b117d831d97c1` |
| 3 Industrial Wasteland | Scrap Crawler, Sludge Beast, Rust Drone | 88 | `878cd47d60ec41057b89785c596748e38884fc50` |
| 4 Toxic Underground | Cave Scorpion, Acid Beetle, Venom Crawler | 90 | `c889fb578e2f4d67d386e8e6638d51d97e2b0e4a` |
| 5 Mutated Territories | Thorn Beast, Mutant Stalker, Poison Spitter | 90 | `3c80242bc86d70b80b35c9d1bb3b46e81b117aa7` |
| 6 Dark Energy Realm | Shadow Wisp, Energy Phantom, Dark Sentinel | 90 | `acbf14dc9688da093ce8ed5b03113985acf3573f` |
| 7 Final Showdown | Apocalypse Mutant, Corrupted Guardian, Pollution Titan | 90 | This final-region commit |

Corrupted Guardian's replacement attack strip depicts its existing ranged volley, not the unused slam poses in its retained source master. Cave Scorpion and Acid Beetle source poses are normalized to one facing direction during packaging. Region 2 replacement attack strips prevent overlapping or missing poses. These are artwork corrections; combat mechanics are unchanged.

## Runtime and preservation

`monster-art.mjs` selects `AnimatedMonsterAtlas`. It reads the simulation's existing warning, strike, recovery, hit and death clocks. It does not write enemy state or change hitboxes, damage, cooldowns, rewards, AI, physics or save data. `renderer.mjs` avoids applying a second procedural collapse to already drawn defeat frames. Existing procedural art remains available if an atlas fails to load.

Display atlases are cached, with at most six entries (22,118,400 RGBA bytes); changing region releases large decoded source atlases from the preceding region. A visible monster uses one cached sprite draw. Source PNGs and reproduction scripts are in `assets/monsters/animation-source/` and `tools/`; packed frames, checksums and manifests are in `assets/monsters/animations/`.

All protected gameplay sources are byte-identical to the starting commit, including monster combat, XP, coins, drops, 50%-HP desperation behavior, vertical platforms, bosses, powers and saves. All changes are inside `royale/`. The completed boss branch is untouched and unmerged. Main, Story Mode and Versus Mode are untouched.

## Validation

Final run on 2026-11-01:

- **752/752 Node tests passed**, including complete 21-monster catalog coverage, all five animation states, correct attack clock boundaries, wounded aggression on ground and all four platform tiers, unchanged damage, rewards and saves.
- **6,658 raster assertions passed** across all seven regions and all 628 frames. Checks include true alpha, transparent margins, unique frames, fixed foot anchors, unclipped cached sprites, night rendering, render purity and bounded caches. Actual `MonsterAtlas` and `Renderer.enemy` render desktop 1280×720 and mobile-sized 390×844 scenes.
- **13,833 cloud Chrome browser assertions passed** across all seven regions, with no atlas errors. The browser suite checks alpha, alignment, night eyes, draw purity and wounded elevated combat.
- **7,200 differential movement/collision/basic-attack steps passed** against the earlier Phase 1 fixture. Later monster AI and reward rules are covered by dedicated tests rather than that differential fixture.
- Protected-source scope guard passed. Previously completed monster frame/atlas files remain unchanged when later regions are added.

Browser visual review is separate from those assertions: state sheets and night rendering were inspected for each region; final-region attack playback and the actual phone-sized game viewport were inspected. In Region 7 platform-3 practice, wounding retained x=1223.6666666666679, y=160 and damage=220. Screenshots and machine-readable results are in `tests/evidence/monster-sprites/`. Phone-sized browser tests are **not physical iPhone/Android tests**. Safari/Firefox and long sessions remain untested.

Performance is not certified at 60 FPS. The earlier 10.50-second Region 1 cloud sample measured 1.52 displayed FPS, 0.98 FPS 1% low and 5.48 ms mean simulation-plus-draw time; only 1.25 simulation seconds advanced. This is a limited cloud sample, not a device benchmark. The final Region 7 phone-sized 390×720 benchmark measured 1.37 displayed FPS over 10.25 seconds (14 samples), 0.98 FPS 1% low, 2.38 ms mean simulation-plus-draw and 11.60 ms p95; only 1.07 simulation seconds advanced. The benchmark did not achieve 60 FPS in this cloud environment. Raw data: `tests/evidence/monster-sprites/final-performance.json`.

## Play and review

Open [the interactive gallery](tests/monster-sprites.html) through an HTTP server. It displays the actual game adapter, supports every region and animation state, day/night views, disposable platform practice, a phone-sized viewport and a benchmark. Practice uses isolated test-session storage and does not alter real saved heroes. [All 21 actual sprites](tests/evidence/monster-sprites/all-21.png) and each region's five-state sheet are also available.

From the repository root:

```sh
python -m http.server 8000
# Open http://localhost:8000/royale/tests/monster-sprites.html
node --test royale/tests/*.test.mjs
for region in 1 2 3 4 5 6 7; do node royale/tests/monster-sprites-raster.mjs "$region"; done
node royale/tests/monster-sprites-overview.mjs
node royale/tests/compare-phase1.mjs
node royale/tests/verify-monster-sprites.mjs
```

Raster tools require `@napi-rs/canvas`. Packaging requires Pillow, NumPy and SciPy. No code above changes game saves. Do not merge the boss branch until the combined work receives final approval.
