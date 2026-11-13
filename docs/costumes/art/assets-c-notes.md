# Costume asset generation — group C

Generated using built-in image_gen, each call using approved-concepts.jpeg as the design reference. No production publication or push performed. Source files are untouched generated PNGs.

## Saved sources

- fishsticks-costume-source.png: 1448 × 1086 RGBA, 8 × 6 grid, 181 px cells.
- pizza-slice-costume-source.png: 1448 × 1086 RGBA, 8 × 6 grid, 181 px cells.
- black-business-suit-source.png: 1448 × 1086 RGBA, 8 × 6 grid, 181 px cells.
- white-business-suit-source.png: 1448 × 1086 RGBA, 8 × 6 grid, 181 px cells.

## Visual QA and limitations

All four sheets visibly include 48 full-costume poses in the requested state order. Magenta face/head placeholders are present in every cell; fishstick blue gloves remain authored costume color, other exposed hands are cyan skin masks. Black suit has white tie; white suit has light blue tie and pocket square. Pizza keeps crust, pepperoni and cheese attached; fishstick keeps fish hood, blue cape and gloves, gold texture and shirt.

Generated dimensions differ from requested 2048 × 1536; atlas packer must normalize cell sizes and anchor ground positions. Face mask sizes and some pose shifts vary slightly. Fishstick lettering is small and imperfect on some oblique frames; review actual-size rendering and do not claim exact readable typography in all frames without verification. Some faint colored edge artifacts and faint ground-shadow pixels appear in source exports; validate decoded alpha/masks before final playback. Masks are intermediate art and must never be shown as final face/skin. No hairstyle/face pixels baked in; no independent limb rig.

## Exact prompts

### fishsticks-costume

Use case: stylized-concept. Production video-game sprite sheet, NOT a redesign. Input reference: approved 10-costume concept image. Reproduce ONLY bottom row second character, I Love Fishsticks Costume, exactly: full-body golden crumb-textured fishstick outfit, fish hood with two white googly eyes and small orange mouth on its top, blue gloves, gold matching boots with blue soles, white shirt printed exactly "I ❤️ FISHSTICKS", blue cape. Bold black outlines and glossy detailed 2D Action-Chibi illustration; same compact hero proportions.
OUTPUT: transparent PNG, 2048x1536, strict rectangular 8 columns by 6 rows of equal 256x256 cells, exactly 48 complete costume poses, all facing RIGHT in a consistent three-quarter gameplay direction. No visible grid, labels, scenery, floors, cast shadow, border, numbers or captions. Every complete pose fits its own cell with 12px gutter minimum. Constant anatomical dimensions throughout. Feet on same ground line y=238 except naturally bent legs; head/hood around y=24..126. Do not vertically displace jumping figures. Author the changing limbs, cape and cloth INSIDE each complete frame. No disconnected pieces.
CRITICAL CUSTOMIZATION MASK: Where personalized human face would be visible, draw only an EMPTY FLAT SOLID MAGENTA (#ff00ff) oval, no face features, no nose, ears, eyes, brows, mouth, beard or hair. Hood must enclose this oval. The mask stays same size and upright while following each pose. Magenta is not final skin; game replaces this mask with player face. Never use magenta anywhere else. Gloves stay BLUE, no human hands exposed. Do not draw default man's face.
STRICT frame order left to right row by row:
row1 frames0-7: two slightly different idle breathing poses; two acceleration poses; two stopping poses; first two phases of running.
row2 frames8-15: remaining six running stride phases alternating foot contact, passing, airborne, forward lean (not backward skipping); jump crouch; jump takeoff.
row3 frames16-23: jump rise; jump apex; four double-jump poses tuck/recoil/extend/apex; controlled fall; fall bracing.
row4 frames24-31: landing crouch; landing recovery; four punch frames anticipation/windup/FULL FORWARD ARM EXTENSION/recovery; kick windup; kick knee raised.
row5 frames32-39: FULL FORWARD LEG EXTENSION kick; kick recovery; hurt recoil; hurt recovering; defeat kneeling; defeat collapsed kneel with upright head; getting up; guard.
row6 frames40-47: four fireball casting poses gather/aim/release/recover with no projectile; four upright flight poses lift/hover/fly/glide.
Keep the fish hood and face opening consistent; same gold crumb texture and blue gloves in EVERY cell. Shirt wording exactly "I ❤️ FISHSTICKS" (I on first line with red heart, FISHSTICKS below). Keep all accessory designs from reference. Transparent background is mandatory.

### pizza-slice-costume

Use case: stylized-concept. Production game sprite sheet, not new design. Reference image role: approved design sheet. Reproduce ONLY PIZZA SLICE COSTUME (bottom row center): triangular melted golden cheese slice enclosing human body, pepperoni red circles fixed to cheese, broad thick golden crust forming top head covering, yellow/tan fitted sleeves and pants, white cuffs, matching tan/gold shoes, bold black outlines and detailed glossy Action-Chibi painted shading. No cape. Preserve the exact pizza design.
Create transparent PNG 2048x1536 with EXACTLY 8 COLUMNS x 6 ROWS, equal 256x256 sprite cells, 48 complete poses. No labels, lines, shadows, grid borders, scenery, floor or background. Keep at least 12 px transparent gutter on every cell and avoid overlap. Same body size and head size every cell. All heroes face RIGHT, stable three-quarter gameplay perspective. Head/hood around local y24..126 and standing feet local y238. Jump poses bend limbs but remain centered at same local position; physics supplies travel.
Mask requirement: every human face is ONLY one smooth uniform solid flat MAGENTA #ff00ff oval through the cheese face opening. NO human eyes, mouth, nose, beard, ears, eyebrows or hair anywhere. This is a runtime face-replacement marker. The cheese and crust surround the mask; do not draw any default reference face. Magenta nowhere else. Exposed hands or wrists ONLY flat CYAN #00ffff with dark contour/detail lines, so runtime restores player skin color. Cyan nowhere else. These marker areas must be large, smooth, consistent; never textured or shaded. Face oval stays nearly upright in every pose. Complete matching outfit in every frame, toppings securely attached.
Exact order, reading left to right:
ROW1: two idle breathing poses; two run acceleration poses; two stopping poses; first two run stride phases.
ROW2: six remaining run stride phases with genuine alternating legs, contact/passing/flight and forward lean; jump crouch; jump takeoff.
ROW3: jump rise; jump apex; double jump tuck; double jump recoil; double jump extend; double jump apex; fall controlled; fall brace.
ROW4: land crouch; land recover; punch anticipate; punch windup; punch FULL ARM EXTENSION to right; punch recover; kick windup; kick knee lift.
ROW5: kick FULL LEG EXTENSION right; kick recover; hurt recoil; hurt recover; defeat kneeling; defeat collapsed kneel with upright head; recover getting up; recover standing guard.
ROW6: cast gather; cast aim; cast release; cast recover (no fireball drawn); flight lift; flight hover; flight fly; flight glide, mostly upright torso.
Author each full character pose together. No separate objects or disconnected parts. Keep generous transparent gaps even around attacks. DO NOT bake cast shadows, sparkles, or ground dust. All 48 source poses visibly distinct where motion demands it.

### black-business-suit

Use case: stylized-concept. Production game animation sprites based EXACTLY on approved concept image. Reference role: costume design and illustrated style. Reproduce ONLY BLACK BUSINESS SUIT (bottom row fourth character). Fitted elegant black suit, white dress shirt, WHITE necktie, black lapels and black matching dress shoes, subtle seam highlights, silver belt buckle and white pocket square. Same Action-Chibi proportions: large round head, compact torso, short sturdy arms and legs. High-quality detailed 2D painted comic shading and bold black contours. Do not redesign outfit.
Create a transparent sprite atlas, 2048x1536 target, strict 8 COLUMNS × 6 ROWS, 48 full-character poses, equal 256 square cells. No visible grid, captions, labels, frame numbers, scenery, background, ground or cast shadow. Minimum 12px transparent gap inside every cell; all poses complete. Uniform anatomy and scale. All face RIGHT in three-quarter gameplay view. Standing feet local y238, head local y24..126. Do not shift jump characters vertically as world physics owns trajectory.
CRITICAL HEAD: Unlike reference, the entire head is a SOLID FLAT MAGENTA #ff00ff bald-head oval placeholder: NO face, eyebrows, eyes, nose, mouth, ears, beard, hair, highlights, shading, hat or hood. The game will replace the whole magenta head with each player's personalized head and hairstyle. Keep one smooth magenta oval per frame of constant size, upright orientation, clearly separated from necktie. Magenta nowhere else. Exposed hands and neck skin are FLAT CYAN #00ffff with dark contour lines, no human skin colors; cyan nowhere else (tie is WHITE). These are functional color-key masks.
Ordered left-to-right row-major 48 distinct poses:
ROW1: idle breath1; idle breath2; accelerate1; accelerate2; stopping1; stopping2; running stride1; running stride2.
ROW2: running stride3..8, visibly alternate foot contacts/passing/flight and forward lean; jump crouch; jump takeoff.
ROW3: jump rise; jump apex; double-jump tuck; double-jump recoil; double-jump extend; double-jump apex; falling controlled; falling brace.
ROW4: landing crouch; landing recover; punch anticipate; punch windup; punch FULL EXTENSION forward right; punch recovery; kick windup; kick knee lift.
ROW5: kick FULL LEG EXTENSION right; kick recovery; hurt recoil; hurt recover; defeat kneeling; defeated collapsed kneel with upright head; recover getup; recover guard.
ROW6: fireball cast gather; cast aim; cast release; cast recover (no projectile baked in); flight lift; hover; fly; glide, mostly upright torso.
Animate subtle black jacket movement authored in complete full-character frame, not disconnected limbs or pieces. Only hands and neck cyan, head magenta. Neckline white tie and shirt remain identical and correct. Entire transparent atlas must contain EXACTLY 48 sprites in 8×6 arrangement, no extra characters.

### white-business-suit

Use case: stylized-concept. Production game animation sprite sheet based EXACTLY on approved concept image. Reference role: costume design and illustrated style. Reproduce ONLY WHITE BUSINESS SUIT (bottom row last character): fitted elegant WHITE suit jacket and trousers, WHITE dress shirt, LIGHT BLUE necktie and light blue pocket square, WHITE matching dress shoes, silver belt buckle, subtle soft-gray fabric folds. Bold black contours and polished detailed Action-Chibi shading; same large round head, compact torso and short sturdy limbs. Keep white clothes truly white, never gray or black. Do not redesign.
OUTPUT transparent PNG 2048x1536 target, EXACTLY 8 COLUMNS x 6 ROWS, 48 complete character poses in equal 256x256 cells. No grid, labels, captions, numbers, scenery, borders, floor or shadows. At least 12px transparent gutter within every cell including attack extremes. Entire pose in every cell. Uniform body and head size. All poses face RIGHT in steady three-quarter gameplay angle. Feet local y238 standing; head local y24..126. Jump figures remain locally centered; world physics supplies trajectories.
CRITICAL CUSTOMIZATION: Entire head must be a FLAT SOLID MAGENTA #ff00ff bald-head oval placeholder, NOT a face. NO eyes, eyebrows, nose, beard, mouth, ears, hair, highlights or shading. NO hood, hat or headwear. Game replaces magenta oval with player's own full head and saved hairstyle. Same smooth round oval size across poses, nearly upright in all frames including collapse. Magenta nowhere else. Exposed hands and neck below the head are only FLAT CYAN #00ffff with dark contour/detail lines. These are skin-color masks for runtime. Cyan nowhere else; keep LIGHT BLUE tie pastel muted sky blue distinctly different from bright cyan masks.
Strict frames row-major:
ROW1: idle breathing1; idle breathing2; run acceleration1; acceleration2; stopping1; stopping2; run stride1; run stride2.
ROW2: run strides3-8, alternate feet with convincing contact/passing/air phases and forward lean; jump crouch; jump takeoff.
ROW3: jump rise; jump apex; doublejump tuck; recoil; extend; apex; fall controlled; fall brace.
ROW4: land crouch; land recovery; punch anticipation; windup; FULL FORWARD ARM EXTENSION punch right; punch recover; kick windup; knee lift.
ROW5: FULL FORWARD LEG EXTENSION kick right; kick recovery; hurt recoil; hurt recover; defeat kneeling; defeat collapsed kneel with upright head; recover getup; guard.
ROW6: fireball cast gather; aim; release; recover (no fireball); flight lift; hover; fly; glide with mostly upright torso.
Make actual distinct motion poses. Animate white jacket hems subtly within each entire authored character frame. No independently rendered limbs or disconnected costume pieces. Match the approved white suit and light-blue tie exactly in all 48 cells. Genuine alpha transparency mandatory.

