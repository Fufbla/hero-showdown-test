# Hero Showdown Royale — Style C

[Open the workshop](tests/style-c-final-review.html) · [Play the Guardian](index.html?practice=male) · [Play the Sentinel](index.html?practice=female)

Each practice hero begins at level 15 with Fireball, Super Kick, a free slot, eight learned active powers, passive Speed and five unspent points. Practice progress is separate for each hero and lasts in the current tab. [Regular adventure](index.html) uses the normal browser-local roster.

## Artwork and animation

Both standing heroes use RGB from the original approved illustration. The transparent masks remove beach colors along the outline. The face, hair and suit keep their registered source positions at rest. The profile and rear silhouettes come from the supplied turnaround board. Left profiles mirror the right profiles. Artists reconstructed the scalp, rear armor, cape and joints where the references hid those surfaces.

The runtime shares the same artwork across the creator, roster, wardrobe and patrol. There are 48 wearable hairstyles drawn from three directions, plus the bald option. Rear and foreground hair layers move around the face. Seven material colors, ten shape sliders, three ages and four builds are retained in existing hero saves. Facial expressions include a brief five-step blink.

Each hero has 107 authored keys across 25 moves. The two default sets have 214 transparent cels packed in four PNGs. The game uses the registered original for standing and the packed cels during ordinary movement and combat. A custom hero uses the same key schedule with individually registered face, hair, limb, torso, crest, cape and equipment layers. Impact poses take their timing from the existing attacks.

[Frame map and all clip timings](assets/hero/style-c-accurate/sprites/frames.json) · [30-second motion reel](qa/style-c/system/final/hero-motion.mp4) · [Hairstyles](qa/style-c/system/hair/directional-gallery.webp) · [Turnarounds](qa/style-c/system/turnaround/contact-sheet.jpg) · [Original and in-game standing portraits](qa/style-c/system/final/standing-reference.webp)

## Wardrobe and powers

The worn armor atlas includes 101 registered regions for legacy items, regional armor families and all eight Villain Merge themes. Equipped pieces use their catalog colors. The equipment preview now refreshes when a glove, belt, emblem or cape changes, and an equipped emblem takes precedence over the chest's default crest. Any Merge piece gives the cosmetic green aura. Only a complete matching helmet, chest and boots enables the fourth power.

Tap an empty HUD slot, or press its mapped key or controller button, to select a learned power. Use the ⇄ control outside combat to replace or clear a filled slot. Pressing a filled power button activates it. Loadout changes save immediately and preserve the current cooldown and last saved adventure progress. The ↑ button spends one Power Point and upgrades one level.

[Worn sets](qa/style-c/system/equipment/worn-sets.jpg) · [Different angles and movement](qa/style-c/system/equipment/worn-directions.jpg) · [Touch playtest](qa/style-c/system/patrol-portrait.jpg) · [Desktop patrol](qa/style-c/system/patrol-desktop.jpg)

## Verification

- The Royale suite passed 997 tests without failures or skips. All 36 original creatures passed 9,288 rendering checks.
- The final art audit passed 38,655 assertions across 9,800 game-renderer samples. It covered 155 equipment definitions, 1,681 mixed wardrobes covering every legal pair of slot choices, and all 729 combinations of empty or individually selected Merge helmet, chest and boots.
- Focused gear tests rendered 18,600 fit samples and checked 2,960 pupil positions for occlusion. Exactly eight of the 729 Merge combinations grant the fourth ability.
- Retained opaque standing source pixels match the prior registered hero artwork. Both heroes’ retained opaque interiors were within two RGB levels of the uploaded JPEG in the native comparison. The original outline includes some pixels of the beach, and the new matte omits these.
- Cloud Chrome also passed 4,929 visible-rendering and state assertions over 1,793 drawings.
- Browser playtests covered a default Sentinel casting and retaining Flight after a reload, mixed armor from the right side, and a custom Guardian equipping Whirlwind in a 390 × 844 portrait frame. In a 12-second cloud Chrome sample with up to 24 regular enemies, measured frame delivery averaged 59.1 FPS, with a 25.2 FPS one-percent low and a 15.5 ms 95th-percentile simulation and draw time. Physical iPhone and controller playtests remain for hands-on review.

[Final audit record](qa/style-c/system/final/verification.json) · [Creature checks](qa/style-c/system/creatures.json) · [Browser appearance checks](qa/style-c/system/browser-appearance.json) · [Measured browser performance](qa/style-c/system/browser-performance.json) · [Joint fit](qa/style-c/system/motion/joint-details.webp)

## Recovery checkpoints

| Checkpoint | Local game commit |
| --- | --- |
| Protected reference defaults | `2bd36cb` |
| Direct HUD power selection and isolated practice saves | `4a36085` |
| Hairstyles, faces, bodies, and turnaround artwork | `58f9711` |
| Illustrated motion parts and 214 packed cels | `6462cd1` |
| Worn equipment artwork | `904ee4b` |

The asset checkpoints retain the individual artwork. The integration commit wires the completed sets into gameplay. Visual approval and merging into the main game are separate decisions.
