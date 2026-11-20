# Fancy Costume source artwork

The user approved the golden doodle puppy costume shown in
`approved-preview.png` on November 20, 2026. They initially authorized this
costume for the existing `0000000000` test profile after checking all normal
actions. They subsequently approved promoting the same artwork to the live
game with the display name **Fancy Costume** and a price of **700 coins**.
The permanent internal ID remains `golden-puppy-costume` to preserve ownership.
The separate test-profile migration provides 10,000 coins once so the user can
purchase and try the costume without changing ordinary player accounts.

## Artwork provenance

Both PNG sources were created with the built-in image generation tool.
`approved-preview.png` is the unchanged approved design. `action-source.png`
contains 48 independently authored full-body poses in an 8-by-6 layout.
The generated reference was the approved puppy design plus the existing
stuffed-animal costume's 48-pose atlas as a pose and layout guide.

The generation specification required the same honey-gold curly puppy suit,
caramel floppy ears, cream muzzle and belly, paw gloves and boots, and curled
tail in every pose; the existing compact action-chibi proportions; transparent
background; and a flat magenta face opening to preserve each player's face and
hair through the game's existing costume compositor. It explicitly excluded
the bear's round ears, bow tie, added accessories, text, and baked human faces.

The requested actions in reading order were idle (2), start (2), stop (2), run
(8), jump (4), double jump (4), fall (2), land (2), punch (4), kick (4), hurt (2),
defeat (2), recovery (2), fireball (4), and flight (4). The last two flight poses
were authored as forward horizontal flight. Strength, super kick, airborne
fireball, and seismic smash map existing authored poses to their gameplay
states, for 21 supported states in total.

## Rebuild the runtime atlas

Run from the repository root with Node.js and `sharp` installed:

```sh
node tools/pack-puppy-sprites.mjs
```

The packer does no artistic redrawing. It finds each complete connected
silhouette, including the tails that cross a nominal source-grid boundary;
removes nearly transparent export noise; applies a single nominal scale; and
packs lossless 256-by-256 cells into `body.webp`. All frames use a 128,230 foot
anchor and the game's 0.62 world scale. Grounded feet align at y=230. Airborne
positions preserve the existing jump and fall placement. The two horizontal
flight frames keep the hood at the same horizontal position and allow only a
one-pixel vertical change, avoiding the old rotated costume's large offset.

Every face opening is measured from its own pixels. Hand origins are measured
on the new puppy gloves. The packer records frame-specific face, head, head-box,
and hand registration in `manifest.json`; it does not copy the bear's face or
hand rectangles. Punch and kick contact remain the third pose in their
four-frame animation so their visual contact matches the existing hit window.

`registration-contact-sheet.png` labels all 48 packed poses. Green rectangles
show measured face keys, blue points show glove/effect origins, and dashed
lines show the common ground reference. `registration-report.json` records
source hashes, unique frame hashes, ink bounds, face bounds, landmarks, and
clearance. Both are reproducible QA artifacts, not gameplay textures.

The packer initially writes an exact crop of the approved design as
`preview.png`. The runtime rendering check replaces that thumbnail with the
actual composed first frame using the game's own character-head renderer.
The final rendered action review should be used to assess face and hair fit.

## Release routing

Runtime assets remain under `royale-v3-staging/kingjames/puppy/assets/` and are
copied into the isolated `four-powers-test` build. The original test release
mapped the puppy catalog and renderer only in that build. The approved live
promotion adds production catalog routing without changing these source paths,
the internal costume ID, or the approved artwork. Fancy Costume is unisex,
costs 700 coins, and is not automatically purchased or equipped. The separate
10,000-coin grant remains confined to the `0000000000` test profile.
