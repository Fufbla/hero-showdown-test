# Persistent multiplayer development branch

This is an **in-progress authoritative backend**, not a production multiplayer
release. It lives on `feature/royale-persistent-multiplayer`, based on verified
solo commit `defec8c3d66a8a12cef9bf22d49eeccd835e6ce6`. The existing solo game,
approved artwork and combat/progression source files are unchanged.

## Implemented

- Server-owned room membership, cryptographically random ten-character join codes
  (50 bits), validated room joins, measured-capacity configuration and overload
  admission checks. The creator has no owner/host role after creating the room.
- One server hero object across private solo and shared rooms. Switching copies
  authoritative runtime state, retaining exact coordinates, HP, facing, inventory,
  Power Points, equipment, cooldowns, attack-hit sets and personal completion data.
- A 60 Hz authoritative simulation using the existing `Game`, immediate durable
  progress events and 10 Hz position commits/broadcasts with graph deltas and region/distance
  interest filtering. No client damage, coordinate or reward updates are accepted.
- Shared enemy/boss objects, original attack calculations, individual contribution
  rewards, personal chest claims, and individual Legendary completion records.
- Ordered idempotent menu commands, stale connection replacement, disconnect
  grace and reconnect recovery. One hero cannot have two active connections.
- SQLite WAL transactions commit the complete authority graph before confirming
  changes. Competing writers are fenced; corrupt state fails closed. A durable
  graph preserves references and Sets through process restart, not just a safe
  out-of-combat save. No new cloud schema was applied to the shared Supabase project.
- Production WebSocket authentication validates an existing Supabase token with
  its Auth service; the client never chooses its account identity. Test identity
  authentication is injected only by tests/review code, not by the production CLI.
- A browser transport plus a disposable integration review using the original
  renderer, controls and artwork. The review is clearly marked as development.

## Not finished / not verified

- The production game UI, account flow and old local/cloud write paths have **not**
  been migrated to the new authority. Do not connect real hero saves yet.
- The existing cloud account backend is not deployed in the configured Supabase
  project. Live authentication and an atomic old-cloud-to-authority migration need
  implementation/verification before cutover. Local import is disabled in the production transport. Its test adapter validates
  structure and empty-slot/source-ID rules; it cannot prove historical earnings.
- Simultaneous Roots/Whirlwind ownership, repeated multi-target charge contacts,
  disconnects during compound powers, all arena transitions and all equipment/menu
  combinations need further shared-combat regression coverage and correction.
- Browser multiplayer gameplay was **not** verified. The review page opened;
  after correcting its script URL, browser security policy blocked the necessary
  reload. No successful browser combat, mobile-layout or iPhone Safari claim is made.
- Hostinger account resources are unknown. There is no deployed WebSocket URL,
  tested hosting capacity, production soak result or Internet-latency result.
- The local load test is intentionally a release gate; failures are reported,
  not used to invent a production capacity. See `qa/local-load.json` and
  `VALIDATION.md` for actual measurements.

## Run tests

```sh
cd royale/multiplayer
npm ci --ignore-scripts
npm test
node load.mjs /absolute/path/local-load.json
```

The source has no dependency on a paid upgrade. See [DEPLOYMENT.md](DEPLOYMENT.md)
for the Hostinger findings, required capabilities, migration gates and configuration.

## Review browser

`tests/review-server.mjs` serves the original game modules/assets and the review
page with disposable in-memory heroes. It deliberately has no real account data.
In a normal local checkout, run `npm run dev` and open `http://localhost:4173/` in
separate tabs, choosing different test players. In a managed preview that mounts
only its selected root, prepare a checkout whose root is `royale/` and whose dev
command is `node multiplayer/tests/review-server.mjs`; all parent game modules
must be present. **Never publish the fixture server as production.**

The published solo build is not replaced by this review. New multiplayer work can
continue on this branch without risking the existing integration branch or saves.
