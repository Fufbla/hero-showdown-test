# Hero Showdown Royale — Phase 10 review

An isolated game mode for Hero Showdown — James Clan Comics. Development stays on `feature/showdown-royale`. Main, Versus, Story and approved shared artwork are unchanged.

**[Playtest](https://healthia-showdown-royale-phase1.gladcreek512.chatgpt.site)** · **[Phase 10 guide](PHASE10.md)** · **[Results and limitations](PHASE10-VALIDATION.md)** · **[Initial audit](PHASE10-AUDIT.md)**

Phase 10 fixes ordinary implicit saving, durable hero deletion, projectile reuse/collision, redundant rendering/HUD work and input cleanup. It adds independent audio levels and original region/battle loops. Gameplay balance values, artwork and the unfinished account backend are preserved. This is a review build, not release certification.

## Launch

From the repository root:

```sh
python3 royale/serve.py
```

Open `http://localhost:8000/royale/`. Use `--lan` for devices on the same Wi-Fi, `--port 8001` for another port, or `--no-browser`. Serve the repository root so shared approved assets resolve. Open `/index.html` to test the unchanged original modes.

## Play

Create one of three local heroes in My Heroes. A/D or arrows move, Shift runs, Space jumps and double-jumps, J punches, K kicks, 1/2/3 activate powers, 4 activates an eligible Merge power, H uses a Health Root, E interacts, and P/Escape pauses. Down + Jump drops through a one-way platform. Touch and standard controller mappings remain available.

Pause → World map reaches all seven regular regions at any level. Every region has ground plus four elevated tiers, accessible without Flight. Wounded monsters continue pursuing/attacking at 50% HP without automatic threshold knockback. Legendary arenas remain Level-99 content. Clear the boss and every helper for victory.

Pause → Tree of Eris offers upgrades, one central Costume Shop, appearance changes, Roots and Villain Merge. Return restores the previous exact location. Save/travel/equipment changes require five safe seconds and no active boss encounter. Equipment capacity is seven total; Roots are separate with capacity four.

Enable audio with the music button. Pause → Keyboard, controller & touch settings includes independent Music/Effects sliders and adjustable joystick size, action size and offsets. Music defaults to 35%.

## Saving and accounts

Use **Pause → Save Game** to preserve ordinary adventure progress. Pausing, switching heroes, changing boards and portal travel do not silently move the last manual save. Initial hero creation and confirmed economic/permanent transactions remain durable. Closing during an unsaved boss attempt returns to the last manual scene; a saved encounter restarts at full health without a closure penalty.

Existing version 1–8 saves migrate without resetting appearance or progression. Strict IndexedDB records protect Legendary victories, claims, permanent item loss and now hero deletion. Deletion creates a permanent hero-ID tombstone before removing the ordinary slot; stale local caches are reconciled on reopening. Failed irreversible writes keep gameplay paused or leave deletion unconfirmed. Browser-local protection cannot survive clearing all storage, restoring an entire browser backup or deliberate local tampering.

Cloud accounts, provider sign-in, recovery and cross-device saving are **not deployed or end-to-end verified**. Phase 10 does not rebuild that backend. Local browser play remains available.

## Repeat the checks

```sh
node --test royale/tests/*.test.mjs
node royale/tests/compare-phase1.mjs
node royale/tests/verify-phase10.mjs
node royale/tests/balance-report.mjs
```

Open `royale/tests/phase10-browser.html` for the integration matrix and seven real-time benchmarks. Input regression suites use accelerated fixed simulation steps through real DOM handlers; benchmarks use wall time. Review pages use disposable namespaced data and are hidden in normal My Heroes. They are accessible through explicit review URLs or `?qa=1`.

Other review pages: [vertical](tests/phase9-browser.html), [Legendary/Merge](tests/phase7-browser.html), [regional bosses](tests/phase5-browser.html), [shop](tests/phase6-browser.html), [portals](tests/phase8-browser.html), [creator/input/powers/economy](tests/mobile.html), [graphics gallery](tests/showcase.html), [animation gallery](tests/animations.html).

## Remaining review work

Physical iPhone/Android/tablet/controllers, Safari/Firefox, long sessions and sustained 60 FPS need testing. Canonical Trash Monster/Ultimate Pollution Boss art, eight Merge costume motifs and skeletal remains remain provisional. The synthesized music loops need listening/creative review. No Phase 11 work is included.

Historical design and implementation notes: [early validation](VALIDATION.md), [Phase 3](PHASE3.md), [Phase 4](PHASE4.md), [Phase 5](PHASE5.md), [Phase 6](PHASE6.md), [Phase 7](PHASE7.md), [Phase 8](PHASE8.md), [Phase 9](PHASE9.md). Current behavior above supersedes historical autosave and boss-gate descriptions.


## Approved monster-reference review build

The 21 regular monsters now use transparent cutouts of the supplied comic-book concept art, with cached, aligned procedural idle/move/attack/hit/defeat motion. These are provisional single-pose animations, **not verified authored frame atlases**. See [asset audit, completed/remaining list and test results](MONSTER-SPRITES.md) and the [interactive sprite review](tests/monster-sprites.html). Monster AI, stats, attacks, rewards, desperation, physics and saves are unchanged.

Six larger original poses have since been recovered for the Region 4, 5 and 6 monsters that previously used tiny fallback poses. See the source recovery table in `MONSTER-SPRITES.md`; authored animation sequences remain outstanding.
