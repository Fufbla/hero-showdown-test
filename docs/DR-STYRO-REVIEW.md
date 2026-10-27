# Dr. Styro animation review

Dr. Styro now uses 32 additional whole-body drawings: eight walk poses, four idle poses, four hit/stagger/recovery poses and sixteen attack/split poses. Full punch extension begins at the existing damage contact, and the spike-release art follows the existing three-shot cadence. Hit reactions no longer conceal attacks after hitstun expires.

His original boss damage, health, attack logic, hitboxes, split/merge positions, spikes, foam particles, and four-pose defeat remain unchanged. Rendering does not mutate combat state. Missing artwork falls back to the complete original renderer. Pause, hitstop, cutscenes and co-op guests bypass additional interpolation.

## Playtest

Open `dr-styro-lab.html` through a local web server, or use the private review at https://hero-showdown-dr-styro-review.gladcreek512.chatgpt.site once deployed. Choose a hero, then Practice or Fight Dr. Styro. Practice protects the hero and starts with full special power; Fight uses the existing Easy rules. The move buttons replay walking, crush, spikes, split/double strike, punch/kick reactions, and defeat. Quarter speed and Original/New comparison are review-only controls.

## Integration

This GitHub branch contains only Dr. Styro changes and two script inclusions in each production entry. It is based on main commit 41cbc7ebe38b676b61a454fc1f3f1ccf7f63bd28. Keep the three script tags after existing combat scripts in both entry points when merging with the Supergirls/Wastelander animation branch. Do not replace the other branch's HTML wholesale.

The private Site combines Dr. Styro with the previously approved Supergirls and Wastelander snapshot (all 17 source hashes verified against the prior publish manifest). This hosted copy is a focused Versus review: campaign video files are omitted and Story Mode is disabled here. Its opening video is the existing compact preview copy. GitHub keeps the original videos. This does not integrate the separate competitive playable-villains renderer or rebalance its characters. That branch needs its own animation adapter integration.

## Validation — 2026-10-26

- Isolated Dr. Styro branch: 58 Node tests passed, zero failures (21 Dr. Styro, 16 hero-switching, 21 Bushman).
- Combined approved-animation review: 97 Node tests passed, zero failures (adds 21 Supergirls and 18 Wastelander checks).
- Dr. Styro simulations compare every phase and each crush/spikes/double attack under 30/60/120/144 Hz render schedules. These verify behavior, not measured device frame rates.
- Checks cover exact contact boundaries, three volleys, rendering without state mutation, both split facings, merge, fallback, pause/hitstop, and new-round history isolation.
- Browser visual QA covers new art loading, Summy/Sadie/Vee selection, crush/split/spike demos, pause/resume and Original/New comparison. No completed-build game errors observed; a pre-build missing-atlas error was resolved before final validation.
- Real phones, physical controllers, remote co-op sessions, and a full campaign were not retested. Device frame-rate performance remains a playtest item.

No merge or public-game deployment is included. Keep the draft PR pending the owner's playtest approval.

## Artwork

The two new transparent PNGs are generated with the built-in image tool using existing art-01.webp as the character reference. Original assets are untouched. See `styro-animation-assets.json` for the prompts. `tools/register-styro-atlas.py` only measures components and writes crop/foot-anchor metadata; it never changes source PNG pixels. Source files are `assets/animation/styro-presence.png` and `assets/animation/styro-attacks.png`.
