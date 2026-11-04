# Mobile landscape review

Baseline: `cc288576d5ac8be67af0cacd750b1d026b24be7b` on `feature/royale-power-armor-integration`.

The old interface stacked a header, power row and touch-control row around a flex-shrunk canvas. On short landscape screens this left a narrow world strip. The renderer also switched its logical height abruptly from 480 to 720 at a 360px canvas threshold. A cleared regular boss retained its large HUD panel.

Landscape now uses a full-viewport canvas with compact, safe-area-aware overlays. Hero vitals are at top left, boss information top center, and currency/healing/audio/pause at top right. The stick sits at bottom left, attacks at bottom right with Jump raised separately, and powers at bottom center. The central field remains open. Cleared-arena notices fade after six seconds. Native viewport zoom remains enabled outside the gameplay controls.

Tap a power icon to activate it, or its name to select/replace it. Empty slots also open selection. Ownership, combat restrictions, cooldowns, and the conditional fourth Villain Merge slot use the existing handlers. The separate Change button is hidden in landscape. Settings retains joystick size, horizontal offset and control-height adjustments; small screens constrain sizes to avoid overlap.

Mobile sprite scale is calculated once from the shorter viewport dimension and retained across rotation and browser-toolbar resizing. The view reveals more or less world without stretching sprites or changing world coordinates. Rotation clears touch, keyboard and controller held state; the controller must return to neutral. Camera tracking, collision geometry, movement and combat are unchanged.

Pause, inventory, settings, wardrobe and the direct power picker have bounded, scrollable landscape panels. Real save slots are not altered by the optional review harness at `tests/landscape-review.html`.

## Verification

- Baseline: 1,155 tests passed.
- Updated suite: 1,167 tests passed, including new layout, scale, orientation input release and protected-file checks.
- Existing 17-check mobile browser replay passed in both 844×390 landscape and 390×844 portrait: rapid attacks, three pointers, joystick drag outside, lost capture, focus recovery, synthetic-click suppression, no selection/navigation/scroll, stable canvas and portal/menu recovery.
- Layout checks: 568×320, 667×375, 844×390, 932×430 and 1024×768 landscape; 390×844 portrait and 1366×768 desktop. Landscape canvas covers 100% of the game viewport beneath overlays; portrait remains 72%, desktop 74%. Main controls were within bounds. Rotation retained x=160, y=600, region 1, three equipped pieces, Flight and 78 Power Points.
- Browser: cloud Chromium, fixed-size iframe viewports. These are browser viewport tests, not physical iPhone/Android or native Safari tests.
- Artwork, all 81 suits/243 pieces, all 36 creature definitions, input event handlers, power rules, equipment economy, physics and save formats remain unchanged. The renderer preservation check permits only its sizing method and sizing import; all drawing code remains exact. Historical stage guards were updated only for this authorized presentation change.

## Review limitations

Actual iOS Safari, Android Chrome, hardware notches, OS edge gestures and real multi-finger latency need physical-device acceptance. Browser/ChatGPT chrome outside the game is not controlled by the game. Menus deliberately scroll on short screens. The root review page and this harness are separate from real saves.

No merge into main, Story Mode or Versus Mode. Await visual approval before final integration.
