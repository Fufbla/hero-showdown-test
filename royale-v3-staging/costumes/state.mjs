// Cosmetics never enter equipmentStats, hitboxes, inventory capacity or powers.
import {CLOTHING_SLOTS,LEGACY_CLOTHING_SLOTS,OUTFIT_PRICE,OUTFIT_POLICIES,
 historicalPiece,outfitForPiece,isRetiredCosmeticId} from './outfit-policy.mjs';
export {CLOTHING_SLOTS,OUTFIT_PRICE,OUTFIT_POLICIES,isRetiredCosmeticId};
const idOK=id=>typeof id==='string'&&/^[a-z][a-z0-9._-]{0,95}$/.test(id);
const revisionOK=n=>Number.isSafeInteger(n)&&n>=0&&n<Number.MAX_SAFE_INTEGER;
const policyFor=set=>set&&Object.hasOwn(OUTFIT_POLICIES,set.id)&&OUTFIT_POLICIES[set.id].pieces.length>0?OUTFIT_POLICIES[set.id]:null;
export const emptyCosmetics=()=>({version:1,revision:0,owned:[],equipped:{},visible:true});

// Keep piece IDs as the ownership ledger, but expose only complete outfits.
// Historical prices live in outfit-policy and never change with catalog artwork.
export function activeSetPieces(set){
 const policy=policyFor(set);if(!policy||!Array.isArray(set.pieces))return [];
 return set.pieces.filter(p=>policy.pieces.some(active=>active.id===p?.id&&active.category===p.category));
}
export function ownsOutfit(state,set){
 const policy=policyFor(set),owned=new Set(state?.owned||[]);
 return !!policy&&policy.pieces.every(p=>owned.has(p.id));
}
export function outfitSelection(set){
 const policy=policyFor(set);
 return policy?Object.fromEntries(policy.pieces.map(p=>[p.category,p.id])):{};
}
export function selectedOutfit(state){
 const anchor=state?.equipped?.fullbody||state?.equipped?.top;
 const set=outfitForPiece(anchor);
 return set&&ownsOutfit(state,set)?set:null;
}
export function quoteOutfit(state,set){
 const policy=policyFor(set);
 if(!policy)return {ok:false,error:'Choose a complete outfit.',debit:0,missing:[]};
 const owned=new Set(state?.owned||[]),missing=policy.pieces.filter(p=>!owned.has(p.id)).map(p=>p.id);
 // Existing owners of every remaining wearable part keep that complete outfit,
 // even if they never bought the now-retired hat or face accessory.
 if(!missing.length)return {ok:false,error:'Already owned.',debit:0,missing};
 const credit=policy.historicalPieces.reduce((sum,p)=>sum+(owned.has(p.id)?p.coinPrice:0),0);
 return {ok:true,debit:Math.max(0,OUTFIT_PRICE-credit),missing};
}

function readCosmetics(raw){
 if(raw==null)return emptyCosmetics();
 if(raw.version!==1||!revisionOK(raw.revision)||!Array.isArray(raw.owned)||raw.owned.some(id=>!idOK(id))||typeof raw.visible!=='boolean'||!raw.equipped||typeof raw.equipped!=='object'||Array.isArray(raw.equipped))return null;
 // Unknown/retired IDs stay in ownership so neither a migration nor a catalog
 // update can destroy paid records. Legacy headwear slots are parsed, not worn.
 const owned=[...new Set(raw.owned)],equipped={};
 for(const [slot,id]of Object.entries(raw.equipped)){
  if(!LEGACY_CLOTHING_SLOTS.includes(slot)||!idOK(id)||!owned.includes(id))return null;
  const historical=historicalPiece(id);
  if(historical&&historical.category!==slot)return null;
  equipped[slot]=id;
 }
 if(equipped.fullbody&&(equipped.top||equipped.bottom))return null;
 return {version:1,revision:raw.revision,owned,equipped,visible:raw.visible};
}
export function normalizeCosmetics(raw){
 const state=readCosmetics(raw);if(!state)return null;
 // The old worn body chooses the intended outfit. Never grant missing pieces,
 // choose another owned set, or consume a transaction revision on load.
 return {...state,equipped:outfitSelection(selectedOutfit(state))};
}
export function hasCanonicalOutfitSelection(raw){
 const state=readCosmetics(raw);if(!state)return false;
 const canonical=outfitSelection(selectedOutfit(state));
 return Object.keys(state.equipped).length===Object.keys(canonical).length&&
  Object.entries(state.equipped).every(([slot,id])=>canonical[slot]===id);
}
export function catalogIndex(catalog){
 const entries=new Map();
 for(const set of catalog.sets||[]){
  const policy=policyFor(set);
  if(!idOK(set.id)||entries.has(set.id)||!policy||set.category!=='set'||!Array.isArray(set.pieces))throw Error('Invalid or duplicate costume ID.');
  if(set.pieces.length!==policy.pieces.length||activeSetPieces(set).length!==policy.pieces.length)throw Error('Outfit must contain its complete active pieces.');
  entries.set(set.id,set);
  for(const p of set.pieces){
   if(!idOK(p.id)||entries.has(p.id)||!CLOTHING_SLOTS.includes(p.category)||isRetiredCosmeticId(p.id))throw Error('Invalid or duplicate clothing piece.');
   entries.set(p.id,{...p,setId:set.id,availability:set.availability,review:set.review});
  }
 }
 return entries;
}
export function saleReady(entry){
 const policy=policyFor(entry),parts=activeSetPieces(entry);
 return entry?.category==='set'&&!!policy&&entry.availability==='released'&&entry.coinPrice===OUTFIT_PRICE&&
  ['referenceFidelity','universalFit','animations','hairCompatibility'].every(k=>entry.review?.[k]===true)&&
  parts.length===policy.pieces.length&&parts.every(p=>!!p.assetManifest);
}
const fail=error=>({ok:false,error});
export function cosmeticTransaction({state,coins,index,operation,safe=false,atWardrobe=false}){
 const current=normalizeCosmetics(state);
 if(!current||!Number.isSafeInteger(coins)||coins<0)return fail('Invalid wardrobe or wallet.');
 if(!safe)return fail('Clothing can only change outside combat.');
 if(!operation||operation.revision!==current.revision)return fail('Wardrobe changed. Refresh before confirming.');
 if(current.revision>=Number.MAX_SAFE_INTEGER-1)return fail('Wardrobe revision limit reached.');
 const next=structuredClone(current),{type,id}=operation,entry=index?.get(id);
 let debit=0;
 if(type==='purchase'){
  if(!atWardrobe||operation.confirmed!==true)return fail('Confirm this purchase in the Clothing Store.');
  if(!saleReady(entry))return fail('Choose a released complete outfit.');
  const quote=quoteOutfit(next,entry);if(!quote.ok)return fail(quote.error);
  debit=quote.debit;
  if(!Number.isSafeInteger(debit)||coins<debit)return fail('Not enough coins.');
  next.owned.push(...quote.missing);
 }else if(type==='equip'){
  if(!entry||entry.category!=='set'||!saleReady(entry))return fail('Choose a released complete outfit.');
  if(!ownsOutfit(next,entry))return fail('Own the complete outfit before wearing it.');
  // Replace the whole selection so a previous cape/accessory cannot linger.
  next.equipped=outfitSelection(entry);
  next.visible=true;
 }else if(type==='unequip'){
  if(!Object.keys(next.equipped).length)return fail('No outfit is being worn.');
  next.equipped={};
 }else if(type==='visible'){
  if(typeof operation.value!=='boolean'||operation.value===next.visible)return fail('No appearance change.');
  next.visible=operation.value;
 }else return fail('Unknown clothing action.');
 next.revision++;
 return {ok:true,state:next,coins:coins-debit,debit};
}
// Selection messages contain only a canonical complete outfit and its revision.
export function cosmeticAppearance(state){
 const s=normalizeCosmetics(state);return s?{revision:s.revision,visible:s.visible,equipped:{...s.equipped}}:null;
}
