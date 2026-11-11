# Approved V3 hero artwork

The approved 24-pose transparent sprite atlas is committed as
`approved-action-atlas.avif` (1536 × 1024, six columns, four rows of
256-pixel cells). This native raster file preserves transparency and the
approved visual design. `approved-action-atlas.svg` is an alternate wrapper
containing the same AVIF pixels.

Only local test code `0000000000` loads the approved image. If it cannot be
decoded, the renderer safely falls back to the original game art. The grounded
running animation retains its original multi-frame loop, since the approved
sheet provides only one run pose for each facing.

**Quality note:** The source concept was a presentation board. Some source
cityscape, pennants, and floor pixels remain around the artwork; they need
visual cleanup before using these sprites in the final release.

The original gameplay mechanics, normal heroes, equipment, cloud saves and
multiplayer are not affected by this optional renderer.
