# Local co-op / solo power presentation parity

Baseline: `c524d9e87cc8fca9b64b6fcb01069277deb36d0c`.
Rollback: `rollback/pre-coop-vfx-20261113`.

The reported simple Roots vines and Whirlwind rings were the procedural fallback
in `hero-power-overlays.mjs`. Solo called `prepareHeroPowerOverlays()` but co-op
never did, leaving the approved sheets unloaded throughout the co-op session.
Player 2 also used a separate abbreviated drawing sequence, omitting the solo
hero overlays, sprite attack effects, motion effects and interpolated power poses.

The shared release artwork loader now prepares the existing approved overlays.
`Renderer.drawPlayer()` contains the original solo hero/effects sequence; both
the solo/leader render and co-op follower call it. It does not move the camera or
alter simulation, saves, equipment, costumes, damage or cooldowns. Speed echoes
remember each owner's previous painted appearance instead of the global sprite
engine's most recent player.

Verification covers:

- Pixel equality between the solo draw and co-op draw for idle and seven active
  powers, both directions, with and without a costume (32 combinations).
  This compositing test uses actual effect atlases and lightweight body stand-ins;
  the production browser run uses the real starter and Fishsticks artwork.
- Two alternating heroes' speed echoes retain the correct owner's appearance.
- Existing startup, gameplay, save, controller, camera and recovery regressions.
- Browser capture of approved Roots/Whirlwind atlas draw calls and screenshots for
  Player 1, Player 2 and solo; Player 2's fireball uses the solo attack atlas.
- Exact deployed-commit verification in the post-publish browser run.

Browser account traffic is intercepted using isolated fixtures. Physical gamepads
are unavailable; independent standard Gamepad devices are simulated. No player
account or cloud-service changes are part of this repair. Online multiplayer stays
disabled. Browser evidence is attached to the Local co-op startup browser
regression workflow runs.
