# Solo player corrections — 2026-11-05

Based on approved solo commit 04466d81dc161cded79056177d30861e6831a6e2. Pages rollback: rollback/pages-before-player-corrections-20261105 at 50023e87ef06eaba131376734e27901383260e04.

## Changes
- Per-style front attachment corrections for Buzz cut, High-top fade and Curly fade. Original artwork is unchanged.
- Repair omitted eyelid skin material pixels inside eye feature rectangles, preserving explicit iris/brow channels, sclera and dark outlines.
- Creator preview stays idle; four direction controls remain. Gameplay animations remain intact.
- Standard Gamepad API menus: D-pad/stick focus, A confirm, B cancel, Start pause, shoulder tabs, left/right values, visible focus, scrolling, deadzone and delayed repeats. Held confirmation, reconnection and asynchronous returns to gameplay require release. Back viewing direction is not a cancel action.
- Reveal existing actual equipment stat text on inventory cards.
- Lower Fireball spawn from 45 to 30 units above hero feet so same-platform short enemies overlap its hitbox. Horizontal travel, damage, cooldown, count and piercing are unchanged.
- Regular monster attack events deduplicate per attacker instead of globally suppressing other valid attacks. Boss recovery remains per attacker. Spawn protection, Steel Body and Agility remain effective.

## Verification and limits
Focused tests cover pixel recoloring for both presentations and six skin colors, directional hair metadata, controller edges/reconnection/cancellation, Fireball in both directions against different enemy sizes, actual simultaneous monster strikes, Steel Body and preservation guards. Original artwork, progression/equipment data and save implementation remain byte-identical.

Browser QA uses disposable test heroes and synthetic standard Gamepad API objects, not keyboard substitutions. The full creator/pause/inventory/map/settings/hero/Tree/powers/wardrobe/save/reconnect flow passed at 844x390 and 390x844. The landscape suite passed 120 checks across 568x320, 667x375, 844x390, 932x430 and 1024x768, including save/reload. This is not physical Xbox/PlayStation or iPhone verification. Physical controller text entry, iOS callout behavior and rare reward menu flows still require device testing.

Browser fixtures: tests/player-corrections-browser.html and tests/final-mobile.html. Development test files are excluded from the Pages update. Existing homepage, Story and Versus files are unchanged.

Multiplayer remains disabled by the existing configuration; its implementation is retained. Saves remain browser-origin/device local unless separately linked through the existing account workflow. No storage keys are cleared, migrated or replaced by this release.

## Deployment and rollback
Publish only changed Royale runtime modules/CSS/HTML from this branch onto the latest Pages main tree. Do not merge the development branch wholesale. Verify the GitHub Pages build succeeds and the live module contents match before announcing release. To roll back, create a new commit restoring only these changed Royale runtime files from the rollback reference; do not reset or force-push main.

Final automated results: Royale 1,216 passed, 0 failed, 0 skipped; multiplayer 57 passed, 0 failed, 0 skipped. Legacy root tests: 37 passed, 16 failed, 0 skipped, identical on the untouched baseline and candidate (missing legacy tests/dist/assets paths). No legacy assertions or game files were changed.
