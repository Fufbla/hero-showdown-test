# Isolated Supabase multiplayer prototype

This extends `feature/royale-private-rooms`; it does not replace the existing WebSocket authority, lobby, tests, or single-player release. The test uses the existing Supabase project `adakwbhxiuatjvphutgo` and the separate `royale-mp-test` Edge Function. No paid hosting or plan upgrade was enabled.

Test URL: https://hero-showdown-royale-multiplayer-test.fufbla.chatgpt.site/

Deployment succeeded. The hosted URL's private sign-in gate loads, but gameplay behind that gate remains unverified in the cloud browser: the final Apple sign-in was declined. Do not describe the hosted end-to-end check as complete. The exact packaged frontend was checked through the managed preview with the deployed Supabase backend. `verified-two-clients.png` records that live-backend test, not an authenticated session on the published domain.

Publication uses the existing Site `appgprj_6aee76cfa5e0819194fd2c878b0c36f6`. Source is in the Site's own repository. The first deployment was `appgdep_6aee7e92079481919ae9193247aea25d` at Site source `19cda49da663033f740352bd4fb92aa6c7b42586`; subsequent deployments retain the same URL and private audience. Do not recreate the Site or purchase infrastructure.

## Playing on two devices

1. Open the isolated test URL on each device. Its Site is private to the owner; sign into the same ChatGPT account if prompted.
2. Enter the normal **ten-digit save code**, choose a saved hero, and create a separate test copy. Alternatively create a disposable Level 1 test hero. Choose different heroes on the two devices.
3. Select **Play test hero**, then **Create Multiplayer Room** on the first device. Confirm Create in the room dialog and share its **six-digit room code**.
4. On the second device select **Join Multiplayer Room**, enter that room code, and join. The host selects **Start Adventure** when both are present.
5. Use the existing movement, jump, punch, kick and power controls. Damage the same enemy with both heroes to share its XP.
6. **Test heroes** returns to the test character selector. **Save & Return to Heroes** leaves a room after five seconds outside combat. Returning to a linked test hero reconnects it to its room.

Test progress remains in this environment. It is not copied back to the original hero. Test session credentials stay in each browser; clearing that browser's test storage removes its local access to the test copy. Slot 3 is hidden.

## Authority and persistence

- Reuses the 60 Hz `Authority`, original combat, monster health, abilities, items and world generation. Test-only HTTP input expiry is one second to accommodate request latency; the existing socket transport keeps its 250 ms limit.
- Inputs and commands are validated by the existing protocol. The client never submits trusted damage, XP, positions, equipment or inventory snapshots. Local prediction is presentation only.
- The Edge Function reconstructs the authoritative room graph, advances elapsed simulation (at most one second per request), then commits it with a Postgres version compare-and-swap. Fractional simulation ticks carry across requests so extra players do not slow the world clock. Damage, defeat flags, rewards and checkpoints still commit atomically.
- Damage contributors divide the monster's base XP equally. Indivisible remainders rotate between contributors. A 100-XP two-person reward is 50 each; capped Level 99 heroes remain capped. Solo kills retain the original calculation. A brief disconnect retains earned credit.
- Realtime Broadcast now carries bounded cosmetic movement at 10 Hz for two players, decreasing to 4 Hz for five. A 100 ms presentation buffer smooths arrivals; extrapolation stops after 120 ms and falls back to server state after 750 ms. Only known peers in the current zone are rendered. These public-channel messages are untrusted: they never update authoritative positions, health, XP, inventories or saves. Presentation spoofing is possible in this isolated prototype; combat spoofing through movement messages is not accepted.
- Realtime Presence announces connected clients. Read-only Postgres Changes carries shared enemy health and server visuals. Private inventories, credentials and complete saves are not published. HTTP responses remain the authoritative reconciliation path.
- `royale_mp_test_heroes`, `royale_mp_test_rooms` and `royale_mp_test_frames` are isolated from existing saves. RLS denies public reads/writes to private tables. Only sanitized recent frames permit public reads. All three RPCs are service-role-only, SECURITY INVOKER with a fixed search path.
- The new sync RPC authenticates, queues validated intentions and reads the room in one trip. Every simulator sees both players' queued inputs. A sync retries at most twice, then returns committed state without falsely acknowledging unapplied inputs; pending inputs survive a CAS conflict. Network-response loss retries the same sequence. Menus get priority over automatic syncs. Normal sync cadence targets 330 ms start-to-start, replacing the old extra 200 ms after every response.
- The server alone reads its built-in secret. Frontend code contains only the existing publishable key. Existing save-code verification is relayed to the existing V3 function; copying reads the selected snapshot and creates a new test identity. It never calls the original save action.
- Checkpoints target eight seconds during connected play, with immediate saves for commands/rewards. The complete room runtime is durable on every successful sync. No client owns the room simulation, so a creator disconnect transfers the host role without destroying the world. An OS-suspended device cannot send heartbeats; its confirmed progress remains stored.

## Lag update verified on 2026-11-07 (Edge version 8)

`lag-verification.json` contains the measured results, including failures/limitations rather than a latency guarantee.

- 99 multiplayer/unit/database tests and 42 selected single-player tests pass.
- Latest real-transport run: 184 movement packets, **29 ms median / 42 ms p95 / 98 ms maximum** transport latency. Rendering adds the documented 100 ms buffer. This is test infrastructure, not physical device Wi-Fi.
- Matching 40-request sync samples: median **387 → 305 ms**, p95 **640 → 569 ms**. The artificial additional 200 ms wait is also removed. These short samples are not a guarantee of the same percentage on every network.
- The latest complete transport run still had **317 ms median / 3,514 ms p95 / 6,650 ms max** HTTP requests including setup. A 65-request five-player check had **455 ms median / 5,945 ms p95 / 6,444 ms max**, zero busy errors, and rejected the sixth player.
- Instrumented request example: **3,821 ms** client round trip, **363 ms** inside the handler. The excess is outside the instrumented game handler; this does not identify whether routing, startup, a proxy or the client network is responsible. Supabase Edge logs over 01:55–02:04 UTC reported 1,519 requests, 263 ms median, 574.5 ms p95, 1,465 ms maximum.
- A fresh live 34-HP bottle fight awarded **7 XP to each of two damage contributors**. Both clients saw the shared HP reach zero. Replaying the same input sequence did not repeat the reward.
- The final backend retained independent eight-second checkpoints (8.325 seconds observed), creator departure, continued guest movement, host transfer, reconnection and both heroes' earned XP.
- Browser preview against the deployed backend rendered both heroes and independent movement; `lag-two-clients.png` captures the normal player view. Physical iPhone/iPad performance remains unmeasured.
- Official V3 HTML retained SHA-256 `82fd7a2930e43caabab260fee5e84cebb3eca92d41b0034a4f5b28ca36eae0b0`. The original save function remained version 3 with the same hash. Main advanced independently to `470890d142a9b19889dd1db4c4b6005ce369e7f0`; this task only writes the multiplayer feature branch and isolated Site.

## Initial prototype verification (before the lag update)

- 91 multiplayer/unit/database checks and 42 targeted single-player checks passed.
- Two independent browser sessions created/joined a six-digit room, started play, rendered both heroes, and showed one hero moving while the other remained still.
- Live server combat via normal inputs: a 14-XP bottle enemy gave 7 XP to each contributor. A second 20-XP slime gave 10 XP each (7 → 17 for both). Original 34/48 monster HP was retained. Repeated input did not duplicate an already-issued reward.
- Real Supabase Realtime subscription received five database change frames.
- Independent cloud revisions advanced during an 18-second check; observed checkpoint separation was approximately 8.2 seconds. Creator disconnect, host transfer, continued movement, reconnection and retained XP passed.
- A newly created disposable source profile was copied exactly; its original snapshot/revision remained identical after test saves. The last player could leave safely.
- Five clients joined; a sixth was refused. The five-client stress run encountered one transient busy response in 51 requests. The client retries automatically.
- The official main SHA remained `5defeb33c626d19755b26f030b5e7b840f6b4b77`; its published V3 HTML SHA-256 matched the original: `82fd7a2930e43caabab260fee5e84cebb3eca92d41b0034a4f5b28ca36eae0b0`. The original V3 Edge Function remained version 3.

## Measured limitations

Movement now bypasses the database request path, but authoritative combat can still visibly lag. The current HTTP outliers above mean this is not a low-latency production certification. Broadcast delivery itself was fast in these tests. The remaining HTTP delays measure this Edge/Postgres request design and this test network, not an inherent failure of Supabase Realtime. A paid plan or separate server has not been demonstrated to eliminate them.

Physical iPhone/iPad Safari, mobile networks, extended five-player combat, large boss encounters and long reconnect/background cycles still need device playtesting. Progress is isolated while those checks continue. A separate paid server has not been shown necessary by these tests; the next comparison should measure sustained input-to-hit latency on the actual devices and evaluate a more continuous Supabase authority before any purchase.

## Reproducing

```sh
npm ci --prefix royale/multiplayer
npm test --prefix royale/multiplayer
node royale/multiplayer/supabase-test/build-test.mjs /path/to/isolated-site/dist
```

The build copies the approved assets and patches only the output's storage namespace and transport configuration. It never edits `royale/app.mjs`, the official V3 wrapper, or GitHub Pages publication settings. The migration is additive. Bundle `edge.mjs` with esbuild for Deno, then deploy only the `royale-mp-test` function with its own token authentication. Regional requests target the existing database's `us-west-2` region.

Opt-in live checks also include `supabase-movement-live.mjs` (shipped transport and rendering adapter) and `supabase-combat-live.mjs` (fresh two-player normal-input fight). Build the SDK first. Set `MP_TEST_FIXTURES=/tmp/royale-combat-fixtures.json` for an isolated combat run. Fixture credentials must never be committed. Initial measured evidence remains in `verification.json`; new results are in `lag-verification.json`.
