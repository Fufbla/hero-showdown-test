// Permanent test ownership IDs. Production has no corresponding catalog entries.
export const NEW_OUTFITS=Object.freeze([
 {id:'mailman-costume',name:'Mailman Costume',fullTransform:false,headwear:'mail-cap'},
 {id:'firefighter-costume',name:'Firefighter Costume',fullTransform:false,headwear:'fire-helmet'},
 {id:'ghost-transformation',name:'Ghost Transformation',fullTransform:true,movement:'float'},
 {id:'wolf-transformation',name:'Wolf Transformation',fullTransform:true,movement:'biped-walk-quadruped-run'}
].map(outfit=>Object.freeze({...outfit,unisex:true,coinPrice:700})));
export const NEW_COSTUME_IDS=Object.freeze(NEW_OUTFITS.map(outfit=>outfit.id));
export const isNewCostumeId=id=>NEW_COSTUME_IDS.includes(id);
