# Compact HUD and controller interface

Development branch: `feature/royale-compact-hud-controller`.
Base and preserved rollback: `f5b14a7dfc1555c257f8f726140294269d36a63f` (`rollback/royale-before-hud-controller-20261105`). This branch is not a live release.

Implemented icon-only 44px visible power squares with 48px targets, vertically above Jump; cooldown fill; existing direct equip; 48 natural skin colors across eight depths and six undertones; custom HSV/hex colors; shared skin shading and repaired eye-region/resting-hand mapping; spatial controller navigation with scroll-grid precedence; reusable masked virtual keyboard; preset/HSV controller picker; select and range interaction; modal input isolation.

No account, authentication, recovery, database, cloud-save, multiplayer, save codec, combat, or original artwork asset changes. The two app integration changes only pass game state to HUD progress and prevent Start from closing both an entry dialog and the underlying menu. Existing exact hex colors remain unchanged in saves.

## Verification

- Baseline: 1,266 Royale tests and 57 multiplayer tests passed.
- Final complete `npm test`: 1,277 passed, zero failed/skipped.
- Multiplayer `npm test`: 57 passed, zero failed/skipped.
- Focused interface/controller tests: 18 passed.
- An earlier concurrent suite run lost one process to SIGKILL; the complete rerun passed. A reduced-concurrency attempt stalled and was stopped.
- Browser layout/save sweep: 84 assertions passed across 568×320, 667×375, 844×390, 932×430 and 390×844. Checks cover squares, vertical order, landscape alignment above Jump, control overlap, empty/equipped icons, direct equip, cooldown progression, custom skin save/reload, and opening map/inventory/settings.
- Synthetic standard Gamepad API checks passed for keyboard opening, letter movement/Confirm, Shift/Space/Backspace/Done, focus restoration, cancel, color presets in four directions, hue adjustment/cancel, fantasy hex, hairstyle row navigation, hair/suit pickers, selects, stick drift and PlayStation-standard Confirm/Cancel mappings.
- Pixel tests cover recolored resting hands/arms, eye-mask protection and lighting transfer. Existing artwork/animation regressions pass. No generated/replaced artwork.

## Limits

Physical controllers, real phones, and Safari have not been tested. Account screens remain gated and unchanged; generic text/password controls are reusable for their later integration. Full end-to-end traversal of every account, reward, wardrobe and sell flow with a physical controller remains a release acceptance task. Do not treat synthetic tests as hardware verification. Do not merge or deploy until separately authorized and account integration is ready.

Open `royale/tests/interface-browser.html` from a local HTTP server to reproduce browser checks. Fixtures use isolated session storage, not real accounts. The hourly Royale monitoring task is disabled; no replacement automation was created.

## Standalone live integration

Integrated only the interface commit delta onto live main 61023685f10f1a1bab19cd019bd0c794728e97c4. No account-branch ancestors merged. Rollback: rollback/royale-before-interface-live-20261105. The original live app receives only HUD-progress and modal-pause isolation changes. Import-map hashes refresh changed interface modules. Live integration focused tests: 18 passed. Account branch remains f5b14a7dfc1555c257f8f726140294269d36a63f.
