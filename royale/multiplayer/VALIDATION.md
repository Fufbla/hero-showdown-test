# Multiplayer development validation — 4 November 2026

## Repository and preservation

Base: `defec8c3d66a8a12cef9bf22d49eeccd835e6ce6` on
`feature/royale-power-armor-integration`. The new isolated branch is
`feature/royale-persistent-multiplayer`.

All new runtime code, tests and reports are under `royale/multiplayer/`. The sole
existing-file change is an explicit list of these authorized new paths in the
historical preservation test scope. Assertions protecting artwork, source
simulation, progression, equipment and solo saves remain unchanged. A new test
also verifies the entire pre-existing solo implementation against the base SHA.
No main, Story Mode, Versus Mode, approved art or existing player data was modified.

## Automated results

| Suite | Passing | Failing | Skipped |
| --- | ---: | ---: | ---: |
| Existing Royale baseline | 1,189 | 0 | 0 |
| Existing Royale after additions | 1,189 | 0 | 0 |
| New multiplayer tests | 47 | 0 | 0 |
| Final distinct automated tests | **1,236** | **0** | **0** |

Commands:

```sh
node --test --test-reporter=tap --test-concurrency=2 royale/tests/*.test.mjs
npm test --prefix royale/multiplayer
```

The concurrency setting bounds raster-test memory; it selects the same existing
Royale tests as `royale/package.json`. No tests were deleted or assertions relaxed
to conceal failures. Unrelated legacy root/Scorpion suites were not rerun in this
multiplayer change; the counts above are specifically the Royale suites.

Verified through independent WebSocket clients: four players join one room,
server-simulated movement, creator departure, disconnect/reconnect, identity
replacement without duplicates, ownership checks, rejected forged damage, and
reconstruction of committed state deltas. Load runs also connected 8 and 16
independent synthetic clients; see timing failures below.

Verified through engine/storage tests: each contributing player receives the
original regular-monster XP/coin amounts exactly once; all seven regional boss
phases and chest ownership; all eight Legendary shared warnings and individual
completion records; all nine power upgrades/activation compared with solo;
position/HP/equipment/progression retention through mode changes and disk restart;
mid-combat persistence; command retries; writer fencing; disconnect grace; import
empty-slot rules; and respawn protection for every nearby player.

Regional boss tests use level-99 test heroes and reposition them into attack
range before sending original punch inputs. Legendary completion tests use a
controlled server-side defeat setup. These are not claims of complete natural
browser boss fights. Production imports remain disabled until verified migration
exists; tests explicitly enable the isolated import adapter.

## Local load results — release gate not passed

Final run: four 15-second samples, durable SQLite writes enabled, Node v24.22.1,
server and simulated clients sharing the development process. The workspace
reports 8 available CPUs and an 8 GiB cgroup memory limit. These are **not**
Hostinger resources. Raw results: [qa/local-load.json](qa/local-load.json).

| Clients | Simulation Hz | Tick p95 ms | Input confirmation p95 ms | RSS MiB | Outgoing KiB/s | Budget |
| ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 2 | 52.57 | 14.68 | 222.98 | 129.5 | 95.5 | Fail |
| 4 | 58.60 | 16.45 | 58.24 | 177.1 | 320.4 | Pass |
| 8 | 44.39 | 37.44 | 582.86 | 194.8 | 792.8 | Fail |
| 16 | 58.00 | 41.40 | 88.74 | 210.5 | 3648.0 | Fail |

Budget: at least 57 simulation ticks/second, tick p95 below 16.67 ms, input
confirmation p95 below 150 ms, all clients connected, no protocol errors. One
sample passed and three failed. Initial/JIT, GC, storage and shared-process
variation are included; this is not a long soak. The non-monotonic results do
**not** establish a reliable four-player capacity. Earlier runs also showed
variable two/four-player timing. No sustainable production count is claimed.
Snapshot processing, persistence stalls and bandwidth scaling need more work,
then isolated server/client and WAN tests on the intended host.

## Browser and mobile verification

The disposable review page launched in Chrome. Its initial relative script URL
was incorrect when served at `/`; that source URL was corrected. The subsequent
reload was explicitly blocked by browser URL security policy, so there was no
successful browser multiplayer movement/combat verification. The restriction was
not bypassed. No updated gameplay screenshot, iPhone Safari, portrait/landscape,
real account or full menu-flow success is claimed.

## Remaining release blockers

- Production interface/menu integration and atomic migration/fencing of existing
  local/cloud saves; currently only the transport and disposable review exist.
- Live account authentication; the configured Supabase project has no deployed
  Royale account function or hero tables. Existing unrelated tables are untouched.
- Shared control-effect ownership and remaining boss/disconnect edge cases listed
  in [README.md](README.md), plus comprehensive browser/device playtests.
- Repeatable performance within budget, real hosting inspection, proxy/TLS setup,
  production durability/backup checks and an appropriately conservative capacity.

There is no published multiplayer build or working public multiplayer URL yet.
The previously published solo game remains unchanged. Hosting findings and exact
server capabilities are in [DEPLOYMENT.md](DEPLOYMENT.md). No plan was purchased,
upgraded or changed, and no DNS or production deployment was attempted.
