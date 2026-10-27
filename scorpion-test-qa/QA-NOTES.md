# Scorpion mobility and claw refinement

Prepared October 27, 2026. This updates the isolated Chapter 3 approval test from the saved complete game package. The regular game entry points remain unchanged.

## Result

The former two-link arm largely followed the rigid claw sprite. The refinement adds a separate forearm degree of freedom behind the striking palm. Shoulder, elbow, wrist and palm form a connected three-link chain. The forearm uses the existing painted pixels, rotated around the palm seam without stretching. Native palm/finger position and rotation remain authoritative for contact.

Feet finish their current transfer, then hold fixed world-space positions during the fast sweep. Body loading, forearm lag, pincer anticipation/closure and damped recovery coordinate with those planted feet. Counter and self-sting impulses travel through the arms and body. The active claw stays in front through recovery. Gentle resting tail movement joins the existing body breathing and connected ten-section tail.

The review page now provides left/right claw replay at normal, half and quarter speed, pause, frame stepping and an eight-frame sequence. Replay protects the preview hero from damage so hit-stop does not interrupt the sequence; **Start / restart boss battle** always starts a fresh normal encounter with the original rules.

## Preserved behavior

`assets/shore/boss-core.js` is byte-identical to the saved baseline, Git blob `fa65e31b59d891785d566059974b133513f6208e`. Its health, damage, hitboxes, phase durations, counters, target lock, four alternating swings before the stinger, 150-damage self-sting, specials and defeat events are unchanged. This statement concerns the saved source used for this test, not a new comparison with remote GitHub.

The approved `boss-parts.png`, base boss renderer, Story wrappers, production entry points, competitive combat files and new playable-villain assets are unchanged. Only the isolated test injects the scorpion renderer. No new image assets, external animation dependency, upload, push or deployment were used.

## Validation

- **644/644 available repository regression tests passed**, including the existing character, controls, competitive, story-switch and scorpion suites. See `all-tests.tap`.
- **30/30 focused scorpion tests passed.** Geometry was sampled over full attack cycles at eight target positions. Tests cover fixed bone lengths, foot planting, tail attachment/bend limits, native contact transforms, and finite geometry. New checks cover all eight planted feet during fast sweeps, elbow articulation and bounded per-step movement, forearm-to-palm registration, gradual pincer closure, and early counters on both sides.
- The sampled elbow angles stayed between approximately 49 and 108 degrees. Maximum normal elbow/wrist travel was approximately 2.30 world pixels per 1/120-second step. Arm length error stayed below 0.000001 world pixel.
- Native and rigged combat traces remain identical, including counters and self-stings. Render schedules of 30, 60, 120 and 144 Hz reach identical final poses under the same fixed simulation ticks.
- **29/29 browser checks passed** in the actual Chapter 3 game. These include real hero punches countering each claw for 18 damage, four alternating sweeps, a dodged stinger reflected by an actual punch for 150 damage, pause/hit-stop/tag behavior, normal Shore rounds and returning to Versus. See `browser-checks.json`.
- Visually reviewed both claw sequences, attached forearms, planted stance, recovery, and desktop/phone-sized layouts. Live play was exercised with Vee in portrait and Sadie in landscape; touch jump/punch controls were exercised. The readout confirmed the live boss clock advancing.
- JavaScript syntax, ZIP contents, unchanged-file comparisons and the local launcher's compatibility check passed.

## Performance and approval

In cloud Chrome, 180 boss draw samples had a median of approximately 0.30 ms and p95 of 0.60 ms. The 180 full update-and-draw samples had a median of approximately 0.60 ms and p95 of 1.20 ms. These are CPU submission timings, excluding compositor/display/GPU waits; they are not sustained FPS measurements. Cached image textures use 6,504,328 bytes, about 6.20 MiB.

The playable test is ready for visual approval. Physical phones, computers, controllers and Safari still need hands-on testing; browser viewport checks do not certify 60 FPS on every device. Production integration remains pending that approval, and the owner handles any later upload.

## Reproduce

From the merged game folder, run `python3 start-scorpion-test.py --check`, then `python3 start-scorpion-test.py`. Use **Run animation checks** in the review page. With Node installed, run `node --test scorpion-test-qa/scorpion-rig.test.cjs`.

The isolated local branch is `dev/scorpion-claw-refine`. Source changes are confined to the scorpion test files, tests and documentation.
