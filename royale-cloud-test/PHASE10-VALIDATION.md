# Phase 10 validation — review build

Tested 2026-10-31 against Phase 9 baseline `42a3760deb46ce22d86d37509e0295d4b7859c0c`. All changes are confined to `royale/` on `feature/showdown-royale`. No Phase 11 work is included. This report distinguishes deterministic checks, scripted browser interaction, agent-operated smoke testing and unavailable physical-device testing.

## Automated checks

| Check | Result | Evidence |
|---|---:|---|
| Node unit, integration and regression tests | 599 passed; 0 failed, skipped or cancelled | [Full output](qa/phase10/node-tests.txt) |
| Phase 1 differential movement/collision/basic attacks | 7,200 matching simulation steps | `node royale/tests/compare-phase1.mjs` |
| Input, creator, powers and world UI, five viewport sizes | 1,375 assertions passed | [Browser log](qa/phase10/browser-core.txt) |
| Tree, equipment shop, upgrades and appearance | 185 passed | [Browser log](qa/phase10/browser-eris.txt) |
| Seven regional bosses, rewards and failure recovery | 690 passed | [Browser log](qa/phase10/browser-bosses.txt) |
| Eight Legendary bosses and Merge mechanics | 920 passed | [Browser log](qa/phase10/browser-legendary.txt) |
| Real IndexedDB atomicity, conflicts and recovery | 10 passed | [Browser log](qa/phase10/browser-ledger.txt) |
| Merge reward/full-inventory/failure cases | 17 passed | [Browser log](qa/phase10/browser-merge-edge.txt) |
| Vertical traversal, elevated enemies and wounded AI | 595 passed | [Browser log](qa/phase10/browser-vertical.txt) |
| Open portals, independent slots and unconfigured account UI | 120 passed | [Browser log](qa/phase10/browser-portals.txt) |
| Phase 10 manual saves, durable deletion and controls | 100 passed | [Browser log](qa/phase10/browser-integration.txt) |
| Isolation, relative imports and protected data | Passed: 340 imports and 35 shared art dependencies | `node royale/tests/verify-phase10.mjs` |

**4,012 scripted browser assertions passed.** Browser layouts: 320×568, 390×844, 844×390, 768×1024 and 1280×800. These run in remote Linux Chrome 155, not five physical devices. Legacy input/power/world suites use accelerated fixed simulation steps through the real DOM input handlers. Controller checks inject a test Gamepad; touch checks dispatch PointerEvents. Boss fixtures use controlled HP, safe/invulnerable heroes and direct test actions to inspect transitions; they are not proof of unassisted encounter difficulty.

All seven regular regions remain open to Level-1 heroes, with safe portal arrivals and combat restrictions. Four elevated tiers above ground remain in every region. The vertical suite checks all 84 required ascent segments, platform landing, camera tracking, elevated patrol/attack/respawn and desperation without threshold knockback. All 21 species and the nine powers retain their existing rules; boss phases remain separate from regular-monster desperation.

Regional and Legendary tests cover phase thresholds, nine-helper limits, XP-only helpers, complete-clear victory, retreat/death resets, first-clear/rematch rules, treasure rarity, Level-99 Legendary entry, power disruption/restoration, single lightning warning, permanent defeat/remains, complete and mixed Merge gear, the protected fourth ability and half cooldown. Ordinary balance tables, XP/loot rates, world geometry and approved art are byte-identical to baseline.

## Bugs found and corrected

- Ordinary movement, pause, checkpoint, portal, boss-entry and roster events silently advanced local saves. Existing heroes now save ordinary progress only through Save Game. Creation and explicit confirmed economic/permanent transactions remain durable.
- Local deletion lacked a permanent hero-ID record. Strict IndexedDB tombstones now precede cache removal, reject stale permanent commits and reconcile stale slots. Failed deletion writes leave the hero intact. New heroes use new IDs.
- Chest claims did not roll back boss-chest state when a durable cache write failed. The transaction wrapper now restores rewards and claim state together. Browser tests inject failure, verify rollback and retry once successfully.
- Bouncing enemy shots assumed the ground was at a fixed height. Swept collision now uses the actual struck solid surface, preserves wall priority and does not treat a side wall as a floor.
- Input handlers had no complete teardown and allocated transient controller/pointer collections. Abort-based disposal removes listeners and clears held input; controller polling stops after destruction.
- QA fixtures could display Continue before asynchronous test handlers were installed. The roster now appears after fixture bootstrap. A watcher-triggered reload invalidated an early test run; only completed uninterrupted runs are included above.

## Performance

Final browser measurements and limitations are recorded below. Raw files: [desktop](qa/phase10/desktop.json), [phone-sized](qa/phase10/phone.json). These are real wall-clock animation-frame measurements, not the smoothed diagnostic badge shown in screenshots.

Environment: remote Linux x86_64, Chrome 155; desktop 1280×800 and phone-sized 390×844 iframes. Seven scenes at each size, each at least 20 wall-clock seconds, with artwork readiness checked before sampling. Empty, 24-monster, upper-tier, heavy-power, Giant Scorpion, Lightning Spree Phase 3 (three initial helpers), and synthetic-touch scenes use the real game loop. Fixtures are invulnerable and isolated from real saves.

| Scene | Desktop FPS | Phone-sized FPS | Desktop / phone 1% low | Ready time ms, desktop / phone | Draw ms, desktop / phone |
|---|---:|---:|---:|---:|---:|
| empty | 1.08 | 0.98 | 0.98 / 0.98 | 173 / 242 | 1.64 / 1.03 |
| monsters | 1.21 | 1.20 | 0.98 / 0.98 | 191 / 173 | 1.46 / 1.07 |
| vertical | 1.00 | 0.99 | 0.98 / 0.98 | 192 / 156 | 1.15 / 1.01 |
| effects | 1.00 | 1.00 | 0.98 / 0.98 | 187 / 185 | 1.61 / 1.20 |
| regional | 1.00 | 1.01 | 0.98 / 0.98 | 162 / 167 | 1.44 / 1.35 |
| legendary | 1.01 | 1.24 | 0.98 / 0.98 | 189 / 161 | 1.13 / 0.95 |
| touch | 1.19 | 1.27 | 0.98 / 0.98 | 172 / 169 | 1.36 / 1.21 |

Frame p95 was 1016–1017 ms. Mean simulation work per delivered frame was 0.15–1.35 ms; mean draw work 0.95–1.64 ms. JS heap start/end samples ranged 24.1–29.6 MiB, with GC fluctuations. These are short JS-heap snapshots, not total browser/GPU memory or a leak certification.

Iframe app readiness took 156–242 ms on the local preview; scene/art readiness added 32–285 ms. Browser caches were not cleared between every scene, so these are warm/local measurements, not public-network cold loading times.

**The 60 FPS target was not achieved or verified here.** The measured callback cadence was roughly one frame per second; only 2.00–2.18 simulation seconds advanced in each ~20-second wall sample because the existing catch-up cap limits long stalls. Thus these runs do not represent twenty uninterrupted seconds of normal-speed combat. The source of the remote frame-delivery limitation is not established. Low draw costs alone cannot prove smooth gameplay. Repeat the same benchmark on actual target devices before release; do not extrapolate this remote result into a claim about every user's hardware. [Measurement screenshot](qa/phase10/benchmark.jpg).

CPU comparison uses Node v24.22.1, Linux x64: seven interleaved warm runs of 6,000 fixed simulation steps per scene. No canvas rendering, loading or network is included. [Raw runs](qa/phase10/cpu.json).

| Simulation scene | Baseline median ms | Phase 10 median ms | Change |
|---|---:|---:|---:|
| Empty | 6.65 | 7.15 | 7.5% slower; 0.50 ms per 6,000 steps |
| 24 regular monsters | 40.88 | 22.32 | 45.4% faster |
| Vertical routes | 69.94 | 54.59 | 21.9% faster |
| Superpower effects | 114.45 | 105.85 | 7.5% faster |
| Regional boss | 33.25 | 32.22 | 3.1% faster |
| Legendary Phase 3 | 49.99 | 48.96 | 2.1% faster |

Small differences are sensitive to scheduling and JIT noise. These CPU results do not establish 60 FPS. The 3,600-tick stress checks per scene exercise longer simulation paths than the remote browser's short rendered samples. Projectile and effect capacity tests verify bounded reuse; short heap samples cannot rule out every long-session memory leak.

Optimizations include bounded projectile pools, in-place compaction, scalar nearest-wall collision scans, cached outfit derivation, reused controller state, conditional HUD updates, offscreen projectile culling and avoiding unchanged canvas resets. Existing fixed-step movement, sprite/background caches, offscreen monster rendering and particle pooling remain.

## Agent-operated manual smoke checks

Using the remote browser UI and native key presses, created **Tide Sentinel**, changed presentation/age/build, switched front/back previews, began Coastal Beginnings, moved, jumped and triggered aerial/basic attacks. Inspected the HP/XP HUD, disabled save/travel during combat, audio enable and independent volume/settings controls. Reloaded the unsaved session and observed the original manually saved starting location. [Royale screenshot](qa/phase10/manual-royale.jpg).

Original modes were served temporarily from the untouched baseline git tree, including their original assets/video. In Versus, selected Solo/Easy, Super Summy versus Air Pollution Monster at Virginia Beach and entered a working fight with movement/attack input. In Story, loaded Episode 1, skipped its playable video and entered a working fight with movement/attack input. [Versus](qa/phase10/original-versus.jpg) · [Story](qa/phase10/original-story.jpg). This was a menu/first-fight smoke check, not complete campaign or multiplayer certification. The temporary copy is excluded from the Royale deployment.

No physical iPhone, Android phone, tablet, controller, Safari or Firefox testing was possible. No listening-quality assessment, full unassisted boss clears, whole-game progression run or long-duration battery/thermal test is claimed.

## Balance, saving and remaining limits

[Balance report](qa/phase10/balance.json) records all 21 monsters, region/night values, XP scaling, ordinary equipment at recommended levels and boss health/damage. Uninterrupted basic-attack estimates are lower bounds, not measured player clear times. No numerical nerfs or buffs were justified by these automated tests; late-game grinding and group difficulty need human review. The regular final boss remains 42,000 HP and each Legendary remains 126,000 HP.

Save migration and local ownership, independent slots, retired item IDs, once-only claims and tombstone recovery are tested. Cloud validation code remains covered by existing unit tests; **cloud login, recovery, OAuth providers and cloud saving have no deployed end-to-end verification**. Phase 8 backend/configuration is unchanged. Local durability cannot prevent rollback of a complete browser-data backup, storage clearing or deliberate client tampering. Missing/corrupt authority records continue to block irreversible Legendary rewards.

Provisional artwork remains for Trash Monster, Ultimate Pollution Boss, the eight adaptive Merge motifs and decorative skeletons. Approved canonical assets were preserved. The seven exploration motifs, regional-boss motif and eight Legendary motifs are lightweight synthesized loops; fuller genre arrangements, ambience and creative/audio listening review remain unfinished.

Main, Versus, Story, shared approved assets, the equipment catalog, balance data and the authentication backend remain unchanged. This is a tested review build with outstanding performance, artwork, account deployment and physical-device validation work—not release-ready certification.
