// Phase C: category-wide fit tailoring. Applies to all 36 collections without
// modifying approved costume atlases, inventory, purchased items, or hero saves.
// Ratios are deliberately conservative; detailed art-specific tuning comes
// later. Each category is anchored to the universal animated hero skeleton.
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const collect=ids=>new Set(ids.split(' ').filter(Boolean));
const headbands=collect('ninja-warrior athletic');
const caps=collect('urban-hero combat-casual harvest-scout autumn-explorer holiday-sweater');
const hoods=collect('mystic-robe mummy werewolf dark-reaper reindeer gingerbread');
const wideBrims=collect('explorer witch scarecrow pilgrim-hero');
const tallHats=collect('witch toy-soldier pilgrim-hero elf-hero santa-hero');
const decorativeHeadwear=collect('royal-kimono royal-gown festival cat-burglar harvest-festival');

// These are fabric-shape profiles, not character proportions. All heroes
// retain the same approved body/head silhouette and face.
export const CATEGORY_PROFILES=Object.freeze({
 headwear:Object.freeze({width:.94,height:.95,seat:2}),
 top:Object.freeze({torso:.98,sleeve:.92}),
 bottom:Object.freeze({leg:.94}),
 fullbody:Object.freeze({torso:.98,sleeve:.94,leg:.97,skirt:1}),
 footwear:Object.freeze({width:.87,height:.92,seat:0}),
 accessory:Object.freeze({headWidth:.92,headHeight:.95,headSeat:0,limb:.96}),
 cape:Object.freeze({width:1})
});
export const CATEGORY_FIT_VERSION='category-fitted-all-36-v1';

export function categoryFromPiece(piece={}){
 const id=String(piece.id||'');
 const inferred=id.slice(id.lastIndexOf('.')+1);
 return piece.category||(['headwear','top','bottom','fullbody','footwear','accessory','cape'].includes(inferred)?inferred:'');
}
export function collectionFromPiece(piece={}){
 const id=String(piece.id||'');
 return id.includes('.')?id.slice(0,id.lastIndexOf('.')):'';
}
// Adjust only the appearance transform. Never alters the manifest itself.
export function tuneClothingCategory(layer,fit,piece={}){
 const category=categoryFromPiece(piece);
 const collection=collectionFromPiece(piece);
 const part=layer.part;
 let width=fit.width,height=fit.height;
 let dx=fit.offset?.[0]||0,dy=fit.offset?.[1]||0;
 if(category==='headwear'&&part==='headwear'){
   const style=headbands.has(collection)?{width:.90,height:.92,seat:3.5}:
    caps.has(collection)?{width:.92,height:.94,seat:2.5}:
    hoods.has(collection)?{width:.97,height:.98,seat:1}:
    wideBrims.has(collection)?{width:.99,height:.99,seat:2}:
    tallHats.has(collection)?{width:.98,height:.99,seat:2}:
    decorativeHeadwear.has(collection)?{width:.95,height:.96,seat:1.5}:
    CATEGORY_PROFILES.headwear;
   width*=style.width;height*=style.height;dy+=style.seat;
 }else if((category==='top'||category==='fullbody')&&part==='torso'){
   width*=CATEGORY_PROFILES[category].torso;
 }else if((category==='top'||category==='fullbody')&&(/^(upperArm|forearm|hand)/).test(part)){
   // Sleeve width narrows without shortening the animated shoulder-to-wrist
   // bone. Full-body gowns retain a little more sleeve volume.
   width*=CATEGORY_PROFILES[category].sleeve;
 }else if((category==='bottom'||category==='fullbody')&&(/^(thigh|shin)/).test(part)){
   const ratio=category==='bottom'?CATEGORY_PROFILES.bottom.leg:CATEGORY_PROFILES.fullbody.leg;
   width*=collection==='ninja-warrior'?Math.max(.99,ratio):ratio;
 }else if(category==='fullbody'&&part==='skirt'){
   // Intentionally flowing skirts, kimono hems, capes and robes must remain
   // wide rather than being forced to the same pant-leg dimensions.
   width*=CATEGORY_PROFILES.fullbody.skirt;
 }else if(category==='footwear'&&part.startsWith('foot')){
   const oversizedTrim=collect('snow-hero reindeer harvest-scout autumn-explorer');
   const curledShoes=collect('elf-hero');
   const armoredBoots=collect('ninja-warrior pumpkin-knight toy-soldier');
   const factor=curledShoes.has(collection)?.98:
    oversizedTrim.has(collection)?.92:armoredBoots.has(collection)?.93:CATEGORY_PROFILES.footwear.width;
   width*=factor;
   height*=curledShoes.has(collection)?.98:CATEGORY_PROFILES.footwear.height;
 }else if(category==='accessory'&&layer.attach==='head'){
   // Goggles, scarves, glasses and face wraps are held to the face centre
   // instead of the helmet silhouette. Preserve intentional face openings.
   width*=CATEGORY_PROFILES.accessory.headWidth;
   height*=CATEGORY_PROFILES.accessory.headHeight;
   dy+=CATEGORY_PROFILES.accessory.headSeat;
 }else if(category==='accessory'&&(/^(hand|upperArm|forearm)/).test(part)){
   width*=CATEGORY_PROFILES.accessory.limb;
 }else if(category==='cape'&&part==='cape'){
   width*=CATEGORY_PROFILES.cape.width;
 }
 return {width:clamp(width,.55,2),height:clamp(height,.6,1.8),offset:[dx,dy]};
}
