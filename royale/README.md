# Hero Showdown Royale — Phase 1

A standalone mode inside Hero Showdown, developed only on `feature/showdown-royale`.
Open `royale/` directly, or choose **Showdown Royale** in the development branch's existing mode menu.
The three existing HTML entry points change only their previously locked Royale tile. All Story/Versus logic, canonical fighters, animations, assets, and videos are preserved.

## Play

Private online playtest: https://healthia-showdown-royale-phase1.gladcreek512.chatgpt.site

From a checkout of this branch:

```sh
python3 royale/serve.py
```

It opens `http://localhost:8000/royale/`. Keep the terminal running. On a Mac, you can also open `royale/START-ROYALE.command`. On Windows with Python 3, open `royale/START-ROYALE.bat`.

To test a phone on the same Wi-Fi:

```sh
python3 royale/serve.py --lan
```

Open `http://YOUR-COMPUTER-IP:8000/royale/` on the phone. Use `--port 8001` if 8000 is busy. ES modules require an HTTP server; do not launch `index.html` with `file://`.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | A/D or left/right arrows | Left stick |
| Run | Hold Shift while moving | Push stick to its outer edge |
| Jump / double jump | Space, W, or up arrow; release and press again | Tap Jump twice |
| Punch | J or Z; hold to repeat | Punch; hold to repeat |
| Kick | K or X; hold to repeat | Kick; hold to repeat |
| Rest and set checkpoint | E near a camp | Rest button near a camp |
| Pause | P or Escape | Pause at top right |

Punches and kicks work in the air and have only their animation startup, active, and recovery frames, without an additional cooldown. There is no dash. Enemies show health bars and warning marks before attacking. There are no floating damage numbers.

## What is included

- Custom hero name, four body builds, height and leg proportions, four hair choices, skin/suit/accent colors, and optional colored cape.
- One shared articulated animation rig with idle, walk, run, jump, fall, land, punch, kick and hit poses. Canonical character art is not reused as a mutable custom character.
- Fixed 60 Hz simulation, interpolated presentation, buffered jumps, coyote time, and responsive air steering. Render resolution is capped at 2× device scale.
- A 6,160-unit beach with three connected areas inside Coastal Beginnings: Sunwash Strand, Driftwood Rise and Lighthouse Point. Optional elevated paths and forgiving lower tide-pool routes.
- Seventeen initial monsters across Bottle Critters, Trash Slimes, and Sand Crawlers. Platform-aware patrols, short chase ranges, 0.7-second attack warnings, recovery windows, hit reactions, and eight-second respawns with nearby-player protection.
- Health, XP, coins, level-ups, three camp checkpoints, automatic defeat recovery, a small introductory patrol objective, and an explorable lighthouse endpoint.
- Basic browser-local autosave with its own `healthia.royale.phase1.v1` key. This cannot overwrite existing Hero Showdown saves. Refresh returns to the saved checkpoint with full health.
- Optional synthesized action sounds, pause/customize menus, focus-loss pause, pointer capture and cancellation handling.

## Phase boundaries

This prototype balances levels **1–10**. It does not implement the full 99-level progression, nine powers, seven full regions, legendary bosses, equipment, Tree of Eris, Villain Merge, accounts, or three independent save slots. Browser-local progress is one disposable playtest patrol; it is not an account or cloud save. It does not sync across devices or origins. No multiplayer is included.

The hero and coastal enemies use lightweight original canvas artwork as a functional animation foundation. Final production art and further animation polish can replace the renderer without changing combat or physics. Body proportions are cosmetic, with a standard gameplay hitbox so builds have equal reach and mobility.

## Architecture and reuse

- `core.mjs`: deterministic simulation, collisions, combat, enemies, progression and save validation. No browser dependency.
- `world.mjs`: region, surface, enemy and checkpoint data.
- `renderer.mjs`: layered scenery, shared hero rig, monsters, particles, and camera.
- `input.mjs`: keyboard, stick, multi-pointer buttons, cancellation and focus reset.
- `app.mjs`: fixed-step loop, UI, sound and local save adapter.
- `index.html` / `royale.css`: responsive creator, HUD and menus.
- `../assets/animation/motion-core.js`: the **unchanged approved** render-position interpolation helper. It is reused read-only; no existing animation controller is loaded or changed.

The separate private playtest deployment contains only Royale and that one shared helper. It does not deploy the existing Story/Versus game or modify the live game. In the repository, return links go to its existing mode menu.

## Automated and browser checks

Node 20+ (no package installation):

```sh
node --test royale/tests/core.test.mjs
node royale/tests/verify-isolation.mjs
```

Open `http://localhost:8000/royale/tests/mobile.html` for repeatable input and viewport checks. It exercises the real DOM handlers inside a same-origin iframe. Select portrait, landscape, small phone, or desktop; click **Run input checks**. Synthetic touch checks replace capture only for the synthetic event sequence, since synthetic pointers are not active hardware pointers; the original browser methods are restored afterward. Physical touch capture and device feel still require hands-on testing.

Add `?qa=1` to the game URL for a visible FPS/state/position readout. `?touch=1` exposes the touch UI on a desktop. See `VALIDATION.md` for measured results and limits.

## Focused physical-device playtest

1. Create a strong or full build, change colors, turn the cape off/on, and start. Check both phone orientations.
2. Walk gently on the stick, then push fully to run. Double-jump onto the first grass platform; steer back in midair.
3. Hold movement with one finger and tap jump/punch/kick with another. Release fingers outside buttons; background and reopen the browser. Movement must stop and the game must pause.
4. Defeat all three monster types. Check health bars, XP and coins, level healing, and later respawns. Enemy warning marks should give enough time to jump away.
5. Visit Driftwood and Lighthouse camps and rest. Refresh, return to checkpoint from Pause, and confirm XP/coins/appearance survive.
6. Reach the lighthouse using the beach and optional upper routes. Report device/browser, orientation, and the part that felt wrong. Use `?qa=1` when reporting performance.

Actual iOS Safari and Android hardware feel, safe-area behavior, sustained 60 FPS, and gamepad support are not certified by desktop viewport simulation. Gamepad support is outside Phase 1's requested keyboard/touch scope.
