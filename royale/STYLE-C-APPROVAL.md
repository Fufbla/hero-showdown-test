# Style C — initial visual approval checkpoint

Date: 2026-11-02. Base: `4495e0307e7a8dc9aa8bcdd8fbedb575048e6795` on `feature/royale-world-ui-loot`. Isolated delivery branch: `feature/royale-style-c-heroes`.

This is the appearance and first movement approval checkpoint requested in steps 14–15. The full animation rollout is paused pending the user's visual approval. It is not a claim that every animation is finalized or that the reference match is approved.

## Review and play

Open `tests/style-c-review.html` through a static HTTP server. It provides the supplied reference beside live male/female examples, idle/walk/run/punch/kick controls, frame stepping, all appearance controls, equipment selection, a 49-hairstyle gallery and a playable normal-game iframe at desktop, 390 × 844 and 844 × 390 sizes.

“Start practice” creates a disposable level-99 review hero in an isolated session namespace. Its level, powers, coins and equipment are review fixtures, not changes to progression or the normal game. “Play regular adventure” uses the existing hero slots and normal progression. Changing the example does not overwrite a saved player appearance. The hosted review retains browser-local saving; the unfinished authentication backend is not rebuilt.

Controls remain A/D or arrows to move, Shift to run, Space to jump, J to punch, K to kick, E to pick up and Up to use a portal. The existing touch controls also remain available. Leaving the game iframe can pause it through the existing focus-loss behavior; use Resume Game when returning.

## What changed

- A replacement layered hero renderer, with new original armor and facial atlases, compact proportions, customizable face features, connected shoulders/elbows/wrists and hips/knees/ankles, cel shading, emblems and capes.
- A new pose rig for the five review motions, driven by the original movement and attack clocks. Planted stance feet, alternating strides, arm and hip motion, knee chambers, attack contact poses and recovery are presentation only.
- All 42 current and 7 legacy hairstyle IDs render through the new hair system. Loc, braid, curl and ponytail strands use connected procedural paths and reusable detailed textures. Existing saved options are retained.
- Regular/rare equipment and all eight Villain Merge appearances fit the rig, retain catalogue colors and preserve the white/green glow behavior. Starter colors remain editable.
- Bounded texture/face caches and a nonblocking image-load fallback. No generated texture blocks movement, collision, attacks or rendering while it loads.

The only pre-existing runtime file changed is `hero-art.mjs`, which now exports the replacement renderer. The old drawing is retained solely as a before-image test fixture. Gameplay, input, camera, collision, attack reach, damage, cooldowns, XP, equipment data, save schema, monster/boss source artwork, audio, world, portals and loot code are unchanged from the base. No files outside `royale/` changed. Main, Story Mode and Versus Mode were not modified.

## Evidence

| Artifact | Contents |
| --- | --- |
| [Before / after](qa/style-c/before-after.png) | Identical appearance examples through the old and new renderer |
| [Reference comparison](qa/style-c/reference-comparison.png) | User-supplied reference beside the implemented examples |
| [Idle previews](qa/style-c/idle-previews.png) | Male and female examples |
| [Movement video](qa/style-c/movement-previews.mp4) | 12 seconds, actual renderer, idle/walk/run/punch/kick; encoded at 30 FPS, not a gameplay performance measurement |
| [Movement poses](qa/style-c/movement-poses.png) | Key poses for the five review motions |
| [Desktop gameplay](qa/style-c/gameplay-desktop.jpg) | Browser screenshot beside integrated monsters at the original camera scale; QA overlay visible |
| [Phone portrait](qa/style-c/gameplay-phone-portrait.jpg) | Actual 390 × 844 game iframe, original camera and controls |
| [Phone landscape](qa/style-c/gameplay-phone-landscape.jpg) | Actual 844 × 390 game iframe, original camera and controls |
| [Browser checkpoint](qa/style-c/browser-review.jpg) | Reference and live kick pose in the review page |
| [Hairstyles](qa/style-c/hairstyles-49.png) | All 49 saved hairstyle IDs |
| [Equipment](qa/style-c/equipment.png) / [Builds](qa/style-c/body-builds.png) | Fixed-color suit variants and body builds |
| [Art inventory and generation brief](assets/hero/style-c-prompt.md) | Two original transparent atlases, crop metadata and provenance |

## Validation

- Baseline: 941 Royale tests passed. A broader invocation also found 16 pre-existing legacy test files that cannot run from this checkout because they expect missing nested `tests/dist/` or `tests/assets/` paths. Those Story/Versus packaging assumptions were not changed. [Full baseline output](qa/style-c/baseline-tests.txt).
- Final Royale suite: **973 passed, zero failed/skipped**, including 32 new Style C tests. [Full output](qa/style-c/automated-tests.txt). Tests cover fixed joint lengths, finite poses at slider extremes, planted feet, unchanged active punch/kick contact targets, unique hairstyle rasters, appearance round-trips, fixed equipment colors, bounded caches, immutable game state and the protected-file boundary.
- Browser canvas checks: **1,775 drawings and 4,911 assertions passed**, covering hairstyles, four builds, two presentations, equipment and 23 pose states. [Results](qa/style-c/browser-checks.json).
- All **36 creatures** passed **9,288 rendering checks**, including phase attacks, facings, transparent bounds and immutable combat state. This confirms the integrated creature renderers remain usable; it does not mean 36 full battles were manually played. [Results](qa/style-c/creature-results.json).
- Browser inspection: Linux cloud Chrome 155, desktop game viewport 1226 × 720 plus phone-sized iframes 390 × 844 and 844 × 390. Checked live idle/walk/run selection, punch/kick contact poses, loaded textures, normal-game movement, touch jump/punch/kick, pause/resume and integrated monsters. Phone screenshots are resized browser views, not physical iOS/Android testing. Sampled console warnings were from the cloud browser extension, not the game modules.

## Performance and remaining limits

The native hero-only raster sample averaged **1.024 ms**, p95 **1.482 ms**, over 300 draws. This is not browser FPS. [Native sample](qa/style-c/native-performance.json).

The 12.397-second cloud browser sample delivered only 16 frame intervals: **1.29 average FPS**, **0.98 FPS one-percent low**, **10.73 ms mean** and **130.40 ms p95** simulation-plus-draw cost. Asset preparation took 20 ms in this already-loaded browser; reported JS heap was 17,984,246 bytes. It included 24 live enemies but advanced only 1.35 simulation seconds because elapsed time is capped by the existing game loop. The sparse frame delivery makes it unsuitable for a physical-device performance prediction. [Raw browser sample](qa/style-c/browser-performance.json).

No sustained 60 FPS, cold-start loading, audio latency, physical mobile performance or complete browser-matrix claim is made. The provided animation video is an offline renderer export, not a captured 30-FPS gameplay run. Device profiling remains necessary; the cloud sample's frame-delivery bottleneck has not been isolated to a specific cause.

The initial faces, hair silhouettes, armor proportions, cape shape and five motions need subjective approval against the supplied image. Automated uniqueness/visibility checks do not substitute for that approval or exhaustive visual inspection of every customization combination. Aerial combat, flight, double-jump, damage, defeat and respawn have safe compatible poses; their full transition and animation polish is explicitly deferred until approval. No new audio phase or other major development phase is included.

Please review the appearance and idle/walk/run/punch/kick movement before authorizing the full animation rollout.
