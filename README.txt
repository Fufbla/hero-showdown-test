HERO SHOWDOWN - MENU MUSIC ONLY

Upload assets/audio/hero-menu-theme.mp3 and assets/audio/menu-music.js into the same paths in your GitHub repository. Do not delete existing assets.

In BOTH index.html and hero-showdown.html, add the following immediately before the final </body> tag:
<script src="assets/audio/menu-music.js"></script>

Commit your changes. The script attempts to play the theme after the intro whenever the game's menu overlay is visible, and pauses it during gameplay. Browser autoplay restrictions may require an initial user interaction.

NOTE: This is a standalone add-on and has not been fully playtested against the live game. Do not overwrite your newer HTML with older copies.
