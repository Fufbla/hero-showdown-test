# Original Style C artwork

These two transparent PNG atlases were generated for this project with OpenAI Image Generation on 2026-11-02, using the user-supplied approved Style C image as the visual reference. The reference image remains user-supplied material. No external stock art or audio was introduced.

## Generation brief: modular parts

Create a square transparent 4 by 4 atlas of separate grayscale modular superhero parts. Match the supplied reference's polished, compact 2D RPG/comic hero style: expressive oversized head proportions, strong dark ink outlines, rich cel shading, detailed armor, and upper-left lighting. Leave clean transparent spacing between each part. Do not include a HUD, lettering, labels, background or complete assembled characters.

Rows, left to right:

1. Male face/head, female face/head, male armored torso, female armored torso. Faces have no hair, brows or eyes so customization can be layered over them.
2. Upper arm, forearm/bracer, clenched fist, shoulder armor.
3. Upper leg, lower leg/greave, boot, belt.
4. Natural cape, long loc strand, braid strand, curl strand.

Output: `style-c-parts.png`, unmodified generated RGBA image, 1254 × 1254. Runtime crop rectangles live in `style-c-parts.mjs`.

## Generation brief: facial features

Create a square transparent 3 by 3 atlas of separate grayscale facial feature illustrations matching the supplied Style C superhero reference. Strong clean ink, dimensional cel shading and bright eye highlights. No heads, hair, brows, HUD, labels, text or background. Keep generous transparent spacing.

Rows, left to right:

1. A pair of almond eyes, a pair of round eyes, a pair of wide eyes. Grayscale irises, dark pupils and white highlights, suitable for runtime eye-color tinting.
2. Small nose, straight nose, broad nose.
3. Neutral closed mouth, smiling mouth, full closed mouth.

Output: `style-c-features.png`, unmodified generated RGBA image, 1254 × 1254. Runtime crop rectangles live in `style-c-features.mjs`.

## Runtime use

`style-c-materials.mjs` crops and tints these reusable parts at render time. The atlas PNGs are preserved as generated; they were not repainted with image-processing scripts. A bounded 64-entry texture cache and 48-entry facial cache avoid repeated raster work. Code-drawn seams, joints, emblems, facial expressions and hairstyle structures retain customization and provide a fallback if images cannot load.

The example navy/gold and purple/gold appearances do not replace saved player choices. Equipment keeps its catalogue colors. The supplied reference HUD is not included in the game UI.
