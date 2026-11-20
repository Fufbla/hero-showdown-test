import {COLLECTION as ORIGINAL,COSTUME_PRICE} from '../../../royale/fashion/catalog.mjs?four-base=1';
import {canWearSelection} from '../../../royale/cosmetics/eligibility.mjs';
import {PUPPY_COSTUME} from './definitions.mjs';
import {PUPPY_TEST_ENABLED,isPuppyTestContext} from './scope.mjs';
export {COSTUME_PRICE};
export function catalogForContext(context){
 return Object.freeze([...ORIGINAL,...(isPuppyTestContext(context)?[PUPPY_COSTUME]:[])]);
}
export const COLLECTION=Object.freeze([...ORIGINAL,...(PUPPY_TEST_ENABLED?[PUPPY_COSTUME]:[])]);
export const COSTUMES=Object.freeze(COLLECTION.filter(o=>o.renderer==='mascot'||o.renderer==='puppy'));
export const costumeById=id=>COLLECTION.find(o=>o.id===id)||null;
export const costumeForState=(state,look)=>{
 if(!state?.visible||look&&!canWearSelection(state,look))return null;
 const piece=state.equipped?.fullbody;
 if(Array.isArray(state.owned)&&!state.owned.includes(piece))return null;
 return COLLECTION.find(o=>o.pieces[0].id===piece)||null;
};
export const costumeHairVisible=(costume,steel=false)=>!steel&&costume?.renderer!=='robot';
