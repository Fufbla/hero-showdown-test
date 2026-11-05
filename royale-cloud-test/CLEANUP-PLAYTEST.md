# iPhone gameplay cleanup — 2026-11-04

Continued `feature/royale-power-armor-integration` from verified remote commit `034aecb944b755bfe5743ced437409349684243d`. The checkout was clean and its 1,175-test Royale baseline passed. No newer remote work was replaced. Original recovery history remains intact.

## Corrections

- Removed the Rest travel target, floating healing instruction and checkpoint healing/invulnerability action. Grounded heroes now activate nearby checkpoints automatically when saving is allowed. Activation is idempotent and never changes HP. Health Roots, level-up healing and full-health defeat respawning retain their existing behavior.
- Ordinary enemy rewards update XP and coins without a toast. Rare equipment drops, collected equipment, level-ups, discoveries and boss notifications remain. Reward issuance itself is unchanged.
- Removed only numbered platform flags. Terrain graphics, physical geometry and collision surfaces are unchanged.
- Each of the six tier-two platforms in every region has four enemies; each of the six tier-three platforms has eight. This yields 84 regular enemy homes per region. The original 24 IDs/species remain in order; additional IDs are appended. Spawn centers are distinct and keep complete hitboxes inside platform boundaries. Existing AI, return-to-area and respawn rules are unchanged; narrow platforms may have visually overlapping large monsters while moving.
- Updated the monster-state validator's old 24-entry/ID limit to the actual regional population and rebuilt the existing server validation bundle. Old 24-enemy saves and new 84-enemy saves both load; saved additional enemy defeats survive reloading.
- Gameplay now uses the forward hair plate with its forward head, instead of applying the side plate. Rear hair follows head tilt. Forward jaw edits no longer incorrectly resize the unchanged scalp attachments; side/back headwear uses the actual jaw and age transforms.
- Raised ordinary/Legendary forehead ornaments above the eyebrows. Added item/view-specific shell-versus-open-crest hair behavior, registered closed armor to the head, retained artwork aspect ratios and corrected the reversed Relay Runner profile. Hair remains visible in intentionally open crowns and beneath closed shells at the nape.
- Expanded gameplay selection/callout/gesture suppression to HUD, top bar, stick and nested labels. Pointer ownership, keyboard/assistive clicks, menu scrolling and editable-field selection are preserved.

No original artwork, boss mechanics/rewards, power damage/cooldowns, armor bonuses, Villain Merge rules or level/Power Point rules changed. All approved bitmap directories are byte-for-byte unchanged. Main, Story and Versus source files were not modified.

## Automated results

| Suite | Passed | Failed | Skipped |
|---|---:|---:|---:|
| Royale baseline | 1,175 | 0 | 0 |
| Final complete Royale suite | 1,189 | 0 | 0 |
| Root and Scorpion QA CJS tests | 67 | 0 | 0 |
| Older nested legacy CJS suite | 631 | 8 | 0 |

Final Royale command: `node --test --test-reporter=tap --test-concurrency=2 royale/tests/*.test.mjs` from repository root. This runs every test selected by `royale/package.json`; concurrency is limited to avoid concurrent raster-test memory pressure. The 14 additional tests cover per-platform populations in all regions, migration, rewards, checkpoint healing removal, preservation, attachment routing, headwear metadata, and the full production hairstyle renderer across both presentations, all four builds and combat poses. Historical preservation assertions were updated only for the newly authorized checkpoint/spawn/input/presentation scope, with a new exact comparison protecting the rest of core simulation and world definitions. No tests were deleted.

The eight older failures are the pre-existing Scorpion connected-geometry assertions at x = 110, 220, 380, 640, 790, 940, 1060 and 1170 (`2.852765166211934 != 0`). They reproduce with the existing legacy directory-layout fixture. They are outside Royale, and their source remains unchanged. Across the three final automated suites: **1,887 passed, 8 pre-existing failures, 0 skipped**.

## Browser and visual evidence

Actual Chrome browser launch and gameplay were tested through the managed preview, using disposable session-only heroes:

- Five landscape sizes: 568×320, 667×375, 844×390, 932×430 and 1024×768. All 130 creator, controls, wardrobe, Tree, save/reload and layout checks passed.
- Portrait 390×844 and landscape 844×390: 61 input checks each passed, including rapid Punch/Kick/Jump while holding the joystick, outside releases, lost capture, pause/resume, HUD/top-bar callout/selection events and all three power-button surfaces. These are synthetic Pointer/Event replays in Chrome, not native iOS gestures.
- Four/eight live populations verified from the running game's QA display across all 12 elevated platforms in all seven regions, starting separately at tier two and tier three: 168 checks passed. QA count labels are not present in ordinary gameplay.
- A level-one hero defeated an enemy through the real Punch input. HUD coins increased 0→1 and XP 0→14. No ordinary XP/coin notification appeared. Four combat-replay checks passed.
- All 49 hairstyle options and all 107 catalog helmets were rendered and visually reviewed on male/female heroes in forward, side, rear and mirrored-side views. The catalog includes all 81 Power Armor helmets. Production-renderer regression checks also cover body builds and combat poses; this is not a subjective approval of every continuous slider/frame/gear combination.

Reproduce the browser checks with `royale/tests/final-mobile.html`, `royale/tests/mobile-patrol.html` and `royale/tests/cleanup-review.html`. Reproduce the complete visual contact sheets with `node royale/tests/cleanup-render.mjs /absolute/output-folder`.

Evidence: [gameplay](qa/cleanup/gameplay-landscape.jpg), [hairstyles](qa/cleanup/hair-fit.jpg), [helmets](qa/cleanup/helmet-fit.jpg).

## Remaining verification

Physical iPhone Safari rapid taps, native long-press Copy/Look Up menus, double-tap zoom and actual display cutouts remain unverified. Chrome viewport and synthetic-event checks do not establish those behaviors. Every continuous head/body-slider combination and every animation frame has not been manually inspected. The existing boss mechanics were regression-tested, not manually replayed boss-by-boss during this focused cleanup.

The published test site retains its existing owner-private audience. It requires the owner's ChatGPT sign-in. The actual game was launched and tested in the preview; production sign-in cannot be inferred from that check. No claim of a native iOS-device playtest is made.
