import {NEW_HAIR,NEW_FEATURES,CUSTOMIZATION_REVISION} from './catalog.mjs';
const hairAliases={
 curls:[5,2],locs:[12,14],short:[1,1],waves:[4,5],ponytail:[14,16],braids:[10,10],
 'short-locs':[11,13],'medium-locs':[12,14],'long-locs':[12,14],'high-loc-bun':[13,15],'half-up-locs':[13,15],
 'two-strand-twists':[8,2],'box-braids':[10,11],'knotless-braids':[10,11],cornrows:[9,12],'braided-ponytail':[14,12],
 'bantu-knots':[20,19],'braided-updo':[13,15],'short-afro':[7,2],'medium-afro':[6,3],'large-afro':[6,3],
 'afro-puff':[13,18],'double-puffs':[20,19],'tapered-natural':[7,2],'tight-curls':[5,2],'shoulder-curls':[19,8],
 'long-curls':[19,8],'curly-ponytail':[14,16],'short-straight':[16,1],bob:[19,4],'layered-bob':[19,5],
 'shoulder-straight':[19,6],'long-straight':[19,6],'long-wavy':[19,7],'side-waves':[19,5],
 'high-ponytail':[14,16],'low-ponytail':[14,17],'half-up':[20,20],buzz:[1,1],fade:[2,2],
 'high-top':[3,2],'taper-fade':[2,2],'textured-crop':[16,1],'curly-fade':[5,2],'side-part':[15,4],
 pompadour:[18,18],undercut:[17,1],spiky:[16,1],
};
const featureAliases={brows:{soft:3,straight:2,bold:6},eyeShape:{almond:1,round:2,wide:3},
 nose:{small:1,straight:2,broad:4},mouth:{neutral:1,smile:2,full:6},facialHair:{stubble:1,beard:4}};
export function mappedChoice(key,value,presentation='male'){
 if(value==='none'&&(key==='hair'||key==='facialHair'))return 'none';
 if(key==='hair'){
  if(NEW_HAIR.some(h=>h.id===value))return value;
  const index=hairAliases[value]?.[presentation==='female'?1:0];
  return index?NEW_HAIR[(presentation==='female'?20:0)+index-1].id:null;
 }
 const options=NEW_FEATURES[key];if(!options)return value;
 if(options.some(c=>c.id===value))return value;
 const index=featureAliases[key]?.[value];return index?options[index-1].id:null;
}
// Preserve the original flat appearance record verbatim, including retired
// choices and body proportions. Never replace it on later edits or reloads.
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
 return Number(raw?.version||0)<CUSTOMIZATION_REVISION&&['hair','eyeShape','brows','nose','mouth','facialHair'].some(k=>Object.hasOwn(raw||{},k))?originalAppearance(raw):null;
}
const ordered=value=>JSON.stringify(Object.fromEntries(Object.entries(value||{}).sort(([a],[b])=>a.localeCompare(b))));
export function checkAppearanceSave(previous,incoming){
 const before=previous?.look,after=incoming?.look;
 if(Number(before?.version)>=CUSTOMIZATION_REVISION&&Number(after?.version||0)<Number(before.version))return {ok:false,error:'This game tab predates the updated character artwork. Reload before saving.'};
 if(before?.legacyAppearance&&ordered(before.legacyAppearance)!==ordered(after?.legacyAppearance))return {ok:false,error:'The original appearance recovery copy must be retained. Reload this hero before saving.'};
 if(before&&Number(before.version||0)<CUSTOMIZATION_REVISION&&Number(after?.version)>=CUSTOMIZATION_REVISION&&ordered(originalAppearance(before))!==ordered(after.legacyAppearance))return {ok:false,error:'The original appearance must be preserved during migration.'};
 return {ok:true};
}
