# Checkpoint C — environments and compact menus
Base: 6c5a2e4c5940536b387cf552db8f2ef123acf939 (verified GitHub Checkpoint B).

Seven region renderers now include cached architectural/natural details, soil strata, pebbles, roots, grass blades, sand ripples, cracked stone/concrete, rusted metal and wood grain. Region-appropriate waves, birds, moving leaves, steam, cave drips and energy motes remain quiet visual accents. Original parallax, day/night palettes and all platform collision geometry are preserved. Scene cache remains bounded to two day/night-region scenes; terrain cache to 48 entries.

The compact nine-option pause menu and existing submenus are retained, with stronger focus visibility and short landscape viewport spacing. No creature artwork, combat, rewards, stats, platform definitions, save schemas, Story or Versus files changed.

941 automated tests passed, zero skipped. Seven real raster tests exercise animated day/night scenes and immutable surfaces, in addition to the existing navigation, creature, save, inventory and input suites. Generated seven before/after region renders and a terrain gallery; visually inspected forest and terrain outputs. These are renderer captures, not browser screenshots. Browser/mobile review and physical-device performance remain pending.
