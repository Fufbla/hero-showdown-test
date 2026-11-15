// Run through register.mjs: real production damage, timings, AI and legal skill points.
// Ideal contact isolates offense; pressure is an intentionally undodged stress test.
import {pathToFileURL} from 'node:url';
import {Game,STEP} from '../../royale/core.mjs';
import {combatFixture} from '../../royale/tests/combat-benchmark.mjs';
import {normalizePowers} from '../../royale/powers.mjs';
import {TYPES} from '../../royale/world.mjs';
import {maximumHP,monsterXP,xpForLevel} from '../../royale/progression.mjs';

export function fixture(level,type,{build='classic',night=false,count=1}={}){
 const g=combatFixture(level,{gear:'none'});
 g.loadRegion(TYPES[type].region,{x:1000,y:600});g.clock=()=>({night});
 Object.assign(g.hero,{x:1000,y:600,prevX:1000,prevY:600,hp:maximumHP(level),maxHp:maximumHP(level),invulnerable:0});
 if(build!=='classic'){
  const ids=build==='control'?['whirlwind','roots','fireball']:['animalAllies','seismicSmash','whirlwind'];
  const data=normalizePowers(null,level);let points=level-1;
  // Invest in a useful primary power before spreading remaining points.
  for(const id of [...ids,'speed','steel']){data.levels[id]=Math.min(20,points);points-=data.levels[id];}
  data.points=points;data.equipped=ids.map(id=>data.levels[id]?id:null);g.powers.data=data;
 }
 g.enemies=Array.from({length:count},(_,i)=>{
  const e=g.makeEnemy(type,1040+i*15,'sand-a',i);e.protection=0;return e;
 });
 // Rewards must not level/refill the benchmark hero or respawn defeated targets.
 g.reward=e=>{e.rewarded=true;};g.respawnDelay=()=>1e9;g.stepEncounter=()=>{};
 return g;
}
export function offense(level,type,{build='classic',count=1,basic=false,limit=240}={}){
 const g=fixture(level,type,{build,count});g.hero.invulnerable=1e9;g.stepEnemy=()=>{};
 let frames=0;
 while(g.enemies.some(e=>e.hp>0)&&frames<limit/STEP){
  g.enemies.forEach((e,i)=>Object.assign(e,{x:g.hero.x+40+i*15,y:g.hero.y,prevX:g.hero.x+40+i*15,prevY:g.hero.y}));
  g.step(STEP,{kickHeld:true,powers:basic?[]:[true,true,true]});g.drain();frames++;
 }
 return {level,type,build,count,basic,seconds:g.enemies.every(e=>e.hp<=0)?+(frames*STEP).toFixed(2):null,remaining:Math.round(g.enemies.reduce((sum,e)=>sum+e.hp,0))};
}
export function pressure(level,type,{night=false,count=8,seconds=3,staggered=false}={}){
 const g=fixture(level,type,{night,count});let hits=0;
 for(let frame=0;frame<seconds/STEP&&!g.hero.dead;frame++){
  g.time=frame*STEP;g.hero.invulnerable=Math.max(0,g.hero.invulnerable-STEP);
  // Every attacker gets a new event every 1.8 seconds, with optional offsets.
  for(const [i,e]of g.enemies.entries())if((frame+(staggered?i*13:0))%108===0){e.damageEvent={};if(g.hurt(g.monsterDamage(e),e.x,e))hits++;}
 }
 return {level,type,count,night,staggered,seconds,hits,hp:Math.round(g.hero.hp),dead:g.hero.dead};
}
export function active(level,type,{build='classic',night=false,count=1,limit=60}={}){
 const g=fixture(level,type,{build,night,count});let hits=0,frames=0;
 while(!g.hero.dead&&g.enemies.some(e=>e.hp>0)&&frames<limit/STEP){
  const target=g.enemies.filter(e=>e.hp>0).sort((a,b)=>Math.abs(a.x-g.hero.x)-Math.abs(b.x-g.hero.x))[0];
  const d=target.x-g.hero.x;
  g.step(STEP,{move:Math.abs(d)>45?Math.sign(d):0,kickHeld:true,powers:[true,true,true]});
  hits+=g.drain().filter(e=>e.type==='hurt').length;frames++;
 }
 return {level,type,build,count,night,seconds:+(frames*STEP).toFixed(2),hits,hp:Math.round(g.hero.hp),dead:g.hero.dead,kills:g.enemies.filter(e=>e.hp<=0).length};
}
export function levelingModel(killsPerMinute=12){
 // Choose the highest XP of normal enemies within seven levels of the hero.
 // This is a rate assumption, not recorded player telemetry or a time gate.
 const bands=Array.from({length:7},()=>({kills:0,minutes:0}));
 for(let level=1;level<99;level++){
  const eligible=Object.values(TYPES).filter(e=>e.level<=level+7);
  const xp=Math.max(...eligible.map(e=>monsterXP(e.xp,level,e.level)));
  const kills=xpForLevel(level)/Math.max(1,xp);
  const band=level<=10?0:level<=20?1:level<=35?2:level<=50?3:level<=65?4:level<=80?5:6;
  bands[band].kills+=kills;bands[band].minutes+=kills/killsPerMinute;
 }
 return {killsPerMinute,hours:+(bands.reduce((sum,b)=>sum+b.minutes,0)/60).toFixed(2),bands:bands.map(b=>({kills:Math.round(b.kills),hours:+(b.minutes/60).toFixed(2)}))};
}
export function audit(){
 const offenseRows=[],activeRows=[],pressureRows=[];
 for(const [type,def]of Object.entries(TYPES)){
  for(const build of ['classic','control','allies'])offenseRows.push(offense(def.level,type,{build}));
  offenseRows.push(offense(def.level,type,{basic:true}));
  for(const night of [false,true])for(const count of [1,3,8]){
   activeRows.push(active(def.level,type,{night,count,build:'classic'}));
   pressureRows.push(pressure(def.level,type,{night,count}));
  }
 }
 for(const type of ['wisp','phantom','sentinel'])for(const night of [false,true])for(const build of ['classic','control','allies'])activeRows.push(active(66,type,{night,build,count:3}));
 return {offense:offenseRows,active:activeRows,pressure:pressureRows,leveling:[8,12,15,20,30].map(levelingModel)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(audit(),null,2));
