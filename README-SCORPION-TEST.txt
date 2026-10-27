HERO SHOWDOWN — SCORPION ANIMATION APPROVAL TEST

This is a small update for the existing game, not a second full game download.

SETUP
1. Extract this ZIP.
2. Copy everything inside its Hero-Showdown-Scorpion-Animation-Test-Update folder
   into the existing folder containing hero-showdown.html and assets/.
   In the earlier Combined Versus Test download, that folder is dist/.
   All supplied names are new. No existing game file needs to be replaced.
3. Windows: double-click START-SCORPION-TEST.bat.
   macOS/Linux: run python3 start-scorpion-test.py from that same folder.
   These launchers require Python 3. No extra Python packages are required.
   A browser opens the isolated test. Keep the server window open while playing.
   If already serving the game locally, simply open /scorpion-rig-test.html.
4. Click Start / restart boss battle. Select Summy, Sadie, or Vee before starting.

Use HTTP through the launcher; opening the HTML directly as a file may block
the test's same-origin access to the existing game in some browsers.

PLAY AND REVIEW
A/D or arrows: move. W/up: jump. J: punch. K: kick. L: block. Q: tag.
The existing touch controls and controller controls remain available.
After four claw swings, dodge the stinger and punch it back at the boss.
The original game still pauses if it loses focus; click Resume to continue.

View original animation compares against the previous renderer.
Pose inspection freezes selected attacks for close review.
Show joints & hitboxes exposes attachment points and the original contact boxes.
View offers desktop, phone portrait, and phone landscape sizes.
Run animation checks exercises the real battle, attachments, tags, and freezes.
Tests intentionally reset the encounter; restart when ready to play again.

WHAT CHANGED
Eight walking legs have articulated joints and planted-foot IK, with alternating
stance/swing groups. Two articulated claw arms retain the exact original weapon
anchors and gain independent pincer motion. The ten-link tail curls and twists
with fixed physical link lengths, delayed secondary motion, and an attached
stinger. Body springs, breathing, impact recoil, and recovery connect the motion.
Every texture comes from the existing approved boss-parts.png. No image assets
were added or replaced. The new rear leg pair reuses the existing rear-leg art.

ISOLATION
Only scorpion-rig-test.html loads the new animation. The regular game entry
points are unchanged. This package does not integrate the rig into production.
No GitHub upload, push, or deployment was performed.
Removing these new files completely removes the test.

VERIFICATION
See scorpion-test-qa/QA-NOTES.md and the saved test reports.
Physical-device 60 FPS remains an approval check on your computers and phones.
The local launcher checks that the existing boss gameplay source matches the
version used for validation. It never edits that source.
