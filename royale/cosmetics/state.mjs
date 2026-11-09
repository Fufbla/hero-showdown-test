// Cosmetics never enter equipmentStats, hitboxes, inventory capacity or powers.
export const CLOTHING_SLOTS=Object.freeze(['headwear','top','bottom','fullbody','footwear','accessory','cape']);
const idOK=id=>typeof id==='string'&&/^[a-z][a-z0-9._-]{0,95}$/.test(id);
const revisionOK=n=>Number.isSafeInteger(n)&&n>=0&&n<Number.MAX_SAFE_INTEGER;
export const emptyCosmetics=()=>({version:1,revision:0,owned:[],equipped:{},visible:true});
export function normalizeCosmetics(raw){
 if(raw==null)return emptyCosmetics();
 if(raw.version!==1||!revisionOK(raw.revision)||!Array.isArray(raw.owned)||raw.owned.some(id=>!idOK(id))||typeof raw.visible!=='boolean'||!raw.equipped||typeof raw.equipped!=='object'||Array.isArray(raw.equipped))return null;
 // Preserve unknown stable IDs across catalog changes. Invalid state is rejected,
 // never silently reduced to an empty wardrobe that could overwrite ownership.
 const owned=[...new Set(raw.owned)],equipped={};
 for(const [slot,id]of Object.entries(raw.equipped)){
  if(!CLOTHING_SLOTS.includes(slot)||!idOK(id)||!owned.includes(id))return null;
  equipped[slot]=id;
 }
 if(equipped.fullbody&&(equipped.top||equipped.bottom))return null;
 return {version:1,revision:raw.revision,owned,equipped,visible:raw.visible};
}
export function catalogIndex(catalog){
 const entries=new Map();
 for(const set of catalog.sets||[]){
  if(!idOK(set.id)||entries.has(set.id)||!Array.isArray(set.pieces))throw Error('Invalid or duplicate costume ID.');
  entries.set(set.id,set);
  for(const p of set.pieces){
   if(!idOK(p.id)||entries.has(p.id)||!CLOTHING_SLOTS.includes(p.category))throw Error('Invalid or duplicate clothing piece.');
   entries.set(p.id,{...p,setId:set.id,availability:set.availability,review:set.review});
  }
 }
 return entries;
}
export function saleReady(entry){
 return entry?.availability==='released'&&Number.isSafeInteger(entry.coinPrice)&&entry.coinPrice>=0&&
  ['referenceFidelity','universalFit','animations','hairCompatibility'].every(k=>entry.review?.[k]===true)&&
  (entry.category==='set'?entry.pieces.every(p=>!!p.assetManifest):!!entry.assetManifest);
}
const fail=error=>({ok:false,error});
export function cosmeticTransaction({state,coins,index,operation,safe=false,atWardrobe=false}){
 const current=normalizeCosmetics(state);
 if(!current||!Number.isSafeInteger(coins)||coins<0)return fail('Invalid wardrobe or wallet.');
 if(!safe)return fail('Clothing can only change outside combat.');
 if(!operation||operation.revision!==current.revision)return fail('Wardrobe changed. Refresh before confirming.');
 const next=structuredClone(current),{type,id}=operation,entry=index.get(id);
 let debit=0;
 if(type==='purchase'){
  if(!atWardrobe||operation.confirmed!==true)return fail('Confirm this purchase in the Clothing Store.');
  if(!saleReady(entry))return fail('This clothing is not released.');
  const ids=entry.category==='set'?entry.pieces.map(p=>p.id):[entry.id];
  // Buying a partial set costs only its still-unowned pieces. No duplicate charge.
  const missing=ids.filter(id=>!next.owned.includes(id));
  if(!missing.length)return fail('Already owned.');
  if(entry.category==='set'&&missing.length<ids.length){
   const parts=missing.map(id=>index.get(id));
   if(parts.some(p=>!saleReady(p)))return fail('Partial set pricing is unavailable.');
   debit=Math.min(entry.coinPrice,parts.reduce((sum,p)=>sum+p.coinPrice,0));
  }else debit=entry.coinPrice;
  if(!Number.isSafeInteger(debit)||coins<debit)return fail('Not enough coins.');
  next.owned.push(...missing);
 }else if(type==='equip'){
  if(!entry)return fail('Clothing artwork is unavailable; ownership is preserved.');
  const parts=entry.category==='set'?entry.pieces:[entry];
  if(!parts.length||parts.some(p=>!next.owned.includes(p.id)||!p.assetManifest))return fail('Own the clothing and load its artwork first.');
  for(const p of parts){
   if(p.category==='fullbody'){delete next.equipped.top;delete next.equipped.bottom;}
   if(p.category==='top'||p.category==='bottom')delete next.equipped.fullbody;
   next.equipped[p.category]=p.id;
  }
 }else if(type==='unequip'){
  if(!CLOTHING_SLOTS.includes(operation.slot)||!next.equipped[operation.slot])return fail('No clothing in that slot.');
  delete next.equipped[operation.slot];
 }else if(type==='visible'){
  if(typeof operation.value!=='boolean'||operation.value===next.visible)return fail('No appearance change.');
  next.visible=operation.value;
 }else return fail('Unknown clothing action.');
 next.revision++;
 return {ok:true,state:next,coins:coins-debit,debit};
}
// Selection messages can be sent only when revision changes. Unknown artwork
// never alters ownership; renderers retain armor until all required tiles load.
export function cosmeticAppearance(state){
 const s=normalizeCosmetics(state);return s?{revision:s.revision,visible:s.visible,equipped:{...s.equipped}}:null;
}
