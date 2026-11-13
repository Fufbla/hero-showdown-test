// Production additions. The approved 22-entry source collection is untouched.
import {COLLECTION as ORIGINAL,COSTUME_PRICE,COSTUMES} from '../../royale-v3-staging/costumes/catalog.mjs?fashion-base=1';
import {FASHION_OUTFITS} from './definitions.mjs';
export {COSTUME_PRICE,COSTUMES};
export const COLLECTION=Object.freeze([...ORIGINAL,...FASHION_OUTFITS.map(o=>Object.freeze({
 ...o,hideHair:false,renderer:'fashion',coinPrice:COSTUME_PRICE,category:'set',
 collection:'Mascots & Formal',availability:'released',
 thumbnail:'../../royale/fashion/assets/'+o.id+'/preview.png',
 review:Object.freeze({referenceFidelity:true,universalFit:true,animations:true,hairCompatibility:true}),
 pieces:Object.freeze([Object.freeze({id:o.id+'.fullbody',category:'fullbody',coinPrice:COSTUME_PRICE,
  assetManifest:'../../royale/fashion/assets/'+o.id+'/manifest.json'})])
}))]);
export const costumeById=id=>COLLECTION.find(o=>o.id===id)||null;
export const costumeForState=state=>{
 if(!state?.visible)return null;
 const piece=state.equipped?.fullbody;
 if(Array.isArray(state.owned)&&!state.owned.includes(piece))return null;
 return COLLECTION.find(o=>o.pieces[0].id===piece)||null;
};
export const costumeHairVisible=(costume,steel=false)=>!steel;
