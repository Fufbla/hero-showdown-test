# Regular monster animation integration — current status

Verified remote base: `838d0ccaa41eb7c2ca616619f8c8c0f806ca1cdf`.

Region 1 (Bottle Critter, Trash Slime, Sand Crawler) now has six separately drawn frames for each of idle, movement, attack, hit and defeat: **90 transparent PNG frames**, three production atlases, source masters and reproducible packaging. The original approved ZIP reference strips remain byte-identical. New poses are AI-drawn from those designs; they have not received a separate artist/user approval. Regions 3–7 still use the existing provisional single-pose motion and are unfinished.

Region 2 (Thorn Sprout, Toxic Mushroom, Bark Crawler) adds another 90 separate transparent frames. Replacement six-pose attack strips avoid overlaps and missing poses in the first generated sheets. Original approved cutouts and Region 1 art remain unchanged. Validation: **660/660 Node tests**, **954 raster assertions**, **4,006 browser assertions across Regions 1–2**, and the protected-source guard pass. See `tests/evidence/monster-sprites/region-2/` for desktop/mobile-sized renders and browser evidence. Physical devices are not tested. The ranged-monster test now correctly accepts attacking at existing range instead of requiring melee pursuit.

The runtime reads existing combat clocks, uses the existing display heights, and anchors every frame at the enemy’s feet. Authored defeat frames replace the previous additional procedural collapse only for loaded new animations. Loading failures retain playable original art. Large source atlases are released when changing regions; the display atlas cache remains capped at six.

Region 1 validation: **642/642 Node tests**, **954 raster assertions**, **7,200 differential movement/collision/basic-attack steps**, and the protected-source scope check pass. Tests cover all four elevated tiers plus ordinary ground combat outside safe camps, approaching and attacking below 50% HP, unchanged attack damage, transparent margins, uncut silhouettes, unique frames, fixed ground anchors, night-eye rendering, and draw purity. Existing tests also cover XP, coins, equipment and Health Root drops, night bonuses, bosses, powers and saves. All protected gameplay files remain byte-identical to the working baseline.

Actual runtime raster evidence: `tests/evidence/monster-sprites/region-1/`. Desktop 1280×720 and phone-sized 390×844 canvas renders were inspected. Recovered and revalidated on 2026-11-01: **2,003 browser assertions passed**; observed animation playback and captured `region-1/browser.jpg`. Physical iPhone/Android testing remains pending. Raster checks do not establish physical-device frame rate or fully verify temporal smoothness.

The seven-region browser regression passed **13,637 assertions** after recovery. A 10.50-second Region 1 desktop sample measured **1.52 displayed FPS**, 0.98 FPS 1% low, and 5.48 ms mean simulation-plus-draw time. This cloud measurement does not establish sustained 60 FPS. Raw results: `tests/evidence/monster-sprites/region-1/all-regions-browser.json`.

Run:

```sh
node --test royale/tests/*.test.mjs
node royale/tests/monster-sprites-raster.mjs 1
node royale/tests/compare-phase1.mjs
node royale/tests/verify-monster-sprites.mjs
```

The raster runner needs `@napi-rs/canvas` (or the Work runtime dependency directory). The gallery at `tests/monster-sprites.html` uses the actual game atlas and provides a disposable platform practice scene.

The following audit is historical and describes the previous reference-pose integration, which remains the fallback for unfinished regions.

---

# Approved monster-reference integration

## Audit before editing (baseline b3251ae)

The game uses `MonsterAtlas` in `monster-art.mjs`, caching procedural canvas artwork in six display-sized atlases. `Renderer.enemy` supplies the simulation pose, hit reaction, death fade and health bar. The simulation owns feet at `enemy.y` and one-way platform collisions. Sprite dimensions never define combat hitboxes. Regular enemy AI, desperation, damage, drops and respawning live separately in `core.mjs`, `monsters.mjs` and `world.mjs`.

The supplied `001sprites(1).zip` has 21 **opaque RGB reference strips**, roughly 508–515 pixels wide by 110–172 pixels high. Checkerboards are baked into the JPEG-derived pixels. The strips contain labels, neighboring artwork, inconsistent pose scales and no verified action or frame timing labels. Several largest poses have clipped feet or tails. They are not production animation atlases.

## Scope and limitations

Use a manually selected intact reference pose per monster, preserving its existing colored pixels. Remove the baked background; do not generate new designs or invent missing anatomy. Cache display-sized motion poses driven by existing animation state and distance traveled. All five states (idle, movement, attack, hit, defeat) get **provisional procedural motion from one source pose**, not artist-authored limb animation. The original procedural artwork remains a loading/error fallback.

The supplied art does not support a claim of finished production sprite animations. All 21 monsters still need high-resolution transparent, consistently designed and aligned artist-approved idle, locomotion, attack, hit and defeat sequences. The complete original roster has now supplied larger poses for Cave Scorpion, Acid Beetle, Thorn Beast, Shadow Wisp, Energy Phantom and Dark Sentinel. These remain small concept drawings, not high-resolution animation masters. No AI-created artwork is used.

This change is isolated to Royale artwork, rendering and review/test utilities. No gameplay balance, save schema, regular AI, powers, bosses, hero artwork, Versus Mode or Story Mode changes are planned.

## Implemented

- 21 separately named RGBA PNGs in `assets/monsters/poses/`, all derived from supplied pixels; original strips and their README are retained in `source/`, alongside the unchanged complete approved roster as `source/approved-roster-original.png`.
- Reproducible extraction script, SHA-256 source records, audited crop rectangles, fixed foot anchors, source orientation and eye locations. Source RGB is retained; alpha is reconstructed from the baked background.
- 28 cached visual poses per monster: idle (4), movement (8), windup (3), strike (4), recovery (2), hit (2), defeat (5). These are **procedurally deformed versions of one pose**, not 28 authored drawings. Defeat also uses the existing continuous collapse/fade. Movement phase follows traveled distance; paused simulation freezes motion.
- Grounded animations share the simulation's feet baseline. Flying species retain existing movement. Rooted enemies do not play a walking cycle. Hit visuals do not create hit stun or interrupt AI.
- The six-entry LRU atlas cache uses at most 20,643,840 bytes of uncompressed RGBA texture memory, plus small decoded source images. A typical three-species daytime board uses 10,321,920 atlas bytes. Each visible monster uses one cached draw call. Loading failures retain the original canvas art. Disposal releases cached canvases.
- Rendering bounds account for wider reference silhouettes without changing collision dimensions or attack reach. Day/night eye highlights are cached with the body.
- A dedicated `tests/monster-sprites.html` review page provides region/state selectors, animation, aligned state sheets, disposable gameplay at all elevations, tests and measurements. The earlier graphics gallery now displays the new reference art.

## Completed and remaining assets

All entries below have a transparent provisional pose and the five requested motion-state handlers. **All require approved authored animation sequences before production sign-off.**

| Region | Integrated assets | Source-specific remaining work |
| --- | --- | --- |
| Coastal Beginnings | Bottle Critter (`bottle.png`), Trash Slime (`slime.png`), Sand Crawler (`crawler.png`) | High-resolution alpha masters and authored leg/body/action cycles; compression and edge cleanup. |
| Polluted Forest | Thorn Sprout (`sprout.png`), Toxic Mushroom (`mushroom.png`), Bark Crawler (`bark.png`) | Confirm consistent anatomy across reference poses; authored attack and locomotion cycles. |
| Industrial Wasteland | Scrap Crawler (`scrap.png`), Sludge Beast (`sludge.png`), Rust Drone (`drone.png`) | Authored mechanical gait, sludge deformation, rotor/attack frames and metallic alpha edges. |
| Toxic Underground | Cave Scorpion (`scorpion.png`), Acid Beetle (`beetle.png`), Venom Crawler (`venomCrawler.png`) | Large Scorpion and Beetle poses recovered from the complete roster. Authored leg cycles and clean negative spaces are still needed. |
| Mutated Territories | Thorn Beast (`thornBeast.png`), Mutant Stalker (`stalker.png`), Poison Spitter (`spitter.png`) | Thorn Beast now uses the large quadruped source design, replacing the inconsistent upright thumbnail. Supply consistent quadruped cycles and acid/spit release poses. |
| Dark Energy Realm | Shadow Wisp (`wisp.png`), Energy Phantom (`phantom.png`), Dark Sentinel (`sentinel.png`) | All three now use larger poses recovered from the complete roster. Supply high-resolution alpha effects and explicit hover/walk/attack cycles; faint source matte fringes remain. |
| Final Showdown | Apocalypse Mutant (`apocalypse.png`), Corrupted Guardian (`guardian.png`), Pollution Titan (`titan.png`) | Complete authored heavy movement, attack, hit and collapse sequences; clean neutral highlights and hollow areas from original alpha masters. |

### Artwork handoff needed

For each monster, provide a consistent transparent canvas and a shared foot/pivot anchor across every frame. Recommended masters: at least 256 pixels tall (larger for wide silhouettes), with 4–8 pixels of transparent padding. Include labeled idle loop, walk/hover loop, attack windup/contact-or-release/recovery, brief hit reaction and defeat sequence. Suggested starting counts are 6–8 idle, 8–12 movement, 6–10 attack, 2–4 hit and 6–10 defeat frames; timing must follow the existing game rather than changing attacks to fit artwork. Include eye/emissive anchors. No baked checkerboard, captions, ground shadows, neighboring characters or cropped extremities.

These counts are an art-production recommendation, not a claim that the uploaded preview frames provide those actions. Whole-body deformation cannot substitute for natural articulated limb animation at larger viewing scales. Some JPEG/checkerboard matte remnants remain in these review cutouts.

## How to review

Open `royale/tests/monster-sprites.html`, choose a region, select a motion state and press **Animate poses**. The light-background state strip shows consistent feet alignment. Use **Load practice scene** with Ground or Platform 1–4 to play the real game using a disposable hero. The practice scene never reads or overwrites real hero saves. Use **Wound nearby monster to 50%** to inspect unchanged position/damage and continued aggression. Reload the scene if its hero dies. The regular game automatically uses these sprites; no debug mode is required for artwork.

Run checks locally with:

```sh
node --test royale/tests/*.test.mjs
node royale/tests/compare-phase1.mjs
node royale/tests/verify-monster-sprites.mjs
```

Regenerate assets with `python royale/tools/prepare-monster-refs.py` (Pillow, numpy, scipy). No network or generative-image service is used. The included original files and crop manifest make the process auditable.

## Validation results — 2026-10-31

### Automated

- **622/622 Node tests passed**, including 23 new source-provenance, RGBA, anchor, motion-selection and fallback/disposal tests; the existing platform, AI, powers, rewards, bosses, inventory and save tests also pass.
- **13,601 sprite browser assertions passed** across 21 species, 28 poses, day/night variants: nonempty pixels, atlas clipping, foot alignment, distinct visual states, bounded caches, unchanged simulation state after drawing, and wounded top-platform attacks. Counts include per-step render-purity assertions.
- **595 existing browser control assertions passed**: seven regions × four elevated tiers × five sizes (390×844, 844×390, 320×568, 768×1024, 1280×800). Real keyboard handlers, synthetic touch and a mocked standard controller; no physical device certification.
- **7,200 differential steps** still match Phase 1 movement, collisions and basic-attack timing.
- The scope verifier confirms byte-identical AI, combat, monster stats, rewards/drop rates, world geometry, saves, hero art and boss art. Remote `main` remains `b11a1d8103f10e38d63788496660b99d4a8d9e6e`; no root/shared/Versus/Story files changed.
- Asset requests succeeded; no game-origin runtime errors were observed. The cloud browser extension emitted unrelated metadata errors.

### Focused browser playtesting

Inspected all 21 cutouts on dark/light review surfaces and corrected crop contamination, neutral-color holes and eye positions. Observed the actual Region 1 top-platform encounter with Bottle Critter, Trash Slime and Sand Crawler at multiple elevations, including idle, punch, jump/fall, damage reaction, enemy warning and contact damage. Verified the 50% wound fixture retained the monster's exact position and damage. Reviewed the five-state motion strip. Screenshots are in `tests/evidence/monster-sprites/`.

This is cloud-browser observation and interaction, **not physical iPhone/Android/tablet/controller testing**. Authored limb animation, full-resolution matte cleanup and sustained-device performance remain unverified/unfinished.

### Measured rendering performance

The samples use the actual Game and Renderer, 24 board monsters, powers active, fixed 1/60 simulation steps and the same 0.1-second catch-up cap as the game. Sprite images and atlases are warmed separately. The browser produced very few animation-frame callbacks: only about 1.05–1.22 simulated seconds elapsed during each ten-second wall-clock sample. These samples do **not** demonstrate a playable real-device frame rate or sustained 60 FPS. GPU execution and physical device memory are not measured.

| Scene | Canvas CSS size | Displayed FPS | 1% low FPS | Mean simulation + render ms | Cached image load ms | Atlas build ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Region 7 | 1300 × 540 | 1.52 | 0.98 | 3.08 | 11.80 | 5.70 |
| Region 7 | 390 × 720 | 1.37 | 0.98 | 2.85 | 52.80 | 7.40 |
| Region 1 | 1300 × 540 | 1.37 | 0.98 | 3.35 | 52.50 | 8.20 |

Browser: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36. The initial integration source PNG transfers totaled approximately 650 KiB; only the three current-region images are prefetched. The recovery update below supersedes that asset-size figure. Full raw measurements and per-region assertions are in `tests/evidence/monster-sprites/final-browser-results.json`.

## Source recovery follow-up — 2026-10-31

The original `Hero Showdown Royale Monster Sprite Sheet.png` (1536 × 1024) contains the same approved designs as the ZIP strips, with complete large poses that were clipped during strip preparation. Six source poses are now recovered from this original; the other 15 PNGs are byte-identical to `7294ebb`. The different dark-background roster was inspected but not used: it changes character designs and does not resolve the verified-frame requirement.

| Monster | Previous PNG | Recovered PNG |
| --- | --- | --- |
| Cave Scorpion | 64 × 67 | 146 × 112 |
| Acid Beetle | 84 × 86 | 154 × 85 |
| Thorn Beast | 68 × 77 | 144 × 105 |
| Shadow Wisp | 84 × 97 | 109 × 99 |
| Energy Phantom | 71 × 89 | 132 × 93 |
| Dark Sentinel | 69 × 96 | 123 × 106 |

Sizes include transparent padding. Crop coordinates and SHA-256 provenance are retained in the extraction manifest; RGB pixels remain from the approved source. Captions are excluded, and night-eye coordinates were re-audited. Foot anchors, display heights and atlas cell sizes are unchanged. No renderer, AI, attack, physics, progression or save code changed in this follow-up.

Current pose transfers total 738,228 bytes; all 21 decoded source poses require 1,189,260 RGBA bytes. The unchanged six-atlas cache remains bounded at 20,643,840 bytes. The full original roster is retained for provenance but is never loaded by gameplay.

Revalidated: **622/622 Node tests**, **13,601 browser sprite assertions across all seven regions**, **7,200 differential movement/collision/attack steps**, the artwork-only scope guard and all **353 local import references**. Browser assertions cover all 28 cached poses, day/night eye changes, frame bounds, fixed feet, unchanged rendering state and every species attacking while wounded on the highest platform. Detailed results are in `tests/evidence/monster-sprites/resume-node-tests.txt` and `resume-browser-results.json`.

All 21 still need artist-authored idle, movement, attack, hit and defeat sequences, clean alpha masters and physical-device review. Recovering larger source poses does not complete those missing animation assets.

The Region 6 follow-up benchmark measured 1.53 displayed FPS at 1300 × 540 and 1.37 FPS at 390 × 720 in the cloud Chrome browser (10-second samples; 1% low 0.98 FPS). Mean simulation-plus-draw time was 3.67 ms and 2.62 ms respectively; image loading was 11.5 ms / 52.3 ms and atlas construction 7.6 ms / 7.1 ms. Only 1.05–1.18 seconds of simulation elapsed during each sample. This is not evidence of sustained 60 FPS or physical mobile-device performance. Texture cache use was unchanged at 10,321,920 bytes for the three species.

Source verification also confirmed all visible cutout RGB values exactly match their approved source pixels, four-pixel transparent borders remain intact, and all 15 unaffected pose PNGs remain byte-identical. Screenshot `recovered-region6.jpg` shows the recovered reference designs and day/night eye treatment in the review page. Physical iPhone/Android/controller testing remains outstanding.

Focused browser observation: reviewed Region 4 and Region 6 night-eye placement; played a disposable Region 6 hero at Platform 4 in a 390-pixel-wide iframe using the actual touch Punch and Jump buttons. The UI reported a punch, one jump/fall and enemy contact damage; Wisp and Sentinel sprites were visible on different elevations. This was browser interaction, not physical touchscreen testing. See `recovered-platform-playtest.jpg`.
