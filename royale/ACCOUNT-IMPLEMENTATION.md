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
