import { CAMPS, TYPES, regionCamps, regionSurfaces } from './world.mjs';
export const OPEN_REGIONS=Object.freeze([1,2,3,4,5,6,7]);
export const WORLD_CLOCK_REFERENCE=Date.UTC(2026,0,1);
export function initialWorld(now=Date.now()){
  return {region:1,unlocked:[...OPEN_REGIONS],bossVictories:[],clockReference:WORLD_CLOCK_REFERENCE,checkpoint:{region:1,index:0},activated:['1:0'],visits:{'1:0':1},kills:{},monsters:[],location:null};
}
export function normalizeWorld(raw,checkpoint=0,now=Date.now()){
  if(!raw){const world=initialWorld(now);world.checkpoint.index=checkpoint;world.activated=[`1:${checkpoint}`];return world;}
  const integers=(a,min,max)=>Array.isArray(a)&&a.every(n=>Number.isInteger(n)&&n>=min&&n<=max);
  if(!integers(raw.unlocked,1,7)||!raw.unlocked.includes(1)||!integers(raw.bossVictories,1,7))return null;
  const unlocked=[...OPEN_REGIONS],bossVictories=[...new Set(raw.bossVictories)];
  const region=raw.region;if(!unlocked.includes(region))return null;
  const cp=raw.checkpoint;if(!cp||!unlocked.includes(cp.region)||!Number.isInteger(cp.index)||cp.index<0||cp.index>=CAMPS.length)return null;
  if(!Number.isFinite(raw.clockReference)||raw.clockReference<0)return null;
  if(!Array.isArray(raw.activated)||!raw.activated.every(id=>/^[1-7]:[0-2]$/.test(id)&&unlocked.includes(Number(id[0])))||!raw.activated.includes(`${cp.region}:${cp.index}`))return null;
  const visits={},kills={};
  for(const [key,val] of Object.entries(raw.visits||{}))if(/^[1-7]:[0-2]$/.test(key)&&Number.isSafeInteger(val)&&val>=0)visits[key]=val;
  for(const [key,val] of Object.entries(raw.kills||{}))if(Object.hasOwn(TYPES,key)&&Number.isSafeInteger(val)&&val>=0)kills[key]=val;
  const camp=regionCamps(region)[region===cp.region?cp.index:0],l=raw.location;
  let location=null;
  if(l){
    if(!Number.isFinite(l.x)||!Number.isFinite(l.y)||l.x<17||l.x>6143||l.y< -512||l.y>890||!Number.isFinite(l.hp)||l.hp<=0)return null;
    // Never restore a hero inside a solid wall, even if storage has been edited.
    if(regionSurfaces(region).some(s=>!s.oneWay&&l.x+17>s.x&&l.x-17<s.x+s.w&&l.y>s.y+.01&&l.y-88<s.y+s.h))return null;
    location={x:l.x,y:l.y,face:l.face===-1?-1:1,hp:l.hp,vx:Number.isFinite(l.vx)?Math.max(-600,Math.min(600,l.vx)):0,vy:Number.isFinite(l.vy)?Math.max(-900,Math.min(900,l.vy)):0,jumps:Number.isInteger(l.jumps)?Math.max(0,Math.min(2,l.jumps)):1};
  }
  if(!Array.isArray(raw.monsters)||raw.monsters.length>24)return null;
  const seen=new Set(),monsters=[];
  for(const m of raw.monsters){
    if(!m||!Number.isInteger(m.id)||m.id<0||m.id>23||seen.has(m.id)||!Object.hasOwn(TYPES,m.type)||TYPES[m.type].region!==region||!Number.isFinite(m.hp)||m.hp<0||m.hp>TYPES[m.type].hp||!Number.isFinite(m.respawn)||m.respawn<0||m.respawn>180)return null;
    seen.add(m.id);monsters.push({id:m.id,type:m.type,hp:m.hp,respawn:m.respawn});
  }
  return {region,unlocked,bossVictories,clockReference:WORLD_CLOCK_REFERENCE,checkpoint:{...cp},activated:[...new Set(raw.activated)],visits,kills,monsters,location};
}
