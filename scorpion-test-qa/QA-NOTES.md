# Scorpion animation approval test

Prepared October 26, 2026. This is an isolated test overlay for the existing Chapter 3 game. It is awaiting the owner's visual approval and physical-device performance review. Production entry points are unchanged.

## Implementation

- Canvas 2D skeletal skinning of the existing approved image: eight three-bone walking legs, two shoulder/elbow claw chains, independent pincer pivots, and ten tail armor links. A fourth rear leg on each side reuses the authored rear-leg pixels at a foreshortened scale.
- World-space planted feet, alternating four-leg groups, smooth lifted transfers, consistent knee bend directions, and fixed bone lengths. The stationary boss keeps its existing position and facing; this does not introduce locomotion or change AI.
- Critically damped body weight shifts, abdomen mesh breathing, attack anticipation, recoil, heavy recovery, and impact impulses. The legs solve against the moving body while their stance contacts remain fixed.
- The tail is a connected 3D chain projected into the original front view. Each link remains 65 world units long, with natural foreshortening as the tail twists. Delayed joint waves and impact pulses are projected back onto fixed-length constraints. The arch turns upward during aiming. The original stinger attack anchor remains authoritative.
- Claws retain the native weapon transforms and original sweep timing. Arm IK connects the moving body to the original wrist sockets. Pincer motion is confined to the existing claw artwork.
- Simulation time drives animation. Both depth passes reuse one pose. Pause, hit-stop, special locks, and hero swaps freeze the presentation with the native encounter.
- No new raster image files. Additional cached canvas textures use 4,973,208 bytes (about 4.74 MiB). No network service or third-party animation library is required.

## Preserved gameplay

The entire authoritative `boss-core.js` is unchanged. It matches GitHub main commit `41cbc7ebe38b676b61a454fc1f3f1ccf7f63bd28`, as retrieved during this task. Its Git blob ID is `fa65e31b59d891785d566059974b133513f6208e`.

HP remains 650. Four alternating resolved claw swings precede the poison stinger. Early claw counters still count once. Claw damage is 12, poison damage 18, claw-counter damage 18, and reflected self-sting damage 150. All durations, target-lock timing, body hitboxes, claw contact transforms, stinger contact transforms, specials, defeat events, and chapter transitions remain native.

The base game, `boss-parts.png`, boss renderer, story wrappers, and regular HTML entry points have not been edited. The test page injects the new renderer only into its own game iframe. Other chapters and Versus delegate to the original functions. The existing painted defeat sequence remains intact.

## Verification completed

- **639/639 repository tests passed**, including all existing hero/villain, control, story-switch, and competitive tests and 25 scorpion tests. Full result: `all-tests.tap`.
- **25/25 scorpion tests passed again** after making their paths usable in both the source repository and the update folder. Result: `unit-tests.tap`.
- Geometry was sampled over complete attack cycles at eight target positions, including both arena limits. Checks cover leg lengths, fixed stance contacts, outward coxa joints, exact claw anchors, ten fixed-length tail links, tail bend limits, root/socket attachment, and finite coordinates. Tail socket tolerance is 0.001 world pixel; it is a numerical IK tolerance, not visible separation.
- Matching native/rigged combat traces include counters and self-stings. Identical final poses at 30/60/120/144 render schedules verify that render frequency cannot alter combat or articulation.
- **27/27 browser checks passed** in the actual Chapter 3 page. They include a natural four-sweep cycle through the game's update function, a real hero punch reflecting a dodged sting, exactly 150 damage after return, pause/hit-stop/tag freezes, recovery/dissolve rendering, unchanged model snapshots, normal Shore rounds, and returning to Versus. Final run used Super Sadie. Result: `browser-checks.json`.
- Visual inspection covered idle, sweeping claws, stinger strike, and self-sting stagger. Desktop, 390×844 portrait, and 844×390 landscape layouts were inspected. Real live play with Super Vee, touch tagging to Summy, punch input, and pause/resume were exercised. Start was also checked with Sadie.
- JavaScript syntax, local-launcher dependency checks, Python installation validation, and shell launcher syntax passed. Windows/macOS launcher behavior still depends on Python being installed on the owner's machine.

## Performance evidence and remaining approval

On the final browser run, 180 boss draw samples had a median of 0.40 ms and a 95th percentile of 1.30 ms. 180 full game update-and-draw samples had a median of 1.20 ms and a 95th percentile of 2.20 ms. These are CPU submission timings in one cloud Chrome environment, excluding display/compositor/GPU waits. They are not measured sustained FPS and do not certify 60 FPS on all devices.

Please review the animation's appearance and play on the intended computers and phones before approving production integration. Mobile layouts were checked at phone dimensions in a desktop browser; physical Android/iOS devices and Safari were not available for this test. The owner handles any later GitHub upload.

## Reproduce

After merging this update beside the existing game, run `python3 start-scorpion-test.py --check` to validate compatibility, then `python3 start-scorpion-test.py` to play. Use **Run animation checks** for the browser checks. With Node installed, run `node --test scorpion-test-qa/scorpion-rig.test.cjs` from the merged game folder.

In the development repository the test is `tests/scorpion-rig.test.cjs`; the game assets are under `dist/`. The isolated development branch is `dev/scorpion-rig-test-local`, based on local combined-test commit `1ca6ce7db1a7434ef24bd4e87324f0d0b99e2a00`. Nothing was pushed or deployed.

## Unchanged baseline SHA-256

| Existing file | SHA-256 |
| --- | --- |
| hero-showdown.html | c78a3ae0383be69780a11f9c131cf37131f5726bfd341ecafd5b4a57bad84472 |
| assets/shore/boss-core.js | 9aa1e4df937f4429c2f5a4a5819fb301d04692bf07d5d57d29dbffb69c2222ff |
| assets/shore/boss-parts.png | a69b822ac60774273cecafb3bdda5889e07349aa137d09740aebb2eb88c3e7fc |
| assets/shore/boss-renderer.js | 79ccf7c9f496bc6fe0a15a0ca463ec80bd8d1b8d5b54b7ed214461575d22bfb3 |
| assets/shore/story-shore.js | 82b73ed811d0bcd522d1f694b998076a3ba4ee42d3392a5e6beef027ec8a82b0 |
