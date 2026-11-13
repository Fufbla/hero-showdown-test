import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../../../royale/core.mjs';
import {BOSSES,attackFor} from '../../../royale/boss-data.mjs';
import {makeBoss,stepBoss} from '../../../royale/bosses.mjs';
import {LEGENDARY,LEGENDARY_ATTACKS} from '../../../royale/legendary-data.mjs';
import {makeLegendary,stepLegendaryBoss,legendaryZones} from '../../../royale/legendary-bosses.mjs';
import {BOSS_IDS,spritePose,contactReady,cuePlan,attackFamily} from '../model.mjs';
import {makePracticeGame,practiceRequest} from '../practice.mjs';
import {drawBossAttackFX,drawDangerZone} from '../effects.mjs';
const cases=[...Object.entries(BOSSES).map(([id,d])=>({id:Number(id),d,legend:false})),...Object.entries(LEGENDARY).map(([id,d])=>({id,d,legend:true}))];
const actions=cases.flatMap(c=>[...new Set(c.d.patterns.flat())].map(kind=>({...c,kind})));
test('verified roster includes all 15 bosses and all 77 attack entries',()=>{assert.equal(cases.length,15);assert.equal(actions.length,77);});
function fixture(row,phase,face,edge){
 const b=row.legend?makeLegendary(row.id,{}):makeBoss(row.id,{});Object.assign(b,{x:edge,prevX:edge,phase,face});
 const hero={x:edge+face*100,y:600},hits=[],shots=[];
 const g={hero,time:0,enemyShots:shots,legendaryHazards:[],heroBox:()=>({x:hero.x-17,y:hero.y-88,w:34,h:88}),hurt:(...args)=>hits.push(args),spawnEnemyShot:p=>shots.push(p),emit(){}};
 // Let the real state machine construct the zones for the selected attack.
 const patterns=row.d.patterns[phase-1],available=patterns.indexOf(row.kind);
 if(available>=0){b.pattern=available;b.age=2;(row.legend?stepLegendaryBoss:stepBoss)(g,b,0);}
 else{
  // Cross-phase readability checks also cover attacks outside that phase's rotation.
  const a=row.legend?{...LEGENDARY_ATTACKS[row.kind],kind:row.kind}:attackFor(b,row.kind);
  Object.assign(a,{targetX:hero.x,startX:b.x,startY:b.y,hit:false});
  if(row.legend)a.zones=legendaryZones(b,a);
  else if(['ground','fall'].includes(a.shape))a.zones=Array.from({length:a.spots||1},(_,i)=>({x:Math.max(300,Math.min(1720,hero.x+(i-((a.spots||1)-1)/2)*210))-a.width/2,y:a.shape==='ground'?548:80,w:a.width,h:a.shape==='ground'?52:520}));
  else if(a.shape==='melee')a.zones=[{x:face>0?b.x:b.x-a.reach,y:495,w:a.reach,h:105}];
  else if(a.shape==='sweep')a.zones=[{x:b.x-a.reach,y:552,w:a.reach*2,h:48}];else a.zones=[];
  b.attack=a;b.state='windup';b.age=0;
 }
 return {b,g,hits,shots,step:dt=>(row.legend?stepLegendaryBoss:stepBoss)(g,b,dt)};
}
for(const row of actions)test(`${row.legend?'Legendary':'Regional'} ${row.d.name}: ${row.kind} contact, both directions, three phases and arena edges`,()=>{
 for(const phase of [1,2,3])for(const face of [-1,1])for(const edge of [350,1660]){
  const {b,g,hits,shots,step}=fixture(row,phase,face,edge),a=b.attack,before=structuredClone(b);
  const prep=spritePose(b,0),cues=cuePlan(b);assert.equal(prep.contact,false);assert.equal(cues.some(c=>c.active),false);assert.deepEqual(b,before,'Presentation mutated simulation');
  if(['ground','fall','lightning','trap','cloud','tornado','leap','melee','sweep'].includes(a.shape))assert.deepEqual(cues.map(c=>c.zone),a.zones);
  step(a.warning-.000001);assert.equal(b.state,'windup');assert.equal(hits.length,0);assert.equal(shots.length,0);assert.equal(g.legendaryHazards.length,0);
  step(.000002);assert.equal(b.state,'active');
  const delayed=(!row.legend&&row.id===4)||a.shape==='leap';assert.equal(contactReady(b),!delayed);
  const base={melee:4,ranged:8,ground:12}[attackFamily(a.shape)];assert.equal(spritePose(b).frame,base+(delayed?0:1));
  if(delayed){assert.equal(hits.length,0);step(a.duration*(a.shape==='leap'?.98:.65)+.00001);assert.equal(contactReady(b),true);assert.equal(spritePose(b).frame,base+1);}
  if(['projectile','bounce'].includes(a.shape)){assert.equal(shots.length,a.count);for(const p of shots)assert.equal(p.damage,b.damage*a.damage);}
  if(a.shape==='wave')assert.equal(shots.length,a.double?4:2);
  if(a.shape==='fall'){assert.equal(shots.length,a.zones.length);assert.deepEqual(shots.map(s=>s.x),a.zones.map(z=>z.x+z.w/2));}
  if(['trap','cloud','tornado'].includes(a.shape)){assert.equal(g.legendaryHazards.length,a.zones.length);for(const h of g.legendaryHazards){assert.equal(h.life,a.life);assert.equal(h.damage,b.damage*a.damage);}}
  for(const hit of hits)assert.equal(hit[0],b.damage*a.damage);
 }
});
function recorder(){const calls=[],c={globalAlpha:1};for(const method of ['save','restore','beginPath','ellipse','arc','fill','stroke','moveTo','lineTo','closePath','translate','rotate','rect','clip'])c[method]=(...args)=>calls.push({method,args});for(const method of ['fillRect','strokeRect','fillText','strokeText','setLineDash'])c[method]=()=>{throw Error('Artificial warning drawing: '+method);};return {c,calls};}
test('all attack stages and persistent hazards render without warning rectangles, labels or dash lines',()=>{
 for(const row of actions){const {b,g}=fixture(row,3,-1,1180);g.arenaScene={boss:b};
  for(const stage of ['windup','active','recover']){b.state=stage;b.age=.1;g.time=10;const {c,calls}=recorder();drawBossAttackFX(c,g);if(stage==='windup')assert(calls.length,`${row.d.name} ${row.kind} has no natural preparation`);}
 }
 for(const kind of ['trap','cloud','tornado','lightning']){const {c,calls}=recorder();drawDangerZone(c,{x:400,y:415,w:155,h:185},{shape:kind,time:10,active:true,theme:kind==='lightning'?'lightning':'air'});assert(calls.length>10);}
});
test('all 15 practice fights preserve the source hero and use the unchanged boss health and damage',()=>{
 const original=new Game(),save=JSON.parse(original.save()),before=structuredClone(save);
 for(const [i,id]of BOSS_IDS.entries())for(const phase of [1,2,3]){
  const g=makePracticeGame(Game,save,{id,phase}),b=g.arenaScene.boss,d=i<7?BOSSES[i+1]:LEGENDARY[id.slice(10)];
  assert.equal(g.hero.level,99);assert.equal(b.maxHp,i<7?d.hp:BOSSES[7].hp*3);assert.equal(b.damage,d.damage);assert.equal(b.phase,phase);assert.equal(g.inventory.pending.length,0);assert.deepEqual(save,before);
 }
 assert.equal(practiceRequest(new URLSearchParams('bossPractice=regional-trash-monster'),false),null);
 assert.equal(practiceRequest(new URLSearchParams('bossPractice=unknown'),true),null);
});
