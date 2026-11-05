# Style C — emergency default-artwork approval checkpoint

Date: November 2, 2026 (America/New_York). Branch: `feature/royale-style-c-heroes`.

**The default standing designs are ready for visual review. Full animation production remains paused. This is not a claim that all custom hairstyles, rear views or animation poses are finished.**

## Recovery and scope

The initial GitHub head was `3f8418555b6338f62e1a3a7257a569b6c4b30bc8`. It still used geometric face/body construction plus generated part textures, and its upgrades required confirmation. A recovery branch was created before changes: `recovery/style-c-before-correction-20261102`.

The newer review site's source, `f443d8677e4336c1759cef6e722eff7abd2661bc` (version 4), already held the source-pixel hero renderer, default presets and instant one-point upgrades. Those newer changes were missing from GitHub. They were restored without redesigning them, verified by 986 passing tests, and preserved in recovery commit `d731d96` and local branch `recovery/style-c-source-art-20261102`.

This correction then keeps the intact standing body when the player changes eye color, nose, mouth, eyebrows or emblem. Previously these changes unnecessarily selected the segmented IK body and could shift joints. The changed feature is now overlaid on the original standing artwork. The new regression compares every body pixel below the face for both presentations.

No new hairstyle or animation frames were generated. No existing source art was discarded. New-character presets use the approved short locs/blue-gold male and high textured ponytail/purple-gold female. Existing customized saves retain their selections; choosing a different hairstyle does not turn that selection into an approved default.

## Review

Open [the default artwork approval page](tests/style-c-evidence.html) through the existing static server. It shows equal-scale full figures, six close-up categories, and the real game/HUD in desktop and phone-sized frames. Review heroes use a disposable session-storage namespace, not an existing player slot.

| Evidence | Contents |
| --- | --- |
| [Four-column comparison](qa/style-c/emergency/reference-comparison.png) | Original male / in-game male / original female / in-game female; same source scale and angle |
| [Close-ups](qa/style-c/emergency/closeups.png) | Faces, hair, torso/armor, arms/hands, legs/boots and capes for both heroes |
| [Male phone gameplay](qa/style-c/emergency/gameplay-male-portrait.jpg) | Actual game, HUD, camera and integrated monsters at 390 × 844 |
| [Female phone gameplay](qa/style-c/emergency/gameplay-female-portrait.jpg) | Actual game at 390 × 844 |
| [Female desktop gameplay](qa/style-c/emergency/gameplay-female-desktop.jpg) | Actual game at 1280 × 720 |
| [Automated results](qa/style-c/emergency/automated-tests.txt) | 987 passed, zero failed/skipped |
| [Creature results](qa/style-c/emergency/creatures.json) | All 36 creature renderers, 9,288 checks |
| [GitHub baseline](qa/style-c/emergency-github-baseline.txt) / [recovered baseline](qa/style-c/emergency-recovered-baseline.txt) | 973 and 986 passing tests respectively |

Generate only the static comparison evidence with `node royale/tests/style-c-static-evidence.mjs`. The public hero renderer produces the in-game columns; these are not image-generated gameplay mockups. Historical files outside `qa/style-c/emergency/` belong to earlier checkpoints.

## Source artwork and architecture

The exact approved JPEG is `assets/hero/style-c-accurate/reference.jpeg` (SHA-256 `e05d98f5b2b8d01e0bb50cc6feda77eb6556b401e7d6fa98dd828a13200f950b`). It matches the recovered user upload byte for byte. Original RGB supplies the visible face, hair, skin, costume, gloves, boots and cape. The existing generated `aligned-extraction.png` supplies only the alpha guide. Its generated RGB is not substituted for the approved artwork.

`hero-art.mjs` routes front/game rendering through `style-c-hero.mjs` and `style-c-source.mjs`. The default rest frame uses a single intact source texture at 0.35 world units per source pixel, with uniform scaling. Existing layered body/head/limb/cape paths support the retained customization and provisional motions. `style-c-defaults.mjs`, `creator.mjs`, `appearance.mjs` and `hair-catalog.mjs` preserve preset and saved-feature identifiers. The 49 saved hairstyle IDs remain available.

## Known visual differences and limitations

- Fine alpha fringes and small contour losses remain around hair and boot edges. The native-resolution raster test confirms retained opaque RGB within one rounding unit, not an exact silhouette or a zero-difference image.
- Each source figure is about 330 pixels high and has one standing viewing angle. Enlarged close-ups reveal the source resolution, not new painted detail.
- Hidden joints, scalp beneath the default hair, rear views and concealed cape fabric are not specified. Existing generated cape underlay and inferred rear rendering are provisional and are not part of this default-front approval.
- Custom hair, facial overlays, altered body proportions and equipment remain functional but do not all reach the reference's artwork quality. They have not been presented as finished. The existing non-default hairstyles visible in the supplied creator screenshots are still pending a separate artwork pass after default approval.
- Existing movement can expose cutout seams, particularly at shoulders, hips and knees. No full animation production or additional motion polish was performed.
- At actual phone portrait scale, both heroes' silhouettes, hair and costume colors remain distinguishable; fine face and armor detail requires the close-up view. Browser-size checks are not physical iPhone/Android or sustained-FPS certification.

## Verification and preserved systems

`node --test --test-concurrency=2 royale/tests/*.test.mjs`: **987 passed, zero failed or skipped**. Initial missing PGlite was resolved with the repository's locked dependencies before successful baseline runs.

Native creature validation: **36 creatures, 9,288 passing checks**, covering existing monster/boss renderers, states, phase attacks, facings, transparent bounds and immutable combat state. This is not a claim of manually playing 36 complete battles.

Current browser review: cloud Chrome, actual default male and female gameplay at phone portrait size and desktop views; existing HUD and environment retained. Sampled error logs were extension metadata errors, not game-module errors. Actual screenshots are included above.

The correction leaves `core.mjs`, `renderer.mjs`, `camera.mjs`, `appearance.mjs`, save schemas, world, monsters, boss mechanics, equipment catalogs, loot and portal code unchanged. The recovered instant-upgrade implementation and its transaction tests remain unchanged: one activation spends one Power Point for one level, with no Save/Apply/Confirm flow. No gameplay balance, collision geometry or combat reach was changed. No files outside `royale/` were changed in the GitHub repository. No merge into `main`, Story or Versus was performed.

**Approval requested only for the default male and female standing designs shown in the four-column comparison. Animation production stays stopped until explicit approval.**
