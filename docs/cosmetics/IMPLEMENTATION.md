# Cosmetic wardrobe — 36 outfits at 700 coins

Collection completed on 2026-11-09 on `feature/universal-cosmetic-wardrobe`.
The collection has 12 original designs, 8 Halloween designs, 8 Christmas designs
and 8 harvest designs, with 153 separately owned clothing pieces. Every complete
outfit costs **700 coins**. Individual pieces sum to 700; completing a partly owned
outfit charges only for missing pieces. There is no second charge for owned pieces.

The corrected Royal Kimono atlas approved by the user remains byte-for-byte
unchanged. The other 35 modular atlases were generated using the two supplied
collection sheets and fitted to the shared Style C hero. Fantasy Harvest retains
the user's approved replacement for the generic Native Heritage concept.

## Integrated behavior

- Tree of Eris: Armor, Clothing Store, My Clothing and Accessories. Actual hero
  try-on in four directions, complete-set and individual-piece purchases,
  confirmation, equip/remove, and hide/show. Cosmetics do not consume equipment
  slots or change armor statistics, health, powers or combat hitboxes.
- All saved presentations use the same body proportions and attachment contract.
  Existing faces, hairstyles, colors and saved appearance values are preserved.
  Hoods hide hair only while rendered; hats preserve it. Short sleeves expose the
  hero's current skin color. Snow Hero keeps dark leggings under its shorts.
- Independent source art for front/right/back/left; no mirrored profiles. Sleeves
  bend at the elbows, trousers follow leg joints, shoes follow ankle rotation,
  and skirts follow deterministic segmented draping. This is not cloth physics.
- Lazy texture loading, six decoded textures and four cached selections. Failed
  loads retain original armor and ownership. Saves contain stable clothing IDs,
  visibility and a revision, never textures or artwork paths.
- Solo and local co-op use the same transaction reducer. Each co-op player edits
  and saves their own hero. A pending cloud acknowledgement prevents resuming;
  retry saves the pending snapshot without repeating the purchase debit.
- Existing eight-second autosave timer and cadence are unchanged. The additive
  cosmetics field survives progress snapshots and existing version-8 saves.

## Cloud protection

The authenticated `royale-v3-staging` Edge Function is shared by single-player and
local co-op. Version 5 is active with the ownership guard and the existing
profile/slot authorization and optimistic revision checks. The guard rejects
older tabs that omit clothing, reduced cosmetic revisions, removed ownership and
same-revision loadout changes. Its equality comparison tolerates PostgreSQL jsonb
key ordering. The separate hero-deletion function, database schema, authentication
configuration and players' existing accounts were not changed.

Live verification used two newly created disposable profiles and all six slots:
700-coin purchases, equip, subsequent progress saves, fresh-client restoration,
rejected stale snapshots/ownership removal, independent wardrobes, and a lost
acknowledgement recovered without a second debit. Credentials are not saved in the
repository. See `evidence/cloud-clothing-checks.json` and `royale/backend-v3/README.md`.

## Verification

- 140 focused tests pass: prices, transactions, save isolation, travel, combat,
  loot, controller navigation and local co-op.
- 36 collection render tests pass: 30,816 animation frames, 612 individual-piece
  views, and 7,056 hairstyle views. All 25 authored motions, four directions and
  both saved presentations are covered. Snow Hero was rechecked after leggings
  fitting. These tests check rendering/finite attachments/state preservation;
  they are not a claim of visual inspection of every generated frame.
- Four shared-renderer tests pass, including 1,712 frames with legacy body-size
  variations. Previous equipment coverage rendered 39,800 frames for 398 items.
- All 36 atlases pass read-only alpha checks; all 153 piece manifests validate.
- Actual-renderer idle and kick sheets were visually reviewed for all 36 outfits
  in four directions. Source PNGs remain untouched by the fitting scripts.
- Browser purchase failure rolls back practice coins/ownership; a successful
  purchase costs 700, equips and restores, leaving armor/health unchanged.
- Browser phone-layout checks at 390×844 and 844×390 verify purchase/equip
  controls and no horizontal overflow. This is viewport emulation, not hardware.
- Eleven local co-op browser checks pass through the real controller/menu/save
  paths with simulated pads and separate in-memory profiles. The focused harness
  polls menu input explicitly so background animation throttling cannot stall it.

Physical iPhone/iPad performance and physical controllers have not been tested.
Online mode remains disabled by the existing release configuration; online visual
replication has not been playtested. The separate pause-menu redesign is outside
this outfit change. Clothing catalogs use scrolling to browse the collection.
The historical all-tests glob includes older byte-baseline/fixture dependencies;
it is not claimed as a passing full historical suite.

## Repeatable checks

```sh
node tools/cosmetics/validate.mjs --release
node --test royale/tests/cosmetics.test.mjs royale/tests/travel-eris.test.mjs royale/tests/travel-cloud.test.mjs royale/tests/menu-gamepad.test.mjs royale/tests/menu-navigation.test.mjs royale/tests/v3-combat.test.mjs royale/tests/v3-loot.test.mjs royale/local-coop/tests/local-coop.test.mjs royale/local-coop/tests/requirements.test.mjs
# @napi-rs/canvas must be on the Node module path:
node --test royale/tests/universal-clothing-render.test.mjs
node --expose-gc --test royale/tests/collection-render.test.mjs
node tools/cosmetics/render-collection.mjs
node tools/cosmetics/render-collection.mjs --motion=kick
# Creates NEW disposable cloud profiles; never tests with a player's profile:
node tools/cosmetics/check-cloud.mjs --live-disposable
```

Browser pages: `royale/tests/clothing-store-review.html`,
`royale/tests/clothing-layout-review.html`, and `royale/local-coop/?qa=1` →
**Test separate clothing purchases and save retry**. All practice UI uses isolated
memory. The `collection-idle-*` and `collection-kick-*` evidence sheets use the
actual game renderer.
