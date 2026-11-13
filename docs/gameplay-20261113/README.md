# Approved V3 gameplay implementation — 2026-11-13

Branch: `feature/v3-approved-economy-20261113`  
Review and deployment record: https://github.com/Fufbla/hero-showdown-test/pull/20  
Target: https://fufbla.github.io/hero-showdown-test/royale-v3-staging/

Started from verified main `f93df6bb68c5c75c09e9be6d2eb12665a5cb1746` and integrated newer main `9c8617e5ed3b6d3afc9f83530c520c2a9a36b3ab`, including the black costume hood lining fix. The shared production game and artwork files are unchanged. Generated adapters apply only through V3 import maps. No save records or database schema were migrated in bulk.

## Implemented behavior

Regular monster rewards use the defeated monster's actual level, including all bracket boundaries. The schedule is 1 / 2 / 3 / 5 / 8 / 12 / 18 / 25 / 35 coins at levels 1 / 20 / 30 / 40 / 50 / 60 / 70 / 80 / 90. New regular drops contain no equipment or Health Roots. Existing XP formulas, regular health, damage, and night difficulty are unchanged. The former night coin multiplier does not override the exact approved schedule.

All 15 bosses have exactly twice their previous maximum HP. Damage, movement, abilities, attacks, XP, and existing artwork are unchanged.

| Boss | Previous HP | New HP |
| --- | ---: | ---: |
| Trash Monster | 950 | 1,900 |
| Bushman | 2,600 | 5,200 |
| Wastelander | 6,000 | 12,000 |
| Giant Scorpion | 11,000 | 22,000 |
| Venomis | 18,000 | 36,000 |
| AtomDust | 28,000 | 56,000 |
| Ultimate Pollution Boss | 42,000 | 84,000 |
| Each of the eight legendary bosses | 126,000 | 252,000 |

Regular first-defeat chests contain only the approved 100 / 200 / 400 / 750 / 1,200 coins at boss levels 1 / 20 / 40 / 60 / 80. The old immediate 100-coin first-win payment is removed so it cannot be paid twice. An already-available legacy chest subtracts its previously granted 100 coins from the new tier total. Previously claimed chests remain claimed. Repeat-victory rewards retain their existing 10 coins. Legendary chests retain both unique equipment pieces and existing eligibility. Owned inventory and pending rewards are preserved.

## Recovered fast-travel economy

The approved chart was recovered from the earlier gameplay change discussion; it was not replaced with a new economy. Every trip, including returns, is paid. Price uses the highest actual resident monster level on the destination board. All three current boards in each region share the following fee.

| Destination level | Approved price |
| --- | ---: |
| 1–19 | 100 |
| 20–29 | 200 |
| 30–39 | 300 |
| 40–49 | 500 |
| 50–59 | 800 |
| 60–69 | 1,200 |
| 70–79 | 1,800 |
| 80–89 | 2,500 |
| 90–99 | 3,500 |

| Current region | Highest resident level | Coins |
| --- | ---: | ---: |
| Coastal Beginnings | 8 | 100 |
| Polluted Forest | 20 | 200 |
| Industrial Wasteland | 35 | 300 |
| Toxic Underground | 50 | 800 |
| Mutated Territories | 65 | 1,200 |
| Dark Energy Realm | 80 | 2,500 |
| Final Showdown | 99 | 3,500 |
| Legendary destination | 99 | 3,500 |

The map and physical fast-travel portal display exact prices and require confirmation. Locked destinations, insufficient funds, stale revisions, failed travel and same-board trips do not debit. Successful travel precedes the debit; the destination and transaction are checkpointed together, including legendary entry. Former free command aliases require the same payment/revision checks.

Every one of the 21 overworld boards has four portals: entrance, paid fast travel, regional boss entrance, exit. A shared catalog controls rendering and interaction. Existing ground, environmental art and animated portal atlases are unchanged. Entrance/exit links preserve sequential progression; the outermost first entrance and final exit return to the existing Tree of Eris hub. Boss entrances return to the originating board. The existing shared-screen co-op restriction on individual fast travel remains in force; ordinary entrance/exit travel is free.

## Verification

- Integrated latest-main code commit `56fdd9551b929aa0023c7b2bb661abf51879fd77`: [GitHub Actions run 43397699352](https://github.com/Fufbla/hero-showdown-test/actions/runs/43397699352) passed the reproducible build, protected-production-file comparison, 202 automated tests, and Chromium browser test.
- Tests exercise all 99 monster levels in day/night; all 15 boss HP values; seven regional and eight legendary reward lifecycles; duplicate claims; legacy chest migration; independent co-op eligibility; all 21 board portal destinations and ground accessibility; every price bracket; failed/insufficient/stale/return travel; save normalization; real armor combat effects; costume and boss presentation; local co-op save/controller logic.
- Costume checks retain all ten approved costumes, 480 poses and 16,464 hood/face combinations. Existing boss tests cover 15 atlases/240 poses and 77 attacks. No costume/boss/portal atlas was regenerated for this work.
- Chromium used reserved code `0000000000` in an isolated browser profile, with test-only local balances. It verified the displayed 3,500-coin confirmation, one debit, exact destination restoration after reload, unchanged identity/inventory/XP, and disabled travel at 99 coins. No page errors or failed same-origin requests. Browser evidence is attached to the Actions run. This is automated browser testing, not a manual combat playthrough.
- Initial browser test failed because its selector targeted a hidden HUD button. Correcting it to the actual World Map control passed. No unresolved automated test failures.
- Staging Supabase function `royale-v3-staging` was updated from version 8 to 9 with additive economy guards, then re-fetched and compared against all seven expected source files. Existing authentication, schema, cosmetics guards and optimistic revision checks remain. The new guard rejects reopened first-defeat chests, reward-version rollback, changed coin-only chest amounts and rollback of recorded spending. This is continuity validation, not a replacement for server-authoritative combat.

## Unfinished or externally blocked

- No verifiable costume retirement list was found. All existing owned cosmetics and the ten newly approved costumes remain. Specific retirement names need approval before removal.
- The previously completed boss redesign is present on the reserved KingJames test route only. Ordinary cloud and local co-op routes still use the prior boss renderer/attack presentation. Extending the 15-atlas/77-attack redesign to those routes is outside this approved preservation change and was not attempted.
- Code `0000000000` intentionally uses local saves. Live cloud save/reload testing requires another account. Automatic approval review rejected creating a separate QA account because the task supplied only the existing test code. No new account was created. Live cloud mutation tests remain unrun; the opt-in script is prepared but never invoked by CI.
- Online multiplayer is unconfigured on main (`royale/multiplayer/config.json` is absent). The separate multiplayer development branch/PR was not changed. No live two-device online test or physical two-controller playthrough was performed. Automated local co-op tests passed.

Deployment status and the final deployment SHA are recorded in PR #20 after the Pages job and live staging verification. Production gameplay assets are byte-identical to the verified baseline.
