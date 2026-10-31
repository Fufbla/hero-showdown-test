// shared-clock.mjs
var sync = null;
function sharedNow() {
  return sync ? sync.serverTime + Math.max(0, performance.now() - sync.receivedAt) : Date.now();
}

// boss-data.mjs
var ARENA = Object.freeze({ left: 180, right: 1800, heroX: 420, bossX: 1180, floor: 600, chestX: 1060, waveDelay: 12, waveWarning: 2, waveLimit: 3, helpersPerWave: 3 });
var BOSS_MOVEMENT = Object.freeze({
  1: { approach: 145, retreat: 0, style: "trudge" },
  2: { approach: 205, retreat: 0, style: "weave" },
  3: { approach: 135, retreat: 0, style: "heavy" },
  4: { approach: 180, retreat: 110, style: "scuttle" },
  5: { approach: 300, retreat: 190, style: "keep-distance" },
  6: { approach: 285, retreat: 165, style: "drift" },
  7: { approach: 125, retreat: 0, style: "pursue" }
});
var boss = (region, name, level, hp, damage, speed, helper, patterns, art) => ({ region, name, level, hp, damage, speed, helper, patterns, art, xp: [0, 250, 800, 2200, 4500, 8500, 15e3, 28e3][region] });
var BOSSES = Object.freeze({
  1: boss(1, "Trash Monster", 10, 950, 18, 42, "slime", [["swipe", "throw"], ["throw", "slam", "swipe"], ["slam", "throw", "swipe", "slam"]], "temporary"),
  2: boss(2, "Bushman", 20, 2600, 32, 55, "sprout", [["vine", "swipe"], ["thorns", "branch", "vine"], ["roots", "thorns", "branch"]], "approved"),
  3: boss(3, "Wastelander", 35, 6e3, 52, 44, "scrap", [["punch", "toxic"], ["shockwave", "slam", "toxic"], ["hazard", "shockwave", "punch"]], "approved"),
  4: boss(4, "Giant Scorpion", 50, 11e3, 82, 48, "scorpion", [["claw", "sting"], ["clawCombo", "stingPattern", "claw"], ["stingPattern", "clawCombo", "sting"]], "approved"),
  5: boss(5, "Venomis", 65, 18e3, 120, 66, "stalker", [["thorns", "vine"], ["poison", "vineCombo", "thorns"], ["roots", "poison", "vineCombo"]], "approved"),
  6: boss(6, "AtomDust", 80, 28e3, 175, 60, "phantom", [["blast"], ["expansion", "debris", "blast"], ["atomic", "debris", "expansion"]], "approved"),
  7: boss(7, "Ultimate Pollution Boss", 99, 42e3, 235, 74, "apocalypse", [["pollution", "punch"], ["environment", "slam", "pollution"], ["cataclysm", "environment", "pollution"]], "temporary")
});
var a = (label, shape, warning, duration, recovery, damage = 1, extra = {}) => ({ label, shape, warning, duration, recovery, damage, ...extra });
var BOSS_ATTACKS = Object.freeze({
  swipe: a("Heavy swipe", "melee", 0.95, 0.25, 1.25, 1, { reach: 165 }),
  throw: a("Trash throw", "projectile", 1, 0.25, 1.35, 1, { speed: 170, count: 1, color: "#c9aa6e" }),
  slam: a("Ground slam \xB7 jump", "ground", 1.2, 0.3, 1.45, 1.25, { width: 240 }),
  vine: a("Vine strike", "melee", 0.95, 0.3, 1.1, 1, { reach: 220 }),
  thorns: a("Thorn volley", "projectile", 1.1, 0.35, 1.2, 0.8, { speed: 220, count: 3, color: "#729044" }),
  branch: a("Sweeping branches \xB7 jump", "sweep", 1.15, 0.4, 1.3, 1.15, { reach: 290 }),
  roots: a("Rising roots \xB7 move away", "ground", 1.3, 0.45, 1.4, 1.3, { width: 160, spots: 2 }),
  punch: a("Heavy punch", "melee", 0.95, 0.25, 1.2, 1.15, { reach: 170 }),
  toxic: a("Toxic shot", "projectile", 1.1, 0.3, 1.25, 1, { speed: 210, count: 1, color: "#bed465" }),
  shockwave: a("Toxic shockwave \xB7 jump", "wave", 1.2, 0.4, 1.4, 1.15, { speed: 270 }),
  hazard: a("Toxic ground \xB7 move away", "ground", 1.3, 0.5, 1.5, 1.35, { width: 160, spots: 3 }),
  claw: a("Claw strike", "melee", 1, 0.35, 1.3, 1, { reach: 230 }),
  sting: a("Stinger \xB7 leave the marker", "ground", 1.3, 0.35, 1.45, 1.3, { width: 140 }),
  clawCombo: a("Twin claw sweep \xB7 jump", "sweep", 0.95, 0.5, 1.2, 1.15, { reach: 310 }),
  stingPattern: a("Heavy stinger \xB7 move", "ground", 1.15, 0.55, 1.3, 1.4, { width: 150, spots: 1 }),
  poison: a("Poison fan", "projectile", 1, 0.35, 1.1, 1, { speed: 250, count: 3, color: "#bd77cf" }),
  vineCombo: a("Sweeping vine combination \xB7 jump", "sweep", 1, 0.55, 1.1, 1.25, { reach: 330 }),
  blast: a("Concentrated energy", "projectile", 1.1, 0.25, 1.3, 1, { speed: 295, count: 1, color: "#e8ce78" }),
  expansion: a("Expanding energy \xB7 jump", "wave", 1.2, 0.5, 1.3, 1.15, { speed: 300 }),
  debris: a("Falling debris \xB7 leave the markers", "fall", 1.25, 0.45, 1.35, 1.2, { spots: 3, width: 100 }),
  atomic: a("Atomic shockwaves \xB7 jump", "wave", 1.25, 0.6, 1.4, 1.35, { speed: 340, double: true }),
  pollution: a("Pollution barrage", "projectile", 1.05, 0.35, 1.1, 1, { speed: 265, count: 3, color: "#97b76b" }),
  environment: a("Pollution fallout \xB7 move", "fall", 1.2, 0.6, 1.25, 1.3, { spots: 3, width: 120 }),
  cataclysm: a("Pollution shockwaves \xB7 jump", "wave", 1.2, 0.65, 1.25, 1.45, { speed: 360, double: true })
});
var bossPhase = (ratio) => ratio > 0.5 ? 1 : ratio > 0.2 ? 2 : 3;
function attackFor(b, kind) {
  const base = BOSS_ATTACKS[kind];
  return { ...base, kind, warning: Math.max(0.65, base.warning * [1, 1, 0.92, 0.85][b.phase]), recovery: base.recovery * [1, 1, 0.88, 0.8][b.phase] };
}

// costume-catalog.mjs
var COSTUME_PARTS = ["helmet", "chest", "boots"];
var COSTUME_WEIGHTS = Object.freeze({ helmet: 0.33, chest: 0.33, boots: 0.34 });
var STAT_KEYS = ["strength", "damage", "defense", "moveSpeed", "attackSpeed", "fireball", "roots", "whirlwind"];
var LEGENDARY_POLICY = Object.freeze({ enabled: true, rarity: "legendary", glow: "#65ff7a", sellable: false, requiredPieces: 3, fourthSlot: 3, cooldownMultiplier: 0.5, discardIsPermanent: true, reearnable: false });
var rows = [
  ["shore", "Shore Guardian", 1, 1, "#368a89", "#edc77d", "wave"],
  ["beacon", "Beacon Knight", 10, 1, "#365d87", "#f0d8a0", "shield"],
  ["briar", "Briar Warden", 20, 2, "#557c4b", "#d9b99a", "leaf"],
  ["foundry", "Foundry Sentinel", 30, 3, "#637b8c", "#e8a46f", "bolt"],
  ["cavern", "Cavern Ranger", 40, 4, "#765990", "#c7e3a4", "star"],
  ["crystal", "Crystal Keeper", 50, 4, "#3f8b94", "#d4e9ee", "shield"],
  ["wild", "Wild Protector", 60, 5, "#956b88", "#efd58d", "leaf"],
  ["aether", "Aether Watcher", 70, 6, "#5969a7", "#c7bce5", "sun"],
  ["nova", "Nova Defender", 80, 6, "#ba7650", "#eee3ae", "bolt"],
  ["vanguard", "Vanguard Hero", 90, 7, "#a95b59", "#ecd493", "star"],
  ["horizon", "Horizon Champion", 99, 7, "#334d66", "#f4d790", "sun"]
];
var rounded = (n) => Number(n.toFixed(4));
var COSTUME_SETS = Object.freeze(Object.fromEntries(rows.map(([id, name, level, region, color, accent, emblem], index) => {
  const value = 150 + index * 210, stats = { strength: 6 + index * 4, damage: 3 + index * 2, defense: rounded(0.025 + index * 0.012), moveSpeed: rounded(0.02 + index * 8e-3), attackSpeed: rounded(0.015 + index * 9e-3), fireball: 3 + index * 3, roots: rounded(index * 0.6), whirlwind: rounded(index * 0.8) };
  return [id, { id, name, level, region, color, accent, emblem, value, stats }];
})));
var COSTUME_CATALOG = Object.freeze(Object.fromEntries(Object.values(COSTUME_SETS).flatMap((set) => ["ordinary", ...set.region >= 4 ? ["rare"] : []].flatMap((rarity) => COSTUME_PARTS.map((part, index) => {
  const rare = rarity === "rare", id = `eris-${set.id}-${rarity}-${part}`, weight = COSTUME_WEIGHTS[part], value = part === "boots" ? set.value - 2 * Math.floor(set.value * 0.33) : Math.floor(set.value * 0.33);
  return [id, { id, setId: `${set.id}-${rarity}`, setName: `${rare ? "Radiant " : ""}${set.name}`, name: `${rare ? "Radiant " : ""}${set.name} ${part === "chest" ? "Chest Piece" : part === "helmet" ? "Helmet" : "Boots"}`, part, region: set.region, rarity, level: set.level, color: set.color, accent: set.accent, emblem: set.emblem, style: index, weight, catalogValue: rare ? value * 2 : value, shop: !rare, sellable: true, stats: Object.fromEntries(STAT_KEYS.map((k) => {
    const total = rounded(set.stats[k] * (rare ? 1.35 : 1)), third = rounded(total * 0.33);
    return [k, part === "boots" ? rounded(total - 2 * third) : third];
  })) }];
})))));
var DROP_SETS = { 1: "shore", 2: "briar", 3: "foundry", 4: "cavern", 5: "wild", 6: "aether", 7: "vanguard" };
function costumeDrop(region, rarity, index, serial) {
  if (rarity === "rare" && region < 4) return null;
  const set = DROP_SETS[region];
  const catalogId = `eris-${set}-${rarity}-${COSTUME_PARTS[Math.abs(Math.floor(index)) % 3]}`;
  return COSTUME_CATALOG[catalogId] ? { uid: `drop-${serial}`, catalogId } : null;
}
var resaleValue = (def) => def?.rarity === "legendary" || def?.sellable === false ? null : Math.floor((def?.catalogValue || 0) * 0.25);

// legendary-data.mjs
var LEGENDARY_HP = () => BOSSES[7].hp * 3;
var LEGENDARY_IDS = ["lightning", "air", "styrodog", "sonic", "styro", "wastelander", "venomis", "atomdust"];
var row = (id, name, arena, region, damage, speed, helper, style, patterns, colors, stats) => ({ id, name, arena, region, damage, speed, helper, style, patterns, colors, stats, level: 99, art: "approved" });
var LEGENDARY = Object.freeze(Object.fromEntries([
  row("lightning", "Lightning Spree", "Storm Fortress", 6, 220, 85, "wisp", "crystal", [["lightningStrike", "crystalBeam"], ["chainLightning", "conductive", "lightningStrike"], ["lightningStorm", "chainLightning", "conductive"]], ["#6258ad", "#f0d677"], [38, 18, 0.1, 0.12, 0.1, 30, 4, 6]),
  row("air", "Air Pollution Monster", "Toxic Sky", 3, 205, 95, "wisp", "hover", [["smog", "pollutionClaw"], ["gust", "cloud", "smog"], ["smogTornado", "gust", "cloud"]], ["#45515a", "#e7954a"], [25, 16, 0.13, 0.09, 0.06, 24, 10, 20]),
  row("styrodog", "Styrodog", "Styrofoam Wasteland", 3, 235, 120, "scrap", "beast", [["beastClaw", "lunge"], ["leap", "beastCombo", "lunge"], ["beastCharge", "leap", "beastCombo"]], ["#c7c6bd", "#4d5155"], [64, 32, 0.12, 0.1, 0.12, 8, 0, 3]),
  row("sonic", "Sonic Tusk", "Echoing Caverns", 4, 225, 95, "crawler", "tusk", [["sonicShot", "tuskStrike"], ["sonicRing", "tuskCharge", "sonicShot"], ["sonicOverlap", "tuskCombo", "sonicRing"]], ["#806184", "#dcca9a"], [48, 26, 0.15, 0.04, 0.09, 18, 4, 12]),
  row("styro", "Dr. Styro", "Abandoned Laboratory", 3, 210, 63, "drone", "scientist", [["styroBounce", "styroShot"], ["styroWall", "machineTrap", "styroBounce"], ["machinery", "styroVolley", "machineTrap"]], ["#deded0", "#6b9790"], [24, 14, 0.22, 0.03, 0.05, 36, 8, 8]),
  row("wastelander", "Wastelander", "Toxic Ruins", 3, 240, 72, "scrap", "heavy", [["legendPunch", "toxicShot"], ["toxicRing", "legendSlam", "legendPunch"], ["toxicGround", "toxicCombo", "legendSlam"]], ["#426f63", "#c4ad79"], [58, 30, 0.18, 0.02, 0.06, 10, 10, 5]),
  row("venomis", "Venomis", "Poison Garden", 5, 210, 90, "stalker", "scientist", [["thornShot", "legendVine"], ["poisonPatch", "thornSweep", "vinePair"], ["vineField", "poisonFan", "vinePair"]], ["#e0dfcc", "#5eb779"], [29, 16, 0.1, 0.07, 0.13, 28, 15, 4]),
  row("atomdust", "AtomDust", "Atomic Core", 6, 245, 78, "phantom", "reactor", [["atomicShot", "atomicPulse"], ["atomicRing", "radioactiveFall", "atomicShot"], ["atomicStorm", "atomicVolley", "atomicRing"]], ["#c1a455", "#e5e2d2"], [42, 23, 0.16, 0.03, 0.07, 60, 6, 14])
].map((d) => [d.id, d])));
var attack = (label, shape, warning, duration, recovery, damage = 1, extra = {}) => ({ label, shape, warning, duration, recovery, damage, ...extra });
var LEGENDARY_ATTACKS = Object.freeze({
  lightningStrike: attack("Lightning \xB7 leave the yellow marker", "lightning", 1.5, 0.22, 1.45, 1, { width: 150 }),
  crystalBeam: attack("Crystal beam \xB7 jump or move", "projectile", 1.35, 0.25, 1.35, 0.85, { speed: 330, count: 1, color: "#f1d779" }),
  chainLightning: attack("Chain lightning \xB7 clear the marked ground", "lightning", 1.5, 0.6, 1.45, 1.1, { width: 185, chain: true }),
  conductive: attack("Conductive ground \xB7 leave the yellow area", "lightning", 1.65, 1.2, 1.5, 1.05, { width: 220, hazard: true }),
  lightningStorm: attack("Storm strike \xB7 move out of the yellow area", "lightning", 1.8, 0.55, 1.55, 1.35, { width: 245, chain: true }),
  smog: attack("Slow smog \xB7 watch its path", "projectile", 1.2, 0.3, 1.35, 0.85, { speed: 175, count: 2, color: "#809689" }),
  pollutionClaw: attack("Pollution claws \xB7 step back", "melee", 1.1, 0.3, 1.4, 1, { reach: 200 }),
  gust: attack("Wind gust \xB7 jump", "wave", 1.3, 0.4, 1.45, 1, { speed: 330 }),
  cloud: attack("Toxic cloud \xB7 leave its path", "cloud", 1.4, 0.4, 1.5, 1, { width: 155, life: 3 }),
  smogTornado: attack("Pollution tornado \xB7 move away", "tornado", 1.65, 0.6, 1.6, 1.25, { width: 150, life: 3 }),
  beastClaw: attack("Three-headed claw swipe", "melee", 1.05, 0.35, 1.4, 1, { reach: 185 }),
  lunge: attack("Forward lunge \xB7 jump or retreat", "charge", 1.2, 0.58, 1.5, 1, { speed: 380, reach: 240 }),
  leap: attack("Leaping impact \xB7 leave the landing zone", "leap", 1.5, 0.85, 1.65, 1.25, { width: 200 }),
  beastCombo: attack("Claw combination \xB7 stay clear", "melee", 1.15, 0.65, 1.5, 1.15, { reach: 230 }),
  beastCharge: attack("Beast charge \xB7 jump", "charge", 1.45, 0.8, 1.7, 1.3, { speed: 460, reach: 360 }),
  sonicShot: attack("Sonic blast \xB7 jump", "projectile", 1.3, 0.3, 1.4, 1, { speed: 315, count: 1, color: "#c6aad6" }),
  tuskStrike: attack("Tusk strike \xB7 step back", "melee", 1.2, 0.35, 1.45, 1.1, { reach: 210 }),
  sonicRing: attack("Expanding sound \xB7 jump", "wave", 1.4, 0.45, 1.5, 1.1, { speed: 285 }),
  tuskCharge: attack("Tusk charge \xB7 jump", "charge", 1.45, 0.7, 1.7, 1.2, { speed: 370, reach: 300 }),
  sonicOverlap: attack("Layered sound waves \xB7 time your jump", "wave", 1.65, 0.6, 1.8, 1.25, { speed: 340, double: true }),
  tuskCombo: attack("Tusk combination \xB7 retreat", "melee", 1.25, 0.65, 1.55, 1.2, { reach: 265 }),
  styroBounce: attack("Bouncing foam \xB7 watch the arc", "bounce", 1.3, 0.3, 1.5, 0.85, { speed: 240, count: 2, color: "#e9e5d0" }),
  styroShot: attack("Styrofoam shot", "projectile", 1.15, 0.25, 1.35, 0.85, { speed: 260, count: 1, color: "#e9e5d0" }),
  styroWall: attack("Foam barrier \xB7 attacks reduced briefly", "barrier", 1.35, 2.4, 1.6, 0, { width: 155 }),
  machineTrap: attack("Mechanical trap \xB7 leave the marker", "trap", 1.5, 0.4, 1.55, 1.1, { width: 145, spots: 2, life: 2 }),
  machinery: attack("Laboratory crushers \xB7 leave the markers", "fall", 1.8, 0.5, 1.75, 1.3, { width: 110, spots: 3 }),
  styroVolley: attack("Bouncing foam volley", "bounce", 1.4, 0.5, 1.5, 1, { speed: 300, count: 3, color: "#e9e5d0" }),
  legendPunch: attack("Heavy punch \xB7 step back", "melee", 1.15, 0.3, 1.5, 1.1, { reach: 190 }),
  toxicShot: attack("Toxic projectile", "projectile", 1.25, 0.3, 1.4, 0.9, { speed: 270, count: 1, color: "#bdd26b" }),
  toxicRing: attack("Expanding toxic shockwave \xB7 jump", "wave", 1.45, 0.4, 1.5, 1.1, { speed: 290 }),
  legendSlam: attack("Heavy ground slam \xB7 jump", "ground", 1.5, 0.4, 1.6, 1.25, { width: 260 }),
  toxicGround: attack("Toxic ground \xB7 leave the markers", "trap", 1.7, 0.4, 1.7, 1.2, { width: 145, spots: 3, life: 2.5 }),
  toxicCombo: attack("Toxic combination \xB7 jump", "wave", 1.5, 0.55, 1.6, 1.2, { speed: 330, double: true }),
  thornShot: attack("Thorn volley", "projectile", 1.2, 0.3, 1.35, 0.9, { speed: 285, count: 3, color: "#91b873" }),
  legendVine: attack("Vine strike \xB7 step back", "melee", 1.15, 0.35, 1.4, 1, { reach: 245 }),
  poisonPatch: attack("Poison patch \xB7 leave the marker", "trap", 1.5, 0.4, 1.5, 1.05, { width: 170, life: 3 }),
  thornSweep: attack("Sweeping thorns \xB7 jump", "sweep", 1.4, 0.45, 1.55, 1.15, { reach: 320 }),
  vinePair: attack("Sweeping vine combination \xB7 jump", "sweep", 1.3, 0.6, 1.55, 1.15, { reach: 345 }),
  vineField: attack("Rising vines \xB7 leave the markers", "ground", 1.7, 0.6, 1.7, 1.3, { width: 130, spots: 3 }),
  poisonFan: attack("Poison fan \xB7 find a gap", "projectile", 1.45, 0.4, 1.55, 1, { speed: 310, count: 5, color: "#a16da8" }),
  atomicShot: attack("Concentrated atomic blast", "projectile", 1.3, 0.3, 1.45, 1, { speed: 335, count: 1, color: "#ebd078" }),
  atomicPulse: attack("Atomic pulse \xB7 jump", "wave", 1.45, 0.4, 1.55, 1.05, { speed: 260 }),
  atomicRing: attack("Expanding energy rings \xB7 jump", "wave", 1.5, 0.5, 1.55, 1.15, { speed: 315, double: true }),
  radioactiveFall: attack("Radioactive debris \xB7 leave the markers", "fall", 1.65, 0.5, 1.6, 1.1, { width: 110, spots: 3 }),
  atomicStorm: attack("Atomic shockwave \xB7 time your jump", "wave", 1.8, 0.65, 1.8, 1.35, { speed: 360, double: true }),
  atomicVolley: attack("Atomic fan \xB7 find a gap", "projectile", 1.5, 0.45, 1.6, 1.1, { speed: 350, count: 3, color: "#f0c36b" })
});
var MERGE_POWERS = Object.freeze({
  lightning: { name: "Lightning Strike", icon: "\u03DF", cooldown: 14, damage: 950, delay: 0.45, radius: 90, offensive: true, summary: "One marked strike 220 units forward; hits enemies within 90 units." },
  air: { name: "Toxic Tornado", icon: "\u224B", cooldown: 24, damage: 220, duration: 3, radius: 100, after: true, offensive: true, summary: "A moving three-second vortex. Ticks each second; lifts regular enemies, never bosses." },
  styrodog: { name: "Beast Charge", icon: "\u27A4", cooldown: 16, damage: 1050, duration: 0.6, speed: 480, after: true, offensive: true, summary: "Grounded forward charge. Collides normally; hits each enemy once. No invulnerability." },
  sonic: { name: "Sonic Blast", icon: "\u25C9", cooldown: 12, damage: 800, speed: 640, offensive: true, summary: "A straight piercing sonic projectile; up to eight enemies with physical pushback." },
  styro: { name: "Styro Barrier", icon: "\u2B21", cooldown: 24, absorb: 650, duration: 6, after: true, offensive: false, summary: "Absorb up to 650 incoming damage for six seconds after normal defense reductions." },
  wastelander: { name: "Toxic Shockwave", icon: "\u2301", cooldown: 18, damage: 900, speed: 420, offensive: true, summary: "Two ground waves travel in opposite directions. Airborne enemies can evade them." },
  venomis: { name: "Poison Vines", icon: "\u2667", cooldown: 20, damage: 210, duration: 4, targets: 5, after: true, offensive: true, summary: "Four squeezing ticks on up to five grounded foes. Bosses attack normally at half movement speed." },
  atomdust: { name: "Atomic Burst", icon: "\u2727", cooldown: 20, damage: 1250, delay: 0.65, radius: 240, offensive: true, summary: "A delayed radial burst around your position; hits every enemy inside 240 units once." }
});
var MERGE_CATALOG = Object.freeze(Object.fromEntries(LEGENDARY_IDS.flatMap((id) => ["helmet", "chest", "boots"].map((part, i) => {
  const d = LEGENDARY[id], catalogId = `merge-${id}-${part}`, stats = Object.fromEntries(STAT_KEYS.map((k, n) => {
    const third = +(d.stats[n] * 0.33).toFixed(4);
    return [k, i === 2 ? +(d.stats[n] - third * 2).toFixed(4) : third];
  }));
  return [catalogId, { id: catalogId, setId: `legendary-${id}`, mergeId: id, setName: `${d.name} Merge`, name: `${d.name} ${part === "chest" ? "Chest Piece" : part === "helmet" ? "Helmet" : "Boots"}`, part, region: d.region, rarity: "legendary", level: 99, color: d.colors[0], accent: d.colors[1], emblem: id === "venomis" ? "leaf" : id === "lightning" ? "bolt" : "star", catalogValue: 0, shop: false, sellable: false, stats }];
}))));

// progression.mjs
var PROGRESSION = Object.freeze({ cap: 99, base: 50, linear: 28, quadratic: 4, lateStart: 69, lateSpan: 29, lateWeight: 3, defeatFraction: 0.1, combatGrace: 5 });
function xpForLevel(level, curve = PROGRESSION) {
  const l = Math.max(1, Math.min(curve.cap, Math.floor(level) || 1)), n = l - 1;
  return Math.round((curve.base + curve.linear * n + curve.quadratic * n * n) * (1 + curve.lateWeight * (Math.max(0, l - curve.lateStart) / curve.lateSpan) ** 2));
}
var maximumHP = (level) => 100 + 15 * (level - 1);
function xpMultiplier(heroLevel, monsterLevel) {
  const gap = heroLevel - monsterLevel;
  return gap <= 3 ? 1 : gap <= 6 ? 0.75 : gap <= 10 ? 0.35 : gap <= 15 ? 0.1 : 0;
}
var monsterXP = (base, heroLevel, monsterLevel) => Math.max(0, Math.floor(base * xpMultiplier(heroLevel, monsterLevel)));
var CLOCK = Object.freeze({ day: 30 * 60 * 1e3, night: 10 * 60 * 1e3 });
function worldClock(reference, now = Date.now(), region = 1) {
  if (region <= 2) return { night: false, remaining: null, phase: "Permanent day" };
  const phase = Math.max(0, now - reference) % (CLOCK.day + CLOCK.night), night = phase >= CLOCK.day;
  return { night, remaining: Math.ceil(((night ? CLOCK.day + CLOCK.night : CLOCK.day) - phase) / 1e3), phase: night ? "Night" : "Day" };
}
var LOOT = Object.freeze({ rootChance: 0.1, rootPrice: 50, rootLimit: 4, ordinaryChance: 0.12, rareChance: [0, 0, 0, 0, 0.07, 0.08, 0.09, 0.1], inventoryLimit: 7 });
var RESPAWN = Object.freeze({ common: 18, strong: 36, elite: 150, safeDistance: 160 });
function bossVictory(world, region) {
  if (!Number.isInteger(region) || region < 1 || region > 7 || !world.unlocked.includes(region)) return { ok: false };
  const first = !world.bossVictories.includes(region);
  if (first) world.bossVictories.push(region);
  if (region < 7 && !world.unlocked.includes(region + 1)) world.unlocked.push(region + 1);
  return { ok: true, first, coins: first ? 100 : 10 };
}

// appearance.mjs
var APPEARANCE_VERSION = 2;
var EMBLEMS = ["leaf", "bolt", "shield", "star", "wave", "sun"];
var HAIR_STYLES = ["curls", "locs", "short", "waves", "ponytail", "braids", "none"];
var DEFAULT_LOOK = Object.freeze({
  version: APPEARANCE_VERSION,
  name: "Coast Guardian",
  presentation: "male",
  age: "young",
  skin: "#a96943",
  eyes: "#65452e",
  hair: "curls",
  hairColor: "#2c2630",
  face: "oval",
  eyeShape: "almond",
  brows: "soft",
  nose: "straight",
  mouth: "smile",
  facialHair: "none",
  build: "balanced",
  height: 1,
  shoulders: 1,
  muscle: 0.35,
  torso: 1,
  arms: 1,
  legs: 1,
  suit: "#247e69",
  trim: "#ffe0a0",
  emblemColor: "#ffe0a0",
  emblem: "leaf",
  capeColor: "#194e4c",
  cape: true
});
var LOOK_OPTIONS = Object.freeze({
  presentation: ["male", "female"],
  age: ["teen", "young", "older"],
  build: ["slender", "balanced", "strong", "full"],
  hair: HAIR_STYLES,
  face: ["oval", "round", "angular"],
  eyeShape: ["almond", "round", "wide"],
  brows: ["soft", "straight", "bold"],
  nose: ["small", "straight", "broad"],
  mouth: ["neutral", "smile", "full"],
  facialHair: ["none", "stubble", "beard"],
  emblem: EMBLEMS
});
var LOOK_RANGES = Object.freeze({ height: [0.88, 1.12], shoulders: [0.8, 1.2], muscle: [0, 1], torso: [0.85, 1.15], arms: [0.85, 1.15], legs: [0.85, 1.15] });
var COLOR_FIELDS = ["skin", "eyes", "hairColor", "suit", "trim", "emblemColor", "capeColor"];
var validColor = (value) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
function validateName(value) {
  if (typeof value !== "string") return { ok: false, name: "", error: "Enter a hero name." };
  const name = value.normalize("NFC").trim().replace(/ +/g, " "), length = [...name].length;
  if (!length) return { ok: false, name, error: "Enter a hero name." };
  if (length < 2 || length > 22) return { ok: false, name, error: "Use 2\u201322 characters." };
  if (!/^[\p{L}\p{M}\p{N} '\u2019-]+$/u.test(name) || !/[\p{L}]/u.test(name)) return { ok: false, name, error: "Use letters, numbers, spaces, apostrophes or hyphens, with at least one letter." };
  return { ok: true, name, error: "" };
}
function sanitizeLook(raw = {}) {
  if (!raw || typeof raw !== "object") raw = {};
  const result = { ...DEFAULT_LOOK };
  const checked = validateName(raw.name);
  result.name = checked.ok ? checked.name : DEFAULT_LOOK.name;
  for (const [key, values] of Object.entries(LOOK_OPTIONS)) if (values.includes(raw[key])) result[key] = raw[key];
  for (const [key, [min, max]] of Object.entries(LOOK_RANGES)) {
    const n = Number(raw[key]);
    if (raw[key] !== void 0 && Number.isFinite(n)) result[key] = Math.min(max, Math.max(min, n));
  }
  for (const key of COLOR_FIELDS) if (validColor(raw[key])) result[key] = raw[key].toLowerCase();
  if (!validColor(raw.emblemColor) && validColor(raw.trim)) result.emblemColor = raw.trim.toLowerCase();
  result.cape = typeof raw.cape === "boolean" ? raw.cape : DEFAULT_LOOK.cape;
  return result;
}
var STARTER_OUTFIT = Object.freeze({ id: "starter-basic", origin: "starter" });
var canRecolorOutfit = (outfit) => outfit?.id === "starter-basic" && outfit?.origin === "starter";
function sanitizeOutfit(raw) {
  if (!raw || canRecolorOutfit(raw)) return { ...STARTER_OUTFIT };
  if (!["purchased", "earned", "rare", "legendary"].includes(raw.origin)) return { ...STARTER_OUTFIT };
  const palette = {};
  for (const key of ["suit", "trim", "emblemColor", "capeColor"]) palette[key] = validColor(raw.palette?.[key]) ? raw.palette[key] : DEFAULT_LOOK[key];
  return { id: String(raw.id || "fixed-outfit").slice(0, 80), origin: raw.origin, palette };
}

// equipment.mjs
var LEGACY_PARTS = ["mask", "suit", "gloves", "boots", "belt", "cape", "emblem"];
var EQUIPMENT_PARTS = [.../* @__PURE__ */ new Set([...COSTUME_PARTS, ...LEGACY_PARTS])];
var EQUIPMENT_NAMES = { helmet: "Helmet", chest: "Chest piece", mask: "Mask", suit: "Suit", gloves: "Gauntlets", boots: "Boots", belt: "Belt", cape: "Cape", emblem: "Emblem" };
var themes = [null, ["Shore", "#327f86", "#f0bd70"], ["Briar", "#60743e", "#ddb380"], ["Foundry", "#657c8c", "#da8a58"], ["Cavern", "#796196", "#bbd484"], ["Wild", "#936381", "#e4c883"], ["Aether", "#52649b", "#bcafe1"], ["Vanguard", "#b96354", "#f4c777"]];
var GLOW = Object.freeze({ ordinary: null, rare: "#ffffff", legendary: "#65ff7a" });
var legacyCatalog = Object.fromEntries(themes.flatMap((theme, region) => !theme ? [] : ["ordinary", ...region >= 4 ? ["rare"] : []].flatMap((rarity) => LEGACY_PARTS.map((part, i) => {
  const id = `r${region}-${rarity}-${part}`, rare = rarity === "rare", factor = rare ? 1.6 : 1;
  return [id, { id, region, rarity, part, legacy: true, level: 1, catalogValue: 100 * region * (rare ? 2 : 1), sellable: true, name: `${rare ? "Radiant " : ""}${theme[0]} ${EQUIPMENT_NAMES[part]}`, color: theme[1], accent: theme[2], stats: { strength: Math.round(region * (i === 2 ? 6 : 2) * factor), damage: Math.round(region * (i === 3 ? 7 : 3) * factor), attackSpeed: i === 4 || i === 6 ? Number((region * 5e-3 * factor).toFixed(3)) : 0 } }];
}))));
var EQUIPMENT = Object.freeze({ ...legacyCatalog, ...COSTUME_CATALOG, ...MERGE_CATALOG });
var itemDefinition = (item) => EQUIPMENT[item?.catalogId];
function normalizeInventory(raw = {}) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.items) || raw.items.length > 7 || !Array.isArray(raw.pending)) return null;
  const ids = /* @__PURE__ */ new Set(), valid = (item) => {
    if (!item || !Object.hasOwn(EQUIPMENT, item.catalogId) || typeof item.uid !== "string" || !/^drop-\d+$/.test(item.uid) || ids.has(item.uid) || !Number.isSafeInteger(Number(item.uid.slice(5))) || Number(item.uid.slice(5)) >= 1e9) return false;
    ids.add(item.uid);
    return true;
  };
  if (!raw.items.every(valid) || !raw.pending.every(valid)) return null;
  const items = raw.items.map(({ uid, catalogId }) => ({ uid, catalogId })), pending = raw.pending.map(({ uid, catalogId }) => ({ uid, catalogId })), equipped = {};
  for (const part of EQUIPMENT_PARTS) {
    const uid = raw.equipped?.[part];
    if (uid) {
      const item = items.find((i) => i.uid === uid);
      if (!item || itemDefinition(item).part !== part) return null;
      equipped[part] = uid;
    }
  }
  if (equipped.helmet && equipped.mask || equipped.chest && equipped.suit) return null;
  const maxId = Math.max(0, ...[...items, ...pending].map((i) => Number(i.uid.slice(5))));
  const retired = raw.retired ?? {};
  if (!retired || typeof retired !== "object" || Array.isArray(retired) || Object.entries(retired).some(([id, reason]) => !/^drop-\d+$/.test(id) || !["sold", "discarded"].includes(reason) || ids.has(id) || !Number.isSafeInteger(Number(id.slice(5))) || Number(id.slice(5)) >= 1e9)) return null;
  const highest = Math.max(maxId, ...Object.keys(retired).map((id) => Number(id.slice(5))));
  return { items, pending, equipped, retired: { ...retired }, nextId: Math.max(highest + 1, Math.min(1e9, Math.floor(Number(raw.nextId) || 1))) };
}
var emptyInventory = () => ({ items: [], pending: [], equipped: {}, retired: {}, nextId: 1 });
function equipmentBonuses(inventory, level = 99) {
  const sum = Object.fromEntries(STAT_KEYS.map((k) => [k, 0]));
  for (const uid of Object.values(inventory.equipped)) {
    const item = inventory.items.find((i) => i.uid === uid), def = itemDefinition(item);
    if (def && level >= (def.level || 1)) for (const key of STAT_KEYS) sum[key] += def.stats[key] || 0;
  }
  return Object.fromEntries(Object.entries(sum).map(([k, v]) => [k, Number(v.toFixed(4))]));
}
function equipmentOutfit(inventory, fallback = STARTER_OUTFIT) {
  const pieces = {};
  for (const [part, uid] of Object.entries(inventory.equipped)) {
    const def = itemDefinition(inventory.items.find((i) => i.uid === uid));
    if (def) pieces[part] = def;
  }
  if (pieces.helmet) pieces.mask = pieces.helmet;
  if (pieces.chest) {
    pieces.suit = pieces.chest;
    pieces.emblem = { ...pieces.chest, color: pieces.chest.accent };
  }
  return { ...fallback, pieces };
}
function rollEquipment(region, random, serial) {
  const roll = random(), rare = LOOT.rareChance[region] || 0;
  const rarity = roll < rare ? "rare" : roll < rare + LOOT.ordinaryChance ? "ordinary" : null;
  return rarity ? costumeDrop(region, rarity, Math.floor(random() * 3), serial) : null;
}

// boss-state.mjs
function initialBossProgress(victories = []) {
  return { records: Object.fromEntries(victories.map((id) => [id, { wins: 1, chest: { state: "legacy", coins: 0, roots: 0, items: [] } }])) };
}
function normalizeBossProgress(raw, victories, { strict = false } = {}) {
  if (!raw) return strict ? null : initialBossProgress(victories);
  if (!raw.records || typeof raw.records !== "object" || Array.isArray(raw.records)) return null;
  const records = {};
  if (Object.keys(raw.records).some((id) => !victories.includes(Number(id)))) return null;
  for (const region of victories) {
    const r = raw.records[region], c = r?.chest;
    if (!r || !Number.isSafeInteger(r.wins) || r.wins < 1 || !c || !["available", "claimed", "legacy"].includes(c.state) || !Number.isInteger(c.coins) || c.coins < 0 || c.coins > 100 || !Number.isInteger(c.roots) || c.roots < 0 || c.roots > 2 || !Array.isArray(c.items) || c.items.length > 2) return null;
    if (!c.items.every((i) => itemDefinition(i)?.region === region && (region >= 4 || itemDefinition(i)?.rarity === "ordinary") && /^chest-[1-7]-[01]$/.test(i.uid))) return null;
    if (new Set(c.items.map((i) => i.uid)).size !== c.items.length) return null;
    records[region] = { wins: r.wins, chest: { state: c.state, coins: c.coins, roots: c.roots, items: c.items.map(({ uid, catalogId }) => ({ uid, catalogId })) } };
  }
  return { records };
}
function rollChest(region, random = Math.random) {
  const coins = 20 + Math.floor(random() * 21), roots = 1 + Math.floor(random() * 2), count = random() < 0.35 ? 2 : 1, items = [];
  for (let i = 0; i < count; i++) {
    const rarity = region >= 4 && random() < 0.3 ? "rare" : "ordinary", item = costumeDrop(region, rarity, Math.floor(random() * 3), 1);
    item.uid = `chest-${region}-${i}`;
    items.push(item);
  }
  return { state: "available", coins, roots, items };
}
function normalizeArena(raw, world, bosses) {
  if (raw == null) return null;
  if (!raw || raw.region !== world.region || !["restart", "cleared"].includes(raw.mode) || raw.mode === "cleared" && !bosses.records[raw.region]) return false;
  return { region: raw.region, mode: raw.mode };
}

// bosses.mjs
var clamp = (n, a2, b) => Math.max(a2, Math.min(b, n));
var floor = () => ({ id: "arena-floor", x: 0, y: ARENA.floor, w: 1820, h: 180, kind: "rock" });
var arenaSurfaces = () => [floor(), { id: "arena-right", x: 1820, y: -400, w: 60, h: 1180, kind: "rock" }, ...[650, 1370].map((x, i) => ({ id: `arena-platform-${i}`, x, y: 440, w: 140, h: 20, oneWay: true, kind: "rock" }))];
function makeBoss(region, surface) {
  const d = BOSSES[region];
  return { id: 100, type: `boss-${region}`, boss: true, region, level: d.level, x: ARENA.bossX, y: ARENA.floor, prevX: ARENA.bossX, prevY: ARENA.floor, spawnX: ARENA.bossX, surface, spawnSurface: surface, w: region === 4 ? 240 : 140, h: region === 4 ? 165 : 180, hp: d.hp, maxHp: d.hp, damage: d.damage, face: -1, state: "idle", age: 0, phase: 1, pattern: 0, flash: 0, protection: 0, stagger: 0, attack: null, rooted: false, lifted: false, respawn: 0 };
}
function attackZones(b, attack2) {
  const x = attack2.targetX, y = ARENA.floor, shape = attack2.shape;
  if (shape === "ground" || shape === "fall") return Array.from({ length: attack2.spots || 1 }, (_, i) => ({ x: clamp(x + (i - ((attack2.spots || 1) - 1) / 2) * 210, 300, 1720) - attack2.width / 2, y: shape === "ground" ? y - 52 : 80, w: attack2.width, h: shape === "ground" ? 52 : y - 80 }));
  if (shape === "melee") return [{ x: b.face > 0 ? b.x : b.x - attack2.reach, y: y - 105, w: attack2.reach, h: 105 }];
  if (shape === "sweep") return [{ x: b.x - attack2.reach, y: y - 48, w: attack2.reach * 2, h: 48 }];
  return [];
}
function overlap(a2, b) {
  return a2.x < b.x + b.w && a2.x + a2.w > b.x && a2.y < b.y + b.h && a2.y + a2.h > b.y;
}
function fire(g, b) {
  const a2 = b.attack, h = g.hero, damage = b.damage * a2.damage, shot = (x, y, vx, vy = 0, color = "#e6cc83") => g.enemyShots.push({ x, y, vx, vy, life: 5, source: b, damage, color, bossShot: true });
  if (a2.shape === "projectile") {
    const x = b.x + b.face * (b.w * 0.5 + 10), y = b.y - 70, angle = Math.atan2(h.y - 48 - y, h.x - x), speed = a2.speed * (b.phase === 1 ? 1 : 1.12);
    for (let i = 0; i < a2.count; i++) {
      const theta = angle + (i - (a2.count - 1) / 2) * 0.14;
      shot(x, y, Math.cos(theta) * speed, Math.sin(theta) * speed, a2.color);
    }
  } else if (a2.shape === "wave") {
    for (const direction of [-1, 1]) {
      shot(b.x + direction * 75, ARENA.floor - 22, direction * a2.speed);
      if (a2.double) shot(b.x + direction * 30, ARENA.floor - 26, direction * a2.speed * 0.72);
    }
  } else if (a2.shape === "fall") for (const z of a2.zones) shot(z.x + z.w / 2, 90, 0, 370, "#baad8c");
  else if (a2.zones.some((z) => overlap(z, g.heroBox()))) g.hurt(damage, b.x, b);
  g.emit("boss-attack", { kind: a2.kind });
}
function stepBoss(g, b, dt) {
  b.prevX = b.x;
  b.prevY = b.y;
  b.flash = Math.max(0, b.flash - dt);
  if (b.state === "dead") {
    b.age += dt;
    return;
  }
  b.age += dt;
  const d = BOSSES[b.region], h = g.hero;
  if (b.state === "idle") {
    b.face = Math.sign(h.x - b.x) || b.face;
    const distance = Math.abs(h.x - b.x), motion = BOSS_MOVEMENT[b.region];
    const gait = motion.style === "weave" ? 0.65 + 0.35 * Math.sin(g.time * 3) ** 2 : motion.style === "heavy" ? 0.55 + 0.45 * Math.max(0, Math.sin(g.time * 2.5)) : 1;
    const speed = d.speed * gait * (b.phase === 1 ? 1 : b.phase === 2 ? 1.2 : 1.35) * (b.rooted ? 0.5 : 1);
    const direction = distance > motion.approach ? b.face : distance < motion.retreat ? -b.face : motion.style === "drift" ? Math.sin(g.time * 1.7) * 0.25 : 0;
    b.x = clamp(b.x + direction * speed * dt, 350, 1690);
    if (b.age >= [1.25, 1.25, 0.8, 0.55][b.phase]) {
      const pattern = d.patterns[b.phase - 1], kind = pattern[b.pattern++ % pattern.length];
      const targetX = b.region === 4 ? clamp(h.x, b.x - 200, b.x + 200) : clamp(h.x, 300, 1720);
      b.attack = { ...attackFor(b, kind), targetX };
      b.attack.zones = attackZones(b, b.attack);
      b.state = "windup";
      b.age = 0;
    }
  } else if (b.state === "windup" && b.age >= b.attack.warning) {
    b.state = "active";
    b.age = 0;
    b.attack.fired = false;
    if (b.region !== 4) {
      fire(g, b);
      b.attack.fired = true;
    }
  } else if (b.state === "active") {
    if (!b.attack.fired && b.age >= b.attack.duration * 0.65) {
      fire(g, b);
      b.attack.fired = true;
    }
    if (b.age >= b.attack.duration) {
      b.state = "recover";
      b.age = 0;
    }
  } else if (b.state === "recover" && b.age >= b.attack.recovery) {
    b.state = "idle";
    b.age = 0;
    b.attack = null;
  }
}
var bossMethods = {
  initializeBosses(save) {
    this.bossProgress = structuredClone(save?.bossProgress || initialBossProgress(this.world.bossVictories));
    this.arenaScene = null;
    this.pendingBossEntry = null;
  },
  enterBoss() {
    if (this.arenaScene || !this.canTravel() || !this.hero.grounded) return false;
    this.pendingBossEntry = { region: this.regionId, mode: "restart" };
    const snapshot = this.save();
    this.pendingBossEntry = null;
    this.startBossScene("restart");
    this.emit("boss-entry", { snapshot });
    return true;
  },
  startBossScene(mode = "restart") {
    const h = this.hero;
    this.arenaScene = { region: this.regionId, cleared: mode === "cleared", returnLocation: { x: h.x, y: h.y, face: h.face }, surfaces: this.surfaces, enemies: this.enemies, camps: this.camps };
    this.powers.cancelEffects();
    this.enemyShots = [];
    this.surfaces = arenaSurfaces();
    this.camps = [];
    Object.assign(h, { x: ARENA.heroX, prevX: ARENA.heroX, y: ARENA.floor, prevY: ARENA.floor, vx: 0, vy: 0, grounded: true, jumps: 0, jumpBuffer: 0, coyote: 0.1, attack: null, attackBuffer: null, face: 1, invulnerable: 1.2 });
    const b = makeBoss(this.regionId, this.surfaces[0]);
    this.arenaScene.boss = b;
    this.enemies = [b];
    if (mode === "cleared") {
      b.hp = 0;
      b.state = "dead";
      this.bossEncounter = null;
      this.combatTimer = 0;
    } else this.bossEncounter = { region: this.regionId, boss: b, waves: 0, spawned: 0, elapsed: 0, nextWave: null, waveWarning: 0, sequence: 0 };
    this.emit("arena", { mode });
  },
  leaveBoss(reason = "retreat") {
    const scene = this.arenaScene;
    if (!scene) return false;
    this.powers.cancelEffects();
    this.cancelMergeEffects();
    this.legendaryHazards = [];
    this.disruptedPower = null;
    this.pendingLegendaryVictory = null;
    this.enemyShots = [];
    this.hero.attack = null;
    this.hero.attackBuffer = null;
    this.surfaces = scene.surfaces;
    this.enemies = scene.enemies;
    this.camps = scene.camps;
    this.arenaScene = null;
    this.bossEncounter = null;
    Object.assign(this.hero, { x: scene.returnLocation.x, prevX: scene.returnLocation.x, y: scene.returnLocation.y, prevY: scene.returnLocation.y, vx: 0, vy: 0, grounded: true, jumps: 0, face: -1, invulnerable: 1.5 });
    this.combatTimer = reason === "defeat" ? 0 : 5;
    this.emit("arena-exit", { reason });
    return true;
  },
  bossDamaged(b) {
    const old = b.phase;
    b.phase = bossPhase(b.hp / b.maxHp);
    if (b.legendary && b.phase >= 2) this.disruptedPower = null;
    if (old !== b.phase) this.emit("boss-phase", { phase: b.phase });
    if (b.hp <= 0) {
      b.state = "dead";
      b.age = 0;
      b.attack = null;
      b.rooted = false;
      this.enemyShots = this.enemyShots.filter((p) => p.source !== b);
      this.emit("boss-down");
    }
  },
  stepEncounter(dt) {
    const scene = this.arenaScene;
    if (!scene) return;
    if (scene.legendary) {
      this.stepLegendaryEncounter(dt);
      return;
    }
    if (this.hero.x < ARENA.left && !this.hero.dead) {
      this.leaveBoss();
      return;
    }
    const encounter = this.bossEncounter;
    if (!encounter || this.hero.dead) return;
    const b = encounter.boss;
    encounter.elapsed += dt;
    if (b.hp > 0 && b.phase === 3 && encounter.waves < ARENA.waveLimit) {
      if (encounter.nextWave === null) encounter.nextWave = encounter.elapsed + ARENA.waveWarning;
      const alive = this.enemies.filter((e) => e.summoned && e.state !== "dead");
      encounter.waveWarning = alive.length === 0 ? Math.max(0, Math.min(ARENA.waveWarning, encounter.nextWave - encounter.elapsed)) : 0;
      if (encounter.elapsed >= encounter.nextWave && alive.length === 0) {
        for (let i = 0; i < ARENA.helpersPerWave; i++) {
          const choices = [450 + i * 60, 980 + i * 70, 1490 + i * 60], x = choices.sort((a2, b2) => Math.abs(this.hero.x - b2) - Math.abs(this.hero.x - a2))[0];
          const e = this.makeEnemy(BOSSES[this.regionId].helper, x, "arena-floor", 200 + encounter.spawned++);
          e.summoned = true;
          e.level = BOSSES[this.regionId].level;
          e.provoked = true;
          e.protection = 1.2;
          this.enemies.push(e);
        }
        encounter.waves++;
        encounter.nextWave = encounter.elapsed + ARENA.waveDelay;
        encounter.waveWarning = 0;
        this.emit("boss-wave", { wave: encounter.waves });
      }
    } else encounter.waveWarning = 0;
    if (b.hp <= 0 && this.enemies.every((e) => e.state === "dead") && !this.hero.dead) this.completeBoss();
  },
  completeBoss() {
    const fight = this.bossEncounter;
    if (!fight || this.hero.dead || fight.boss.hp > 0 || this.enemies.some((e) => e.state !== "dead")) return false;
    const reward = bossVictory(this.world, fight.region);
    if (!reward.ok) return false;
    const existing = this.bossProgress.records[fight.region];
    this.bossProgress.records[fight.region] = existing ? { ...existing, wins: existing.wins + 1 } : { wins: 1, chest: rollChest(fight.region, this.random) };
    this.hero.coins = Math.min(999999, this.hero.coins + reward.coins);
    const xp = this.hero.level < 99 ? monsterXP(BOSSES[fight.region].xp, this.hero.level, BOSSES[fight.region].level) : 0;
    this.gainXP(xp);
    this.bossEncounter = null;
    this.arenaScene.cleared = true;
    this.powers.cancelEffects();
    this.cancelMergeEffects();
    this.legendaryHazards = [];
    this.disruptedPower = null;
    this.pendingLegendaryVictory = null;
    this.enemyShots = [];
    this.hero.attack = null;
    this.hero.attackBuffer = null;
    this.combatTimer = 0;
    this.emit("boss-victory", { ...reward, xp, name: BOSSES[fight.region].name, region: fight.region });
    return true;
  },
  availableChest() {
    return !this.arenaScene?.legendary && this.arenaScene?.cleared && this.bossProgress.records[this.regionId]?.chest.state === "available" ? this.bossProgress.records[this.regionId].chest : null;
  },
  claimChest() {
    const chest = this.availableChest();
    if (!chest || !this.canSave() || this.inventory.pending.length) return false;
    this.hero.coins = Math.min(999999, this.hero.coins + chest.coins);
    const roots = Math.min(4 - this.healthRoots, chest.roots);
    this.healthRoots += roots;
    for (const item of chest.items) this.inventory.pending.push({ uid: `drop-${this.inventory.nextId++}`, catalogId: item.catalogId });
    chest.state = "claimed";
    this.recordEconomy("chest");
    this.emit("chest-claimed", { coins: chest.coins, roots, overflow: chest.roots - roots });
    return true;
  },
  acceptReward() {
    if (!this.inventory.pending.length || this.inventory.items.length >= 7 || !this.canSave()) return false;
    this.inventory.items.push(this.inventory.pending.shift());
    this.recordEconomy("reward");
    return true;
  }
};

// legendary-bosses.mjs
var clamp2 = (n, a2, b) => Math.max(a2, Math.min(b, n));
var overlaps = (a2, b) => a2.x < b.x + b.w && a2.x + a2.w > b.x && a2.y < b.y + b.h && a2.y + a2.h > b.y;
function makeLegendary(id, surface) {
  const d = LEGENDARY[id];
  return { id: 100, type: `boss-legendary-${id}`, boss: true, legendary: true, legendaryId: id, region: d.region, level: 99, x: 1180, y: id === "air" ? 530 : 600, prevX: 1180, prevY: id === "air" ? 530 : 600, spawnX: 1180, surface, spawnSurface: surface, w: id === "styrodog" ? 165 : 145, h: id === "air" ? 155 : 190, hp: LEGENDARY_HP(), maxHp: LEGENDARY_HP(), damage: d.damage, face: -1, state: "idle", age: 0, phase: 1, pattern: 0, flash: 0, protection: 0, stagger: 0, attack: null, rooted: false, lifted: false, flying: id === "air", airborne: id === "air", respawn: 0 };
}
function legendaryZones(b, a2) {
  const y = ARENA.floor;
  if (["ground", "lightning", "fall", "leap", "trap", "cloud", "tornado"].includes(a2.shape)) return Array.from({ length: a2.spots || 1 }, (_, i) => ({ x: clamp2(a2.targetX + (i - ((a2.spots || 1) - 1) / 2) * 240, 310, 1700) - a2.width / 2, y: a2.shape === "fall" ? 90 : y - (a2.shape === "cloud" || a2.shape === "tornado" ? 185 : 55), w: a2.width, h: a2.shape === "fall" ? 510 : a2.shape === "cloud" || a2.shape === "tornado" ? 185 : 55 }));
  if (a2.shape === "melee" || a2.shape === "charge") return [{ x: b.face > 0 ? b.x : b.x - a2.reach, y: y - 105, w: a2.reach, h: 105 }];
  if (a2.shape === "sweep") return [{ x: b.x - a2.reach, y: y - 55, w: a2.reach * 2, h: 55 }];
  return [];
}
function fireLegendary(g, b) {
  const a2 = b.attack, h = g.hero, damage = b.damage * a2.damage;
  const shot = (x, y, vx, vy = 0, extra = {}) => {
    if (g.enemyShots.length < 40) g.enemyShots.push({ x, y, vx, vy, life: 5, source: b, damage, color: a2.color || LEGENDARY[b.legendaryId].colors[1], bossShot: true, ...extra });
  };
  if (a2.shape === "projectile" || a2.shape === "bounce") {
    const x = b.x + b.face * (b.w / 2 + 12), y = b.y - 75, angle = Math.atan2(h.y - 45 - y, h.x - x);
    for (let i = 0; i < a2.count; i++) {
      const theta = angle + (i - (a2.count - 1) / 2) * 0.18;
      shot(x, y, Math.cos(theta) * a2.speed, a2.shape === "bounce" ? -270 - i * 55 : Math.sin(theta) * a2.speed, a2.shape === "bounce" ? { bounce: 3, gravity: 650 } : {});
    }
  } else if (a2.shape === "wave") {
    for (const direction of [-1, 1]) {
      shot(b.x + direction * 70, 578, direction * a2.speed);
      if (a2.double) shot(b.x + direction * 25, 578, direction * a2.speed * 0.63);
    }
  } else if (a2.shape === "fall") for (const z of a2.zones) shot(z.x + z.w / 2, 90, 0, 390);
  else if (["cloud", "tornado", "trap"].includes(a2.shape)) for (const z of a2.zones) g.legendaryHazards.push({ ...z, source: b, damage, kind: a2.shape, life: a2.life, age: 0, next: 0, vx: a2.shape === "cloud" ? b.face * 75 : a2.shape === "tornado" ? b.face * 95 : 0 });
  else if (a2.shape !== "barrier" && a2.shape !== "leap" && a2.shape !== "charge" && a2.zones.some((z) => overlaps(z, g.heroBox()))) g.hurt(damage, b.x, b);
  if (a2.hazard) for (const z of a2.zones) g.legendaryHazards.push({ ...z, source: b, damage, kind: "lightning", life: 2, age: 0, next: 1, vx: 0 });
  g.emit("boss-attack", { kind: a2.kind });
}
function stepLegendaryBoss(g, b, dt) {
  b.prevX = b.x;
  b.prevY = b.y;
  b.flash = Math.max(0, b.flash - dt);
  b.age += dt;
  if (b.state === "dead") return;
  const d = LEGENDARY[b.legendaryId], h = g.hero;
  if (b.state === "idle") {
    b.face = Math.sign(h.x - b.x) || b.face;
    const distance = Math.abs(h.x - b.x), ranged2 = ["hover", "scientist", "reactor", "crystal"].includes(d.style), desired = ranged2 ? 290 : 150;
    const direction = distance > desired ? b.face : ranged2 && distance < 170 ? -b.face : 0, gait = d.style === "heavy" ? 0.7 + 0.3 * Math.max(0, Math.sin(g.time * 2.5)) : d.style === "crystal" ? 0.8 + 0.2 * Math.sin(g.time * 2) ** 2 : 1;
    b.x = clamp2(b.x + direction * d.speed * gait * (b.phase === 1 ? 1 : b.phase === 2 ? 1.15 : 1.3) * (b.rooted ? 0.5 : 1) * dt, 340, 1670);
    if (d.style === "hover") b.y = 525 + Math.sin(g.time * 1.8) * 18;
    if (b.age >= [1.2, 1.2, 0.85, 0.65][b.phase]) {
      const pattern = d.patterns[b.phase - 1], kind = pattern[b.pattern++ % pattern.length], base = LEGENDARY_ATTACKS[kind];
      const warning = base.warning * (b.phase === 1 ? 1 : b.phase === 2 ? 0.96 : 0.92);
      b.attack = { ...base, kind, warning, targetX: clamp2(h.x, 300, 1720), startX: b.x, startY: b.y, hit: false };
      if (base.shape === "leap" && b.rooted) b.attack.targetX = b.x + (b.attack.targetX - b.x) * 0.5;
      b.attack.zones = legendaryZones(b, b.attack);
      b.state = "windup";
      b.age = 0;
    }
  } else if (b.state === "windup" && b.age >= b.attack.warning) {
    b.state = "active";
    b.age = 0;
    if (b.attack.shape === "leap") b.airborne = true;
    fireLegendary(g, b);
  } else if (b.state === "active") {
    const a2 = b.attack;
    if (a2.shape === "charge") {
      b.x = clamp2(b.x + b.face * a2.speed * (b.rooted ? 0.5 : 1) * dt, 310, 1700);
      if (!a2.hit && overlaps({ x: b.x - b.w / 2 - 18, y: b.y - 100, w: b.w + 36, h: 100 }, g.heroBox())) {
        a2.hit = true;
        g.hurt(b.damage * a2.damage, b.x, b);
      }
    }
    if (a2.shape === "leap") {
      const q = Math.min(1, b.age / a2.duration);
      b.x = a2.startX + (a2.targetX - a2.startX) * q;
      b.y = 600 - Math.sin(q * Math.PI) * 180;
      if (q >= 0.98 && !a2.hit) {
        a2.hit = true;
        b.airborne = false;
        b.y = 600;
        if (a2.zones.some((z) => overlaps(z, g.heroBox()))) g.hurt(b.damage * a2.damage, b.x, b);
      }
    }
    if (b.age >= a2.duration) {
      b.state = "recover";
      b.age = 0;
      if (a2.shape === "leap") {
        b.y = 600;
        b.airborne = false;
      }
    }
  } else if (b.state === "recover" && b.age >= b.attack.recovery * (b.phase === 1 ? 1 : 0.94)) {
    b.state = "idle";
    b.age = 0;
    b.attack = null;
  }
}
var legendaryMethods = {
  initializeLegendaryRuntime() {
    this.legendaryHazards = [];
    this.pendingLegendaryVictory = null;
    this.disruptedPower = null;
    this.legendaryStorageReady = false;
  },
  enterLegendary(id) {
    if (!LEGENDARY[id] || this.hero.level !== 99 || !this.legendaryStorageReady || this.arenaScene || !this.canTravel() || !this.hero.grounded) return false;
    if (!this.legendary.defeated[id] && !this.powers.data.equipped.some((id2) => id2 && this.powers.data.levels[id2])) return false;
    const mode = this.legendary.defeated[id] ? "cleared" : "restart";
    this.pendingBossEntry = { legendary: id, mode };
    const snapshot = this.save();
    this.pendingBossEntry = null;
    this.startLegendaryScene(id, mode);
    this.emit("boss-entry", { snapshot });
    return true;
  },
  startLegendaryScene(id, mode = "restart") {
    const h = this.hero, defeated = !!this.legendary.defeated[id];
    mode = defeated ? "cleared" : mode;
    this.arenaScene = { legendary: id, region: this.regionId, cleared: mode === "cleared", returnLocation: { x: h.x, y: h.y, face: h.face }, surfaces: this.surfaces, enemies: this.enemies, camps: this.camps };
    this.powers.cancelEffects();
    this.cancelMergeEffects();
    this.enemyShots = [];
    this.legendaryHazards = [];
    this.surfaces = arenaSurfaces();
    this.camps = [];
    Object.assign(h, { x: 420, prevX: 420, y: 600, prevY: 600, vx: 0, vy: 0, grounded: true, jumps: 0, jumpBuffer: 0, coyote: 0.1, attack: null, attackBuffer: null, face: 1, invulnerable: 1.2 });
    const b = makeLegendary(id, this.surfaces[0]);
    this.arenaScene.boss = b;
    this.enemies = [b];
    this.disruptedPower = null;
    if (mode === "cleared") {
      b.hp = 0;
      b.state = "dead";
      b.age = 2;
      this.bossEncounter = null;
      this.combatTimer = 0;
    } else {
      const choices = this.powers.data.equipped.filter((id2) => id2 && this.powers.data.levels[id2]);
      this.disruptedPower = choices.length ? choices[Math.min(choices.length - 1, Math.floor(this.random() * choices.length))] : null;
      this.bossEncounter = { legendary: id, region: this.regionId, boss: b, waves: 0, spawned: 0, elapsed: 0, nextWave: null, waveWarning: 0 };
    }
    this.emit("arena", { mode, legendary: id });
  },
  stepLegendaryEncounter(dt) {
    const scene = this.arenaScene;
    if (!scene?.legendary) return;
    if (this.hero.x < ARENA.left && !this.hero.dead) {
      this.leaveBoss();
      return;
    }
    for (const a2 of this.legendaryHazards) {
      a2.age += dt;
      a2.life -= dt;
      a2.x = clamp2(a2.x + a2.vx * dt, 240, 1700);
      if (a2.age >= a2.next) {
        a2.next += 1;
        if (overlaps(a2, this.heroBox())) this.hurt(a2.damage, a2.x + a2.w / 2, a2.source);
      }
    }
    this.legendaryHazards = this.legendaryHazards.filter((a2) => a2.life > 0 && a2.source.hp > 0);
    const fight = this.bossEncounter;
    if (!fight || this.hero.dead) return;
    const b = fight.boss;
    fight.elapsed += dt;
    if (b.phase >= 2) this.disruptedPower = null;
    if (b.hp > 0 && b.phase === 3 && fight.waves < 3) {
      if (fight.nextWave === null) fight.nextWave = fight.elapsed + 2.5;
      const living = this.enemies.filter((e) => e.summoned && e.state !== "dead");
      fight.waveWarning = living.length ? 0 : Math.max(0, Math.min(2.5, fight.nextWave - fight.elapsed));
      if (!living.length && fight.elapsed >= fight.nextWave) {
        for (let i = 0; i < 3; i++) {
          const x = [450 + i * 65, 1010 + i * 55, 1500 + i * 55].sort((a2, b2) => Math.abs(this.hero.x - b2) - Math.abs(this.hero.x - a2))[0], e = this.makeEnemy(LEGENDARY[scene.legendary].helper, x, "arena-floor", 200 + fight.spawned++);
          Object.assign(e, { summoned: true, legendaryHelper: true, helperTheme: scene.legendary, level: 99, w: 55, h: 80, hp: 1400, maxHp: 1400, damage: 100, provoked: true, protection: 1.2 });
          this.enemies.push(e);
        }
        fight.waves++;
        fight.nextWave = fight.elapsed + 14;
        fight.waveWarning = 0;
        this.emit("boss-wave", { wave: fight.waves });
      }
    } else fight.waveWarning = 0;
    if (b.hp <= 0 && this.enemies.every((e) => e.state === "dead") && !this.hero.dead && !this.pendingLegendaryVictory) {
      this.pendingLegendaryVictory = scene.legendary;
      this.paused = true;
      this.emit("legendary-clear-ready", { id: scene.legendary });
    }
  },
  prepareLegendaryVictory() {
    const id = this.pendingLegendaryVictory, fight = this.bossEncounter;
    if (!id || !fight?.legendary || this.hero.dead || fight.boss.hp > 0 || this.enemies.some((e) => e.state !== "dead") || this.legendary.defeated[id]) return false;
    this.legendary.defeated[id] = { claimed: false, pieces: ["helmet", "chest", "boots"].map((part) => ({ uid: `drop-${this.inventory.nextId++}`, catalogId: `merge-${id}-${part}`, state: "unclaimed" })) };
    this.legendary.revision++;
    this.recordEconomy("legendary");
    this.bossEncounter = null;
    this.arenaScene.cleared = true;
    this.disruptedPower = null;
    this.powers.cancelEffects();
    this.cancelMergeEffects();
    this.enemyShots = [];
    this.legendaryHazards = [];
    this.hero.attack = null;
    this.hero.attackBuffer = null;
    this.combatTimer = 0;
    this.pendingLegendaryVictory = null;
    return true;
  },
  pendingMergeReward() {
    return Object.entries(this.legendary.defeated).find(([, r]) => !r.claimed)?.[0] || null;
  },
  claimMergeReward(id, keepUids, discardUids, { confirmed = false, revision } = {}) {
    const record = this.legendary.defeated[id];
    if (!confirmed || revision !== this.legendary.revision || !this.canSave() || !record || record.claimed || !Array.isArray(keepUids) || !Array.isArray(discardUids)) return false;
    if (new Set(keepUids).size !== keepUids.length || new Set(discardUids).size !== discardUids.length || keepUids.some((uid) => !record.pieces.some((p) => p.uid === uid)) || discardUids.some((uid) => !this.inventory.items.some((p) => p.uid === uid)) || this.inventory.items.length - discardUids.length + keepUids.length > 7) return false;
    for (const uid of discardUids) this.retireItem(uid);
    this.inventory.items = this.inventory.items.filter((i) => !discardUids.includes(i.uid));
    record.claimed = true;
    for (const p of record.pieces) {
      if (keepUids.includes(p.uid)) {
        this.inventory.items.push({ uid: p.uid, catalogId: p.catalogId });
        p.state = "owned";
      } else {
        p.state = "discarded";
        this.retireItem(p.uid);
      }
    }
    this.legendary.revision++;
    this.recordEconomy("legendary");
    this.refreshEquipment();
    return true;
  },
  equipMergeMix(selection) {
    if (!this.treeVisit || !this.canSave() || !selection) return false;
    const parts = ["helmet", "chest", "boots"];
    for (const part of parts) {
      const uid = selection[part];
      if (uid && !this.inventory.items.some((i) => i.uid === uid && itemDefinition(i)?.part === part)) return false;
    }
    for (const part of parts) {
      if (selection[part]) this.inventory.equipped[part] = selection[part];
      else delete this.inventory.equipped[part];
    }
    delete this.inventory.equipped.mask;
    delete this.inventory.equipped.suit;
    this.recordEconomy("equip");
    this.refreshEquipment();
    return true;
  },
  activateMergeSet(id) {
    if (!this.treeVisit || !this.canSave()) return false;
    const pieces = ["helmet", "chest", "boots"].map((part) => this.inventory.items.find((i) => i.catalogId === `merge-${id}-${part}`));
    if (pieces.some((p) => !p)) return false;
    for (const [i, part] of ["helmet", "chest", "boots"].entries()) this.inventory.equipped[part] = pieces[i].uid;
    delete this.inventory.equipped.mask;
    delete this.inventory.equipped.suit;
    this.recordEconomy("equip");
    this.refreshEquipment();
    return true;
  },
  returnNormalEquipment() {
    if (!this.treeVisit || !this.canSave()) return false;
    for (const [part, uid] of Object.entries(this.inventory.equipped)) if (this.inventory.items.find((i) => i.uid === uid)?.catalogId.startsWith("merge-")) delete this.inventory.equipped[part];
    this.recordEconomy("equip");
    this.refreshEquipment();
    return true;
  }
};

// powers.mjs
var ACTIVE_SLOTS = 3;
var FUTURE_MERGE_SLOT = Object.freeze({ index: 3, requiredPieces: 3, cooldownMultiplier: 0.5 });
function resolveAbilitySlots(data, merge = null) {
  const slots = Array.from({ length: ACTIVE_SLOTS }, (_, index) => ({ id: data.equipped[index], level: data.levels[data.equipped[index]] || 0, cooldownMultiplier: 1 }));
  if (merge?.completePieces === FUTURE_MERGE_SLOT.requiredPieces && (POWER_IDS.includes(merge.ability) && !POWERS[merge.ability].passive || Object.hasOwn(MERGE_POWERS, merge.ability?.replace("merge:", ""))))
    slots.push({ id: merge.ability, level: integer(merge.level, 1, 20), cooldownMultiplier: FUTURE_MERGE_SLOT.cooldownMultiplier });
  return slots;
}
var POWER_IDS = ["strength", "superKick", "fireball", "flight", "steel", "roots", "agility", "speed", "whirlwind"];
var POWERS = Object.freeze({
  strength: { name: "Super Strength", icon: "\u03DF", cooldown: 8, offensive: true, summary: "One mighty forward punch. Yellow electricity is visual only." },
  superKick: { name: "Super Kick", icon: "\u2301", cooldown: 6, after: true, offensive: true, summary: "A focused martial arts combination. Retargets only within reach." },
  fireball: { name: "Fireball", icon: "\u25C9", cooldown: 5, offensive: true, summary: "Straight shots. No homing, burning or ongoing damage." },
  flight: { name: "Flight", icon: "\u219F", cooldown: 30, after: true, summary: "Launch from the ground. Press again to land. Only Fireball can attack." },
  steel: { name: "Steel Body", icon: "\u2B21", cooldown: 15, after: true, summary: "Reduce all incoming damage. Ignore knockback without slowing down." },
  roots: { name: "Ground Roots", icon: "\u2667", cooldown: 10, after: true, offensive: true, summary: "Trap grounded foes. Squeeze once per second. Bosses are slowed." },
  agility: { name: "Agility", icon: "\u25C7", cooldown: 10, after: true, summary: "Automatically roll a dodge against each valid incoming attack." },
  speed: { name: "Speed", icon: "\xBB", passive: true, summary: "Permanent running and attack speed. No damage bonus or active slot." },
  whirlwind: { name: "Whirlwind", icon: "\u224B", cooldown: 12, after: true, offensive: true, summary: "Lift regular foes. Damage once per second. Bosses stay grounded." }
});
var BALANCE = Object.freeze({ fireballSpeed: 520, fireballLife: 1.6, burstInterval: 0.12, controlRange: 260, combatGrace: 5, tree: { x: 290, y: 600 }, flightSpeed: 250 });
var clamp3 = (x, a2, b) => Math.max(a2, Math.min(b, x));
var integer = (x, a2, b) => clamp3(Math.floor(Number(x) || 0), a2, b);
var tier = (level) => level >= 20 ? 5 : 1 + Math.floor(level / 5);
var scale = (level, a2, b) => a2 + (b - a2) * (level - 1) / 19;
function interpolate(level, anchors) {
  for (let i = 1; i < anchors.length; i++) if (level <= anchors[i][0]) {
    const [a2, x] = anchors[i - 1], [b, y] = anchors[i];
    return x + (y - x) * (level - a2) / (b - a2);
  }
  return anchors.at(-1)[1];
}
function equipmentStats(raw = {}) {
  return { strength: clamp3(Number(raw.strength) || 0, 0, 1e3), damage: clamp3(Number(raw.damage) || 0, 0, 1e3), attackSpeed: clamp3(Number(raw.attackSpeed) || 0, 0, 0.5), defense: clamp3(Number(raw.defense) || 0, 0, 0.25), moveSpeed: clamp3(Number(raw.moveSpeed) || 0, 0, 0.6), fireball: clamp3(Number(raw.fireball) || 0, 0, 80), roots: clamp3(Number(raw.roots) || 0, 0, 15), whirlwind: clamp3(Number(raw.whirlwind) || 0, 0, 20) };
}
function powerStats(id, level, { heroLevel = 1, equipment = {} } = {}) {
  level = integer(level, 1, 20);
  const n = tier(level), eq = equipmentStats(equipment), strength = 10 + 2 * (heroLevel - 1) + eq.strength;
  const base = { level, cooldown: POWERS[id]?.cooldown || 0 };
  switch (id) {
    case "strength":
      return { ...base, targets: n, damage: 45 + 8 * (level - 1) + 2 * strength + eq.damage, bossEffectiveness: scale(level, 0.25, 1), reach: 59 };
    case "superKick":
      return { ...base, kicks: n + 1, damage: 16 + 2 * (level - 1) + 0.5 * strength + eq.damage, reach: 76 };
    case "fireball":
      return { ...base, projectiles: level === 20 ? 3 : level >= 10 ? 2 : 1, damage: 24 + 5 * (level - 1) + eq.fireball, pierce: level === 20 ? 2 : 1 };
    case "flight":
      return { ...base, duration: level + 2, bossHitChance: 0.5 };
    case "steel":
      return { ...base, reduction: interpolate(level, [[1, 0.2], [5, 0.3], [10, 0.45], [15, 0.6], [20, 0.75]]), duration: interpolate(level, [[1, 3], [5, 4], [10, 5], [15, 6], [20, 8]]) };
    case "roots":
      return { ...base, targets: n, duration: n + 1, damage: 6 + 2 * (level - 1) + eq.roots };
    case "agility":
      return { ...base, duration: scale(level, 5, 15), dodge: 0.75, legendaryDodge: 0.5 };
    case "speed":
      return { ...base, runBonus: scale(level, 0.05, 0.6), attackBonus: scale(level, 0.03, 0.5) };
    case "whirlwind":
      return { ...base, targets: n, duration: n + 1, damage: 10 + 3 * (level - 1) + eq.whirlwind };
    default:
      throw new Error("Unknown power");
  }
}
function normalizePowers(raw, heroLevel, { strict = false } = {}) {
  const levels = Object.fromEntries(POWER_IDS.map((id) => [id, integer(raw?.levels?.[id], 0, 20)]));
  const spent = Object.values(levels).reduce((a2, b) => a2 + b, 0), earned = Math.max(0, heroLevel - 1);
  if (spent > earned || strict && (!raw || !raw.levels || POWER_IDS.some((id) => !Number.isInteger(raw.levels[id]) || raw.levels[id] < 0 || raw.levels[id] > 20))) return null;
  const used = /* @__PURE__ */ new Set(), equipped = Array.from({ length: ACTIVE_SLOTS }, (_, i) => {
    const id = raw?.equipped?.[i];
    if (!POWER_IDS.includes(id) || POWERS[id].passive || !levels[id] || used.has(id)) return null;
    used.add(id);
    return id;
  });
  return { levels, equipped, points: earned - spent, recovery: Object.fromEntries(POWER_IDS.map((id) => [id, clamp3(Number(raw?.recovery?.[id]) || 0, 0, 120)])) };
}
function attackRate(level, equipment = {}) {
  return 1 + Math.min(0.5, (level ? powerStats("speed", level).attackBonus : 0) + equipmentStats(equipment).attackSpeed);
}
var isBoss = (e) => e?.boss === true || e?.legendary === true;
var box = (e) => ({ x: e.x - e.w / 2, y: e.y - e.h, w: e.w, h: e.h });
var EPS = 1e-8;
function segmentHit(x, y, nx, ny, rect, r = 0) {
  let lo = 0, hi = 1;
  for (const [origin, delta, min, max] of [[x, nx - x, rect.x - r, rect.x + rect.w + r], [y, ny - y, rect.y - r, rect.y + rect.h + r]]) {
    if (Math.abs(delta) < EPS) {
      if (origin < min || origin > max) return null;
      continue;
    }
    const a2 = (min - origin) / delta, b = (max - origin) / delta;
    lo = Math.max(lo, Math.min(a2, b));
    hi = Math.min(hi, Math.max(a2, b));
    if (lo > hi) return null;
  }
  return lo;
}
var PowerSystem = class {
  constructor(game, data) {
    Object.defineProperty(this, "game", { value: game });
    this.data = data;
    this.cooldowns = { ...data.recovery };
    this.active = {};
    this.projectiles = [];
    this.bursts = [];
    this.mergeEntitlement = null;
  }
  stats(id) {
    return powerStats(id, this.data.levels[id], { heroLevel: this.game.hero.level, equipment: this.game.equipment });
  }
  get flying() {
    return !!this.active.flight;
  }
  get speed() {
    return Math.min(0.6, (this.data.levels.speed ? this.stats("speed").runBonus : 0) + equipmentStats(this.game.equipment).moveSpeed);
  }
  get attackRate() {
    return attackRate(this.data.levels.speed, this.game.equipment);
  }
  ready(id) {
    return this.game.disruptedPower !== id && POWER_IDS.includes(id) && !!this.data.levels[id] && !POWERS[id]?.passive && !this.active[id] && (this.cooldowns[id] || 0) <= EPS;
  }
  activateSlot(index) {
    if (index === 3 && this.game.legendary?.active) return this.game.activateMerge();
    const slot = resolveAbilitySlots(this.data, this.mergeEntitlement)[index];
    return slot?.id ? this.activate(slot.id, slot) : false;
  }
  activate(id, slot = null) {
    const g = this.game, h = g.hero, def = POWERS[id];
    const resolved = resolveAbilitySlots(this.data, this.mergeEntitlement).find((s2) => s2.id === id);
    if (g.paused || h.dead || g.disruptedPower === id || !POWER_IDS.includes(id) || def.passive || !resolved) return false;
    slot = slot || resolved;
    if (id === "flight" && this.flying) {
      this.end("flight");
      return true;
    }
    if (!slot.level || this.active[id] || (this.cooldowns[id] || 0) > EPS || h.stun > 0 || this.flying && def.offensive && id !== "fireball") return false;
    if (id === "flight" && (!h.grounded || h.attack || this.active.superKick)) return false;
    if (["strength", "superKick"].includes(id) && (h.attack || this.active.superKick)) return false;
    const s = powerStats(id, slot.level, { heroLevel: h.level, equipment: g.equipment });
    s.cooldown *= slot.cooldownMultiplier;
    const state = { ...s, age: 0, targets: [], x: h.x + h.face * 100, y: h.y, face: h.face };
    if (def.after) this.active[id] = state;
    else this.cooldowns[id] = s.cooldown;
    if (def.offensive) g.markCombat();
    if (id === "strength") {
      g.startAttack("punch");
      Object.assign(h.attack, { power: id, stats: s });
    }
    if (id === "superKick") {
      state.left = s.kicks;
      state.target = null;
      this.nextKick(state);
    }
    if (id === "fireball") {
      this.bursts.push({ ...state, left: s.projectiles, next: 0 });
      h.castAge = 0;
    }
    if (id === "flight") {
      for (const effect of this.game.mergeEffects.filter((e) => e.offensive)) this.game.endMergeEffect(effect);
      this.game.mergeShots = [];
      for (const other of ["roots", "whirlwind"]) this.end(other);
      h.attack = null;
      h.attackBuffer = null;
      h.jumpBuffer = 0;
      h.grounded = false;
      h.vy = -170;
      h.jumpAge = 100;
      h.jumps = 1;
    }
    if (id === "roots" || id === "whirlwind") {
      state.targets = g.enemies.filter((e) => e.state !== "dead" && e.protection <= 0 && Math.abs(e.x - h.x) <= BALANCE.controlRange && Math.abs(e.y - h.y) < 120 && (id !== "roots" || !e.flying && !e.airborne && Math.abs(e.y - e.surface.y) < 1) && (id !== "whirlwind" || !e.rooted || isBoss(e))).sort((a2, b) => Math.abs(a2.x - h.x) - Math.abs(b.x - h.x) || a2.id - b.id).slice(0, s.targets).map((e) => e.id);
      if (id === "whirlwind" && state.targets.length) state.x = g.enemies.filter((e) => state.targets.includes(e.id)).reduce((sum, e) => sum + e.x, 0) / state.targets.length;
      for (const e of g.enemies.filter((e2) => state.targets.includes(e2.id))) {
        if (id === "roots") e.rooted = true;
        else if (!isBoss(e)) {
          e.spawnSurface ||= e.surface;
          e.lifted = true;
          e.airborne = true;
          e.vy = 0;
          e.liftOrigin = { x: e.x, y: e.y };
        }
      }
    }
    this.sync();
    g.emit("power", { id });
    return true;
  }
  nextKick(state) {
    this.game.startAttack("kick");
    Object.assign(this.game.hero.attack, { power: "superKick", stats: state, comboIndex: state.kicks - state.left });
    state.left--;
  }
  end(id) {
    const state = this.active[id];
    if (!state) return;
    this.cooldowns[id] = state.cooldown;
    delete this.active[id];
    if (id === "flight") this.game.hero.vy = Math.max(0, this.game.hero.vy);
    if (id === "roots" || id === "whirlwind") {
      for (const e of this.game.enemies) if (state.targets.includes(e.id)) {
        if (id === "roots") e.rooted = !!e.mergeRooted;
        else if (e.lifted) {
          e.lifted = !!e.mergeLifted;
          e.airborne = true;
          e.vy = 0;
        }
      }
    }
    this.sync();
  }
  sync() {
    const h = this.game.hero;
    h.flying = this.flying;
    h.steel = !!this.active.steel;
    h.agile = !!this.active.agility;
  }
  cancelEffects() {
    for (const id of Object.keys(this.active)) this.end(id);
    this.bursts = [];
    this.projectiles = [];
  }
  incoming(amount, source = {}) {
    const g = this.game;
    if (this.flying && (!isBoss(source) || g.random() >= 0.5)) return null;
    if (this.active.agility && g.random() < (source.legendary ? 0.5 : 0.75)) {
      g.emit("dodge");
      return null;
    }
    return g.mergeDefense(amount * (1 - (this.active.steel?.reduction || 0)) * (1 - equipmentStats(g.equipment).defense));
  }
  melee(attack2, candidates) {
    const g = this.game, stats = attack2.stats;
    if (attack2.power === "superKick") {
      if (attack2.targets.size) return;
      const combo = this.active.superKick;
      if (!combo) return;
      let target = candidates.find((e) => e.id === combo.target);
      if (!target) {
        target = candidates[0];
        combo.target = target?.id ?? null;
      }
      candidates = target ? [target] : [];
    }
    const cap = attack2.power === "strength" ? stats.targets : Infinity;
    for (const e of candidates) {
      if (attack2.targets.size >= cap) break;
      attack2.targets.add(e.id);
      const damage = stats ? stats.damage * (attack2.power === "strength" && isBoss(e) ? stats.bossEffectiveness : 1) : g.attackDefinition(attack2.kind).damage;
      g.damageEnemy(e, damage, { kind: attack2.kind, knock: attack2.power === "superKick" ? 0 : 18, face: attack2.face });
    }
  }
  step(dt) {
    const g = this.game, h = g.hero;
    for (const id of POWER_IDS) this.cooldowns[id] = Math.max(0, (this.cooldowns[id] || 0) - dt);
    for (const [id, a2] of Object.entries(this.active)) {
      if (id === "superKick") {
        if (!h.attack && h.stun <= 0) {
          if (a2.left > 0) this.nextKick(a2);
          else this.end(id);
        }
        continue;
      }
      const before = a2.age;
      a2.age = Math.min(a2.duration, a2.age + dt);
      if (id === "roots" || id === "whirlwind") {
        for (const e of g.enemies) {
          if (!a2.targets.includes(e.id) || e.state === "dead") continue;
          if (id === "whirlwind" && !isBoss(e)) {
            const phase = a2.age * 8 + e.id * 2.4, lift = Math.min(1, a2.age / 0.35);
            e.prevX = e.x;
            e.prevY = e.y;
            g.moveEnemyAir(e, e.liftOrigin.x + (a2.x - e.liftOrigin.x) * lift + Math.sin(phase) * 28 * lift, e.liftOrigin.y - 90 * lift + Math.cos(phase) * 18 * lift);
          }
          const ticks = Math.floor(a2.age + EPS) - Math.floor(before + EPS);
          if (ticks > 0) g.damageEnemy(e, a2.damage * ticks, { kind: id, stagger: false });
        }
      }
      if (a2.age + EPS >= a2.duration) this.end(id);
    }
    for (const burst of this.bursts) {
      burst.next -= dt;
      while (burst.left > 0 && burst.next <= EPS) {
        this.projectiles.push({ x: h.x + burst.face * 22, y: h.y - 45, vx: burst.face * BALANCE.fireballSpeed, life: BALANCE.fireballLife, damage: burst.damage, pierce: burst.pierce, hits: /* @__PURE__ */ new Set() });
        burst.left--;
        burst.next += BALANCE.burstInterval;
      }
    }
    this.bursts = this.bursts.filter((b) => b.left > 0);
    for (const p of this.projectiles) {
      const nx = p.x + p.vx * dt, contacts = [];
      for (const wall of g.surfaces.filter((s) => !s.oneWay)) {
        const t = segmentHit(p.x, p.y, nx, p.y, wall, 6);
        if (t !== null) contacts.push({ t, wall: true });
      }
      for (const e of g.enemies) {
        if (e.state === "dead" || e.protection > 0 || p.hits.has(e.id)) continue;
        const t = segmentHit(p.x, p.y, nx, p.y, box(e), 6);
        if (t !== null) contacts.push({ t, e });
      }
      contacts.sort((a2, b) => a2.t - b.t || Number(b.wall) - Number(a2.wall));
      for (const contact of contacts) {
        if (contact.wall) {
          p.life = 0;
          break;
        }
        g.damageEnemy(contact.e, p.damage * (p.hits.size ? 0.5 : 1), { kind: "fireball", stagger: false });
        p.hits.add(contact.e.id);
        if (p.hits.size >= p.pierce) {
          p.life = 0;
          break;
        }
      }
      p.x = nx;
      p.life -= dt;
    }
    this.projectiles = this.projectiles.filter((p) => p.life > 0);
    this.sync();
  }
  snapshot() {
    const recovery = { ...this.cooldowns };
    for (const [id, a2] of Object.entries(this.active)) recovery[id] = a2.cooldown + (id === "superKick" ? (a2.left + 1) * 0.39 / this.attackRate : Math.max(0, a2.duration - a2.age));
    return { levels: { ...this.data.levels }, equipped: [...this.data.equipped], recovery };
  }
};

// merge-powers.mjs
var box2 = (e) => ({ x: e.x - e.w / 2, y: e.y - e.h, w: e.w, h: e.h });
var near = (e, x, y, r) => Math.abs(e.x - x) <= r && Math.abs(e.y - y) < 140;
var mergeMethods = {
  initializeMergeRuntime() {
    this.mergeEffects = [];
    this.mergeShots = [];
    this.mergeCooldowns = { ...this.legendary.recovery };
  },
  mergeAbility() {
    return this.legendary.active ? { ...MERGE_POWERS[this.legendary.active], id: this.legendary.active, cooldown: MERGE_POWERS[this.legendary.active].cooldown * 0.5 } : null;
  },
  activateMerge() {
    const a2 = this.mergeAbility(), h = this.hero;
    if (!a2 || this.paused || h.dead || h.stun > 0 || (this.mergeCooldowns[a2.id] || 0) > 1e-8 || this.mergeEffects.some((e) => e.id === a2.id) || this.powers.flying && a2.offensive || a2.id === "styrodog" && !h.grounded) return false;
    const state = { ...a2, age: 0, x: h.x, y: h.y, face: h.face, hits: /* @__PURE__ */ new Set(), targets: [], remaining: a2.absorb };
    if (a2.offensive) this.markCombat();
    if (!a2.after) this.mergeCooldowns[a2.id] = a2.cooldown;
    h.castAge = 0;
    if (a2.id === "lightning") state.x = Math.max(240, Math.min(this.arenaScene ? 1700 : 6100, h.x + h.face * 220));
    if (a2.id === "air") state.x = h.x + h.face * 120;
    if (a2.id === "venomis") {
      state.targets = this.enemies.filter((e) => e.state !== "dead" && e.protection <= 0 && !e.flying && !e.airborne && Math.abs(e.y - e.surface.y) < 1 && near(e, h.x, h.y, 280)).sort((a3, b) => Math.abs(a3.x - h.x) - Math.abs(b.x - h.x)).slice(0, a2.targets).map((e) => e.id);
      for (const e of this.enemies) if (state.targets.includes(e.id)) {
        e.mergeRooted = true;
        e.rooted = true;
      }
    }
    if (a2.id === "sonic") this.mergeShots.push({ ...state, x: h.x + h.face * 25, y: h.y - 48, vx: h.face * a2.speed, life: 1.7, pierce: 8 });
    else if (a2.id === "wastelander") for (const face of [-1, 1]) this.mergeShots.push({ ...state, hits: /* @__PURE__ */ new Set(), face, x: h.x + face * 25, y: h.y - 20, vx: face * a2.speed, life: 2.1, pierce: 8, groundOnly: true });
    else this.mergeEffects.push(state);
    this.emit("merge-power", { id: a2.id });
    return true;
  },
  endMergeEffect(a2) {
    if (a2.after) this.mergeCooldowns[a2.id] = a2.cooldown;
    for (const e of this.enemies) {
      if (a2.id === "venomis" && a2.targets.includes(e.id)) {
        e.mergeRooted = false;
        e.rooted = !!this.powers.active.roots?.targets.includes(e.id);
      }
      if (a2.id === "air" && e.mergeLifted) {
        e.mergeLifted = false;
        e.lifted = !!this.powers.active.whirlwind?.targets.includes(e.id);
        e.airborne = true;
        e.vy = 0;
      }
    }
    a2.ended = true;
  },
  cancelMergeEffects() {
    if (!this.mergeEffects) return;
    for (const a2 of this.mergeEffects) this.endMergeEffect(a2);
    this.mergeEffects = [];
    this.mergeShots = [];
  },
  mergeDefense(amount) {
    const barrier = this.mergeEffects.find((e) => e.id === "styro" && !e.ended);
    if (!barrier) return amount;
    const absorbed = Math.min(barrier.remaining, amount);
    barrier.remaining -= absorbed;
    if (barrier.remaining <= 0) this.endMergeEffect(barrier);
    return amount - absorbed || null;
  },
  applyMergeMovement() {
    const a2 = this.mergeEffects.find((e) => e.id === "styrodog" && !e.ended);
    if (a2) {
      if (this.hero.stun > 0) this.endMergeEffect(a2);
      else this.hero.vx = a2.face * a2.speed;
    }
  },
  stepMerge(dt) {
    if (!this.mergeEffects) return;
    for (const id of Object.keys(MERGE_POWERS)) this.mergeCooldowns[id] = Math.max(0, (this.mergeCooldowns[id] || 0) - dt);
    for (const a2 of this.mergeEffects) {
      if (a2.ended) continue;
      const before = a2.age;
      a2.age += dt;
      const tick = Math.floor(a2.age + 1e-8) - Math.floor(before + 1e-8);
      if (a2.id === "lightning" || a2.id === "atomdust") {
        if (a2.age >= a2.delay && !a2.fired) {
          a2.fired = true;
          for (const e of this.enemies) if (e.state !== "dead" && near(e, a2.x, a2.y, a2.radius)) this.damageEnemy(e, a2.damage, { kind: `merge:${a2.id}`, knock: a2.id === "atomdust" ? 50 : 0, stagger: false });
        }
        if (a2.age >= a2.delay + 0.35) this.endMergeEffect(a2);
      } else if (a2.id === "styrodog") {
        for (const e of this.enemies) if (e.state !== "dead" && !a2.hits.has(e.id) && near(e, this.hero.x, this.hero.y, e.w / 2 + 38)) {
          if (this.damageEnemy(e, a2.damage, { kind: "merge:styrodog", knock: 35, face: a2.face })) a2.hits.add(e.id);
        }
      } else if (a2.id === "venomis") {
        for (const e of this.enemies) if (a2.targets.includes(e.id) && e.state !== "dead") {
          e.mergeRooted = true;
          e.rooted = true;
          if (tick && a2.age <= a2.duration + 1e-8) this.damageEnemy(e, a2.damage * tick, { kind: "merge:venomis", stagger: false });
        }
      } else if (a2.id === "air") {
        a2.x += a2.face * 65 * dt;
        for (const e of this.enemies) if (e.state !== "dead" && e.protection <= 0 && (near(e, a2.x, a2.y, 100) || a2.targets.includes(e.id))) {
          if (!a2.targets.includes(e.id) && a2.targets.length < 5) a2.targets.push(e.id);
          if (!a2.targets.includes(e.id)) continue;
          if (!isBoss(e)) {
            e.mergeLifted = true;
            e.lifted = true;
            e.airborne = true;
            e.spawnSurface ||= e.surface;
            e.vy = 0;
            this.moveEnemyAir(e, a2.x + Math.sin(a2.age * 8 + e.id) * 25, a2.y - 80 + Math.cos(a2.age * 7 + e.id) * 18);
          }
          if (tick && a2.age <= a2.duration + 1e-8) this.damageEnemy(e, a2.damage * tick, { kind: "merge:air", stagger: false });
        }
      }
      if (a2.duration && a2.age + 1e-8 >= a2.duration) this.endMergeEffect(a2);
    }
    this.mergeEffects = this.mergeEffects.filter((e) => !e.ended);
    for (const p of this.mergeShots) {
      const nx = p.x + p.vx * dt, contacts = [];
      for (const s of this.surfaces.filter((s2) => !s2.oneWay)) {
        const t = segmentHit(p.x, p.y, nx, p.y, s, 8);
        if (t !== null) contacts.push({ t, wall: true });
      }
      for (const e of this.enemies) {
        if (e.state === "dead" || e.protection > 0 || p.hits.has(e.id) || p.groundOnly && (e.flying || e.airborne || Math.abs(e.y - e.surface.y) > 20)) continue;
        const t = segmentHit(p.x, p.y, nx, p.y, box2(e), 12);
        if (t !== null) contacts.push({ t, e });
      }
      contacts.sort((a2, b) => a2.t - b.t || Number(b.wall) - Number(a2.wall));
      for (const hit of contacts) {
        if (hit.wall) {
          p.life = 0;
          break;
        }
        this.damageEnemy(hit.e, p.damage, { kind: `merge:${p.id}`, knock: 40, face: p.face, stagger: false });
        p.hits.add(hit.e.id);
        if (p.hits.size >= p.pierce) {
          p.life = 0;
          break;
        }
      }
      p.x = nx;
      p.life -= dt;
    }
    this.mergeShots = this.mergeShots.filter((p) => p.life > 0);
  },
  mergeSnapshot() {
    const recovery = { ...this.mergeCooldowns };
    for (const a2 of this.mergeEffects) if (a2.after) recovery[a2.id] = a2.cooldown + Math.max(0, a2.duration - a2.age);
    return recovery;
  }
};

// legendary-state.mjs
var emptyLegendary = () => ({ revision: 0, defeated: {}, active: null, recovery: Object.fromEntries(LEGENDARY_IDS.map((id) => [id, 0])), configuration: 1 });
function matchingMerge(inventory, level = 99) {
  if (level < 99) return null;
  const parts = ["helmet", "chest", "boots"].map((part) => MERGE_CATALOG[inventory.items.find((i) => i.uid === inventory.equipped[part])?.catalogId]);
  return parts.every(Boolean) && parts.every((p) => p.mergeId === parts[0].mergeId) ? parts[0].mergeId : null;
}
function normalizeLegendary(raw, inventory, level) {
  if (raw == null) {
    if (inventory.items.some((i) => MERGE_CATALOG[i.catalogId])) return null;
    return emptyLegendary();
  }
  if (!Number.isSafeInteger(raw.revision) || raw.revision < 0 || raw.configuration !== 1 || !raw.defeated || typeof raw.defeated !== "object" || Array.isArray(raw.defeated) || Object.keys(raw.defeated).some((id) => !LEGENDARY_IDS.includes(id))) return null;
  const ids = /* @__PURE__ */ new Set(), defeated = {};
  for (const [id, r] of Object.entries(raw.defeated)) {
    if (level !== 99 || !r || typeof r.claimed !== "boolean" || !Array.isArray(r.pieces) || r.pieces.length !== 3) return null;
    const pieces = [];
    for (const [n, part] of ["helmet", "chest", "boots"].entries()) {
      const p = r.pieces[n];
      if (!p || p.catalogId !== `merge-${id}-${part}` || !/^drop-\d+$/.test(p.uid) || ids.has(p.uid) || !Number.isSafeInteger(Number(p.uid.slice(5))) || Number(p.uid.slice(5)) >= inventory.nextId || !["unclaimed", "owned", "discarded"].includes(p.state)) return null;
      const owned = inventory.items.find((i) => i.uid === p.uid), retired = inventory.retired[p.uid];
      if (p.state === "unclaimed" && (r.claimed || owned || retired) || p.state === "owned" && (!r.claimed || owned?.catalogId !== p.catalogId || retired) || p.state === "discarded" && (!r.claimed || owned || retired !== "discarded") || inventory.pending.some((i) => i.uid === p.uid)) return null;
      ids.add(p.uid);
      pieces.push({ uid: p.uid, catalogId: p.catalogId, state: p.state });
    }
    defeated[id] = { claimed: r.claimed, pieces };
  }
  if (inventory.items.some((i) => MERGE_CATALOG[i.catalogId] && !ids.has(i.uid)) || inventory.pending.some((i) => MERGE_CATALOG[i.catalogId])) return null;
  if (raw.revision < Object.keys(defeated).length) return null;
  const active = matchingMerge(inventory, level);
  if (raw.active !== active) return null;
  const recovery = {};
  for (const id of LEGENDARY_IDS) {
    const v = raw.recovery?.[id] ?? 0;
    if (!Number.isFinite(v) || v < 0 || v > 120) return null;
    recovery[id] = v;
  }
  return { revision: raw.revision, defeated, active, recovery, configuration: 1 };
}
function legendaryDominates(next, old) {
  if (next.revision < old.revision) return false;
  for (const [id, r] of Object.entries(old.defeated)) {
    const n = next.defeated[id];
    if (!n || r.claimed && !n.claimed) return false;
    if (r.pieces.some((p, i) => n.pieces[i]?.uid !== p.uid || n.pieces[i]?.catalogId !== p.catalogId || p.state === "discarded" && n.pieces[i]?.state !== "discarded" || p.state === "owned" && n.pieces[i]?.state === "unclaimed")) return false;
  }
  return true;
}
function normalizeLegendaryArena(raw, legendary, level) {
  if (!raw?.legendary) return void 0;
  if (level !== 99 || !LEGENDARY_IDS.includes(raw.legendary) || !["restart", "cleared"].includes(raw.mode)) return false;
  const defeated = !!legendary.defeated[raw.legendary];
  if (raw.mode === "cleared" && !defeated) return false;
  return { legendary: raw.legendary, mode: defeated ? "cleared" : "restart" };
}
var mergeEntitlement = (id) => id ? { id, ability: `merge:${id}`, completePieces: 3, level: 20, cooldownMultiplier: 0.5, cooldown: MERGE_POWERS[id].cooldown * 0.5 } : null;

// world.mjs
var WORLD_WIDTH = 6160;
var DEATH_Y = 890;
var REGIONS = [
  { x: 0, name: "Sunwash Strand", note: "A small beginning. A bigger adventure." },
  { x: 1940, name: "Driftwood Rise", note: "Take the high road, or follow the shore." },
  { x: 4020, name: "Lighthouse Point", note: "Every hero starts somewhere." }
];
var SURFACES = [
  { id: "sand-a", x: 0, y: 600, w: 1390, h: 320, kind: "sand" },
  { id: "sand-b", x: 1540, y: 600, w: 1170, h: 320, kind: "sand" },
  { id: "sand-c", x: 2860, y: 600, w: 1260, h: 320, kind: "sand" },
  { id: "sand-d", x: 4270, y: 600, w: 1890, h: 320, kind: "sand" },
  // Low, connected tide-pool routes make missed jumps forgiving.
  { id: "pool-a", x: 1380, y: 664, w: 170, h: 256, kind: "rock" },
  { id: "pool-b", x: 2700, y: 664, w: 170, h: 256, kind: "rock" },
  { id: "pool-c", x: 4110, y: 664, w: 170, h: 256, kind: "rock" },
  { id: "p1", x: 420, y: 480, w: 230, h: 28, kind: "grass", oneWay: true },
  { id: "p2", x: 740, y: 370, w: 250, h: 28, kind: "grass", oneWay: true },
  { id: "p3", x: 1080, y: 455, w: 220, h: 24, kind: "wood", oneWay: true },
  { id: "p4", x: 1580, y: 470, w: 230, h: 28, kind: "grass", oneWay: true },
  { id: "p5", x: 1890, y: 355, w: 260, h: 26, kind: "wood", oneWay: true },
  { id: "p6", x: 2250, y: 265, w: 330, h: 30, kind: "grass", oneWay: true },
  { id: "p7", x: 2600, y: 445, w: 290, h: 24, kind: "wood", oneWay: true },
  { id: "p8", x: 3030, y: 480, w: 230, h: 28, kind: "grass", oneWay: true },
  { id: "p9", x: 3340, y: 355, w: 260, h: 28, kind: "grass", oneWay: true },
  { id: "p10", x: 3690, y: 445, w: 260, h: 24, kind: "wood", oneWay: true },
  { id: "p11", x: 4380, y: 480, w: 240, h: 28, kind: "grass", oneWay: true },
  { id: "p12", x: 4720, y: 365, w: 300, h: 26, kind: "wood", oneWay: true },
  { id: "p13", x: 5120, y: 470, w: 240, h: 28, kind: "grass", oneWay: true }
];
var CAMPS = [{ x: 160, y: 600, name: "Shore camp" }, { x: 2340, y: 600, name: "Driftwood camp" }, { x: 4370, y: 600, name: "Lighthouse camp" }];
var COAST_TYPES = {
  bottle: { name: "Bottle Critter", hp: 34, damage: 5, speed: 43, xp: 14, coins: 1, w: 34, h: 49, color: "#65d9c6" },
  slime: { name: "Trash Slime", hp: 48, damage: 6, speed: 32, xp: 20, coins: 1, w: 53, h: 36, color: "#b1ce67" },
  crawler: { name: "Sand Crawler", hp: 60, damage: 7, speed: 54, xp: 26, coins: 1, w: 49, h: 32, color: "#efaa66" }
};
var SPAWNS = [
  ["bottle", 600, "sand-a"],
  ["bottle", 940, "sand-a"],
  ["slime", 1230, "sand-a"],
  ["bottle", 850, "p2"],
  ["slime", 1700, "sand-b"],
  ["crawler", 2010, "sand-b"],
  ["bottle", 2460, "sand-b"],
  ["slime", 2430, "p6"],
  ["crawler", 3100, "sand-c"],
  ["slime", 3500, "sand-c"],
  ["bottle", 3890, "sand-c"],
  ["bottle", 3470, "p9"],
  ["crawler", 4620, "sand-d"],
  ["slime", 4990, "sand-d"],
  ["bottle", 5350, "sand-d"],
  ["crawler", 5570, "sand-d"],
  ["bottle", 4880, "p12"]
];
var WORLD_REGIONS = [
  { id: 1, name: "Coastal Beginnings", levels: [1, 10], boss: "Trash Monster", theme: "coast", sky: ["#83c0c9", "#f6e3ad"], ground: "#c9aa6e", edge: "#f2dba0", accent: "#328b73", boards: REGIONS.map((b) => b.name), types: ["bottle", "slime", "crawler"] },
  { id: 2, name: "Polluted Forest", levels: [11, 20], boss: "Bushman", theme: "forest", sky: ["#5f9290", "#d4dbab"], ground: "#6c6650", edge: "#a6bc72", accent: "#48795c", boards: ["Briar Approach", "Sporewood Canopy", "Hollow Clearing"], types: ["sprout", "mushroom", "bark"] },
  { id: 3, name: "Industrial Wasteland", levels: [21, 35], boss: "Wastelander", theme: "factory", sky: ["#76818d", "#ddbb9b"], ground: "#5f7480", edge: "#e7bd76", accent: "#9d6850", boards: ["Scrapline Yard", "Furnace Walk", "Foundry Threshold"], types: ["scrap", "sludge", "drone"] },
  { id: 4, name: "Toxic Underground", levels: [36, 50], boss: "Giant Scorpion", theme: "cave", sky: ["#38445c", "#8b9f86"], ground: "#66637c", edge: "#c3b8d5", accent: "#b1ce67", boards: ["Violet Descent", "Acid Galleries", "Scorpion Vault"], types: ["scorpion", "beetle", "venomCrawler"] },
  { id: 5, name: "Mutated Territories", levels: [51, 65], boss: "Venomis", theme: "mutant", sky: ["#9b83a7", "#d4bf9e"], ground: "#80627f", edge: "#deb0b0", accent: "#b5ce73", boards: ["Overgrowth Verge", "Twisted Wilds", "Venomis Approach"], types: ["thornBeast", "stalker", "spitter"] },
  { id: 6, name: "Dark Energy Realm", levels: [66, 80], boss: "AtomDust", theme: "energy", sky: ["#3c486d", "#8e8cb1"], ground: "#545e88", edge: "#c8c4eb", accent: "#81b5cf", boards: ["Fractured Horizon", "Echo Causeway", "AtomDust Seal"], types: ["wisp", "phantom", "sentinel"] },
  { id: 7, name: "Final Showdown", levels: [81, 99], boss: "Ultimate Pollution Boss", theme: "final", sky: ["#8c666f", "#d5ad8a"], ground: "#705e65", edge: "#e2c2aa", accent: "#cc9773", boards: ["Last City Outskirts", "Broken Boulevard", "Final Gate"], types: ["apocalypse", "guardian", "titan"] }
];
var lineup = [
  ["sprout", "Thorn Sprout", 2, 11, 120, 10, 49, 90, 37, 52, "#8baf65", "lunge", "common"],
  ["mushroom", "Toxic Mushroom", 2, 15, 180, 14, 24, 125, 51, 48, "#bf8fbc", "spore", "common"],
  ["bark", "Bark Crawler", 2, 20, 250, 18, 65, 175, 57, 34, "#a88960", "skitter", "strong"],
  ["scrap", "Scrap Crawler", 3, 21, 300, 20, 78, 200, 53, 36, "#b4bdba", "skitter", "common"],
  ["sludge", "Sludge Beast", 3, 28, 420, 28, 38, 280, 65, 55, "#95a85a", "slam", "strong"],
  ["drone", "Rust Drone", 3, 35, 550, 35, 68, 360, 53, 45, "#c58756", "bolt", "strong"],
  ["scorpion", "Cave Scorpion", 4, 36, 650, 40, 80, 410, 58, 40, "#b49aca", "sting", "common"],
  ["beetle", "Acid Beetle", 4, 43, 820, 50, 57, 520, 51, 36, "#adc86d", "acid", "common"],
  ["venomCrawler", "Venom Crawler", 4, 50, 1e3, 60, 104, 650, 61, 32, "#a0b7bb", "pounce", "strong"],
  ["thornBeast", "Thorn Beast", 5, 51, 1200, 65, 75, 720, 70, 58, "#b19d65", "slam", "common"],
  ["stalker", "Mutant Stalker", 5, 58, 1550, 78, 118, 880, 46, 72, "#b18ea9", "pounce", "strong"],
  ["spitter", "Poison Spitter", 5, 65, 1900, 90, 57, 1040, 60, 51, "#a7c879", "spit", "strong"],
  ["wisp", "Shadow Wisp", 6, 66, 2200, 100, 95, 1160, 38, 47, "#9896cf", "orb", "common"],
  ["phantom", "Energy Phantom", 6, 73, 2850, 120, 110, 1400, 49, 67, "#91bccc", "phase", "strong"],
  ["sentinel", "Dark Sentinel", 6, 80, 3500, 140, 66, 1650, 62, 81, "#858fae", "pulse", "elite"],
  ["apocalypse", "Apocalypse Mutant", 7, 81, 4e3, 150, 125, 1800, 59, 66, "#c88b91", "pounce", "common"],
  ["guardian", "Corrupted Guardian", 7, 90, 5500, 185, 89, 2250, 66, 83, "#afa2b5", "volley", "strong"],
  ["titan", "Pollution Titan", 7, 99, 7e3, 220, 49, 2800, 81, 95, "#b4a584", "quake", "elite"]
];
var TYPES = {
  ...Object.fromEntries(Object.entries(COAST_TYPES).map(([id, info], i) => [id, { ...info, region: 1, level: [1, 4, 8][i], behavior: ["lunge", "hop", "skitter"][i], rank: "common", peaceful: i < 2 }])),
  ...Object.fromEntries(lineup.map(([id, name, region, level, hp, damage, speed, xp, w, h, color, behavior, rank]) => [id, { name, region, level, hp, damage, speed, xp, w, h, color, behavior, rank, coins: 1, flying: ["drone", "wisp", "phantom"].includes(id) }]))
};
var regionDefinition = (id) => WORLD_REGIONS.find((r) => r.id === id) || WORLD_REGIONS[0];
var boardIndex = (x) => x >= 4020 ? 2 : x >= 1940 ? 1 : 0;
function regionSurfaces(id) {
  if (id === 1) return SURFACES;
  const region = regionDefinition(id), offsets = [0, -20, 25, -35, 15, 0];
  const result = SURFACES.map((s, i) => ({ ...s, kind: s.kind === "wood" ? id === 2 || id === 5 ? "wood" : "metal" : region.theme, y: s.oneWay ? s.y + offsets[(i + id) % 6] : s.y }));
  result.push({ id: "high-a", x: 1160, y: 275 - id % 3 * 20, w: 210, h: 26, kind: region.theme, oneWay: true }, { id: "high-b", x: 3870, y: 300 + id % 2 * 25, w: 200, h: 26, kind: region.theme, oneWay: true });
  if (id === 4) result.push({ id: "cave-roof", x: 3040, y: 110, w: 750, h: 40, kind: "cave" });
  return result;
}
var regionCamps = (id) => CAMPS.map((c, i) => ({ ...c, name: id === 1 ? c.name : `${regionDefinition(id).boards[i]} camp` }));
function regionSpawns(id) {
  if (id === 1) return SPAWNS;
  const types = regionDefinition(id).types;
  return SPAWNS.map(([_, x, surface], i) => [types[(i + Math.floor(x / 1900)) % 3], x, surface]);
}
var GATES = Object.freeze({ back: 44, arena: 5840, forward: 6070 });

// eris.mjs
var APPEARANCE_PRICES = Object.freeze({ hair: 100, eyes: 100, skin: 150, face: 200, body: 300, age: 300, makeover: 750 });
var GROUPS = { hair: ["hair", "hairColor"], eyes: ["eyes"], skin: ["skin"], face: ["face", "eyeShape", "brows", "nose", "mouth", "facialHair"], body: ["presentation", "height", "build", "shoulders", "muscle", "torso", "arms", "legs"], age: ["age"] };
var emptyEconomy = () => ({ revision: 0, purchased: 0, sold: 0, discarded: 0, coinsSpent: 0, coinsSold: 0, recent: [] });
function normalizeEconomy(raw) {
  if (raw == null) return emptyEconomy();
  const keys = ["revision", "purchased", "sold", "discarded", "coinsSpent", "coinsSold"];
  if (keys.some((k) => !Number.isSafeInteger(raw[k]) || raw[k] < 0) || !Array.isArray(raw.recent) || raw.recent.length > 20) return null;
  if (raw.recent.some((r) => !r || !Number.isSafeInteger(r.id) || r.id < 1 || r.id > raw.revision || !["purchase", "sale", "discard", "reward", "appearance", "roots", "upgrade", "equip", "chest", "heal", "legendary"].includes(r.kind) || !Number.isFinite(r.coins))) return null;
  return { ...Object.fromEntries(keys.map((k) => [k, raw[k]])), recent: raw.recent.map((r) => ({ id: r.id, kind: r.kind, coins: r.coins })) };
}
function normalizeSanctuary(raw, world, arena) {
  if (raw == null) return null;
  const r = raw.returnLocation, l = world.location;
  if (r?.arena === true) {
    if (arena?.mode !== "cleared" || r.region !== world.region || ![r.x, r.y].every(Number.isFinite) || r.x < 17 || r.x > 1803 || r.y < -512 || r.y > 890) return false;
    return { returnLocation: { region: r.region, board: boardIndex(r.x), x: r.x, y: r.y, face: r.face === -1 ? -1 : 1, vx: 0, vy: 0, jumps: 0, arena: true } };
  }
  if (!r || !l || r.region !== world.region || r.board !== boardIndex(r.x) || !Number.isFinite(r.x) || !Number.isFinite(r.y) || r.x !== l.x || r.y !== l.y || arena) return false;
  return { returnLocation: { region: r.region, board: r.board, x: r.x, y: r.y, face: l.face, vx: l.vx, vy: l.vy, jumps: l.jumps } };
}
function appearanceQuote(current, draft) {
  const next = sanitizeLook({ ...draft, name: current.name }), groups = Object.entries(GROUPS).filter(([, keys]) => keys.some((k) => next[k] !== current[k])).map(([id]) => id);
  const subtotal = groups.reduce((s, id) => s + APPEARANCE_PRICES[id], 0), cost = Math.min(APPEARANCE_PRICES.makeover, subtotal);
  const changed = Object.keys(next).some((k) => next[k] !== current[k]);
  return { next, groups, cost, subtotal, makeover: subtotal >= APPEARANCE_PRICES.makeover, changed };
}
var failed = (error) => ({ ok: false, error });
var erisMethods = {
  recordEconomy(kind, coins = 0) {
    this.economy.revision++;
    this.economy.recent.push({ id: this.economy.revision, kind, coins });
    this.economy.recent = this.economy.recent.slice(-20);
    if (coins < 0) this.economy.coinsSpent -= coins;
  },
  retireItem(uid, reason = "discarded") {
    this.inventory.retired[uid] = reason;
    for (const r of Object.values(this.legendary?.defeated || {})) {
      const p = r.pieces.find((p2) => p2.uid === uid);
      if (p) {
        p.state = "discarded";
        this.legendary.revision++;
      }
    }
    for (const [part, id] of Object.entries(this.inventory.equipped)) if (id === uid) delete this.inventory.equipped[part];
    if (reason === "sold") this.economy.sold++;
    else this.economy.discarded++;
  },
  visitTree() {
    if (this.treeVisit) return true;
    if (!this.canTravel()) return false;
    const h = this.hero;
    this.sanctuary = { returnLocation: { region: this.regionId, board: boardIndex(h.x), x: h.x, y: h.y, face: h.face, vx: h.vx, vy: h.vy, jumps: h.jumps, ...this.arenaScene ? { arena: true } : {} } };
    this.treeVisit = true;
    this.paused = true;
    return true;
  },
  leaveTree() {
    if (!this.treeVisit) return false;
    const r = this.sanctuary?.returnLocation;
    if (r && r.region === this.regionId && this.world.unlocked.includes(r.region)) {
      Object.assign(this.hero, { x: r.x, y: r.y, prevX: r.x, prevY: r.y, face: r.face, vx: r.vx, vy: r.vy, jumps: r.jumps });
      this.board = r.board;
    }
    this.treeVisit = false;
    this.sanctuary = null;
    return true;
  },
  shopReady() {
    return this.treeVisit && this.canSave() && !this.bossEncounter && this.inventory.pending.length === 0;
  },
  costumePreview(selection, discardUids = []) {
    if (!this.shopReady()) return failed("Visit the Tree of Eris safely and resolve pending rewards first.");
    const definitions = selection?.catalogId ? [COSTUME_CATALOG[selection.catalogId]] : Object.values(COSTUME_CATALOG).filter((d) => d.setId === selection?.setId && d.shop);
    if (!definitions.length || definitions.some((d) => !d?.shop) || !selection.catalogId && definitions.length !== 3) return failed("That costume is not sold here.");
    if (definitions.some((d) => d.level > this.hero.level)) return failed(`Requires hero level ${Math.max(...definitions.map((d) => d.level))}.`);
    const cost = definitions.reduce((s, d) => s + d.catalogValue, 0), needed = Math.max(0, this.inventory.items.length + definitions.length - 7);
    if (this.hero.coins < cost) return failed(`Need ${cost} coins. Your balance is ${this.hero.coins}.`);
    if (new Set(discardUids).size !== discardUids.length || discardUids.some((uid) => !this.inventory.items.some((i) => i.uid === uid))) return failed("Choose distinct owned items to discard.");
    if (discardUids.length !== needed) return { ok: false, error: `Choose ${needed} owned item${needed === 1 ? "" : "s"} to discard before buying.`, needed, cost, definitions };
    return { ok: true, cost, needed, definitions, discardUids: [...discardUids], revision: this.economy.revision };
  },
  buyCostume(selection, { discardUids = [], confirmed = false, revision } = {}) {
    if (!confirmed || revision !== this.economy.revision) return failed("Review this purchase again before confirming.");
    const q = this.costumePreview(selection, discardUids);
    if (!q.ok) return q;
    if (this.inventory.nextId + q.definitions.length >= 1e9) return failed("Item identifier limit reached.");
    for (const uid of discardUids) this.retireItem(uid);
    this.inventory.items = this.inventory.items.filter((i) => !discardUids.includes(i.uid));
    const items = q.definitions.map((d) => ({ uid: `drop-${this.inventory.nextId++}`, catalogId: d.id }));
    this.inventory.items.push(...items);
    this.hero.coins -= q.cost;
    this.economy.purchased += items.length;
    this.recordEconomy("purchase", -q.cost);
    this.refreshEquipment();
    return { ...q, items };
  },
  salePreview(uid) {
    const item = this.inventory.items.find((i) => i.uid === uid), def = itemDefinition(item), value = resaleValue(def);
    if (!this.shopReady()) return failed("Selling is available only at the central Costume Shop.");
    if (!def || value === null) return failed("This item cannot be sold. Legendary equipment has no resale.");
    if (this.hero.coins + value > 999999) return failed("Coin balance is full. Spend some coins before selling.");
    return { ok: true, uid, value, def, revision: this.economy.revision };
  },
  sellItem(uid, { confirmed = false, revision } = {}) {
    if (!confirmed || revision !== this.economy.revision) return failed("Review this sale again before confirming.");
    const q = this.salePreview(uid);
    if (!q.ok) return q;
    this.retireItem(uid, "sold");
    this.inventory.items = this.inventory.items.filter((i) => i.uid !== uid);
    this.hero.coins += q.value;
    this.economy.coinsSold += q.value;
    this.recordEconomy("sale", q.value);
    this.refreshEquipment();
    return q;
  },
  rootPreview(count = 1) {
    if (!this.nearTree() || !this.canSave()) return failed("Visit the Tree of Eris outside combat.");
    if (!Number.isInteger(count) || count < 1 || count > 4 - this.healthRoots) return failed(`Space for ${4 - this.healthRoots} Health Roots.`);
    const cost = count * 50;
    if (this.hero.coins < cost) return failed(`Need ${cost} coins.`);
    return { ok: true, count, cost, revision: this.economy.revision };
  },
  buyHealthRoot(count = 1) {
    const q = this.rootPreview(count);
    if (!q.ok) return false;
    this.hero.coins -= q.cost;
    this.healthRoots += count;
    this.recordEconomy("roots", -q.cost);
    this.emit("purchase");
    return true;
  },
  makeoverPreview(draft) {
    if (!this.shopReady()) return failed("Appearance changes are available at the Tree of Eris.");
    const q = appearanceQuote(this.look, draft);
    if (!q.changed) return { ...q, ...failed("No changes selected.") };
    if (this.hero.coins < q.cost) return { ...q, ...failed(`Need ${q.cost} coins.`) };
    return { ...q, ok: true, revision: this.economy.revision };
  },
  applyMakeover(draft, { confirmed = false, revision } = {}) {
    if (!confirmed || revision !== this.economy.revision) return failed("Review these appearance changes again.");
    const q = this.makeoverPreview(draft);
    if (!q.ok) return q;
    this.look = q.next;
    this.hero.coins -= q.cost;
    this.recordEconomy("appearance", -q.cost);
    return q;
  }
};

// world-state.mjs
var OPEN_REGIONS = Object.freeze([1, 2, 3, 4, 5, 6, 7]);
var WORLD_CLOCK_REFERENCE = Date.UTC(2026, 0, 1);
function initialWorld(now = Date.now()) {
  return { region: 1, unlocked: [...OPEN_REGIONS], bossVictories: [], clockReference: WORLD_CLOCK_REFERENCE, checkpoint: { region: 1, index: 0 }, activated: ["1:0"], visits: { "1:0": 1 }, kills: {}, monsters: [], location: null };
}
function normalizeWorld(raw, checkpoint = 0, now = Date.now()) {
  if (!raw) {
    const world = initialWorld(now);
    world.checkpoint.index = checkpoint;
    world.activated = [`1:${checkpoint}`];
    return world;
  }
  const integers = (a2, min, max) => Array.isArray(a2) && a2.every((n) => Number.isInteger(n) && n >= min && n <= max);
  if (!integers(raw.unlocked, 1, 7) || !raw.unlocked.includes(1) || !integers(raw.bossVictories, 1, 7)) return null;
  const unlocked = [...OPEN_REGIONS], bossVictories = [...new Set(raw.bossVictories)];
  const region = raw.region;
  if (!unlocked.includes(region)) return null;
  const cp = raw.checkpoint;
  if (!cp || !unlocked.includes(cp.region) || !Number.isInteger(cp.index) || cp.index < 0 || cp.index >= CAMPS.length) return null;
  if (!Number.isFinite(raw.clockReference) || raw.clockReference < 0) return null;
  if (!Array.isArray(raw.activated) || !raw.activated.every((id) => /^[1-7]:[0-2]$/.test(id) && unlocked.includes(Number(id[0]))) || !raw.activated.includes(`${cp.region}:${cp.index}`)) return null;
  const visits = {}, kills = {};
  for (const [key, val] of Object.entries(raw.visits || {})) if (/^[1-7]:[0-2]$/.test(key) && Number.isSafeInteger(val) && val >= 0) visits[key] = val;
  for (const [key, val] of Object.entries(raw.kills || {})) if (Object.hasOwn(TYPES, key) && Number.isSafeInteger(val) && val >= 0) kills[key] = val;
  const camp = regionCamps(region)[region === cp.region ? cp.index : 0], l = raw.location;
  let location = null;
  if (l) {
    if (!Number.isFinite(l.x) || !Number.isFinite(l.y) || l.x < 17 || l.x > 6143 || l.y < -512 || l.y > 890 || !Number.isFinite(l.hp) || l.hp <= 0) return null;
    if (regionSurfaces(region).some((s) => !s.oneWay && l.x + 17 > s.x && l.x - 17 < s.x + s.w && l.y > s.y + 0.01 && l.y - 88 < s.y + s.h)) return null;
    location = { x: l.x, y: l.y, face: l.face === -1 ? -1 : 1, hp: l.hp, vx: Number.isFinite(l.vx) ? Math.max(-600, Math.min(600, l.vx)) : 0, vy: Number.isFinite(l.vy) ? Math.max(-900, Math.min(900, l.vy)) : 0, jumps: Number.isInteger(l.jumps) ? Math.max(0, Math.min(2, l.jumps)) : 1 };
  }
  if (!Array.isArray(raw.monsters) || raw.monsters.length > 24) return null;
  const seen = /* @__PURE__ */ new Set(), monsters = [];
  for (const m of raw.monsters) {
    if (!m || !Number.isInteger(m.id) || m.id < 0 || m.id > 23 || seen.has(m.id) || !Object.hasOwn(TYPES, m.type) || TYPES[m.type].region !== region || !Number.isFinite(m.hp) || m.hp < 0 || m.hp > TYPES[m.type].hp || !Number.isFinite(m.respawn) || m.respawn < 0 || m.respawn > 180) return null;
    seen.add(m.id);
    monsters.push({ id: m.id, type: m.type, hp: m.hp, respawn: m.respawn });
  }
  return { region, unlocked, bossVictories, clockReference: WORLD_CLOCK_REFERENCE, checkpoint: { ...cp }, activated: [...new Set(raw.activated)], visits, kills, monsters, location };
}

// journey.mjs
function initializeJourney(g, save, now) {
  g.now = now;
  g.world = structuredClone(save?.world || initialWorld(now()));
  g.regionId = g.world.region;
  g.camps = regionCamps(g.regionId);
  g.healthRoots = save?.healthRoots || 0;
  g.inventory = structuredClone(save?.inventory || emptyInventory());
  g.enemyShots = [];
  g.treeVisit = false;
  g.bossEncounter = null;
  g.board = 0;
}
var journeyMethods = {
  nearPortal() {
    return !this.arenaScene && !this.treeVisit && this.camps.some((c) => Math.abs(this.hero.x - (c.x + 90)) <= 90 && Math.abs(this.hero.y - c.y) < 100);
  },
  getRegion() {
    return regionDefinition(this.regionId);
  },
  clock() {
    return worldClock(this.world.clockReference, this.now(), this.regionId);
  },
  refreshEquipment() {
    const earned = equipmentBonuses(this.inventory, this.hero?.level || 99), base = this.baseEquipment;
    const active = matchingMerge(this.inventory, this.hero?.level || 99);
    if (this.legendary.active !== active) this.cancelMergeEffects();
    this.legendary.active = active;
    if (this.powers) this.powers.mergeEntitlement = mergeEntitlement(active);
    this.equipment = equipmentStats(Object.fromEntries(Object.keys(earned).map((k) => [k, earned[k] + (base?.[k] || 0)])));
  },
  visualOutfit() {
    return equipmentOutfit(this.inventory, this.outfit);
  },
  canSave() {
    return !this.hero.dead && !this.inCombat();
  },
  canTravel() {
    return !this.treeVisit && this.canSave() && !this.bossEncounter && this.inventory.pending.length === 0 && !this.pendingMergeReward();
  },
  visitTree() {
    if (!this.canTravel()) return false;
    this.treeVisit = true;
    return true;
  },
  leaveTree() {
    this.treeVisit = false;
  },
  // Visiting is a modal sanctuary; the world location is never changed.
  useHealthRoot() {
    const h = this.hero;
    if (h.dead || this.healthRoots < 1 || h.hp >= h.maxHp) return false;
    this.healthRoots--;
    h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.25);
    this.recordEconomy("heal");
    this.emit("heal");
    return true;
  },
  buyHealthRoot() {
    if (!this.nearTree() || !this.canSave() || this.healthRoots >= LOOT.rootLimit || this.hero.coins < LOOT.rootPrice) return false;
    this.hero.coins -= LOOT.rootPrice;
    this.healthRoots++;
    this.emit("purchase");
    return true;
  },
  equipItem(uid) {
    if (!this.canSave() || !this.paused) return false;
    const item = this.inventory.items.find((i) => i.uid === uid), def = itemDefinition(item);
    if (!def || this.hero.level < (def.level || 1)) return false;
    const paired = { mask: "helmet", helmet: "mask", suit: "chest", chest: "suit" };
    const worn = itemDefinition(this.inventory.items.find((i) => i.uid === (this.inventory.equipped[def.part] || this.inventory.equipped[paired[def.part]])));
    if ((def.rarity === "legendary" || worn?.rarity === "legendary") && !this.treeVisit) return false;
    if (this.inventory.equipped[def.part] === uid) delete this.inventory.equipped[def.part];
    else {
      if (def.part === "helmet") delete this.inventory.equipped.mask;
      if (def.part === "mask") delete this.inventory.equipped.helmet;
      if (def.part === "chest") delete this.inventory.equipped.suit;
      if (def.part === "suit") delete this.inventory.equipped.chest;
      this.inventory.equipped[def.part] = uid;
    }
    this.recordEconomy("equip");
    this.refreshEquipment();
    return true;
  },
  discardItem(uid, confirmed = false) {
    if (!confirmed || !this.canSave()) return false;
    const i = this.inventory.items.findIndex((item) => item.uid === uid);
    if (i < 0) return false;
    this.retireItem(uid);
    this.recordEconomy("discard");
    this.inventory.items.splice(i, 1);
    for (const [part, id] of Object.entries(this.inventory.equipped)) if (id === uid) delete this.inventory.equipped[part];
    this.refreshEquipment();
    return true;
  },
  resolveReward(uid, confirmed = false) {
    if (!confirmed || !this.canSave() || !this.inventory.pending.length) return false;
    if (uid === null) {
      this.retireItem(this.inventory.pending[0].uid);
      this.recordEconomy("discard");
      this.inventory.pending.shift();
      return true;
    }
    const index = this.inventory.items.findIndex((i) => i.uid === uid);
    if (index < 0) return false;
    for (const [part, id] of Object.entries(this.inventory.equipped)) if (id === uid) delete this.inventory.equipped[part];
    this.retireItem(uid);
    this.recordEconomy("reward");
    this.inventory.items.splice(index, 1, this.inventory.pending.shift());
    this.refreshEquipment();
    return true;
  },
  gainXP(amount) {
    const h = this.hero;
    if (!Number.isFinite(amount) || amount <= 0 || h.level >= 99) return;
    h.xp += Math.floor(amount);
    while (h.level < 99 && h.xp >= xpForLevel(h.level)) {
      h.xp -= xpForLevel(h.level);
      h.level++;
      h.maxHp = maximumHP(h.level);
      h.hp = h.maxHp;
      this.powers.data.points++;
      this.emit("level", { level: h.level });
    }
    if (h.level === 99) h.xp = 0;
  },
  reward(e) {
    if (e.rewarded) return;
    e.rewarded = true;
    const h = this.hero, info = TYPES[e.type];
    if (!info) return;
    this.kills++;
    this.species.add(e.type);
    this.world.kills[e.type] = (this.world.kills[e.type] || 0) + 1;
    const xp = monsterXP(info.xp, h.level, e.level || info.level), summoned = e.summoned === true, regular = !isBoss(e), coins = regular && !summoned ? this.clock().night ? 2 : 1 : 0;
    h.coins = Math.min(999999, h.coins + coins);
    this.gainXP(xp);
    let root = false, item = null;
    if (regular && !summoned) {
      if (this.random() < LOOT.rootChance && this.healthRoots < LOOT.rootLimit) {
        this.healthRoots++;
        root = true;
      }
      item = rollEquipment(info.region, this.random, this.inventory.nextId);
      if (item) {
        this.inventory.nextId++;
        this.inventory.pending.push(item);
        this.emit("equipment", { item, pending: this.inventory.pending.length > 0 });
      }
    }
    this.emit("reward", { x: e.x, y: e.y - 24, xp, coins, root, item: !!item, enemy: info.name });
  },
  loadRegion(id, { x, y, checkpoint = false } = {}) {
    if (this.treeVisit) return false;
    if (this.arenaScene) this.leaveBoss("travel");
    this.powers.cancelEffects();
    this.hero.attack = null;
    this.hero.attackBuffer = null;
    this.enemyShots = [];
    this.regionId = id;
    this.world.region = id;
    this.camps = regionCamps(id);
    this.surfaces = regionSurfaces(id);
    this.enemies = regionSpawns(id).map(([type, sx, surface], i) => this.makeEnemy(type, sx, surface, i));
    const camp = this.camps[0], h = this.hero;
    Object.assign(h, { x: x ?? camp.x, y: y ?? camp.y, prevX: x ?? camp.x, prevY: y ?? camp.y, vx: 0, vy: 0, grounded: true, jumps: 0, jumpBuffer: 0, invulnerable: 2, pose: "idle" });
    this.board = boardIndex(h.x);
    this.combatTimer = 0;
    if (checkpoint) {
      this.checkpoint = 0;
      this.world.checkpoint = { region: id, index: 0 };
      const key = `${id}:0`;
      if (!this.world.activated.includes(key)) this.world.activated.push(key);
    }
    this.world.visits[`${id}:${this.board}`] = (this.world.visits[`${id}:${this.board}`] || 0) + 1;
    this.emit("region", { name: this.getRegion().name });
  },
  travel(id) {
    if (!this.canTravel() || !Number.isInteger(id) || id < 1 || id > 7) return false;
    this.loadRegion(id, { checkpoint: true });
    return true;
  },
  usePassage() {
    if (!this.canTravel() || !this.hero.grounded) return false;
    const x = this.hero.x, id = this.regionId;
    if (x < 110 && id > 1) {
      this.loadRegion(id - 1, { checkpoint: true });
      return true;
    }
    if (x > GATES.forward - 75 && id < 7) {
      this.loadRegion(id + 1, { checkpoint: true });
      return true;
    }
    if (Math.abs(x - GATES.arena) < 110) return this.enterBoss();
    return false;
  },
  returnCheckpoint() {
    if (!this.canTravel()) return false;
    this.respawn();
    return true;
  },
  enterBoard(index) {
    if (index === this.board) return;
    this.board = index;
    const key = `${this.regionId}:${index}`, returning = !!this.world.visits[key];
    this.world.visits[key] = (this.world.visits[key] || 0) + 1;
    if (returning) {
      for (const e of this.enemies) if (boardIndex(e.spawnX) === index && e.state === "dead") e.respawn = 0;
    }
    this.emit("board");
  },
  respawnDelay(e) {
    return RESPAWN[TYPES[e.type]?.rank] || RESPAWN.common;
  },
  monsterDamage(e) {
    if (e.legendaryHelper) return e.damage;
    if (isBoss(e)) return e.damage ?? TYPES[e.type]?.damage ?? 0;
    return TYPES[e.type].damage * (this.clock().night && !isBoss(e) ? 2 : 1);
  }
};

// monsters.mjs
var clamp4 = (n, a2, b) => Math.max(a2, Math.min(b, n));
var ranged = /* @__PURE__ */ new Set(["spore", "bolt", "acid", "spit", "orb", "pulse", "volley"]);
function advancedEnemy(g, e, dt) {
  const info = TYPES[e.type], h = g.hero, d = h.x - e.x, scale2 = e.rooted ? 0.5 : 1;
  const range = ranged.has(info.behavior) ? 310 : info.behavior === "quake" ? 125 : 85;
  const left = Math.max(e.surface.x + e.w / 2 + 5, e.spawnX - 220), right = Math.min(e.surface.x + e.surface.w - e.w / 2 - 5, e.spawnX + 220);
  const engaged = !h.dead && !g.isSafeCamp() && Math.abs(h.x - e.spawnX) < 400 && Math.abs(h.y - e.y) < (e.flying ? 180 : 95);
  if (e.flying) {
    const targetY = e.surface.y - 50 - Math.sin(g.time * (info.behavior === "phase" ? 3 : 1.8) + e.id) * 18;
    g.moveEnemyAir(e, e.x, e.y + clamp4(targetY - e.y, -110 * dt, 110 * dt));
  }
  const move = (speed) => {
    const nx = clamp4(e.x + e.face * speed * scale2 * dt, left, right);
    if (e.flying) g.moveEnemyAir(e, nx, e.y);
    else e.x = nx;
  };
  if (e.state === "patrol") {
    if (engaged && Math.abs(d) < range) {
      e.face = Math.sign(d) || e.face;
      e.state = "warn";
      e.age = 0;
      return;
    }
    if (engaged) e.face = Math.sign(d) || e.face;
    if (e.x <= left) e.face = 1;
    if (e.x >= right) e.face = -1;
    move(info.speed * (info.behavior === "phase" ? 1 + Math.sin(g.time * 3) * 0.35 : 1));
  } else if (e.state === "warn" && e.age >= Math.max(0.38, 0.8 - info.region * 0.045)) {
    e.state = "strike";
    e.age = 0;
    e.hit = false;
    if (info.behavior === "pounce") {
      e.airborne = true;
      e.vy = -260;
      e.airVx = e.face * info.speed * 1.8;
      e.pouncing = true;
    }
  } else if (e.state === "strike") {
    if (!ranged.has(info.behavior)) move(info.speed * (info.behavior === "skitter" ? 2.1 : info.behavior === "lunge" ? 2 : 1.25));
    if (!e.hit && e.age >= 0.08) {
      e.hit = true;
      if (ranged.has(info.behavior)) {
        const count = info.behavior === "volley" ? 3 : info.behavior === "pulse" ? 2 : 1;
        const x = e.x + e.face * (e.w / 2 + 8), y = e.y - e.h * 0.55, angle = Math.atan2(h.y - h.h * 0.5 - y, h.x - x), speed = 175 + info.region * 18;
        for (let i = 0; i < count; i++) if (g.enemyShots.length < 32) {
          const a2 = angle + (i - (count - 1) / 2) * 0.16;
          g.enemyShots.push({ x, y, vx: Math.cos(a2) * speed, vy: Math.sin(a2) * speed, life: 2.6, source: e, color: info.color });
        }
      } else if (Math.abs(h.y - e.y) < (info.behavior === "slam" ? 85 : 65) && Math.abs(h.x - e.x) < range && (h.x - e.x) * e.face > -20) g.hurt(g.monsterDamage(e), e.x, e);
    }
    if (e.age > 0.28) {
      e.state = "recover";
      e.age = 0;
    }
  } else if (e.state === "recover" && e.age > Math.max(0.65, 1.25 - info.region * 0.06)) {
    e.state = "patrol";
    e.age = 0;
  }
}
function stepEnemyProjectiles(g, dt) {
  for (const p of g.enemyShots) {
    if (p.gravity) p.vy += p.gravity * dt;
    const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt, h = g.heroBox();
    const hit = segmentHit(p.x, p.y, nx, ny, h, 5), wall = g.surfaces.filter((s) => !s.oneWay).map((s) => segmentHit(p.x, p.y, nx, ny, s, 5)).filter((t) => t !== null).sort((a2, b) => a2 - b)[0];
    if (hit !== null && (wall === void 0 || hit < wall)) {
      g.hurt(p.damage ?? g.monsterDamage(p.source), p.x, p.source);
      p.life = 0;
    } else if (wall !== void 0) {
      if (p.bounce > 0 && p.vy > 0 && p.y < 595) {
        p.bounce--;
        p.vy = -Math.max(180, Math.abs(p.vy) * 0.7);
        p.y = 589;
      } else p.life = 0;
    }
    p.x = nx;
    if (!(wall !== void 0 && p.bounce >= 0 && p.vy < 0)) p.y = ny;
    p.life -= dt;
  }
  g.enemyShots = g.enemyShots.filter((p) => p.life > 0);
}

// core.mjs
var STEP = 1 / 60;
var LEVEL_CAP = 99;
var clamp5 = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
var approach = (v, target, amount) => v < target ? Math.min(v + amount, target) : Math.max(v - amount, target);
var overlaps2 = (a2, b) => a2.x < b.x + b.w && a2.x + a2.w > b.x && a2.y < b.y + b.h && a2.y + a2.h > b.y;
var ATTACKS = Object.freeze({
  punch: { startup: 0.055, active: 0.105, duration: 0.27, reach: 59, damage: 13 },
  kick: { startup: 0.1, active: 0.13, duration: 0.39, reach: 76, damage: 19 }
});
function decodeSave(text) {
  try {
    const data = JSON.parse(text);
    if (!data || ![1, 2, 3, 4, 5, 6, 7, 8].includes(data.version) || data.version >= 2 && (!data.look || typeof data.look !== "object")) return null;
    if (data.version >= 6 && (!data.economy || data.inventory?.retired == null || !Object.hasOwn(data, "sanctuary"))) return null;
    const integer2 = (value, max) => clamp5(Math.floor(Number(value) || 0), 0, max);
    const level = Math.max(1, integer2(data.level, LEVEL_CAP));
    const powers = normalizePowers(data.version >= 3 ? data.powers : null, level, { strict: data.version >= 3 });
    if (!powers) return null;
    const checkpoint = integer2(data.checkpoint, CAMPS.length - 1);
    const world = normalizeWorld(data.version >= 4 ? data.world : null, checkpoint), inventory = data.version >= 4 ? normalizeInventory(data.inventory) : emptyInventory();
    if (!world || !inventory || data.version >= 4 && (!data.world || !Number.isInteger(data.healthRoots) || data.healthRoots < 0 || data.healthRoots > 4)) return null;
    if (Object.values(inventory.equipped).some((uid) => (itemDefinition(inventory.items.find((i) => i.uid === uid))?.level || 1) > level)) return null;
    const bossProgress = normalizeBossProgress(data.version >= 5 ? data.bossProgress : null, world.bossVictories, { strict: data.version >= 5 });
    if (!bossProgress) return null;
    const legendary = normalizeLegendary(data.version >= 7 ? data.legendary : null, inventory, level);
    if (!legendary || data.version >= 7 && !data.legendary) return null;
    const legendaryArena = normalizeLegendaryArena(data.arena, legendary, level);
    if (legendaryArena?.mode === "restart" && !powers.equipped.some((id) => id && powers.levels[id])) return null;
    const arena = legendaryArena === void 0 ? normalizeArena(data.version >= 5 ? data.arena : null, world, bossProgress) : legendaryArena;
    if (arena === false) return null;
    const economy = normalizeEconomy(data.version >= 6 ? data.economy : null), sanctuary = normalizeSanctuary(data.version >= 6 ? data.sanctuary : null, world, arena);
    if (!economy || sanctuary === false) return null;
    return {
      version: 8,
      legendary,
      economy,
      sanctuary,
      bossProgress,
      arena,
      powers,
      world,
      inventory,
      healthRoots: data.version >= 4 ? data.healthRoots : 0,
      look: sanitizeLook(data.look),
      outfit: sanitizeOutfit(data.outfit),
      level,
      xp: level === 99 ? 0 : integer2(data.xp, xpForLevel(level) - 1),
      coins: integer2(data.coins, 999999),
      checkpoint: integer2(data.checkpoint, CAMPS.length - 1),
      kills: integer2(data.kills, 999999),
      species: [...new Set((Array.isArray(data.species) ? data.species : []).filter((t) => Object.hasOwn(TYPES, t)))],
      reachedEnd: data.reachedEnd === true
    };
  } catch {
    return null;
  }
}
var Game = class {
  constructor({ look, save = null, surfaces = null, random = Math.random, equipment = {}, now = sharedNow } = {}) {
    this.look = sanitizeLook(look ?? save?.look);
    this.outfit = sanitizeOutfit(save?.outfit);
    this.surfaces = surfaces || regionSurfaces(save?.world?.region || 1);
    this.time = 0;
    this.paused = false;
    this.checkpoint = save?.checkpoint || 0;
    this.kills = save?.kills || 0;
    this.species = new Set(save?.species || []);
    this.reachedEnd = save?.reachedEnd || false;
    this.legendary = structuredClone(save?.legendary || emptyLegendary());
    this.initializeLegendaryRuntime();
    this.initializeMergeRuntime();
    this.economy = structuredClone(save?.economy || emptyEconomy());
    this.sanctuary = structuredClone(save?.sanctuary || null);
    this.random = random;
    this.baseEquipment = equipmentStats(equipment);
    this.combatTimer = 0;
    initializeJourney(this, save, now);
    this.initializeBosses(save);
    this.refreshEquipment();
    this.events = [];
    this.attackSerial = 0;
    this.deathTimer = 0;
    this.started = false;
    const camp = this.camps[this.world.checkpoint.region === this.regionId ? this.world.checkpoint.index : 0], level = save?.level || 1;
    this.hero = {
      x: camp.x,
      y: camp.y,
      prevX: camp.x,
      prevY: camp.y,
      w: 34,
      h: 88,
      vx: 0,
      vy: 0,
      face: 1,
      prevFace: 1,
      grounded: true,
      jumps: 0,
      coyote: 0.1,
      jumpBuffer: 0,
      level,
      xp: save?.xp || 0,
      coins: save?.coins || 0,
      hp: 100 + (level - 1) * 15,
      maxHp: 100 + (level - 1) * 15,
      invulnerable: 1.7,
      attack: null,
      attackBuffer: null,
      pose: "idle",
      cycle: 0,
      landing: 0,
      stun: 0,
      dead: false,
      jumpAge: 100,
      hurtAge: 100,
      defeatAge: 0,
      respawnAge: 100
    };
    this.refreshEquipment();
    this.powers = new PowerSystem(this, normalizePowers(save?.powers, level) || normalizePowers(null, level));
    this.refreshEquipment();
    this.enemies = regionSpawns(this.regionId).map(([type, x, surface], id) => this.makeEnemy(type, x, surface, id));
    const location = save?.world?.location;
    if (location) {
      Object.assign(this.hero, { x: location.x, y: location.y, prevX: location.x, prevY: location.y, face: location.face, hp: clamp5(location.hp || this.hero.maxHp, Number.EPSILON, this.hero.maxHp), vx: location.vx || 0, vy: location.vy || 0, jumps: location.jumps || 0, grounded: this.surfaces.some((s) => location.x >= s.x && location.x <= s.x + s.w && Math.abs(location.y - s.y) < 0.01) });
    }
    if (location && !this.hero.grounded) {
      this.hero.coyote = 0;
      this.hero.jumps = Math.max(1, this.hero.jumps);
    }
    this.board = boardIndex(this.hero.x);
    for (const old of save?.world?.monsters || []) {
      const e = this.enemies.find((e2) => e2.id === old.id && e2.type === old.type);
      if (e) {
        e.hp = old.hp;
        e.respawn = old.respawn;
        if (e.hp <= 0) {
          e.state = "dead";
          e.rewarded = true;
        }
      }
    }
    if (save?.arena) {
      if (save.arena.legendary) this.startLegendaryScene(save.arena.legendary, save.arena.mode);
      else this.startBossScene(save.arena.mode);
    }
    if (this.sanctuary) {
      this.treeVisit = true;
      this.paused = true;
      if (this.sanctuary.returnLocation.arena) {
        const r = this.sanctuary.returnLocation;
        Object.assign(this.hero, { x: r.x, y: r.y, prevX: r.x, prevY: r.y });
      }
    }
  }
  makeEnemy(type, x, surface, id) {
    const ground = this.surfaces.find((s) => s.id === surface) || this.surfaces[0];
    const info = TYPES[type];
    for (const camp of this.camps) if (Math.abs(ground.y - camp.y) < 80 && Math.abs(x - camp.x) < 210) {
      x = clamp5(camp.x + (x >= camp.x ? 1 : -1) * (210 + info.w / 2), ground.x + info.w / 2, ground.x + ground.w - info.w / 2);
    }
    const y = ground.y - (info.flying ? 50 : 0);
    return {
      id,
      type,
      level: info.level,
      flying: !!info.flying,
      x,
      y,
      prevX: x,
      prevY: y,
      spawnX: x,
      surface: ground,
      spawnSurface: ground,
      provoked: false,
      rewarded: false,
      hp: info.hp,
      maxHp: info.hp,
      w: info.w,
      h: info.h,
      face: id % 2 ? -1 : 1,
      state: "patrol",
      age: id * 0.13,
      flash: 0,
      stagger: 0,
      respawn: 0,
      protection: 0.8,
      hit: false
    };
  }
  attackDefinition(kind) {
    return { ...ATTACKS[kind], damage: ATTACKS[kind].damage + 3 * (this.hero.level - 1) + this.equipment.damage + this.equipment.strength * 0.5 };
  }
  markCombat() {
    this.combatTimer = PROGRESSION.combatGrace;
  }
  inCombat() {
    return !!this.bossEncounter || this.combatTimer > 1e-8 || !!this.hero.attack || Object.entries(this.powers.active).some(([id]) => POWERS[id].offensive) || this.powers.projectiles.length > 0 || this.powers.bursts.length > 0 || this.enemyShots.length > 0 || this.mergeEffects.some((e) => e.offensive) || this.mergeShots.length > 0;
  }
  nearTree() {
    return !this.hero.dead && (this.treeVisit || !this.arenaScene && this.hero.grounded && Math.abs(this.hero.x - BALANCE.tree.x) < 85 && Math.abs(this.hero.y - BALANCE.tree.y) < 40);
  }
  upgradePreview(id, count = 1) {
    if (!Object.hasOwn(POWERS, id)) return { ok: false, error: "Unknown power." };
    const levels = this.powers.data.levels, current = levels[id];
    if (!Number.isInteger(count) || count < 1 || current + count > 20) return { ok: false, error: "Choose 1\u201320 levels within the ability cap." };
    if (this.inCombat()) return { ok: false, error: "Leave combat before spending Power Points." };
    if (!this.nearTree()) return { ok: false, error: "Visit the Tree of Eris from Pause or beside camp to upgrade." };
    if (count > this.powers.data.points) return { ok: false, error: "Not enough Power Points. Earn one each hero level." };
    return { ok: true, id, count, current, next: current + count };
  }
  upgradePower(id, count = 1) {
    const preview = this.upgradePreview(id, count);
    if (!preview.ok) return preview;
    this.powers.data.levels[id] += count;
    this.powers.data.points -= count;
    this.recordEconomy("upgrade");
    this.emit("upgrade", { id, count });
    return preview;
  }
  equipPower(index, id) {
    if (!Number.isInteger(index) || index < 0 || index >= 3 || this.inCombat() || !this.paused || this.hero.dead) return false;
    if (id !== null && (!Object.hasOwn(POWERS, id) || POWERS[id].passive || !this.powers.data.levels[id])) return false;
    const slots = this.powers.data.equipped, old = slots[index], other = slots.indexOf(id);
    if (id !== null && other >= 0 && other !== index) slots[other] = old;
    else if (old && old !== id) this.powers.end(old);
    slots[index] = id;
    return true;
  }
  damageEnemy(e, amount, { kind = "punch", knock = 0, face = this.hero.face, stagger = true } = {}) {
    if (e.state === "dead" || e.protection > 0 || !Number.isFinite(amount) || amount <= 0) return false;
    if (e.legendary && e.state === "active" && e.attack?.shape === "barrier") amount *= 0.5;
    this.markCombat();
    e.provoked = true;
    e.hp = Math.max(0, e.hp - amount);
    e.flash = 0.12;
    if (stagger && !isBoss(e)) {
      e.stagger = 0.26;
      e.state = "recover";
      e.age = 0;
    }
    if (knock && !e.rooted && !e.lifted && !isBoss(e)) e.x = clamp5(e.x + face * knock, e.surface.x + e.w / 2, e.surface.x + e.surface.w - e.w / 2);
    this.emit("hit", { x: e.x, y: e.y - e.h / 2, kind });
    if (isBoss(e) && e.type.startsWith("boss-")) {
      this.bossDamaged(e);
    } else if (e.hp <= 0) {
      e.state = "dead";
      e.respawn = e.summoned ? 0 : this.respawnDelay(e);
      e.rooted = false;
      e.lifted = false;
      this.reward(e);
    }
    return true;
  }
  moveEnemyAir(e, nx, ny) {
    const oldX = e.x, oldY = e.y;
    nx = clamp5(nx, e.w / 2, WORLD_WIDTH - e.w / 2);
    for (const s of this.surfaces) {
      if (s.oneWay || oldY <= s.y + 0.01 || oldY - e.h >= s.y + s.h) continue;
      if (oldX + e.w / 2 <= s.x && nx + e.w / 2 > s.x) nx = s.x - e.w / 2;
      if (oldX - e.w / 2 >= s.x + s.w && nx - e.w / 2 < s.x + s.w) nx = s.x + s.w + e.w / 2;
    }
    for (const s of this.surfaces) {
      if (nx + e.w / 2 <= s.x || nx - e.w / 2 >= s.x + s.w) continue;
      if (ny >= oldY && oldY <= s.y + 0.01 && ny >= s.y) ny = s.y;
      if (!s.oneWay && ny < oldY && oldY - e.h >= s.y + s.h && ny - e.h <= s.y + s.h) ny = s.y + s.h + e.h;
    }
    e.x = nx;
    e.y = ny;
  }
  heroBox() {
    const h = this.hero;
    return { x: h.x - h.w / 2, y: h.y - h.h, w: h.w, h: h.h };
  }
  attackBox() {
    const h = this.hero, a2 = h.attack;
    if (!a2) return null;
    const reach = ATTACKS[a2.kind].reach;
    return { x: a2.face > 0 ? h.x + 3 : h.x - reach - 3, y: h.y - 71, w: reach, h: 69 };
  }
  emit(type, data = {}) {
    this.events.push({ type, ...data });
  }
  drain() {
    return this.events.splice(0);
  }
  startAttack(kind) {
    this.markCombat();
    const h = this.hero;
    h.attack = { kind, age: 0, face: h.face, targets: /* @__PURE__ */ new Set(), id: ++this.attackSerial };
    this.emit("swing", { kind });
  }
  moveHero(dt) {
    const h = this.hero, oldX = h.x;
    h.x = clamp5(h.x + h.vx * dt, h.w / 2, WORLD_WIDTH - h.w / 2);
    for (const s of this.surfaces) {
      if (s.oneWay || h.y <= s.y + 0.01 || h.y - h.h >= s.y + s.h) continue;
      if (oldX + h.w / 2 <= s.x && h.x + h.w / 2 > s.x) {
        h.x = s.x - h.w / 2;
        h.vx = 0;
      }
      if (oldX - h.w / 2 >= s.x + s.w && h.x - h.w / 2 < s.x + s.w) {
        h.x = s.x + s.w + h.w / 2;
        h.vx = 0;
      }
    }
    const oldY = h.y;
    if (!this.powers.flying) h.vy = Math.min(900, h.vy + 1480 * dt);
    h.y += h.vy * dt;
    h.grounded = false;
    let floor2 = Infinity, ceiling = -Infinity;
    for (const s of this.surfaces) {
      if (h.x + h.w / 2 <= s.x || h.x - h.w / 2 >= s.x + s.w) continue;
      if (h.vy >= 0 && oldY <= s.y + 0.01 && h.y >= s.y) floor2 = Math.min(floor2, s.y);
      if (!s.oneWay && h.vy < 0 && oldY - h.h >= s.y + s.h && h.y - h.h <= s.y + s.h) ceiling = Math.max(ceiling, s.y + s.h);
    }
    if (floor2 < Infinity) {
      if (h.vy > 150) {
        h.landing = 0.13;
        this.emit("land", { x: h.x, y: floor2 });
      }
      h.y = floor2;
      h.vy = 0;
      h.grounded = true;
      h.jumps = 0;
      h.coyote = 0.1;
    } else if (ceiling > -Infinity) {
      h.y = ceiling + h.h;
      h.vy = 0;
    }
  }
  hurt(amount, fromX, source = {}) {
    const h = this.hero;
    if (Object.hasOwn(TYPES, source.type) && !isBoss(source) && this.isSafeCamp()) return false;
    if (h.invulnerable > 0 || h.dead || !Number.isFinite(amount) || amount <= 0) return false;
    const incoming = this.powers.incoming(amount, source);
    if (incoming === null) return false;
    this.markCombat();
    h.hp = Math.max(0, h.hp - incoming);
    h.invulnerable = 1.05;
    h.hurtAge = 0;
    if (!this.powers.active.steel) {
      h.stun = 0.16;
      h.vx = (h.x >= fromX ? 1 : -1) * 210;
      h.attack = null;
      h.attackBuffer = null;
    }
    this.emit("hurt");
    if (h.hp <= 0) this.defeat();
    return true;
  }
  defeat() {
    const h = this.hero;
    if (h.dead) return;
    if (this.arenaScene) this.leaveBoss("defeat");
    this.powers.cancelEffects();
    this.cancelMergeEffects();
    this.lastDefeatPenalty = h.level < 99 ? Math.min(h.xp, Math.floor(xpForLevel(h.level) * PROGRESSION.defeatFraction)) : 0;
    h.xp -= this.lastDefeatPenalty;
    h.dead = true;
    h.defeatAge = 0;
    h.hp = 0;
    h.vx = h.vy = 0;
    h.attack = null;
    h.attackBuffer = null;
    this.deathTimer = 1.5;
    this.emit("defeat");
  }
  respawn() {
    const h = this.hero, cp = this.world.checkpoint;
    if (cp.region === this.regionId) cp.index = this.checkpoint;
    if (cp.region !== this.regionId) this.loadRegion(cp.region);
    const camp = regionCamps(cp.region)[cp.index];
    this.checkpoint = cp.index;
    this.enemyShots = [];
    this.combatTimer = 0;
    this.powers.cancelEffects();
    this.cancelMergeEffects();
    Object.assign(h, {
      x: camp.x,
      y: camp.y,
      prevX: camp.x,
      prevY: camp.y,
      vx: 0,
      vy: 0,
      dead: false,
      hp: h.maxHp,
      invulnerable: 2.5,
      stun: 0,
      grounded: true,
      jumps: 0,
      jumpBuffer: 0,
      coyote: 0.1,
      attack: null,
      attackBuffer: null,
      pose: "idle",
      respawnAge: 0,
      hurtAge: 100,
      jumpAge: 100,
      defeatAge: 0
    });
    this.emit("respawn", { name: camp.name });
  }
  isSafeCamp() {
    return !this.bossEncounter && this.camps.some((c) => Math.abs(c.x - this.hero.x) < 180 && Math.abs(c.y - this.hero.y) < 100);
  }
  nearCamp() {
    return this.camps.findIndex((c) => Math.abs(c.x - this.hero.x) < 90 && Math.abs(c.y - this.hero.y) < 40);
  }
  interact() {
    if (this.arenaScene) {
      if (this.availableChest() && Math.abs(this.hero.x - 1060) < 140) this.emit("chest-preview");
      return;
    }
    const i = this.nearCamp();
    if (i < 0) {
      this.usePassage();
      return;
    }
    if (!this.canSave()) return;
    this.checkpoint = i;
    this.hero.hp = this.hero.maxHp;
    this.hero.invulnerable = 2;
    this.world.checkpoint = { region: this.regionId, index: i };
    const key = `${this.regionId}:${i}`;
    if (!this.world.activated.includes(key)) this.world.activated.push(key);
    this.emit("camp", { name: this.camps[i].name });
  }
  step(dt = STEP, input = {}) {
    if (this.paused || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, STEP);
    this.time += dt;
    this.combatTimer = Math.max(0, this.combatTimer - dt);
    this.powers.step(dt);
    this.stepMerge(dt);
    const h = this.hero;
    h.prevX = h.x;
    h.prevY = h.y;
    h.prevFace = h.face;
    if (h.dead) {
      h.defeatAge += dt;
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) this.respawn();
      return;
    }
    h.jumpAge += dt;
    h.hurtAge += dt;
    h.respawnAge += dt;
    h.castAge = (h.castAge ?? 100) + dt;
    for (let i = 0; i < 4; i++) if (input.powers?.[i]) this.powers.activateSlot(i);
    h.invulnerable = Math.max(0, h.invulnerable - dt);
    h.stun = Math.max(0, h.stun - dt);
    h.landing = Math.max(0, h.landing - dt);
    h.coyote = Math.max(0, h.coyote - dt);
    h.jumpBuffer = Math.max(0, h.jumpBuffer - dt);
    if (!h.grounded && h.coyote <= 0 && h.jumps === 0) h.jumps = 1;
    if (input.jump && !this.powers.flying) h.jumpBuffer = 0.13;
    if (!this.powers.flying && h.jumpBuffer > 0 && h.jumps < 2 && h.stun <= 0) {
      h.vy = h.jumps === 0 ? -565 : -520;
      h.jumps++;
      h.jumpAge = 0;
      h.grounded = false;
      h.coyote = 0;
      h.jumpBuffer = 0;
      this.emit("jump", { x: h.x, y: h.y, double: h.jumps === 2 });
    }
    const axis = clamp5(Number(input.move) || 0, -1, 1);
    if (h.stun <= 0) {
      h.vx = approach(h.vx, axis * (input.run ? 315 * (1 + this.powers.speed) : 185), (axis ? 2100 : 2500) * dt);
      if (Math.abs(axis) > 0.08) h.face = axis > 0 ? 1 : -1;
    }
    if (this.powers.flying) {
      h.vy = approach(h.vy, (input.vertical ? clamp5(Number(input.vertical), -1, 1) : this.powers.active.flight.age < 0.35 ? -1 : 0) * BALANCE.flightSpeed, 1200 * dt);
      if (h.y < 120) {
        h.y = 120;
        h.vy = Math.max(0, h.vy);
      }
    }
    this.applyMergeMovement();
    this.moveHero(dt);
    if (h.y > DEATH_Y) {
      this.defeat();
      return;
    }
    if (input.heal) this.useHealthRoot();
    if (input.interact) this.interact();
    if (input.tree && this.nearTree() && !this.inCombat()) this.emit("tree");
    if (h.attackBuffer) {
      h.attackBuffer.life -= dt;
      if (h.attackBuffer.life <= 0) h.attackBuffer = null;
    }
    if (input.punch && !this.powers.flying && !this.powers.active.superKick) h.attackBuffer = { kind: "punch", life: 0.18 };
    if (input.kick && !this.powers.flying && !this.powers.active.superKick) h.attackBuffer = { kind: "kick", life: 0.18 };
    if (h.attack) {
      h.attack.age += dt * this.powers.attackRate;
      if (h.attack.age >= ATTACKS[h.attack.kind].duration) h.attack = null;
    }
    if (!h.attack && h.stun <= 0 && !this.powers.flying && !this.powers.active.superKick) {
      const kind = h.attackBuffer?.kind || (input.kickHeld ? "kick" : input.punchHeld ? "punch" : null);
      if (kind) {
        this.startAttack(kind);
        h.attackBuffer = null;
      }
    }
    const attack2 = h.attack, definition = attack2 && ATTACKS[attack2.kind];
    if (attack2 && attack2.age >= definition.startup && attack2.age < definition.startup + definition.active) {
      const box3 = this.attackBox();
      const candidates = this.enemies.filter((e) => e.state !== "dead" && e.protection <= 0 && !attack2.targets.has(e.id) && overlaps2(box3, { x: e.x - e.w / 2, y: e.y - e.h, w: e.w, h: e.h })).sort((a2, b) => Math.abs(a2.x - h.x) - Math.abs(b.x - h.x) || a2.id - b.id);
      this.powers.melee(attack2, candidates);
    }
    for (const e of this.enemies) this.stepEnemy(e, dt);
    stepEnemyProjectiles(this, dt);
    this.stepEncounter(dt);
    if (!this.arenaScene) this.enterBoard(boardIndex(h.x));
    h.cycle += Math.abs(h.x - h.prevX) / 52;
    h.pose = h.stun > 0 ? "hurt" : h.attack ? h.attack.kind : !h.grounded ? h.vy < 0 ? "jump" : "fall" : h.landing > 0 ? "land" : Math.abs(h.vx) > 220 ? "run" : Math.abs(h.vx) > 8 ? "walk" : "idle";
    if (!this.arenaScene && this.regionId === 1 && h.x >= 5860 && !this.reachedEnd) {
      this.reachedEnd = true;
      this.emit("destination");
    }
  }
  stepEnemy(e, dt) {
    if (isBoss(e) && e.type.startsWith("boss-")) {
      if (e.legendary) stepLegendaryBoss(this, e, dt);
      else stepBoss(this, e, dt);
      this.onBossVisualStep?.(e, this.time, dt, this.hero.x);
      return;
    }
    if (e.summoned && e.state === "dead") return;
    if (!e.lifted) {
      e.prevX = e.x;
      e.prevY = e.y;
    }
    if (e.state === "dead") {
      e.respawn -= dt;
      if (e.respawn <= 0 && (Math.abs(this.hero.x - e.spawnX) > RESPAWN.safeDistance || Math.abs(this.hero.y - e.spawnSurface.y) > 160)) {
        e.provoked = false;
        e.rewarded = false;
        e.pouncing = false;
        e.airVx = 0;
        e.surface = e.spawnSurface || e.surface;
        e.x = e.prevX = e.spawnX;
        e.y = e.prevY = e.surface.y - (e.flying ? 50 : 0);
        e.airborne = false;
        e.lifted = false;
        e.rooted = false;
        e.vy = 0;
        e.hp = e.maxHp;
        e.state = "patrol";
        e.age = 0;
        e.protection = 1;
        this.emit("spawn", { x: e.x, y: e.y });
      }
      return;
    }
    e.age += dt;
    e.flash = Math.max(0, e.flash - dt);
    e.protection = Math.max(0, e.protection - dt);
    e.stagger = Math.max(0, e.stagger - dt);
    if (e.lifted) return;
    if (e.airborne) {
      const oldY = e.y;
      if (e.pouncing) {
        this.moveEnemyAir(e, e.x + (e.airVx || 0) * dt, e.y);
        if (!e.hit && Math.abs(this.hero.x - e.x) < 65 && Math.abs(this.hero.y - e.y) < 65) {
          e.hit = true;
          this.hurt(this.monsterDamage(e), e.x, e);
        }
      }
      e.vy = Math.min(900, (e.vy || 0) + 1480 * dt);
      e.y += e.vy * dt;
      const floors = this.surfaces.filter((s) => e.x + e.w / 2 > s.x && e.x - e.w / 2 < s.x + s.w && oldY <= s.y + 0.01 && e.y >= s.y).sort((a2, b) => a2.y - b.y);
      if (floors.length) {
        e.surface = floors[0];
        e.y = e.surface.y;
        e.vy = 0;
        e.airborne = false;
        e.pouncing = false;
        e.state = "recover";
        e.age = 0;
      } else if (e.y > DEATH_Y) {
        e.y = e.surface.y;
        e.x = e.spawnX;
        e.airborne = false;
        e.vy = 0;
      }
      return;
    }
    if (e.rooted && !isBoss(e) || e.stagger > 0 || e.protection > 0) return;
    if (TYPES[e.type].region > 1) {
      advancedEnemy(this, e, dt);
      return;
    }
    const movementScale = e.rooted ? 0.5 : 1;
    const h = this.hero, d = h.x - e.x, nearHeight = Math.abs(h.y - e.y) < 62;
    const peaceful = TYPES[e.type].peaceful && h.level <= 3 && !e.provoked;
    const withinLeash = !h.dead && !peaceful && !this.isSafeCamp() && Math.abs(h.x - e.spawnX) < 225;
    const info = TYPES[e.type], left = Math.max(e.surface.x + e.w / 2 + 5, e.spawnX - 150), right = Math.min(e.surface.x + e.surface.w - e.w / 2 - 5, e.spawnX + 150);
    if (e.state === "patrol") {
      if (nearHeight && withinLeash && Math.abs(d) < 65) {
        e.face = Math.sign(d) || e.face;
        e.state = "warn";
        e.age = 0;
      } else {
        if (nearHeight && withinLeash && Math.abs(d) < 185) e.face = Math.sign(d) || e.face;
        if (e.x <= left) e.face = 1;
        if (e.x >= right) e.face = -1;
        if (e.x < left) e.x = Math.min(left, e.x + info.speed * movementScale * dt);
        else if (e.x > right) e.x = Math.max(right, e.x - info.speed * movementScale * dt);
        else e.x = clamp5(e.x + e.face * info.speed * movementScale * dt, left, right);
      }
    } else if (e.state === "warn" && e.age >= (e.type === "crawler" ? 0.55 : 0.7)) {
      e.state = "strike";
      e.age = 0;
      e.hit = false;
      if (e.type === "slime") {
        e.airborne = true;
        e.pouncing = true;
        e.vy = -180;
        e.airVx = e.face * 95;
      }
    } else if (e.state === "strike") {
      e.x = clamp5(e.x + e.face * (e.type === "crawler" ? 155 : 105) * movementScale * dt, left, right);
      if (!e.hit && e.age >= 0.06) {
        e.hit = true;
        if (nearHeight && Math.abs(h.x - e.x) < 76 && (h.x - e.x) * e.face > -15) this.hurt(this.monsterDamage(e), e.x, e);
      }
      if (e.age >= 0.24) {
        e.state = "recover";
        e.age = 0;
      }
    } else if (e.state === "recover" && e.age >= 1.1) {
      e.state = "patrol";
      e.age = 0;
    }
  }
  save() {
    if (!this.canSave()) return null;
    const h = this.hero;
    this.world.checkpoint = this.world.checkpoint.region === this.regionId ? { region: this.regionId, index: this.checkpoint } : this.world.checkpoint;
    if (!this.world.activated.includes(`${this.world.checkpoint.region}:${this.world.checkpoint.index}`)) this.world.activated.push(`${this.world.checkpoint.region}:${this.world.checkpoint.index}`);
    const location = this.arenaScene ? { ...this.arenaScene.returnLocation, hp: h.hp, vx: 0, vy: 0, jumps: 0 } : { x: h.x, y: h.y, face: h.face, hp: h.hp, vx: h.vx, vy: this.powers.flying ? Math.max(0, h.vy) : h.vy, jumps: h.jumps };
    for (const region of this.world.bossVictories) if (!this.bossProgress.records[region]) this.bossProgress.records[region] = initialBossProgress([region]).records[region];
    const world = { ...this.world, region: this.regionId, location, monsters: (this.arenaScene?.enemies || this.enemies).filter((e) => !isBoss(e) && !e.summoned).map((e) => ({ id: e.id, type: e.type, hp: e.hp, respawn: Math.max(0, e.respawn) })) };
    const legendary = { ...this.legendary, recovery: this.mergeSnapshot() };
    return JSON.stringify({ version: 8, legendary, economy: this.economy, sanctuary: this.sanctuary, bossProgress: this.bossProgress, arena: this.pendingBossEntry || (this.arenaScene?.cleared ? this.arenaScene.legendary ? { legendary: this.arenaScene.legendary, mode: "cleared" } : { region: this.regionId, mode: "cleared" } : null), powers: this.powers.snapshot(), look: this.look, outfit: this.outfit, level: h.level, xp: h.xp, coins: h.coins, checkpoint: this.checkpoint, kills: this.kills, species: [...this.species], reachedEnd: this.reachedEnd, healthRoots: this.healthRoots, inventory: this.inventory, world });
  }
};
Object.assign(Game.prototype, journeyMethods, bossMethods, erisMethods, legendaryMethods, mergeMethods);

// cloud-validation.mjs
var stable = (v) => JSON.stringify(v, (_k, x) => x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]])) : x);
var fail = (message) => {
  throw Error(message);
};
var MAX_SAVE_BYTES = 1e6;
function validateSnapshot(raw, { migration = false } = {}) {
  if (typeof raw === "string") {
    if (raw.length > MAX_SAVE_BYTES) fail("Save exceeds the supported size.");
    try {
      raw = JSON.parse(raw);
    } catch {
      fail("Unreadable save.");
    }
  }
  if (!raw || typeof raw !== "object" || JSON.stringify(raw).length > MAX_SAVE_BYTES) fail("Invalid save size.");
  for (const [key, min, max] of [["level", 1, 99], ["coins", 0, 999999], ["xp", 0, Number.MAX_SAFE_INTEGER], ["kills", 0, 999999]]) if (!Number.isSafeInteger(raw[key]) || raw[key] < min || raw[key] > max) fail("Invalid " + key + ".");
  if (raw.xp >= (raw.level === 99 ? 1 : xpForLevel(raw.level))) fail("Invalid XP progress.");
  if ((raw.inventory?.pending?.length || 0) > 2048 || Object.keys(raw.inventory?.retired || {}).length > 2e4) fail("Inventory history exceeds the supported size.");
  const state = decodeSave(JSON.stringify(raw));
  if (!state) fail("Save validation failed. The original data was not changed.");
  if (!migration && raw.powers?.points !== void 0 && raw.powers.points !== state.powers.points) fail("Invalid Power Point balance.");
  if (!migration && state.arena?.mode === "restart") fail("Manual saving is unavailable during boss encounters.");
  if (state.world.location?.hp > 100 + (state.level - 1) * 15) fail("Invalid health.");
  state.world.clockReference = WORLD_CLOCK_REFERENCE;
  return state;
}
function validateProgress(previous, next, { kind = "manual" } = {}) {
  const old = previous;
  if (!old) return next;
  if (!legendaryDominates(next.legendary, old.legendary)) fail("Permanent Legendary progress cannot be rolled back.");
  for (const [uid, reason] of Object.entries(old.inventory.retired)) if (next.inventory.retired[uid] !== reason) fail("Destroyed equipment cannot be restored.");
  if (next.level < old.level || next.economy.revision < old.economy.revision || next.inventory.nextId < old.inventory.nextId) fail("This save predates recorded progression.");
  for (const [id, n] of Object.entries(old.powers.levels)) if (next.powers.levels[id] < n) fail("Spent Power Points cannot be refunded.");
  for (const item of [...old.inventory.items, ...old.inventory.pending]) {
    const n = [...next.inventory.items, ...next.inventory.pending].find((i) => i.uid === item.uid);
    if (n && n.catalogId !== item.catalogId) fail("An existing item cannot change identity.");
  }
  for (const [id, r] of Object.entries(old.bossProgress.records)) {
    const n = next.bossProgress.records[id];
    if (!n || n.wins < r.wins || r.chest.state === "claimed" && n.chest.state !== "claimed") fail("Boss rewards cannot be recreated.");
  }
  const before = old.legendary, after = next.legendary;
  if (kind === "manual") {
    if (after.revision !== before.revision || stable(after.defeated) !== stable(before.defeated)) fail("Legendary changes require an irreversible transaction.");
  } else if (kind === "irreversible") {
    if (after.revision !== before.revision + 1) fail("Permanent revision must advance exactly once.");
    const added = Object.keys(after.defeated).filter((id) => !before.defeated[id]);
    const changed = Object.keys(before.defeated).filter((id) => stable(before.defeated[id]) !== stable(after.defeated[id]));
    if (added.length === 1 && !changed.length) {
      const id = added[0], record = after.defeated[id];
      if (next.level !== 99 || record.claimed || record.pieces.some((p) => p.state !== "unclaimed") || next.arena?.legendary !== id || next.arena?.mode !== "cleared") fail("Invalid Legendary victory reservation.");
    } else if (!added.length && changed.length) {
      const claims = changed.filter((id) => !before.defeated[id].claimed && after.defeated[id].claimed);
      if (claims.length > 1 || changed.some((id) => !before.defeated[id].claimed && !claims.includes(id))) fail("Invalid reward claim.");
      if (changed.some((id) => before.defeated[id].claimed && after.defeated[id].pieces.some((p, i) => p.state !== before.defeated[id].pieces[i].state && p.state !== "discarded"))) fail("Only permanent discards may change claimed rewards.");
    } else fail("Permanent transaction has no valid event.");
  } else fail("Unknown save transaction.");
  return next;
}
function validateUsername(value) {
  const name = String(value || "").normalize("NFKC").toLowerCase();
  if (!/^[a-z][a-z0-9_]{3,23}$/.test(name)) fail("Use 4\u201324 letters, numbers or underscores, beginning with a letter.");
  return name;
}
function validatePasscode(value) {
  if (typeof value !== "string" || value.length < 15 || new TextEncoder().encode(value).length > 72 || /^\d+$/.test(value) || new Set(value).size < 6) fail("Use a passphrase of 15\u201372 bytes with letters and varied characters; numeric PINs are not accepted.");
  return value;
}
var validSlot = (slot) => Number.isInteger(slot) && slot >= 0 && slot < 3;
export {
  MAX_SAVE_BYTES,
  validSlot,
  validatePasscode,
  validateProgress,
  validateSnapshot,
  validateUsername
};
