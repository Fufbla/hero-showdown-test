# V3 phase portal correction — November 13, 2026

The previous implementation treated the three terrain sections within each phase as separate travel boards. It created twelve physical portals and three fast-travel destinations per phase. The corrected scope is **four portals per phase across all seven phases**, with seven regional fast-travel choices total.

| Position | Portal | Behavior |
| --- | --- | --- |
| Beginning, X 44 | Entrance | Previous phase end; the first phase retains the Tree of Eris boundary |
| Beginning, X 250 | Fast travel | Paid destination picker with one choice per phase; always lands at X 160 |
| End, X 5840 | Boss entrance | Existing regional boss; returns to this portal |
| End, X 6070 | Exit | Next phase beginning; the final phase retains the Tree of Eris boundary |

There are no portals between terrain sections and no section destinations in the World Map. Old section-target travel commands are rejected before payment. Nearby-portal detection also uses the new catalog, so removed portals cannot invisibly activate. Rendering and interaction consume the same four-entry phase catalog.

Terrain sections and checkpoints remain internal save data. Existing saves in the middle or end of a phase retain their exact position, inventory and progress. No cloud schema, player records, bosses, costumes, terrain, combat or prices are changed. The approved phase prices remain 100 / 200 / 300 / 800 / 1,200 / 2,500 / 3,500 coins. Shared-screen travel restrictions and Legendary arena behavior remain unchanged.

Validation before publication: 47 economy/travel/save tests and 118 armor/boss/co-op regressions passed. Tests exercise all 28 physical portals, all 56 removed locations, sequential phase links, boss returns, seven paid destinations, legacy saved coordinates, invalid destinations, insufficient balances and payment revisions. The Chromium test now requires exactly seven map buttons, no section names, and arrival/save/reload at the destination start. Generated staging adapters are reproducible; shared production files are unchanged.
