# Approved costume atlas contract

Reference: `approved-concepts.jpeg`. These are production sprite assets, not new designs. Preserve that detailed illustrated Action-Chibi style, thick dark outlines, colors, costume details and compact proportions.

Each costume source is one transparent 2048 × 1536 PNG, EXACTLY 8 columns × 6 rows = 48 complete poses, cells 256 × 256, no borders, captions or labels. All poses face RIGHT in three-quarter side gameplay view. No floor or cast shadow. Entire pose fits each cell with at least 12 px transparent gutter. Same body and head size every frame, standing feet around y=238, head/hood around y=24..126. Don't draw trajectories or vertical jump displacement. Each cell has a complete authored pose, no separate limbs or clothing.

FACE REGISTRATION: every costume has an empty, solid FLAT MAGENTA (#ff00ff) oval placeholder where the personalized face goes. No eyes, eyebrows, beard, nose, mouth or hair baked into source. Hooded outfits have the magenta face oval surrounded by the approved hood/bun/cheese; unhooded outfits have a complete magenta bald-head placeholder, with no headwear. Never put magenta anywhere else. In the running/attack frames the opening remains visible and keeps a stable size; it follows the authored head position. Keep head upright in all frames, including hurt/defeat; defeat can be a collapsed kneel. This color is a runtime customization mask, not final appearance.

EXPOSED SKIN REGISTRATION: hands or exposed skin below the head are FLAT CYAN (#00ffff), with dark contour/detail lines and no gradients. No cyan anywhere else; keep dolphin blue distinctly blue (#2494e8). Gloves/paws stay their original costume colors. The runtime recolors only cyan skin to the player's saved skin tone. No exposed skin pixels outside these markers. Zombie skin tint does not change the saved face or skin.

Frames in strict row-major order (indices 0–47):

- Row 1: 0–1 idle breathing poses; 2–3 run acceleration; 4–5 stopping; 6–7 first two running stride phases.
- Row 2: 8–13 remaining six running phases, alternating feet with contact/passing/flight, forward torso lean; 14–15 jump crouch/takeoff.
- Row 3: 16–17 jump rise/apex; 18–21 double-jump tuck/recoil/extend/apex; 22–23 fall controlled/brace.
- Row 4: 24–25 landing crouch/recovery; 26–29 punch anticipation/windup/full extension/recovery; 30–31 kick windup/knee lift.
- Row 5: 32–33 kick full extension/recovery; 34–35 hurt recoil/recover; 36–37 defeat kneel/collapse; 38–39 recovery getup/guard.
- Row 6: 40–43 fireball cast gather/aim/release/recover, no projectile baked in; 44–47 flight lift/hover/fly/glide. Flight body remains mostly upright so the personalized face stays correctly oriented.

Tails, cloth, ingredients and accessories follow each authored whole pose. Reaper scythe is held consistently, purely visual. Fishsticks shirt reads “I ❤️ FISHSTICKS” clearly; it must not be replaced by generic symbols. No face or hair from the reference is baked in. The head placeholders support the existing personalized facial system.

Asset generation must use image_gen, one call per costume, with the attached concept image as reference. Copy each generated source into this folder as `<costume-id>-source.png`. Keep the actual source untouched for provenance. Packing, color-key mask decoding and sprite-sheet playback are implementation tasks, not new artwork.
