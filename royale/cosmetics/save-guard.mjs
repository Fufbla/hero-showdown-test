import {normalizeCosmetics} from './state.mjs';
// Install in BOTH authenticated save endpoints before enabling purchases.
// Run after loading the current account/slot under the existing revision CAS.
// Old clients must not erase purchases or restore a pre-purchase wallet.
export function checkCosmeticSave(previous,incoming){
 const before=normalizeCosmetics(previous?.cosmetics),after=normalizeCosmetics(incoming?.cosmetics);
 if(!before||!after)return {ok:false,error:'Unsupported clothing save; retain original snapshot.'};
 if(before.revision>0&&!incoming?.cosmetics)return {ok:false,error:'This game tab predates clothing support. Reload before saving.'};
 if(after.revision<before.revision)return {ok:false,error:'Stale clothing revision.'};
 if(before.owned.some(id=>!after.owned.includes(id)))return {ok:false,error:'Purchased clothing cannot be removed.'};
 if(after.revision===before.revision&&JSON.stringify(after)!==JSON.stringify(before))return {ok:false,error:'Clothing changed without a revision.'};
 return {ok:true};
}
