# Approved illustrated environments

Original environment artwork generated from the user's approved November 15,
2026 concepts. Seven WebP panoramas follow `WORLD_REGIONS` themes; `terrain.webp`
contains seven 192-pixel material rows in the same order:

`coast`, `forest`, `factory`, `cave`, `mutant`, `energy`, `final`.

`environment-paintings.mjs` draws a bounded parallax panorama, subtle ambient
motion, and terrain on the existing collision edges. Two region images and the
shared terrain sheet are retained in memory. The full collection is below 3 MB;
each region loads on demand. The previous procedural renderer remains the
loading/error fallback. The existing day/night clock supplies the night state.

No collision geometry, enemies, progression, account, cloud-save, or XP code is
changed. Interactive trees, camps, portals, and legendary arena scenery retain
their existing behavior.

## Verification

- 315 release tests passed, including panorama coverage, asset budget, fallback,
  collision-edge and save-preservation checks.
- Browser review covered all seven regions with the production renderer and
  character artwork, plus two heroes, night, an 844x390 landscape canvas, the end
  of the world, and the highest platform route. No physical-phone performance or
  real-controller claim is implied by the viewport review.
- `royale/qa/environment-refresh-2026-11-15.jpg` records the reviewed coastal
  scene. QA files are excluded from the published artifact.
- Optional local review: run the normal release build, then
  `node tools/build-environment-review.cjs`. Re-run the normal release build to
  remove that local-only review page before publication.
