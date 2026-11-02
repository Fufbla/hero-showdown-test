# World UI and manual loot review

Branch: `feature/royale-world-ui-loot`. Base: `2bd6c6546cf41ee774763b8ed7ba3be88540c8fc`, which includes integration `67c885e14cb8a41bb55772802d3849d498ea3913`. The previously uncommitted arm corrections were reconstructed at the user's request: connected shoulder anchors, raised guard, gait-driven arm swing, consistent elbow bend and visible rear forearm. The source hero branch is unchanged.

## Behavior

Confirmed, eligible regular-monster defeats roll the same Root/equipment probabilities. XP and coins remain automatic. Physical Roots and equipment remain unclaimed in white world orbs; no walk-over collection exists. Summons still award XP only. Boss chests and shop transactions retain their separate mechanics.

E / remappable Interact collects one selected orb. G / remappable Next interaction cycles targets. Touch uses contextual Pick Up/Enter Portal and Next target buttons. Standard controllers use Interact (button 3) and Next interaction (button 16), both remappable. Migration avoids taking existing saved mappings. Picking up loot temporarily suppresses overlapping portals until explicit target cycling or moving away, preventing an extra pickup press from entering a portal.

Orbs fall onto platform surfaces, including all four elevated tiers. Unclaimed loot retains region and position through travel and version-8 save round-trips; old saves without loot remain compatible. Seven equipment slots include worn items; four Roots remain separate. Full equipment opens comparison and confirmed replacement. Leaving keeps the orb. Legendary pieces cannot be replaced by ground loot. Repeated interactions cannot duplicate a collected ID.

Seven themed portal frames share animated energy, bases and subtle particles. The existing destinations, safe arrivals, five-second combat restriction, boss encounter locks and Legendary level restriction remain unchanged.

The Pause Menu has nine primary choices, separate hero/power panels, a compact inventory grid, and grouped settings for audio, remapping, mobile layout and display brightness. Simulation remains paused; the existing world clock continues.

## Art

`assets/items/comic-equipment.png` is a transparent generated atlas of helmet, chest, boots and Health Root. Runtime tinting follows catalog base/accent colors. Ordinary equipment has no glow, rare is white, Legendary is green. The initial vector fallback is retained for loading/error resilience and legacy equipment categories. Full-body costume previews continue to use the actual customized hero renderer and approved worn-equipment geometry; the new painted atlas is inventory/shop artwork, not a replacement for the hero's body rig. The generation brief is in `assets/items/PROMPT.md`.

No monster/boss artwork, renderer, stats, AI, power mechanics, catalog prices/bonuses, ownership rules, Story or Versus files changed.

## Validation

- Clean baseline: 874 automated tests passed.
- Final automated results: `qa/world-ui/automated-tests.txt`.
- Hero rendering: 6,443 assertions; 2,139 draws; 23 poses; all customization options, proportion extremes and 155 equipment definitions.
- Creature rendering: 9,288 checks covering all 36 creatures, both facings and phase-specific attacks.
- Responsive browser suites: 1,375 checks across 390×844, 844×390, 320×568, 768×1024 and 1280×800.
- New browser interaction/save matrix: 56 checks across seven regions.
- Synthetic standard-controller test: target cycling, Root pickup, held-button deduplication, equipment pickup and no accidental portal activation.
- Manual browser review: mobile E pickup, touch Root-full behavior, equipment comparisons and explicit replacement, hero and powers submenus, mobile/desktop menus, all seven portal designs and item artwork.

Old reward tests now explicitly mark defeated fixtures and assert world loot/manual collection. All original numeric reward and inventory assertions remain covered. The old presentation-only guard now includes an exact allowlist for this authorized feature and separately protects unchanged gameplay blocks and catalog/creature/save modules. The settings browser test opens the new disclosure groups before testing reachability; no assertion is skipped.

## Evidence and limits

Screenshots and JSON results are in `qa/world-ui/`. The before menu comes from the exact published base commit. Gallery canvases use the real portal/item/orb draw functions; mobile screenshots use the running game.

One 12.38-second visible cloud-browser sample with 24 enemies and up to five effects measured 1.29 delivered FPS, 9.26 ms mean simulation/draw cost and 87.6 ms p95. Only 1.37 simulation seconds advanced. This environment's frame delivery is slow; these numbers are not a physical-device performance result or a 60 FPS claim.

No physical phone/controller, Safari or Firefox testing was performed. Art approval is pending. Legacy equipment categories use their vector fallback; the customized hero's worn-equipment geometry remains approved existing work. Ground loot has a 2,048-entry save-validation ceiling. The rebuilt server validator is included, but no production Supabase deployment was performed; deploy the matching validator before enabling these new loot saves in production cloud accounts. Review practice uses isolated session storage; the hosted review's ordinary play is local-only.
