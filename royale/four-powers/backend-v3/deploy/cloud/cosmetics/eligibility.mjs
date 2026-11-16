// One wardrobe rule for stores, previews, saves, and the cloud save service.
// Suits, streetwear, and mascot costumes can be worn by either presentation.
export const FEMALE_OUTFIT_IDS=Object.freeze([
 'holiday-velvet','blossom-kimono','plum-gold-kimono','emerald-gala','sapphire-starlight',
 'summer-chic','tropical-beauty','sunset-elegance','little-black-dress','red-carpet-romance','midnight-glamour'
]);
const femaleOutfits=new Set(FEMALE_OUTFIT_IDS);
export const OUTFIT_RESTRICTION='This outfit is for female heroes only.';
export function canWearOutfit(outfit,look){
 const id=typeof outfit==='string'?outfit:outfit?.id;
 return !femaleOutfits.has(id)||look?.presentation==='female';
}
export function canWearSelection(state,look){
 return Object.values(state?.equipped||{}).every(id=>canWearOutfit(id.split('.')[0],look));
}
// Reconcile older heroes and appearance changes without deleting purchases,
// charging coins, or manufacturing a wardrobe transaction revision.
export function wearableCosmetics(state,look){
 return state&&!canWearSelection(state,look)?{...state,equipped:{}}:state;
}
