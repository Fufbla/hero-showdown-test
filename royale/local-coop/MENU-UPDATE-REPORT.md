# Local co-op menu, HUD, hero and boss-reward update

Scope: **two controllers on the same device only**, following the owner's correction. Publishing to the existing local co-op page is authorized. Online multiplayer source, transport, hosted Site and its Edge Functions are unchanged.

Development branch: `feature/local-coop-menus-hud-heroes-rewards`.
Baseline: `1d5fa75aa996c635781b4abe8630e56051b64a7a` (the live fetch fix plus its verification record).
Playable page: https://fufbla.github.io/hero-showdown-test/royale/local-coop/

## Completed

- Each controller can select an owned power and assign/swap it into all three standard slots. B/Circle cancels selection; LB/RB switches tabs. Selectors now open explicit controller choices. Input remains isolated to the owning pause panel, and gameplay remains frozen until both Ready.
- Compact existing power glyphs beneath each hero's name/health; personal cooldown shading/countdown and active state; protected fourth Villain Merge icon. Existing HUD cadence, stable DOM cells and no extra network traffic.
- All three authenticated hero slots support the full existing creator directly from co-op. Named deletion confirmation defaults to Cancel. Creation saves before returning; deletion is revision-fenced and atomically archives the full old snapshot. Current session heroes cannot be deleted. Other accounts/slots are preserved.
- A companion in a region only the leader had unlocked now receives their own eligible boss victory/chest. Each hero keeps their own claim history. Full inventories retain chest equipment in the existing saved pending queue. Repeated completion/claim events grant no duplicates.
- Existing independent eight-second saves, immediate mutation saves, single camera, controller assignments, teleport, shared combat, progression limits and departure behavior are retained.

## Verification

- **112 automated game/client/regression tests passed**, plus **2 Postgres/endpoint integration tests** covering authorization, archive atomicity, idempotent deletion, revision conflicts and replacement protection.
- **37 browser checks passed with simulated standard gamepads**: independent movement, all three slots for both players, simultaneous upgrades, equip/unequip/sell, Back/tab navigation, cooldown isolation, two Ready, disconnect/reconnect, loot, teleport, save queues and leader departure.
- **18 separate creator browser checks passed**, covering both controllers, full creator tabs, other-controller isolation, creation, named confirmation, cancellation and confirmed deletion of disposable practice heroes. Results are in `tests/hero-browser-results.json`. Ready/Start navigation is also tested with the actual application handler at both 16.7 ms and 1,000 ms frame intervals; the browser harness now uses one-frame button edges to avoid accidental repeats on throttled cloud frames.
- **Real cloud checks passed on two newly created disposable accounts**: create/delete/cancel/retry, protected replacement, mixed boss eligibility, full-inventory pending rewards, restoration, active-session deletion rejection and departure saves. No pre-existing user accounts were read or changed. A preliminary test run also created two disposable accounts; it stopped at a test comparison that was sensitive to JSON property order.
- New backend: `royale-local-heroes` version 1. Existing `royale-v3-staging` remains version 3; existing online endpoints were not deployed. New archive table has RLS and no public/authenticated read or direct function execution grants. No accounts or existing hero records were deleted by the migration.

## Measurements and limitations

The cloud browser measured **7.56–38.28 rendered FPS** across ten scenarios; several samples contain roughly one-second scheduling gaps. Browser frame CPU p95 ranged **2.5–39.9 ms**, with boss rendering and teleport samples the most expensive. Heap samples were approximately **32–37.5 MB**. These measurements do **not** establish 60 FPS or a performance comparison on the owner's computer. Simulation-only timings are recorded separately in `tests/menu-cpu-results.json` and exclude rendering/input hardware/network.

Autosave timer intervals in the browser were **7.94–8.06 seconds**. Cloud writes were tested separately with real disposable accounts. Real USB/Bluetooth controller models, Mac/Windows device rendering, and physical controller-to-display latency remain unmeasured. Use the existing 30 FPS fallback if needed.

Deletion archives currently require maintainer recovery; there is no new player-facing restore-archive interface. A stale tab is rejected by the existing revision fence. The local session guard covers heroes active in this tab; the original V3 account system does not expose cross-device play leases. Keep other tabs using the same hero closed, as before.

## Files

Local co-op `app.mjs`, `index.html`, `style.css`, `cloud.mjs`, `session.mjs`, `equal-xp-authority.mjs`; new `hero-manager.mjs`, `power-hud.mjs`; dedicated backend handler, additive archive migration, tests and lockfile; local development server's hero-management proxy; README and test evidence. Shared single-player modules and online multiplayer files are unchanged.

## Try it

Open the local co-op page, connect both controllers, and enter separate ten-digit codes. Select existing heroes or create one in an empty slot. Each player selects Ready, then select START GAME. Press Start/Options → Superpowers → select an owned power → confirm Slot 1, 2 or 3. Confirm both Ready controls to resume. Chest collection is under Equipment, with pending rewards retained when the inventory is full.
