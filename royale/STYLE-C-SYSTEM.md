# Style C sprite system and direct HUD selection

## Checkpoint A — protected default artwork

Starting remote: `7571fdb326dd9fddd1969bc0b15f2ad3df0d3b8a`.
Recovery branch: `recovery/style-c-before-sprite-system-20261102`.
Baseline: 987 tests passed, zero failures or skips.

The approved default standing faces, hair, armor and proportions continue to use
the original reference RGB. The attached development board adds turnaround and
modular-art direction; it does not replace the original default identity.

- [Reference comparison](qa/style-c/emergency/reference-comparison.png)
- [Six close-up categories](qa/style-c/emergency/closeups.png)
- [Baseline results](qa/style-c/system/baseline.txt)

Small matte fringes remain at hair and boot edges. The single reference figure is
approximately 330 pixels tall. New component artwork must be reviewed against
these source-pixel defaults; generation alone is not evidence of exact identity.

Checkpoints B–E are in development. No final integration or merge into main is
authorized before visual approval.
