# Four approved looks — live release verification

Approval promotes the Mailman Costume, Firefighter Costume, Ghost Transformation, and Wolf Transformation into the existing production Clothing Store. Each costs 700 coins and retains its permanent ownership ID from the reserved test. The previous production site was `62549a7d7d4f7dbc23efd27492da1bc097804a6c`.

## Artwork and runtime

| Look | Permanent ID | Authored poses | Behavior |
| --- | --- | ---: | --- |
| Mailman Costume | `mailman-costume` | 48 | Customized head and skin, fitted cap, shoulder mailbag |
| Firefighter Costume | `firefighter-costume` | 48 | Customized head and skin, fitted helmet, turnout gear |
| Ghost Transformation | `ghost-transformation` | 48 | Complete floating body, gliding movement and authored attacks |
| Wolf Transformation | `wolf-transformation` | 56 | Upright walking, four-legged running, lowering/rising transitions |

All ten approved raster files are byte-identical to the reserved release. The three non-Mailman manifests are also unchanged. Mailman frames 10 and 21 have a five-pixel downward head-anchor correction, closing a thin transparent seam while preserving body placement, head size, hand attachments, and every other manifest field. The historical test manifest remains unchanged, and a source registration override makes the correction reproducible.

The canonical runtime and assets are under `royale/fashion/new-costumes/`. The reserved application imports the same renderer and catalog through compatibility facades. Production contains 35 unique outfits; the previous 31 catalog records, prices, asset URLs, policy entries, historical ownership mappings, and appearance behavior are unchanged. Core movement, input, powers, flight, and gameplay rendering sources are unchanged.

## Local verification

| Gate | Result |
| --- | ---: |
| Production runtime, gameplay, appearance, catalog, and save compatibility | 388 / 388 passed |
| Universal starter suit | 7 / 7 passed |
| Reserved profile, powers, and existing Fancy/Vice checks | 109 / 109 passed |
| New costume rendering, ownership, and reserved isolation | 19 / 19 passed |
| Total | 523 / 523 passed |

The new renderer checks cover 336 action/presentation/direction combinations. The complete head/hood/transformation gate passes across 35 costumes and 2,888 frames, retaining its original opaque-contact threshold. The legacy complete-costume suite now checks all 776 poses, including the wolf's extra gait poses, and explicitly verifies metallic creature silhouettes and restoration after Steel Body.

The existing catalog-count assertions were updated for the four additions. Hood and human-head tests retain their original requirements for their applicable costumes; full transformations are checked for the approved creature appearance and preservation of saved human appearance data.

## Cloud save service

The existing `royale-v3-staging` function in project `adakwbhxiuatjvphutgo` was verified at version 19 before deployment. Its 14 retrieved source files matched the repository package exactly. Version 20 changes only `fashion/definitions.mjs` and `fashion/extend-policy.mjs` to recognize the four permanent costume IDs.

Version 20 was retrieved after deployment, and all 14 deployed source files matched the prepared package. The exact retrieved handler passed five tests using a revision-aware in-memory database, including normal purchase, separate equip, and server reload for all four looks and both presentations while retaining previous outfits, progression, appearance, and other hero slots. Live endpoint checks confirmed the expected CORS response, rejection without a session, and rejection of an invalid origin.

Authentication settings, account handling, save revisions, economy and power rules, and database schema are unchanged. No real hero account was created, read, or modified during verification. The deployment metadata and file hashes are recorded in `royale/four-powers/backend-v3/package.json`.

## Publishing gate

The production browser gate uses the ordinary welcome page, code-login interface, Clothing Store, and save bridge with disposable intercepted cloud responses. It verifies 700-coin deductions, separate durable equips, reload from the acknowledged server snapshot, customized appearances, retained ownership and other slots, and portrait/landscape controls. World screenshots use normal UI and keyboard inputs for wolf walking/running and the equipped ghost; production exposes no reserved review bridge.

The workflow must pass this browser gate, the existing solo/co-op and media checks, and the reserved browser checks before deploying. It uploads the production screenshots and report as `production-costume-browser`, and the reserved evidence as `reserved-costume-browser`.
