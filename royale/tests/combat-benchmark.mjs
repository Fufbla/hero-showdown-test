// Repeatable ideal-contact damage benchmark. Uses the real attack clock, hit
// detection, projectile bursts, power cooldowns and legal earned Power Points.
// Enemies do not move or retaliate here: these are lower bounds on fight time.
import {Game,STEP} from '../core.mjs';
import {normalizePowers} from '../powers.mjs';
import {COSTUME_SETS,COSTUME_PARTS} from '../costume-catalog.mjs';
import {STRENGTH_SUITS} from '../strength-armor.mjs';
import {TYPES} from '../world.mjs';
import {makeBoss} from '../bosses.mjs';
import {makeLegendary} from '../legendary-bosses.mjs';
import {WORLD_CLOCK_REFERENCE} from '../world-state.mjs';

export function combatFixture(level,{gear='ordinary',build='mixed'}={}){
 const g=new Game({random:()=>.99,now:()=>WORLD_CLOCK_REFERENCE});
 Object.assign(g.hero,{level,hp:100+15*(level-1),maxHp:100+15*(level-1),invulnerable:0});
 const data=normalizePowers(null,level),ids=['strength','superKick','fireball'];let points=level-1;
 if(build!=='mixed'&&ids.includes(build)){data.levels[build]=Math.min(20,points);points-=data.levels[build];}
 while(points&&ids.some(id=>data.levels[id]<20))for(const id of ids)if(points&&data.levels[id]<20){data.levels[id]++;points--;}
 data.levels.speed=Math.min(20,points);points-=data.levels.speed;data.points=points;
 data.equipped=ids.map(id=>data.levels[id]?id:null);g.powers.data=data;
 const set=Object.values(COSTUME_SETS).filter(s=>s.level<=level).at(-1);
 const armor=STRENGTH_SUITS.filter(s=>s.level<=level).at(-1);
 if(gear!=='none')for(const part of COSTUME_PARTS){
  const catalogId=gear==='armor'&&armor?`${armor.setId}-${part}`:`eris-${set.id}-${gear==='rare'&&set.region>=4?'rare':'ordinary'}-${part}`;
  const item={uid:`drop-${g.inventory.nextId++}`,catalogId};g.inventory.items.push(item);g.inventory.equipped[part]=item.uid;
 }
 g.refreshEquipment();return g;
}

export function benchmark(level,{type='guardian',gear='ordinary',build='mixed',attack='rotation',limit=240}={}){
 const g=combatFixture(level,{gear,build});
 const region=TYPES[type]?.region||7;g.loadRegion(region,{x:700,y:600});
 const surface=g.surfaces.find(s=>s.id==='sand-a');
 const e=type==='boss'?makeBoss(7,surface):type==='legendary'?makeLegendary('lightning',surface):g.makeEnemy(type,740,surface.id,0);
 e.protection=0;g.enemies=[e];g.hero.invulnerable=1e9;
 // Perfect contact and no retaliation isolate damage, without shortening any
 // player attack, combo, burst, cooldown or recovery timing.
 g.stepEnemy=()=>{};g.stepEncounter=()=>{};
 let steps=0,firstSecond=0,hits=0;
 while(e.hp>0&&steps<limit/STEP){
  e.x=g.hero.x+40;e.y=g.hero.y;e.prevX=e.x;e.prevY=e.y;
  const power=attack==='rotation'?[true,true,true]:['strength','superKick','fireball'].includes(attack)?['strength','superKick','fireball'].map(id=>id===attack):[];
  g.step(STEP,{powers:power,kickHeld:attack==='rotation'||attack==='kick',punchHeld:attack==='punch'});
  hits+=g.drain().filter(event=>event.type==='hit').length;steps++;
  if(steps===60)firstSecond=e.maxHp-e.hp;
 }
 return {level,type,gear,build,attack,hp:e.maxHp,seconds:e.hp<=0?Number((steps*STEP).toFixed(2)):null,remaining:Number(e.hp.toFixed(2)),firstSecond:Number(firstSecond.toFixed(2)),hits};
}

export function combatMatrix(){
 const rows=[];
 for(const level of [1,14,30,60,80,90,99])rows.push(benchmark(level));
 for(const gear of ['none','rare','armor'])for(const level of [14,90,99])rows.push(benchmark(level,{gear}));
 for(const [level,type] of [[1,'bottle'],[14,'sprout'],[30,'sludge'],[60,'stalker'],[80,'sentinel'],[99,'titan']])rows.push(benchmark(level,{type}));
 for(const type of ['boss','legendary'])rows.push(benchmark(90,{type}),benchmark(99,{type}));
 return rows;
}

// Live enemy AI and player contact/stun are enabled. This deliberately simple
// melee pursuit uses no dodging; optional Roots demonstrate healing decisions.
export function activeEncounter(level,{roots=0,count=1,limit=60}={}){
 const g=combatFixture(level);g.loadRegion(7,{x:700,y:600});g.hero.invulnerable=0;g.healthRoots=roots;
 g.enemies=Array.from({length:count},(_,id)=>{const e=g.makeEnemy('guardian',740+id*90,'sand-a',id);e.protection=0;return e;});
 const e=g.enemies[0],hits=[];let steps=0;
 while(!g.hero.dead&&e.hp>0&&steps<limit/STEP){
  const distance=e.x-g.hero.x;
  g.step(STEP,{move:Math.abs(distance)>45?Math.sign(distance):0,kickHeld:true,powers:[true,true,true],heal:g.hero.hp<g.hero.maxHp*.5});
  for(const event of g.drain())if(event.type==='hurt')hits.push(Number(g.time.toFixed(2)));
  steps++;
 }
 return {level,count,seconds:Number(g.time.toFixed(2)),heroHP:Number(g.hero.hp.toFixed(2)),enemyHP:Number(e.hp.toFixed(2)),rootsUsed:roots-g.healthRoots,hits};
}
