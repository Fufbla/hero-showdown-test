# Dolphin, Pink Shark and Hamburger asset generation

Built-in image generation produced the three source PNGs from the approved concept sheet. Sources are unchanged copies of the outputs. Full prompts are in `dolphin-prompt.txt`, `shark-prompt.txt` and `hamburger-prompt.txt`.

| Source | Actual dimensions | Grid | Unique cells | Face-mask minimum | Cyan-skin minimum |
| --- | --- | --- | --- | --- | --- |
| dolphin-costume-source.png | 1448 × 1086 RGBA | 8 × 6, 181 px cells | 48 | 1252 pixels | 342 pixels |
| pink-shark-costume-source.png | 1448 × 1086 RGBA | 8 × 6, 181 px cells | 48 | 1360 pixels | 253 pixels |
| hamburger-costume-source.png | 1448 × 1086 RGBA | 8 × 6, 181 px cells | 48 | 1215 pixels | 208 pixels |

All three have actual transparency (alpha range 0–255). Every nominal cell contains a substantial magenta face marker and cyan skin marker. The 48 raw RGBA cell hashes are distinct in each sheet. Hash distinction alone does not prove animation quality. Visual inspection confirms running leg changes, punch extension, kick extension, jump/tuck poses, hurt/defeat and flight poses.

## Packing and review limits

- Requested 2048 × 1536 was not honored; actual 1448 × 1086 is exactly divisible into 8 × 6, and matches the earlier engine source-cell dimension (181 px).
- Requested 12 px gutters were not consistently honored. At alpha >128, Dolphin frame 37 has 6 border pixels; Hamburger frame 38 has 21 and frame 46 has 31. Pink Shark has no nominal-cell border pixels. Inspect these when packing; neighboring source-cell boundaries may intersect small costume edges.
- Face holes shift naturally between poses and some attack limbs approach the hole. Use per-frame measured mask bounds and exact masks, not one shared fixed face rectangle.
- Face markers are flat magenta with antialiased edges. Skin markers have highlights/antialiasing in some cells despite requesting flat cyan; use robust mask thresholds and preserve dark contour ink.
- The figures are generally three-quarter right-facing, though some idle/flight frames are more front-facing. Final game-scale alignment, left-facing playback, face clipping, hair restoration and animation timing remain integration tests for the parent task.
- No full animation is claimed validated by this asset-only task. No game code, cloud data, commits or deployments were changed here.

Detailed per-cell boxes, counts, hashes and edge counts are in `assets-a-metrics.json`.
