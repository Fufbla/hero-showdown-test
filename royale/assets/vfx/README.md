# Enemy-hit sprite atlases (two files)

Place these two transparent 512x512, 2x2 animation atlases in this folder:

- `ground-roots-trap.avif` — Ground Roots, green vines and root snare
- `whirlwind-hit.avif` — Whirlwind, white/teal cyclone

Their source artwork and ready-to-upload AVIFs were provided in the companion ChatGPT upload pack. The corresponding display logic lives in [../../enemy-control-vfx.mjs](../../enemy-control-vfx.mjs) and is called by [../../power-art.mjs](../../power-art.mjs). Each file consists of four evenly sized frames, row-major (top left, top right, bottom left, bottom right).

Before merging, confirm both image files are uploaded with exactly these names and run `node --test royale/tests/enemy-control-vfx.test.mjs`. Do not change gameplay durations, power costs, hero outfits or cloud saves as part of this art-only update.
