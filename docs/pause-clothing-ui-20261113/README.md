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

## Verified staging publication

Deployed application source: `a3c5df49e970cde505fcc822029cabc03b78d86a`.

The review build passed all 74 tests in run [43515370987](https://github.com/Fufbla/hero-showdown-test/actions/runs/43515370987). Its direct deployment was rejected because the existing github-pages environment accepts main, not the review branch. No environment protections or permissions were changed.

The verified artifact was published through a configuration-only workflow on main in successful run [43516322115](https://github.com/Fufbla/hero-showdown-test/actions/runs/43516322115), publishing commit `a043ffac135ee0eef0ec4c5c0f972e075f55c461`. That workflow compared the complete artifact with the previously deployed production artifact and confirmed **all 1,368 files outside royale-v3-staging were byte-for-byte unchanged**. No interface implementation was merged into main or released to production.

The publishing workflow is now manual-only and refuses a repeat publication if production has changed from the pinned baseline. Its follow-up configuration commit is `2b280d02bbb20cf86291bb11771d4cab9701a62d`. The review branch includes this identical configuration plus the verification record; these documentation/configuration additions do not change the deployed application bundle.

Verified public URL: https://fufbla.github.io/hero-showdown-test/royale-v3-staging/ . The published `interface-manifest.json` confirms application source a3c5df4, production baseline dceaffd, 1,368 preserved files, 28 costumes and online multiplayer disabled. The production `/royale/release-manifest.json` still reports dceaffd.

### Checks against the deployed website

- Root launcher loads staging, with the existing local co-op entry and no online multiplayer entry.
- Reserved code 0000000000 loads its existing KingJames hero; no new account or replacement hero was created. Its zero coin balance, appearance, powers and world location were retained.
- Pause has the seven ordered actions, actual saved-slot footer, no statistics/HUD or autosave banner, and the text-only Clothing Store entry.
- Tree of Eris retains Upgrade Powers, Armor Equipment and Inventory & Equipment without a Clothing Store tab.
- All 28 store cards are present. Existing hero running preview switches between outfits, and stops after leaving the store.
- Buy opens the 700-coin Dolphin confirmation. Zero balance produces the clear insufficient-funds message. Cancel closes the dialog and preserves the preview and zero balance without ownership changes.
- Save Game updated the actual saved timestamp; reload retained KingJames, level, region/board, appearance, zero balance and existing maxed test powers.
- Deployed 390×844 portrait and 844×390 landscape layouts were checked, including a fully visible confirmation dialog. Phone, tablet and desktop viewport coverage was completed before deployment as described above.
- `deployed-*.jpg` are screenshots from the published staging site. The earlier screenshots and successful 700-coin purchase/reload evidence are from the local build, using the same reserved test code in its separate localhost namespace.

## Verification limits

0000000000 is browser-local by design. Authenticated cloud queue/acknowledgement/recovery contracts were tested with simulated responses; no real-player account or live cross-device save was accessed. Physical two-controller co-op and Safari were not re-tested for this interface-only update. Production deployment requires separate user approval.
