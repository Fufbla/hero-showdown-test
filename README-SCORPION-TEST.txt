HERO SHOWDOWN — SCORPION MOBILITY & CLAW APPROVAL TEST
Updated October 27, 2026

Merge the update ZIP into the existing complete project, preserving dist/.
If your website folder directly contains hero-showdown.html and assets/,
copy the contents of the ZIP's dist/ folder into that website folder instead.
This is an isolated approval test. Regular game entry points are unchanged.

START
Use your existing START-SCORPION-TEST launcher, or from this folder run:
  python3 start-scorpion-test.py
Python 3 is required. Keep the server window open while playing.
If already serving the game locally, open scorpion-rig-test.html and refresh.
Do not open it directly as a file; the review needs a local HTTP server.

PLAY
Start / restart boss battle starts the actual Chapter 3 encounter.
A/D or arrows move; W/up jumps; J punches; K kicks; L blocks; Q tags.
The existing touch and controller controls remain available.
After four claw swings, dodge the stinger and punch it back for 150 damage.

REVIEW
Select Left claw or Right claw, then Replay claw movement.
Choose normal, half or quarter speed; pause or step individual frames.
Show swing frames displays anticipation, sweep and recovery in time order.
Pose inspection freezes one phase. View original animation compares the old
renderer. Show joints & hitboxes exposes the connected arms and contact boxes.
Run animation checks tests the real battle; restart afterward to play normally.

WHAT CHANGED
Claws now use three connected arm links with bending forearms. The striking
palm and fingers retain the exact original attack transform. The body shifts
its weight, all eight feet plant during the sweep, and the pincers anticipate
and close through the strike. Recovery, counters and self-stings have recoil.
The active claw keeps its foreground depth through recovery. Breathing and
subtle tail movement continue between attacks. Existing eight-leg IK and the
connected ten-section tail remain in place.

PRESERVED
Original boss artwork, size and front view. All health, damage, attack times,
hitboxes, stinger rules, specials, defeat events and chapter transitions.
No image files were added or replaced. No production integration, GitHub
upload, push or deployment was performed. Other chapters and the playable
villain movement update are untouched.

VALIDATION
644 regression tests, including 30 scorpion tests, and 29 browser checks passed.
Read scorpion-test-qa/QA-NOTES.md for evidence and limitations. Physical phones
and computers still need your hands-on performance and appearance review.
