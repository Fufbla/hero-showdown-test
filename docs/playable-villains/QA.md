# Combined build QA — 2026-10-26

- 614/614 automated tests passed. Full TAP output: `../combined-all-tests.tap`.
- 40/40 browser integration checks passed, covering 936 render states, 144 ordered fighter pairings, both player slots, mirror isolation, Pause move lists, keyboard/touch dispatch, virtual controllers, focus loss, all CPU difficulty levels, Harbor and Tempest hazards, results/rematches, Story exit, and co-op exit.
- Phone viewport review passed at 390×844 and 844×390: move lists scroll vertically without horizontal overflow; all eight touch buttons fit. The visible CPU menu flow selected Medium, Dr. Styro, Bushman, and Buckroe Beach successfully.
- All twelve punch and special release poses were visually reviewed in both facing directions.
- Production HTML and all approved animation source/art remain byte-identical to the preceding performance build.

The test page is `dist/playable-villains-test.html`; the optional visual/check harness is `dist/combined-versus-review.html`. The root launchers serve `dist/` locally.

Physical controller compatibility, touchscreen behavior on actual devices, target-device frame pacing, live two-device internet co-op, and subjective balance require the at-home playtest. These results do not certify a minimum frame rate.
