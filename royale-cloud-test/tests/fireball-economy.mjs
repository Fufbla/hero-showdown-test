// Ten-minute daylight patrols. A deterministic input driver uses regular combat, pickups and Tree sales.
import {Game,STEP} from '../core.mjs';
import {WORLD_CLOCK_REFERENCE} from '../world-state.mjs';
import {resaleValue} from '../costume-catalog.mjs';
import {itemDefinition} from '../equipment.mjs';
import {pickupLoot} from '../world-loot.mjs';
const rows=[];
for(const [level,region] of [[10,1],[20,2],[30,3],[40,4],[50,4],[60,5],[70,6],[80,6],[90,7]])for(const seed of [17,103,401]){
 let t=0,rng=seed;const random=()=>(rng=(Math.imul(1664525,rng)+1013904223)>>>0)/2**32;
 const g=new Game({random,now:()=>WORLD_CLOCK_REFERENCE+t*1000});g.loadRegion(region,{checkpoint:true});Object.assign(g.hero,{level,maxHp:100+(level-1)*15,hp:100+(level-1)*15});g.powers.data.levels.fireball=Math.min(level-1,20);g.powers.data.equipped=['fireball',null,null];g.started=true;g.paused=false;
 let sales=0,count=0,dead=0,stop=0,dropValue=0,dropCount=0,seen=new Set();const seconds=600;
 for(let i=0;i<seconds*60;i++){
  t=i/60;const h=g.hero;
  for(const o of g.loot)if(o.kind==='equipment'&&!seen.has(o.id)){seen.add(o.id);dropValue+=resaleValue(itemDefinition(o.item));dropCount++}
  if(i<stop)continue;
  if(g.inventory.items.length>=6 && g.canTravel() && g.visitTree()){
    for(const item of [...g.inventory.items]){const q=g.sellItem(item.uid,{confirmed:true,revision:g.economy.revision});if(q.ok){sales+=q.value;count++;}}
    g.leaveTree();g.paused=false;stop=i+15*60;continue;
  }
  for(const o of [...g.loot])if(o.kind==='equipment'&&g.inventory.items.length<7)pickupLoot(g,o.id);
  const candidates=g.enemies.filter(e=>e.hp>0&&e.state!=='dead'&&e.y>=520);
  const target=candidates.sort((a,b)=>Math.abs(a.x-h.x)-Math.abs(b.x-h.x))[0];let move=0,jump=false;
  if(target){const dx=target.x-h.x;move=Math.abs(dx)>45?Math.sign(dx):h.face!==Math.sign(dx)?Math.sign(dx):0;jump=target.y<h.y-45&&i%40===0;}
  g.step(STEP,{move,run:true,jump,punchHeld:!!target&&Math.abs(target.x-h.x)<85,powers:[!!target&&Math.abs(target.x-h.x)<520&&i%6===0]});
  for(const e of g.drain())if(e.type==='defeat')dead++;
 }
 if(g.regionId!==region)throw Error('Region changed during patrol');
 rows.push({level,region,seed,seconds,kills:g.kills,killCoins:g.hero.coins-sales,sales,soldPieces:count,droppedPieces:dropCount,droppedResaleValue:dropValue,netCoins:g.hero.coins,defeats:dead});
}
console.log(JSON.stringify(rows,null,2));
