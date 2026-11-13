# Approved production release

User approved promotion after staging review on November 13, 2026.

Live commit: 98166011d151fe6fd3c639bd21db529ac0dce0d0
Live URL: https://fufbla.github.io/hero-showdown-test/royale/
Successful workflow: https://github.com/Fufbla/hero-showdown-test/actions/runs/43518471764
Rollback branch: rollback/pre-live-interface-20261113

210 production/interface/save checks and 7 starter-suit checks passed in GitHub Actions.
Live manifest verified the exact commit, 28 outfits, unchanged cloud prefix/profile key/backend endpoint, no database migration, local co-op enabled, and online multiplayer disabled.
Live browser startup completed without game errors. The seven pause actions were initialized in order; the store module was present; computed styles confirmed the vertical pause menu and white store background. No real player account was selected or modified.
Authenticated live purchases and cross-device saves were not retested. Reserved-account purchase, reload and responsive visual checks were completed in staging/local QA before approval. Production does not expose the reserved test shortcuts.
