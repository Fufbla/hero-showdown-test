# V3 shared cloud save endpoint

`index.ts` tracks the existing `royale-v3-staging` Supabase Edge Function in project
`adakwbhxiuatjvphutgo`. Both solo and local co-op save through this function.
The existing custom session authentication requires `verify_jwt: false` at the
Supabase gateway; the handler itself verifies its 64-hex session token, expiry and
profile. Keep that authentication, origin restriction and revision CAS intact.

Version 5 was deployed and live-tested on 2026-11-09. Deployed SHA-256:
`f511c9e8afe0339bacdec38589b199c6a18da2f476f8796c4117b058962f5935`.
The only subsequent source change is a clarifying comment in `save-guard.mjs`.

Deploy these three files together, preserving their relative paths:

- `backend-v3/index.ts` (entry point)
- `cosmetics/save-guard.mjs`
- `cosmetics/state.mjs`

No schema migration is required. The guard runs after authenticated profile/slot
lookup and before the existing atomic revision-conditioned update. A concurrent
writer still causes a 409. It protects owned clothing against older game tabs;
it is not a server-authoritative anti-cheat wallet implementation.

Use `tools/cosmetics/check-cloud.mjs --live-disposable` to verify new test profiles,
all three slots, 700-coin purchases, restoration, stale tabs, and lost responses.
Never replace that test with a real player's account. Do not remove the guard
when rolling back the UI after purchases have been made: older clients must fail
closed rather than erase ownership. The hero deletion endpoint is unchanged.
