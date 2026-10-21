# Controller navigation and Dr. Styro update

Controller menus: D-pad or left stick navigates, A / Cross confirms. Hold a direction to repeat (360 ms initial delay, 145 ms repeats). Select / Share goes back; it also closes How to Play. Mouse and touch selection synchronize with controller focus. A bright outline remains visible after pointer use. Fullscreen, sound and help remain reachable from menus. Start pauses/resumes during combat.

Combat mapping is preserved: left stick / D-pad moves; A / Cross jumps; X / Square punches; Y / Triangle kicks; LB / L1 or LT / L2 blocks; RB / R1 or B / Circle uses special; L3 toggles sound; R3 toggles fullscreen. Browser audio/fullscreen permission may still require a mouse/touch gesture.

Dr. Styro retains his artwork, damage, cooldowns and attack windows. Added distance-driven walking bounce, breathing, squash/stretch, pose blending, windup/follow-through, eased Foam Crush travel, spike recoil, hit recoil and bounded foam particles. Double Trouble separates and converges smoothly back to the actual boss position. This improves the existing atlas animation; it is not a replacement with a full hand-drawn animation set.

Validation: all 36 game JavaScript files pass syntax checks; 75 Chromium browser checks pass across desktop and phone layouts, all eight opponents and three venues. Checks cover menu reachability, A confirmation, mouse/touch handoff, analog holds, help, sound, pause/resume, combat mapping, disconnect clearing, asset loading, combat simulation, all three Styro attack cycles, particles and knockback. Visual screenshot inspected. Real controller hardware, Safari, audible music quality and subjective animation feel require device playtesting. Original audio and artwork files are unchanged.

To rerun: install Playwright in a development environment, then run `node tests/regression.cjs`. Optionally set TEST_BROWSER to an existing Chromium executable. Tests need Python 3 for their local HTTP server. No build step or runtime dependency was added to the game.
