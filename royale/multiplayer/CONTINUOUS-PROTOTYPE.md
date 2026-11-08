# Continuous multiplayer authority — November 8, 2026

This resumes the existing Node/WebSocket implementation on `feature/royale-private-rooms`. It is a local prototype, not a replacement deployed behind the current phone test URL. No hosting was purchased or activated.

## Changes

- Keep rooms and their 60 Hz simulation in one running process. Existing server code already supports this; no new game implementation.
- Publish authoritative state at 20 Hz (50 ms intervals), up from 10 Hz. Keep periodic SQLite commits at 10 Hz and immediate dirty/reward commits. This reduces snapshot waiting but doubles state-message bandwidth approximately.
- Share the Supabase prototype's equal base-XP policy with the continuous server. Preserve contributor filtering, reward deduplication, monster health, independent inventory and equipment, and host succession. HTTP worker expiry behavior remains separate.
- Keep the existing eight-second checkpoint system. The benchmark uses fixture cloud storage; it does not claim real Supabase saving is verified for a new host.

## Reproduce safely

Use Node 24 or newer:

```sh
npm ci --prefix royale/multiplayer --ignore-scripts
npm test --prefix royale/multiplayer
npm run benchmark:continuous --prefix royale/multiplayer
npm run dev --prefix royale/multiplayer
```

The review server binds to loopback at `http://localhost:4175`. Open two browser sessions using different fixture codes (`1111111111` and `2222222222`), select the fixture hero, create a room, join its six-digit code, and start. This is not an iPhone-accessible deployment. The review server intercepts cloud requests in memory, without editing the official game source. Fixture accounts and progress are disposable. Never expose this fixture server to the Internet.

`qa/continuous-benchmark.json` records two- and five-client comparisons at 10 and 20 Hz. Each run lasts 24 seconds and sends 30 inputs per second per player through a TCP proxy adding 25 ms in each direction. Every input covered by an authoritative acknowledgement is measured, including coalesced inputs. Measurements include simulation and snapshot waiting, not browser rendering or input sampling before submission. No packet loss or variable network jitter is simulated. Temporary SQLite is real; cloud storage is an in-memory test bridge.

## Before a hosted phone test

A persistent WebSocket process with durable storage and TLS is still needed. The existing stateless Edge path is not silently switched, and this benchmark does not show that a paid Supabase tier would fix it. An isolated cloud-save adapter and exclusive session ownership must be verified before attaching the continuous process to test identities. Never let the HTTP authority and continuous authority write the same hero concurrently. Do not point this prototype's V3 bridge at original player saves.

Then repeat two-device and five-player tests against the hosted endpoint, including real save delays, reconnects, boss visibility, fresh sessions, XP splitting, and restart recovery. Under-100-ms latency is a goal, not a guaranteed outcome. The official single-player files remain unchanged.

## Isolated cloud connection and hosting proposal

The additive `royale_continuous_test` migration is installed in the existing Supabase project. It creates one server-only, RLS-protected table and three SECURITY INVOKER RPCs. There are no grants to public, anon or authenticated. The security advisor's no-RLS-policy INFO is expected for a table intentionally restricted to service_role. Existing unrelated game advisories were not changed.

`ContinuousTestBridge` copies a **confirmed HTTP-test snapshot** into a new identity, preserving the source. Clients retain a random destination ID and 64-hex token before calling `/test/copy`, so a lost response can retry the same receipt. Slot 3 is refused. The database serializes lease acquisition, grants one writer for 120 seconds, and rejects superseded or expired writers. Checkpoints renew leases every eight seconds during play. Revision checks reject stale saves; an identical retry returns the already-written checkpoint. A new process may need to wait up to 120 seconds after the previous process stops. Temporary database failures retain local SQLite recovery. Never reuse source credentials as destination credentials.

`continuous-server.mjs` accepts only isolated test authentication; it disables original-account migration and new-hero creation. Its copy endpoint requires an allowed browser Origin and source test credentials. Use this entry point, **not** the original `server.mjs`, for the hosted prototype. Store the service-role credential only as a server environment secret, never in a build artifact, URL, browser, or chat message.

Live database verification passed copy/retry, exclusive ownership, lease takeover, stale-writer rejection, unchanged source snapshot, and revoked public access. All temporary verification rows were rolled back. This verifies the SQL contract, not hosted HTTP round trips or phone saving. The adapter was separately tested against local PostgreSQL-compatible PGlite. End-to-end hosted checkpoint timing and restart recovery remain required.

Proposed hosting: Render Virginia, one `0.5c-512mb` service ($7/month), 1 GB persistent disk ($0.25/month), approximately **$7.25/month base**, plus applicable bandwidth/other usage and taxes. This is a starting test size, not a guaranteed capacity or latency result. The checked Render docs list both Virginia and this compute plan. Free Render cannot attach this persistent disk and loses local data on restart; Railway Hobby is another option with a $5 minimum and usage-based charges. No service, subscription, or paid resource has been created.

Deployment proposal: `render-continuous.yaml`, Dockerfile `Dockerfile.continuous`, repository root build context. Docker is unavailable in the development runtime, so image construction is still to be verified on the host. The Node entry point was tested locally. Set the exact isolated website origin and server secret in the provider dashboard. Keep one instance and one durable volume; do not enable autoscaling. `/health` verifies process/disk readiness only, not cloud-save readiness.

After hosting approval, configure the frontend copy/profile workflow and WSS endpoint in a separate build, verify HTTPS/WSS, run real two-client saves and restart recovery, then phone/tablet testing. The existing phone URL remains on the Supabase prototype until these checks pass. No claim of a new playable deployment is made.

Sources checked November 8, 2026:
- https://render.com/pricing
- https://render.com/docs/compute-plans
- https://render.com/docs/regions
- https://render.com/docs/disks
- https://render.com/docs/free
- https://docs.railway.com/pricing/plans

## Responsive controls and 30 Hz experiment

The continuous WebSocket client now enables the existing local prediction and presentation smoothing. Movement and attack animation state advance without waiting for a network response. Authoritative snapshots still decide damage, health, XP, inventory and saves. The client keeps a bounded queue of inputs, removes acknowledged inputs, and replays only the remaining sequence numbers. This continuous simulation path intentionally does not use the stateless HTTP worker's timestamp-replay rule.

Small position corrections use the existing smoothing. New rooms, heroes and connection generations reset presentation history. Remote heroes use authoritative snapshots in the existing interpolation buffer, with a 33 ms minimum for the continuous client. The Supabase client's existing 50 ms minimum is retained. Boss/helper object identities are preserved for artwork preparation. Disconnected input does not continue local prediction; excessive unacknowledged input triggers reconnect rather than unbounded replay.

The isolated `continuous-server.mjs` entry point now publishes at 30 Hz (every 33.3 ms). Generic `startServer` keeps its 20 Hz default for comparison. Physics remains 60 Hz; disk commit and cloud-save schedules are unchanged. The performance badge reports input-confirmation timing, not pure network ping.

`npm run benchmark:continuous --prefix royale/multiplayer` now compares 20 and 30 Hz and writes `qa/prediction-benchmark.json`. The previous 10/20 Hz evidence remains in `qa/continuous-benchmark.json`. Faster publication increases bandwidth. The two- and five-player results must be evaluated separately; a median below 75 ms is not a promise that slower responses or physical devices will meet that target.

This work remains on the development branch. It does not deploy a paid host or change the current phone link. Hosted and physical-device validation are still outstanding.

Clean comparison (synthetic 50 ms RTT, 24 seconds each, fixture cloud; 123 tests passed before the run):

| Players | Updates/sec | Median confirmation | 95th percentile | Total outbound |
|---|---|---|---|---|
| 2 | 20 | 79.11 ms | 101.83 ms | 176.29 KB/s |
| 2 | 30 | 63.18 ms | 86.55 ms | 263.51 KB/s |
| 5 | 20 | 80.58 ms | 105.75 ms | 810.3 KB/s |
| 5 | 30 | 88.17 ms | 97.9 ms | 1213.17 KB/s |

All runs reported zero errors and four fixture checkpoint writes per hero. With five players, 30 Hz improved the 95th percentile and frame spacing but worsened median confirmation. This is a mixed result, not proof of universal latency improvement. Physical-device feel, bandwidth constraints and real hosted timing remain unverified.
