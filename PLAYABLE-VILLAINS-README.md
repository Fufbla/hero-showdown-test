HERO SHOWDOWN — COMBINED VERSUS TEST

This complete test copy combines the finished animations and performance/control
work with playable villains, competitive 100 HP matches, and Pause move lists.
All 12 fighters are selectable for Player vs CPU and local Player vs Player.

OPEN AT HOME
1. Extract this ZIP into a NEW folder. All game assets are included.
2. With Python 3 installed:
   Windows: double-click START-PLAYABLE-VILLAINS.bat
   Mac: open START-PLAYABLE-VILLAINS.command
   Linux / terminal: python3 tools/serve-playable-villains.py
3. The test opens at http://127.0.0.1:8879/playable-villains-test.html
4. Select Versus, then Player vs CPU or Local Player vs Player.
   Pause during a match to see both fighters' moves and controls.
5. Optional roster gallery and repeatable checks:
   http://127.0.0.1:8879/combined-versus-review.html

If the Mac launcher does not open, run python3 tools/serve-playable-villains.py
from the extracted folder in Terminal. Keep that terminal open while playing.

YOUR MANUAL UPLOAD
The deployable website files are in dist/. To review on your phone, upload that
folder's CONTENTS to a separate test folder on your host, then open
playable-villains-test.html in that folder. Keep assets/ and videos/ beside it.
You handle all uploading. No deployment, push, production merge, or account
changes were made for this build.

VALIDATION
614 automated tests passed; 40 browser checks passed, including 936 animation
states, all 144 fighter pairings, mirror matches, 100 HP rules, pause guides,
virtual controllers, hazard arenas, results/rematches, and exits to Story/co-op.
The finished art and both normal production entries were preserved byte-for-byte
from the performance/control build. Full evidence is in docs/combined-*.

NEXT OBJECTIVE
Hands-on playtest at home: one controller, two controllers, keyboard, phone
portrait/landscape, and a two-device internet co-op session. Confirm the feel and
balance of CPU difficulty and each fighter's moves. This build remains a separate
review entry until you approve a production merge. Competitive online PvP is not
part of this build; the existing online mode remains co-op against a boss.
