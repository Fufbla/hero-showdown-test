# Playable villains: pre-implementation audit

Starting commit: `41cbc7ebe38b676b61a454fc1f3f1ccf7f63bd28`.
Branch: `feature/playable-villains-versus`, created on 2026-10-26.

At audit time main and dev/animation-overhaul-summy-first both point to the starting commit. No open pull requests were returned. Newer work in another session must not be assumed available. No AGENTS.md or package.json is tracked. Recent commits are manual asset/code uploads. Existing checks are tests/bushman.test.cjs, tests/story-switch.test.cjs and tests/story-chapters.browser.cjs (the latter has machine-specific output paths).

## Source findings

- index.html and hero-showdown.html are identical, 365,633-byte classic-script applications with shared lexical globals. Most combat, art metadata and menus are inline. External modules wrap global functions for Story, co-op, combos, Bushman and venue hazards.
- heroes has three entries; villainNames is extended to nine by bushman-fighter.js. showSelect chooses a hero; showOpponent chooses an AI boss. These assumptions are used throughout HUD, hit detection and results.
- start initializes the hero to 100 HP and boss to 650 HP. Story wrappers separately configure story battles. Existing boss damage, phase changes, automatic evasion, difficulty multipliers and breakouts cannot safely be reused as competitive rules.
- hitBoss and hitHero are asymmetric. Hero attacks use attackSpec, attackHitbox and resolveHeroAttack; bosses use character-specific logic and global arrays. Calling boss AI for human inputs would trigger automatic attacks, phase buffs and passives.
- Core simulation uses fixed steps, with requestAnimationFrame rendering. Combat includes buffered attacks, directional guards, double jumps, double-tap dashes, hit reactions and authored knockdown poses. Story special videos hook hitBoss. Competitive specials must not invoke Story video/damage hooks.
- Heroes use anchored authored atlases, dash sheets and combo sheets. Styrodog, Sonic Tusk, Venomis/Thornbear, Dr. Styro and Wastelander use authored pose sheets. Air uses the original atlas and smoke effects; AtomDust uses an articulated debris rig; Lightening Spree uses six poses; Bushman uses motion/combat/effect sheets. Original art will be reused, not regenerated.
- Existing input includes keyboard, gamepad polling with axis hysteresis, multi-pointer touch buttons and an analog stick. The existing network architecture is PeerJS host-authoritative two-hero co-op against a boss, not PvP. Keep that protocol intact; add local competitive PvP separately.
- Five Versus venues exist: Buckroe, Virginia Beach, Norfolk Scope, Toxic Harbor and Storm Rooftop. Harbor and Tempest have reusable deterministic Hazard classes and rendering hooks; their damage adapters assume hero/boss globals. Competitive adapters must apply events symmetrically to independent fighters.
- Chapters 1–3, cave missions, team swaps and cutscene routing live in external Story modules. They must remain byte-identical. Co-op boss mode must retain existing rules.

## Implementation boundary

Add assets/competitive modules for immutable identity/move data, pure combat simulation, CPU input, animation adaptation and UI integration. Only the dedicated generated playable-villains-test.html loads them. Do not modify either production HTML entry point, any existing module, sprite, audio, video, workflow or deployment setting.

The test builder derives the dedicated entry from the checked-out hero-showdown.html; integration with future animation changes requires regenerating that entry and rerunning the tests. The adapter calls the currently loaded renderers and offers per-character registration for future animation state handlers, especially Wastelander. It never invokes boss update logic. Each fighter has independent state, cooldowns, projectiles, meter and hit credit, including mirror matches.

Competitive CPU and human fighters use the same attacks and 100 HP; difficulty changes decision timing and tactics only. Existing co-op remains available with its original boss engine. No online competitive PvP is claimed because it is not currently supported. The isolated downloadable build will contain all local assets and a localhost launcher; no public deployment is necessary.
