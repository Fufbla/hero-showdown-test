# Staging deployment and recovery

This is a deployment preparation package, not a production approval. Do not deploy
the review server: it intentionally uses disposable identities and memory storage.

1. Use a separate staging hostname/account database, Node.js 24+, a durable volume,
   and a process supervisor with inbound WSS. No purchases or DNS changes are part
   of this repository change. The current healthia.me Hostinger plan is unverified.
2. Install the checked-in dependency lock: `npm ci --ignore-scripts` in
   `royale/multiplayer`. Test dependencies for the complete suite also require
   `npm ci` in `royale/` (PGlite and the existing canvas test engine).
3. Back up the existing database. Apply the original
   `20261031125208_royale_accounts.sql` migration if not already applied, then
   `20261104161434_royale_multiplayer_fence.sql` to that staging database. Inspect
   the migration diff first. This does not migrate any hero automatically.
4. Keep the service-role credential only in the server environment. The client
   uses the existing Supabase public configuration and email/password Auth. Set
   the correct staging Supabase project in cloud-config.mjs for **both** builds.
   Test email confirmation and password recovery before inviting players.
5. Run `node inspect-host.mjs`. Run `node load-controlled.mjs results.json` with
   increasing LOAD_GROUPS, a warm-up and extended LOAD_SECONDS. Repeat with real
   WSS/WAN clients and simultaneous boss encounters; the bundled harness is only
   a local load check. Measure host bandwidth limits, memory, CPU and socket limits.
   Set room/server capacities from those measurements, leaving headroom for spikes.
6. Install the service/reverse-proxy templates after reviewing paths and users.
   `ROYALE_ALLOWED_ORIGINS` is an exact comma-separated list, without paths or
   trailing slashes. Do not use wildcard origins. Expose only HTTPS/WSS publicly.
7. Build the static client with `npm run build:playtest -- /absolute/empty/build`
   from `royale/`. Place the reviewed client config at
   `royale/multiplayer/config.json` in that build. Never copy .env, SQLite data,
   backend migrations, node_modules or multiplayer/tests into a public web root.
8. GET /health returns 200 + protocol 2 only while the authority is ready. A
   mismatched client protocol is rejected before hero selection. Deploy the matching
   static client and server together. Check the browser console and failed assets.
9. Validate two separate devices: migrate existing heroes, create/join, move,
   jump, use three powers, share a regular enemy and boss, claim separate rewards,
   leave/rejoin, refresh, and confirm exact location/health/inventory. Test portrait,
   landscape, safe areas and iOS rapid taps. No real-device validation is claimed.

## Saving and migration

The server verifies Supabase identity; clients send input and menu intentions only.
A server-side migration preview reads the actual cloud row revision. Confirming
reserves a canonical UUID and snapshot under an owner lock; a trigger rejects
future writes/deletes through the legacy cloud writer. The authority adopts that
UUID in a single SQLite transaction. A lost response/crash between databases is
recovered by reading the reservation, not by submitting a newer client snapshot.
The immutable transfer record is an outbox/receipt, not an active progression copy.
All subsequent progression belongs to SQLite. Never run two independent authority
databases against the same set of transferred accounts.

Local-only history cannot be cryptographically verified after the fact. Import
validates the existing save schema, bounds and ownership of the account, requires
explicit review, and permits each legacy source only once. It does not certify
that old offline earnings were obtained honestly. After adoption, the server
computes all new earnings, purchases, upgrades and damage. The browser keeps its
original local slot and a transfer backup; it fences that slot after confirmation
is attempted. A failed/uncertain confirmation is retried against the same source.

Account heroes use server-managed solo rooms as well as multiplayer rooms. Offline
play of a transferred hero is paused until reconnect; untransferred local heroes
retain their previous offline gameplay. This prevents two divergent progressions.

## Restart, backup, rollback

- Use the service's normal stop/restart so it can commit and close SQLite. Sockets
  reconnect with refreshed Auth tokens; the creator has no room ownership privilege.
- Monitor journald for structured `authority_failure` events. Never log JWTs,
  service keys, full snapshots or authentication message bodies. A persistence
  failure closes connections and stops simulation; investigate disk/permissions.
- Use SQLite's online backup API or stop the service before copying the database.
  Copying only the main live .sqlite file can omit committed WAL data.
- Test backup restoration on an isolated non-public instance with matching code.
  A schema/version mismatch must fail without overwriting the saved database.
- For a code rollback, stop new joins, stop the authority, take a consistent backup,
  restore the previous **compatible** client/server build, keep the newest database,
  then restart and verify health plus a disposable account. Never restore an old
  SQLite snapshot to a public server that already acknowledged newer progression.
- Do not remove the migration fence or restart the legacy writer for transferred
  heroes. Reversing a transfer requires a reviewed export of the latest authoritative
  state and a coordinated migration; it is not a table deletion or backup overwrite.
