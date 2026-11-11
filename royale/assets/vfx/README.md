# Enemy-hit sprite atlases (two files)

Place these two transparent 512x512, 2x2 animation atlases in this folder:

- `ground-roots-trap.avif` — Ground Roots, green vines and root snare
- `whirlwind-hit.avif` — Whirlwind, white/teal cyclone

Their source artwork and ready-to-upload AVIFs were provided in the companion ChatGPT upload pack. The corresponding display logic lives in [../../enemy-control-vfx.mjs](../../enemy-control-vfx.mjs) and is called by [../../power-art.mjs](../../power-art.mjs). Each file consists of four evenly sized frames, row-major (top left, top right, bottom left, bottom right).

Before merging, confirm both image files are uploaded with exactly these names and run `node --test royale/tests/enemy-control-vfx.test.mjs`. Do not change gameplay durations, power costs, hero outfits or cloud saves as part of this art-only update.

## Hero-centered power overlays (separate from enemy-hit art)

The shared VFX renderer is [../../v2-sprites/hero-power-overlays.mjs](../../v2-sprites/hero-power-overlays.mjs). It draws Ground Roots and Whirlwind **around the existing character** in two passes, so every customized hero can use the same animation without replacement full-body images.

Two approved transparent PNGs are required to enable the illustrated six-frame versions:

- `ground-root-overlay.png` — 1536 x 1024, 3 columns x 2 rows of 512px frames
- `whirlwind-overlay.png` — 1536 x 1024, 3 columns x 2 rows of 512px frames

Place both files **directly in `royale/assets/vfx/`**. Until present, the renderer displays a character-independent canvas fallback; it does not display the previous oversized whole-character power poster. The monster hit effects above remain separate and unchanged.

Only art rendering changes. Do not change gameplay durations, cooldowns, damage, hero appearances, cloud saves, or multiplayer networking.
