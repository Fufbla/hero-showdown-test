# KingJames full-body prototype migration

Baseline: `8fa7a78ca79774c345932892a39b2a1f7ccad7c4` (local tag `kingjames-before-fullbody-20261112`). Development branch: `codex/kingjames-fullbody-prototype`.

## Inspection before edits

- `royale/renderer.mjs` draws the world, local hero, V2 sprite overrides and power overlays. `style-c-source.mjs` and `style-c-motion.mjs` articulate the existing limbs; `style-c-body.mjs` and `cape.mjs` draw clothing and cape motion.
- Roster, creator, wardrobe previews, multiplayer peers and local co-op also call the original hero renderer. These remain unchanged for this first prototype.
- `royale/core.mjs` owns movement, collision, combat, health and events. Save serialization, cloud bridge, eight-second autosave, inventory, superpowers, input and networking are independent modules.
- Current staging reserves `0000000000` for a standalone character toy and calls `clearLegacyCharacterTest`, deleting the earlier test namespace. The current Supabase profile lookup for that exact code returned no rows. It is not an existing cloud account. Do not fabricate a cloud restore or overwrite a different KingJames account.

## Staging-only implementation

1. Preserve all original artwork and modules. Stop the automatic test-data deletion. Route only the reserved code to a staging game entry.
2. Generate a staging copy of the entry shell/application/renderer from the pinned baseline with explicitly reviewed visual substitutions. Shared gameplay, saves, controls, maps, combat and networking remain imported from `royale/`, unchanged. The production entry never imports the prototype.
3. Read the existing reserved local test namespace. Preserve populated slots exactly. Initialize KingJames only when the namespace is genuinely empty, without inventing the screenshot's XP or equipment. A read-only visual selection applies only to KingJames in that test session.
4. Load one manifest and one complete body/outfit atlas. Each frame includes all clothing and limbs; no articulated limb or cape calls enter the new draw path. A separately cached customized head follows fixed frame anchors at a constant size. Left-facing frames mirror the authored right-facing atlas.
5. Map existing hero state and timers to authored idle, start, run, stop, jump, doubleJump, fall, land, punch, kick, hurt, defeat and recovery sequences. Preserve the original Steel Body transformation and reusable power overlays.
6. First outfit only: Original Red-and-Black Hero Suit. Its approved design has no cape. Future caped outfits must include the cape in every body frame; no runtime cape physics.
7. Validate manifests and alpha padding; test state transitions, attack/contact timing, pause, save immutability, original renderer fallback, multiplayer isolation and deterministic gameplay equivalence. Inspect actual staging desktop and mobile layouts.
8. Publish only staging files and migration/QA tooling after checks. Stop for approval before another outfit or any production rollout.

## Rollback

Revert the prototype commit(s), or restore the staging launch route from the baseline. No save migration or equipment rewrite is required. The previous character sandbox and original renderer remain available.

## Validation and publishing record

- 116 targeted sprite, save, cloud bridge, power, wardrobe and local co-op regression checks passed.
- Chromium and WebKit each passed desktop (1280 × 900), phone portrait (390 × 844) and phone landscape (844 × 390) checks: reserved-code load, both run directions, jump, double jump, fall, landing, punch, kick, save/reload and zero test-mode cloud account requests. Evidence: GitHub Actions run `43196755521`.
- All 48 composed frames were inspected for padding and fixed-size head attachment. Gameplay equivalence was checked for 300 deterministic simulation ticks with and without sprite rendering.
- The complete pre-change legacy suite had 252 passing checks and 10 pre-existing failures (historical artwork/source-hash expectations and combat-balancing expectations). Those unrelated systems were not rewritten.
- GitHub Pages environment protection accepts the existing main publishing route, not the development branch. After successful regression checks, the tested staging-only changes advance to main and the existing Pages pipeline publishes them. Production runtime files remain byte-identical to baseline.
- The reserved code has no Supabase profile. It preserves existing browser-local test slots and creates KingJames only in an empty slot; it cannot restore nonexistent cloud progress. Ordinary authenticated cloud accounts keep their released path.
- Physical controller hardware, real iOS/Android devices and live multi-device multiplayer sessions were not exercised. Their gameplay modules remain unchanged; multiplayer/co-op rendering stays on the released renderer during this prototype.
