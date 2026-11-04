# Hostinger assessment and deployment requirements

Status: development backend, **not approved for production cutover**. No Hostinger
plan, billing setting, DNS record, production website or Supabase schema was changed.

## Observed hosting, 4 November 2026

The public HTTPS response from `healthia.me` reports `x-powered-by: Hostinger Horizons`.
This identifies the website service; it does not reveal the account's subscription,
CPU, RAM, bandwidth quota, connection limits or whether a separate VPS exists.
No Hostinger hosting-management connector or authenticated hPanel/SSH access was
available. Only a mail connector was discoverable; it cannot inspect hosting.

Hostinger's current documentation explicitly excludes inbound WebSockets from
Web/Cloud Node.js hosting and recommends a VPS for that requirement:

- https://www.hostinger.com/support/hostinger-node-js-limits-for-web-and-cloud-plans/
- https://www.hostinger.com/support/which-web-standards-and-connectivity-features-are-supported-at-hostinger/

Horizons has an integrated backend offering, but the public website headers do
not establish that this particular project has it enabled or that it permits a
persistent inbound WebSocket simulation process. Do not assume either capability.

The existing Supabase project `adakwbhxiuatjvphutgo` is active on the free plan.
Inspection found no deployed Royale account Edge Function and none of the
`royale8_*` tables. Other Healthia game tables were left untouched. Supabase Auth
is reused for token verification; its live sign-in flow has not been tested here.
Short-lived Edge Functions alone are not this persistent game server:
https://supabase.com/docs/guides/functions/limits

## Required hosting capability

- Node.js 24 or newer with an always-running supervised process.
- Inbound HTTPS/WebSockets (`wss://`) through a reverse proxy with Upgrade support.
- A durable local volume, writable by the game service, with SQLite WAL and FULL
  synchronous writes supported. Use one authority process per database.
- Backups of a consistent database snapshot, tested restoration, process restart
  supervision and monitoring. Do not copy a live SQLite main file without its WAL.
- A bounded room and total connection capacity established on that actual server.
- The game website can remain on `healthia.me`; the backend may be a separately
  approved service. No website hosting upgrade is assumed or authorized.

## Inspect before deployment

Run on the actual prospective server, not the development workspace:

```sh
node royale/multiplayer/inspect-host.mjs
```

Record the plan's bandwidth quota, ingress/egress rate, WebSocket/proxy limits,
idle timeouts, storage durability and restart policy from hPanel/provider settings.
The script is read-only and deliberately does not print environment variables,
credentials or network addresses. CPU/memory information from this workspace is
not a substitute for the Hostinger plan.

## Install and test

From the repository checkout:

```sh
cd royale/multiplayer
npm ci --ignore-scripts
npm test
node load.mjs /absolute/path/load-results.json
```

`load.mjs` uses disposable SQLite databases and authenticated test identities in
a loopback-only server. It never connects to real player accounts or changes
Supabase. Increase `LOAD_SECONDS` for a long soak and use `LOAD_GROUPS` for a
specific increasing sequence. Run WAN clients through the intended TLS proxy
as a separate test; loopback results do not measure Internet latency or bandwidth.

Do not choose a production limit from the largest short local pass. Leave margin
for GC, boss fights, many distinct regions, persistent writes, reconnect storms,
other server services and peak network usage. Test near the proposed limit for
at least an hour, then establish a lower operational ceiling from that evidence.
The server rejects new arrivals under measured runtime pressure while preserving
existing connections. No unlimited-player claim or arbitrary 2/4/8 cap is built in.

## Runtime configuration (after release gates are complete)

```text
HOST=127.0.0.1
PORT=8080
ROYALE_DATA=/var/lib/royale/authority.sqlite
ROYALE_ALLOWED_ORIGINS=https://healthia.me,https://www.healthia.me
ROYALE_ROOM_CAPACITY=<measured safe room limit>
ROYALE_SERVER_CAPACITY=<measured safe total limit>
```

The process refuses to start without positive configured capacities and an
explicit origin allowlist. `npm start` runs `server.mjs`; **never deploy `npm run
dev`**, which is a disposable integration review with test identities. Production
verification uses Supabase's `/auth/v1/user` endpoint, rejects anonymous users,
and closes connections at token expiry. No service-role secret is exposed to
clients or required by this transport.

Proxy `/royale` to the Node service with HTTP/1.1, Upgrade and Connection headers.
Expose only TLS externally; bind the Node port to loopback. Serve the existing
game files separately. Do not expose SQLite, tests, source maps or fixture routes.
The `/health` endpoint reports readiness without revealing hero data.

## Migration and release gates

The existing production solo app is unchanged. This backend is not yet wired to
its account, wardrobe, Tree of Eris, rewards and save UI. A future cutover must:

1. Read the existing cloud hero revision before choosing a destination; if a
   cloud record exists, select it rather than importing a local replacement.
2. Import a local hero only into an empty account slot after explicit confirmation.
   Retain the original browser save as a recovery backup. The backend rejects an
   occupied slot and repeat source IDs. Local legacy data is inherently untrusted;
   the test import adapter is not proof that historical rewards were earned. The production transport keeps imports disabled until a verified migration coordinator exists.
3. Disable conflicting writes to the old cloud/manual-save endpoint for migrated
   heroes, using a fenced migration record and transaction. This coordination is
   **not implemented yet**. Never enable both writers for one hero.
4. Route both online solo and room play through the same authoritative hero ID.
   Offline solo reconciliation needs a separate validated event/migration design;
   do not replace a newer authority record with a browser snapshot.
5. Complete player-facing menu integration and end-to-end account tests, resolve
   multiplayer power-control overlap cases, then verify all gameplay on mobile.

Until those gates pass, use the backend only for isolated development tests. The
existing solo website remains the playable release; there is no production
multiplayer URL or verified Hostinger capacity in this commit.
