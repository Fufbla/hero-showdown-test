import { LEGENDARY_IDS, MERGE_CATALOG, MERGE_POWERS } from './legendary-data.mjs';
export const emptyLegendary=()=>({revision:0,defeated:{},active:null,recovery:Object.fromEntries(LEGENDARY_IDS.map(id=>[id,0])),configuration:1});
export function matchingMerge(inventory,level=99){
 if(level<99)return null;
 const parts=['helmet','chest','boots'].map(part=>MERGE_CATALOG[inventory.items.find(i=>i.uid===inventory.equipped[part])?.catalogId]);
 return parts.every(Boolean)&&parts.every(p=>p.mergeId===parts[0].mergeId)?parts[0].mergeId:null;
}
export function normalizeLegendary(raw,inventory,level){
 if(raw==null){if(inventory.items.some(i=>MERGE_CATALOG[i.catalogId]))return null;return emptyLegendary();}
 if(!Number.isSafeInteger(raw.revision)||raw.revision<0||raw.configuration!==1||!raw.defeated||typeof raw.defeated!=='object'||Array.isArray(raw.defeated)||Object.keys(raw.defeated).some(id=>!LEGENDARY_IDS.includes(id)))return null;
 const ids=new Set(),defeated={};
 for(const [id,r] of Object.entries(raw.defeated)){
  if(level!==99||!r||typeof r.claimed!=='boolean'||!Array.isArray(r.pieces)||r.pieces.length!==3)return null;
  const pieces=[];
  for(const [n,part] of ['helmet','chest','boots'].entries()){
   const p=r.pieces[n];if(!p||p.catalogId!==`merge-${id}-${part}`||!/^drop-\d+$/.test(p.uid)||ids.has(p.uid)||!Number.isSafeInteger(Number(p.uid.slice(5)))||Number(p.uid.slice(5))>=inventory.nextId||!['unclaimed','owned','discarded'].includes(p.state))return null;
   const owned=inventory.items.find(i=>i.uid===p.uid),retired=inventory.retired[p.uid];
   if(p.state==='unclaimed'&&(r.claimed||owned||retired)||p.state==='owned'&&(!r.claimed||owned?.catalogId!==p.catalogId||retired)||p.state==='discarded'&&(!r.claimed||owned||retired!=='discarded')||inventory.pending.some(i=>i.uid===p.uid))return null;
   ids.add(p.uid);pieces.push({uid:p.uid,catalogId:p.catalogId,state:p.state});
  }
  defeated[id]={claimed:r.claimed,pieces};
 }
 if(inventory.items.some(i=>MERGE_CATALOG[i.catalogId]&&!ids.has(i.uid))||inventory.pending.some(i=>MERGE_CATALOG[i.catalogId]))return null;
 if(raw.revision<Object.keys(defeated).length)return null;
 const active=matchingMerge(inventory,level);if(raw.active!==active)return null;
 const recovery={};for(const id of LEGENDARY_IDS){const v=raw.recovery?.[id]??0;if(!Number.isFinite(v)||v<0||v>120)return null;recovery[id]=v;}
 return {revision:raw.revision,defeated,active,recovery,configuration:1};
}
export function legendaryDominates(next,old){
 if(next.revision<old.revision)return false;
 for(const [id,r] of Object.entries(old.defeated)){
  const n=next.defeated[id];if(!n||r.claimed&&!n.claimed)return false;
  if(r.pieces.some((p,i)=>n.pieces[i]?.uid!==p.uid||n.pieces[i]?.catalogId!==p.catalogId||p.state==='discarded'&&n.pieces[i]?.state!=='discarded'||p.state==='owned'&&n.pieces[i]?.state==='unclaimed'))return false;
 }
 return true;
}
export function normalizeLegendaryArena(raw,legendary,level){
 if(!raw?.legendary)return undefined;
 if(level!==99||!LEGENDARY_IDS.includes(raw.legendary)||!['restart','cleared'].includes(raw.mode))return false;
 const defeated=!!legendary.defeated[raw.legendary];if(raw.mode==='cleared'&&!defeated)return false;
 return {legendary:raw.legendary,mode:defeated?'cleared':'restart'};
}
export const mergeEntitlement=id=>id?{id,ability:`merge:${id}`,completePieces:3,level:20,cooldownMultiplier:.5,cooldown:MERGE_POWERS[id].cooldown*.5}:null;
