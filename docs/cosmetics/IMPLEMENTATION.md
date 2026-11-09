# Cosmetic clothing development — NOT RELEASED

Base live commit: `8c3c3083afdf433c24b843319d1025e0e7077f7f`.
Branch: `feature/universal-cosmetic-wardrobe`.
Latest checkpoint: 2026-11-09, shared body renderer and wardrobe integration.

## Release decision

Do not merge or deploy this branch yet. The corrected Royal Kimono atlas approved on 2026-11-09 remains unchanged. It is attached to the actual hero renderer as three modular pieces: full outfit, footwear and headwear. Approval applies to that artwork; complete animation fitting and release reviews remain open. The initial atlas remains rejected.

Royal Kimono is `fitting`; the other 35 sets are `art-pending`. Production prices are unset and no costume is for sale. Do not treat catalog registration, successful rendering, or the practice fixture as completed artwork or production acceptance. Finish the 36-set collection, backend protection and device checks before publishing, as the user requested.

## User-approved exception

The user chose **Use a fantasy harvest outfit** to replace the generic “Native Heritage” design. Its stable ID is `fantasy-harvest`, displayed as Fantasy Harvest Set. Preserve the exception and the other reference designs.

## Implemented on this branch

- Additive `cosmetics` state inside the existing version-8 save envelope. Old saves receive an empty wardrobe; unknown stable ownership IDs are retained. Unsupported schema is rejected rather than erased.
- Shared body proportions and attachment positions across saved male/female presentations and legacy body-size settings. Rendering uses the common body while retaining saved facial identity, hairstyles and colors. Saved legacy appearance data is not rewritten. Creator controls are limited to hair, eyes, nose, mouth and colors; body controls are hidden. New and existing previews use the same renderer.
- The approved kimono is interleaved into front/right/back/left body rendering. Sleeves bend at elbows; the robe follows the legs; shoes and ornament attach separately. Loaded clothing masks the corresponding underlying armor, including the starter cape. The underlying inventory, armor bonuses, powers and hitboxes are untouched.
- Bounded lazy texture/selection loading shared across previews and heroes. Load failures keep the original armor visible. Saves and visual state carry IDs, revision and visibility, never decoded images or asset paths. Roster previews redraw when clothing finishes loading.
- Tree wardrobe sections: Armor, Clothing Store, My Clothing and Accessories. Category browsing, independent four-view try-on previews, complete sets or pieces, ownership, equip/remove, hide/show and explicit purchase confirmation. Unfinished entries say Coming soon and cannot be purchased.
- A reusable wardrobe component mounted independently for each local co-op player. Transactions use that player's profile and slot. Pending acknowledgements retain the purchased snapshot, prevent resuming, and retry without repeating the debit. In solo mode, local failures restore the full runtime; the V3 wrapper acknowledgement path is reused.
- Controller navigation includes the wardrobe sections and reaches controls across the preview/catalog columns. Separate co-op controller handlers retain their own selection.
- Pure transaction validation covers safe state, wardrobe access, revision/ownership checks, partial-set pricing, full-body/top/bottom exclusivity and duplicate confirmations. Cosmetic purchases use no equipment slots.
- Local co-op combat checkpoints preserve cosmetics. Existing eight-second autosave constants/timer are unchanged. A cosmetic save guard is implemented and tested as a module, but is NOT installed in Supabase.

## Remaining release work

1. Produce faithful modular directional artwork for the other 35 sets. No poster crops or placeholder outfits are substitutes.
2. Polish kimono sleeve joins and robe folds in extreme attack/airborne poses, then complete visual acceptance across every motion. The current skirt is deterministic segmented deformation, not a physical cloth simulation. Check headwear with every hairstyle and inspect existing armor fit on the shared body. Automated frame coverage is not visual approval.
3. Set reviewed production prices and release flags only after fitting/review passes. The practice fixture's 1,000-coin set price is NOT a product decision.
4. Install/test the ownership guard in authenticated single-player and co-op save endpoints, preserving existing profile/slot authorization and revision checks. Test two disposable accounts, all three slots, stale tabs, acknowledgement loss, reconnect, eight-second autosave and restore.
5. Verify online replication and visibility. Compact selection data is present in the visual outfit, but live online clothing visibility has not been verified; online mode remains disabled by existing release configuration.
6. Test physical controllers and portrait/landscape phone/tablet performance. Current browser checks use simulated controllers on a desktop viewport. Existing pause layout redesign is a separate unfinished task; do not claim scroll-free mobile menus.
7. Run the complete release validator, publish only the finished collection, then verify the live game.

## Backend inspection (read only, prior checkpoint)

The active `royale-v3-staging` Edge Function version 3 stores full snapshot JSON with authenticated profile/slot scoping and optimistic revision matching. It accepts additive fields but does not guard cosmetic ownership against older clients. No functions, tables, account rows, sessions or cloud credentials were changed in this checkpoint. Do not enable production sales before installing and verifying that guard.

## Verification

- **138 focused tests pass**, including purchase/state/save isolation, travel, combat, loot, controller navigation, and local co-op behavior.
- **4 native-canvas tests pass**, including **1,712 rendered frames** covering every authored key of all 25 motions, four directions, both saved presentations and legacy body-size extremes. Attachment coordinates match; rendering leaves hero/appearance state unchanged. Also checks lazy failures/retry, independent coverage and compact visual state.
- **398 existing equipment items × 4 directions × 25 motions = 39,800 frames** render without exceptions or state mutation. This is render coverage, not complete visual fitting approval.
- Browser practice purchase: failed local save restores 1,500 coins and zero pieces; success spends 1,000 once, grants three pieces, equips them and restores the saved hero. Armor and HP stay unchanged. Simulated D-pad check reaches 24 controls.
- Local co-op browser practice: 11 checks pass through actual per-player menu/controller/save paths. Lost acknowledgement leaves one purchase pending; retry does not charge twice; neither player resumes while pending; both equip and restore their own clothing; armor/health/powers remain unchanged. This uses in-memory profiles, not live cloud accounts.
- Integrated solo Tree screens and the fixed-body creator were inspected in the browser. Both local co-op clothing panels render independently. Evidence and exact commands are below.
- A broad historical test glob from the prior checkpoint failed old byte-identity baselines and missing historical objects/fixtures in the shallow checkout. Do not report the entire historical suite as green.

```sh
node --test royale/tests/cosmetics.test.mjs royale/tests/travel-eris.test.mjs royale/tests/travel-cloud.test.mjs royale/tests/menu-gamepad.test.mjs royale/tests/menu-navigation.test.mjs royale/tests/v3-combat.test.mjs royale/tests/v3-loot.test.mjs royale/local-coop/tests/local-coop.test.mjs royale/local-coop/tests/requirements.test.mjs
# Requires @napi-rs/canvas on the Node module path:
node --test royale/tests/universal-clothing-render.test.mjs
node --expose-gc --test royale/tests/wardrobe-render.test.mjs
node tools/cosmetics/render-review.mjs
node tools/cosmetics/validate.mjs
node tools/cosmetics/validate.mjs --release
```

The last command MUST fail until all 36 requested costumes are released with passing reviews.

## Review pages and evidence

- `royale/tests/kimono-fitting.html`: actual four-view renderer, both presentations, motion and fixed-frame selectors. No accounts or cloud writes.
- `royale/tests/clothing-store-review.html`: actual store component with an isolated, in-memory kimono sale fixture; failure/restore/controller checks. Prices and release flags exist only in this practice page.
- `royale/local-coop/?qa=1`: choose **Test separate clothing purchases and save retry**. Uses separate in-memory practice profiles and simulated controller input. The optional live-cloud test buttons are separate and were not used.
- `evidence/kimono-male-motions.webp` and `evidence/kimono-female-motions.webp`: 48 fixed-key views from the real renderer.
- `evidence/wardrobe-practice.png`, `evidence/clothing-coop-checks.json`: browser UI and separate-save evidence.

The older `kimono-fitting-review.png` depicts the previous fitting checkpoint and is superseded by these motion sheets.
