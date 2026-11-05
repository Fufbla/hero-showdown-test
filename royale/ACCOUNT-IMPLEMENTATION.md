# Player accounts — development checkpoint, not a public release

Public main remains 42a031fa240126feaa0c995e1968aaddd32efcaf. Public multiplayer and account login remain disabled. Existing artwork, combat, progression and other game modes are unchanged.

## Email tests (November 5, 2026)

Sender selected by owner: chrisajamesjr@gmail.com; sender name Healthia Hero Showdown Royale. Google App Password was entered by the owner directly in Supabase SMTP settings. No SMTP credentials are in the repository. SMTP settings cannot be read or edited through the connected tools.

Supabase accepted verification and password-reset requests (HTTP 200) for an isolated Gmail plus-address belonging to the owner. Owner confirmed receipt of both messages. Owner opened verification link; auth.users.email_confirmed_at confirmed success. Subsequent password login succeeded. Safari could not connect to the post-verification host; owner confirmed that hostname is localhost. Password-reset completion, token reuse/expiry, and callback routing are NOT verified. Do not treat HTTP 200 as proof of inbox delivery or a working reset flow.

The old backend callback was a retired ChatGPT site. Prepared backend now targets https://fufbla.github.io/hero-showdown-test/royale/account-callback.html, but that page is NOT deployed. Supabase default Site URL and redirect allowlist still require dashboard inspection; do not replace shared-project settings for other games. Add the precise callback URL only when its staging handler is ready. Do not enable mandatory login until end-to-end link tests pass.

## Actual staging backend

Applied the existing reviewed `20261031125208_royale_accounts.sql` migration to project adakwbhxiuatjvphutgo. Deployed `royale-player-accounts-staging` version 1. It authenticates bearer tokens using Supabase getUser, refuses anonymous users, scopes every hero read/write to that verified account, and calls service-only atomic save RPCs. Gateway JWT validation is disabled because the function validates tokens itself and handles public health/login requests. No privileged key is exposed in the client.

`ROYALE_REGISTRATION_READY` is absent: username signup fails closed with 503. Frontend account configuration remains disconnected; staging is not the live game endpoint. Do not enable this environment flag yet.

The six new tables have RLS enabled and all browser-role privileges revoked. Advisor INFO findings for RLS without policies are intentional deny-all browser access. Actual anonymous/authenticated direct REST denial tests cover this model. Existing shared-project warnings/tables were left untouched.

Real HTTP checks: use `ROYALE_TEST_CREDENTIAL_FILE=/private/path.json node royale/tests/account-staging.mjs`. The file contains only a disposable, verified test account's email/password, must be outside the repository and readable only by the operator. The harness refuses ordinary player addresses and requires empty slots. It creates three test heroes, verifies save semantics, and deletes only those test heroes afterward. No player saves were modified.

## Save protection

- Retain the previous valid local roster envelope before replacing it. Abort durable writes if backup fails.
- Read-only scanner examines known current, backup and legacy hero keys, recovers readable siblings from a damaged envelope, and retains exact source strings.
- Recovery export excludes auth/session keys and unrelated games.
- Recovery panel lists readable copies and downloads an exact backup; it does not automatically restore or import anything.
- Cloud roster refresh validates all slots before replacing the usable roster, and rejects mixed-account or malformed responses without clearing pending requests.
- Historical preservation checks now normalize only these specifically authorized changes; all other save behavior is still compared byte-for-byte with the verified baseline.

The owner's missing phone hero has NOT been recovered. This environment cannot read storage on that phone, other browser profiles, former origins or evicted/private-browser storage. No claim is made that local saves move between devices or origins.

## Still required before public activation

Mandatory login/registration UI, optional verified recovery-email registration, backend username recovery using Gmail (the old disabled adapter uses Resend), one-time recovery codes, settings with reauthentication, automatic authoritative cloud saves, completed migration UI and Legendary-ledger reconciliation, safe callbacks, reset/expiry/reuse tests, distinct-account isolation, full cross-device/browser/controller/mobile tests and backup/restore drills. Existing backend validation is not a new authoritative solo combat simulation; further progression validation review is required.

Do not publish a partial account system. Do not clear legacy saves. Keep public solo play available until all release gates pass. No DNS or Hostinger changes are needed for these development tests.

## Rollback

Rollback reference: rollback/pages-before-player-accounts-20261105 (42a031fa240126feaa0c995e1968aaddd32efcaf). Live frontend has not changed. Disable or remove only the staging function if needed; retain the isolated database tables and backups rather than dropping account data. The new save schema is additive and is not used by public solo gameplay.

## Verification status

Real staging HTTP suite: 18 passed, 0 failed, 0 skipped. The disposable test hero slots were removed after testing; the verified test account remains available for reset-link testing.

New recovery UI has not yet been browser/mobile/controller-tested. No claim is made that the requested complete account system is operational.

Final automated runs: Royale 1,238 passed / 0 failed / 0 skipped; multiplayer regression 57 passed / 0 failed / 0 skipped. Baseline Royale before changes: 1,227 passed / 0 failed / 0 skipped. Eleven focused recovery tests were added. Historical scope tests were updated for the exact authorized save changes; approved balance QA screenshots are checked against the prior release rather than misclassified as changed game artwork. Initial intermediate scope failures are resolved; no assertions were removed without an exact replacement invariant.

## Password callback development checkpoint

Added `account-callback.html`, its mobile CSS and module, and `auth-callback-state.mjs`. The page strips credentials from the address bar before initializing Auth; session persistence and automatic URL detection are disabled. It validates the identity with Auth before showing the reset form, validates password confirmation, prevents duplicate submission, reports failed session revocation, and never accesses hero storage. Verification-only links cannot open the reset form. Current implementation accepts Supabase implicit email-link fragments; PKCE callbacks are deliberately rejected rather than falsely reported successful. Email requests must use an explicitly allowed callback URL and compatible flow.

The callback is NOT publicly deployed. Managed-browser smoke check verified the missing-link error and hidden password form. Real emailed reset completion and phone/controller checks remain unverified. Direct preview on port 4174 was inaccessible to the cloud browser; the supported managed preview on 4173 loaded correctly.

Latest regression results: 1,248 Royale tests passed, 57 multiplayer tests passed, and 18 actual staging HTTP checks passed; zero failed or skipped. The ten new callback tests use an injected Auth stub, so they are not evidence that a real password-reset email was redeemed successfully.

Configuration blockers remain: Supabase's default redirect is localhost; a deployed and approved staging callback must be added to the Auth redirect allowlist. The connector cannot update that setting. Auth's Gmail SMTP secret is not readable by Edge Functions; custom username mail needs its own server-side SMTP credential or another explicitly authorized mail-sending integration. Do not copy credentials into chat, frontend code, repository files or logs. No additional secret has been requested or received in plaintext.

Recovery codes, complete account UI, automatic cloud saving, completed legacy migration and complete mobile end-to-end tests are still unfinished. Public registration and mandatory login remain disabled. This checkpoint does not claim completion of those requirements.
