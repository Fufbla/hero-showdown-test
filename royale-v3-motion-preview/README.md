# Action Chibi real-game motion preview

Copied game code from main commit 79375945adde95f8dee1187f1646791a828e4b26. This is not the small character viewer.

The live simulation, enemies, maps, controls, hitboxes and damage timings are unchanged. Artwork uses curated existing full-character keyframes at 4/8/6/6/6/6, plus separate start/settle clips. Shared original artwork is read-only. Motion WebP assets are lossless crops; no color-key transparency cleanup is applied.

Only the public test identity 0000000000 is initialized. Local saves and IndexedDB use `royale-motion-preview-0000000000:`. Multiplayer/account writes are disabled. No production account is used.

This is a fixed-outfit motion trial. Cosmetic customization needs its own art pass. The canvas uses the game's existing frame-synchronized loop and 60 Hz simulation; animation pose changes are independently timed to real attacks and jumps.
