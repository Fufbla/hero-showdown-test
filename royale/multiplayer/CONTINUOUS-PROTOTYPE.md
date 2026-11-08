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
