# Approved V3 hero artwork

The user-approved 24-pose atlas is stored as `approved-action-atlas.svg` (1536 × 1024, six columns, four rows, 256-pixel cells). The SVG contains a transparency-preserving AVIF raster image; it is not editable vector art.

Only the local `0000000000` V2 test hero loads this atlas. If the SVG cannot decode, the renderer safely falls back to the previous animations. The ground running animation deliberately keeps its existing multi-frame loop because the approved concept includes only one running pose per direction.

**Artwork quality note:** The concept sheet's cityscape, ground platforms, and pennants have not been fully removed from all frames. Do not merge before inspecting the resulting sprites on the actual game stage and correcting any visual artifacts.

**Original source:** user-approved 24-pose concept sheet; it was a presentation board, not a transparent export.
