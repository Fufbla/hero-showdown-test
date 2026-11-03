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

## Playable review with direct power selection

Start the [Guardian patrol](index.html?practice=male) or [Sentinel patrol](index.html?practice=female). Each uses the regular game and a separate, tab-local practice hero at level 15. Both start with Fireball and Super Kick equipped, eight learned active powers, passive Speed and five unspent points. New regular heroes still start at level 1.

Tap an empty slot, or press its mapped key or controller button, to open the selector. Choose a learned power to equip it immediately. Use the ⇄ control to change or clear a filled slot outside combat. Pressing a filled power button still activates it. Equipped and recovering powers show their status in the selector. The protected Villain Merge ability stays outside the selector. A loadout change saves the slots and preserves outstanding recovery without advancing the last saved location, coins or other adventure progress.

The browser playtest covered starting both presets, casting Flight from slot three, retaining the selection after a reload, spending a single point with ↑, and equipping Steel Body in a 390 × 844 portrait viewport. The regular creator opened with three empty slots and a new level-one hero had no powers to equip. The current automated suite passed 991 tests. The native renderer passed 9,288 checks for all 36 creatures.

[Power selection in the live game](qa/style-c/system/power-picker.jpg)

The two default standing heroes use the approved source art. Alternate hairstyles still need to be fitted to the faces. Motion currently uses articulated reference parts. The full set of custom animation sprites and visual checks for equipment across every combination are pending. The review build uses local saves. Physical phone and controller performance have not been measured for this revision.
