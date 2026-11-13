# Costume asset batch B

Generated using the built-in image generation tool, with the approved concept sheet as the reference. No source pixels were edited after generation.

All three outputs are **1448 × 1086 RGBA**, an exact **8 × 6 grid of 181 × 181 cells**, despite 2048 × 1536 being requested. There are 48 visible complete poses per source. Packing must use actual 181px source cells.

Sources:
- `stuffed-animal-costume-source.png`
- `zombie-costume-source.png`
- `reaper-costume-source.png`

Visual inspection: all contain distinct run, jump, punch, kick, cast and flight poses; magenta face/head placeholders are present in all cells. Zombie keeps the original distressed green-gray clothing, with a blank head and cyan exposed hands; original saved hairstyles can be composited. Teddy retains brown plush fur, tan belly/muzzle, red bow and paws. Reaper retains black/purple robe, skull clasps, hood and held scythe.

Known production considerations:
- Per-cell face bounds and pose anchors differ and require actual registration. A few flight poses lean more than the requested upright pose, but face openings remain visible.
- Some poses may need timing/registration review in motion; static image inspection is not a full animation test.
- Native alpha has low-alpha colored fringe. Teddy has 89,208 bright-red pixels at alpha=1; legitimate red bows are mostly alpha=253. Zombie has 20,020 magenta fringe pixels at alpha=1. Source visible pixels are largely alpha=252–254, not 255. Mask decoding should ignore near-transparent pixels, and should use the main connected face component rather than all matching colors.
- Reaper contains bright purple trim near the magenta mask color. Decode the contiguous face opening only, preserving trim and scythe accents.
- These are raw production sources, not final composites, so final customized faces are not shown in these files.
- Pixel inspection found no alpha>128 artwork touching any 181×181 source cell edge in any of the 144 cells. A contiguous high-alpha magenta face component is present in all cells. Component area ranges: Teddy 1,099–1,601 pixels; Zombie 2,689–3,486; Reaper 1,091–1,373. This supports safe packing but does not replace the integrated animation review.

## Exact prompts

### stuffed-animal-costume

Use case: stylized-concept. Asset type: production game animation sprite atlas.
Reference image role: approved design reference. Reproduce ONLY the Stuffed Animal Costume, fourth character in the top row: complete brown plush teddy bear onesie, textured brown fur, round bear ears, tan muzzle above face opening, black toy bear nose, tan belly, oversized matching plush paws and feet, red bow tie. Preserve exact design, illustration style, thick dark ink outlines, compact Action-Chibi body proportions. No redesign.
Create exactly ONE 2048x1536 transparent PNG with EXACTLY 8 columns and 6 rows, 48 complete character poses. Cell size 256x256. No lines, labels, captions, floor, shadow, background, or empty cells. Entire pose in each cell, at least 12px transparent gutter. Same head/body size all cells. Standing feet y=238 local; hood top y=24. Every pose faces RIGHT in three-quarter side gameplay view. Keep face upright and opening visible every frame. No jump trajectory displacement.
CRITICAL production customization mask: the entire personalized FACE OPENING inside teddy hood must be one clean SOLID FLAT MAGENTA (#ff00ff) oval, with no eyes, skin, eyebrows, beard, nose, mouth, shading or hair inside. No magenta anywhere else. This mask will be replaced with the player's face at runtime. The teddy muzzle ABOVE the opening stays natural brown/tan. Teddy paws fully cover hands, no exposed skin. Do not copy the reference hero's face or hair.
Row-major frame order:
Row 1: 0-1 two idle breathing poses; 2-3 run acceleration; 4-5 stopping; 6-7 first two running stride phases.
Row 2: 8-13 remaining six running stride phases (alternating feet, contact/passing/flight, forward leaning torso); 14-15 jump crouch/takeoff.
Row 3: 16-17 jump rise/apex; 18-21 double-jump tuck/recoil/extend/apex; 22-23 fall controlled/brace.
Row 4: 24-25 landing crouch/recovery; 26-29 punch anticipation/windup/full extension/recovery; 30-31 kick windup/knee lift.
Row 5: 32-33 kick full extension/recovery; 34-35 hurt recoil/recover; 36-37 defeat kneel/collapse (head stays upright); 38-39 recovery getup/guard.
Row 6: 40-43 fireball cast gather/aim/release/recover (no projectile); 44-47 flight lift/hover/fly/glide, mostly upright.
Every frame complete unified costumed body. Distinct strong poses, real forward running strides, full powerful punches/kicks. Bear paws and costume move with the authored body. No separated limbs, rig diagrams, costume pieces or hair. True transparent alpha background. EXACT 8x6 grid, 48 poses.

### zombie-costume

Use case: stylized-concept. Asset type: production game animation sprite atlas.
Reference image role: approved design reference. Reproduce ONLY the Zombie Costume, fifth character in the top row: torn distressed green-gray dark jacket, ragged sleeves, pale damaged white dress shirt, loosened muted red necktie, brown belt, torn dark navy trousers, matching ragged gray-green shoes. Preserve exact reference's clothing silhouette, layered tears and weathered fabric, detailed comic Action-Chibi illustration style, dark ink outlines and compact proportions. Do not redesign.
For this universal version there is NO head covering and NO zombie scalp: the player's own head and hairstyle are composited later. Use a complete bald head-shaped solid FLAT MAGENTA (#ff00ff) placeholder, roughly oval and fully visible. No face, eyes, skin, hair, beard, ears or facial detail baked in. All exposed skin below head (neck, hands, small knee holes) is FLAT CYAN (#00ffff) inside dark contours. No cyan or magenta anywhere else. These are runtime material masks, not final costume colors.
Create exactly ONE 2048x1536 transparent PNG with EXACTLY 8 columns and 6 rows = 48 complete costumed poses. Cells 256x256, no lines, labels, captions, floor, shadows, background or empty cells. Every complete pose fits its cell with >=12px transparent gutter. Same head/body size and compact Action-Chibi proportions each frame. Standing feet y=238 local; head top y=24. All poses RIGHT-facing in three-quarter side gameplay view, same angle throughout. Keep head upright and visible in all frames. No jump trajectory displacement.
Row-major frame order:
Row 1: 0-1 two idle breathing poses; 2-3 run acceleration; 4-5 stopping; 6-7 first two running stride phases.
Row 2: 8-13 remaining six running stride phases (alternating feet, contact/passing/flight, forward torso lean); 14-15 jump crouch/takeoff.
Row 3: 16-17 jump rise/apex; 18-21 double-jump tuck/recoil/extend/apex; 22-23 fall controlled/brace.
Row 4: 24-25 landing crouch/recovery; 26-29 punch anticipation/windup/full extension/recovery; 30-31 kick windup/knee lift.
Row 5: 32-33 kick full extension/recovery; 34-35 hurt recoil/recover; 36-37 defeat kneel/collapse with upright head; 38-39 recovery getup/guard.
Row 6: 40-43 fireball cast gather/aim/release/recover (no projectile); 44-47 flight lift/hover/fly/glide, torso mostly upright.
Each frame is one complete preauthored unified character pose. Real alternating forward running strides, strong punches/kicks, fabric moving with the whole pose. No independent limb pieces. CRITICAL: PURE solid magenta blank head, PURE cyan exposed skin, all clothing exact reference green-gray zombie suit. Actual transparent alpha, EXACT 8x6 grid.

### reaper-costume

Use case: stylized-concept. Asset type: production 2D game animation sprite atlas.
Reference image role: approved exact costume reference. Reproduce ONLY the Reaper Costume, first character bottom row: dark black-and-purple pointed hood, dark flowing robe, cool PURPLE glowing trim, skull clasp at chest and skull belt decorations, layered tattered purple-edged fabric, dark purple gloves and boots, ornamental scythe with dark pole and PURPLE curved blade. Keep exact clothing design, comic ink outlines and compact Action-Chibi proportions. No redesign. Scythe is only a visual accessory held in a hand, never an attack impact or projectile.
CRITICAL: inside the hood use a single FLAT PURE MAGENTA (#ff00ff) oval FACE OPENING, no face, skin, facial features, hair, eyes, nose, beard, mouth or shading. It will be replaced by personalized face. Magenta only inside this oval. Purple trim must be deep BLUE-VIOLET (#7035cc, #4f268b), never pink/magenta, to avoid the customization color key. Hands are completely gloved. Hood opening is visible and upright in EVERY pose. Hood does not contain a skull face.
Create ONE true transparent alpha 2048x1536 PNG, EXACTLY 8 columns × 6 rows of 48 complete poses, cell 256x256. No grid lines, letters, labels, floor, cast shadows or background. Every entire character including entire scythe and robe fits within its individual cell with >=12px transparent gutter. Same head/body size every cell. Standing boots local y=238; head top around y=24, scythe may extend up to y=12. All figures face RIGHT in three-quarter gameplay side view. Jump frames vary posture only, not large up/down displacement.
Strict row-major pose order:
Row 1: 0-1 two idle breathing poses; 2-3 run acceleration; 4-5 stopping; 6-7 first two running stride phases.
Row 2: 8-13 remaining six running stride phases, alternating feet contact/passing/flight, forward torso lean and robe trailing; 14-15 jump crouch/takeoff.
Row 3: 16-17 jump rise/apex; 18-21 double-jump tuck/recoil/extend/apex; 22-23 fall controlled/brace.
Row 4: 24-25 landing crouch/recovery; 26-29 gloved fist punch anticipation/windup/full extension/recovery (scythe stays in other hand, no scythe slash); 30-31 kick windup/knee lift.
Row 5: 32-33 kick full extension/recovery; 34-35 hurt recoil/recover; 36-37 defeat kneel/collapse with upright hood; 38-39 recovery getup/guard.
Row 6: 40-43 fireball cast gather/aim/release/recover, no projectile; 44-47 flight lift/hover/fly/glide, torso mostly upright.
Complete unified character frames only, no separate limbs, cape or prop parts. Strong clear whole-body motion, real running and forward punches/kicks. Keep scythe securely held in every frame, robe authored with body. Exact 8x6 layout, 48 poses; NO blank cells, no overlapping cells.

