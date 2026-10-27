# Competitive balance and moves

All twelve characters have **100 HP** for both humans and competitive CPU. Values below are nominal unblocked damage before combo scaling. Multi-hit and ground-zone values are total maximum damage per cast, not damage per tick. Blocking prevents competitive chip damage. Story and co-op rules are not changed.

| Fighter | HP | Punch | Heavy punch | Kick | Heavy kick | Shoot | Skill (total) | Special (total) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Super Summy | 100 | 6 | 10 | 8 | 12 | 7 | 12 | 18 |
| Super Sadie | 100 | 7 | 12 | 9 | 14 | 8 | 14 | 24 |
| Super Vee | 100 | 5 | 10 | 7 | 12 | 6 | 0 | 20 |
| Air Pollution Monster | 100 | 6 | 10 | 8 | 12 | 8 | 12 | 18 |
| Styrodog | 100 | 6 | 10 | 8 | 12 | 8 | 14 | 18 |
| Sonic Tusk | 100 | 6 | 10 | 8 | 12 | 8 | 14 | 22 |
| Venomis & Thornbear | 100 | 6 | 10 | 8 | 12 | 7 | 12 | 20 |
| Dr. Styro | 100 | 7 | 12 | 9 | 14 | 8 | 14 | 20 |
| Wastelander | 100 | 7 | 12 | 9 | 14 | 8 | 12 | 24 |
| AtomDust | 100 | 5 | 10 | 7 | 12 | 7 | 12 | 18 |
| Lightening Spree | 100 | 6 | 10 | 8 | 12 | 8 | 0 | 20 |
| Bushman | 100 | 6 | 11 | 8 | 12 | 8 | 14 | 22 |

Sweep: 10 HP. Uppercut: 12 HP. Tap Kick, Kick, Punch, Punch; a bounded queue preserves deliberate tap edges and cancels after hitstun, blocking, jumping, or a timeout. Consecutive normal attacks scale by 12% per hit down to a 55% floor. Four distinct hits force a knockdown with escape protection. These are initial tuning values, not a claim of tournament balance.

| Fighter | Shoot | Skill | Special | Additional behavior |
|---|---|---|---|---|
| Super Summy | Wind Gust | Gust Push | Earth Whirlwind | Wind projectile and knockback |
| Super Sadie | Rock Shard | Earth Smash | Rock Break | Rock impact and ground wave |
| Super Vee | Speed Spark | Quick Escape | Speed Blitz | Explicit evasive skill; five-hit blitz returns to its origin |
| Air Pollution Monster | Smoke Fist | Toxic Cloud | Smog Storm | Smoke punches, toxic cloud, three telegraphed storm areas with shared hit credit |
| Styrodog | Flying Foam | Foam Slam | Multihead Rush | Claws, heavy foam, foam ground wave, three-hit multihead rush |
| Sonic Tusk | Sonic Pulse | Bass Stomp | Horn Blast | Horn drive, sonic pulse, low bass wave and horn blast |
| Venomis & Thornbear | Plant Projectile | Vine Snare | Feral Bloom | Claws, plant shots and a telegraphed root snare; the pair shares one health bar |
| Dr. Styro | Foam Spike | Spike Bed | Double Trouble | Foam strikes and spikes; Double Trouble totals 20 HP (2 × 10) |
| Wastelander | Trash Cannon | Acid Spill | Mallet Crush | Trash shots, bounded acid pool, high-recovery mallet impact |
| AtomDust | Bottle Cap | Cigarette Smoke | Debris Barrage | Caps, cigarette debris/smoke and slow; manual dash grants 0.12 s evasion with 1.4 s cooldown. No automatic every-fourth-hit dodge |
| Lightening Spree | Light Bolt | Vanish / Teleport | Prism Beam | Crystal strikes, light projectile and beam; explicit teleport has 8 s cooldown and 2 s visual concealment, with only 0.12 s transition protection; attacking cancels concealment |
| Bushman | Fireball | Burning Ground | Crossed-arm Fire Blast | Fire punch/kick/fireball, bounded burning ground; four distinct connected unblocked punches/kicks/fireballs unlock a 22 HP crossed-arm blast. Burns and blocked hits never charge it |

Shoot cooldowns: 1.0–1.3 s. Skill cooldowns: generally 5 s, Vee 3 s, Lightening Spree 8 s. Specials: 5 s cooldown plus full meter; Bushman uses four-hit charge instead of meter. Activation consumes charge/meter even if interrupted. The CPU uses the exact same costs, startup, recovery, collision and hit rules.

All fighters have grounded movement, double jump, directional dash, normals, heavy attacks, block, recoil, knockdown/recovery, combo input and match outcome states. Villain visuals use their existing nearest authored poses for states without dedicated art; this feature does not manufacture new animation frames.


## Strengths, weaknesses and spacing (pause-guide update)

All fighters remain at 100 HP. Faster fighters exchange normal damage and reach for faster movement and recovery. Heavy fighters have higher normal damage but slower startup and recovery. Large bodies remain large targets; their attack reach now includes their own body width so the playable range reflects their size. CPU spacing uses the same attack definitions and target hurtbox widths. No difficulty stat boosts are added.

| Fighter | Role | Strength | Weakness |
|---|---|---|---|
| Super Summy | Mid-range controller | Long normal reach and strong Gust Push knockback. | Average speed; whirlwind travels slowly and can be blocked. |
| Super Sadie | Close-range powerhouse | High normal damage and hard knockdowns. | Shorter reach and slow heavy recovery; missed swings are punishable. |
| Super Vee | Fast rushdown | Fastest walk, quick normals and a three-second escape skill. | Lower normal damage and short reach; must get close to threaten. |
| Air Pollution Monster | Area controller | Long smoke punches and delayed cloud/storm control. | Large target, slow movement and slower projectile startup. |
| Styrodog | Advancing bruiser | Broad claw reach, foam knockdown and a multihead advancing special. | Wide hurtbox, modest projectile range and committed heavy recovery. |
| Sonic Tusk | Spacing specialist | Long normal reach and a far-travelling low bass wave. | Slow walking and clearly telegraphed horn blast. |
| Venomis & Thornbear | Trap specialist | Long claws and a vine snare that briefly roots opponents. | Very wide target; snare is delayed and can be escaped by jumping. |
| Dr. Styro | Heavy trap fighter | Powerful normals and a damaging spike trap. | Slow approach, long heavy recovery and delayed double strike. |
| Wastelander | Heavy punisher | Long mallet reach, strong normals and lingering acid. | Slowest walk, large target and long mallet recovery. |
| AtomDust | Evasive skirmisher | Fast walking, quick bottle caps and brief evasive dashes. | Lower normal damage, short reach and a longer dash cooldown. |
| Lightening Spree | Mobile beam fighter | Fast light shots, teleport and temporary concealment. | Eight-second teleport cooldown; beams are slow to start and recover. |
| Bushman | Momentum fighter | Fire attacks build a four-hit blast; burning ground controls space. | Blast must be earned with unblocked hits; burns do not charge it. |

| Fighter | Walk speed (units/s) | Punch reach beyond own body edge | Punch startup (s) | Punch recovery (s) | Heavy punch recovery (s) |
|---|---:|---:|---:|---:|---:|
| Super Summy | 300 | 110 | 0.11 | 0.23 | 0.36 |
| Super Sadie | 270 | 85 | 0.14 | 0.27 | 0.42 |
| Super Vee | 355 | 80 | 0.08 | 0.17 | 0.31 |
| Air Pollution Monster | 245 | 115 | 0.15 | 0.28 | 0.36 |
| Styrodog | 270 | 95 | 0.12 | 0.25 | 0.36 |
| Sonic Tusk | 250 | 120 | 0.14 | 0.26 | 0.36 |
| Venomis & Thornbear | 250 | 120 | 0.15 | 0.28 | 0.36 |
| Dr. Styro | 240 | 100 | 0.16 | 0.29 | 0.42 |
| Wastelander | 230 | 105 | 0.17 | 0.3 | 0.42 |
| AtomDust | 325 | 80 | 0.085 | 0.19 | 0.31 |
| Lightening Spree | 290 | 95 | 0.12 | 0.25 | 0.36 |
| Bushman | 295 | 90 | 0.11 | 0.23 | 0.36 |

These are initial competitive archetypes, not proof of equal matchup win rates. Human matchup and device playtesting remains necessary. The pause guide reads live definitions, so damage, startup, recovery and cooldown displays stay in sync with gameplay.
