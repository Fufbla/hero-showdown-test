# Hero Showdown Royale multiplayer integration

Development branch: `feature/royale-persistent-multiplayer`. This continues
`18536ee54d064fb78bb15c668677d0f415ae9fa6`; it does not replace the existing game.
The actual game launched with two separately authenticated Chromium pages. They
joined by code, saw both approved heroes, moved, attacked a shared monster and each
received its XP/coin reward. This is a development build, not a public deployment.
See [VALIDATION.md](VALIDATION.md) for measured results and unfinished verification.

## Play and saving

Create or continue a local hero, then open **Pause → Solo & Multiplayer** (also
available from hero selection). Connect an account and explicitly review a local
transfer or the existing cloud hero. An occupied cloud slot cannot be overwritten
by a local snapshot. The original local slot and a transfer backup are retained.

**Play Solo**, **Create Multiplayer Room**, **Join Multiplayer Room**, **Copy room
code**, and **Leave Multiplayer** operate on the same authoritative hero. The room
has no creator-host dependency. Nearby heroes use the existing Style C renderer,
animations, equipment and power effects. Positions interpolate between updates;
the browser sends inputs and menu intentions, never damage or reward values.

Account heroes require a connection even in solo mode. A disconnected account hero
waits for its confirmed server state; it does not create an offline progression
fork. Untransferred local heroes keep their existing offline behavior. Do not
interpret “solo” as offline support for transferred heroes.

## Implementation

- Existing 60 Hz `Game` simulation with shared enemies, bosses and warnings;
  individual contribution rewards, personal chest claims and Legendary records.
- Random ten-character codes, origin checks, Supabase Auth validation, per-hero
  connection replacement, protocol 2 compatibility checks and admission control.
- Room/server limits must be configured from host measurements; there is no default
  advertised player capacity. Development load results are not a Hostinger limit.
- Durable SQLite WAL commits before state confirmation; ordered idempotent menu
  commands, immediate meaningful progress writes and 10 Hz location snapshots.
- Whole runtime state (including current HP, coordinates, facing, progression,
  equipment and cooldowns) survives mode changes and process restoration.
- A server-only Supabase migration coordinator reserves an immutable hero UUID and
  source snapshot, fences the legacy cloud writer, then adopts it transactionally
  in SQLite. Retrying a failed adoption uses the same reservation. This is an
  idempotent outbox between databases, not a distributed atomic transaction.
- Local history cannot be authenticated retrospectively. The explicit one-time
  import validates the old save schema and bounds; subsequent progression is
  calculated by the server. A newer cloud hero always wins over local replacement.
- Overlapping control effects remain owned by the remaining caster after departure;
  a charging/pouncing attack can contact different players once on different ticks.

## Run the verified development workflow

From the repository root (Node.js 24+):

```sh
npm ci --prefix royale
npm ci --ignore-scripts --prefix royale/multiplayer
node --test --test-reporter=tap --test-concurrency=2 royale/tests/*.test.mjs
npm test --prefix royale/multiplayer
npm run dev --prefix royale/multiplayer
```

Open `http://localhost:4173/` in two separate browser profiles or tabs. The normal
game is served, but its account selector deliberately uses disposable test identities.
Choose Client A in one profile and Client B in the other. Create local heroes,
review/confirm their transfers, then create/join the same code. For isolated
viewport checks open `/multiplayer/tests/mobile.html` and use A/B; each uses a
separate session-storage namespace. That wrapper is not a Safari/device emulator.

**Never deploy the review server.** It uses in-memory state and fake authentication.
The production entry is `npm start`, with real Auth, migration credentials, persistent
storage and WSS configuration described in [deploy/OPERATIONS.md](deploy/OPERATIONS.md).
Original artwork, core simulation, balance and local save format were not edited.
No main, Story Mode, Versus Mode or production hosting changes were made.
