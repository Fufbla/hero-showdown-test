HERO SHOWDOWN — STORY CHAPTER CODES

Chapter 2: 1992 — The Collapsing Cave
Chapter 3: 2014 — Shore Front

HOW IT WORKS
Chapter 1 remains open to everyone.
Choose STORY MODE, then ENTER CHAPTER CODE to resume a later chapter.
Enter 1992 or 2014, choose your hero, and press START CHAPTER.
Keyboard, on-screen numeric buttons, and controller navigation are supported.

After completing Chapter 1 and its ending movie, players see the Chapter 2 code.
After completing the cave and its hero-specific rescue movie, players see the
Chapter 3 code. Each completion screen also has a Continue button for players
who want to keep playing immediately without re-entering the code.

Resuming Chapter 2 preserves the selected hero's cave entrance, mission, and
rescue cutscene. Resuming Chapter 3 starts at the opening movie and first
scorpion round with fresh team health; it does not skip to the boss.
The original Chapter 3 ending movie is preserved. There is no Chapter 4 code.

UPLOAD ONLY THESE FIVE GAME FILES
This update is based on main commit 082d4ef7613dedb28e885c626ba43c8771820b20,
which already includes Bushman and Storm Rooftop.

1. Unzip the package.
2. Under your existing assets/js folder:
   - Replace story-cave.js.
   - Add story-chapters.js.
3. Under your existing assets folder, add story-chapters.css.
4. Replace index.html and hero-showdown.html in the root of the game last.
5. Reload your game. Keep all other assets, videos, sounds, and files in place.

Folder layout:
  index.html
  hero-showdown.html
  assets/
    story-chapters.css
    js/
      story-cave.js
      story-chapters.js

README-CHAPTER-CODES.txt and tests/story-chapters.browser.cjs are included for
reference and do not need to be uploaded to run the game.
No files have been uploaded to GitHub or deployed by this update.

VALIDATION
32 browser checks passed for code validation, retrying wrong codes, all three
hero cave routes, chapter completion rewards, continuation, chapter movies,
Shore Front round progression and final ending, keyboard/touch/controller
input, portrait and landscape phone layouts, and both HTML entry points.
37 existing Story-switch and Bushman combat-rule checks also passed.
No browser runtime errors or missing assets were observed in these checks.
