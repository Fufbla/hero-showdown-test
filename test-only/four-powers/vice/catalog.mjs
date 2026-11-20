import {canWearSelection} from '../../../royale/cosmetics/eligibility.mjs';
import * as base from '../../../royale/fashion/catalog.mjs?four-base=1';
import {VICE_OUTFIT} from './definitions.mjs';
import {isViceTestContext,VICE_TEST_ENABLED} from './scope.mjs';

export const {COSTUME_PRICE}=base;
export const VICE_COSTUME=Object.freeze({...VICE_OUTFIT,
 hideHair:false,headwear:'authored-cap-and-shades',renderer:'vice',
 category:'set',collection:'Mascots & Formal',availability:'released',
 thumbnail:new URL('./assets/preview.png',import.meta.url).href,
 review:Object.freeze({referenceFidelity:true,universalFit:true,animations:true,hairCompatibility:true}),
 pieces:Object.freeze([Object.freeze({id:VICE_OUTFIT.id+'.fullbody',category:'fullbody',coinPrice:VICE_OUTFIT.coinPrice,
  assetManifest:new URL('./assets/manifest.json',import.meta.url).href})])
});
const testCollection=Object.freeze([...base.COLLECTION,VICE_COSTUME]);
const testCostumes=Object.freeze([...base.COSTUMES,VICE_COSTUME]);
export const catalogForContext=context=>isViceTestContext(context)?testCollection:base.COLLECTION;
export const COLLECTION=VICE_TEST_ENABLED?testCollection:base.COLLECTION;
export const COSTUMES=VICE_TEST_ENABLED?testCostumes:base.COSTUMES;
export const costumeById=id=>COLLECTION.find(o=>o.id===id)||null;
export const costumeForState=(state,look)=>{
 if(!state?.visible||look&&!canWearSelection(state,look))return null;
 const piece=state.equipped?.fullbody;
 if(Array.isArray(state.owned)&&!state.owned.includes(piece))return null;
 return COLLECTION.find(o=>o.pieces[0].id===piece)||null;
};
export const costumeHairVisible=(costume,steel=false)=>!steel&&costume?.renderer!=='robot';
