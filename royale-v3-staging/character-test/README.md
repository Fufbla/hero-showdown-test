# Action Chibi test 0000000000

Isolated playable character sandbox. Normal game saves and multiplayer are not imported or changed.

Six actions: idle, run, jump, doubleJump, punch, kick. Each atlas has 12 right-facing and 12 left-facing poses (144 total). Whole-character frames; no independent limb rig. Original RGBA colors/alpha are preserved, including eye whites. Atlas export is lossless WebP with padded, ground-aligned 300x362 cells.

The physics loop runs at fixed 60 Hz. Rendering targets 60 FPS; measured FPS is shown and depends on the device. Sprite-pose timing is separate from rendering: 12 poses do not mean 60 unique artwork frames per second.

Keyboard: arrows or A/D to move, Space to jump (twice), J/K for punch/kick, P to pause. Touch buttons and common gamepad mapping supported. Poses opens an inspector for every frame.

No Agility implementation. This task adds movement/combat sprites only; full clothing, powers, and normal-game integration are not included.

Browser QA: pip install playwright; playwright install chromium; python qa/browser_test.py. Set CHIBI_TEST_URL to verify the deployed page.
