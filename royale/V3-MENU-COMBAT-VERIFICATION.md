# V3 Tree menu and monster difficulty verification

Base: `8d518861dd37d0141cb5abfe4355da3d627c6591`, verified against remote `main` before editing.

## Changes

- Moved the existing hamburger into the Tree of Eris header, beside its title, with a 44×44 target and the accessible name **Return to Pause Menu**. Pause/Play keeps its existing handler. Gameplay has no extra hamburger.
- All six Tree tabs share the same stationary header. The existing Appearance editor is mounted in the Tree's scrolling content while editing; creating a new hero still uses the original creator location. Existing confirmation/transaction protections remain in place.
- Every outgoing damage path now applies the same enemy defense and level-gap calculation in `Game.damageEnemy`. Regular monster armor is `1 + 2 × (max(0, level − 20) / 70)²`, with level bounded at 99. Early monsters through level 20 retain their original armor. Level 90 regular enemies have three times their former effective durability at equal level.
- Attacking a higher-level enemy multiplies damage by `1 / (1 + (level gap / 20)²)`. This is always positive. Higher-level enemy attacks multiply incoming damage by `1 + level gap / 50`, before existing equipment, Steel Body, Agility and other defenses.
- Regional and Legendary bosses keep their existing HP, armor rules, phase patterns, telegraphs and cooldowns. Summoned helpers retain their existing base durability. The level-gap calculation also applies to those encounters.
- No HP or player-save migration is needed. Existing wounded monsters keep their saved HP. All player levels, XP, powers, individual equipment rolls, identities, quantities, position and progression remain intact.

## Diagnosis

Enemy levels previously affected rewards but did not reduce the damage of an underleveled hero or amplify damage received from a much stronger enemy. Late-game regular-monster HP also did not keep pace with offensive mastery: a legal Level 90 build could erase a 5,500-HP Guardian in its opening power burst. Equipment bonuses were additive, and melee/projectile hit sets already prevented repeated frame damage; neither needed changing.

The exact reported Level 14 quick kill was **not reproduced** from this latest base with the tested legal loadouts. Its missing level-gap defenses were confirmed. A previously wounded enemy or a different older build/loadout could produce different results; this release does not claim to identify an unobserved cause.

## Before/after measurements

Actual 60 Hz `Game.step`, attack hitboxes, projectiles, combo timing and cooldowns. Legal earned Power Points, level-appropriate ordinary three-piece gear; points spread across Strength, Super Kick and Fireball up to 20, then Speed. Perfect contact with a non-retaliating target isolates output and provides a **lower bound** on fight duration, not an enforced timer. `null` in the raw data means the enemy survived the four-minute limit.

| Hero level | Level 90 Guardian before | After |
|---|---:|---:|
| 1 | 156.92 s | >240 s |
| 14 | 73.20 s | >240 s; 93.2% HP remains |
| 30 | 39.08 s | >240 s; 81.5% HP remains |
| 60 | 6.97 s | 135.15 s |
| 80 | 0.78 s | 23.72 s |
| 90 | 0.27 s | 15.15 s |
| 99 | 0.15 s | 13.58 s |

At Level 90, rare gear produced 15.03 s and no equipment 20.03 s. At Level 99, rare gear produced 10.92 s. Different builds, positioning, missed attacks, dodging and night damage affect real fights.

Level 90 versus the final regional boss: 45.27 → 56.52 s. Versus a Legendary boss: 150.27 → 183.98 s. At Level 99, where the boss level gap is zero, their original timings remain 40.27 s and 136.25 s. Enemy movement, defensive phases and helper waves lengthen real boss encounters beyond these isolated output measurements.

With normal Guardian AI, incoming damage, collision, stun and melee pursuit enabled:

- Level 14: defeated by the first strike at 0.60 s; Guardian retained 5,492.58/5,500 HP. Before: defeated at 3.90 s after using two Roots; Guardian retained 4,986.38 HP.
- Level 90: victory at 15.15 s, nine enemy hits, two Roots used, 708.95 HP remaining. Before: victory at 0.27 s before the Guardian attacked.
- Level 99: victory at 14.03 s, two Roots used. Before: victory at 0.15 s.
- Charging three Guardians without dodging defeated the Level 90 test hero at 7.22 s despite two Roots. Individual attackers and their damage-event deduplication remain independent.

Full measurements: [v3-combat-results.json](tests/v3-combat-results.json). Reusable fixtures: [combat-benchmark.mjs](tests/combat-benchmark.mjs).

## Verification

`node --test royale/tests/v3-combat.test.mjs royale/tests/v3-loot.test.mjs royale/tests/menu-gamepad.test.mjs royale/tests/menu-navigation.test.mjs`

**42 passing tests**, covering levels 1/14/30/60/80/90/99, basics and each offensive attack, max offensive powers, gear, duplicate-hit guards, piercing, crowds, boss phases, open region access, existing saves and the previous cape/loot work. The repeat 10,000-defeat loot simulation remains 196 equipment / 416 Roots / 9,388 nothing.

[Browser regression page](tests/v3-menu-browser.html): **258 menu checks passed** at 844×390, 568×320 and 390×844, plus **20 autosave/reload checks**. Verified all six tabs, fixed button position, non-overlap, scrolling, touch targets, real keyboard Enter/Escape, synthetic standard Gamepad API Confirm/shoulder navigation, exact Resume state and unchanged gameplay canvas dimensions. Visually reviewed the landscape/portrait header and embedded Appearance editor. The page also provides disposable Level 14 and Level 90 Guardian encounters for keyboard/touch playtesting.

Both visible slots emitted periodic progress snapshots about eight seconds apart after Tree/Appearance navigation, with exact powers, equipment, XP, health and location. Both restored after a full game-document reload; stored Slot 3 remained hidden and unchanged.

An isolated newly created test code on the existing live V3 endpoint saved slots 1 and 2, then restored both snapshots byte-for-byte after a fresh code login. Slot 3 remained empty. No existing player code, profile or save was accessed. No backend, login, autosave interval or authentication implementation changed.

Approved image files, character animation modules, region geometry/access, progression rewards, loot probabilities, 20 equipment slots, 10-Root capacity, 20-second drop expiry, helmet rolls, Story Mode, Versus Mode and external websites are outside this diff. Browser viewport checks do not substitute for testing on a physical iPhone or game controller.
