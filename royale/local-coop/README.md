# Hero Showdown Royale V3 — local two-player co-op

Review branch: `feature/royale-v3-local-coop`. Stable baseline: `005ea3288f211e77496dce8d7b5a6910ba827304`. The online authority at `ce3fb34561d69a94b9a5ffa3d52995712502635e` supplies the existing shared combat logic, adapted locally. No live deployment, merge, database migration, or change to existing heroes is part of this branch.

## Play the isolated build

Install Node.js 20 or newer, check out this branch, then run from the repository root:

```sh
git switch feature/royale-v3-local-coop
node tools/serve-local-coop.mjs
```

Open `http://127.0.0.1:4173/royale/local-coop/` on that computer. No package installation is needed. The server binds only to loopback. It serves the game and forwards existing cloud requests to the unchanged V3 endpoint, whose CORS policy permits only the official GitHub Pages origin. It stores no codes, credentials, or snapshots. There is no movement or combat server.

1. Connect two controllers by USB or pair them in the computer's Bluetooth settings. Press a button on each so the browser exposes them. Use a browser/controller combination with a standard Gamepad API mapping.
2. Each player enters their own ten-digit code, loads their three hero slots, and selects a saved hero. Create a hero in the existing solo game first if needed. Codes are cleared after authentication.
3. Assign a different detected controller to each player and select Ready. Start enables only when both accounts, heroes, and controllers are ready.
4. Player 1 leads the camera. Player 2 has independent movement and returns to safe ground near Player 1 when fully offscreen beyond a 32-unit margin.
5. Start/Options pauses the world and opens separate menus. Each controller has its own focus. Both must select Ready; either can cancel Ready. After one leaves, the remaining player can resume alone.
6. Choose Leave Local Co-op before closing the tab. If the final save fails, the hero stays signed in and the world stays paused so the save can be retried. Ordinary save failures do not block play; checkpoints are retained locally and retried.

| Standard controller | Action |
| --- | --- |
| Left stick | Move; larger deflection runs |
| A / Cross | Jump / double jump; confirm menu selection |
| X / Square | Punch |
| B / Circle | Kick |
| Y / Triangle | Pick up / interact |
| LB, RB, RT | Equipped powers 1–3 |
| Back / Share | Fourth villain ability, when unlocked |
| Start / Options | Pause; cancel your Ready state |
| D-pad up | Portal |
| Left-stick click | Tree of Eris |
| Right-stick click | Health Root |
| Stick / D-pad in menus | Select controls; left/right changes a selector |

Controller assignments never silently move to another index. Disconnect pauses both heroes. Reconnect the same device at its assigned index. Browser/OS reassignment to a different Gamepad index requires ending the session safely and assigning controllers again.

## Rewards and progression

Each monster or boss has one health state and one death event. Both active heroes split the base XP equally, regardless of final hit. For odd totals, the extra point alternates by reward event using the local room's `xpTurn`, starting with Player 1. Total granted XP equals base XP before the existing level-99 cap. After one leaves, the remaining hero receives normal solo XP, including the original level scaling.

Each hero receives the full eligible coin reward. Regional bosses preserve the existing per-hero first victory reward (100 coins) and repeat victory reward (10 coins); chests retain their existing individual claim restrictions.

Ordinary loot rolls once. Each hero gets an entitlement to an independent item with matching generated stats. Collecting one copy does not remove the other. A full inventory blocks only that hero; the 20-slot limit and 20-second wall-clock expiration remain. Boss chest rewards remain pending until kept or explicitly discarded/replaced. One hero's equipment actions cannot alter the other's copy.

The original level cap (99), earned Power Points, ability cap (20), three normal equipped powers, fourth merge slot, cooldowns, tree requirements, sales, and boss progression rules are reused.

## Architecture and save safety

- One requestAnimationFrame loop, one gameplay canvas, one renderer and camera. The follower uses the existing hero renderer and its own cape state.
- One local authority advances each enemy, boss, projectile, and hazard. Hero instances hold separate movement, powers, health, equipment, and progression; their enemy arrays reference the same world. No iframes, WebSockets, Realtime movement, or remote input round trips.
- Input is polled once each animation frame. Fixed 60 Hz simulation consumes independent button edges. The 30 FPS option limits rendering while preserving simulation timing.
- Each account has an in-memory access/refresh credential, independent queue, revision fence, and recovery journal keyed by an account hash and slot. Codes/tokens are not persisted or logged.
- Every eight seconds, both heroes checkpoint, including during combat and while paused. Unchanged snapshots avoid redundant writes. Upgrades, inventory changes, level-ups, chest claims, and departures request immediate saves.
- Latest progress is journaled even when an earlier request is offline. A lost response is reconciled against cloud revision and snapshot. Foreign newer revisions pause that hero's session; older progress is retained as a separate recovery copy instead of overwriting cloud data. Recovery copies are not auto-merged.
- Serialization and snapshot validation for browser cloud requests run in a worker. The persisted graph excludes the shared transient AI graph. Cloud waits never run inside the simulation loop.
- Unfinished boss battles restart on restoration, matching existing saves. No partial boss health is promoted into a victory. Defeated heroes checkpoint at their respawn state.

Backend authorization was inspected: account ownership comes from the bearer session, not a caller-supplied profile identifier; saves require the current slot revision. This branch does not modify backend code or schemas.

## Risks and limits identified before implementation

The original single global account context could cross-write saves if reused for two logins. Separate CloudProfile instances avoid that. Shared monsters could award duplicate XP or loot if each hero ran independent AI or death handlers; the local authority owns both. Ordinary out-of-combat-only save calls would skip combat autosaves, so co-op captures valid progression without mutating live combat. A second game canvas would double rendering costs; this build reuses one world draw. Bluetooth and browser Gamepad mappings, index reassignment, display refresh, and CPU/GPU capacity still need physical-device testing. No claim of 60 FPS or under-50 ms physical latency is made from simulated input.

If no safe visible landing surface exists, teleport waits for one instead of placing the follower in a hazard. Ordinary loot continues its existing expiration clock while paused. Both accounts need internet for login/cloud synchronization; combat itself is local.

## Verification

Run the automated suite:

```sh
node --test royale/local-coop/tests/*.test.mjs royale/tests/v3-combat.test.mjs royale/tests/v3-loot.test.mjs royale/tests/menu-gamepad.test.mjs royale/tests/menu-navigation.test.mjs
```

The browser harness at `?qa=1` uses two simulated gamepads and practice profiles; it never connects real hero accounts. Click Run automated playtest. It exercises the actual application loop, shared rendering, input polling, pause panels, worker serialization, rewards, teleportation, disconnects, saves, and departure. It measures all ten requested scenarios and emits JSON. This harness is only imported when the QA query is explicitly present.

`tests/live-cloud.mjs` creates two NEW test accounts and refuses to seed any nonempty account. It checks independent real writes/restoration, equipment copies, authorization, and stale-save rejection. It never accepts an existing account code. Running it again creates two more test accounts; do not run it as an ordinary offline unit test.

Results and remaining hardware checks are recorded in `TEST-REPORT.md` and the JSON evidence files. The managed browser preview is internal QA, not a public URL. A public preview would need separately approved hosting/CORS configuration; the local test server works without changing the live backend.
