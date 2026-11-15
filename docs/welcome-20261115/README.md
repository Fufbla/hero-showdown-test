# Hero Royale welcome redesign

The production launch page now introduces **James Clan Comics: Hero Royale**
with five custom heroes, a coastal city, and gold, blue and purple menu controls.
Play Game reveals the existing account-code actions. My Heroes and Local Co-op
still use the launch document's existing scene loader and persistent soundtrack.

## Scope

- New presentation files are under `royale/welcome/`.
- The production builder reads that shell and bundles its small menu controller.
- The only media-runtime edit places the existing compact music control in its
  new footer location. Intro logic, audio buffers, settings keys and playback
  ownership are unchanged.
- Account code, cloud endpoints, local/cloud save formats, three hero slots,
  co-op controllers, gameplay, combat, equipment and progression are unchanged.
- Network multiplayer remains excluded by the existing release pipeline.

## Artwork

`tools/release-build/welcome-art.mjs` renders the five illustrations offline using
the actual released character engines. Their complete appearance definitions
and existing outfit IDs are recorded in `royale/welcome/assets/heroes.json`.
The team uses Santa Street, Summer Chic, the recolorable starter superhero suit
twice, and Midnight Leather. No new customization choice or outfit was added.
The original game source artwork is unchanged. The browser loads five small
WebP portraits, not the full character renderer or animation atlases.

The city illustration was generated with the built-in image generator and
optimized to `royale/welcome/assets/coastal-city.webp`. Final prompt:

> Use case: stylized-concept. Asset type: production game welcome-screen BACKGROUND ONLY for a cheerful customizable chibi superhero game. Create an original, polished, bright comic-book fantasy coastal city plaza. Wide landscape 3:2 composition, crisp colorful game environment, deep cobalt and turquoise sky with fluffy soft white clouds, sunlit pastel cyan and violet skyscrapers on both sides, lush palms framing far corners, distant turquoise water and coastal hills. Golden afternoon highlights, subtle magical glow from cyan city lights. Central lower half is a spacious clean blue-lavender tiled plaza with perspective lines and soft reflected light, ready for a row of hero sprites composited on top. Keep center upper half simple open sky for a large logo and keep lower center simple for menu buttons. Premium mobile adventure game art, rich saturated colors, outlined architectural forms, attractive dimensional shading. Exciting and welcoming daylight, not dark. NO people, NO characters, NO creatures, NO typography, NO letters, NO text, NO logos, NO menu elements, NO crowns, NO watermarks. This is just the environment art, not a website mockup.

Total welcome artwork is approximately 432 KiB. Decorations pause while the
intro/game is visible and honor reduced-motion preferences. All menu actions
remain DOM buttons with keyboard focus and touch targets at least 44px high.

## Verification

- Production artifact build passed.
- Release/save/appearance/co-op/media suite: **303 passed**.
- Starter suit suite: **7 passed**.
- Existing isolated compatibility suite: **106 passed**.
- Browser review: desktop, 390x844 phone, 360x640 small phone, 844x390 landscape,
  and 1024x768 tablet layouts. No horizontal scrolling; primary controls fit.
- Play Game reveals both existing code options; returning-code input opens and
  receives focus. No real player credentials were used or existing saves edited.
- My Heroes opens all three browser slots. Local Co-op opens separate Player 1
  and Player 2 account/controller panels through the existing iframe loader.
- Settings and footer music controls reflect the same mute and volume values.
- The existing 30.11-second MP4 advances and returns to the new menu; Skip Intro
  also works. Media regression now accepts both existing video resolutions and
  requires a natural `ended` event rather than accepting a watchdog dismissal.

Physical iPhone/Android hardware and physical controllers were not available in
this environment. Automated production CI retains the existing local co-op and
Chromium media browser regressions before publishing.
