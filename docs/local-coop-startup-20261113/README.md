# Local co-op startup repair

Baseline live commit: `98166011d151fe6fd3c639bd21db529ac0dce0d0`.

Rollback branch: `rollback/pre-local-coop-startup-20261113`.

## Reproduced root cause

Two isolated accounts, with saved heroes in different slots, reproduced the
deployed failure in Chromium:

```text
TypeError: game.enemies is not iterable
  at drawPowerWorld (shared-AHIOASLK.mjs:7362:22)
  at Renderer.draw (shared-AHIOASLK.mjs:18872:27)
  at frame (shared-AAPGZ23O.mjs:1555:16)
```

Co-op used `Object.create(game)` as its render view and added only an own `loot`
property. The attack-effects renderer spreads that view, dropping the inherited
game fields, including `enemies`. The first frame throws before it can schedule
the next animation frame. Save restoration and spawning had already succeeded.

Reproduction: https://github.com/Fufbla/hero-showdown-test/actions/runs/43530380808

## Repair

- The co-op render view retains own enumerable runtime fields and Game methods,
  while replacing only the visual combined loot list.
- Startup validates its first complete frame before activating input/autosave.
- Startup is guarded against duplicate starts and has a 30-second loading bound.
  Timed-out loads cannot later start another session or replace active slot lists.
- Render failures return to setup; later failures attempt independent checkpoint
  saves. The controller/setup frame loop survives and retry remains available.
- Single-player rendering, combat rules, save formats, accounts, costumes and
  online multiplayer settings are unchanged.

## Verification

- 211 active release checks passed, including the new exact-failure regression.
- Real save-service integration passed for two pre-existing QA-only accounts;
  independent saves and fresh-session reloads preserved progression and other slots.
  See `cloud.json`; no existing player accounts were accessed or written.
- Production-bundle browser checks passed for startup, two simulated controllers,
  movement isolation, powers, pause/resume, shared camera, follower teleport,
  eight-second autosaves, leave/restart, one frame loop/one timer, first-frame
  failure/retry and later-frame checkpoint recovery.
- Browser evidence: https://github.com/Fufbla/hero-showdown-test/actions/runs/43530899907
- Physical USB/Bluetooth controllers are not available in the runner; controller
  testing uses the standard Gamepad API with two independently simulated devices.
- Additional legacy teleport/power tests passed. Three old loot-drop assertions
  expect regular monsters to drop equipment; they conflict with the approved
  current rule in gameplay/journey.mjs (regular monsters award only coins and XP).
  Those obsolete tests are outside the active release gate; that rule was preserved.

The publishing workflow now gates publication on the real production-page
browser regression. A separate post-deployment run checks the live manifest's
exact source commit and repeats the browser regression, including single-player.
Live success is reported only after that run passes.
