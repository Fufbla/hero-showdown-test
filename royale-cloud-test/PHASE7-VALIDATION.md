# Phase 7 validation — 31 October 2026

Source baseline: Phase 6 `7e19386f7e2d9b8fd3936bda755d27ae6a1dccc0`. Development and delivery branch: `feature/showdown-royale`. This report distinguishes automated checks, staged manual browser review, and testing that still needs real devices.

## Automated results

| Suite | Result | Evidence |
|---|---:|---|
| Full Node engine/save suite | **463 passed, 0 failed** | [Node log](qa/phase7-node-log.txt) |
| Phase 7 browser matrix: 8 bosses × 5 viewports, 3 loadouts | **920 assertions passed** | [Browser log](qa/phase7-browser-log.txt) |
| Real IndexedDB strict durability, concurrent transactions and crash recovery | **10 assertions passed** | [Storage log](qa/phase7-ledger-log.txt) |
| Full inventory, mixed suits, permanently destroyed pieces, forced save failure/retry, Level-98 gate | **17 assertions passed** | [Reward edge log](qa/phase7-reward-edge-log.txt) |
| Phase 6 Eris/shop regression, 5 viewports | **185 assertions passed** | [Eris log](qa/phase7-eris-regression.txt) |
| Phase 5 regional boss regression, 7 bosses × 5 viewports | **688 assertions passed** | [Regional boss log](qa/phase7-boss-regression.txt) |
| Focused Phase 1–4 browser regression at phone width | **266 assertions passed** | [Gameplay log](qa/phase7-gameplay-regression.txt) |
| Phase 1 movement/collision/basic-attack differential | **7,200 simulation steps matched** | `node royale/tests/compare-phase1.mjs` |
| Shared art and original mode isolation | **35 approved dependencies unchanged**; edits confined to `royale/` | [Asset manifest](qa/phase7-asset-manifest.json), `verify-phase7.mjs`, `verify-isolation.mjs` |

The browser total is **2,086 assertions**. The focused early-game regression comprises 18 input, 131 creator/save/render, 65 power and 52 world assertions. All suites use isolated practice storage. Their mutations and staged damage are test fixtures, not naturally earned player progress.

Phase 7 coverage includes Level-99 entry; actual final-boss-derived 126,000 HP; phase thresholds and no regeneration; exactly one eligible normal power disrupted/restored; fourth-slot immunity; single lightning warning marker; distinct attacks; maximum 3×3 helpers and XP-only rewards; boss-plus-helper clear; restart/retreat; three-piece reservation and paused reward UI; inventory capacity; mixed versus complete gear; half cooldowns for all eight Merge powers; Flight/Steel/Agility/roots/wind/basic-power rules; permanent defeat/remains; ownership tombstones; stale snapshot rejection; v1–v6 migration; keyboard/gamepad mapping and touch inputs. Gamepad checks are synthetic.

Responsive matrix sizes: **1280×800, 390×844, 844×390, 320×568, 768×1024**. These are Chromium viewport tests, not physical phones/tablets. The final storage and reward-edge tests were rerun after the visual fixes. No continuous Legendary autosave was added.

## Focused manual browser review

Actual operator-driven interactions were performed in the remote Chromium browser against the locally hosted delivery files:

- Desktop Lightning Spree practice: entered via Continue, moved with the keyboard, jumped, observed incoming damage, the boss HUD and a locked normal power.
- Used clearly labeled staging controls to reach half HP and a three-helper wave. Verified the normal power restored; killing the boss while helpers remained did not award victory. Clearing the helpers opened the paused full-suit reward screen.
- Inspected customized-hero front/back previews and exact bonuses. A browser refresh between victory and claim recovered the unclaimed three-piece reward without respawning the boss.
- Confirmed all three pieces; visited Eris; activated Lightning Spree; switched boots to the starter suit and saw the transformation/fourth slot disappear; restored the complete suit; returned to the cleared arena.
- Activated Lightning Strike with the actual on-screen button. Its fourth button darkened while recovering; the green suit outline and decorative remains were visible together.
- At **390×844**, entered Dr. Styro's arena, clicked the Jump control and observed an airborne hero, then staged a clear. Reviewed front/back rewards, scrolled to the confirmation controls, and confirmed there was no horizontal overflow in the reward body (333 px content/333 px scroll width).
- Found and fixed reward-panel contrast inherited from the earlier light menu, a four-pixel sanctuary button overflow, and an outdated Phase 6 header label.

These were **staged walkthroughs, not unassisted full Legendary victories**. The two observed jumps do not establish manual double-jump timing; that is covered by the automated regressions. Complete mixed-villain combinations and all eight fourth powers were exercised automatically; manual transformation review focused on Lightning Spree, with Dr. Styro preview review.

| Review image | Evidence |
|---|---|
| Reward preview | [Desktop reward](qa/phase7-reward.jpg) |
| Eris transformation | [Complete suit](qa/phase7-tree.jpg) |
| Permanent clear | [Decorative remains](qa/phase7-remains.jpg) |
| Fourth ability | [Lightning Strike and recovering button](qa/phase7-fourth-power.jpg) |
| Phone layout | [Dr. Styro back preview](qa/phase7-phone.jpg) |

Screenshots are from isolated practice sessions; the surrounding practice diagnostics are intentionally visible.

## Measured performance

One 30-second live Lightning Spree sample in the remote browser at 1280×800 reported:

| Metric | Observed |
|---|---:|
| Sampling duration | 30.5 seconds |
| Rendered frame rate | **1.6 FPS** |
| Average canvas draw time | 1.07 ms |
| Maximum canvas draw time | 2.00 ms |
| 95th-percentile frame interval | 1,016.5 ms |

This sample **fails the 60 FPS target**. The roughly one-second frame intervals occurred in this remote browser session; their cause has not been established. Low canvas draw time alone does not prove smooth rendering. Subsequent live diagnostic estimates varied while operating the browser, but are not sustained benchmarks and do not replace this sample. No physical-device performance claim is made. Use the practice page's measurement button on target devices before release.

## Remaining review and limits

- Long, unassisted Level-99 fights, damage/recovery tuning, all eight music mixes and repeated Health Root use need human balance review. Configurable provisional values are listed in [PHASE7.md](PHASE7.md).
- Physical iPhone/Android/tablet/controller tests and Safari/Firefox storage support are unverified. Browsers without confirmed strict IndexedDB durability cannot start irreversible Legendary play; ordinary non-Legendary heroes remain playable.
- All eight living boss sprites use approved existing Healthia artwork. New rig-based Merge costume details, procedural skeletal/crystal/foam/battery remains, arena backgrounds and synthesized music are implementation art/audio requiring approval. They are not final commissioned illustrations or music tracks. The older regular Trash Monster/Ultimate Pollution Boss placeholders remain unchanged.
- Local atomic transactions protect against stale manual saves, racing tabs and interrupted cache updates. They cannot protect against deletion of all browser data, storage eviction/device failure, manual database tampering or restoration of an entire older browser backup. No account/cloud service or anti-cheat guarantee is claimed.
- Main, Story Mode, Versus Mode and the shared approved source assets are unchanged by this phase. Phase 8 has not begun.

## Reproduce

From the repository root run `python3 -m http.server 4173`, then open `/royale/`. The hero-selection screen links to Legendary practice and the separate test runner. Run `node --test royale/tests/*.test.mjs`, `node royale/tests/compare-phase1.mjs`, `node royale/tests/verify-isolation.mjs` and `node royale/tests/verify-phase7.mjs` for local checks. Browser testing requires HTTP hosting; opening files directly does not load ES modules.
