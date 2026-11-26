import test from 'node:test';
import {powerStats as fireballStats} from '../../royale/powers.mjs';
import assert from 'node:assert/strict';
import {Game,STEP,decodeSave} from '../../royale/core.mjs';
import {HIT_GRACE,regularMonsterDamage,damageToEnemy} from '../../royale/combat-tuning.mjs';
import {maximumHP,monsterXP,xpForLevel,PROGRESSION} from '../../royale/progression.mjs';
import {TYPES} from '../../royale/world.mjs';
import {LocalSession,captureProgress} from '../../royale/local-coop/session.mjs';
import {fixture,pressure,active,offense} from './game-balance-audit.mjs';

test('simultaneous enemies give one hit and recovery, with real danger after recovery',()=>{
 const g=fixture(66,'wisp',{night:true,count:8}),before=g.hero.hp;
 const sources=g.enemies.map(e=>({...e,damageEvent:{}}));
 for(const e of sources)g.hurt(g.monsterDamage(e),e.x,e);
 assert.equal(g.hero.hp,before-102);assert.equal(g.hero.invulnerable,HIT_GRACE);
 g.hero.invulnerable=0;g.time=HIT_GRACE;
 assert.equal(g.hurt(102,1050,sources[0]),false,'same event cannot hit again');
 assert.equal(g.hurt(102,1050,{...sources[0],damageEvent:{}}),true);
 assert.equal(g.hero.hp,before-204);
});
test('all recommended region entry levels survive three seconds of dense, staggered night pressure',()=>{
 for(const [level,region]of [[1,1],[11,2],[21,3],[36,4],[51,5],[66,6],[81,7]]){
  for(const [type,def]of Object.entries(TYPES).filter(([,d])=>d.region===region)){
   const result=pressure(level,type,{night:true,count:8,staggered:true});
   assert.equal(result.dead,false,JSON.stringify(result));assert(result.hp>0);
  }
 }
});
test('attacks are not harmless: standing in late-region damage eventually defeats the hero',()=>{
 const result=pressure(81,'titan',{night:true,count:8,staggered:true,seconds:20});
 assert(result.dead);assert(result.hits>=4);
 assert(damageToEnemy(1000,14,{level:90})<damageToEnemy(1000,90,{level:90})*.1);
});
test('level 66 can win wisp groups with a legal classic build, without healing or dodging',()=>{
 for(const night of [false,true])for(const count of [1,3,8]){
  const result=active(66,'wisp',{night,count});
  assert.equal(result.dead,false,JSON.stringify(result));assert.equal(result.kills,count);
  assert(result.hp>=maximumHP(66)*.45);assert(result.seconds<12);
 }
});
test('Dark Energy sentinels remain dangerous without attacks and crowd control remains viable',()=>{
 const careless=pressure(66,'sentinel',{night:true,count:3,staggered:true,seconds:60});
 const controlled=active(66,'sentinel',{night:true,count:3,build:'control'});
 assert(careless.dead);assert(careless.hits>0);
 assert(!controlled.dead);assert.equal(controlled.kills,3);
});
test('late basic attacks remain useful while powers are cooling down',()=>{
 for(const [level,type,max]of [[66,'wisp',12],[80,'sentinel',16],[99,'titan',36]]){
  const basic=offense(level,type,{basic:true}),rotation=offense(level,type);
  assert(basic.seconds>2&&basic.seconds<max,JSON.stringify(basic));
  assert(rotation.seconds<basic.seconds*.6,JSON.stringify(rotation));
 }
});
for(const id of ['strength','superKick','seismicSmash'])test(`held basics yield to ${id} after their contact window`,()=>{
 const g=fixture(66,'wisp',{build:'allies'});g.powers.data.levels[id]=20;
 g.powers.data.equipped=[id,null,null];g.enemies=[];g.startAttack('kick');
 assert.equal(g.powers.activate(id),false,'startup must not be cancelled');
 g.hero.attack.age=.24;assert.equal(g.powers.activate(id),true);
 assert(id==='seismicSmash'?g.hero.powerPose?.id===id:g.hero.attack?.power===id);
});
test('night is twenty percent stronger than day in regions 3–7; boss attacks keep their telegraphs and damage',()=>{
 for(const [type,d]of Object.entries(TYPES)){
  const g=fixture(d.level,type);const e=g.enemies[0],day=g.monsterDamage(e);g.clock=()=>({night:true});
  assert.equal(g.monsterDamage(e),regularMonsterDamage(d.damage,d.region,true));
  assert(Math.abs(g.monsterDamage(e)/day-(d.region>2?1.2:1))<1e-8);
  assert.equal(g.monsterDamage({...e,boss:true,damage:235}),235);
 }
});
test('progression has no threshold migration and preserves every old level, XP and power ledger',()=>{
 for(let level=1;level<=99;level++){
  const n=level-1,old=Math.round((50+28*n+4*n*n)*(1+3*(Math.max(0,level-69)/29)**2));
  assert.equal(xpForLevel(level),old);assert.equal(maximumHP(level),100+15*n);
  const g=fixture(level,'bottle');g.enemies=[];g.hero.xp=level===99?0:old-1;
  const saved=captureProgress(g),restored=new Game({save:decodeSave(JSON.stringify(saved))});
  assert.equal(restored.hero.level,level);assert.equal(restored.hero.xp,saved.xp);
  assert.deepEqual(restored.powers.data.levels,saved.powers.levels);assert.deepEqual(restored.look,saved.look);
 }
});
test('kill rewards match the pre-balance progression across every hero and monster level',()=>{
 for(let hero=1;hero<=99;hero++)for(let enemy=1;enemy<=99;enemy++){
  const gap=hero-enemy,multiplier=gap<=3?1:gap<=6?.75:gap<=10?.35:gap<=15?.1:0;
  for(const base of [13,125,1000,5000])assert.equal(monsterXP(base,hero,enemy),Math.floor(base*multiplier));
 }
});
test('restored solo kill XP crosses a level threshold and grants the existing Power Point',()=>{
 const g=fixture(66,'wisp'),e=g.enemies[0],points=g.powers.data.points;
 g.hero.xp=xpForLevel(66)-1;Object.assign(e,{state:'dead',hp:0});
 Game.prototype.reward.call(g,e);
 assert.equal(g.hero.level,67);assert.equal(g.hero.xp,TYPES.wisp.xp-1);
 assert.equal(g.powers.data.points,points+1);
 const restored=new Game({save:decodeSave(JSON.stringify(captureProgress(g)))});
 assert.equal(restored.hero.level,67);assert.equal(restored.hero.xp,g.hero.xp);
 assert.equal(restored.powers.data.points,g.powers.data.points);
});
test('defeat loses two percent of the next level at most, with no lost levels or negative XP',()=>{
 const g=fixture(66,'wisp');g.hero.xp=10000;g.defeat();
 assert.equal(PROGRESSION.defeatFraction,.02);assert.equal(g.lastDefeatPenalty,Math.floor(xpForLevel(66)*.02));
 assert.equal(g.hero.level,66);g.respawn();g.hero.xp=1;g.defeat();assert.equal(g.hero.xp,0);
});
test('summoned helper waves grant no XP in solo or co-op',()=>{
 const g=fixture(66,'wisp');const e=g.enemies[0];Object.assign(e,{summoned:true,state:'dead',hp:0});
 Game.prototype.reward.call(g,e);assert.equal(g.hero.xp,0);assert.equal(g.hero.coins,0);
 const profiles=[0,1].map(i=>({identity:'balance-xp-'+i,slots:[{slot_number:1,snapshot:captureProgress(new Game())}],async save(){}}));
 const s=new LocalSession(profiles.map(profile=>({profile,slot:1}))),foe=s.games[0].enemies[0];
 Object.assign(foe,{summoned:true,state:'dead',hp:0});s.authority.reward(s.heroes[0],foe);
 assert.deepEqual(s.games.map(g=>g.hero.xp),[0,0]);
});
test('co-op restores full shared rewards across differing levels and a capped companion',()=>{
 const profiles=[0,1].map(i=>({identity:'balance-share-'+i,slots:[{slot_number:1,snapshot:captureProgress(new Game())}],async save(){}}));
 const s=new LocalSession(profiles.map(profile=>({profile,slot:1}))),credits=[0,0];
 s.games.forEach((g,i)=>g.gainXP=x=>{credits[i]+=x;});
 const victims=s.games[0].enemies.slice(0,2);
 for(const foe of victims){Object.assign(foe,{type:'bottle',level:1,state:'dead',hp:0});s.authority.reward(s.heroes[0],foe);}
 assert.deepEqual(credits,[TYPES.bottle.xp,TYPES.bottle.xp]);
 s.games[0].hero.level=1;s.games[1].hero.level=98;
 const foe=s.games[0].enemies[2];Object.assign(foe,{type:'guardian',level:90,state:'dead',hp:0});
 const pool=TYPES.guardian.xp;
 s.authority.reward(s.heroes[0],foe);assert.equal(credits[0]+credits[1],2*TYPES.bottle.xp+pool);
 assert(Math.abs(credits[0]-credits[1])<=1);
 // A max-level companion does not make a same-level fight worthless for P1.
 s.games[0].hero.level=66;s.games[1].hero.level=99;credits.fill(0);
 const capped=s.games[0].enemies[3];Object.assign(capped,{type:'wisp',level:66,state:'dead',hp:0});
 s.authority.reward(s.heroes[0],capped);
 assert.equal(credits[0]+credits[1],monsterXP(TYPES.wisp.xp,66,66));
 assert(credits[0]>0);assert(Math.abs(credits[0]-credits[1])<=1);
});
test('each co-op hero gets independent hit protection, including the same enemy volley',()=>{
 const profiles=[0,1].map(i=>({identity:'balance-hurt-'+i,slots:[{slot_number:1,snapshot:captureProgress(fixture(66,'wisp'))}],async save(){}}));
 const s=new LocalSession(profiles.map(profile=>({profile,slot:1}))),source={type:'wisp',level:66,damageEvent:{}};
 for(const g of s.games){Object.assign(g.hero,{x:1000,y:600,hp:maximumHP(66),invulnerable:0});assert(g.hurt(102,1040,source));}
 assert.deepEqual(s.games.map(g=>g.hero.hp),[973,973]);
 assert(s.games.every(g=>!g.hurt(102,1040,{...source,damageEvent:{}})));
 assert.deepEqual(s.games.map(g=>g.hero.hp),[973,973]);
});

 test('Fireball damage progresses evenly and piercing matches the approved tiers',()=>{
 // Read the production power stats through the mapped module in the release runner.
 for(let rank=1;rank<=20;rank++){
 const stats=fireballStats('fireball',rank,{heroLevel:99});
 assert(Math.abs(stats.damage-(220+2580*(rank-1)/19))<1e-8);
 assert.equal(stats.projectiles,rank===20?3:rank>=10?2:1);
 assert.equal(stats.pierce,rank===20?3:rank>=10?2:1);
 assert.equal(stats.cooldown,5);
 }
 });
