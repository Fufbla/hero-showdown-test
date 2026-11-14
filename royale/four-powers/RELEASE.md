# Four powers: production release, 2026-11-14

Promotes the approved Super Strength, Super Kick, Animal Allies and Seismic Smash implementation from the isolated four-powers branch. The production renderer uses the existing approved art, character appearance and authored animations. The reserved test-code route remains isolated, with its free review controls excluded from production bundles.

Animal Allies selects distinct nearest valid enemies in range. Each selected enemy receives the full listed damage; the Panther's two contacts divide that target's damage. The six-second cooldown is unchanged.

| Skill level | Animal | Maximum enemies |
| --- | --- | --- |
| 1–4 | Wolf | 1 |
| 5–9 | Hawk | 2 |
| 10–14 | Bear | 3 |
| 15–19 | Panther | 4 |
| 20 | Spirit Stag | 5 |

## Paid skill reset

Tree of Eris → Upgrade Powers contains a confirmed 1,000-coin reset. All learned ordinary skills return to level zero, all invested points return to the unspent pool, and the three ordinary equipped slots clear. Hero level, XP, appearance, inventory, world progress and Villain Merge remain intact. Unspent points stay available. Existing cooldown debt is preserved.

Local-only heroes commit the exact fee and refund durably before applying them to the active game. Code-based solo heroes use the authenticated launcher; local co-op uses each player's own authenticated profile. Both call `reset-powers` with the current slot revision. The server validates the incoming complete checkpoint, calculates the fee and point refund, and commits both in a single revision-checked update. A monotonic `powers.resetRevision` fences stale tabs and prevents normal saves from inventing a reset. An uncertain acknowledgement blocks further writes until reload.

The cloud function remains `royale-v3-staging`, which already serves the production game's code-based accounts. `backend-v3/baseline` contains the exact previous version-12 source; `backend-v3/deploy` contains the version-13 source. The existing custom session authentication, owner filtering, origin validation and `verify_jwt: false` setting are retained. No database schema changes or account-balance edits are required. Backend folders never enter the public artifact.

## Verification

Release compatibility checks cover the existing saves, wardrobe, appearance and local co-op. New tests exercise every Animal Allies skill level, nearest-target caps, per-target damage, timing, boss damage, cooldowns, save serialization and matching solo/co-op rendering. Paid-reset tests run the actual bundled backend against a revision-aware mock database, including duplicate requests, missing authentication, incorrect origin, missing confirmation, insufficient funds, stale saves and lost acknowledgement. Browser checks cover cancel, exact fee/refund, reallocation and reload using a local-only fixture.

Production publication uses the existing optimized GitHub Pages workflow. Its complete release, rendering, isolated-test and local co-op browser gates must pass before Pages deployment.
