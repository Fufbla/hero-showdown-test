import {canWearSelection} from '../cosmetics/eligibility.mjs';
// Production additions. The approved 22-entry source collection is untouched.
import {COLLECTION as ORIGINAL,COSTUME_PRICE,COSTUMES as ORIGINAL_COSTUMES} from '../../royale-v3-staging/costumes/catalog.mjs?fashion-base=1';
import {FASHION_OUTFITS,ROBOT_OUTFIT,PUPPY_OUTFIT,VICE_OUTFIT} from './definitions.mjs';
export {COSTUME_PRICE};
export const PUPPY_COSTUME=Object.freeze({...PUPPY_OUTFIT,
 // Retain the original face and hair inside the authored hood opening.
 hideHair:true,renderer:'puppy',category:'set',collection:'Mascots & Formal',availability:'released',
 thumbnail:new URL('../../royale-v3-staging/kingjames/puppy/assets/preview.png',import.meta.url).href,
 review:Object.freeze({referenceFidelity:true,universalFit:true,animations:true,hairCompatibility:true}),
 pieces:Object.freeze([Object.freeze({id:PUPPY_OUTFIT.id+'.fullbody',category:'fullbody',coinPrice:PUPPY_OUTFIT.coinPrice,
  assetManifest:new URL('../../royale-v3-staging/kingjames/puppy/assets/manifest.json',import.meta.url).href})])
});
export const VICE_COSTUME=Object.freeze({...VICE_OUTFIT,
 hideHair:false,headwear:'authored-cap-and-shades',renderer:'vice',
 category:'set',collection:'Mascots & Formal',availability:'released',
 thumbnail:new URL('./vice/assets/preview.png',import.meta.url).href,
 review:Object.freeze({referenceFidelity:true,universalFit:true,animations:true,hairCompatibility:true}),
 pieces:Object.freeze([Object.freeze({id:VICE_OUTFIT.id+'.fullbody',category:'fullbody',coinPrice:VICE_OUTFIT.coinPrice,
  assetManifest:new URL('./vice/assets/manifest.json',import.meta.url).href})])
});
export const COSTUMES=Object.freeze([...ORIGINAL_COSTUMES,PUPPY_COSTUME,VICE_COSTUME]);
export const COLLECTION=Object.freeze([...ORIGINAL,...FASHION_OUTFITS.map(o=>Object.freeze({
 ...o,hideHair:false,renderer:'fashion',coinPrice:COSTUME_PRICE,category:'set',
 collection:'Mascots & Formal',availability:'released',
 thumbnail:'../../royale/fashion/assets/'+o.id+'/preview.png',
 review:Object.freeze({referenceFidelity:true,universalFit:true,animations:true,hairCompatibility:true}),
 pieces:Object.freeze([Object.freeze({id:o.id+'.fullbody',category:'fullbody',coinPrice:COSTUME_PRICE,
  assetManifest:'../../royale/fashion/assets/'+o.id+'/manifest.json'})])
})),Object.freeze({...ROBOT_OUTFIT,hideHair:true,renderer:'robot',
 category:'set',collection:'Mascots & Formal',availability:'released',
 thumbnail:'../../royale/fashion/assets/robot-costume/preview.png',
 review:Object.freeze({referenceFidelity:true,universalFit:true,animations:true,hairCompatibility:true}),
 pieces:Object.freeze([Object.freeze({id:ROBOT_OUTFIT.id+'.fullbody',category:'fullbody',coinPrice:ROBOT_OUTFIT.coinPrice,
  assetManifest:'../../royale/fashion/assets/robot-costume/manifest.json'})])}),PUPPY_COSTUME,VICE_COSTUME]);
export const costumeById=id=>COLLECTION.find(o=>o.id===id)||null;
export const costumeForState=(state,look)=>{
 if(!state?.visible||look&&!canWearSelection(state,look))return null;
 const piece=state.equipped?.fullbody;
 if(Array.isArray(state.owned)&&!state.owned.includes(piece))return null;
 return COLLECTION.find(o=>o.pieces[0].id===piece)||null;
};
export const costumeHairVisible=(costume,steel=false)=>!steel&&costume?.renderer!=='robot';
