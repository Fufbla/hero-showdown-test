import {normalizeCosmetics,hasCanonicalOutfitSelection,ownsOutfit} from './state.mjs';
import {historicalPiece,outfitForPiece,isRetiredCosmeticId} from './outfit-policy.mjs';
const sameSelection=(a,b)=>a.visible===b.visible&&a.owned.length===b.owned.length&&a.owned.every(id=>b.owned.includes(id))&&Object.keys(a.equipped).length===Object.keys(b.equipped).length&&Object.entries(a.equipped).every(([slot,id])=>b.equipped[slot]===id);
// Installed in royale-v3-staging, shared by solo and local co-op saves.
// Run after loading the current account/slot under the existing revision CAS.
// Old clients must not erase purchases or restore a pre-purchase wallet.
export function checkCosmeticSave(previous,incoming){
 if(Number(previous?.version)>=9&&!(Number(incoming?.version)>=9))return {ok:false,error:'This game tab predates matching outfits. Reload before saving.'};
 const before=normalizeCosmetics(previous?.cosmetics),after=normalizeCosmetics(incoming?.cosmetics);
 if(!before||!after)return {ok:false,error:'Unsupported clothing save; retain original snapshot.'};
 if(before.revision>0&&!incoming?.cosmetics)return {ok:false,error:'This game tab predates clothing support. Reload before saving.'};
 // Loading an old snapshot may reconcile its selection. The write boundary
 // must inspect the raw incoming selection because the handler stores it as-is.
 if(!hasCanonicalOutfitSelection(incoming?.cosmetics))return {ok:false,error:'Wear one complete matching outfit without headwear. Reload before saving.'};
 if(after.revision<before.revision)return {ok:false,error:'Stale clothing revision.'};
 if(before.owned.some(id=>!after.owned.includes(id)))return {ok:false,error:'Purchased clothing cannot be removed.'};
 for(const id of after.owned){
  if(before.owned.includes(id))continue;
  if(isRetiredCosmeticId(id))return {ok:false,error:'Headwear is no longer available.'};
  const piece=historicalPiece(id),set=outfitForPiece(id);
  if(!piece||!set||!ownsOutfit(after,set))return {ok:false,error:'Clothing can only be purchased as a complete matching outfit.'};
 }
 // Postgres jsonb reorders object keys; that must not reject an unchanged
 // loadout at the next eight-second autosave. Both sides use the same legacy
 // reconciliation, which does not consume a transaction revision on load.
 if(after.revision===before.revision&&!sameSelection(after,before))return {ok:false,error:'Clothing changed without a revision.'};
 return {ok:true};
}

