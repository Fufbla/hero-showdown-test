# Phase 10 audit — recorded before major system edits

Baseline: `42a3760deb46ce22d86d37509e0295d4b7859c0c`, `feature/showdown-royale`. Scope: Royale client, tests and documentation. Main, Story/Versus, shared approved artwork, vendor bundles and the unfinished Phase 8 backend remain protected.

## Confirmed findings and planned fixes

| Finding | Evidence | Planned correction |
|---|---|---|
| Ordinary local progress is periodically saved despite manual-save requirements | `app.mjs` calls `persist()` every five seconds, on pause, hide, checkpoint, travel and roster changes; `LocalHeroStore.writeSlot` writes storage immediately | Stop ordinary implicit local writes. Keep initial hero creation, explicit Save Game and confirmed economic/permanent transactions durable. Test that movement/pausing do not move the last manual location. |
| Local deletion is not durably tombstoned | `deleteSlot()` uses a non-atomic fallback; the permanent ledger records rewards/discards but not hero deletion | Add strict IndexedDB deletion records keyed by immutable hero ID, reject subsequent permanent commits, reconcile stale slots by removing only deleted heroes. Failed durable deletion must leave the hero intact. |
| Projectile collision creates multiple temporary arrays per shot per tick | `stepEnemyProjectiles` uses filter/map/filter/sort; `segmentHit` creates nested arrays; Fireball contacts allocate arrays | Use scalar swept collision and nearest-wall scans; compact bounded projectile lists in place and reuse regular/boss shot and Fireball records. Preserve collision order, wall priority and piercing. |
| Equipment/pose and input calculations repeatedly allocate | Equipment normalization in hot Speed getters; repeated outfit construction; pointer array and gamepad Set recreation | Cache only safe derived visual data, use normalized bounded speed values, reuse input state and clean up listeners. Preserve caps and all gameplay calculations. |
| HUD rewrites unchanged content ten times per second | `updateHud`/`updatePowers` assigns text, attributes and Rest innerHTML without change checks | Update only changed values and reuse button references; keep HP/XP visible and combat feedback prompt. |
| Audio is incomplete | Only eight synthesized Legendary themes and short event tones exist; no seven-region score, regular-boss score or separate volume controls | Add lightweight original region/regular-boss motifs, independent persisted music/SFX levels (music default 35%), bounded voices and scene transitions. Retain Legendary identities. |
| Test shortcuts are presented in the normal roster | Phase 9 links directly to boss/power fixtures from My Heroes | Keep fixtures in explicit QA/review pages, hide them in normal gameplay. Never expose fixture actions to an ordinary session. |
| Old rendering helper and historical data appear unused | `Renderer.sky` is superseded by `EnvironmentArt`; older world surfaces are still used by regression fixtures/decorative ground checks | Remove only locally proven unreachable helper code, not shared files or historical fixtures. No speculative file deletion. |
| Phase 9 remote performance is inadequate evidence of 60 FPS | 1.1–1.5 rendered FPS, ~1 ms draw cost and ~1-second frame intervals | Add representative automatic benchmark scenes with separate frame/simulation/draw/HUD measurements, low-frame metrics, loading and optional JS heap; report environment limits honestly. |

## Preserved architecture and risks

- Fixed 1/60 simulation with bounded catch-up, swept collision, buffered/coyote jumps and capped gameplay speed already exist. Optimize surrounding work before considering movement changes.
- The 24 regular enemies per region, four elevated tiers, bounded render caches and particle pool already exist. Do not introduce an expensive navigation system or offscreen timing changes without evidence.
- Bosses have dedicated state machines; wounded regular AI is separate. No HP/damage/drop/XP nerfs are justified by the initial audit. Produce a repeatable balance report before adjusting values.
- Existing economic revision/retired-ID checks and strict Legendary transactions should remain. Browser-local storage cannot protect against clearing all browser data or restoring an entire old browser backup; cloud authority is not configured and is outside this phase.
- Cloud validation can be tested as code. Deployed account/cloud-save end-to-end testing cannot be claimed.
- Two regional boss designs, eight adaptive Merge motifs and skeletal illustrations remain provisional. No canonical replacement artwork will be invented.
- Browser automation is not physical iPhone/Android/tablet/controller testing. Actual-device certification and sustained 60 FPS remain open until measured.

Findings discovered during implementation and final verification are recorded in the Phase 10 validation report. This document is the initial audit, not a claim that its planned corrections were already completed.
