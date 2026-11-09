# Hero Showdown Royale V3 visual update

Development branch: `feature/royale-visual-fit-world`. Starting release: `0b94a1fbba6ef015146f8f422cec32a63b88377f`.

## Changes

- Inventory: 398 catalog entries across nine equipped slots, 81 power-armor designs, 101 shared wearable sprites, and 49 hairstyle IDs. See [inventory](visual-wearable-inventory.md).
- Full helmets now use full-head registration instead of the small crown placement. Open crowns retain hair. The asymmetric Prism front piece has its own half-head registration. Relay and Switchback profile helmets face the hero's direction.
- Armor width follows the resting shoulder/chest proportions independently from torso length. Front/rear pauldrons follow their respective upper arm; the central breastplate remains on the torso. This applies to existing power armor, legacy suits, regional armor and merge armor.
- Existing gloves, boots, belts, masks and emblems retain their individual joint attachments and ownership. Their artwork and stats were not replaced. Hairstyles and face artwork were preserved; helmet coverage is a rendering choice, not a saved appearance edit.
- Side/rear capes now use the same pinned, velocity-sensitive cloth motion family as gameplay capes, with reusable buffers. Cape color and equipment identity are retained.
- Three cached scenery depths (.045/.12/.32 camera rates), shaded crowns and bark detail, anchored moving foliage/grass, drifting clouds, moving stream highlights, light shafts, mist and crystal pulses. Repeating backdrop seams were corrected. Portals gain pulsed illumination, floor reflection and particle trails without changing interaction geometry.
- Regions: Coastal Beginnings, Polluted Forest, Industrial Wasteland, Toxic Underground, Mutated Territories, Dark Energy Realm and Final Showdown. All three board positions were reviewed for these themes. Eight legendary arenas gain time-driven atmosphere.
- Cache-busted render modules in the solo, V3 wrapper and local co-op entry points. Shared renderer changes also apply to this repository's online renderer; online room/network code is unchanged.

## Verification actually performed

- 104 focused Node regression checks passed: rendering registration, environmental determinism/cache bounds, single-player combat/loot, co-op account isolation/combat/rewards, and preservation against the actual starting release.
- Exhaustive automated wardrobe sweep passed: **398 × 4 directions × 25 poses = 39,800 frames**. Alternating male/female body presets and varied proportions/hair. This proves render completion, finite anchors and no appearance/inventory/hero-state mutation; it is not visual approval of every combination.
- Actual-renderer visual sheets reviewed: every power-armor collection (9 sets each), 11 legacy sets, 18 regional variants, all 8 merge sets, all 49 hair IDs; front/right/back/left. Additional purple-armor punch and female strong/tall merge kick checks. Most set sheets use male balanced idle; this is not an exhaustive visual inspection of every body slider and animation frame.
- Browser co-op: 37 checks passed using **simulated** standard controllers, including simultaneous movement, shared boss/loot, equipment, menu assignment, pause/ready, disconnect/reconnect and leaving while the other hero continues.
- Browser mobile/solo: 84 checks passed across 568×320, 667×375, 844×390, 932×430 and 390×844, using isolated local fixtures. No live heroes were used.
- Foreground co-op run: approximately **31.6–44.7 rendered FPS**, typical scene draw p95 2.6–3.9 ms; boss draw p95 21.8 ms. JS heap samples roughly 33–46 MB. This remote browser does **not** establish 60 FPS, physical-device performance or controller-to-display latency. Background-tab measurements and the attempted baseline run were scheduler-throttled and cannot establish a performance improvement. Raw results are retained below.
- Simulated save timer intervals: 7997.5, 8003.9 and 8006.2 ms, with both queues saving. Protected account/save, progression, combat, inventory, world geometry and source-art files match the starting release. No production account writes, deletions, migrations, or cloud restoration tests were performed for this visual update.
- Earlier historical tests that demand byte identity to older unrelated releases failed their baseline guards. One old whole-body pixel hash also changes because cape rendering intentionally changed. These are not represented as passing tests. The current-baseline preservation test and original default-face pixel check passed.

## Remaining limitations

- Existing armor atlases supply front/profile/back paintings; left armor still uses the established mirrored profile. Independent left-side lighting/asymmetric art has not been newly authored.
- Profile chest paintings remain intact because their overlapping pauldron is not a separately authored component; front/rear shoulder articulation is implemented. Some large crests and mixed-equipment/body-slider combinations still merit individual art refinement.
- Environments are enhanced illustrated procedural scenery, not a full replacement of every background asset. No new waterfall was added where the world had no waterfall geometry.
- Physical iPhone/Android/tablet/controller testing and live multi-device online sessions were unavailable. No claim of zero performance regression on those devices is made.

## Evidence

[Wardrobe before](visual-upgrade-evidence/wardrobe-before.png) · [Wardrobe after](visual-upgrade-evidence/wardrobe-after.png)

[Regions before](visual-upgrade-evidence/world-before.png) · [Regions after](visual-upgrade-evidence/world-after.png)

[Co-op foreground measurements](visual-upgrade-evidence/visual-coop-foreground.txt) · [Mobile/solo checks](visual-upgrade-evidence/visual-mobile-checks.txt) · [Automated wardrobe sweep](visual-upgrade-evidence/wardrobe-test.log) · [104 regression checks](visual-upgrade-evidence/visual-regression.log)

Repeat automated render sweep with `node --expose-gc royale/tests/wardrobe-render.test.mjs`. The native canvas readback flush is necessary to avoid retaining queued test drawings. This correction was verified against a case that also exhausted memory on the unchanged baseline.
