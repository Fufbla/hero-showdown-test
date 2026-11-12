// The approved November 12 mascot/formal collection. One complete cosmetic ID
// per outfit; no independently equipped hood, limbs, shoes or weapon.
export const COSTUME_PRICE=700;
export const COSTUMES=Object.freeze([
 ['dolphin-costume','Dolphin Costume',true],
 ['pink-shark-costume','Pink Shark Costume',true],
 ['hamburger-costume','Hamburger Costume',true],
 ['stuffed-animal-costume','Stuffed Animal Costume',true],
 ['zombie-costume','Zombie Costume',false],
 ['reaper-costume','Reaper Costume',true],
 ['fishsticks-costume','I Love Fishsticks Costume',true],
 ['pizza-slice-costume','Pizza Slice Costume',true],
 ['black-business-suit','Black Business Suit',false],
 ['white-business-suit','White Business Suit',false],
].map(([id,name,hideHair])=>Object.freeze({id,name,hideHair,coinPrice:COSTUME_PRICE,
 category:'set',collection:'Mascots & Formal',availability:'released',
 review:Object.freeze({referenceFidelity:true,universalFit:true,animations:true,hairCompatibility:true}),
 pieces:Object.freeze([Object.freeze({id:id+'.fullbody',category:'fullbody',coinPrice:COSTUME_PRICE,
  assetManifest:'./assets/'+id+'/manifest.json'})])})));
export const costumeById=id=>COSTUMES.find(c=>c.id===id)||null;
export const costumeForState=state=>{
 if(!state?.visible)return null;
 const piece=state.equipped?.fullbody;
 if(Array.isArray(state.owned)&&!state.owned.includes(piece))return null;
 return COSTUMES.find(c=>c.pieces[0].id===piece)||null;
};
export const costumeHairVisible=(costume,steel=false)=>!steel&&!costume?.hideHair;
