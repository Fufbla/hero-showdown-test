# Cooperative multiplayer validation — November 7, 2026

Development branch: `feature/royale-v3-coop`. All tests used disposable heroes.
No live hero was changed, no database migration was applied and no build was
published to the official site.

## Automated results

`npm test --prefix royale/multiplayer`: **89 passed, 0 failed**.

| Players | Real socket join and lobby | Shared movement/combat | Conserved XP | Shared pickup race | Independent 8-second checkpoints |
| --- | --- | --- | --- | --- | --- |
| 2 | Pass | Pass | Pass | Pass | Pass |
| 3 | Pass | Pass | Pass | Pass | Pass |
| 4 | Pass | Pass | Pass | Pass | Pass |
| 5 | Pass | Pass | Pass | Pass | Pass |

Also verified: sixth player refused; nonleader start refused; start below two
refused; paused lobby; only connected damage contributors rewarded; stable XP
remainders for totals 0–501 with 2–5 participants; no repeated rewards; health
scaling and no disconnect exploit; 20 equipment and 10-root limits; 20-second
ground expiry; independent equipment IDs/stats; existing nine powers; seven
regional boss fights/phases and individual chests; eight Legendary encounters'
warning and permanent-reward behavior; creator departure; grace expiry;
reconnects; SQLite restart; lost cloud response retry; newer cloud revision
protection; same-hero replacement; release race; all seven region checkpoint
captures; pending-save/region-change serialization; death-save recovery;
parent/child roster acknowledgement; shared-browser account cache/message isolation; stale local receipt rejection; two visible
slots and stored third slot preservation.

The staged SQL was executed using disposable PostgreSQL (PGlite), including
service-only RPC permissions, active-writer fencing, revision CAS, exact retry,
lease expiry and unaffected other slots. This is not a claim of a deployed
Supabase RPC integration test.

The original Royale regression suite reports **52 passed and 1 historical scope
assertion failed**. That assertion compares the entire repository to old
interface branch commit `61023685f10f1a1bab19cd019bd0c794728e97c4`, allowing only
its original interface edits. It also fails on clean current main
`5defeb33c626d19755b26f030b5e7b840f6b4b77`. It is unrelated to multiplayer
behavior and was not disabled or edited. The new safety test separately verifies
that artwork, core simulation, powers, progression, equipment, boss modules and
solo save implementation are byte-identical to current main.

## Browser observations

Five independent Chromium tabs signed in with disposable ten-digit codes,
selected existing heroes, joined one room and started. Observed states included
1/5 with Start disabled, 2/5 with Start enabled, and 5/5. Guest movement and named
heroes appeared in the same world. Eight-second save receipts continued. The
creator used Save & Return to Heroes successfully; four guests remained connected.
A fresh tab restored the creator's fixture cloud hero and rejoined the room.
After account-cache isolation, two tabs sharing normal localStorage signed in
with different codes, joined, started and returned to their own saved roster.

Phone-sized portrait (390×844), landscape (844×390) and tablet (768×1024) viewport
harnesses exposed the existing joystick, combat buttons and compact room status.
The landscape canvas resumed rendering after iframe focus; background-tab drawing
is intentionally suspended by the existing input/visibility behavior. This is
layout/control observation in Chromium, not a physical iPhone/iPad/Android test.

After peer-delta/compression changes, a fresh two-browser session again created,
joined, started, moved, displayed both names and saved. Old tabs open across the
intermediate protocol edit reported a stale peer format; reloading the complete
updated frontend resolved that development-only mismatch. Production protocol 3
clients are explicitly rejected by protocol 4 before hero selection.

Screenshots:

- [Five-player lobby](five-player-lobby.jpg)
- [Phone portrait](phone-portrait.jpg)
- [Phone landscape](phone-landscape.jpg)
- [Final shared-world view](shared-world.jpg)
- [Independent saved hero roster](isolated-roster.jpg)

## Network and load sample

A separate automated test injected ordered **120–200 ms round-trip delay/jitter**
into real WebSocket connections. Movement, peer state, saved position and
reconnection passed. TCP/WebSocket packet loss, real mobile radio handoffs and
physical devices were not simulated by this test.

The reproducible 20.11-second five-player local sample used a disk-backed SQLite
WAL database and disposable cloud bridge. Results are in [local-load.json](local-load.json):

| Measurement | Result |
| --- | ---: |
| Simulation ticks | 1,207 |
| Tick time, 95th percentile | 11.96 ms |
| Maximum observed tick | 25.33 ms |
| Process RSS, including five local test clients | 243.8 MiB |
| Actual outgoing socket traffic per player | 17.1 KiB/s |
| Independently checkpointed profiles | 5 |
| Cloud writes including joins and final saves | 20 |
| Recorded client/authority errors | 0 |

The earlier sample was about 99.06 KiB/s per player without the new peer deltas
and compression. The reduction was about 83% in this scenario. These short local
samples do not certify hosting capacity or sustained internet performance.

## Before a public test or live integration

1. Approve the persistent server option and any separate test-database cost.
2. Build the supplied container; Docker was unavailable in this workspace.
3. Deploy one authority with a persistent volume and isolated disposable
   authentication/save backend. Configure an exact preview origin and WSS URL.
4. Apply the lease migration to that test backend and verify actual ten-digit
   session authentication, cloud RPCs, revisions and two-device restoration.
5. Run sustained five-player tests across seven regions, regular bosses and
   Legendary bosses on the chosen host. Test crashes, proxy restarts, backups,
   half-open sockets, interrupted saves and reconnect after the grace period.
6. Test physical iPhone, iPad, Android and desktop browsers over separate internet
   connections. Measure noncreator latency and memory before setting capacity.
7. Obtain integration approval before changing the official game or live save DB.

Public multiplayer URL: **not available yet**. The localhost QA URL requires the
local fixture server and is not a shareable online game.
