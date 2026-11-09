# Cosmetic clothing development — NOT RELEASED

Base live commit: `8c3c3083afdf433c24b843319d1025e0e7077f7f`.
Branch: `feature/universal-cosmetic-wardrobe`.

## Release decision

Do not merge or deploy this branch yet. The user approved the corrected Royal Kimono atlas on 2026-11-09. That exact PNG is now registered as three modular fitting manifests (full-body, footwear and headwear). Approval applies to the artwork; fitting, animation and release reviews remain open. The initial atlas remains rejected. No cropped poster characters or placeholder costumes are sold.

The mockups show one three-quarter angle per costume, not modular orthographic layers. Right/back/left and animation layers still require faithful art production and comparison on the actual hero rig. No outfit is production-ready. This is a development checkpoint, not a complete integrated release.

## User-approved exception

The user chose **Use a fantasy harvest outfit** when asked about the generic “Native Heritage” design. Its replacement stable ID is `fantasy-harvest`, displayed as Fantasy Harvest Set. Do not use the original generic feathered ceremonial-looking design or claim that the replacement represents a specific culture. The other 35 outfits retain the supplied design requirements.

## Implemented on this branch

- A separately stored `cosmetics` field in the existing version-8 save envelope. Existing saves get an empty wardrobe. Current/future catalog IDs are retained independent of asset paths. Unsupported cosmetic schema is rejected rather than silently erased.
- Local co-op combat checkpoints also preserve cosmetics. Authoritative graph serialization already preserves the per-hero field.
- Pure purchase/selection transactions: explicit confirmation, safe-state and wardrobe checks, revision checks, ownership checks, partial-set pricing, no double deductions, full-body/top/bottom exclusivity, hide without losing ownership.
- A Game adapter that changes only the coin wallet, cosmetic state and existing economy journal. It does not change equipment or power calculations.
- 36 catalog entries and their modular categories/design requirements, 35 marked `art-pending` and Royal Kimono marked `fitting`. Prices are deliberately unset; no real purchase is enabled.
- Candidate fixed-proportion/attachment contract, independent directional asset validation, bounded lazy image cache and per-animation-layer painter. These are not wired into the current renderer; universal body fitting is NOT complete.
- Save guard for older clients and ownership rollback. It is implemented/tested as a module but NOT deployed to Supabase.

## Not implemented / not verified

- Actual universal-body rendering and migration/creator control changes.
- Re-fitting every existing armor/hair/accessory piece and visual regression testing.
- Completed artwork and fitting for all 36 sets. Only the approved corrected Kimono is registered for isolated fitting.
- Clothing Store / My Clothing / Accessories screens, controller navigation, on-hero previews and renderer layer integration.
- Cosmetic changes in the online wire protocol and live multiplayer visibility. Existing online mode remains disabled by the current release configuration.
- Production save-guard installation, live cloud restore, real controllers, mobile/device performance.
- Publication. The last working live game is preserved.

## Backend inspection (read only)

The active `royale-v3-staging` Edge Function version 3 stores the full snapshot JSON with authenticated profile/slot scoping and optimistic revision matching. It accepts additive fields, but does not preserve/check cosmetic ownership against older clients. Before any purchase is enabled, install the guard in both single-player and co-op save paths, test disposable accounts, and test stale tabs/reconnects. Never expose service credentials, bypass profile authorization, or remove existing revision conditions. No backend functions, tables, sessions or account rows were changed in this task.

## Tests

Focused run: **137 tests passed**, including **17 cosmetic tests**. Coverage includes actual Game objects with seven equipped rare armor pieces, unchanged derived equipment/HP/hitboxes/powers/inventory, old save round trips, separate players, co-op combat checkpoints, duplicate confirmations, unavailable assets, ownership retention, and simulated lazy loading.

A broad historical glob was also attempted. It failed on old baseline byte-identity tests and missing historical objects/fixtures in the shallow checkout; it also initially found the co-op checkpoint omission, now fixed and included in the passing focused run. Do not report the entire historical suite as green. An isolated browser fitting review renders the approved Kimono on actual male/female heroes in four views. Face ornament and hem offsets were adjusted. Original armor still shows at shoulders/sides/boots; these are unresolved release blockers. This is not a live-cloud or multiplayer test.

Commands:

```sh
node --test royale/tests/cosmetics.test.mjs royale/tests/travel-eris.test.mjs royale/tests/travel-cloud.test.mjs royale/tests/menu-gamepad.test.mjs royale/tests/menu-navigation.test.mjs royale/tests/v3-combat.test.mjs royale/tests/v3-loot.test.mjs royale/local-coop/tests/local-coop.test.mjs royale/local-coop/tests/requirements.test.mjs
node tools/cosmetics/validate.mjs
node tools/cosmetics/validate.mjs --release
```

The last command MUST fail until all requested costumes are released with passing reviews.

## Kimono fitting checkpoint — 2026-11-09

The isolated page `royale/tests/kimono-fitting.html` uses real hero pose anchors, three modular manifests and one lazily loaded atlas. Sleeves split at elbow joints; footwear and ornament have independent attachments. Idle was visually inspected in all four views for both presentations. Other animation controls are available, but their complete visual acceptance is outstanding. Existing body differences remain visible and universal conversion is still required. No live accounts or cloud writes were used.
