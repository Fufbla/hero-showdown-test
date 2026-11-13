# Character head alignment and costume hair — November 13, 2026

## Scope and source

- Repository: https://github.com/Fufbla/hero-showdown-test
- Production baseline: `4203516724094475ac3da9abaf55d75848a94606` on `main` (the live artifact identified source commit `dc789be422a370c8300709d6271f6eaecb191267`).
- Existing release branch inspected: `release/v3-final-cleanup-20261113`, `6cc5868e1c70a6cd3a18d2d0aca424846dbc6342`.
- Fix branch: `fix/v3-head-hair-20261113`.
- Final code commit: `f4ef481c85994d237e20d16eb3adaaa3bf71b69a`.
- The existing published `/royale-v3-staging/` entry redirects to `/royale/`. Pre-release browser testing uses the actual staging source in an isolated preview and CI, followed by the existing filtered production build and GitHub Pages workflow.

## Root causes and fixes

The universal head image was attached using `[128, 200]`, a point in transparent padding below the visible chin. This left a visible gap between the face and the body's authored neck. The renderer now measures the opaque chin in the existing face artwork and registers that point against each complete frame's neck anchor, with one source-pixel overlap to prevent an antialiased seam. The calculation excludes hair and beards, so changing a hairstyle, beard, facial expression or outfit cannot move the attachment. Head size, facial artwork and the hair-to-face transform remain unchanged.

One low Super Kick pose had its neck point above and to the right of the actual neck. Its metadata was corrected to `[127, 144, 0]`; its sprite pixels and gameplay timing were preserved. The existing atlas build helper retains that correction, and the manifest URL is versioned so returning browsers load it.

The uncovered mascot/formal renderer also cleared a padded placeholder rectangle but positioned the chin at the unpadded marker's bottom. It now uses the same visible-chin registration at the lower edge of that cleared rectangle. All three uncovered costume families are covered by a pixel-contact regression.

Hooded costumes explicitly painted only a bald face and excluded the hairstyle from the composed-image cache. They now paint the same complete customized head used by uncovered characters, including original rear and front hair. The existing authored face-opening mask clips the entire head; opaque costume pixels are composited in front. The interior remains black. The hairstyle is included in the cache identity, keeping two co-op players' hair independent even when they wear the same hood. The legacy `hideHair` metadata now identifies a covered head whose hair is contained, rather than suppressing the hair painter.

Existing and future costumes using this hood/opening contract receive containment automatically. No hairstyle-specific assets, costume resizing, new limb rigs, sprite regeneration, save migrations or backend changes were introduced. Steel Body retains its approved featureless metal transformation and restores the original look afterward.

## Verification

Final CI passed: **185/185 release tests and 2/2 universal-head tests**, plus both browser runs.

- 9,048 actual opaque head/body contact checks: original red jacket plus all 12 approved outfits, all 116 frames, masculine/feminine faces and three face shapes.
- 288 additional contact checks: Zombie, Black Business Suit and White Business Suit, all 48 poses, both face presentations.
- 16,464 hood/pose/hairstyle combinations: all 49 hairstyles, all seven hooded costumes, all 48 frames. Every changed pixel stays within the existing face-opening mask. Braids remain visible through every opening.
- Independent same-hood co-op hair caches, costume removal, saved appearance, purchases, invisible armor, combat, power levels and deterministic movement are covered by regression tests.
- Desktop Chromium and mobile WebKit exercise browser canvas rendering, both directions, movement/jump/attack/power previews and the reserved `0000000000` test entry. An existing-style saved fixture with feminine face and braids is loaded, worn in Dolphin, saved and reloaded without appearance/equipment/power corruption. Browser contexts are isolated; no live cloud player is written.
- Initial CI passed: https://github.com/Fufbla/hero-showdown-test/actions/runs/43475989728
- Final CI: https://github.com/Fufbla/hero-showdown-test/actions/runs/43476973647 — all jobs passed.
- Manual Chrome preview confirmed hair within the hood openings and the attached original-jacket head using the reserved test entry.

Limits: mobile WebKit is a browser-engine test, not a physical iPhone Safari session. Physical two-controller hardware was not available for a new hands-on co-op run; shared render and independent-owner/save regressions were exercised. A new live cloud save/logout/reload was not performed for ordinary player accounts because this change is read-only rendering; local saved-fixture roundtrips and the unchanged cloud-save contract were checked.

## Files changed

Runtime and registration:

- `royale-v3-staging/kingjames/head.mjs`
- `royale-v3-staging/kingjames/outfit-engine.mjs`
- `royale-v3-staging/kingjames/outfits/kingjames-original/manifest.json`
- `royale-v3-staging/costumes/face.mjs`
- `royale-v3-staging/costumes/engine.mjs`
- `royale-v3-staging/costumes/catalog.mjs`
- `royale-v3-staging/costumes/review.mjs`

Build helpers and verification:

- `tools/build-kingjames-attacks.cjs`
- `tools/build-staging-costumes.cjs`
- `tools/head-hair-browser.cjs`
- `royale-v3-staging/kingjames/tests/head-alignment.test.mjs`
- `royale-v3-staging/costumes/tests/costumes.test.mjs`
- `.github/workflows/head-hair-tests.yml`
- `.github/workflows/pages-optimized.yml` (bounded test concurrency and native-canvas garbage collection only)
- `docs/head-hair-20261113/` (this report and verification evidence)

No existing artwork/image files, animation timings, world data, combat rules, armor/stat code, save schemas, online multiplayer services or local co-op gameplay code were modified.

## Deployment

**Deployed and verified live.** Final CI passed and the verified code was promoted to `main`. The existing GitHub Pages build and deployment both succeeded:

- Production: https://fufbla.github.io/hero-showdown-test/royale/
- Deployment run: https://github.com/Fufbla/hero-showdown-test/actions/runs/43477568753
- Live release manifest identifies code commit `f4ef481c85994d237e20d16eb3adaaa3bf71b69a`.
- All 219 runtime source hashes in the live manifest match the verified checkout. All 13 downloaded production bundles match their recorded SHA-256 hashes.
- The live original-outfit manifest matches the corrected file, including the Super Kick neck anchor.
- All three production entry pages respond successfully. The browser reload reaches the ready screen with single-player and local co-op options.
- Production remains single-player plus local co-op; online multiplayer and developer tools remain disabled. The save endpoint, profile key and cloud prefix are unchanged.

Full live verification is recorded in `live-verification.json`; final browser results are in `browser-results.json`. `costume-hair-review.jpg` is a screenshot of the verified source preview, showing the same braided character across all ten mascot/formal costumes. The earlier local test logs retain the initial run counts; the final CI linked above contains the final 185 + 2 passing tests.
