# Executed validation — playable villains

Status: isolated draft for user playtesting. No merge or deployment.

## Automated tests executed

| Suite | Result | Coverage |
|---|---:|---|
| Competitive simulation | 232 passed | All 144 ordered character pairings; separate 100 HP; both-facing hitboxes and guards; projectile sweep/cooldowns; every character special and damage cap; KKPP bounded combo; no human AI behavior; Bushman qualifying hits; Spree teleport/cooldown; anti-infinite protection; difficulty parity; 30/60/120 Hz input invariance; KO/rematch model; symmetric hazards |
| Existing Bushman and Story switching unit suites | 37 passed | Original boss charging/attacks/network snapshot validation and responsive Story hero swapping |
| Competitive browser suite | 40 passed | Both selection sides, portraits, all five venues, twelve mirror renderers, every move phase, two keyboard players, double jump/dash, simulated two-controller input, touch taps/analog release, heavy modifier, difficulty modes, hazards, outcomes, rematch/reselection, original Story and co-op entry, production opt-in boundary |
| Existing Chapter 1–3 browser suite on test entry | 32 passed | Public Chapter 1, codes, all three cave intros, correct rescue videos, transition into Chapter 3, both scorpion rounds, boss intro, ending movie routing, completion/retry/help, mobile and controller menus, original HTML entry compatibility |

Total: **341 automated checks passed**. Browser runs reported **zero uncaught page errors and zero HTTP error responses**. These tests execute real Chromium, with simulated controllers and touch events. They are not physical-device tests. Chapter tests exercise routing and completion transitions; they do not represent a person playing every chapter from beginning to end or watching every video in real time.

The competitive rendering tests restart each move case so a prior KO cannot silently bypass later move phases. No test outcome is inferred from source inspection alone. The Story wrapper retains the existing assertions and changes only machine-specific output paths and the entry used for its initial page load.

## Rendering smoke test

Five live requestAnimationFrame scenarios were executed in headless Chromium on Linux, at 1280 × 800 with GPU disabled: Summy/Wastelander, Venomis mirrors, AtomDust/Spree, Air/Styrodog in Harbor, and Bushman/Sonic on the rooftop. Both fighters were driven through competitive CPU input for these smoke runs. No runtime exceptions or non-finite health/positions were observed.

Median frame interval was approximately **16.7 ms** in every scenario. Mean intervals ranged from **16.7 to 20.1 ms** (about 50–60 FPS), with occasional 33 ms frames, especially on hazard arenas. This validates operation of the 120 Hz fixed simulation and display-frame rendering; it does **not** certify a steady 60 FPS on physical devices. `performance-results.json` records timings. Target-device performance remains a release check.

## Visual review

Screenshots were reviewed for the twelve-character roster, desktop and phone menu layout, mirror fighters and facing, independent health bars, P1/P2 distinction, touch controls, and the two hazard arenas. Existing art was reused. Air and Lightening Spree have fewer authored movement poses than some other fighters; the adapter reuses the existing suitable poses and effects. New artwork or additional authored frames were not generated.

## Preservation checks

- Existing files were checked against their starting Git blob hashes; `preservation-results.json` records the count and zero modified existing files.
- Original Story Chapter 1 bosses still initialize at 650 HP. Original two-hero co-op bosses still initialize at 1,000 HP. Chapters 2 and 3 continue through their untouched original modules and configurations.
- Both production entry points, all approved sprites/renderers, music/audio, videos and existing tests remain byte-identical. Only the new test entry loads the competitive modules.
- Remote main and the remote animation branch were compared with the baseline. Neither contained newer remote commits at the final comparison; uncommitted/unpushed work in another session is not included or presumed complete.
- No GitHub Pages, Hostinger, DNS, hosting configuration, main-branch or other-session artifact was changed. No deployment URL is claimed.

## Not tested / remaining release work

- Physical iPhone/Android, Safari, actual USB/Bluetooth controllers, latency and sustained thermal/device performance.
- Existing online PeerJS co-op across two real devices and network disconnect behavior; its code is untouched. Online competitive PvP is not part of this build.
- Two-player touch-only play on one phone is not supported; local PvP uses a shared keyboard, two controllers, or touch P1 plus a keyboard/controller P2.
- Competitive balance needs human match play. Damage targets, shared rules and anti-spam protections are implemented, but equal HP alone does not prove matchup balance.
- Combined verification with the ongoing Supergirls/Wastelander overhaul is pending. This branch must stay isolated until that work is finished, regenerated into a separate integration build, tested together, and explicitly approved.


## Pause-guide and archetype follow-up — October 26, 2026

Executed 269 unit checks (232 competitive plus 37 original), 40 competitive browser checks, and 32 original chapter browser checks: **341 passed**. Both final browser reports contain zero uncaught page errors and zero HTTP errors. The guide tests cover all twelve fighters on both sides, all nine attacks, exact input labels/damage/cooldowns, frozen match state while browsing, phone portrait/landscape scrolling, controller navigation, holding Start without a second toggle, Back, and resume. Unit tests verify CPU normal engagement for every character and the speed/damage/recovery tradeoffs. Screenshots of portrait and landscape guides were visually reviewed.

An initial concurrent chapter run timed out while loading Summy's cave intro; the standalone rerun passed all 32 checks without changing Story code. No full human chapter playthrough or physical-controller/mobile testing was performed in this follow-up. The prior performance measurements above belong to the initial build and were not repeated for this tuning update.

Combat tuning adjusts competitive normals, range, projectile commitments and CPU spacing only. Fast Vee and AtomDust trade normal damage/reach for speed; Sadie, Dr. Styro and Wastelander trade startup/recovery for damage. Each fighter's role, strength, weakness and game plan is visible in the guide. Equal matchup win rates are not established; further human balance testing remains required. All 150 original game files were rechecked against the original baseline with zero changes.
