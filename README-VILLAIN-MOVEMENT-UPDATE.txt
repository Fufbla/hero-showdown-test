HERO SHOWDOWN — ALL NINE PLAYABLE VILLAINS
Movement update / isolated approval build — October 26, 2026

INSTALL
1. Keep a backup of your existing game folder.
2. Extract this ZIP into the existing complete Hero Showdown project folder
   from today's earlier ZIP. Merge its dist/ and tools/ folders and replace
   matching files. This update does not contain the unchanged game assets.
3. Run the existing START-PLAYABLE-VILLAINS.bat (Windows) or
   START-PLAYABLE-VILLAINS.command (Mac) launcher. Python 3 is required.
   Alternatively: python3 tools/serve-playable-villains.py
4. Open the playable test at:
   http://127.0.0.1:8879/playable-villains-test.html
   Open the movement approval page at:
   http://127.0.0.1:8879/villain-motion-review.html
   If a tab was already open, refresh it after replacing the files.

FOR YOUR MANUAL UPLOAD
Upload the contents of dist/ to the same website folder as your existing
playable-villains-test.html, keeping the assets/ subfolders intact.
If uploading the project source, retain the ZIP's dist/ and tools/ paths.
The main production entry pages are unchanged. Nothing was uploaded or deployed.

WHAT CHANGED
All nine playable villains have revised jump, landing, punch, kick, sweep,
uppercut and airborne attack poses, with anticipation and recovery.
Air attacks retain momentum; direction changes ease in; airborne knockouts
fall to the floor. AtomDust stays connected, Air Pollution uses smoke-tail
strikes, and Venomis stays grounded while Thornbear jumps.
The review page lets you compare both facings, slow the action, step frames,
see hitboxes, inspect all nine villains and play a CPU match.

SOLO CONTROLS
A/D or Left/Right: move; double-tap: dash.
W or Up: jump/double jump. J: punch. K: kick. L: block.
U: shoot. I: skill. Space: special. Pause opens the full move list.
Touch controls and gamepad support remain available.

PRESERVED
Health, damage, move costs, cooldowns, attack timing, hitboxes, jump strength,
gravity, grounded speed and special-move rules are unchanged.
Story/co-op bosses, chapter files and the scorpion work from the previous
complete package are unchanged. This ZIP updates the playable-villain test.

CHECKED
696 automated tests and 70 browser checks passed, including all 144 fighter
pairings, controls, hazards, rematches, Story/co-op exits and nine-villain
movement checks. Portrait and landscape layouts were visually reviewed.
Physical phones/controllers and two-device online co-op still need hands-on
testing. The 60 FPS target is not a guarantee for every device.

FILES
dist/playable-villains-test.html
dist/villain-motion-review.html
dist/assets/competitive/animation-adapter.js
dist/assets/competitive/combat.js
dist/assets/competitive/versus.js
dist/assets/villain-motion/ (4 JavaScript files and 13 new PNG sprite sheets)
tools/build-playable-villains.py
README-VILLAIN-MOVEMENT-UPDATE.txt
