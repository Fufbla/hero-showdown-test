# Hero Showdown Royale — Phase 2

A standalone mode inside Hero Showdown, developed only on `feature/showdown-royale`.
Open `royale/` directly, or choose **Showdown Royale** in the development branch's existing mode menu.
Built on Phase 1 commit `d2fd2bfb902c1a778d50a2608fbf56a5e5dc54b4`. Every Phase 2 change is inside `royale/`. Story/Versus logic, canonical fighters, animations, assets, videos, and the main branch are preserved.

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

## Create or continue a hero

1. Open the playtest and choose **Create Hero** in an empty slot. Your Phase 1 hero is automatically imported into slot 1 when the old save is present on this same browser and origin.
2. Use **Identity**, **Face & hair**, **Body**, and **Starter suit**. Changes appear immediately. Select **Front** or **Back** for the two 2D views. The movement selector previews all animation states.
3. Enter a valid name and choose **Begin your adventure**. From gameplay, open **Pause → Customize your hero** to edit; canceling leaves the saved look intact.
4. Use **Pause → Choose another hero** to switch slots. Delete Hero opens a confirmation showing the selected hero's name and level.

The existing private test URL is reused, so its Phase 1 local save can migrate in place. The hosting sign-in gate is separate from the game: **there is no in-game account or cloud saving**. If prompted, open the private link with the ChatGPT account that owns this project.

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

- Male/female presentation; teenager, young adult and older adult appearance; skin and eye colors; seven hair choices and hair color; face, eye, brow, nose, mouth and facial-hair choices.
- Four body builds plus independent height, shoulders, muscularity, torso, arm and leg proportions. Gameplay uses the same 34 × 88 collision box, speeds, health and attack reach for every appearance.
- Starter suit primary/secondary colors, six premade emblems, emblem color, cape color and optional cape. The cape has one standard 48-unit cloth length. There is no upload or drawing facility.
- A shared articulated rig: idle, walking, running, jumping, double-jumping, falling, landing, ground/aerial punch and kick, damage, defeat and respawn. Fixed bone lengths, connected joints, planted stance feet, synchronized attack contact and flowing capes. Aerial defeat settles visually toward the floor without changing simulation physics.
- Three independent **browser-local** hero slots with portraits, name, level, region, timestamps, continue/create and confirmed deletion. Autosave every five seconds, when pausing/resting and when the page is hidden or closed.
- Original Coastal Beginnings movement, buffered/coyote double jumps, air control, punch/kick timings, monster behavior/respawns, XP, coins, levels 1–10, camps and checkpoints.
- Optional synthesized nonverbal sounds; no hero speech. No dash and no floating damage numbers.
- Responsive tabbed creator, keyboard focus management, scrollable fields, persistent action buttons, keyboard/touch gameplay and viewport adjustment when a mobile keyboard opens.

## Saving and compatibility

The schema-v2 envelope in `healthia.royale.profiles.v2` holds three nullable slots. Each filled slot contains a stable local ID, creation/update timestamps, last region and a validated game snapshot. Appearance is versioned independently; the storage adapter is separate from gameplay to allow a future account-backed implementation.

On the first load, a valid `healthia.royale.phase1.v1` save migrates to slot 1, preserving progression, checkpoint, colors and existing appearance choices. New appearance fields receive defaults. **The old key remains untouched as a recovery backup.** Once the v2 envelope exists, deleting an imported slot does not reimport that old backup. Clearing browser storage still removes local heroes; there is no cross-device or cross-origin sync.

Malformed/future-version records are left untouched and cannot be overwritten by this client. Storage/quota failures show a persistent warning and retain the current session in memory. Conflicting writes detected from another tab stop saving until reload; a stale session cannot silently replace a newly selected slot.

Only a starter outfit is obtainable in this phase. The outfit data boundary retains fixed palettes for future purchased/earned/rare/Legendary items, and the creator locks recoloring for those records. This is a compatibility guard, not an equipment catalog or unlock system.

## Phase boundaries

This prototype balances levels **1–10**. It does not implement the full 99-level progression, nine powers, seven full regions, legendary bosses, equipment, Tree of Eris, Villain Merge, accounts, or account-backed save slots. Local hero slots are functional, but they are not account or cloud saves. It does not sync across devices or origins. No multiplayer is included.

The hero and coastal enemies use lightweight original canvas artwork as a functional animation foundation. Final production art and further animation polish can replace the renderer without changing combat or physics. Body proportions are cosmetic, with a standard gameplay hitbox so builds have equal reach and mobility.

## Architecture and reuse

- `core.mjs`: deterministic simulation, collisions, combat, enemies, progression and save validation. No browser dependency.
- `world.mjs`: region, surface, enemy and checkpoint data.
- `renderer.mjs`: layered scenery, monsters, particles and camera.
- `appearance.mjs`: appearance schema, name validation and starter/fixed palette rules.
- `hero-rig.mjs` / `hero-art.mjs`: pure pose geometry and canvas drawing shared by previews, portraits and gameplay.
- `creator.mjs`: tabbed appearance controls and front/back preview.
- `saves.mjs`: local three-slot storage, validation, migration and write-conflict handling.
- `input.mjs`: keyboard, stick, multi-pointer buttons, cancellation and focus reset.
- `app.mjs`: fixed-step loop, UI, sound and local save adapter.
- `index.html` / `royale.css`: responsive creator, HUD and menus.
- `../assets/animation/motion-core.js`: the **unchanged approved** render-position interpolation helper. It is reused read-only; no existing animation controller is loaded or changed.

The separate private playtest deployment contains only Royale and that one shared helper. It does not deploy the existing Story/Versus game or modify the live game. In the repository, return links go to its existing mode menu.

## Automated and browser checks

Node 20+ (no package installation):

```sh
node --test royale/tests/*.test.mjs
node royale/tests/compare-phase1.mjs
node royale/tests/verify-isolation.mjs
```

Open `http://localhost:8000/royale/tests/mobile.html` for repeatable input and viewport checks. It exercises the real DOM handlers inside a same-origin iframe. Select portrait, landscape, small phone, tablet or desktop; run **Input checks** and **Creator / save checks**. These use isolated session-storage test namespaces and do not replace real hero slots. The latter also renders each option at a fixed animation time to check visible differences, validates names and exercises migration, editing, cancellation, all slots, reloads and confirmed deletion. Synthetic touch checks replace capture only for the synthetic event sequence, since synthetic pointers are not active hardware pointers; the original browser methods are restored afterward. Physical touch capture and device feel still require hands-on testing.

Open `royale/tests/animations.html` for a static/animated gallery of every pose, including front/back and extreme builds.

Add `?qa=1` to the game URL for a visible FPS/state/position readout. `?touch=1` exposes the touch UI on a desktop. See `VALIDATION.md` for measured results and limits.

## Focused physical-device playtest

1. Create an older/female or teen/male hero, try all four tabs and both views, change every proportion and suit color, and turn the cape off/on. Check both orientations, the on-screen keyboard and the smallest supported screen.
2. Walk gently on the stick, then push fully to run. Double-jump onto the first grass platform; steer back in midair.
3. Hold movement with one finger and tap jump/punch/kick with another. Release fingers outside buttons; background and reopen the browser. Movement must stop and the game must pause.
4. Defeat all three monster types. Check health bars, XP and coins, level healing, and later respawns. Enemy warning marks should give enough time to jump away.
5. Visit Driftwood and Lighthouse camps and rest. Refresh, return to checkpoint from Pause, and confirm XP/coins/appearance survive.
6. Reach the lighthouse using the beach and optional upper routes. Report device/browser, orientation, and the part that felt wrong. Use `?qa=1` when reporting performance.

Actual iOS Safari, Android browsers and tablet hardware have not been physically tested in this environment. Touch feel, keyboard/safe-area behavior, sustained 60 FPS and long sessions require hands-on review. No Phase 3 power or account systems were started.
