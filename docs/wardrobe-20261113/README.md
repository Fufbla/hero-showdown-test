# Approved wardrobe consolidation — November 13, 2026

Prepared on `fix/v3-approved-wardrobe-20261113`, based on pending portal fix `36d06864d8d8ce69539bb76b577c9edfb9d583c4` and verified GitHub main `a47a8800259b99acae2436711098bb84e9ed37e3`.

The V3 Clothing Store now contains only the 10 mascot/formal costumes and the 12 approved trial outfits, all under **Mascots & Formal**. The 36 legacy store outfits are retired: they are absent from the catalog, cannot be newly bought or worn, and old selections reconcile to the hero's default appearance. Historical ownership IDs remain readable so existing saves and purchased records are not destroyed. The original red jacket remains the test hero's default appearance, outside the 22 store outfits.

The reserved `0000000000` hero's **Try Outfits** menu now offers all 22 designs for free, including **Play in this outfit**. Trials use a separate renderer selection and do not grant ownership or modify coins, equipment, powers, appearance or hero snapshots. The trial choice can be remembered on this browser, and **Use saved outfit** restores the saved selection. A completed store transaction also ends the temporary trial. The ordinary store's free fitting room supports all 22 outfits; permanent purchases still cost 700 coins.

The 12 outfits added to the store are Santa Street, Snowflake Knit, Holiday Velvet, Purple Puffer, Classic Varsity, Olive Bomber, Midnight Leather, Sherpa Denim, Blossom Kimono, Plum & Gold Kimono, Emerald Gala, and Sapphire Starlight. Their existing complete 116-frame artwork is reused, including the customized head and all existing animation states. No artwork was regenerated; ten small mascot menu thumbnails were rendered from the existing approved sprites.

## Future approved outfits

Add an approved, complete entry to `royale-v3-staging/costumes/collection.json` and place its authored manifests/atlases at the corresponding location. Run `node tools/build-kingjames-staging.cjs`. The generated store catalog, client/cloud ownership policies and Try Outfits options all use that one list, so a new store outfit cannot be omitted from free trials. The trial heading/count also derives from that list. The standard renderer contracts remain `mascot` (face-only costume atlas) and `approved` (existing complete character atlas with personalized head).

## Verification and pending publication

Automated coverage includes the exact 22-item catalog, all 36 retired outfits, legacy ownership migration, successful purchase/equip/reload for all 22, free rendering in both directions across ten motion/power states, no save or coin mutation, failed/superseded trial selection, armor combat/stat independence, boss rewards, phase portals, and co-op saves. The full run initially found two tests that explicitly selected now-retired outfits; both fixtures were updated to retained designs and passed without weakening assertions.

Local Chromium UI verification loaded all 22 trial choices, played in Sapphire Starlight, confirmed the unchanged 19,300-coin balance, checked the 22-card store with only Mascots & Formal, and tried Santa Street in the fitting room. The World Map also displayed exactly seven regional destinations. Screenshot: `wardrobe-22-preview.jpg`. This is local QA, not a live deployment.

Publication remains blocked by the earlier automatic approval review requiring explicit authorization to push modified source to the public GitHub repository. Neither these changes nor the pending portal correction have been pushed or deployed. On approval, publish this branch after CI, deploy the matching `royale-v3-staging` cloud function's local cosmetic policy/state/guard alongside the client, and verify live. Preserve the function's existing authentication and unrelated source, and do not change database schema or player records.
