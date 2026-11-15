# Royale intro and persistent soundtrack

Scope: production media integration only, based on `d0a76f08591ede14ac8c23af3bbcd9feedb29989`. The save schema, account endpoints, game balance, powers, equipment, hero appearance, online access restriction and existing release mappings are unchanged.

## Media

- Owner-provided `hero royale.mov`: complete 30.113-second video, original audio, original 16:9 canvas, encoded at 1280×720. H.264/AAC fast-start MP4 (7.24 MB), with VP9/Opus WebM for browsers lacking H.264. The browser selects one format before requesting the video. Poster extracted from the same video.
- Owner-provided `instrumental.wav`: complete three-minute stereo track, 160 kbps MP3 (3.60 MB). A 2.5 dB reduction provides peak headroom (source measured -14.03 LUFS, +0.60 dBTP). No generated music or artwork.
- Music defaults to 20%; existing saved volume is retained where available. A mix trim accommodates the game's existing quiet synthesized effects; short combat/boss ducking restores smoothly. Volume is controlled by Web Audio, including on iOS.

## Integration

`royale/media/controller.mjs` owns one decoded, native looping audio source for a fresh launch. The same source keeps its playback position across mute/unmute, menus, regional travel, portals, solo gameplay, and local co-op. MP3 is fetched/decoded once after intro completion; decoded stereo PCM uses approximately 61 MiB, avoiding decoder gaps on each loop.

The existing cloud launch page already hosts gameplay in an iframe. Its local-hero and local-co-op launch buttons now use that same frame so navigation cannot destroy the audio player. Direct `/royale/gameplay/` and `/royale/local-coop/` launches also support the intro and soundtrack. Fresh reloads replay the intro; scene changes do not. Iframes share the parent soundtrack, with autoplay/fullscreen delegation.

The intro uses a modal with `object-fit: contain`, `playsinline`, a Tap to Start fallback, Skip Intro and Escape support, media-error fallback, and a 15-second no-progress watchdog. Original intro audio stops and its media resource is released before soundtrack playback. The intro launcher fails open if its module cannot load.

The production `GameAudio` adapter preserves sound effects and disables the prior region-specific synthesizer. The existing solo music button and settings slider control only music. Main menu and co-op get a compact music control where none previously existed. Preferences use `healthia.royale.soundtrack.v1`, separate from hero storage. Music preference writes never alter hero saves.

## Verification

- Existing release/runtime/save suite: 298 passed.
- Existing starter-suit rendering suite: 7 passed.
- Existing power/visual/site-entry suites: 106 passed.
- New media invariants: 5 passed, including no concurrent source creation, mute without rewind, failure handling, ducking and storage isolation.
- Browser checks cover full intro playback, actual three-minute loop, fallback/blocked media, volume/mute persistence, scene continuity and codec selection.
- WebKit iPhone 13 and iPad emulation passed inline playback, Skip Intro, Web Audio volume and iframe navigation.
- Existing co-op browser regression uses isolated mocked cloud accounts; production account data is never modified during testing.
- Physical iPhone/iPad/Android devices and physical controllers were not available; browser emulation and simulated standard gamepads are reported separately.

The production publishing workflow now also gates deployment on the media browser checks. See the accompanying JSON reports for observed results.
