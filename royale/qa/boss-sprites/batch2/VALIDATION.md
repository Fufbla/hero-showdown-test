# Batch 2 validation

Base commit: `f140ba3083090a6959f3d8951d2bcc063fa5385d` on `feature/royale-boss-sprites`.

## Automated results

| Check | Result | Evidence |
| --- | --- | --- |
| Batch 1 remote upload | 50/50 files match the prior ZIP; none missing | `base-verification.json` |
| Unchanged base | 637 passed, 0 failed, 0 skipped | `baseline-tests.txt` |
| Full implementation suite | 650 passed, 0 failed, 0 skipped | `automated-tests.txt` |
| Focused boss, sprite, combat and Legendary suites | 223 passed, 0 failed, 0 skipped | `focused-tests.txt` |
| Browser rendering | 180 passed; no blank renders or simulation mutations | `browser-render-checks.json` |
| Batch 2 browser gameplay | 304 assertions passed, 3 bosses × 5 viewports | `browser-gameplay-batch2.txt` |
| Batch 1 browser regression | 321 assertions passed, 3 bosses × 5 viewports | `browser-gameplay-batch1.txt` |
| Final regression after landscape HUD fix | 725 assertions passed, all 7 regional bosses × 5 viewports | `browser-gameplay-final.txt` |

The viewport suite uses actual embedded browser documents at 390×844, 844×390, 320×568, 768×1024, and 1280×800. It checks HUD and touch controls, phase changes, exactly three Phase 3 helpers, reward gating until helpers die, first victory/unlock/chest behavior, inventory limits, persisted saves and reloads. These are synthetic viewport tests, not physical phones or tablets.

Existing combat tests cover collision, telegraphs, frozen stinger targets, phase thresholds, reinforcement limits, rewards, rematches, and save compatibility. Existing Legendary tests cover permanent defeats, remains and merge rewards. Regional sprite routing excludes Legendary bosses and their helpers. The new tests check RGBA transparency, 32 distinct poses for Venomis/AtomDust, frame bounds and anchors, collapse silhouettes, timing at every phase, frozen combat objects, eight connected scorpion legs, fixed claw/tail segment lengths and planted feet throughout collapse. The pre-existing locomotion suite compares more than 6,000 supporting-foot positions.

## Manual visual review

Inspected generated source sheets, packed contact sheets, and browser rendering. Corrected a clipped tail in Venomis's final collapse pose and AtomDust's ground anchor before final testing. Inspected Giant Scorpion's eight leg chains with numbered joint/foot overlays. Contact sheets show idle, movement, every represented attack family, hit and collapse. Playable encounter screenshots show each redesign in the existing Royale arena. Mobile-sized review uses the practice page's viewport controls. The 844×390 screenshots exposed an existing boss-HUD overlap; a boss-only CSS rule moves that panel between the existing hero/status panels and hides the redundant region plaque only during short-landscape boss encounters. The final screenshots show unobscured heads and attack warnings. Portrait camera tracking remains unchanged.

No physical-device testing occurred. Browser automation and visual inspection are reported separately from the Node tests. See the screenshots and contact sheets in this folder.

## Performance

`raster-performance.json` records 600 measured frames per boss at each of two sizes, after 60 warm-up frames. These are native headless renderer timings, not browser frame rates. The native exporter snapshots finished component masks as immutable images to avoid retaining repeated mutable-canvas snapshots; this exporter optimization does not change the game renderer.

Browser measurements are stored separately in `browser-performance-4.json`, `browser-performance-5.json`, and `browser-performance-6.json`. They measure the animation preview for ten seconds per boss. Full-game measurements, when present, are separately identified. Sustained 60 FPS is not verified, and this cloud-browser environment does not establish physical desktop or phone performance.

| Boss | Preview FPS, 10 s | Full-game FPS, ~30 s | Mean full-game draw, ms | Native draw mean, desktop / mobile-sized, ms |
| --- | --- | --- | --- | --- |
| Giant Scorpion | 1.44 | 1.14 | 1.34 | 0.66 / 0.55 |
| Venomis | 1.43 | 1.14 | 10.35 | 0.14 / 0.16 |
| AtomDust | 1.42 | 1.13 | 9.43 | 0.14 / 0.16 |

The full-game samples ran at 1348×781 and recorded 35 rendered frames each. Simulation advanced only about 3.15–3.18 seconds during each ~30-second wall-clock sample because of the low frame cadence and the existing time-step clamp. These measurements do not establish full-speed stress performance. The requested 60 FPS target was **not achieved in this environment**.

## Limitations and remaining work

- All requested Batch 2 animation states are implemented. Final aesthetic approval remains with the user. Four-pose Venomis/AtomDust loops use brief non-contact crossfades; additional hand-drawn in-betweens could improve motion detail.
- Scorpion's baked atlas samples one fixed target; dynamic stinger aiming and continuous locomotion require the supplied rig integration. Do not replace runtime IK with these sampled frames.
- Existing area warnings, hitboxes and detached projectile effects remain authoritative. Decorative tails, claws and energy can extend beyond the damageable body rectangle, as with the original presentation.
- No real-device, Safari, or sustained multi-minute stress test was performed. Browser preview FPS is reported as measured rather than claiming the 60 FPS target.
- Ultimate Pollution Boss and all eight Legendary redesigns are outside Batch 2. Their existing behavior/art remain in place; Ultimate Pollution Boss retains its existing temporary-art label.
- The manual-upload ZIP is based on the exact commit above. If the branch advances, compare the modified files before uploading; do not overwrite newer changes.

No GitHub commit, push or merge was performed. No regular-monster, Story, Versus or main files were changed. Gameplay and Batch 1 art are protected by a byte-level Git diff audit. Wait for the user's upload confirmation before Batch 3.
