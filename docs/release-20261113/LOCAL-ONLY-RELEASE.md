# Local-only production release — 2026-11-13

Resumed from `7d04ae594a2cb1066af719b3770b554104ea2996` on the same release branch. No online backend work or production deployment was performed. The original rollback point remains intact.

## Changes

- Removed the disabled online multiplayer placeholder from the release menu; even an explicit enabled override cannot instantiate an online menu or connection.
- Removed the online client dependency indirectly imported by a loot helper; the helper retains identical local pickup behavior. Shared in-memory simulation and runtime serialization used by local co-op remain intact.
- Excluded the raw multiplayer route directory from the production artifact. Development source and service remain unchanged for future work.
- Added artifact mode metadata and regression checks for online transports/routes, menu DOM writes and forced-enable attempts.
- Retained migration-receipt protection for previously linked local backups; did not clear receipts or overwrite saves.

## Results

- **183/183 release tests passed**, including the original 177 checks plus online isolation, controller setup navigation and artwork-cache verification. See `corrected-release-tests.txt`.
- **40/40 original co-op requirements tests passed** against their original module graph. See `legacy-coop-tests.txt`. Running these legacy assertions against V3 initially failed 12 cases because they expect superseded free travel, 100-coin boss rewards and ordinary equipment drops. Current V3 reward/travel tests pass; no approved economy was reverted to satisfy obsolete expectations.
- **2/2 backend deletion tests passed** in an isolated PGlite database using PGlite 0.3.14. No live deletion or schema modification occurred. See `backend-deletion-tests.txt`.
- **Live co-op cloud PASS:** actual release `CloudProfile` and `LocalSession` classes authenticated two QA accounts, independently saved both heroes, and restored inventory, equipment, powers, appearance, XP and coins in fresh sessions. Three-slot isolation passed. Autosave configuration remains 8000ms. See `local-coop-live.json`.
- A first terminal call lacked the browser Origin header and received 403; after adding the actual GitHub Pages Origin to the test adapter, one 503 occurred, then a single retry passed. No application workaround or backend change was introduced.
- All prior 43 existing saves passed release compatibility. A fresh post-check read confirmed the same original 39 profiles / 117 slots / 43 occupied saves and unchanged aggregate snapshot/revision fingerprint `3844e6edccc289d940949901e5165f90`. Only the two designated QA heroes received test writes.
- Browser: packaged main menu showed cloud login, local co-op and browser heroes, with no online option. Local co-op loaded both account panels and controller selectors. No game-origin JavaScript errors were observed; extension-only metadata errors were ignored. No physical controllers were available and Start remained disabled.
- GitHub Pages settings were opened directly; GitHub showed a signed-out 404. The connector cannot retrieve Pages administration settings. Workflow files are configured for a filtered Actions artifact, but the repository setting itself is not verified.

## Remaining release gates

1. Physical two-controller playtest and manual results, including independent cloud restore. User explicitly requires results before deployment.
2. Packaged-browser cloud roundtrip on the allowed live origin. API/runtime integration passed, but this is not equivalent to a browser-origin playtest.
3. Confirmation that Settings → Pages → Build and deployment → Source is GitHub Actions, with no branch-based publish path racing the filtered artifact.

`readiness.json` remains false. Online service HTTP 400/version-9 issues are explicitly out of scope. Production and staging were not deployed or changed. No claim of developer-tool removal on the unchanged live site is made; removal is verified in the candidate artifact.

## Short physical-controller procedure

Use the current V3 staging local co-op page to verify hardware/gameplay behavior: https://fufbla.github.io/hero-showdown-test/royale-v3-staging/local-coop/ . This is existing staging, not the newly packaged release. Final browser cloud checks must also be completed on the packaged candidate before promotion.

1. On one computer, connect two controllers and press a button on each. Enter two distinct ordinary account codes, load different saved heroes, assign different controllers, mark both Ready, and start. Do not send account codes in the test report.
2. Move, jump, punch, kick and use powers independently. Confirm one shared screen, Player 1 camera, and Player 2 returning safely near Player 1 when far off-screen.
3. Defeat enemies and a boss. Confirm shared XP (an odd point alternates), full individual coins, independent eligible legendary rewards/chests, and separate inventory/equipment/power HUDs. Ordinary monsters/chests should retain the approved no-equipment rules.
4. Pause from each controller and resume with both players ready. Change one hero's equipment; confirm the other is unaffected.
5. Wait at least 10 seconds and confirm both Saved indicators. Exit safely, reload, sign in again and confirm each hero's own level, XP, coins, equipment and appearance. Check ordinary single-player loading too.
6. Report each step Pass/Fail, browser/OS/controller models, and any visible error; do not share secret account codes.

Separately report the current GitHub Pages Source setting. Do not change deployment settings or merge the release until all gates pass.

## Deployment authorization and gate resolution

User subsequently confirmed that all four physical co-op steps passed, including both saved heroes restoring after reload. User supplied a Pages settings screenshot showing branch publishing, then confirmed saving the requested change to GitHub Actions. User explicitly approved deployment afterward.

Pre-release cloud verification is supported by both the actual packaged-runtime cloud integration test and the user's successful live browser save/reload. The localhost preview cannot independently contact the service because CORS is restricted to the production GitHub Pages origin. This is a preview restriction, not a confirmed game defect. We do not claim a separate pre-publication packaged-browser roundtrip. The release gate is cleared based on the combined evidence and user confirmation; post-publication checks must still be reported separately.

No gameplay, save schema, backend, data, or online service changes accompany this gate update. Rollback remains `rollback/pre-v3-final-release-20261113` at `af68f4ea08b0ceee920e7ec5d0e6f9a4098ee97b`.
