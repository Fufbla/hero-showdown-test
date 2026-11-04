# Actual-game multiplayer validation

## Repository baseline and preservation

Resumed `feature/royale-persistent-multiplayer` at the verified remote SHA
`18536ee54d064fb78bb15c668677d0f415ae9fa6`. The remote was checked again before
publication and still pointed to that commit. This is a continuation of the
existing authority, not a rewritten multiplayer engine.

Approved artwork, original simulation, damage/cooldowns, progression, equipment
rules and legacy save implementation remain byte-identical to integration base
`defec8c3d66a8a12cef9bf22d49eeccd835e6ce6`. Existing UI modules were adapted to wait
for authoritative menu results. The added JPEGs are browser evidence, not game
assets. Preservation tests allow only the explicit integration/deployment files.
No main, Story Mode, Versus Mode, production website or live hero data was changed.
Rest Up removal, silent ordinary rewards, unlabeled platforms and 4/8 elevated
platform populations remain covered by the existing regression suite.

## Automated results

| Run | Passing | Failing | Skipped |
| --- | ---: | ---: | ---: |
| Existing Royale baseline | 1,189 | 0 | 0 |
| Existing multiplayer baseline | 47 | 0 | 0 |
| Final existing Royale suite | 1,189 | 0 | 0 |
| Final multiplayer suite | 57 | 0 | 0 |
| **Final distinct total** | **1,246** | **0** | **0** |

```sh
node --test --test-reporter=tap --test-concurrency=2 royale/tests/*.test.mjs
npm test --prefix royale/multiplayer
```

The final existing suite took 130.801 seconds; multiplayer took 9.897 seconds.
Limiting raster-test concurrency changes scheduling, not test selection. No test
was deleted or weakened to hide a failure. The unrelated root/Scorpion suite was
not rerun; the counts are specifically the complete Royale suites.

New regression coverage includes the actual shipped GameSession/MultiplayerClient
pair over independent authenticated WebSockets; local migration and confirmation;
room creation/join/creator departure; reconnect and exact position/HP/coin retention;
protocol rejection; overlapping Roots after departure; a pounce contacting different
heroes on different ticks; blocked local power writes after transfer; and migration
owner checks, response-loss recovery, newer-cloud conflicts, adoption failure,
cloud-only recovery on a new browser, SQL writer fences and role permissions.
The transport integration also runs without crypto.randomUUID, as on local HTTP.

Existing multiplayer coverage includes four clients, server movement, forged damage
rejection, deduplicated rewards, disk restart, all nine power rules, all seven
regional bosses and eight Legendary records. Regional boss tests use controlled
level-99 heroes moved into attack range. Legendary completion tests use controlled
server-side defeats. These are not natural browser boss-fight demonstrations.

## Actual browser playtest

Two separate Chrome pages used distinct authenticated fixture identities and
session-storage namespaces. They shared the same real WebSocket authority and
normal game UI/renderer. They were not physical phones or fully isolated browser
profiles. The identity provider and migration bridge were disposable test doubles;
production Supabase Auth was not exercised.

| Action | Observed result |
| --- | --- |
| Create heroes | Harbor One (male) and Harbor Two (female), normal creator |
| Review/confirm transfer | Both heroes restored from reviewed local saves |
| Create/join | Both joined code PZZEJZKNRK through normal Pause menus |
| See/move | Both approved avatars visible; independent movement and facing |
| Shared regular combat | Both attacked; both received 14 XP and 1 coin |
| Equipment | Harbor Two collected a Shore Guardian Chest Piece |
| Creator leaves | Harbor Two stayed connected; room continued |
| Return to solo | Harbor One retained 70 HP, 14 XP and 1 coin after combat |
| Exact location | First mode transition retained x=160, y=600, HP=100; elevated/midair cases covered automatically |
| Rejoin | Harbor One rejoined the existing room |
| Refresh | Continue reopened the transferred hero; it could rejoin the room |
| Power selection | Normal direct slot picker opened; level-1 hero correctly had no learned powers |
| Superpower/boss browser fight | Not completed; automated engine/network coverage only |
| Rapid taps/double-jump proof | Attempted, but final browser input call timed out; not verified |

Screenshots:

- [Two heroes in the world, 844×390](qa/browser/two-heroes-landscape.jpg)
- [Normal room interface with both names](qa/browser/room-controls.jpg)

844×390 and 667×375 landscape gameplay views were inspected. A 390×844 portrait
view exposed a room badge overlapping the health bar; CSS now moves it into the
header area and retains editable/copyable menu fields. That correction was not
visually rechecked after the browser service stopped responding. 932×430, iPhone
safe-area hardware, Safari long-press/selection behavior, all menu combinations,
three active power buttons, and full browser boss/reward flows remain unverified.

The browser stopped responding during the final control test and also timed out
when its recovery guidance was requested. Saved screenshots remain available.
No successful rapid-tap or real-iPhone result is inferred from CSS inspection.

## Controlled load results — no reliable capacity established

Separate server and client processes, durable temporary SQLite, loopback networking,
30-second measured samples. The repeat used 10 seconds of warm-up. Fixtures exercised
up to four heroes per original Lightning Spree encounter in different regions with
movement and attacks. They do not measure browser rendering or Internet latency.

Raw reports: [first run](qa/controlled-load.json),
[repeat](qa/controlled-load-repeat.json). The older co-located report is retained
at [qa/local-load.json](qa/local-load.json) and is not mixed into these results.

| Clients | Hz | Tick p95 ms | Input p95 ms | Attack-input p95 ms | CPU % of one core | RSS MiB | Out KiB/s | Disconnects | Budget |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 2 | 53.46 | 14.49 | 140.65 | 148.85 | 32.28 | 92.12 | 47.43 | 0 | Fail |
| 4 | 57.37 | 11.92 | 50.85 | 44.89 | 23.24 | 123.87 | 221.15 | 0 | Pass |
| 8 | 55.23 | 17.95 | 83.02 | 75.44 | 33.52 | 133.91 | 435.88 | 0 | Fail |
| 16 | 58.67 | 23.27 | 55.05 | 52.48 | 36.33 | 224.93 | 1043.40 | 0 | Fail |

Budget: at least 57 Hz, tick p95 below 16.67 ms, input confirmation p95 below 150 ms,
no protocol errors/disconnects. In the first run, 2 passed and 4/8/16 failed; its
four-player input p95 reached 3339 ms. The inconsistent low-count results and
higher-count tick failures prevent any reliable capacity claim. No tested maximum
is advertised. CPU includes only the separate server process; the reported hardware
is the development workspace, not Hostinger. Attack-input confirmation is not a
measurement of full attack-to-visible-effect delay on a phone.

Optimizations preserve rules: faster runtime type dispatch, control-effect target
aggregation, rolling overload measurements, region/distance filtering, deltas and
presentation interpolation. Remaining performance work includes long soaks on the
chosen host, profiling durable whole-graph serialization, WAN/proxy tests, reconnect
storms, and real client rendering. Capacity remains configurable and required.

## Before public deployment

- Obtain read access to the actual Hostinger plan/host and confirm persistent WSS;
  no such backend access or public staging endpoint was available.
- Provision an approved staging service/database, apply the reviewed migrations,
  and validate real authentication, service-only migration and failure recovery.
- Complete the remaining browser/device rows above, including Safari touch handling,
  boss phases/warnings, all powers, rewards, equipment and area transitions.
- Establish repeatable capacity with headroom on that server; test backup restoration
  and process restart through the intended TLS proxy.
- Account solo currently requires a server connection. Original local-only solo
  remains available; transferred heroes do not reconcile divergent offline saves.
- Historical local earnings cannot be authenticated retroactively. The migration
  checks schema/bounds and imports once with explicit review; all later progression
  is server-calculated. This is documented, not presented as anti-cheat proof.
- Obtain explicit production deployment approval. No DNS, plan or healthia.me change
  was made. See [deploy/OPERATIONS.md](deploy/OPERATIONS.md) for deployment/rollback.

The actual game integration is published for development testing; there is no
public two-phone multiplayer link or production-ready capacity claim yet.
