# Four approved Hero Royale looks

The approved Mailman Costume, Firefighter Costume, Ghost Transformation, and Wolf Transformation are released in the live Clothing Store. The reserved browser-local application for account code `0000000000` uses the same production catalog, renderer, ownership IDs, and artwork.

Live entry: https://fufbla.github.io/hero-showdown-test/royale/

Test entry: https://fufbla.github.io/hero-showdown-test/four-powers-test/

Continue a hero, then open **Pause → Clothing Store**. Each addition costs **700 coins** and supports male and female heroes. Live purchases use the existing save service and normal coin balance. The separate test application's existing one-time wallet receipt remains unchanged; it does not replenish existing wallets or contact the cloud account service.

| Look | Authored poses | Behavior |
| --- | ---: | --- |
| Mailman Costume | 48 | Light-blue shirt, navy shorts, fitted mail cap, and a shoulder mailbag on every action; preserves the customized face, skin, and lower hair. |
| Firefighter Costume | 48 | Tan turnout gear with reflective bands, black boots/gloves, and a fitted red helmet; preserves the customized face, skin, and lower hair. |
| Ghost Transformation | 48 | Complete ghost body, hands and wispy tail; floats above the platform, glides when moving, and uses a tail strike for the kick. |
| Wolf Transformation | 56 | Complete gray-and-cream wolf; walks on two legs, lowers into a four-legged run, then rises before walking again. |

All four support the existing 21 animation states: idle, start, run, stop, jump, double jump, fall, land, punch, kick, Super Strength, Super Kick, fireball, airborne fireball, flight launch, hover, flight, hurt, defeat, recovery, and Seismic Smash. Other powers retain the game’s shared effects and simulation. The wolf adds five gait states. Ghost/wolf Steel Body retains the creature silhouette with a metallic material; human costumes use the existing universal steel transformation.

Use a light touch on the analog stick to walk the wolf and push farther to run. Keyboard direction without Shift walks; Shift runs. Physical gamepads preserve analog speed. The existing local co-op digital movement buttons request running.

## Isolation and compatibility

The canonical renderer and all 14 approved asset files live under `royale/fashion/new-costumes/`. The modules in this reserved directory are compatibility facades that reuse production code. The reserved application still requires its exact route and code, keeps its separate local save prefix, and makes no cloud requests. Its compatibility asset URLs are built from the canonical production files.

Production contains 35 unique outfits: the previous 31 entries plus these four additions. The cloud deployment changes only the costume definitions and policy extension to recognize the four permanent ownership IDs. Authentication, account handling, save revisions, economy rules, powers, and the database schema are unchanged. Existing purchases remain owned.

The publishing workflow runs the production compatibility and rendering gates, then checks purchase, equip, and reload through both the normal production code-login flow and the separate test application. Production browser checks intercept cloud requests with revision-aware fixtures; they do not create or change real accounts. Test privileges, test wallet grants, review bridges, and reserved source modules are excluded from the production bundles.

## Artwork and reproduction

Approved design previews and newly authored action sheets are retained in `../new-costumes-source/`. `generation-prompts.txt` records the exact built-in Imagegen prompts for each design and headwear asset. `registration-report.json` records source hashes, pose registration, distinct-frame hashes, and effect attachment coordinates. No articulated limb rigs or rotated duplicate poses substitute for the authored action artwork.

The live promotion preserves all ten approved raster files byte for byte. Two Mailman head attachments (frames 10 and 21) move down five atlas pixels to close a visible neck seam; body placement, head scale, and all other manifest fields are unchanged. `registration-overrides.json` records those metadata-only offsets for reproduction. The original test manifest remains the historical comparison reference.

```sh
node tools/pack-new-costume-sprites.mjs all
node --import ./tools/release-build/register.mjs tools/render-new-costumes-review.mjs /tmp/royale-new-costumes-review --write-previews
node tools/build-royale-release.cjs
node --import ./test-only/four-powers/register.mjs --test --test-concurrency=1 test-only/four-powers/new-costumes/tests/*.test.mjs
```

The packer extracts complete connected silhouettes, removes only registration markers and near-transparent export residue, preserves one uniform scale per costume, and writes transparent lossless atlases to the canonical production asset directory. The review command composes the unchanged game heads and hats into production store thumbnails and review sheets. The original approved test assets remain comparison references. Contact sheets are reproducible diagnostics and are not part of the published game.

With the built artifact served under `/hero-showdown-test/` and Playwright Chromium installed, run:

```sh
node --import ./test-only/four-powers/register.mjs tools/release-build/new-costumes-browser.cjs
node tools/release-build/new-costumes-production-browser.cjs
```

The reserved browser check uses fresh local fixtures, blocks cloud endpoints, verifies purchase deductions and reloads, checks portrait/landscape store controls, and captures the wolf’s two gaits and the floating ghost through the actual world renderer. The production browser check uses the real welcome page, code-login interface, Clothing Store, and save bridge with disposable simulated accounts.
