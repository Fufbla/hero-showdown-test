# Steel Body, Speed and movement-power retirement
Baseline: 5e7b2535b998f760cd324ab0a8fea56e1b851aa3. Dedicated branch: codex/kingjames-steel-speed-no-agility.

## Boundary
Only royale-v3-staging pages and its existing cloud endpoint change. Production royale assets, physics, combat, input, maps, monsters, controls, saves and renderer sources stay byte-identical. Generated staging adapters import the existing gameplay modules. Staging import maps select the revised power module and Eris descriptions for solo, online and local co-op. Non-test characters keep the original renderer. KingJames uses the existing full-body atlas renderer with an additional universal metal atlas and reusable VFX atlas.

## Dependencies inspected
PowerSystem owns durations, cooldowns, damage reduction, passive speed and attack timing. Game and power menus import POWERS and normalizePowers. LocalHeroStore and cloud validation call decodeSave; co-op and network views share those imports. Eris equipment descriptions have a separate obsolete ability reference. Inventory catalog identities and stats remain intact. Existing procedural Steel and Speed implementations remain available to the unchanged renderer.

## Save migration
Unspent points are derived from (hero level - 1) minus invested levels. Retire the removed level and equipped/recovery entries before normalization. This returns exactly the invested points without any additive credit. Preserve an idempotent power-policy receipt through snapshots. Repeated load/save cannot create extra points. No level, XP, coins, inventory, appearance, world or other power changes. Validate legacy ledgers before retirement.
The staging server applies the same pure migration to load responses and incoming saves, preserves its compare-and-swap revision checks, rejects old-client re-investment after migration, and keeps all authentication and cosmetic save guards. Migration on read is projected until the next normal save; no bulk database rewrite.
Read-only preflight: 40 populated staging cloud slots; 0 currently invested in the retired power and 0 equipped. Synthetic regression fixtures must cover invested saves.
0000000000 remains the existing public browser-local sandbox, not a cloud account. It must retain its browser progress and eight-second save interval.

## Visual contract
256 x 256 cells, foot [128,230], scale 0.62, same collision reference. Entire chrome head/body painted in every frame; no customizable head during transformation. No per-limb transforms. Clip timing reads existing simulation states; dedicated flight and special-attack frames. Speed particles keep world-space origins, bounded lifetimes and direction at emission. Nothing writes physics.

## Release gates
Validate atlas bounds and stride differences; compare movement/combat traces to baseline; test refund/reload/cloud stale-save policy; desktop/mobile Chromium and WebKit gameplay; preserve production file hashes. Deploy via existing staging Pages route only after CI. Deploy only the existing royale-v3-staging Edge Function, retaining its custom authentication. Live test code verification and explicit limitations in final report.
