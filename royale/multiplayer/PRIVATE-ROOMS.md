# V3 private multiplayer — development build

Select an existing V3 hero, choose **Multiplayer**, then **Create Multiplayer** or
enter a friend's six-digit code in **Join Multiplayer**. A room holds at most five
players including its creator. A creator can wait alone while friends join.
Room codes are separate from the ten-digit code that opens a player's saved heroes.

This branch continues the existing authority and game-session implementation on the
current V3 game. It does not regenerate artwork or change solo combat balance.
There is no second email login, account transfer, or new hero copy in the player flow.

## Saving

- The authority checkpoints each player's existing V3 profile and selected slot
  every **8,000 ms**, independently of browser visibility, menus and combat.
- The existing browser eight-second timer remains connected to multiplayer save
  commands. Manual saves, room transitions, disconnects and a clean server shutdown
  also request checkpoints.
- Full simulation state is committed to durable SQLite before network confirmation.
  This includes HP, location, attacks, cooldowns, shared enemies and boss encounters.
- Cloud writes use the existing V3 snapshot format and revision compare-and-swap.
  The standard snapshot's active-arena return-location behavior is unchanged;
  exact in-progress arena restoration comes from the authority database.
- Capture uses a separate runtime graph; it never clears combat or moves a live hero.
  The runtime codec now preserves ordinary `game` properties across repeated saves
  and restarts, while retaining the non-enumerable PowerSystem back-reference.
- A failed cloud write retains a durable pending checkpoint and retries. A lost
  response can be confirmed without duplicating rewards, including JSONB key reorder.
- A newer cloud revision stops the affected connection. Reconnecting uses the newer
  cloud hero and retains the conflicting room runtime in `state.recoveries` for
  recovery. It never overwrites the newer slot with stale room progress.
- **Save & Return to Heroes** waits for cloud confirmation and releases the authority
  hero. It requires five seconds out of combat, like the existing safe exit rules.
  Individual progression, equipment and Legendary records remain separate.

## Run locally

Requires Node.js 24 or later.

```sh
npm ci --prefix royale/multiplayer
npm test --prefix royale/multiplayer
npm run dev --prefix royale/multiplayer
```

The disposable review runs at `http://localhost:4175/royale-v3-staging/`. Use separate
browser profiles for each player. The fake save codes are `1111111111` through
`6666666666`; each selects a different disposable hero. Create/join with five and
use the sixth to check the room-full response. These fixture codes never contact
the live cloud. **Never deploy `tests/v3-review-server.mjs`.**

The browser check script is `tests/private-rooms-browser.mjs`, with `REVIEW_URL`,
`PLAYWRIGHT_MODULE` and `CHROMIUM_PATH` overrides. Its visual/device results have
not been verified in this workspace; see validation below.

## Deployment still required

The static website alone does not run the authority. Deployment needs a persistent
Node.js process, a durable volume, HTTPS/WSS proxying and the server-only Supabase
service credential for the existing V3 tables. No new database schema is required.

Configure the authority environment using `.env.example` (the process manager must
load it), then start `node royale/multiplayer/server.mjs`. Set the exact allowed
website origin. Configure total server connections only after measuring that host;
the per-room cap remains five regardless of a larger server limit.

Create `royale/multiplayer/config.json` from `config.example.json` with the actual WSS
endpoint after the backend is verified. The feature branch enables the V3 menu,
while the older account-transfer multiplayer switch remains disabled. Keep both
frontend and authority on protocol 3. Updated entry hashes avoid stale module caches.

Do not publish until real V3 session authentication, revision-safe cloud writes,
reconnects, a sustained five-player load, proxy restarts and iPhone touch controls
have been checked on that host. Back up the authority SQLite database consistently
with its WAL; the exact active-encounter state is stored there.

No production deployment, database migration, live hero write, hosting purchase or
DNS change was performed. Hostinger access is not connected in this workspace, and
there is no configured public multiplayer endpoint.

## Validation

`npm test --prefix royale/multiplayer`: **71 passed, 0 failed**.

Automated coverage includes six independent WebSocket connections: five admitted,
one refused; existing-hero selection; numeric room codes; creator departure; guest
reconnection; independent eight-second cloud checkpoints during attacks; exact
runtime restart; save conflicts and recovery; failed-write retry; delayed cloud
acknowledgements; safe return to solo; the actual V3 parent save bridge; and menu
behavior using a DOM test environment. Cloud rows/authentication in these tests are
disposable fixtures, not production Supabase verification.

The existing broader Royale suite has one pre-existing historical interface-scope
failure, also reproduced on clean baseline `5defeb33c626d19755b26f030b5e7b840f6b4b77`.
Its allowlist predates already-merged work. The other 52 tests pass. A separate test
verifies that approved artwork, core simulation, solo saves and balance remain
byte-identical to that current baseline.

Browser validation was attempted: local Chromium could not start because socket
creation was denied; the cloud browser blocked access to the local preview. No
successful browser rendering, physical-phone test or public WAN performance result
is claimed from the automated socket/DOM tests.
