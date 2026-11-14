// Restore the actual pre-Change-3 artwork. Revision 4 only fences obsolete tabs.
export const RESTORED_APPEARANCE_VERSION=4;
export const RESTORED_FACE_FIELDS=Object.freeze(['presentation','age','skin','eyes','hair','hairColor','face','jaw','eyeShape','brows','nose','mouth','facialHair']);
// Only heroes created under Change 3 without an original recovery record need
// these deterministic nearest-original choices. No new artwork is retained.
export const REDESIGN_TO_ORIGINAL=Object.freeze({
 "hair": {
  "m01-buzz-cut": "buzz",
  "m02-low-fade": "fade",
  "m03-high-top-fade": "high-top",
  "m04-360-waves": "waves",
  "m05-short-curls": "curls",
  "m06-rounded-afro": "medium-afro",
  "m07-tapered-afro": "tapered-natural",
  "m08-twist-top": "two-strand-twists",
  "m09-cornrows": "cornrows",
  "m10-box-braids": "box-braids",
  "m11-short-locs": "short-locs",
  "m12-long-locs": "long-locs",
  "m13-loc-bun": "high-loc-bun",
  "m14-braided-ponytail": "braided-ponytail",
  "m15-side-part": "side-part",
  "m16-textured-crop": "textured-crop",
  "m17-quiff": "undercut",
  "m18-pompadour": "pompadour",
  "m19-shoulder-waves": "side-waves",
  "m20-top-knot": "half-up",
  "f01-pixie-cut": "short-straight",
  "f02-tapered-curls": "tapered-natural",
  "f03-curly-afro": "medium-afro",
  "f04-sleek-bob": "bob",
  "f05-wavy-bob": "layered-bob",
  "f06-long-straight": "long-straight",
  "f07-long-waves": "long-wavy",
  "f08-long-curls": "long-curls",
  "f09-side-braid": "braids",
  "f10-twin-braids": "braids",
  "f11-box-braids": "box-braids",
  "f12-cornrow-ponytail": "braided-ponytail",
  "f13-short-locs": "short-locs",
  "f14-long-locs": "long-locs",
  "f15-loc-updo": "high-loc-bun",
  "f16-high-ponytail": "high-ponytail",
  "f17-low-ponytail": "low-ponytail",
  "f18-high-bun": "braided-updo",
  "f19-double-buns": "double-puffs",
  "f20-half-up-waves": "half-up"
 },
 "brows": {
  "b01-natural": "soft",
  "b02-straight": "straight",
  "b03-soft-arch": "soft",
  "b04-high-arch": "soft",
  "b05-rounded": "soft",
  "b06-thick": "bold",
  "b07-fine": "soft",
  "b08-tapered": "soft",
  "b09-angled": "bold",
  "b10-short": "straight",
  "b11-feathered": "soft",
  "b12-split": "bold"
 },
 "eyeShape": {
  "e01-almond": "almond",
  "e02-round": "round",
  "e03-wide": "wide",
  "e04-narrow": "almond",
  "e05-upturned": "almond",
  "e06-downturned": "almond",
  "e07-hooded": "almond",
  "e08-soft-lid": "almond",
  "e09-bold-lid": "almond",
  "e10-large-iris": "round",
  "e11-small-iris": "almond",
  "e12-sleepy": "almond",
  "e13-alert": "wide",
  "e14-gentle": "round",
  "e15-fierce": "almond",
  "e16-cat-eye": "almond"
 },
 "nose": {
  "n01-button": "small",
  "n02-straight": "straight",
  "n03-rounded": "small",
  "n04-broad": "broad",
  "n05-narrow": "straight",
  "n06-upturned": "small",
  "n07-soft-bridge": "straight",
  "n08-strong-bridge": "straight",
  "n09-petite": "small",
  "n10-wide-tip": "broad",
  "n11-angular": "straight",
  "n12-long": "straight"
 },
 "mouth": {
  "l01-neutral": "neutral",
  "l02-soft-smile": "smile",
  "l03-wide-smile": "smile",
  "l04-tooth-grin": "smile",
  "l05-smirk": "smile",
  "l06-full-lips": "full",
  "l07-thin-lips": "neutral",
  "l08-cupid-bow": "full",
  "l09-rounded-lips": "full",
  "l10-small-smile": "smile",
  "l11-open-smile": "smile",
  "l12-laugh": "smile",
  "l13-determined": "neutral",
  "l14-frown": "neutral",
  "l15-pout": "full",
  "l16-surprise": "full"
 },
 "facialHair": {
  "h01-light-stubble": "stubble",
  "h02-heavy-stubble": "stubble",
  "h03-short-boxed": "beard",
  "h04-full-beard": "beard",
  "h05-round-beard": "beard",
  "h06-square-beard": "beard",
  "h07-long-beard": "beard",
  "h08-chin-strap": "beard",
  "h09-goatee": "beard",
  "h10-circle-beard": "beard",
  "h11-van-dyke": "beard",
  "h12-soul-patch": "beard",
  "h13-pencil-mustache": "beard",
  "h14-chevron-mustache": "beard",
  "h15-handlebar": "beard",
  "h16-mutton-chops": "beard"
 }
});
export function originalAppearance(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const out={};
 for(const [key,value] of Object.entries(raw)){
  if(['legacyAppearance','__proto__','constructor','prototype'].includes(key))continue;
  if(key.length<=80&&(value===null||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value)||typeof value==='string'&&value.length<=300))out[key]=value;
 }
 return Object.keys(out).length&&JSON.stringify(out).length<=8192?out:null;
}
export function retainedAppearance(raw){
 if(raw?.legacyAppearance){const backup=originalAppearance(raw.legacyAppearance);if(backup)return backup;}
 return Number(raw?.version||0)<3&&['hair','eyeShape','brows','nose','mouth','facialHair'].some(k=>Object.hasOwn(raw||{},k))?originalAppearance(raw):null;
}
export function restoreAppearance(raw){
 if(Number(raw?.version)!==3)return raw;
 const restored={...raw},original=originalAppearance(raw.legacyAppearance);
 for(const key of RESTORED_FACE_FIELDS){
  if(original&&Number(original.version||0)<3&&Object.hasOwn(original,key))restored[key]=original[key];
  else if(Object.hasOwn(REDESIGN_TO_ORIGINAL[key]||{},raw[key]))restored[key]=REDESIGN_TO_ORIGINAL[key][raw[key]];
 }
 return restored;
}
const ordered=value=>JSON.stringify(Object.fromEntries(Object.entries(value||{}).sort(([a],[b])=>a.localeCompare(b))));
export function checkAppearanceSave(previous,incoming){
 const before=previous?.look,after=incoming?.look;
 if(Number(before?.version)>=3&&Number(after?.version||0)<Number(before.version))return {ok:false,error:'This game tab predates the restored character appearance. Reload before saving.'};
 if(before?.legacyAppearance&&ordered(before.legacyAppearance)!==ordered(after?.legacyAppearance))return {ok:false,error:'The original appearance recovery copy must be retained. Reload this hero before saving.'};
 if(before&&Number(before.version||0)<3&&Number(after?.version)>=3&&ordered(originalAppearance(before))!==ordered(after.legacyAppearance))return {ok:false,error:'The original appearance must be preserved during migration.'};
 return {ok:true};
}
