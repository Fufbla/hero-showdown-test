# Hero Showdown Royale V3 cooperative development

Status: implemented and locally tested on `feature/royale-v3-coop`. Not deployed,
merged into main, or connected to live hero writes. No hosting was purchased and
no live database migration was applied. The official game remains unchanged.

## Player flow and shared rules

The existing ten-digit code opens the existing hero slots. Each visible hero has
Create Multiplayer Room and Join Multiplayer Room buttons. The generated room
code has six digits. A room supports 2–5 players; its leader can start after two
are connected. The first creator has no simulation or saving responsibilities.
Another connected player becomes lobby leader if needed. An active room continues
with the remaining players, including a single survivor. A disconnected hero has
30 seconds to reconnect to the same room before moving to a private solo runtime.
An empty room expires after that grace period.

Movement, attacks, all nine powers, enemies, seven regional boss encounters,
eight Legendary encounters, portals and region changes use the existing Game
implementation in a Node authority. Each region/arena has shared enemy state;
players can travel independently according to their own progression. Joining
preserves the hero's saved region and exact position. Players in different regions
appear in the room roster and meet by travelling to the same region.

The normal base XP value is a single pool. Connected heroes who damaged the enemy
share it equally. Stable sorted hero IDs receive any remaining points first;
100 XP between three heroes is 34/33/33. Bystanders and departed/disconnected
heroes receive none. Replaying a kill does not award it again. Unlike solo's
per-hero level taper, co-op divides the base monster XP value so the sum matches
the requested original reward. Solo XP and combat rules are unchanged.

| Active heroes in the region/arena | Enemy HP multiplier |
| --- | ---: |
| 1 | 1× |
| 2 | 2× |
| 3 | 3.25× |
| 4 | 4.5× |
| 5 | 6× |

Health never decreases during an encounter merely because someone leaves.
Respawning monsters recalculate for the current group. Existing level defenses,
attacks, warnings, speeds and damage remain unchanged. Five-player balance still
needs human playtesting on the deployed test server.

One existing loot roll is made per eligible regular kill. A ground item belongs
to the room, and only one successful pickup can remove it. Each inventory remains
independent: 20 equipment items, 10 Health Roots. Items expire after 20 seconds.
Randomized stats are preserved and inventory IDs are remapped without rerolling.
Existing per-player coins, boss chest eligibility, first-clear rewards and
permanent Legendary rewards remain separate. Regional boss XP is split; existing
Legendary reward rules are retained.

## Saving and recovery

The authority independently checkpoints every existing profile/slot at 8,000 ms,
even in combat or while a browser is hidden. Room changes, region changes,
disconnects, manual saves, safe exits and shutdown also request a checkpoint.
An immediate save queues the latest position behind any pending write.

SQLite WAL stores the full authoritative graph before confirming progression.
Cloud snapshots keep the existing V3 format and revision contract. That format
returns active arenas to their entrance, as before; the persistent authority holds
the exact in-progress arena state for a reconnect from another device. A death
snapshot contains the already-applied XP penalty and safe respawn, while the
live server keeps the exact death animation. Capturing a save never moves a live
hero, cancels an attack, removes its loot or resets its cooldowns.

The staged `deploy/v3-session-fence.sql` adds server-only leases, without moving
hero slots. A lease blocks concurrent solo writes to the same active hero. An
atomic revision check protects newer saves even after a lease expires. A lost
response can be retried idempotently. Duplicate browser connections replace the
old connection; a hero finishing its release cannot be attached concurrently.
This SQL has only run in disposable local PostgreSQL tests. Its referenced
profile/slot primary key was verified read-only against the existing schema.

A browser recovery copy is retained once per second while states arrive. It is
not uploaded over a newer cloud revision. A conflicting server runtime is archived
separately, and reconnect restores the newer cloud version. Ten-digit account
namespaces isolate local hero IDs and recovery journals. The two visible slots
and stored hidden third slot remain unchanged.

Save & Return to Heroes waits for both the server cloud receipt and the parent
page's local-copy acknowledgement before reloading the roster. The original
five-second out-of-combat safe-exit condition remains; autosaving does not wait
for it.

## Reused implementation

This continues `feature/royale-private-rooms` at
`0e1f2968ecef67473ebe4a757ee2ebaf8a1be2f4`, based on official main
`5defeb33c626d19755b26f030b5e7b840f6b4b77`.

Reused: the intent-only WebSocket protocol, server-owned Game runtime, SQLite CAS
persistence, graph codec, world synchronization, interpolation, authentication
bridge, eight-second checkpoints and V3 menu integration. Changes add the
minimum-two lobby, equal XP accounting, health scaling, atomic shared drops,
concurrent-writer leases, safe roster handoff, account isolation and network
optimizations. Approved art, input controls, solo save codec and combat modules
remain byte-identical to current main.

The authority simulates at 60 Hz, receives inputs at 30 Hz and publishes at 10 Hz.
Runtime and peer graphs use deltas with periodic full baselines. WebSocket
compression has bounded concurrency and no retained per-message dictionaries.
The browser interpolates presentation; it cannot report damage, XP or loot awards.

## Run and review locally

Requires Node.js 24 or later:

```sh
npm ci --prefix royale/multiplayer
npm test --prefix royale/multiplayer
npm run dev --prefix royale/multiplayer
```

Open `http://localhost:4175/royale-v3-staging/`. Disposable codes are
`1111111111` through `6666666666`. The production code isolates each account's local cache, so five tabs sharing
one browser can act as independent players. The review server also uses a fresh
fixture namespace on each start; it never reads real browser hero caches. The sixth code can check
capacity rejection. These codes never reach production Supabase.

Phone/tablet layout harness:
`http://localhost:4175/royale/multiplayer/tests/mobile-review.html`.
This is viewport testing, not iOS/Android hardware certification.

```sh
node royale/multiplayer/tests/load-review.mjs
```

This runs a reproducible 20-second five-player sample with real sockets, a local
SQLite WAL file and disposable cloud rows. Never deploy the review server,
fixture auth, test scripts or test pages as the production authority.

## Validation

See `review/VALIDATION.md` for results, screenshots and the remaining hosted checks.
There is no public multiplayer test URL yet. The managed localhost preview is an
internal QA environment, not an internet endpoint friends can join.

## Hosting and deployment proposal — approval required

GitHub Pages serves the frontend only. A continuously running real-time authority
needs a separate Node.js 24 service, WSS/TLS, a durable SQLite volume, exact allowed
origins, server-only cloud credentials, backups and a single authoritative process.
Supabase Edge Functions remain the login/cloud API; they do not host the game loop.

A small initial candidate is a Fly Machine in US East with two shared CPUs,
512 MB RAM and a 1 GB volume. Official listed baseline is **$4.54/month**
($4.39 compute + $0.15 volume), plus traffic and any chargeable backups/taxes.
Budget roughly **$5–8/month** for an initial small test authority; this excludes
any separately chargeable isolated Supabase project/branch, which must be quoted
and approved before provisioning. This is an estimate, not
a guaranteed capacity or bill. A 1 GB RAM upgrade adds approximately $3/month.
North America egress is listed at $0.02/GB. Prices checked November 7, 2026:
https://fly.io/pricing/ . A larger instance or multiple rooms needs new measurement.

The local sample used roughly 244 MiB RSS including its five simulated clients.
It is enough to nominate 512 MB for a trial, not to certify that host. Before
production, run a sustained five-player test across all regions and boss arenas
on the actual machine, with monitoring of memory, tick lag and bandwidth.

`deploy/Dockerfile` and `deploy/fly.example.toml` are reviewable templates only.
No Docker daemon is available here, so an image build is still required. Use one
machine and one volume; do not enable a second writer or automatic scale-to-zero.
Keep the Supabase credential in the provider secret store and never in the site,
source tree, container image or a browser config file.

After hosting approval, first deploy a separate test frontend and authority with
isolated disposable database/auth data. Apply the lease SQL there and verify real
API/RPC behavior. The preview's parent login API must point to that isolated test
backend; the checked-in parent still identifies the existing V3 API for eventual
approved integration. Do not point an unapproved preview at live hero writes.
Only after deployment tests and integration approval should the lease migration
and approved frontend be applied to the existing live save project/game.

Finally create `config.json` from `config.example.json` with the actual verified
WSS endpoint. Both sides must use protocol 4. Keep the old account-transfer flow
disabled. A consistent SQLite backup must include WAL or use SQLite's backup API.
Test crash/restart recovery and rollback before allowing real heroes.
