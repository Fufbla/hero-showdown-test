# Wearable inventory and fitting research

Baseline: 0b94a1fbba6ef015146f8f422cec32a63b88377f. Source/asset-metadata inventory only; no item is claimed visually inspected by this document.

## Runtime catalog

398 records: 77 legacy (11 palette/rarity variants × 7 slots), 54 regional (18 set/rarity variants × 3 slots), 243 power armor (81 designs × 3 slots), 24 merge (8 sets × 3 slots). The recolorable starter suit is separate.

| Slot | Records |
|---|---:|
| helmet | 107 |
| chest | 107 |
| boots | 118 |
| mask | 11 |
| suit | 11 |
| gloves | 11 |
| belt | 11 |
| cape | 11 |
| emblem | 11 |

Shoulders, upper-arm armor and leg armor are artwork components, not separate inventory slots. Strength chest pieces additionally synthesize matching gloves through equipmentOutfit. Definitions live in royale/equipment.mjs, costume-catalog.mjs, legendary-data.mjs and the chained *-armor.mjs catalogs; preserve all IDs and stats.

## Fitting findings from source

- Power chest artwork is one torso-bound stamp including shoulders. Its shoulder decorations cannot independently follow raised/punching upper arms.
- style-c-equipment.mjs anchors use torso length as a minimum armor width, even though native torso width in style-c-motion-paint.mjs depends on chest/shoulders. Torso-length customization can therefore widen armor independently of the underlying body.
- Glove/boot width caps also depend on torso length rather than corresponding arm muscle/hip thickness.
- power-armor-art.mjs splits all boots at 74% of source height. Independent greave and foot transforms exist, but actual painted boundaries can differ by design.
- headwear-fit.mjs uses an explicit closed-shell set list, open-front exceptions, one speed-relay profile mirror exception, and shared fitting constants. Individual face openings/crowns need actual review.
- Live source heroes mirror the whole canvas for left-facing; turnaround profiles also mirror. Most armor has front/profile/back artwork, not independently authored left images. Mirroring can flip asymmetric details and highlights.
- Starter/default reference and sprite optimization paths bypass layered reconstruction when eligible; test these alongside equipped/custom heroes.

## Cape and hair architecture

cape.mjs already includes WeakMap-owned paintedCapeMotion/paintedCapeOffset, with shoulder pinning, velocity response, airborne lift, takeoff/double-jump impulse, landing damping and turn response. Live source capes use this deformation. Turnaround cape rendering currently transforms one rigid cape layer, with only small running rotation. Preserve existing live deformation when improving turnaround cloth.

Hair: 42 modern catalog entries + 6 legacy hairstyles + None = 49 IDs. Shared front/side/back atlases are under royale/assets/hero/style-c-accurate/hair/, with frames.mjs and fit.mjs. Nine approved four-view references live in hair/reference-v3/*.png; buzz has buzz-reference-v2.png. Registration/clipping files: style-c-hair.mjs, hair-reference-material.mjs, hair-fit-corrections.mjs, headwear-fit.mjs. Remaining left styles reuse profile material.

Layer order in style-c-source.mjs: cape, rear hair, legs/boots, torso, rear arm/glove, suit/chest/belt/clasps/emblem, front arm/glove, head/front hair, mask/helmet. Back cape covers rear chest in turnaround. Shared render entry is hero-art.mjs → style-c-hero.mjs → style-c-source.mjs or style-c-turnaround.mjs.

Shared regional/merge/legacy equipment art: royale/assets/hero/style-c-accurate/equipment/worn.png, indexed by equipment/regions.mjs (101 regions). Distinct front motifs coexist with shared profile/back templates and crests. Cached tint/rarity variants in style-c-equipment.mjs have a 128-cell cap and lazy downsampling.

## Inspection limits

This task read renderer/catalog code and enumerated exported records and asset paths. It did not inspect every image, render every pose, test physical controllers, or measure phone FPS. The separate review harness is an inspection aid, not proof all combinations were reviewed.

## Exact power sheet inventory

Each path below is relative to royale/assets/power-armor/. Each collection has regions.mjs.

- fireball: fireball/caldera.webp (9 rectangles), fireball/corona.webp (9 rectangles), fireball/ember.webp (9 rectangles), fireball/flare.webp (9 rectangles), fireball/forge.webp (9 rectangles), fireball/furnace.webp (9 rectangles), fireball/kiln.webp (9 rectangles), fireball/phoenix.webp (9 rectangles), fireball/supernova.webp (9 rectangles).
- steel: steel/aegis.webp (9 rectangles), steel/boreal.webp (9 rectangles), steel/breakwater.webp (9 rectangles), steel/citadel.webp (9 rectangles), steel/lock.webp (9 rectangles), steel/polaris.webp (9 rectangles), steel/rail.webp (9 rectangles), steel/rivet.webp (9 rectangles), steel/tortoise.webp (9 rectangles).
- roots: roots/briar.webp (9 rectangles), roots/canopy.webp (9 rectangles), roots/heartwood.webp (9 rectangles), roots/lattice.webp (9 rectangles), roots/mangrove.webp (9 rectangles), roots/oak.webp (9 rectangles), roots/reed.webp (9 rectangles), roots/seed.webp (9 rectangles), roots/worldroot.webp (9 rectangles).
- strength: strength/anvil.webp (12 rectangles), strength/atlas.webp (12 rectangles), strength/colossus.webp (12 rectangles), strength/fault.webp (12 rectangles), strength/flywheel.webp (12 rectangles), strength/fulcrum.webp (12 rectangles), strength/piston.webp (12 rectangles), strength/ram.webp (12 rectangles), strength/striker.webp (12 rectangles).
- whirlwind: whirlwind/crosswind.webp (9 rectangles), whirlwind/eyewall.webp (9 rectangles), whirlwind/helix.webp (9 rectangles), whirlwind/jetstream.webp (9 rectangles), whirlwind/mistral.webp (9 rectangles), whirlwind/scythe.webp (9 rectangles), whirlwind/slipstream.webp (9 rectangles), whirlwind/tempest.webp (9 rectangles), whirlwind/venturi.webp (9 rectangles).
- superKick: superKick/crane.webp (9 rectangles), superKick/dragon.webp (9 rectangles), superKick/koi.webp (9 rectangles), superKick/mantis.webp (9 rectangles), superKick/pagoda.webp (9 rectangles), superKick/pivot.webp (9 rectangles), superKick/spar.webp (9 rectangles), superKick/tiger.webp (9 rectangles), superKick/wheel.webp (9 rectangles).
- speed: speed/apex.webp (9 rectangles), speed/horizon.webp (9 rectangles), speed/mach.webp (9 rectangles), speed/pulse.webp (9 rectangles), speed/relay.webp (9 rectangles), speed/starter.webp (9 rectangles), speed/switchback.webp (9 rectangles), speed/vector.webp (9 rectangles), speed/velodrome.webp (9 rectangles).
- agility: agility/afterimage.webp (9 rectangles), agility/flick.webp (9 rectangles), agility/kite.webp (9 rectangles), agility/lynx.webp (9 rectangles), agility/orbit.webp (9 rectangles), agility/parallax.webp (9 rectangles), agility/prism.webp (9 rectangles), agility/rook.webp (9 rectangles), agility/shutter.webp (9 rectangles).
- flight: flight/aurora.webp (9 rectangles), flight/firmament.webp (9 rectangles), flight/glider.webp (9 rectangles), flight/jet.webp (9 rectangles), flight/kestrel.webp (9 rectangles), flight/stratus.webp (9 rectangles), flight/swift.webp (9 rectangles), flight/vortex.webp (9 rectangles), flight/zenith.webp (9 rectangles).

Hair IDs: curls, locs, short, waves, ponytail, braids, none, short-locs, medium-locs, long-locs, high-loc-bun, half-up-locs, two-strand-twists, box-braids, knotless-braids, cornrows, braided-ponytail, bantu-knots, braided-updo, short-afro, medium-afro, large-afro, afro-puff, double-puffs, tapered-natural, tight-curls, shoulder-curls, long-curls, curly-ponytail, short-straight, bob, layered-bob, shoulder-straight, long-straight, long-wavy, side-waves, high-ponytail, low-ponytail, half-up, buzz, fade, high-top, taper-fade, textured-crop, curly-fade, side-part, pompadour, undercut, spiky.
Four-view replacement IDs: fade, high-top, high-ponytail, double-puffs, afro-puff, short-afro, medium-afro, high-loc-bun, braided-ponytail.
