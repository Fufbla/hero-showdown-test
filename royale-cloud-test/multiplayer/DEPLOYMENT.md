# Hostinger assessment and deployment preparation

No hosting purchase, plan change, DNS change, production deployment or live database
migration was performed. The development branch can be tested independently of hosting.

## What is known

The public `healthia.me` response identifies Hostinger Horizons. This does not reveal
the subscription, CPU, RAM, bandwidth, connection quotas, or any separate VPS.
Authenticated hPanel/SSH or a hosting-management connection was not available.
The actual plan and sustainable player count therefore remain **unknown**.

Hostinger's current official documentation says its Web/Cloud Node.js plans do not
accept inbound WebSockets. It recommends a VPS for that capability. A long-running
Node.js website alone is not sufficient for this game server:

- https://www.hostinger.com/support/hostinger-node-js-limits-for-web-and-cloud-plans/
- https://www.hostinger.com/support/which-web-standards-and-connectivity-features-are-supported-at-hostinger/

If the current account has only those website plans, the backend needs a separately
approved Hostinger VPS or another service with persistent inbound WSS. The static
website can stay on its existing service. No upgrade is assumed or authorized.

The configured Supabase project was inspected read-only: no `royale8_*` hero tables
or Royale account Edge Functions were deployed. Existing unrelated game tables were
left untouched. Real Supabase sign-in and the migration on a hosted database remain
release gates; the SQL was tested locally with PGlite. Supabase Auth is reused for
server identity verification, rather than accepting client-selected account IDs.

## Required capabilities

| Capability | Requirement |
| --- | --- |
| Runtime | Persistent Node.js 24+ process, supervised restart |
| Networking | HTTPS/WSS, HTTP Upgrade proxy, suitable socket and bandwidth limits |
| Storage | Durable writable volume with SQLite WAL/FULL synchronous transactions |
| Ownership | One authority database/process for the transferred account population |
| Secrets | Server-only environment values; no service-role key in static files |
| Database | Outbound HTTPS to Supabase Auth and migration RPCs |
| Operations | Health checks, structured errors, consistent backups and tested restore |
| Capacity | Repeated measured CPU, RAM, tick/latency and bandwidth headroom on that host |

Run `node royale/multiplayer/inspect-host.mjs` on the proposed host, then record
provider bandwidth/connection/proxy limits separately. Workspace resources are not
Hostinger resources. Test the intended TLS proxy and real WAN clients before setting
`ROYALE_ROOM_CAPACITY` and `ROYALE_SERVER_CAPACITY`.

## Prepared configuration

- [.env.example](.env.example): blank credentials and capacities, staging placeholders.
- [deploy/royale.service](deploy/royale.service): supervised process and durable data path.
- [deploy/nginx.conf.example](deploy/nginx.conf.example): HTTPS/WSS proxy and health route.
- [deploy/client-config.example.json](deploy/client-config.example.json): client endpoint.
- [deploy/OPERATIONS.md](deploy/OPERATIONS.md): installation, migration order, validation,
  backups, restart, protocol matching and rollback.

Use a separate staging host and database. Serve the static build separately and set
`royale/multiplayer/config.json` to the approved WSS endpoint. Without that file the
local solo game remains available and the multiplayer menu explains the missing setup.
The account transfer requires a server-only service-role credential; ordinary Auth
verification alone does not require that credential.

The available short load samples did not establish any reliable operating ceiling.
Do not advertise 16-player support or use a single four-player pass as a limit.
Repeat `load-controlled.mjs` on the chosen host with longer samples and simultaneous
encounters, then run at least an hour near the candidate limit and leave headroom.
See [VALIDATION.md](VALIDATION.md) for failures, not just the best sample.

There is no public staging WSS endpoint or two-phone link yet. Production on
healthia.me remains blocked on explicit deployment approval, compatible host access,
real account/migration validation, mobile Safari testing and capacity qualification.
