# Phase 9 review build — vertical adventures

Built on Phase 8 (`5cfe1a5c80648ea1f66e76fb780119e9c7caa541`) exclusively inside `royale/` on `feature/showdown-royale`. No Phase 10 work. The required vertical platform expansion and wounded-monster behavior are implemented and tested. Final canonical artwork approval and physical-device performance certification remain unfinished; this is a review build, not a claim that every requested graphic is final.

## Play and review

Launch from the repository root with `python3 royale/serve.py`, then open `http://localhost:8000/royale/`. Add `--lan` to test a phone on the same Wi-Fi. No dependencies or authentication deployment are required for browser-local play.

From **My Heroes → Phase 9 art & vertical exploration review**, open the [review gallery](tests/showcase.html). It contains actual before/after coastal screenshots, seven route overviews, all 21 monsters, customized bodies, eight Merge costumes in front/back views, and all 15 boss presentations. The gallery links to isolated practice pages; these do not alter real heroes or their Legendary records.

- **Seven-region practice:** choose any region and Ground camp, Tier 1–4, encounters or arena entrance; press Load. Select a day/night fixture to check instant transitions. Normal portals remain free and unrestricted; active combat/boss restrictions remain.
- **Movement & combat animations:** inspect idle, walking, running, jumps, falling, landing, ground/aerial attacks, hurt, defeat, respawn and all nine power poses.
- **Nine powers:** use the existing power lab to change levels and combinations. Ground Roots, Whirlwind, straight Fireballs and all cooldown/damage rules are unchanged.
- **Regional / Legendary practice:** all seven regional encounters and eight Legendary encounters remain available in disposable fixtures. Actual saves still require Level 99 for Legendary entry.
- **Wardrobe & equipment:** inspect starter colors, fixed equipment colors, constant rare white/Legendary green glow, complete/mixed suits and the fourth slot.

Normal controls are unchanged: A/D or arrows move, Shift runs, Space jumps/double-jumps, J punches, K kicks, 1/2/3 use powers, H uses a Health Root, E uses a passage. **Down + Jump** drops through the current one-way platform. Use the configured controller Down/Jump inputs or drag the mobile stick downward while pressing Jump. Flight is optional; no dash was added.

## Seven regions, five traversable height levels

Each region has ground at world Y=600 plus elevated tiers at Y=480, 320, 160 and 0: 120, 280, 440 and 600 units above ground. Three staggered climbing circuits span the connected boards. Each circuit has four main ledges and two branching ledges, rather than one vertical stack. Every required rise is at most 160 units; approved jump velocity, gravity, air control and double jump are unchanged. All 84 main ascent segments pass simulated traversal without Flight.

Each region has 24 configured regular monster homes: six on ground and eighteen distributed across the elevated network. Spawn identity for the original 17 monsters is preserved. All four elevated tiers have encounters; the additional side routes have enemies too. Ground monsters stay on valid surfaces, including pounces and elevated respawns. Flying monsters can track vertically. Rendering culls offscreen enemies, while their small bounded simulation remains deterministic.

| Region | Distinct scenery | Regular monsters |
|---|---|---|
| Coastal Beginnings | Ocean, cliffs, foliage, boardwalk braces | Bottle Critters, Trash Slimes, Sand Crawlers |
| Polluted Forest | Layered trunks, canopies, roots | Thorn Sprouts, Toxic Mushrooms, Bark Crawlers |
| Industrial Wasteland | Factory silhouettes, pipes, steel ledges | Scrap Crawlers, Sludge Beasts, Rust Drones |
| Toxic Underground | Cavern facets, crystals, rock ledges | Cave Scorpions, Acid Beetles, Venom Crawlers |
| Mutated Territories | Twisted trees, ruins, violet vegetation | Thorn Beasts, Mutant Stalkers, Poison Spitters |
| Dark Energy Realm | Suspended debris and luminous formations | Shadow Wisps, Energy Phantoms, Dark Sentinels |
| Final Showdown | Ruined structures and polluted terrain | Apocalypse Mutants, Corrupted Guardians, Pollution Titans |

The camera uses horizontal smoothing and a vertical dead zone. It tracks the highest platforms, Flight and long falls; arena framing remains separate. Swept landing collision, coyote time and buffered jumps remain. A short per-platform drop-through exemption prevents immediate relanding without disabling all collision.

## Wounded monsters

At **50% HP or below**, regular monsters become desperate. Their health bar turns amber and they continue tracking, approaching and using normal attacks on reachable surfaces. The threshold itself changes neither position nor damage. It causes no retreat, teleport, regeneration, extra maximum HP or attack-timer reset.

Ordinary hits give a brief 45 ms visual pause with a 550 ms refractory window; repeated basic hits cannot continually restart an attack. Intentional attack recovery remains. Super Strength and applicable Merge attacks retain their deliberate pushback. Ground Roots still immobilizes valid grounded regular targets; Whirlwind still lifts and releases them under gravity. Bosses use their existing three-phase state machines, independently of desperation. Night damage and rewards remain separate and unchanged.

## Artwork, animation and rendering

- Layered custom hero artwork now has shaped limbs/fists, connected joints, costume seams, face/hair shading and steel highlights. Appearance does not change hitboxes, reach or stats.
- The existing shared articulated rig and planted-foot IK remain; rendering interpolates movement and attack poses. Agility adds a cosmetic evade reaction. All bodies share consistent animation logic.
- An eight-segment damped cape responds to acceleration, jumping, landing and attacks, keeps its standard length and stays cosmetic.
- The 21 regular species use distinct native canvas drawings and cached 12-frame atlases, with improved silhouettes, connected appendages, attack warnings, hit reactions, short collapse/fade and health bars positioned above their actual artwork.
- Seven environment styles use cached layered parallax and readable platform edges. Grounded root squeezing, Fireball trails, restrained electricity and a less opaque tornado preserve combat readability.
- Existing approved villain sheets remain byte-for-byte unchanged. Display-sized frame extraction, shared alias caches and a short frame blend improve reuse. Giant Scorpion retains its front-facing eight-leg connected rig.
- Comic-style panels, focus outlines and responsive controls retain always-visible HP/XP, coins, Roots, three normal powers and the conditional fourth power. No floating damage text, numerical cooldowns or minimap were added.

Caches are bounded: six monster atlases, two environment states, 48 terrain textures, three boss frame sets and a 96-particle pool. Boss art loads near arena entrances instead of at every regional arrival. Paused/static menu backgrounds redraw only when needed. These changes reduce work; measured FPS is reported separately and does not establish a 60 FPS guarantee.

## Preserved progression and limitations

Save schema, ownership, permanent Legendary ledger, local slots, appearance, level/XP, powers, equipment, currency, Roots, checkpoints and portal access remain unchanged. Exact elevated coordinates round-trip. Legacy platforms were replaced by the new network; a hero saved in now-empty air keeps that position and settles using normal gravity. The clock continues during menus and closure. Manual save and combat restrictions remain. Supabase configuration/backend deployment is untouched and still unfinished.

Missing references prevent a complete canonical graphics sign-off:

- Trash Monster and Ultimate Pollution Boss retain clearly marked temporary art.
- The supplied-in-design Super Vee × Lightning Spree, Super Summy × Air Pollution Monster and Super Sadie × Styrodog illustrations are absent from this repository. All eight adaptive Merge motif designs remain provisional, including refined seams/shading. No fixed Healthia hero replaces the customized player.
- Decorative Legendary skeletal remains remain the existing provisional native drawings.
- Physical iPhone, Android, tablet and controller testing, Safari/Firefox testing, sustained frame-rate verification and long-session visual/AI review remain required.

See [PHASE9-VALIDATION.md](PHASE9-VALIDATION.md) for measured results, evidence and remaining checks.
