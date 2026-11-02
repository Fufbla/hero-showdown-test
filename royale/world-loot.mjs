import {itemDefinition} from './equipment.mjs';
import {GATES} from './world.mjs';
export function normalizeLoot(raw=[]){
 if(!Array.isArray(raw)||raw.length>2048)return null;
 const ids=new Set(),itemIds=new Set();return raw.every(o=>o&&/^loot-\d+$/.test(o.id)&&Number.isSafeInteger(Number(o.id.slice(5)))&&!ids.has(o.id)&&ids.add(o.id)&&Number.isInteger(o.region)&&o.region>=1&&o.region<=7&&Number.isFinite(o.x)&&o.x>=0&&o.x<=6200&&Number.isFinite(o.y)&&o.y>=-500&&o.y<=1000&&['root','equipment'].includes(o.kind)&&(o.kind==='root'||itemDefinition(o.item)&&/^drop-\d+$/.test(o.item.uid)&&!itemIds.has(o.item.uid)&&itemIds.add(o.item.uid)))?raw.map(o=>({id:o.id,region:o.region,x:o.x,y:o.y,vy:0,kind:o.kind,item:o.kind==='equipment'?{uid:o.item.uid,catalogId:o.item.catalogId}:null,...(Number.isFinite(o.remaining)&&o.remaining>=0?{remaining:o.remaining}:{})})):null;
}
// Default is persistent loot. Expiry is opt-in configuration only, never an implicit rule.
export const LOOT_LIFETIME_SECONDS=null;
export function configureLootLifetime(g,seconds=null){if(seconds!==null&&(!Number.isFinite(seconds)||seconds<=0))throw new RangeError('Loot lifetime must be positive seconds or null for persistent loot');g.lootLifetime=seconds;}
export function spawnLoot(g,e,kind,item=null){
 const x=Math.max(16,Math.min(6144,e.x)),y=e.y-12;
 g.loot.push({id:`loot-${g.inventory.nextId++}`,region:g.regionId,x,y,vy:0,kind,item,...(Number.isFinite(g.lootLifetime)?{remaining:g.lootLifetime}:{})});
}
export function stepLoot(g,dt){
 for(const o of g.loot)if(Number.isFinite(o.remaining))o.remaining-=dt;
 g.loot=g.loot.filter(o=>!Number.isFinite(o.remaining)||o.remaining>0);
 if(g.portalPickupGuard&&Math.hypot(g.hero.x-g.portalPickupGuard.x,g.hero.y-g.portalPickupGuard.y)>=90)g.portalPickupGuard=null;
 if(g.arenaScene)return;
 for(const o of g.loot){if(o.region!==g.regionId)continue;
  const below=g.surfaces.filter(s=>o.x>=s.x&&o.x<=s.x+s.w&&s.y>=o.y-1).sort((a,b)=>a.y-b.y)[0];
  if(!below){const safe=g.camps[0];o.x=safe.x;o.y=safe.y;continue;}
  o.vy=Math.min(700,o.vy+1200*dt);o.y=Math.min(below.y,o.y+o.vy*dt);if(o.y===below.y)o.vy=0;
 }
}
export function nearbyInteractions(g){
 const h=g.hero;if(h.dead)return [];
 const result=[],add=(id,kind,x,y,label,extra={})=>{const distance=Math.hypot(h.x-x,h.y-y);if(['portal','passage'].includes(kind)&&!g.canTravel()||kind==='camp'&&!g.canSave())return;if(['portal','passage'].includes(kind)&&g.portalPickupGuard?.region===g.regionId&&Math.hypot(h.x-g.portalPickupGuard.x,h.y-g.portalPickupGuard.y)<90)return;if(distance<=90)result.push({id,kind,x,y,label,distance,...extra});};
 if(g.arenaScene){if(g.availableChest())add('chest','chest',1060,h.y,'View treasure');return result;}
 for(const o of g.loot)if(o.region===g.regionId)add(o.id,'loot',o.x,o.y,`Pick Up · ${o.kind==='root'?'Health Root':itemDefinition(o.item).name}`,{loot:o});
 g.camps.forEach((c,i)=>{add(`camp-${i}`,'camp',c.x,c.y,'Rest',{index:i});add(`portal-${i}`,'portal',c.x+90,c.y,'Enter Portal · World Map');});
 if(g.regionId>1)add('back','passage',GATES.back,600,'Enter Portal · Previous region');
 if(g.regionId<7)add('forward','passage',GATES.forward,600,'Enter Portal · Next region');
 add('arena','passage',GATES.arena,600,`Enter Arena · ${g.getRegion().boss}`);
 return result.sort((a,b)=>a.distance-b.distance||a.id.localeCompare(b.id));
}
export function selectedInteraction(g,kind=null){const list=nearbyInteractions(g).filter(t=>!kind||kind==='loot'&&t.kind==='loot'||kind==='travel'&&t.kind!=='loot');return list.find(t=>t.id===g.interactionTarget)||list[0];}
export function pickupLoot(g,id,replaceUid=null,confirmed=false){
 const o=g.loot.find(o=>o.id===id);if(!o||g.arenaScene||g.hero.dead||o.region!==g.regionId||Math.hypot(g.hero.x-o.x,g.hero.y-o.y)>90)return false;
 if(o.kind==='root'){if(g.healthRoots>=4){g.emit('loot-full',{message:'Health Roots full · use one or leave this orb.'});return false;}g.healthRoots++;g.recordEconomy('reward');}
 else {
  if(g.inventory.items.length>=7){
   if(!confirmed||!replaceUid||!g.canSave()){g.emit('loot-full',{id,message:'Equipment full · compare items or leave this orb.'});return false;}
   const old=g.inventory.items.find(i=>i.uid===replaceUid);if(!old||itemDefinition(old).rarity==='legendary')return false;
   if(!g.discardItem(replaceUid,true))return false;
  }
  g.inventory.items.push(o.item);g.recordEconomy('reward');
 }
 g.portalPickupGuard={region:g.regionId,x:g.hero.x,y:g.hero.y};g.loot.splice(g.loot.indexOf(o),1);g.emit('loot-picked',{message:o.kind==='root'?'Health Root collected':itemDefinition(o.item).name+' collected'});return true;
}
export function drawLoot(c,g){
 for(const o of g.loot){if(o.region!==g.regionId)continue;const y=o.y-14+Math.sin(g.time*2+o.x)*2;
  c.save();const glow=c.createRadialGradient(o.x,y,1,o.x,y,22);glow.addColorStop(0,'#ffffffed');glow.addColorStop(.35,'#ffffff90');glow.addColorStop(1,'#ffffff00');c.fillStyle=glow;c.fillRect(o.x-22,y-22,44,44);
  c.fillStyle='#fff';c.strokeStyle='#617b96';c.lineWidth=1;c.beginPath();c.arc(o.x,y,6,0,Math.PI*2);c.fill();c.stroke();
  for(let i=0;i<3;i++){const a=g.time*.8+i*2.094;c.globalAlpha=.45;c.beginPath();c.arc(o.x+Math.cos(a)*13,y+Math.sin(a)*12,1.2,0,Math.PI*2);c.fill();}c.restore();
 }
}
