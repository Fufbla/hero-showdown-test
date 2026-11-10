HERO SHOWDOWN — PERFORMANCE & CONTROLS UPDATE
October 26, 2026

This cumulative update includes the completed character animation pass and
the first performance/control fixes. Use this ZIP in place of the earlier
character-update ZIPs. You will upload it yourself when you are home.

WHAT CHANGED
- Beach and fountain scenery now draws directly into the arena canvas,
  removing the costly copy of a freshly rendered full-size scenery canvas.
  The same artwork, visual clock, quality tiers and stage details remain.
- Quick co-op keyboard taps register even when press and release occur
  between frames. Held keys do not generate duplicate attacks.
- Holding controller Start pauses co-op once. Either controller can resume
  after releasing the button, without immediately pausing again.
- An optional performance-review.html page provides repeatable checks.

INSTALL WHEN YOU ARE HOME
1. Extract this ZIP.
2. Copy the CONTENTS of GAME-FILES into your existing game folder, beside
   index.html. Keep the folder paths, including assets/animation and assets/js.
   Replace matching files and preserve all other existing game files.
3. Upload those files yourself and reload without old cached files.

This is an UPDATE, not a standalone game archive. GAME-FILES contains
75 files: 58 production files and 17 optional review files. README.txt,
MANIFEST.json and DEVELOPMENT are reference material and need not be uploaded.
Normal play opens through index.html or hero-showdown.html.

ALL COMPLETED CHARACTERS INCLUDED
Heroes: Super Summy, Super Sadie and Super Vee.
Opponents: Air Pollution Monster, Styrodog, Sonic Tusk, Venomis & Thornbear,
Dr. Styro, Wastelander, Atomdust, Lightening Spree and Bushman.

CHECKED
- 294 automated tests passed, with no failures or skips.
- Browser control checks passed, including 135 hero/opponent/venue starts.
- Seven Story chapter transition checks passed.
- All 27 scenery comparisons matched the original pixels exactly.
- Phone control layouts were reviewed at 390x844 and 844x390.

MEASURED IMPROVEMENT
In repeatable browser CPU drawing samples, the first three beach/fountain
scenes fell from 3.379 / 3.143 / 2.813 milliseconds per draw to
0.896 / 0.839 / 0.903 milliseconds, reductions of about 68-74%.
These are drawing CPU measurements, not end-device FPS claims. Full results
and the measurement method are in DEVELOPMENT/docs.

HOME PLAYTEST STILL NEEDED
Check frame rate on your actual phone/computer, try your physical controller,
and play a real online co-op session on two devices. This environment could
not establish stable device FPS: live animation callbacks were intermittently
throttled. Online keyboard packet dispatch was tested locally; internet
latency and a live two-device connection were not tested.

OPTIONAL REVIEW
Open performance-review.html through your usual game server/site.
- Measure all opponents: fixed simulation steps with timer-yielded CPU samples.
- Check controls & story: virtual gamepads, synthetic input, swaps and menus.
- Check chapter transitions: forces fight outcomes to check chapter flow.
- Compare scenery: exact pixel checks; reload before measuring performance.
- Compare live frames: compares original/updated scenery on your device.
- View: phone CSS layout previews. Play normally: protected practice hero.

The character review pages from the earlier packages are also included.
No game upload or publication was performed. The separate playable-villains
competitive build is not merged into this package.
