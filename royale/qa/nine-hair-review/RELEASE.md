# Approved hairstyle release — November 6, 2026

Chris explicitly requested publishing the previously approved hairstyles to the live game. This supersedes the development-only publication status in the earlier review README.

Release source: `9aa33295fe34757d023a3087ab767cf9a6a7d6b4` on `feature/royale-v3-nine-hair-fixes`, three commits ahead of live baseline `5defeb33c626d19755b26f030b5e7b840f6b4b77`, with no missing main-branch changes.

The release uses the approved nine hair plates and original-face material fixes without regenerating artwork. The only additional runtime change is the artwork module cache versions in `royale/index.html`. That entry point is the game iframe loaded by `royale-v3-staging/`.

## Release checks

- All 63 existing targeted regression tests passed, with no failures or skips.
- Verified 1,080 hairstyle animation/direction/equipment frames and 2,184 pixel-identical unchanged-art frames, plus the preceding short-hair regressions.
- Production eight-second autosave measured 8,004 ms between snapshots for each visible hero slot. Complete appearance, progress, equipment, exact position and health matched the test fixtures; the hidden third slot remained unchanged.
- Save/account code, V3 cloud wrapper, combat, existing body/cape artwork and multiplayer files remain byte-identical to the live baseline.
- Refreshed cache versions for all eight changed or new artwork modules so previously cached pages can load the approved renderer.
- The local browser runner could not open a listening socket in this execution environment, and the cloud browser could not reach localhost. Public browser verification follows the Pages deployment using isolated test heroes; no existing player account or save is needed.

Reproduce the existing regression suite with the command in `README.md`. The browser harness is `royale/tests/nine-hair-game.html`; the production entry point is `royale-v3-staging/`.
