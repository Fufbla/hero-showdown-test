# V3 loot, inventory and cape release — 2026-11-06

Base: `fcb2592b4589f17547754523795a4deacd40e41e` on `main`.
Playable entry: https://fufbla.github.io/hero-showdown-test/royale-v3-staging/

## Behavior

- One independent regular-monster outcome roll: 2% equipment, 4% Health Root,
  94% nothing. Equipment subtype and stat sampling happen only after equipment
  wins. Summoned helpers retain their existing XP-only behavior. XP and coin
  rewards are unchanged.
- Ground equipment and Roots expire 20 seconds after becoming collectible.
  Absolute deadlines cover pauses, background tabs, region travel, save/load,
  and stale pickup buttons. Collected items carry no timer. Expiration removes
  the ground object and its procedural glow; no extra timeout handles exist.
- Boss chests, pending chest rewards and Legendary progression rewards are
  outside the expiring drop array. Their reward counts, rarity selection,
  coins, Roots and claim rules are unchanged.
- Newly generated numeric loot helmets store their own `stats` beside their
  stable `uid` and `catalogId`. Old items without `stats` continue using the
  unchanged catalog. Equip, unequip, cards, comparison, sale review, local
  saves and cloud snapshots all use the individual roll.
- The existing catalog provides fixed tier values, not explicit random ranges.
  Ranges are derived conservatively from neighboring existing levels, using
  half the adjacent stat gap for variation, never exceeding today's value.
  Lower-level maxima are capped at the next level's minimum across ordinary
  and rare numeric loot helmets. Zero bonuses remain zero. Shop-only power
  armor and permanent Legendary suit bonuses are not randomized.
- All inventory paths consistently support 20 carried equipment items and
  10 Health Roots, including the previously missed shop/chest/Legendary paths.
- Live Style C painted capes now use shoulder-pinned, damped motion, increasing
  with speed and responding to takeoff, double jumps, descent, turning and
  landing. Existing bitmap assets are unchanged. Static creator/reference
  previews retain their existing rendering.
- Cache-versioned module imports cover both the V3 parent and the game iframe,
  so the parent save decoder preserves the new stat records immediately.

## Verification

`node --test royale/tests/v3-loot.test.mjs royale/tests/menu-gamepad.test.mjs royale/tests/menu-navigation.test.mjs`

27 tests passed, zero failures. All top-level Royale modules passed syntax
checks; `git diff --check` passed.

10,000 simulated regular defeats through the actual reward path (fixed seed):

| Outcome | Count | Observed rate | Target |
| --- | ---: | ---: | ---: |
| Equipment | 196 | 1.96% | 2% |
| Health Root | 416 | 4.16% | 4% |
| Nothing | 9,388 | 93.88% | 94% |

Automated coverage includes expiry at the 20-second boundary, stale and repeated
pickup rejection, no item allocation on misses, equipped/collected-item safety,
permanent chest and Legendary reward safety, every numeric helmet tier and
rarity boundary, legacy helmets, malformed stats, unique IDs, sale/equip
persistence, all capacity paths, and independent slot restoration.

The browser harness at `royale/tests/v3-loot-browser.html` passed 23 checks in
an 844×390 landscape iframe, plus three persistent-storage checks after a full
page reload. It exercised both visible heroes, actual individual equipment
cards, 20 unique items per hero, 10 Roots, exact saved position, eight-second
progress messages, and unchanged hidden third-slot data. Male/female cape
states were visually inspected using the live painted renderer. This was a
cloud-browser check, not a physical iPhone/controller performance certification.

An isolated new test profile also passed live requests to the existing V3
cloud endpoint: save slots 1 and 2 with 20 rolled helmets and 10 Roots, create a
fresh login session, reload and compare full snapshots, decode locally, and
confirm slot 3 remains null. No existing player profile was read or modified.
Authentication code, backend/database configuration and autosave timing were
not changed.

Only `royale/` and the V3 parent module import map changed. Root Story/Versus,
other game copies, approved artwork and authentication source remain unchanged.
