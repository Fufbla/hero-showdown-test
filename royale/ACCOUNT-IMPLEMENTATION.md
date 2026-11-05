# Account continuation — 2026-11-05

Started from remote `feature/royale-player-accounts` at `f5b14a7dfc1555c257f8f726140294269d36a63f`. All following changes are on that development branch only.

## What changed

- Each cloud mutation writes its exact payload and retry ID to an account/slot-specific browser journal before sending it. After reopening, an uncertain write pauses account play and can be retried idempotently. This includes all three slots, imports, deletes, and permanent transactions. Failed journal writes stop before network submission.
- Forced autosaves during an in-flight write retain the latest checkpoint; leaving a hero/account awaits the save queue. Late errors from an old account no longer replace the current screen.
- Recovery settings offer a draft download and an explicitly confirmed reload of server progress. Reload archives the original draft before replacing its marker. Legacy local save keys remain untouched.
- Import verification compares complete snapshots independent of JSONB property order. Failed read-back blocks further writes. Concurrent imports and stale revisions cannot replace existing cloud heroes.
- Optional account screens and mandatory login now have separate gates, both off. Once approved for optional rollout, new browsers see Create Account / Log In; browsers with local heroes retain local play and can enter accounts to import. An unrelated local multiplayer transfer marker no longer intercepts a cloud hero in the same numbered slot. Multiplayer source is unchanged.
- An expired authenticated session can be cleared locally; network failures still retain it for retry.

## Validation

Final verification: **1,292 Royale tests passed; 57 multiplayer tests passed; six real staging safety probes passed. Zero failures/skips in the final runs.** Current browser workflow execution remains blocked, as detailed below. Coverage includes:

- Actual PGlite/PostgreSQL migration and transactions: three complete browser-save imports; level, XP, appearance, equipment, powers, region, health, and exact position on independent clients; autosaving all slots; stale-write rejection; concurrent-import winner; duplicate source rejection; owner isolation; anonymous/authenticated direct-access denial.
- Lost-response/restart/retry in every slot, durable-backup failure, explicit archival, account isolation, JSONB read-back, permanent-transaction retry, forced-save coalescing and late-session errors.
- Six real staging safety probes passed: health, unsigned roster denial, unsigned recovery-identity denial, public registration closure, foreign-origin denial and anonymous direct-table denial. No real account was created and no player save was changed by these probes.
- A Chromium + actual Supabase browser SDK HTTP-fixture runner is provided at `tests/player-accounts-e2e.mjs`. It has NOT run successfully in this continuation: local Chromium cannot create its process socket (`Operation not permitted`), and the cloud browser could not reach this checkout's isolated preview server. Do not count its assertions as passing. Prior 84 UI checks apply to the previous commit, not these corrections.
- An initial full parallel regression run lost a Style C test worker to SIGKILL under resource pressure; the final run limits test concurrency. A missing local `ws` dependency was supplied from the existing pinned installation; multiplayer then passed 57/57. No dependencies or lockfiles were changed.

## Release blockers — not completed

1. The existing additive recovery migration still needs successful Supabase confirmation. The connector returned `status: expired` for the attempted application. A subsequent database read confirms the recovery-code, application-session and security-epoch tables are absent. Staging remains version 4; the new backend was not deployed against an incompatible schema.
2. After migration, deploy the existing reviewed three-file staging bundle, keep public registration closed, and execute `tests/player-accounts-staging.mjs` with disposable invitation-only fixtures. Verify real login/logout, code rotation/use/replay, reset fencing, verification email, username display, callback expiration and interruption cases. Current working public password reset is unchanged; the owner's earlier successful reset/replay test is retained as user-confirmed evidence only.
3. Rerun the current browser workflow and controller suite in a browser-enabled environment, then verify the same account on an actual second device. Separate API clients with a local PostgreSQL engine are not physical-device acceptance or live Auth acceptance.
4. The owner's current browser hero has NOT been imported here. It is on the owner's browser. The user confirmed it survives closing/reopening. Keep local play available during rollout; have the owner explicitly import that exact hero into an empty account slot, verify cloud read-back and a second-device load before considering mandatory login.
5. Add/change recovery-email linking remains disabled. Existing Gmail SMTP does not by itself verify the disabled dual-confirmation adapter. Do not enable the old Resend adapter or expose mail credentials.
6. Existing shared-project advisor warnings include disabled [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) and unrelated multiplayer RPC/policy advisories. Account tables are intentionally service-only with RLS and no browser privileges. Other game schemas and Auth settings were not changed.

## Publication rule

The user authorized publishing Create Account / Log In **after all authentication, recovery and cloud-saving checks pass**, and requires the existing hero's safe import before mandatory login. Those conditions are not yet met; neither public frontend nor public registration was activated.

Current public `main`, independently read during this continuation, is `07b8e38e99355c976c5b4b1ac67c76a21105c854` (standalone HUD/skin/controller update). When release conditions pass, integrate only the account changes onto the then-current public branch and preserve those newer interface updates. Do not replace Pages with the older account branch wholesale. Do not force-push or clear saves/tables.

Commands:

```
cd royale
node --test --test-concurrency=2 --test-reporter=tap tests/*.test.mjs
cd multiplayer && npm test
```

Browser fixture runner (requires a local HTTP server and Playwright/Chromium):

```
ROYALE_PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
ROYALE_QA_OUTPUT=/private/test-output node royale/tests/player-accounts-e2e.mjs
```

---

# Prior checkpoint (historical)

# Player accounts — gated development build

## Current public release

The live game remains solo, without mandatory accounts, at https://fufbla.github.io/hero-showdown-test/royale/ . Public main is 61023685f10f1a1bab19cd019bd0c794728e97c4. That release includes the isolated password callback, not the account interface in this branch. `PLAYER_ACCOUNTS_ENABLED=false`; multiplayer is still disabled. No approved artwork, combat, item bonuses, XP, other game modes, Hostinger or DNS settings were changed.

## Confirmed email recovery

Sender: chrisajamesjr@gmail.com / Healthia Hero Showdown Royale. The owner configured Gmail SMTP using a Google App Password privately in Supabase. No SMTP password was read, stored in source, or copied to another service.

The owner confirmed receiving verification and recovery mail. Verification was confirmed in Auth, and password login succeeded before the reset. The owner configured Site URL and the exact `https://fufbla.github.io/hero-showdown-test/royale/account-callback.html` redirect, successfully changed the password in the live callback, and confirmed that opening the consumed link again shows invalid. The original password was independently rejected (HTTP 400 invalid_credentials). The new password remains private; a fresh login with it has not been independently observed. Expiration by elapsed time was not tested. Dashboard redirect configuration was not independently readable through the connector; successful routing is the functional evidence.

## Implemented in this branch, not publicly activated

- Welcome, Create Account, Log In, recovery and settings screens, optional registration email, password confirmation/visibility, and controller focus. No hero is created until explicitly selected. Failed cloud loading never creates a replacement.
- Backend username uniqueness, private staging invitations, rate limiting and Supabase password authentication. Email registration requires verification before login. Public registration stays closed unless the separately reviewed server flag is enabled.
- Eight 256-bit recovery codes; only SHA-256 verifiers are stored. SQL consumes a code once and revokes application sessions. Rotation and password changes require the current password. Credential-generation fencing rejects logins racing a reset, including old JWTs that Auth might otherwise accept until expiration. Provider failure after code consumption requires a different unused code; originals are never re-enabled.
- Username recovery reuses Supabase's configured SMTP: the generic endpoint sends a recovery link, and the verified callback privately displays the username. It does not email passwords or expose username lookup to an unauthenticated caller. No additional Gmail secret is needed for this approach. This new username-display callback version has not been published or tested with real mail.
- Three cloud slots, serialized writes, optimistic revisions, retained retry identifiers, account-specific local recovery drafts, automatic checkpoints every five seconds and on important events, immediate durable inventory transactions, and explicit save confirmation. A failed/uncertain write pauses further account writes until retry or an explicit reload. Manual local saving is unchanged.
- Cloud snapshots reuse the existing serializer through an isolated view, without changing combat rules. Ordinary platform coordinates, facing and health are retained. An unfinished boss arena restores its existing safe entrance; active boss simulation is not persisted. Dead heroes checkpoint on respawn. Browser termination can lose progress since the last server-confirmed save; wait for Cloud saved before closing.
- Explicit local import, known legacy key scanning, immutable source backup, stable IDs for pre-slot saves, permanent-ledger checks, empty-slot-only transactions, and server read-back before success. Original local saves are never cleared. Cloud and local data are not automatically merged.

The missing hero on the owner's phone has NOT been recovered: this environment cannot inspect that phone's storage or another browser/domain. Existing local heroes remain specific to their browser and origin.

## Database approval blocker and safe staging state

`20261031125208_royale_accounts.sql` is applied. Its six Royale tables use RLS with browser-role privileges revoked, and service-only transactional RPCs. Actual anonymous/authenticated REST-denial and save tests previously passed.

The new additive migration `backend/supabase/migrations/20261105133227_royale_account_recovery.sql` is NOT applied. Supabase connector migration confirmation expired twice. A subsequent read-only database check confirmed the new tables are absent. Do not deploy `backend/index.ts` until this migration is reviewed and applied.

The staging function was restored to a compatible version (royale-player-accounts-staging v4): prior cloud-save handlers plus Gmail recovery requests and the corrected callback URL. It does not run the pending code/session implementation. Staging health returned 200 and public signup 503, as intended. Public frontend and the working public callback were not changed in this continuation.

### Next operator action

1. Review the migration above. Approve the Supabase migration confirmation when requested, or run that exact SQL in the project's SQL Editor. It adds only Royale recovery/session/invitation tables and service-only functions. It does not modify Auth settings, SMTP, existing heroes, or other Healthia tables.
2. Deploy the three-file function bundle (`backend/index.ts`, `backend/recovery.mjs`, `backend/validation.mjs`) to **royale-player-accounts-staging**, with gateway verify_jwt=false because the handler validates authenticated requests using getUser. Keep `ROYALE_REGISTRATION_READY` absent/false.
3. Provision short-lived random staging invitations as hashed verifiers, storing plaintext invitations in a private file outside Git. Run `ROYALE_TEST_INVITES_FILE=/private/invites.json node royale/tests/player-accounts-staging.mjs`. Never print credentials, tokens or recovery codes.
4. Verify the new email registration, username display, code recovery, reset fencing, separate-account isolation, exact-position restoration and all-slot migration against the real service. Rerun with two independent browsers/mobile devices. The supplied real-provider harness is not counted as passing until actually executed.
5. Finish safe add/change recovery-email linking. The earlier disabled Resend adapter remains unavailable; it is NOT configured to send Gmail mail and must not be enabled. Do not bypass email ownership confirmation or change shared Auth policy merely to support aliases.
6. Test backup restoration, interrupted password changes, concurrent import/write races and session expiry. Review progression validation: existing structural/monotonic checks do not prove client-reported kills or constitute server-authoritative solo combat. Only after acceptance, publish the reviewed callback enhancement and account frontend through Pages, then enable the frontend/server gates in a separately reviewed activation commit. No automatic activation occurs in this branch.

## Tests and observed scope

- Baseline in this continuation: 1,240 passed / 8 failed / 0 skipped. The eight failures were preservation-scope checks seeing an accidentally placed test log and the new recovery test script, not game failures. The log was moved outside Git and the exact account files were added to the scope list; existing artwork/gameplay comparisons remain intact.
- Final complete Royale run: **1,266 passed / 0 failed / 0 skipped**. Multiplayer regression: **57 passed / 0 failed / 0 skipped**. Tests ran against the staged source including the account-switch ownership fix and new screenshot preservation scope.
- Prior real Supabase suite: 18 passed / 0 failed / 0 skipped, before the owner reset the private fixture password. It covered three slots, two independent sessions, exact coordinates/health, stale-write rejection, idempotency, empty-slot imports and REST permissions. It does not verify the new recovery-code backend.
- Browser interface harness: **84 checks passed**, 28 each at **844×390**, **390×844**, and **568×320**. Actual Chromium with mobile-sized iframes, synthetic standard Gamepad API, no credentials submitted. Physical iPhone/Android/controllers and new end-to-end authentication remain unverified. The initial harness focus failure was resolved by focusing the iframe and waiting for actual Gamepad polls, without weakening navigation assertions.

Commands: `cd royale && npm test`; `cd royale/multiplayer && npm test`. Focused tests are included in the full Royale suite. Backend TypeScript also bundles successfully with esbuild. All private test credentials are outside the repository.

## Rollback and preservation

Development rollback: `rollback/accounts-before-recovery-codes-20261105` at bb4a39e315b701b0fda0531e9403931b9eb94b7b. Existing public rollback: `rollback/pages-before-recovery-callback-20261105` at 42a031fa240126feaa0c995e1968aaddd32efcaf. Do not force-push or drop account tables. Disable gates and revert code with a normal commit while retaining authoritative saves and recovery backups. No cross-device persistence claim is made for the still-local public release.
