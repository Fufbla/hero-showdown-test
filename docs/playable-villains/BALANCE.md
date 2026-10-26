# Competitive balance and moves

All twelve characters have **100 HP** for both humans and competitive CPU. Values below are nominal unblocked damage before combo scaling. Multi-hit and ground-zone values are total maximum damage per cast, not damage per tick. Blocking prevents competitive chip damage. Story and co-op rules are not changed.

| Fighter | HP | Punch | Heavy punch | Kick | Heavy kick | Shoot | Skill (total) | Special (total) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Super Summy | 100 | 6 | 10 | 8 | 12 | 7 | 12 | 18 |
| Super Sadie | 100 | 7 | 12 | 9 | 14 | 8 | 14 | 24 |
| Super Vee | 100 | 6 | 10 | 8 | 12 | 6 | 0 | 20 |
| Air Pollution Monster | 100 | 6 | 10 | 8 | 12 | 8 | 12 | 18 |
| Styrodog | 100 | 6 | 10 | 8 | 12 | 8 | 14 | 18 |
| Sonic Tusk | 100 | 6 | 10 | 8 | 12 | 8 | 14 | 22 |
| Venomis & Thornbear | 100 | 6 | 10 | 8 | 12 | 7 | 12 | 20 |
| Dr. Styro | 100 | 7 | 12 | 9 | 14 | 8 | 14 | 20 |
| Wastelander | 100 | 7 | 12 | 9 | 14 | 8 | 12 | 24 |
| AtomDust | 100 | 6 | 10 | 8 | 12 | 7 | 12 | 18 |
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
