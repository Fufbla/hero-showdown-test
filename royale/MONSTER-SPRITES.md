# Approved monster-reference integration

## Audit before editing (baseline b3251ae)

The game uses `MonsterAtlas` in `monster-art.mjs`, caching procedural canvas artwork in six display-sized atlases. `Renderer.enemy` supplies the simulation pose, hit reaction, death fade and health bar. The simulation owns feet at `enemy.y` and one-way platform collisions. Sprite dimensions never define combat hitboxes. Regular enemy AI, desperation, damage, drops and respawning live separately in `core.mjs`, `monsters.mjs` and `world.mjs`.

The supplied `001sprites(1).zip` has 21 **opaque RGB reference strips**, roughly 508–515 pixels wide by 110–172 pixels high. Checkerboards are baked into the JPEG-derived pixels. The strips contain labels, neighboring artwork, inconsistent pose scales and no verified action or frame timing labels. Several largest poses have clipped feet or tails. They are not production animation atlases.

## Scope and limitations

Use a manually selected intact reference pose per monster, preserving its existing colored pixels. Remove the baked background; do not generate new designs or invent missing anatomy. Cache display-sized motion poses driven by existing animation state and distance traveled. All five states (idle, movement, attack, hit, defeat) get **provisional procedural motion from one source pose**, not artist-authored limb animation. The original procedural artwork remains a loading/error fallback.

The supplied art does not support a claim of finished production sprite animations. All 21 monsters still need high-resolution transparent, consistently designed and aligned artist-approved idle, locomotion, attack, hit and defeat sequences. Cave Scorpion, Acid Beetle, Thorn Beast and Energy Phantom particularly need complete large poses: intact smaller reference poses must be used provisionally. No AI-created artwork is used.

This change is isolated to Royale artwork, rendering and review/test utilities. No gameplay balance, save schema, regular AI, powers, bosses, hero artwork, Versus Mode or Story Mode changes are planned.

## Implemented

- 21 separately named RGBA PNGs in `assets/monsters/poses/`, all derived from supplied pixels; original strips and their README are retained in `source/`.
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
| Toxic Underground | Cave Scorpion (`scorpion.png`), Acid Beetle (`beetle.png`), Venom Crawler (`venomCrawler.png`) | Scorpion and Beetle use smaller intact poses because large poses are clipped. Full-size complete anatomy, leg cycles and clean negative spaces are needed. |
| Mutated Territories | Thorn Beast (`thornBeast.png`), Mutant Stalker (`stalker.png`), Poison Spitter (`spitter.png`) | Thorn Beast uses a smaller intact pose. Confirm the inconsistent quadruped/upright proportions in the source; supply approved complete cycles and acid/spit release poses. |
| Dark Energy Realm | Shadow Wisp (`wisp.png`), Energy Phantom (`phantom.png`), Dark Sentinel (`sentinel.png`) | Smaller intact poses avoid clipping. Supply high-resolution alpha effects and explicit hover/walk/attack cycles; faint source matte fringes remain. |
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

Browser: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36. Source PNG transfers total approximately 650 KiB; only the three current-region images are prefetched. All 21 decoded poses together use about 1 MiB. Full raw measurements and per-region assertions are in `tests/evidence/monster-sprites/final-browser-results.json`.
