# Cosmetic Clothing Store integration repair — November 9, 2026

Status: diagnosis confirmed; implementation pending. This branch is isolated from main.

## Confirmed
- The 36-outfit catalog exists at `royale/cosmetics/catalog.json`; full sets have `coinPrice: 700`.
- `royale/eris-ui.mjs` imports `WARDROBE_CATALOG` from `./flight-armor.mjs`, displays `shopEntries(this.category)` in the Costume Wardrobe, and uses `g.inventory.items` for owned/sell entries. Those are armor/equipment, not cosmetic outfits.
- `royale/cosmetics/state.mjs` defines a separate cosmetic ownership/equipment transaction model.
- The user sees Shore Guardian Helmet/Chest Piece/Boots and no 36-outfit collection.

## Repair plan (not yet implemented)
1. Keep existing armor/equipment UI and statistics untouched; add a clearly labeled **Clothing Store** tab inside Tree of Eris rather than replacing the equipment wardrobe.
2. Load `./cosmetics/catalog.json` with a visible loading/error state. Show all 36 sets, collection filters, and individual pieces. Full sets must cost exactly 700 coins.
3. Use the cosmetic transaction model for buy/equip/unequip and ensure cosmetic purchases never affect equipment stats, combat, hitboxes, powers, or inventory capacity.
4. Integrate the cosmetic renderer with the universal Style C hero body in all four directions, retaining existing hero customization.
5. Wire cosmetic ownership and equipped appearance to the current cloud-save flow and backend guard; never overwrite newer cloud state or clear ownership from older tabs. Confirm backend compatibility before enabling purchases.
6. Test single-player and two-player local co-op, 8-second autosave, login/reload, insufficient coins, repeated purchase, old-tab conflict, and each outfit's artwork paths.
7. Publish only after the user approves a tested commit.

## Safety
Do not deploy this planning document as a fix. No gameplay code is changed in this branch yet.
