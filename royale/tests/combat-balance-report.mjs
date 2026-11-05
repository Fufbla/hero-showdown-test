// Reproducible damage calibration plus a real-world input-only patrol.
// Calibration freezes target AI; it is not a claim of human boss victories.
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const root=resolve(process.argv[2]||new URL('../',import.meta.url).pathname);
const get=path=>import(pathToFileURL(resolve(root,path)));
const {Game,STEP,ATTACKS}=await get('core.mjs'),{powerStats,POWER_IDS}=await get('powers.mjs');
const {TYPES,WORLD_REGIONS}=await get('world.mjs'),{BOSSES}=await get('boss-data.mjs');
const {COSTUME_SETS}=await get('costume-catalog.mjs'),{maximumHP,monsterXP,xpForLevel}=await get('progression.mjs');
const offensive=['strength','superKick','fireball','roots','whirlwind'];
const rnd=x=>Math.round(x*100)/100;
function setup(level,equipped,id,power=0){
 const gear=equipped?Object.values(COSTUME_SETS).filter(s=>s.level<=level).at(-1):null;
 const g=new Game({equipment:gear?.stats||{},random:()=>.99,now:()=>Date.UTC(2026,0,1)});g.hero.level=level;g.hero.hp=g.hero.maxHp=maximumHP(level);g.hero.x=1000;g.hero.y=600;g.hero.invulnerable=0;
 g.enemies=[];g.camps=[];g.powers.data.levels=Object.fromEntries(POWER_IDS.map(p=>[p,0]));
 if(power)g.powers.data.levels[id]=power;
 // Remaining points can legally fund Speed; never exceed the 98-point ledger.
 g.powers.data.levels.speed=Math.min(20,Math.max(0,level-1-power));g.powers.data.points=level-1-power-g.powers.data.levels.speed;g.powers.data.equipped=[power?id:null,null,null];
 g.stepEnemy=()=>{}; // stationary calibration only; real attack, collision and cooldown paths remain.
 return {g,gear:gear?.name||'None'};
}
function calibration(level,equipped,id,power,hp=1e8,boss=false,seconds=60,filler=false){
 const {g}=setup(level,equipped,id,power);const e=g.makeEnemy('crawler',1040,'sand-a',1);Object.assign(e,{hp,maxHp:hp,protection:0,boss,w:50,h:90});g.enemies=[e];let damage=0,hits=0,casts=0,firstDamage=0;
 const apply=g.damageEnemy.bind(g);g.damageEnemy=(e,a,o)=>{const before=e.hp,ok=apply(e,a,o);if(ok){damage+=before-e.hp;hits++;if(casts<=1)firstDamage+=before-e.hp;}return ok;};
 let ticks=0;for(;ticks<seconds/STEP&&e.hp>0;ticks++){
  // Counter only cooldown-eligible activations, never bypass the public power gate.
  if(power&&g.powers.ready(id)&&g.powers.activate(id))casts++;
  g.step(STEP,power?(filler?{punchHeld:!g.powers.ready(id)}:{}):{[id+'Held']:true});g.events.length=0;e.x=1040;if(!g.powers.active.whirlwind){e.y=600;e.airborne=false;e.lifted=false;}
 }
 return {damage:rnd(damage),hits,casts,firstActivationDamage:rnd(firstDamage),seconds:rnd(ticks*STEP),dps:rnd(damage/(ticks*STEP)),defeated:e.hp<=0};
}
const rows=[];
for(const level of [1,10,20,30,50,99])for(const equipped of [false,true]){
 const monsters=Object.entries(TYPES).filter(([,t])=>t.level<=level),[monsterId,m]=monsters.at(-1);const region=WORLD_REGIONS.find(r=>level>=r.levels[0]&&level<=r.levels[1]);const boss=BOSSES[region.id];
 for(const [id,p] of [['punch',0],['kick',0],...offensive.flatMap(id=>[1,5,10,15,20].filter(p=>p<=level-1).map(p=>[id,p]))]){
  const {g,gear}=setup(level,equipped,id,p),stats=p?g.powers.stats(id):g.attackDefinition(id),meter=calibration(level,equipped,id,p),regular=calibration(level,equipped,id,p,m.hp,false,600),bossMeter=calibration(level,equipped,id,p,boss.hp,true,1200);
  const cycle=p?(stats.cooldown+(id==='superKick'?stats.kicks*ATTACKS.kick.duration/g.powers.attackRate:stats.duration||0)):stats.duration/g.powers.attackRate;
  rows.push({heroLevel:level,equipment:gear,power:id,upgrade:p,attackRate:rnd(g.powers.attackRate),damagePerHit:rnd(stats.damage),activationDamage:p?rnd(stats.damage*(stats.kicks||stats.projectiles||stats.duration||1)):rnd(stats.damage),cooldownCycle:rnd(cycle),measured60s:meter,withBasicFiller60s:p?calibration(level,equipped,id,p,1e8,false,60,true):meter,regular:{id:monsterId,hp:m.hp,seconds:regular.seconds,defeated:regular.defeated,xp:monsterXP(m.xp,level,m.level),idealCombatXPPerMinute:level===99?0:rnd(monsterXP(m.xp,level,m.level)*60/regular.seconds)},boss:{name:boss.name,hp:boss.hp,stationarySeconds:bossMeter.seconds,defeated:bossMeter.defeated}});
 }
}
function patrol(usePowers,minutes=10,level=30){
 const g=new Game({random:()=>.99,now:()=>Date.UTC(2026,0,1)});const region=WORLD_REGIONS.find(r=>level>=r.levels[0]&&level<=r.levels[1]);g.world.unlocked=Array.from({length:region.id},(_,i)=>i+1);g.loadRegion(region.id);g.started=true;
 const platform=g.surfaces.find(s=>s.id==='climb-0-2');g.hero.level=level;g.hero.hp=g.hero.maxHp=maximumHP(level);Object.assign(g.hero,{x:platform.x+40,y:platform.y,grounded:true,invulnerable:0});g.powers.data.points=level-1;
 if(usePowers){for(const id of ['fireball','strength','roots']){const points=Math.min(20,g.powers.data.points);g.powers.data.levels[id]=points;g.powers.data.points-=points;}g.powers.data.equipped=['fireball','strength','roots'].map(id=>g.powers.data.levels[id]?id:null);}
 let xpEarned=0,direction=1,ticks=0;const startCount=g.enemies.filter(e=>e.surface.id===platform.id).length;
 for(;ticks<minutes*60/STEP&&!g.hero.dead;ticks++){
  const h=g.hero;if(h.x>platform.x+platform.w-40)direction=-1;if(h.x<platform.x+40)direction=1;
  const near=g.enemies.filter(e=>e.hp>0&&Math.abs(e.y-h.y)<90&&Math.abs(e.x-h.x)<120).sort((a,b)=>Math.abs(a.x-h.x)-Math.abs(b.x-h.x))[0];
  const dx=near?near.x-h.x:direction*100,move=near&&Math.abs(dx)<45?0:Math.sign(dx);
  const cast=usePowers&&near&&g.powers.data.equipped.some(id=>id&&g.powers.ready(id));
  g.step(STEP,{move,run:true,punchHeld:!cast,powers:usePowers&&near?[true,true,true]:[false,false,false]});
  for(const ev of g.events)if(ev.type==='reward'&&level<99)xpEarned+=ev.xp||0;g.events.length=0;
 }
 return {mode:usePowers?'legal powers plus basic filler':'basic punch only',startingLevel:level,region:region.id,platform:platform.id,startingPopulation:startCount,seconds:rnd(ticks*STEP),endLevel:g.hero.level,xp:g.hero.xp,kills:g.kills,defeated:g.hero.dead,xpEarned,xpPerMinute:rnd(xpEarned/(ticks*STEP)*60)};
}

console.log(JSON.stringify({method:'60 Hz production Game.step; seeded randomness and fixed daytime for reproducibility. Damage/TTK calibration uses stationary non-attacking targets, actual collisions, durations and cooldowns. Ordinary full set at legal hero level; remaining points legally assigned to Speed. Boss TTK is a stationary lower bound with Super Strength resistance, not a boss AI victory. Ideal combat XP/min excludes travel/respawn and is not a measured farming rate. Patrol starts a legal-level fixture on an actual four-monster second-tier platform in its appropriate region, then uses only input commands with full AI/respawn/XP until ten minutes or defeat. No teleporting or invulnerability during measurement. It is a limited bot, not a human progression forecast.',unavailable:'Hero level 1 earns no Power Points; upgrades above heroLevel-1 are omitted.',rows,patrols:[1,10,20,30,50,99].flatMap(l=>[patrol(false,10,l),patrol(true,10,l)]),xpRequirements:[1,10,20,30,50,98].map(level=>({level,next:xpForLevel(level)}))},null,2));
