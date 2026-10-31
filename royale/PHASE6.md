# Phase 6 — Tree of Eris, costumes and equipment

This release builds on `3310c269b6b33a702235e68632dbe60b9ccd65ef` on `feature/showdown-royale`. Every change is inside `royale/`. Main, Versus, Story and shared Healthia assets are unchanged. Phase 7 is not activated.

## Play and review

Open the [private playtest](https://healthia-showdown-royale-phase1.gladcreek512.chatgpt.site) and choose **Explore the Tree & Costume Shop**. The practice page creates a disposable hero with selectable level and coins. It uses a separate session-storage namespace and never edits the three normal hero saves. It starts at Eris, so every shop service can be reviewed immediately.

For an existing hero, pause after five seconds without attacking or taking damage and select **Tree of Eris**. Active offensive effects and boss encounters also block travel. In the sanctuary choose **Costume Wardrobe → Buy**. This is the only costume shop. The five services are Upgrade Powers, Costume Wardrobe, Appearance Customization, Health Root Shop and Return to Adventure. Villain Merge is visibly unavailable.

Local launch from the repository root:

```sh
python3 royale/serve.py
```

Open `http://localhost:8000/royale/`. Add `--lan` to test a physical phone/tablet on the same Wi-Fi, or `--port 8001` to change ports. Serve the repository root so unchanged shared animation and boss artwork can load. The private hosted link may require the owner's ChatGPT sign-in.

## Sanctuary travel

Eris has a dedicated comic-book forest scene, original vector tree artwork, glowing green energy and detailed roots. HP and XP remain visible. The adventure's region, board, exact position, facing and movement state are retained; current monster objects, checkpoint state, health and progress are suspended in place. Returning restores that position without loading a new region or respawning the board. A saved Eris visit also restores the correct return location after reload, including a previously cleared boss arena. Locked-region checks still apply.

The real-time day/night clock continues while paused, shopping, at Eris and after closing the game. The sanctuary remains peaceful; its compact adventure clock reflects the region you came from.

## Demonstrate purchases, equipping and selling

1. In Eris practice, keep Level 50 and 5,000 coins. Choose **Costume Wardrobe → Buy → Complete outfits**.
2. Select **Shore Guardian**. Its three pieces cost 150 coins total. Inspect the exact comparison and front/back full-body previews.
3. Choose **Review purchase**, then **Confirm purchase**. The balance becomes 4,850 and inventory becomes 3/7. Canceling a review changes nothing.
4. Open **Owned / Equip**, select each piece and choose **Equip piece**. Three worn pieces still occupy only three physical inventory slots. Equipping a replacement removes the old reference without deleting its item.
5. Open **Sell**, select the Shore Guardian Helmet (49-coin catalog value), review and confirm. It credits 12 coins, removes the worn reference and permanently retires the item's unique ID. Repeating the old confirmation cannot credit again.
6. Inspect Horizon Champion at Level 50: its preview works, but purchase is locked until Level 99. Individual helmets, chest pieces and boots can also be bought.

A full purchase never exceeds seven owned pieces. If a three-piece outfit will not fit, its confirmation shows the incoming pieces and all owned equipment; choose the exact number to discard. Rare items carry a warning. Nothing is removed until the final confirmation succeeds. Failed storage writes roll the whole economic transaction back.

## Configurable catalog and provisional balancing

`costume-catalog.mjs` defines stable catalog IDs, fixed colors, prices, requirements and stats. These are initial playtest values, not final economy balance.

| Complete ordinary outfit | Hero level | Full price |
|---|---:|---:|
| Shore Guardian | 1 | 150 |
| Beacon Knight | 10 | 360 |
| Briar Warden | 20 | 570 |
| Foundry Sentinel | 30 | 780 |
| Cavern Ranger | 40 | 990 |
| Crystal Keeper | 50 | 1,200 |
| Wild Protector | 60 | 1,410 |
| Aether Watcher | 70 | 1,620 |
| Nova Defender | 80 | 1,830 |
| Vanguard Hero | 90 | 2,040 |
| Horizon Champion | 99 | 2,250 |

Every set comprises helmet, chest and boots. Their stat shares are 33%, 33% and the exact remaining 34%; fixed-point rounding ensures the pieces total exactly 100%. There is **no additional matching-set multiplier**. Mixed pieces add only their own contributions. Piece prices also sum exactly to the outfit price. There is no free capacity or special bulk discount.

For catalog index `i = 0…10`, the ordinary full-set bonuses are:

| Bonus | Full-set amount |
|---|---|
| Physical strength | `6 + 4i` |
| Flat physical damage | `3 + 2i` |
| Damage reduction | `2.5% + 1.2%i` |
| Running speed | `2% + 0.8%i` |
| Attack speed | `1.5% + 0.9%i` |
| Flat Fireball damage | `3 + 3i` |
| Root damage per squeeze | `0.6i` |
| Whirlwind damage per tick | `0.8i` |

Natural strength remains `10 + 2 × (hero level − 1)` and is never changed by appearance or equipment. The Wardrobe shows natural strength separately, exact equipped/preview contributions and the applied totals. Equipment defense multiplies Steel Body's existing reduction and is capped at 25%. Combined running and attack-speed bonuses are capped at +60% and +50%, respectively; at maximum passive Speed, additional equipment speed contributes zero. The adapter also caps flat Fireball/Root/Whirlwind bonuses at 80/15/20. All existing power durations, cooldowns, target counts, boss effectiveness and Flight restrictions remain unchanged.

Rare variants have 1.35× ordinary stats and a constant white glow. They are earned, never sold by the shop. Region 4/5/6/7 rare drop rates remain 7/8/9/10%, and Regions 1–3 cannot produce them. New equipment drops and chest rolls use three-piece costumes. Some earned pieces require a later hero level and can be inspected/kept until then. Existing seven-category Phase 4–5 equipment remains usable with its original stats and colors; it is not replaced or silently deleted. Legacy masks/suits conflict correctly with new helmets/chest pieces, and all legacy accessories count toward the same seven-item cap. Their explicit migration catalog values are `100 × region`, doubled for rare items.

Resale is exactly `floor(original catalog value × 0.25)`. Both worn and unworn items are eligible unless classified non-sellable. Duplicate item references, repeated confirmations, overspending and stale revision writes are rejected.

## Power upgrades

Choose **Upgrade Powers**, select any of the nine powers and choose one level, a quantity or **Maximum affordable**. The review shows current/resulting levels, exact before/after ability stats, total point cost and available points. Confirm to apply immediately; cancel spends nothing. Each ability level costs one point, no ability exceeds 20, and spent points cannot be reset. Exactly one point is still earned per hero level. No upgrade animation was added. Speed stays passive; active loadout changes remain in Pause outside combat.

In practice, Level 50 starts with 49 points. Selecting Super Strength and Maximum affordable previews Level 20 for 20 points; confirmation leaves 29. Upgrade another power by three levels to review the bulk flow.

## Appearance and fixed colors

Initial hero creation is free. Existing appearance changes use the same 2D creator with live front/back previews, all existing body/facial options and a final cost confirmation. Hero names and progression are retained. The initial appearance-service prices are:

| Changed group | Cost |
|---|---:|
| Hairstyle and/or hair color | 100 |
| Eye color | 100 |
| Skin tone | 150 |
| Facial features | 200 |
| Height, body build or proportions | 300 |
| Age appearance | 300 |
| Complete makeover | 750 |

A group is charged once per transaction, even if multiple fields change. Presentation changes use the body group (provisional pricing choice). The total is capped at the 750-coin complete-makeover price. Reverting a field before confirmation removes its charge. Coin deduction occurs only after confirmation and a successful save.

Starter primary, secondary, emblem and cape colors remain free to change, along with the existing premade emblem/cape choices. Purchased/earned pieces override only their covered parts with fixed catalog colors; changing starter colors never recolors equipment. All appearance choices remain cosmetic, with unchanged collision, attack reach and stats. Previews are 2D front/back views, not 3D rotation.

## Health Roots and rewards

The Root Shop previews quantity, storage and total cost. Roots cost 50 coins each; purchase one or several up to four carried, with confirmation. Each use heals 25% maximum HP, cannot over-heal and has no cooldown. Roots remain separate from equipment, usable at Eris and in combat. Regular monster drop chance remains 10%; boss helpers remain XP-only.

All equipment rewards are revealed before they become owned. During combat drops queue without interrupting fighting; after five safe seconds the reward comparison opens. Accept, decline with confirmation, or choose an owned item to replace. Pending rewards are not equipped or usable and do not expand the seven carried slots. A long unclaimed queue remains saveable rather than truncating rewards. Boss treasure still reveals its contents before decisions, obeys region rarity limits and appears only on first victory.

## Saves and irreversible transactions

Version-6 snapshots extend the existing three browser-local profiles. Versions 1–5 migrate while retaining progress, numeric XP, appearance, abilities, coins, Roots, equipment, checkpoints, boss wins/chests, world state and clock. Stable item IDs reference an immutable catalog (including fixed colors, rarity and bonuses); IDs are never reused. Equipped items are references to owned physical pieces, not additional copies.

Snapshots include Eris return locations, an economy revision, purchase/sale/discard counters and a short transaction history. Sold/discarded IDs remain permanent tombstones. Safe transactional saves reject older revisions, missing tombstones, reused IDs and decreases to permanent level/power progress. Cross-tab stale writes remain blocked. Transactional changes roll back in memory if durable browser storage fails.

Manual saves still require five safe seconds and no active boss. The pre-existing five-second **safe** autosave schedule remains unchanged; this release does not add a continuous autosave loop. Purchases, sales, discards and confirmed upgrades use one safe atomic save. Closing during an encounter retains the established last-safe/boss-entry snapshot behavior. There are no accounts, cloud saves or authentication. Local storage cannot prevent a user manually replacing browser data or restoring an external backup; server authority is a later phase.

## Phase 7 boundary and artwork

Villain Merge stays disabled. The equipment contract reserves fixed villain colors, three matching pieces, mixed-piece stats, a green aura, no resale, irreversible discard and a future fourth ability slot with half cooldown. There are no Legendary rewards, no active fourth-slot unlock and no Phase 7 boss implementation.

Eris and the ordinary catalog use new code-native artwork inside Royale. Existing customized hero designs, rigs and approved boss art remain intact. Trash Monster and Ultimate Pollution Boss retain the explicitly labeled temporary artwork from Phase 5. Physical-device/controller testing, Safari/Firefox coverage, economy tuning and sustained mobile performance remain review tasks; the validation report distinguishes these from automated browser checks.
