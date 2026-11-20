# Four reserved Hero Royale looks

The approved Mailman Costume, Firefighter Costume, Ghost Transformation, and Wolf Transformation are available only in the existing browser-local test application for account code `0000000000`.

Test entry: https://fufbla.github.io/hero-showdown-test/four-powers-test/

Continue the test hero, then open **Pause → Clothing Store**. Each addition costs **700 test coins** and supports male and female heroes. The existing one-time test-wallet receipt remains unchanged; this feature does not replenish existing wallets or contact the cloud account service.

| Look | Authored poses | Behavior |
| --- | ---: | --- |
| Mailman Costume | 48 | Light-blue shirt, navy shorts, fitted mail cap, and a shoulder mailbag on every action; preserves the customized face, skin, and lower hair. |
| Firefighter Costume | 48 | Tan turnout gear with reflective bands, black boots/gloves, and a fitted red helmet; preserves the customized face, skin, and lower hair. |
| Ghost Transformation | 48 | Complete ghost body, hands and wispy tail; floats above the platform, glides when moving, and uses a tail strike for the kick. |
| Wolf Transformation | 56 | Complete gray-and-cream wolf; walks on two legs, lowers into a four-legged run, then rises before walking again. |

All four support the existing 21 animation states: idle, start, run, stop, jump, double jump, fall, land, punch, kick, Super Strength, Super Kick, fireball, airborne fireball, flight launch, hover, flight, hurt, defeat, recovery, and Seismic Smash. Other powers retain the game’s shared effects and simulation. The wolf adds five gait states. Ghost/wolf Steel Body retains the creature silhouette with a metallic material; human costumes use the existing universal steel transformation.

Use a light touch on the analog stick to walk the wolf and push farther to run. Keyboard direction without Shift walks; Shift runs. Physical gamepads preserve analog speed. The existing local co-op digital movement buttons request running.

## Isolation and compatibility

The new catalog, ownership policy, and renderer are substituted only in `test-only/four-powers/build.cjs` and its matching Node loader. The exact test route and code must both match. Production has no new catalog entries, ownership IDs, artwork requests, or backend migration. Existing released costumes, player appearance fields, powers, balances, cloud saves, and local save keys are preserved.

The publishing workflow compares normal release behavior through its existing gates, then runs the reserved costume tests and real browser purchase/equip/reload checks before deployment. Production manifest source hashes, bundle hashes, catalog/prices, save contract, and multiplayer modes should match the pre-change live baseline. Ordinary build metadata and HTML cache-version query strings may change with the new commit.

## Artwork and reproduction

Approved design previews and newly authored action sheets are retained in `../new-costumes-source/`. `generation-prompts.txt` records the exact built-in Imagegen prompts for each design and headwear asset. `registration-report.json` records source hashes, pose registration, distinct-frame hashes, and effect attachment coordinates. No articulated limb rigs or rotated duplicate poses substitute for the authored action artwork.

```sh
node tools/pack-new-costume-sprites.mjs all
node --import ./test-only/four-powers/register.mjs tools/render-new-costumes-review.mjs /tmp/royale-new-costumes-review --write-previews
node tools/build-royale-release.cjs
node --import ./test-only/four-powers/register.mjs --test --test-concurrency=1 test-only/four-powers/new-costumes/tests/*.test.mjs
```

The packer extracts complete connected silhouettes, removes only registration markers and near-transparent export residue, preserves one uniform scale per costume, and writes transparent lossless atlases. The review command composes the unchanged game heads and hats into store thumbnails and review sheets. Contact sheets are reproducible diagnostics and are not part of the published game.

With the built artifact served under `/hero-showdown-test/` and Playwright Chromium installed, run:

```sh
node --import ./test-only/four-powers/register.mjs tools/release-build/new-costumes-browser.cjs
```

The browser check uses fresh local fixtures, blocks cloud endpoints, verifies purchase deductions and reloads, checks portrait/landscape store controls, and captures the wolf’s two gaits and the floating ghost through the actual world renderer.
