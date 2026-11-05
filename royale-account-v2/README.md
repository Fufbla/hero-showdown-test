# Clean account rebuild — isolated development

This branch starts from main and does not change the live `royale/` game, its artwork, existing browser saves, or existing Supabase account records.

## Architecture
- Supabase Auth email/password and password recovery, using the already configured Supabase project; no custom username-password storage.
- Separate `royale-account-v2/` test application and a new three-slot table with row-level security scoped to `auth.uid()`.
- Exactly one hero per slot, optimistic revision checks, and explicit conflict handling. Never overwrite a newer revision.
- No automatic replay of uncertain network requests. Pending local snapshots are exported/archived without silently replacing server data.
- Gameplay integration only after authentication, recovery, slot isolation, save/restore, and cross-device tests pass.

## Safety gates
1. Review existing schema and Auth redirect configuration read-only.
2. Write and test the replacement in isolation. Do not alter existing account tables.
3. Verify each user's access is limited to their own three slots.
4. Test save revisions, reconnect, network interruption, and password reset.
5. Integrate with a separate playable game build.
6. Keep account login optional until full end-to-end verification.

## Status
- New isolated branch created.
- No migrations, account deletions, or live game changes applied.
