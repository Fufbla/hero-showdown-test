import {canWearSelection} from '../../../royale/cosmetics/eligibility.mjs';
import * as base from '../../../royale/fashion/catalog.mjs?four-base=1';
import {NEW_OUTFITS} from './definitions.mjs';
import {NEW_COSTUMES_TEST_ENABLED,isNewCostumesTestContext} from './scope.mjs';
export const {COSTUME_PRICE,PUPPY_COSTUME,VICE_COSTUME}=base;
export const NEW_COSTUMES=Object.freeze(NEW_OUTFITS.map(outfit=>Object.freeze({...outfit,
 hideHair:outfit.fullTransform,renderer:'new-costumes',category:'set',collection:'Mascots & Formal',availability:'released',
 thumbnail:new URL('./assets/'+outfit.id+'/preview.png',import.meta.url).href,
 review:Object.freeze({referenceFidelity:true,universalFit:true,animations:true,hairCompatibility:true}),
 pieces:Object.freeze([Object.freeze({id:outfit.id+'.fullbody',category:'fullbody',coinPrice:outfit.coinPrice,
  assetManifest:new URL('./assets/'+outfit.id+'/manifest.json',import.meta.url).href})])
})));
const testCollection=Object.freeze([...base.COLLECTION,...NEW_COSTUMES]);
const testCostumes=Object.freeze([...base.COSTUMES,...NEW_COSTUMES]);
export const COLLECTION=NEW_COSTUMES_TEST_ENABLED?testCollection:base.COLLECTION;
export const COSTUMES=NEW_COSTUMES_TEST_ENABLED?testCostumes:base.COSTUMES;
export const catalogForContext=context=>isNewCostumesTestContext(context)?testCollection:base.COLLECTION;
export const costumeById=id=>COLLECTION.find(outfit=>outfit.id===id)||null;
export function costumeForState(state,look){
 if(!state?.visible||look&&!canWearSelection(state,look))return null;
 const piece=state.equipped?.fullbody;
 if(Array.isArray(state.owned)&&!state.owned.includes(piece))return null;
 return COLLECTION.find(outfit=>outfit.pieces[0].id===piece)||null;
}
export const costumeHairVisible=(costume,steel=false)=>!costume?.fullTransform&&base.costumeHairVisible(costume,steel);
