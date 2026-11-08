# Local co-op development verification

Date: November 8, 2026. Branch: `feature/royale-v3-local-coop`.

## Change boundary

The branch starts from stable V3 commit `005ea3288f211e77496dce8d7b5a6910ba827304`. Existing gameplay, renderer, artwork, save backend, online transport, and cloud schemas are unchanged. The only existing file edited is `royale-v3-staging/index.html`, adding the local co-op entry. All implementation is under `royale/local-coop/`, with the loopback-only test server in `tools/serve-local-coop.mjs`. No main merge or Pages deployment was performed.

## Automated results

97 tests passed, 0 failed, including 55 local co-op tests and 42 existing combat, loot, and controller-menu regressions. Command is in README.md. Coverage includes:

- Separate accounts, three slots, credential renewal, independent queues, simultaneous and coalesced writes.
- Lost responses, stale revision fences, newest offline checkpoint restoration, foreign snapshot protection, and blocked departure after failed final save.
- Two independent controller inputs and stable assignments after disconnect.
- One enemy simulation and shared boss object; simultaneous damage, one death, exact XP conservation across level-ups, alternating odd remainders, and dead partner rewards.
- Individual coins, per-hero first/repeat boss eligibility, independent chest claims, no duplicate rewards.
- One equipment roll, matching independent copies in either pickup order, full-inventory independence, expiration, and snapshot restoration.
- Offscreen margin, safe surface selection, obstacle/enemy/hazard avoidance, preserved progression, and repeat-teleport protection.
- Both Ready, cancel Ready, independent upgrades and caps, all eight active powers checkpointing during combat.
- Either player leaving, camera leadership transfer, same world identity, normal solo rewards, continued saves, and concurrent departures staying paused.

## Real cloud verification

`tests/live-cloud-results.json` records a successful run against the existing V3 Edge Function using exactly two NEW test accounts. Only new Slot 1 heroes were seeded; Slots 2 and 3 remained empty. No existing user code was read, entered, or modified. Codes and tokens were never logged or saved in the report.

Both heroes saved/restored separate positions, XP, coins, and independent copies of one equipment item. Updating account 1 did not modify account 2. An old revision was rejected while the newer snapshot survived. Invalid bearer authorization could not write. Backend source inspection confirmed profile ownership is derived from the session and saves use compare-and-swap revisions. No backend change or migration was needed.

Browser-to-loopback-to-cloud connectivity was also checked using only an invalid-format code; the expected validation rejection was returned. No account was loaded by that probe.

## CPU measurements

Node.js v24.22.1; 300 warm-up and 1,800 measured simulation ticks per scene. These measurements exclude rendering, hardware input, display scanout, and cloud networking. Reproduce with `node royale/local-coop/tests/cpu-benchmark.mjs`.

| Scene | Mean ms/tick | p95 ms/tick | Maximum ms |
| --- | ---: | ---: | ---: |
| Idle | 0.081 | 0.131 | 2.850 |
| Running | 0.079 | 0.146 | 4.810 |
| Jumping | 0.064 | 0.119 | 4.459 |
| Enemies | 0.063 | 0.117 | 4.055 |
| Powers | 0.127 | 0.221 | 7.829 |
| Boss | 0.045 | 0.083 | 4.275 |
| Checkpoints | 0.089 | 0.130 | 6.345 |

## Hardware checks still required

No physical controllers are attached to this environment. USB/Bluetooth compatibility on Windows/macOS, controller-to-display latency under 50 ms, stable 60 FPS, and stable 30 FPS on a weaker computer are not verified. The browser harness uses synthetic standard Gamepad objects through the actual input module, not physical Bluetooth or USB devices.

Before publication, play on the target computer with two controllers: connect/assign; move, double-jump and attack together; use all equipped powers; disconnect/reconnect each device; cross the screen edge and platforms; fight a boss; pick up both copies; fill one inventory; independently upgrade and toggle Ready; leave as each player; reopen both heroes; and observe combat autosaves under a temporary internet interruption. Measure FPS and input-to-display latency on that hardware. No approval to publish is requested based solely on simulation results.

## Known behavior and limitations

- A controller returning at a different browser Gamepad index does not silently replace the original assignment. Safely end and reassign if the OS changes the index.
- Teleport waits if no safe visible landing position exists.
- A failed final save keeps that hero present and paused for retry, rather than losing the pending checkpoint.
- Newer foreign cloud snapshots are protected; competing local checkpoints are retained but not automatically merged.
- Boss fights restart on reopen according to existing save rules. Level-99 heroes receive no additional XP under the existing level cap.
- Ordinary uncollected loot expires after 20 seconds even during pause. Collected equipment persists normally.
- The managed browser preview is internal QA. There is no public test deployment. Run the included local server to play this branch without modifying the official game.

## Browser verification and performance

The final integrated browser run passed all 17 assertions, using two simulated controllers, one actual canvas and the actual application loop. It exercised both players, shared boss health, both equipment pickups, offscreen teleport, disconnect/reconnect, simultaneous menu upgrades, Ready cancellation, independent worker checkpoints, and Player 1 leaving with Player 2 continuing. Each practice profile completed 17 saves; observed timer intervals were 7,983.4–8,016.7 ms. The 30 FPS rendering option was also selected through the UI and solo pause/resume was checked. No physical frame rate is inferred from that selection.

The cloud browser often supplied animation frames about 1,016 ms apart despite much shorter simulation processing. Observed throughput was 0.98–2.79 rendered FPS. This environment therefore did **not** verify the 60 FPS target. Rendering spikes up to about 65 ms occurred in the small enemy/boss samples and require a real desktop profile before publication. Browser memory values below are JavaScript heap only, not total GPU/process memory. The raw report is `tests/browser-results.json`.

| Scenario | Observed FPS | Frame p95 ms | Simulation p95 ms | Draw p95 ms | JS heap end MB |
| --- | ---: | ---: | ---: | ---: | ---: |
| Idle | 2.79 | 1016.5 | 1.2 | 3.2 | 32.41 |
| Both running | 0.98 | 1016.5 | 2.5 | 4 | 31.35 |
| Both jumping | 0.98 | 1016.5 | 4.6 | 6 | 33.71 |
| Multiple enemies | 1.62 | 1016.5 | 3.2 | 65 | 37.24 |
| Simultaneous powers | 1.12 | 1016.5 | 4.4 | 3.7 | 32.91 |
| Boss battle | 1.06 | 1016.5 | 6.8 | 59.8 | 32.85 |
| Equipment pickup | 0.98 | 1016.5 | 6.4 | 6.5 | 32.87 |
| Offscreen teleport | 0.98 | 1016.6 | 3.9 | 3.6 | 32.14 |
| Independent pause upgrades | 0.98 | 1016.5 | 0 | 6.1 | 32.2 |
| Autosaves during combat | 1.39 | 1033.1 | 1.9 | 4 | 33.12 |

## Files added or edited

| Files | Purpose |
| --- | --- |
| `royale-v3-staging/index.html` | New local co-op menu entry on this branch only |
| `royale/local-coop/index.html`, `style.css`, `app.mjs` | Integrated setup, gameplay, HUD, independent menus and lifecycle |
| `session.mjs`, `authority.mjs`, `equal-xp-authority.mjs`, `protocol.mjs`, `room-rules.mjs` | Shared local world, combat, rewards and departure |
| `input.mjs`, `teleport.mjs` | Separate controller polling and safe offscreen recovery |
| `cloud.mjs`, `serialize.mjs`, `json-worker.mjs`, `config.json` | Isolated authentication, checkpoints, revisions, recovery and worker serialization |
| `tests/*.mjs`, `tests/*results*` | Automated tests, browser harness, live-cloud probe and measured evidence |
| `README.md`, `TEST-REPORT.md`, `review/*.png` | Run instructions, verification report and review screenshots |
| `tools/serve-local-coop.mjs` | Local test server with restricted cloud relay |

File paths in rows without a prefix are relative to `royale/local-coop/`.
