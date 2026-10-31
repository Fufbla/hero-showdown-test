import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,STEP,decodeSave,xpForLevel} from '../core.mjs';
import {PROGRESSION,CLOCK,LOOT,RESPAWN,monsterXP,worldClock,bossVictory} from '../progression.mjs';
import {WORLD_REGIONS,TYPES,regionSurfaces,regionSpawns,boardIndex} from '../world.mjs';
import {createEquipment,rollEquipment,equipmentBonuses,normalizeInventory} from '../equipment.mjs';
import {normalizeControls} from '../controls.mjs';
import {initialWorld,WORLD_CLOCK_REFERENCE} from '../world-state.mjs';
import {powerStats,POWER_IDS,attackRate} from '../powers.mjs';
import {LocalHeroStore,PROFILE_KEY} from '../saves.mjs';
const tick=(g,n,input={})=>{for(let i=0;i<n;i++)g.step(STEP,input);};
const empty=opts=>{const g=new Game({random:()=>.99,...opts});g.enemies=[];return g;};
const regional=(id,opts={})=>{const g=new Game({random:()=>.99,...opts});for(let r=1;r<id;r++)bossVictory(g.world,r);g.travel(id);return g;};
const enemy=(g,type,x=600)=>{const e=g.makeEnemy(type,x,'sand-a',0);e.protection=0;g.enemies=[e];return e;};

test('nonlinear XP is strictly increasing, accelerates after 69 and exposes requested table',()=>{
  for(let l=1;l<98;l++)assert.ok(xpForLevel(l+1)>xpForLevel(l));
  assert.ok(xpForLevel(98)>4*xpForLevel(70));assert.ok(xpForLevel(90)-xpForLevel(80)>xpForLevel(65)-xpForLevel(50));
  assert.deepEqual([1,10,20,35,50,65,80,90,98].map(l=>xpForLevel(l)),[50,626,2026,5626,11026,18226,38978,88068,161608]);
  assert.equal(xpForLevel(10,{...PROGRESSION,quadratic:0}),302);
});
test('all 98 levels grant exactly one point, +15 HP, immediate refill even in boss combat',()=>{
  const g=empty();g.bossEncounter={id:'fixture'};
  for(let l=1;l<99;l++){g.hero.hp=1;g.gainXP(xpForLevel(l));assert.equal(g.hero.level,l+1);assert.equal(g.hero.hp,100+15*l);assert.equal(g.hero.maxHp,g.hero.hp);assert.equal(g.powers.data.points,l);assert.ok(g.inCombat());}
  g.gainXP(999999);assert.equal(g.hero.level,99);assert.equal(g.hero.xp,0);assert.equal(g.hero.maxHp,1570);assert.equal(g.powers.data.points,98);
});
test('low-level farming tapers to zero, never negative; coin and drop rules are unaffected',()=>{
  assert.deepEqual([3,4,7,11,16].map(gap=>monsterXP(100,21+gap,21)),[100,75,35,10,0]);
  assert.equal(monsterXP(100,1,99),100);assert.equal(monsterXP(-2,99,1),0);
  const g=empty();g.hero.level=20;for(let i=0;i<10000;i++)g.reward({type:'bottle',x:0,y:0});assert.equal(g.hero.level,20);assert.equal(g.hero.xp,0);assert.equal(g.hero.coins,10000);
});
test('defeat deducts 10% of next cost once, preserves all non-XP progression and full-health respawn',()=>{
  const g=regional(3);g.hero.level=30;g.hero.maxHp=535;g.hero.xp=2000;g.hero.coins=234;g.healthRoots=4;g.inventory.items.push(createEquipment(3,'ordinary',0));g.powers.data.levels.steel=20;g.powers.data.points=9;
  g.hero.x=4370;g.interact();const gear=JSON.stringify(g.inventory),points=g.powers.data.points;g.defeat();const xp=2000-Math.floor(xpForLevel(30)*.1);assert.equal(g.hero.xp,xp);g.defeat();assert.equal(g.hero.xp,xp);tick(g,100);
  assert.equal(g.hero.x,4370);assert.equal(g.hero.hp,535);assert.equal(g.hero.level,30);assert.equal(g.hero.coins,234);assert.equal(g.healthRoots,4);assert.equal(JSON.stringify(g.inventory),gear);assert.equal(g.powers.data.points,points);
});
test('death cannot go below zero or remove levels; Level 99 has no ordinary penalty',()=>{
  for(const level of [1,35,98,99]){const g=empty();g.hero.level=level;g.hero.xp=1;g.defeat();assert.equal(g.hero.level,level);assert.equal(g.hero.xp,level===99?1:0);}
});
test('five seconds after every attack, including whiffs, blocks save, travel, Tree and upgrade',()=>{
  const g=empty();g.hero.x=290;g.startAttack('punch');assert.equal(g.save(),null);assert.equal(g.travel(1),false);assert.equal(g.visitTree(),false);assert.equal(g.upgradePower('strength',1).ok,false);
  tick(g,299);assert.equal(g.canSave(),false);tick(g,2);assert.ok(g.canSave());assert.ok(g.save());g.hero.invulnerable=0;g.hurt(1,0);assert.equal(g.canSave(),false);tick(g,299);assert.equal(g.canSave(),false);tick(g,2);assert.ok(g.canSave());
});
test('boss encounter always blocks safety; pause freezes combat recovery but never the real clock',()=>{
  let now=WORLD_CLOCK_REFERENCE;const g=regional(3,{now:()=>now});g.markCombat();g.paused=true;tick(g,600);assert.equal(g.combatTimer,5);now=WORLD_CLOCK_REFERENCE+CLOCK.day;assert.ok(g.clock().night);g.combatTimer=0;g.bossEncounter={};assert.equal(g.canTravel(),false);assert.equal(g.save(),null);
});
test('Tree is safely accessible remotely and leaves the exact previous location unchanged',()=>{
  const g=regional(2);g.hero.x=1700;g.hero.y=470;g.hero.grounded=false;const pos=[g.hero.x,g.hero.y];assert.ok(g.visitTree());g.paused=true;g.hero.coins=100;assert.ok(g.buyHealthRoot());g.hero.level=2;g.powers.data.points=1;assert.ok(g.upgradePower('fireball',1).ok);g.leaveTree();assert.deepEqual([g.hero.x,g.hero.y],pos);assert.equal(g.nearTree(),false);
});
for(const r of WORLD_REGIONS){
  test(`Region ${r.id}: three species, connected low path, three camps and board respawns`,()=>{
    const g=regional(r.id);assert.equal(new Set(regionSpawns(r.id).map(s=>s[0])).size,3);assert.equal(g.camps.length,3);assert.ok(g.enemies.length<=18);
    const floor=regionSurfaces(r.id).filter(s=>!s.oneWay&&s.y>=600).sort((a,b)=>a.x-b.x);let edge=0;for(const s of floor){assert.ok(s.x<=edge,`gap before ${s.id}`);edge=Math.max(edge,s.x+s.w);}assert.ok(edge>=6160);
    const e=g.enemies[0];e.state='dead';e.hp=0;e.respawn=18;g.world.visits[`${r.id}:0`]=1;g.enterBoard(1);g.hero.x=2000;g.enterBoard(0);assert.equal(e.respawn,0);g.stepEnemy(e,STEP);assert.equal(e.hp,e.maxHp);
  });
  test(`Region ${r.id}: reward rates, night invariants, rare restrictions`,()=>{
    const types=r.types,results=[];
    for(const type of types){let now=WORLD_CLOCK_REFERENCE;const g=regional(r.id,{now:()=>now});g.hero.level=TYPES[type].level;const e=enemy(g,type);const hp=e.maxHp,day=g.monsterDamage(e);g.reward(e);assert.equal(g.hero.coins,1);now=WORLD_CLOCK_REFERENCE+CLOCK.day;const next=enemy(g,type);g.reward(next);assert.equal(g.hero.coins,r.id<3?2:3);assert.equal(next.maxHp,hp);assert.equal(g.monsterDamage(next),day*(r.id<3?1:2));results.push(next.type);}
    let rare=0,ordinary=0;for(let i=0;i<10000;i++){let draws=0;const item=rollEquipment(r.id,()=>draws++===0?(i+.5)/10000:.4,i+1);if(item?.catalogId.includes('-rare-'))rare++;else if(item)ordinary++;}
    assert.equal(rare,Math.round(LOOT.rareChance[r.id]*10000));assert.equal(ordinary,1200);
  });
  test(`Region ${r.id}: ordinary jump route reaches its prepared arena without forced falls`,()=>{
    const g=regional(r.id);g.enemies=[];for(let i=0;i<1300;i++){const x=g.hero.x;g.step(STEP,{move:1,run:true,jump:g.hero.grounded&&[1390,2710,4120].some(edge=>x>edge-75&&x<edge+170)});assert.equal(g.hero.dead,false);}assert.ok(g.hero.x>=5900);
  });
}
for(const [type,info] of Object.entries(TYPES)){
  test(`${info.name}: bounded patrol, valid attack, health bar source, timed respawn and no overlap`,()=>{
    const g=regional(info.region),e=enemy(g,type);g.hero.x=635;g.hero.hp=g.hero.maxHp=100000;g.hero.invulnerable=0;e.provoked=true;
    let hit=false,air=false,shot=false;
    for(let i=0;i<600;i++){g.hero.invulnerable=0;g.step(STEP);hit ||= g.hero.hp<100000;air ||= e.airborne||e.flying;shot ||= g.enemyShots.length>0;}
    assert.ok(hit||shot,`${type} never attacks`);assert.ok(Number.isFinite(e.x)&&Number.isFinite(e.y));assert.ok(e.hp<=e.maxHp);
    g.damageEnemy(e,100000);assert.equal(e.respawn,RESPAWN[info.rank]);g.hero.x=e.spawnX;g.hero.y=e.spawnSurface.y;e.respawn=0;g.stepEnemy(e,STEP);assert.equal(e.state,'dead');g.hero.x=100;g.stepEnemy(e,STEP);assert.equal(e.hp,e.maxHp);assert.equal(e.rewarded,false);
    if(info.flying||info.behavior==='pounce')assert.ok(air);
  });
}
test('peaceful early critters only attack after provocation; later heroes trigger aggression',()=>{
  for(const level of [1,2,3,4]){const g=empty(),e=enemy(g,'bottle',1045);g.hero.x=1000;g.hero.level=level;g.hero.invulnerable=0;tick(g,100);assert.equal(g.hero.hp<100,level===4);if(level<=3){g.damageEnemy(e,1);g.hero.x=e.x-40;tick(g,150);assert.ok(e.provoked);assert.ok(g.hero.hp<100);}}
});
test('Health Roots: exact ten-percent drop boundary, max four, instant repeated healing in combat',()=>{
  let first=0;const g=empty({random:()=>first++%2===0?.099:.99});for(let i=0;i<20;i++)g.reward({type:'bottle',x:0,y:600});assert.equal(g.healthRoots,4);
  g.hero.hp=1;g.markCombat();for(let i=0;i<4;i++)assert.ok(g.useHealthRoot());assert.equal(g.hero.hp,g.hero.maxHp);assert.equal(g.healthRoots,0);assert.equal(g.useHealthRoot(),false);
  g.healthRoots=1;assert.equal(g.useHealthRoot(),false);g.hero.hp=1;g.bossEncounter={};assert.ok(g.useHealthRoot());assert.equal(g.hero.hp,1+g.hero.maxHp*.25);
  const misses=empty({random:()=>.10});misses.reward({type:'bottle'});assert.equal(misses.healthRoots,0);
});
test('Health Root rate over stratified 10,000 outcomes is 10%; capacity never exceeds four',()=>{
  const g=empty();let drops=0;for(let i=0;i<10000;i++){g.healthRoots=0;let n=0;g.random=()=>n++===0?(i+.5)/10000:.99;g.reward({type:'bottle'});drops+=g.healthRoots;}assert.equal(drops,1000);
});
test('Root purchases require Tree, safety, 50 coins and inventory room; death preserves unused roots',()=>{
  const g=empty();g.hero.coins=200;assert.equal(g.buyHealthRoot(),false);g.visitTree();for(let i=0;i<4;i++)assert.ok(g.buyHealthRoot());assert.equal(g.hero.coins,0);assert.equal(g.buyHealthRoot(),false);g.healthRoots=3;g.hero.coins=49;assert.equal(g.buyHealthRoot(),false);g.hero.coins=100;g.markCombat();assert.equal(g.buyHealthRoot(),false);g.defeat();g.respawn();assert.equal(g.healthRoots,3);
});
test('summons award XP only, never coins, Health Roots or equipment even with guaranteed rolls',()=>{
  const g=empty({random:()=>0});g.reward({type:'bottle',summoned:true});assert.equal(g.hero.xp,14);assert.equal(g.hero.coins,0);assert.equal(g.healthRoots,0);assert.equal(g.inventory.items.length,0);
});
test('seven-slot equipment cap includes worn items; full drops require confirmed replacement or discard',()=>{
  const g=regional(4,{random:()=>0});g.paused=true;
  g.hero.level=50;for(let i=0;i<9;i++)g.reward({type:'scorpion'});assert.equal(g.inventory.items.length,0);for(let i=0;i<7;i++)assert.ok(g.acceptReward());assert.equal(g.inventory.items.length,7);assert.equal(g.inventory.pending.length,2);
  assert.ok(g.equipItem(g.inventory.items[0].uid));const equipped=g.inventory.items[0].uid;
  assert.equal(g.resolveReward(equipped),false);assert.equal(g.inventory.items.length,7);assert.ok(g.resolveReward(equipped,true));assert.equal(g.inventory.items.length,7);assert.equal(Object.values(g.inventory.equipped).includes(equipped),false);
  assert.equal(g.resolveReward(null),false);assert.ok(g.resolveReward(null,true));assert.equal(g.inventory.pending.length,0);assert.equal(g.discardItem(g.inventory.items[0].uid),false);assert.ok(g.discardItem(g.inventory.items[0].uid,true));assert.equal(g.inventory.items.length,6);
});
test('fixed equipment stats survive save; worn part swaps do not expand inventory; Speed remains capped',()=>{
  const g=regional(7);g.hero.level=99;g.powers.data.levels.speed=20;g.inventory.items=[createEquipment(7,'rare',4,1),createEquipment(7,'ordinary',4,2)];g.inventory.nextId=3;g.paused=true;
  assert.ok(g.equipItem('drop-1'));const color=g.visualOutfit().pieces.belt.color;g.look.suit='#ffffff';assert.equal(g.visualOutfit().pieces.belt.color,color);assert.equal(attackRate(20,g.equipment),1.5);
  assert.ok(g.equipItem('drop-2'));assert.equal(g.inventory.equipped.belt,'drop-2');assert.equal(g.inventory.items.length,2);assert.ok(equipmentBonuses(g.inventory).damage>0);
  const copy=new Game({save:decodeSave(g.save())});assert.deepEqual(copy.inventory,g.inventory);assert.deepEqual(copy.equipment,g.equipment);
});
test('clock uses real elapsed time: exact day/night boundaries, pause, closing, repeat cycles',()=>{
  const epoch=WORLD_CLOCK_REFERENCE;
  for(const region of [1,2])for(const now of [epoch,epoch+CLOCK.day,epoch+1e12])assert.equal(worldClock(epoch,now,region).night,false);
  for(const region of [3,4,5,6,7]){assert.equal(worldClock(epoch,epoch+CLOCK.day-1,region).night,false);assert.equal(worldClock(epoch,epoch+CLOCK.day,region).night,true);assert.equal(worldClock(epoch,epoch+CLOCK.day+CLOCK.night,region).night,false);assert.equal(worldClock(epoch,epoch-1,region).night,false);}
  let now=epoch;const g=regional(3,{now:()=>now});g.paused=true;const saved=g.save();now+=CLOCK.day+1234;const restored=new Game({save:decodeSave(saved),now:()=>now});assert.ok(restored.clock().night);assert.equal(restored.world.clockReference,epoch);assert.equal(restored.clock().remaining,599);
});
test('night doubles regular attacks but not bosses, HP, XP or drop rates; returns instantly to day',()=>{
  let now=WORLD_CLOCK_REFERENCE;const g=regional(6,{now:()=>now}),e=enemy(g,'sentinel');const hp=e.maxHp,day=g.monsterDamage(e);now=WORLD_CLOCK_REFERENCE+CLOCK.day;assert.equal(g.monsterDamage(e),day*2);e.boss=true;assert.equal(g.monsterDamage(e),day);e.boss=false;now=WORLD_CLOCK_REFERENCE+CLOCK.day+CLOCK.night;assert.equal(g.monsterDamage(e),day);assert.equal(e.maxHp,hp);
});
test('Flight, Steel, Agility and Roots preserve rules against ranged and airborne monsters',()=>{
  const g=regional(3);g.hero.level=99;g.hero.invulnerable=0;g.powers.data.levels.flight=20;g.powers.data.levels.fireball=20;g.powers.data.levels.roots=20;g.powers.data.equipped=['flight','fireball','roots'];
  const e=enemy(g,'drone',g.hero.x+40);assert.ok(g.powers.activate('roots'));assert.equal(e.rooted,undefined);g.powers.end('roots');g.hero.grounded=true;assert.ok(g.powers.activate('flight'));assert.equal(g.hurt(200,e.x,e),false);assert.equal(g.powers.activate('roots'),false);assert.ok(g.powers.activate('fireball'));
});
test('new level-one heroes can travel through every region without boss victories',()=>{
 const g=empty();assert.deepEqual(g.world.unlocked,[1,2,3,4,5,6,7]);for(let id=1;id<=7;id++)assert.ok(g.travel(id));g.travel(1);g.hero.x=6070;assert.ok(g.usePassage());assert.equal(g.regionId,2);assert.equal(g.hero.level,1);assert.equal(g.hero.coins,0);assert.deepEqual(g.world.bossVictories,[]);
});
test('first and repeat boss rewards remain independent of open-world access',()=>{
 const a=initialWorld(),b=initialWorld();for(let id=7;id>=1;id--){assert.equal(bossVictory(a,id).coins,100);assert.equal(bossVictory(a,id).coins,10);}assert.deepEqual(b.bossVictories,[]);assert.deepEqual(a.unlocked,b.unlocked);
});
test('both portal and backward passages arrive at the destination safe checkpoint',()=>{
 const g=regional(3);assert.ok(g.travel(2));assert.equal(g.hero.x,160);assert.equal(g.hero.y,600);assert.deepEqual(g.world.checkpoint,{region:2,index:0});g.hero.x=44;assert.ok(g.usePassage());assert.equal(g.regionId,1);assert.equal(g.hero.x,160);g.defeat();g.respawn();assert.equal(g.regionId,1);assert.equal(g.hero.x,160);
});
test('v1, v2 and v3 migration preserve level, XP, coins, look, checkpoint and permanent powers',()=>{
  for(const version of [1,2,3]){const old={version,level:35,xp:947,coins:785,checkpoint:2,look:{name:'Long Journey',hair:'locs',suit:'#c0ffee'}};if(version===3)old.powers={levels:Object.fromEntries(POWER_IDS.map(id=>[id,id==='strength'?20:0])),equipped:['strength',null,null]};
    const save=decodeSave(JSON.stringify(old));assert.ok(save);assert.equal(save.version,8);const g=new Game({save});assert.equal(g.hero.level,35);assert.equal(g.hero.xp,947);assert.equal(g.hero.coins,785);assert.equal(g.hero.x,4370);assert.equal(g.look.suit,'#c0ffee');assert.equal(g.powers.data.points,version===3?14:34);assert.deepEqual(g.world.unlocked,[1,2,3,4,5,6,7]);assert.equal(g.healthRoots,0);assert.ok(decodeSave(JSON.stringify(save)));}
});
test('v4 round-trip retains location, damaged HP, roots, inventory, monsters, clock and world history',()=>{
  const g=regional(5);g.hero.level=65;g.hero.maxHp=1060;g.hero.hp=500;g.hero.x=3450;g.hero.y=600;g.hero.xp=500;g.healthRoots=3;g.hero.coins=300;g.powers.data.levels.strength=20;g.powers.data.points=44;const e=g.enemies[0];e.hp=0;e.state='dead';e.respawn=12;
  const text=g.save(),save=decodeSave(text);assert.ok(save);const restored=new Game({save});assert.equal(restored.hero.x,3450);assert.equal(restored.hero.hp,500);assert.equal(restored.healthRoots,3);assert.equal(restored.enemies[0].state,'dead');assert.equal(restored.enemies[0].respawn,12);assert.deepEqual(restored.world.bossVictories,g.world.bossVictories);assert.equal(restored.world.clockReference,g.world.clockReference);
});
test('invalid future, inventory overflow, duplicate gear and inconsistent world saves are rejected intact',()=>{
  const raw=JSON.parse(empty().save()),variants=[];let a=structuredClone(raw);a.version=99;variants.push(a);a=structuredClone(raw);a.world.unlocked=[1,8];variants.push(a);a=structuredClone(raw);a.healthRoots=5;variants.push(a);a=structuredClone(raw);a.inventory.items=Array.from({length:8},(_,i)=>createEquipment(1,'ordinary',0,i+1));variants.push(a);a=structuredClone(raw);a.world.location.y=700;variants.push(a);
  for(const v of variants)assert.equal(decodeSave(JSON.stringify(v)),null);
  assert.equal(normalizeInventory({items:[createEquipment(1,'ordinary',0),createEquipment(1,'ordinary',0)],equipped:{},pending:[]}),null);
  const data=new Map([[PROFILE_KEY,JSON.stringify({version:2,slots:[{id:'old',snapshot:variants[1]},null,null]})]]),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},before=data.get(PROFILE_KEY),store=new LocalHeroStore(storage);assert.equal(store.writable,false);assert.equal(data.get(PROFILE_KEY),before);
});
test('safe airborne saves remain valid above upper platforms, across every region',()=>{
  for(const region of WORLD_REGIONS){const g=regional(region.id);g.enemies=[];g.hero.x=2400;g.hero.y=g.surfaces.find(s=>s.id==='p6').y;
    for(let i=0;i<900;i++){g.step(STEP,{move:Math.floor(i/120)%2?-1:1,jump:i%70===0||i%70===18});if(i%10===0&&!g.hero.dead){const save=decodeSave(g.save());assert.ok(save,`${region.name} invalid airborne save at ${g.hero.x}, ${g.hero.y}`);assert.equal(save.world.location.y,g.hero.y);}}
  }
});
test('all camps protect against regular damage and spawns stay outside their safe core',()=>{
  for(const r of WORLD_REGIONS){const g=regional(r.id);for(const camp of g.camps){g.hero.x=camp.x;g.hero.y=camp.y;g.hero.invulnerable=0;assert.equal(g.hurt(200,camp.x+50,g.enemies[0]),false);assert.equal(g.hero.hp,100);}
    for(const e of g.enemies)if(Math.abs(e.y-600)<100)assert.ok(g.camps.every(c=>Math.abs(e.spawnX-c.x)>=210));
  }
});
test('airborne reload preserves momentum and used double jump; fractional HP is not regenerated',()=>{
  const g=empty();g.step(STEP,{jump:true});tick(g,12);g.step(STEP,{jump:true,move:1});g.hero.hp=.25;
  const copy=new Game({save:decodeSave(g.save())});assert.equal(copy.hero.jumps,2);assert.equal(copy.hero.hp,.25);assert.equal(copy.hero.vy,g.hero.vy);assert.equal(copy.hero.vx,g.hero.vx);copy.step(STEP,{jump:true});assert.equal(copy.hero.jumps,2);assert.ok(copy.hero.vy>g.hero.vy);
});

test('new Root controls preserve existing custom H and controller button 11 bindings',()=>{
  const settings=normalizeControls({keys:{power0:['KeyH']},pad:{power0:11}});assert.deepEqual(settings.keys.power0,['KeyH']);assert.notEqual(settings.keys.heal[0],'KeyH');assert.equal(settings.pad.power0,11);assert.notEqual(settings.pad.heal,11);
  const saved=normalizeControls(settings);assert.deepEqual(saved,settings);const fresh=normalizeControls();assert.deepEqual(fresh.keys.heal,['KeyH']);assert.equal(fresh.pad.heal,11);
});
