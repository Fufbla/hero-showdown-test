import {decodeSave} from './core.mjs';
import {regionCamps,regionSurfaces} from './world.mjs';
// A geometry-only recovery for previously valid cloud saves after a world edit.
// Other malformed progression is rejected; the source record is never overwritten.
export function restoreCloudSnapshot(raw){
 const normal=decodeSave(JSON.stringify(raw));if(normal)return {snapshot:normal,recovered:false};
 const l=raw?.world?.location,region=raw?.world?.region,cp=raw?.world?.checkpoint;
 if(!l||raw.arena||!Number.isInteger(region)||region<1||region>7||!cp||!Number.isInteger(cp.region)||cp.region<1||cp.region>7||!Number.isInteger(cp.index)||cp.index<0||cp.index>2||!Number.isFinite(l.hp)||l.hp<=0||l.hp>100+(raw.level-1)*15)return null;
 const invalid=!Number.isFinite(l.x)||!Number.isFinite(l.y)||l.x<17||l.x>6143||l.y< -512||l.y>890||regionSurfaces(region).some(s=>!s.oneWay&&l.x+17>s.x&&l.x-17<s.x+s.w&&l.y>s.y+.01&&l.y-88<s.y+s.h);
 if(!invalid)return null;
 const copy=structuredClone(raw),camp=regionCamps(cp.region)[cp.index];copy.world.region=cp.region;copy.world.location={x:camp.x,y:camp.y,hp:l.hp,face:1,vx:0,vy:0,jumps:0};copy.world.monsters=[];copy.sanctuary=null;copy.checkpoint=cp.index;
 const snapshot=decodeSave(JSON.stringify(copy));return snapshot?{snapshot,recovered:true}:null;
}
