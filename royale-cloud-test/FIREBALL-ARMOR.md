# Fireball Power Armor

Open the [Fireball gallery](tests/fireball-review.html) from a running Royale server. Choose a tier and presentation, compare front, profile and rear views, or start an isolated patrol. To buy the armor with a regular hero, enter the Tree of Eris, open Costume Wardrobe, and select Fireball Power Armor. Individual pieces also appear in their normal part categories.

The collection contains 27 items and 81 illustrated component views. The underlying Guardian and Sentinel artwork and the creature assets come from approved commit `dad657dfa04b2b3ac7a3b8612fa728621cad7c4b`. Helmets leave the face and hair silhouette visible. Chest plates use the animated shoulder and hip anchors. Boot shafts and toes follow the shin and foot separately. A normal cape covers part of the rear armor. The gallery can hide it to inspect the back plates.

## Combat and ownership

The helmet adds 1 Fireball damage, the chest adds 2 and the boots add 1. Those individual bonuses work in mixed outfits. Only a matching helmet, chest and boots add effective Fireball levels. The bonus applies when casting a learned Fireball. The normal learned-level ledger and unspent points are independent of the gear. Removing or selling a piece recalculates the next cast immediately. Projectiles already released finish with their cast-time stats.

One projectile at effective levels 1–9, two at 10–19, and three at 20 and above. At 20 and above, each projectile can hit a second target for half damage. Above 20 the existing damage curve continues at +5 per level. At learned level 20, the level-90 set brings Fireball to effective level 29. With only these pieces, that gives 168 damage on the first target and 84 on the second per projectile. Cooldown remains five seconds.

## Economy review

The table uses the proposed prices in the test shop. The three piece prices are helmet / chest / boots. At level 20, a quarter is 312.5 coins. The helmet rounds down and the boots take the remaining coin. A sale pays the existing floor of 25% of the individual catalog price. The inventory limit is seven pieces, including worn equipment.

| Level | Suit | Full price | Piece prices | Full-set levels | Coins earned in 10 min, three runs | Time at median pace |
|---:|---|---:|---|---:|---:|---:|
| 10 | Ember Scout | 500 | 125 / 250 / 125 | +1 | 275–360 | 18 min |
| 20 | Kiln Rider | 1,250 | 312 / 625 / 313 | +2 | 701–1,032 | 18 min |
| 30 | Forge Guard | 2,500 | 625 / 1,250 / 625 | +3 | 953–963 | 26 min |
| 40 | Flare Lancer | 4,500 | 1,125 / 2,250 / 1,125 | +4 | 1,411–2,170 | 23 min |
| 50 | Phoenix Wing | 7,500 | 1,875 / 3,750 / 1,875 | +5 | 1,250–2,172 | 37 min |
| 60 | Caldera Breaker | 12,000 | 3,000 / 6,000 / 3,000 | +6 | 2,084–3,045 | 57 min |
| 70 | Furnace Warden | 18,000 | 4,500 / 9,000 / 4,500 | +7 | 1,427–2,382 | 80 min |
| 80 | Corona Knight | 27,000 | 6,750 / 13,500 / 6,750 | +8 | 2,097–2,383 | 113 min |
| 90 | Supernova Sovereign | 40,000 | 10,000 / 20,000 / 10,000 | +9 | 1,593–3,140 | 135 min |

The estimates use 27 deterministic, ten-minute daylight patrols through the actual simulation. Each started at the listed level in its recommended region with a starter suit, learned Fireball up to the legal maximum, and zero coins. The input driver targeted ground enemies and used ordinary movement, punches and Fireball. It picked up nearby equipment and sold it at the Tree after collecting six pieces. Each sale visit consumed 15 seconds of the ten-minute budget. The clock kept running over defeats. Only coins actually collected or received from sales counted. The time column extrapolates the median of three runs at each starting level. Human play, time spent in menus, and spending on other items change the result.

Regular kills give 1 coin by day or 2 by night. Regions 1 and 2 have permanent daylight. A regional boss gives 100 coins on first victory, a one-time chest of 20–40 coins, and 10 coins per repeat victory. Summoned enemies give no coins. Direct kill coins alone would require 40,000 daytime kills for the final suit. The sale of regional drops makes the high-tier prices attainable.

**Balance judgment.** The first two suits each took an estimated 18 minutes of focused farming. Levels 60–90 ranged from about an hour to two hours and a quarter at the median pace. They are attainable as optional purchases for players who sell drops. Buying every set costs 113,250 coins and requires selling or discarding older pieces to fit the seven-slot inventory. Level 40 was faster to earn than level 30 in the trials because region 4 opens higher-value and rare drops. Keep the proposed prices provisional until human playtests establish whether the late-tier grind feels worthwhile.

Reproduce the benchmark with `node royale/tests/fireball-economy.mjs` and run the game suite with `node --test royale/tests/*.test.mjs` from the repository root. No coin reward changes were made.
