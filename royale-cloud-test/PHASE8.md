# Phase 8 review build — open world and account integration

This is **not yet a completed cloud-account release**. Open-world exploration is playable. Account/client/backend code is included, but the Supabase database deployment confirmation expired twice; no Phase 8 schema or function was enabled. Google, Apple, email delivery and recovery have not been configured or tested end to end. The account panel disables unavailable methods. Existing browser-local heroes remain playable.

## Play and review

Open the existing private playtest and choose a hero. **Pause → World map & safe travel** reaches any of the seven regular regions, even at Level 1 with no boss wins. A **World Portal** button also appears beside safe camp portals. Travel costs nothing and arrives at the destination's first safe checkpoint. Health, coins, XP, inventory and powers are preserved. Recommended levels describe unchanged enemy difficulty. Legendary arenas still require Level 99, an equipped normal power and durable Legendary storage.

Attacking or taking damage locks travel and saving for five simulation seconds; pausing does not count as time outside combat. Active boss encounters always block travel. Leave an arena normally to retreat. Boss reward, chest and rematch logic is unchanged.

**My Heroes** displays three actual customized hero portraits with current costumes, names, levels, regions, save times, Continue/Create and confirmed Delete. Local data stays local unless the player explicitly imports it into an empty account slot. The **Account** button opens login, recovery and migration interfaces. Those cloud functions are unavailable in this review deployment.

## Implemented account architecture (not deployed)

- Pinned Supabase Auth SDK, PKCE redirects, managed password hashing and standard refreshable sessions. Frontend configuration contains only the public project URL/publishable key.
- Email/password, Google and Apple adapters remain capability-gated. Signed-in provider linking uses `linkIdentity`; there is no client-created secondary account merge or coin/equipment transfer.
- Username/passcode accounts use private normalized username mappings and random internal email aliases. A passphrase requires at least 15 characters, at most 72 UTF-8 bytes, varied characters and no all-numeric PIN. Signup requires acknowledging the exact no-recovery warning.
- Private, RLS-enabled `royale8_*` tables deny all anonymous/authenticated Data API access. The authenticated Edge endpoint derives ownership from Supabase `getUser`, never a supplied owner ID. Only the service role may call transaction/rate-limit functions.
- Exactly three numbered slots per owner, stable hero UUIDs, deletion tombstones, expected revisions and idempotent request IDs. A repeated old result cannot resurrect data after a later write or deletion. Hero deletion removes its snapshot and cached payloads while retaining import/tombstone safeguards; other heroes are unaffected.
- Ordinary cloud play updates an in-memory cache. Only creation, explicit migration, Pause → Save Game, deletion and irreversible Legendary events contact cloud storage. No continuous ordinary gameplay autosave is added. Existing local behavior remains unchanged.
- Legendary victory reservation, complete reward claim and permanent Legendary discards commit full snapshots atomically. Monotonic records and retired item identifiers reject older manual snapshots. Transport failures pause irreversible gameplay; retries reuse the transaction ID. Conflicts require reloading authoritative heroes.
- Local migration requires confirmation and an empty cloud slot; no existing cloud hero is overwritten. A local hero ID may be imported only once, including after deletion. Invalid progression is rejected intact. Offline prototype provenance cannot be proven; migration is not an anti-cheat system.
- Loading preserves exact saved position, fractional HP, velocity and double-jump state. Invalid geometry alone falls back to the last checkpoint without silently rewriting the source. Closing a cloud boss battle reloads the last manual/permanent snapshot, with no closure XP penalty or partial boss HP restoration.
- One UTC clock epoch (`2026-01-01T00:00:00Z`) for all heroes. Server time plus a monotonic local elapsed timer drives online time. Local/offline play uses device time and is identified in the clock tooltip; authoritative cross-device synchronization requires the backend.

The server validates snapshot structure, slot ownership, bounded inventory, permanent progression transitions and revisions. It does **not** run authoritative combat simulation or prove that client-reported XP/coins were earned. Ordinary out-of-combat restrictions run in the game client; restart-arena snapshots are also rejected for manual cloud saving. Do not describe this as cheat-proof or as a deployed security audit.

## Required external setup and release gates

1. Approve/apply `backend/supabase/migrations/20261031125208_royale_accounts.sql` to the selected Supabase project. It creates only new Royale-prefixed objects; do not change other Healthia tables.
2. Build validation and deploy `backend/index.ts` plus `backend/validation.mjs` as `royale-accounts`. The function uses platform-managed `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`; never copy a service key into frontend code. JWT gateway verification is disabled **only because this endpoint handles public signup and verifies every data request itself**.
3. Run staging/live API tests with two disposable accounts before releasing account access: signup/login, wrong passcodes and rate limits, refresh/logout, three slots, cross-owner access, duplicate requests, stale revisions, concurrent saves, deletion/recreation, import, all permanent reward transitions and reload recovery. These tests are not yet completed.
4. Configure SMTP/verified sender and Supabase Auth URL allowlists for the actual HTTPS `/royale/` origin and reset callback. Test email verification, generic forgot-password responses, reset expiry, single use and session handling. Only then set `email_ready` in `royale8_configuration`.
5. Configure Google OAuth client credentials and Apple Services ID/team/key/private-key/client-secret rotation using the provider dashboards and Supabase's documented callback. Test login, cancellation, existing-email collisions and identity linking without creating duplicate heroes. Only then enable the corresponding readiness flag.
6. Username recovery-email linking remains disabled. It requires verified mail delivery (`ROYALE_MAIL_API_KEY`, `ROYALE_MAIL_FROM`), verified secure dual email confirmation behavior, and `ROYALE_DUAL_CONFIRMATION_VERIFIED=true`. The implementation confirms only the application's inaccessible internal alias; the real email must be verified by its owner. Do not weaken shared-project confirmation settings. Test collisions, races, replay, provider errors and username login after verification before setting `recovery_ready`. This adapter has not been end-to-end tested.
7. Run Supabase security/performance advisors after deployment, review trusted proxy IP handling and abuse quotas, and verify revoked-session behavior. Global auth settings on the shared project were not changed. No external credentials were invented.

## Tests and known limits

- Automated Node tests: **494 passed, 0 failed**. They include Phases 1–7 regressions and Phase 8 rules, validation and cloud-cache tests.
- Local PostgreSQL (PGlite) executes the actual migration and tests privileged-function permissions, slot limits, owner/reference mismatch, atomic request deduplication, conflicts, delete/recreate, migration reuse and permanent Legendary rollback rejection. It does not exercise the deployed Edge Function or real Supabase Auth.
- Browser automation: 120 assertions across 390×844, 844×390, 360×740, 820×1180 and 1440×900. Covers all seven L1 portal destinations, safe arrivals, independent slot data, portraits, touch targets, overflow, Legendary locks, no-recovery warning and disabled unconfigured methods. Test fixtures use isolated session storage.
- Direct cloud-Chrome playtesting: inspected My Heroes and the portal map; continued a L1 hero in Final Showdown, returned to the coast, jumped/aerial-punched, and verified manual-save and every portal button lock during combat. This was not an extended boss-combat session.
- No physical iPhone, Android or tablet was tested. No new sustained-FPS measurement was taken; no 60 FPS claim.
- Live cloud login, manual cloud saving/loading, provider recovery and cross-device clock tests are blocked/unverified. Phase 8 is incomplete until these release gates pass. No Phase 9 work.

## Reproduce

```sh
cd royale
npm ci --ignore-scripts
npm run build:auth
npm run build:server
node --test tests/*.test.mjs
cd ..
node royale/tests/verify-phase8.mjs
node royale/tests/verify-isolation.mjs
```

Serve the repository using the existing static hosting setup, then open `/royale/`. `/royale/tests/phase8-browser.html` runs the visible five-viewport matrix. Account testing requires the configured HTTPS backend; the matrix deliberately does not create real accounts. Test logs and review screenshots are in `qa/phase8-*`.
