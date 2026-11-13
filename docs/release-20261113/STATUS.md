# V3 final cleanup — candidate saved, production release held

This branch prepares the approved V3 experience for the existing `/royale/` path. **It has not been deployed.** The user authorized only a verified, non-destructive release; the remaining checks below are mandatory. Do not merge or bypass the deployment gate to make the checklist appear complete.

## Baseline and rollback

- Repository: https://github.com/Fufbla/hero-showdown-test
- Candidate branch: `release/v3-final-cleanup-20261113`
- Verified baseline/main: `af68f4ea08b0ceee920e7ec5d0e6f9a4098ee97b`
- Remote rollback branch: `rollback/pre-v3-final-release-20261113`, pointing to that baseline.
- Existing live path, opened in the browser: https://fufbla.github.io/hero-showdown-test/royale/
- Existing staging, opened in the browser: https://fufbla.github.io/hero-showdown-test/royale-v3-staging/
- Root menu currently links to staging. The candidate artifact changes that link to the existing `/royale/` path and redirects the former staging home there.
- Neither production nor staging was changed in this task. Main remained at the baseline during final verification.

## Implemented in the candidate

| Area | Result |
| --- | --- |
| Scenery | Removed camp flags, directional signs, start sign, region haze/mist and foreground color overlays in shared region renderers; retained terrain, natural lighting, portals and combat effects. No artwork was regenerated. |
| Pause | Six requested actions, consistent 48px minimum targets, two columns on larger screens and one column on phones; removed World Map and Inventory & Equipment entries. |
| World Map | Opens only on the portal event with a nearby portal. Paid destinations and coin checks remain intact. Removed co-op menu and controller-tab shortcuts. |
| Inventory | Available from Tree of Eris; inventory storage and equipped armor calculations retained. |
| Production package | Bundles the approved V3 economy, portal, armor, boss, costume and full-frame character modules for ordinary heroes at `/royale/`; retains the original local hero namespace plus the existing V3 cloud login and local co-op routes. |
| Developer isolation | Does not publish raw game source, test pages, boss launchers, outfit trial controls, QA harnesses or the zero-code prototype. Old `qa` and `v2TestCharacter` queries do not enable privileges. Ordinary costume-store fitting previews remain available. |
| Saving | Same V3 service, save version, revision fences, profile keys and three slots. Manual cloud Save waits for the existing acknowledgment path. Local heroes retain their browser namespace. No migrations, database replacement, account reset or production player writes. |
| Deployment | Prepared filtered-artifact workflow with an explicit failing release-readiness gate. Raw recovery artifacts must contain a release manifest. Candidate CI has read-only permissions and cannot deploy. |

## Verification completed

- **183/183** tests passed in the documented current V3 regression suite before packaging; see `staging-tests.txt`. This includes the prior armor-regression comparisons against the known working historical commit.
- **177/177** tests passed against the release-transformed module graph and packaged output; see `runtime-tests.txt`. Coverage includes all 99 monster coin levels, all 15 doubled boss-health definitions, regional and legendary rewards, all seven phase portal layouts and prices, co-op save/reward behavior, 22 costume catalog/animation checks, and actual armor combat.
- Release save fixtures preserve a progressed level-73 hero's XP, coins, exact location, appearance, learned powers and matching equipped armor; three occupied slots survive a one-slot save; malformed saves remain untouched; stale-tab writes are refused.
- Actual armor comparison in the release graph: bare/armored punch damage **7.54666667 / 9.54666667**; incoming damage **100 / 97.5**. Purchasing, wearing, reloading and removing each of the ten mascot/formal costumes preserves the same armor calculations.
- Browser: created a normal personalized hero with box braids and a smile, resumed it after reload, exercised movement/jump/attack inputs, opened the six-action pause menu, saved locally, opened Tree of Eris and inventory, loaded the 22-outfit store and previewed the dolphin hood with a black opening and hidden hair.
- Browser: World Map opened through the starting fast-travel portal; Polluted Forest displayed 200 coins and refused travel with a zero balance. The removed menu options were absent.
- Browser: `?qa=1&v2TestCharacter=0000000000` retained the ordinary level-1 hero with empty powers and zero coins. No debug tools appeared. Co-op `?qa=1` did not launch simulated players.
- Responsive browser check: Chrome at desktop size and 390px/768px iframe viewports; all six pause controls visible, Settings accessible. This is **not** a claim of physical iPhone/iPad/Safari or controller testing. See `responsive-pause.jpg`.
- Initial broad tests also included legacy co-op assertions for superseded free travel and equipment drops; those do not match the approved V3 rules. The documented V3 suite and the release graph above are the relevant passing suites. They were not replaced with weakened assertions.

## Release blockers — not completed

1. **Online multiplayer is not a production V3 integration.** Current main has `MULTIPLAYER_ENABLED=false` in `royale/release-config.mjs` and no `royale/multiplayer/config.json`. The separate branch `feature/royale-v3-online-controller-hud-rewards` at `ce3fb34561d69a94b9a5ffa3d52995712502635e` explicitly uses isolated `royale_mp_test_*` tables and test-copy identities. Its progress is not written back to original V3 heroes. Promoting it blindly would not preserve the requested account/progression behavior. This pre-existing incomplete integration was not replaced or redesigned.
2. **Packaged-browser live-origin verification and physical two-controller co-op remain incomplete.** The existing Supabase V3 service was inspected read-only and is ACTIVE at version 10 on project `adakwbhxiuatjvphutgo`. Browser playtests used an isolated local preview, not production player credentials or real controller devices. The resumed live API checks below now pass ordinary login/save/load; packaged-browser end-to-end and two-device multiplayer are still not claimed.
3. **GitHub Pages must exclusively publish the filtered artifact.** Both dynamic Pages builds and the optimized workflow appeared in recent successful runs. The current optimized workflow previously copied raw source. The candidate prepares the filtered build and recovery check, but Pages source configuration must be confirmed as GitHub Actions before releasing; a branch-based build could otherwise re-expose test URLs. No Pages settings were changed.

`tools/release-build/readiness.json` records these blockers. `node tools/release-build/assert-ready.cjs` deliberately exits 1. This is an internal release check, not a request for deployment approval; the user's existing conditional authorization remains valid after the checks actually pass.

## Resume without repeating completed work

1. Check this branch against current main and retain newer unrelated production changes. Do not regenerate costumes, redo boss designs, or reimplement the completed economy/portal rules.
2. Resolve and verify the production multiplayer/save integration, or obtain an explicit scope decision before treating disabled online multiplayer as a complete release.
3. Verify cloud create/login/load/save/reload and revision conflicts using isolated ordinary QA accounts on the allowed live origin, then play two-controller co-op and mobile/tablet gameplay. Do not use or copy the reserved zero-code prototype into production slots.
4. Confirm Pages is configured to publish only the filtered Actions artifact, and ensure raw/dynamic branch publishing cannot race it.
5. Update readiness only with evidence. Build, test and deploy from the verified commit. Verify the live release manifest matches the committed source and the live game passes the same player flows before reporting deployment success.

Reproduce the candidate without deploying:

```sh
npm ci --prefix tools/release-build
npm install --no-save --no-package-lock @napi-rs/canvas@0.1.100
node tools/build-royale-release.cjs
node --import ./tools/release-build/register.mjs --test tools/release-build/release.test.mjs royale-v3-staging/gameplay/tests/*.test.mjs royale-v3-staging/bosses/tests/*.test.mjs royale-v3-staging/costumes/tests/*.test.mjs royale/local-coop/tests/local-coop.test.mjs
```

The generated `_site/royale/release-manifest.json` records the source commit, source hashes, bundled hashes, save contract and readiness. `_site` and dependency directories are intentionally not committed. Tests and developer sources remain available in Git for maintenance but are omitted from the live artifact.

## Resumed focused verification — 2026-11-13

Runtime candidate remains `3eff7fec2da087a13a3e06ad852f470e89957621`. This follow-up changes verification tools and evidence only; no gameplay, cloud backend, database schema, save format, or deployment configuration was changed. The prior 177 passing release tests were not repeated. Main and hosted production remain unchanged.

- **Live cloud API PASS:** two new ordinary QA accounts, independent login sessions, three slots, acknowledged save, canonical snapshot reload, stale-revision rejection (409), refresh renewal, unused-slot preservation and account isolation. See `cloud-live-resume.json`. These checks used the existing V3 service with the release decoder; they are not a packaged-browser end-to-end test. The two QA accounts are retained for continuation; credentials are private and excluded from Git.
- **Existing-save compatibility PASS:** all 43 existing populated saves (38 version 8, five version 9) were accepted by the candidate decoder/runtime. All preserved wallet/XP/level, name/hair and inventory item IDs, including archived legacy headwear. See `existing-save-validation.json`. No original player save was written.
- **Existing-data integrity PASS:** before and after QA, excluding the two newly created QA profiles, there were 39 profiles, 117 slots and 43 occupied saves. Aggregate snapshot/revision fingerprint remained `3844e6edccc289d940949901e5165f90`. No schema migration, reset or production player update occurred.
- **Online multiplayer FAIL, concrete cause:** deployed `royale-mp-test` version 14 accepts save versions 1–8; V3 uses version 9. Both distinct ordinary QA accounts received HTTP 400, "Saved hero needs recovery. No original data was changed." See `multiplayer-live-resume.json`. No two-player match started. The service also persists isolated test copies instead of production V3 slots. Allowing version 9 or enabling the menu alone would not deliver safe production progression. Production account/save integration and matching V3 server gameplay still need implementation and verification; this is not missing user credentials.
- **Physical local co-op BLOCKED:** the hosted co-op setup was opened in the remote browser. Both controller selectors showed "Connect a controller and press a button"; Ready and Start remained disabled. There are no two physical controllers exposed to this environment. A desktop/laptop with two connected controllers and separate saved heroes is required for the actual input/gameplay/save playtest. No simulated-controller result is reported as a hardware pass.
- **Pages administration unresolved:** the current GitHub connection does not expose Pages administration settings. Confirm Actions-only artifact publication before release so branch publishing cannot expose developer files.

The release gate remains false. Deployment is held, not failed or completed. Developer-tool removal remains verified in the candidate artifact; it is not claimed to be deployed to the unchanged live site. Continue on this same branch/PR, retain the rollback branch, and do not rerun broad suites unless runtime changes warrant them.
