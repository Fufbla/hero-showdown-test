# Isolated Supabase multiplayer prototype

This extends `feature/royale-private-rooms`; it does not replace the existing WebSocket authority, lobby, tests, or single-player release. The test uses the existing Supabase project `adakwbhxiuatjvphutgo` and the separate `royale-mp-test` Edge Function. No paid hosting or plan upgrade was enabled.

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
- The Edge Function reconstructs the authoritative room graph, advances elapsed simulation (at most one second per request), then commits it with a Postgres version compare-and-swap. Conflicting invocations retry; damage, defeat flags, reward distribution and hero checkpoints commit atomically.
- Damage contributors divide the monster's base XP equally. Indivisible remainders rotate between contributors. A 100-XP two-person reward is 50 each; capped Level 99 heroes remain capped. Solo kills retain the original calculation. A brief disconnect retains earned credit.
- Realtime Presence announces connected clients. Read-only Postgres Changes carries sanitized visual frames for heroes and shared enemy health. Private inventories, credentials and complete saves are not published. HTTP responses remain the authoritative reconciliation path.
- `royale_mp_test_heroes`, `royale_mp_test_rooms` and `royale_mp_test_frames` are isolated from existing saves. RLS denies public reads/writes to private tables. Only sanitized recent frames permit public reads. Both RPCs are service-role-only, SECURITY INVOKER with a fixed search path.
- The server alone reads its built-in secret. Frontend code contains only the existing publishable key. Existing save-code verification is relayed to the existing V3 function; copying reads the selected snapshot and creates a new test identity. It never calls the original save action.
- Checkpoints target eight seconds during connected play, with immediate saves for commands/rewards. The complete room runtime is durable on every successful sync. No client owns the room simulation, so a creator disconnect transfers the host role without destroying the world. An OS-suspended device cannot send heartbeats; its confirmed progress remains stored.

## Verified on 2026-11-07

- 91 multiplayer/unit/database checks and 42 targeted single-player checks passed.
- Two independent browser sessions created/joined a six-digit room, started play, rendered both heroes, and showed one hero moving while the other remained still.
- Live server combat via normal inputs: a 14-XP bottle enemy gave 7 XP to each contributor. A second 20-XP slime gave 10 XP each (7 → 17 for both). Original 34/48 monster HP was retained. Repeated input did not duplicate an already-issued reward.
- Real Supabase Realtime subscription received five database change frames.
- Independent cloud revisions advanced during an 18-second check; observed checkpoint separation was approximately 8.2 seconds. Creator disconnect, host transfer, continued movement, reconnection and retained XP passed.
- A newly created disposable source profile was copied exactly; its original snapshot/revision remained identical after test saves. The last player could leave safely.
- Five clients joined; a sixth was refused. The five-client stress run encountered one transient busy response in 51 requests. The client retries automatically.
- The official main SHA remained `5defeb33c626d19755b26f030b5e7b840f6b4b77`; its published V3 HTML SHA-256 matched the original: `82fd7a2930e43caabab260fee5e84cebb3eca92d41b0034a4f5b28ca36eae0b0`. The original V3 Edge Function remained version 3.

## Measured limitations

This is a functional playtest prototype, not a low-latency production certification. Live request medians were **479–550 ms**. Runs including initial connections and contention reached **4.7–5.9 seconds**; the five-client run had a **4.9-second p95** and one retry. Local prediction helps movement, but authoritative combat can visibly lag. These results measure this Edge/Postgres request design and this test network; they do not demonstrate an inherent failure of Supabase Realtime itself.

Physical iPhone/iPad Safari, mobile networks, extended five-player combat, large boss encounters and long reconnect/background cycles still need device playtesting. Progress is isolated while those checks continue. A separate paid server has not been shown necessary by these tests; the next comparison should measure sustained input-to-hit latency on the actual devices and evaluate a more continuous Supabase authority before any purchase.

## Reproducing

```sh
npm ci --prefix royale/multiplayer
npm test --prefix royale/multiplayer
node royale/multiplayer/supabase-test/build-test.mjs /path/to/isolated-site/dist
```

The build copies the approved assets and patches only the output's storage namespace and transport configuration. It never edits `royale/app.mjs`, the official V3 wrapper, or GitHub Pages publication settings. The migration is additive. Bundle `edge.mjs` with esbuild for Deno, then deploy only the `royale-mp-test` function with its own token authentication. Regional requests target the existing database's `us-west-2` region.

Opt-in live checks: `node royale/multiplayer/tests/supabase-live-test.mjs` and `node royale/multiplayer/tests/supabase-realtime-live.mjs`. They create disposable test identities only; session fixtures live in `/tmp` (or `MP_TEST_FIXTURES`) and must not be committed. Sanitized measured evidence is in `verification.json`.
