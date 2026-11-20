# Vice Costume approved live release

Vice Costume is released to the live game and remains available in the existing
isolated `0000000000` test profile. It uses the approved black shorts, white tank
with neon-pink Vice lettering, backward black cap, and black shades. It is unisex
and costs 700 coins. Purchases do not automatically equip it.

The permanent ownership reference is `vice-costume.fullbody`, unchanged from the
approved test version. Both live and reserved test heroes use the canonical
31-costume collection in `royale/fashion/catalog.mjs`; this folder no longer
appends a separate Vice entry. Fancy Costume and all earlier purchases remain.

The production renderer and its approved assets live under
`royale/fashion/vice/`. The head keeps the player's existing face, skin and hair
colors, hides the crown hair under the backward cap, and preserves lengths
hanging below it. Cap, glasses and lettering assets and every authored body
pose are unchanged from the approved test artwork. The compatibility modules
in this folder reexport the production renderer, definitions, catalog and
ownership rules for the original review tools and focused tests.

The reserved test profile still uses its separate browser storage. Its existing
wallet and one-time 10,000-coin grant are unchanged; entering the live release
does not replenish spent test coins or transfer test coins to a live account.
The `scope.mjs` helper only describes the reserved route and code for review
checks; Vice availability no longer depends on that context.

The live save service receives the same additive Vice ownership policy as the
client. Existing save schemas, purchase prices, gender restrictions and account
records are preserved. This release does not require a database migration.

The focused tests in this folder check shared catalog identity, historical
ownership, purchase/equip persistence, test wallet isolation, all hairstyle
fitting, clothing color preservation, and every approved action pose. The
release browser checks exercise live and reserved preview/buy/equip/reload
flows using disposable fixtures.
