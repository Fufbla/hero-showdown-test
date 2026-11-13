# Boss redesign test for 0000000000

This adapter enables the approved redesign on the reserved local V3 test hero.
The shared Royale combat modules and normal V3 cloud accounts are unchanged.

Open V3 staging, enter `0000000000`, then choose **Pause → Boss Test · Choose Opponent**.
The selector offers all seven regional and eight Legendary bosses, with three starting phases.
Each practice fight uses a temporary level-99 copy with maxed powers and ten Health Roots.
**Return to My Hero** restores the saved test adventure. Practice does not write to
the original profile, cloud account, or Legendary reward ledger.

## Presentation

- Each boss has a transparent 4×4 atlas of 16 complete, authored poses: idle,
  walking, melee preparation/contact/recovery, ranged preparation/release/recovery,
  ground/charge preparation/contact/recovery, hit, defeat and phase roar.
- Per-frame crops and ground anchors share one fixed body scale. Frames are
  mirrored for left-facing play. No independent limb rig or layered frame dissolve.
- Body preparation, charge material, soil disturbance, debris, roots, mist and
  physical attack effects replace the old danger rectangles, hatching and labels.
- The existing 77 attack definitions supply timing, damage, range, spawn positions,
  projectile counts and persistent hazard lifetime. The adapter reads that state;
  it does not run a separate damage timer or change attack balance.
- The Scorpion’s delayed contact and Legendary leap landing use their actual
  damage ticks. Ground effects stay in the authoritative low collision band.
- At most three new atlases remain in the runtime cache. Boss simulation waits
  for the selected artwork to load.

## Rebuild and verify

Run `node tools/build-kingjames-staging.cjs` from the repository root. Its last
step regenerates the test-only boss imports and practice integration.

`node --test royale-v3-staging/bosses/tests/combat.test.mjs` checks all 77 attacks
in three phases, both directions and both arena edges, plus cue geometry,
persistent hazards and the 45 boss/starting-phase practice combinations.

`node --test royale-v3-staging/bosses/tests/art.test.mjs` requires
`@napi-rs/canvas` and verifies all 15 atlases, 240 nonempty distinct frames,
transparent backgrounds, crop/anchor bounds, mirrored rendering, canvas state
restoration, cache limits and unchanged combat objects.

Source review: `codex/boss-redesign-review-20261112`, recovered complete design
package at commit `9e43313`. Existing gameplay baseline: `5effb0a`.
