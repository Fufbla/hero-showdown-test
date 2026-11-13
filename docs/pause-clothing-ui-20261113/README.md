# Pause menu and standalone Clothing Store — V3 staging review

Review branch: `review/pause-clothing-store-20261113`

Production baseline and rollback: `dceaffdee5fdb45826062dd4d0f9568694d9a548`, retained as `rollback/pre-pause-clothing-ui-20261113`.

## Scope

The staging interface is a narrow overlay of the latest verified release graph. Production source, character models, approved costume assets, catalog IDs/prices, equipment, combat, save schemas, backend, and co-op logic are unchanged. The new build uses the approved 28-costume graph, not the older 22-entry staging catalog. Online multiplayer remains disabled.

- Seven pause actions in the approved order; no statistics or gameplay HUD behind the pause panel.
- Teal and cream styling, gold Resume, a text-only Clothing Store button, and mint restore button next to the actual slot/timestamp.
- No eight-second autosave banner. The existing timer and event-triggered save bridge remain active.
- A white standalone store with the actual hero, existing running frames, both directions, a scrollable catalog, owned/equipped distinctions, and temporary Buy/Cancel dialog.
- Preview state never writes hero appearance, currency, inventory, or equipment. Explicit Equip uses the established cosmetic transaction path.
- Cloud purchases still wait for authenticated parent acknowledgement; pending purchases block navigation and duplicate submissions.
- Restore delegates to the existing parent account restore operation. Reserved code 0000000000 uses its existing isolated local namespace and never authenticates with Supabase.
- Sprite fitting measures existing complete-frame artwork and reserves padding. It does not alter source artwork.

## Validation

74 automated checks pass. See `tests.txt`. Coverage includes confirmation/cancel, delayed duplicate tapping, insufficient balance, failed acknowledgement, all 28 prices and identities, local save/reload, equipment/powers/XP/position preservation, cloud queue deduplication and recovery, stale cosmetic revisions, save guards, current travel policy, armor separation, menu routing, and co-op data isolation.

The earlier legacy travel-cloud fixture assumes the superseded 100-coin travel price and fails against the current economy. It was replaced in this run by current travel-portals coverage and explicit interface cloud-bridge tests; no gameplay pricing was changed.

Browser checks use only existing test hero 0000000000:

- Existing KingJames appearance, owned Dolphin outfit, and both saved slots loaded.
- Cancel kept 19,300 coins and did not unlock Pink Shark.
- Buy Pink Shark charged 700 once, leaving 18,600. Equip was a separate operation. Ownership and equipped outfit survived reload.
- Selecting every one of 28 outfits rendered a running preview; see `outfit-browser-checks.json`. Left and right controls worked. Exiting set the animation state to stopped.
- Tree of Eris retains Upgrade Powers, Armor Equipment and Inventory & Equipment; no clothing tab.
- Pause menu has exactly seven primary buttons, no icon on Clothing Store, no HUD or autosave banner, and a non-overlapping footer.
- Responsive viewports checked: 320×568, 390×844, 844×390, 768×1024, 1024×768 and desktop 1363×936 / 1280×800. Long pages scroll; carousel scrolls separately; confirmation controls fit inside the viewport.
- Screenshots record portrait pause/store and landscape confirmation. These are browser viewport checks, not physical-device/controller tests.

## Staging-only publication

`staging-interface.yml` downloads the already deployed Pages artifact from run 43509370838. It verifies the main branch and production manifest are still at the baseline, adds only `/royale-v3-staging/`, and asserts every file outside that directory is byte-for-byte unchanged. It rechecks main immediately before deployment. Main is not merged or updated.

The staging URL is https://fufbla.github.io/hero-showdown-test/royale-v3-staging/ . `interface-manifest.json` reports the review commit, production baseline, and preserved-file count.

## Verification limits

0000000000 is browser-local by design. Authenticated cloud queue/acknowledgement/recovery contracts were tested with simulated responses; no real-player account or live cross-device save was accessed. Physical two-controller co-op and Safari were not re-tested for this interface-only update. Production deployment requires separate user approval.
