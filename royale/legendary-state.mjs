import { LEGENDARY_IDS, MERGE_CATALOG, MERGE_POWERS } from './legendary-data.mjs';
import {ARMOR_OUTFIT_PARTS,matchingArmorSet} from './costume-catalog.mjs';
const HISTORICAL_MERGE_PARTS=['helmet','chest','boots'];
export const emptyLegendary=()=>({revision:0,defeated:{},active:null,recovery:Object.fromEntries(LEGENDARY_IDS.map(id=>[id,0])),configuration:2});
export function matchingMerge(inventory,level=99){
 if(level<99)return null;
 return matchingArmorSet(inventory,MERGE_CATALOG,level)?.[0]?.mergeId||null;
}
function matchingHistoricalMerge(inventory,level){
 if(level<99)return null;
 const parts=HISTORICAL_MERGE_PARTS.map(part=>MERGE_CATALOG[inventory.items.find(i=>i.uid===inventory.equipped[part])?.catalogId]);
 return parts.every(Boolean)&&parts.every(p=>p.mergeId===parts[0].mergeId)?parts[0].mergeId:null;
}
export function normalizeLegendary(raw,inventory,level,{legacy=false}={}){
 const requiredParts=legacy?HISTORICAL_MERGE_PARTS:ARMOR_OUTFIT_PARTS,configuration=legacy?1:2;
 if(raw==null){if(inventory.items.some(i=>MERGE_CATALOG[i.catalogId]))return null;return {...emptyLegendary(),configuration};}
 if(!Number.isSafeInteger(raw.revision)||raw.revision<0||raw.configuration!==configuration||!raw.defeated||typeof raw.defeated!=='object'||Array.isArray(raw.defeated)||Object.keys(raw.defeated).some(id=>!LEGENDARY_IDS.includes(id)))return null;
 const ids=new Set(),defeated={};
 for(const [id,r] of Object.entries(raw.defeated)){
  if(level!==99||!r||typeof r.claimed!=='boolean'||!Array.isArray(r.pieces)||r.pieces.length!==requiredParts.length)return null;
  const pieces=[];
  for(const [n,part] of requiredParts.entries()){
   const p=r.pieces[n];if(!p||p.catalogId!==`merge-${id}-${part}`||!/^drop-\d+$/.test(p.uid)||ids.has(p.uid)||!Number.isSafeInteger(Number(p.uid.slice(5)))||Number(p.uid.slice(5))>=inventory.nextId||!['unclaimed','owned','discarded'].includes(p.state))return null;
   const owned=inventory.items.find(i=>i.uid===p.uid),retired=inventory.retired[p.uid];
   if(p.state==='unclaimed'&&(r.claimed||owned||retired)||p.state==='owned'&&(!r.claimed||owned?.catalogId!==p.catalogId||retired)||p.state==='discarded'&&(!r.claimed||owned||retired!=='discarded')||inventory.pending.some(i=>i.uid===p.uid))return null;
   ids.add(p.uid);pieces.push({uid:p.uid,catalogId:p.catalogId,state:p.state});
  }
  defeated[id]={claimed:r.claimed,pieces};
 }
 if(inventory.items.some(i=>MERGE_CATALOG[i.catalogId]&&!ids.has(i.uid))||inventory.pending.some(i=>MERGE_CATALOG[i.catalogId]))return null;
 if(raw.revision<Object.keys(defeated).length)return null;
 const active=legacy?matchingHistoricalMerge(inventory,level):matchingMerge(inventory,level);if(raw.active!==active)return null;
 const recovery={};for(const id of LEGENDARY_IDS){const v=raw.recovery?.[id]??0;if(!Number.isFinite(v)||v<0||v>120)return null;recovery[id]=v;}
 return {revision:raw.revision,defeated,active,recovery,configuration};
}
export function legendaryDominates(next,old){
 if(!next||!old||next.revision<old.revision||(next.configuration||1)<(old.configuration||1))return false;
 for(const [id,r] of Object.entries(old.defeated)){
  const n=next.defeated[id];if(!n||r.claimed&&!n.claimed)return false;
  // A v9 migration retires only the historical headwear entry. Surviving
  // reward identities and permanent states remain monotonic by UID.
  const previous=r.pieces.filter(p=>!((old.configuration||1)===1&&next.configuration===2&&MERGE_CATALOG[p.catalogId]?.part==='helmet'));
  for(const p of previous){
   const q=n.pieces.find(q=>q.uid===p.uid&&q.catalogId===p.catalogId);
   if(!q||p.state==='discarded'&&q.state!=='discarded'||p.state==='owned'&&q.state==='unclaimed')return false;
  }
 }
 return true;
}
export function normalizeLegendaryArena(raw,legendary,level){
 if(!raw?.legendary)return undefined;
 if(level!==99||!LEGENDARY_IDS.includes(raw.legendary)||!['restart','cleared'].includes(raw.mode))return false;
 const defeated=!!legendary.defeated[raw.legendary];if(raw.mode==='cleared'&&!defeated)return false;
 return {legendary:raw.legendary,mode:defeated?'cleared':'restart'};
}
export const mergeEntitlement=id=>id?{id,ability:`merge:${id}`,completePieces:2,level:20,cooldownMultiplier:.5,cooldown:MERGE_POWERS[id].cooldown*.5}:null;
