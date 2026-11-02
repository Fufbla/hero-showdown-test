import {drawHero} from '../hero-art.mjs';
import {drawHero as drawBefore} from './hero-before-art.mjs';
import {previewHero,PREVIEW_POSES} from '../hero-rig.mjs';
import {DEFAULT_LOOK,LOOK_OPTIONS,LOOK_RANGES,COLOR_FIELDS,sanitizeLook} from '../appearance.mjs';
import {heroMaterialStatus,HERO_MATERIAL_CACHE_LIMIT} from '../hero-materials.mjs';
import {COSTUME_CATALOG} from '../costume-catalog.mjs';
import {MERGE_CATALOG} from '../legendary-data.mjs';
import {EQUIPMENT} from '../equipment.mjs';
export const HERO_SAMPLES=[
 {name:'Coast Guardian',...DEFAULT_LOOK},
 {...DEFAULT_LOOK,name:'Night Current',presentation:'female',build:'full',skin:'#70402e',hair:'locs',suit:'#6929a0',trim:'#ffcc62',emblem:'sun'},
 {...DEFAULT_LOOK,name:'Iron Reef',build:'strong',age:'older',skin:'#e5bc96',hair:'short',suit:'#21427a',facialHair:'beard',emblem:'shield'},
 {...DEFAULT_LOOK,name:'Tide Runner',presentation:'female',build:'slender',hair:'braids',skin:'#b97953',suit:'#a7393b',eyes:'#6cefed',emblem:'wave'},
 {...DEFAULT_LOOK,name:'Young Comet',age:'teen',build:'slender',hair:'ponytail',skin:'#efc6a7',hairColor:'#a65726',emblem:'star',suit:'#275f9e'},
 {...DEFAULT_LOOK,name:'Silver Grove',presentation:'female',age:'older',build:'full',hair:'waves',hairColor:'#aeb4c5',skin:'#a6653d',suit:'#42503c',emblem:'bolt'},
 {...DEFAULT_LOOK,name:'Amber Sentinel',build:'strong',hair:'none',skin:'#44291f',suit:'#b85022',cape:false,face:'angular',brows:'bold'},
 {...DEFAULT_LOOK,name:'Violet Coast',presentation:'female',build:'balanced',hair:'curls',hairColor:'#6d303e',skin:'#c88c5c',suit:'#d4d8db',trim:'#693ca1',capeColor:'#693ca1',eyes:'#2b9e85'},
];
export function heroOutfit(mode='starter'){
 if(mode==='starter')return {id:'starter-basic',origin:'starter',pieces:{}};
 const pieces={};const catalog=mode.startsWith('merge:')?MERGE_CATALOG:COSTUME_CATALOG;
 for(const item of Object.values(catalog))if(mode.startsWith('merge:')?item.mergeId===mode.slice(6):item.rarity==='rare'&&item.region===4){if(!pieces[item.part])pieces[item.part]=item;}
 return {id:'review-equipment',origin:'earned',palette:{suit:'#27494d',trim:'#d4b35d',emblemColor:'#e9dc9c',capeColor:'#143539'},pieces};
}
export function renderHeroCard(c,look,state,time,{before=false,face=1,scale=2,x=220,y=310,outfit,view='game',artState}={}){
 const h=previewHero(state,time);h.face=face;if(h.attack){h.attack.face=face;if(h.attack.kind==='punch')h.attack.id=1+Math.floor(time/(.27+.35));}
 return (before?drawBefore:drawHero)(c,x,y,look,h,time,scale,{outfit,view,artState});
}
function fingerprint(bytes){let h=2166136261;for(let i=0;i<bytes.length;i++)h=Math.imul(h^bytes[i],16777619);return h>>>0;}
export async function checkHeroRendering(makeCanvas,{yieldToUI=()=>Promise.resolve(),progress=()=>{}}={}){
 if(!heroMaterialStatus().ready)throw Error('Authored hero materials are not ready');
 let assertions=0,draws=0;const canvas=makeCanvas(440,360),c=canvas.getContext('2d',{willReadFrequently:true});
 const render=(look,state='idle',t=.32,face=1,outfit,view='game')=>{
  c.clearRect(0,0,440,360);const h=previewHero(state,t);h.face=face;if(h.attack)h.attack.face=face;const raw=JSON.stringify([look,h,outfit]);
  drawHero(c,220,315,look,h,t,1.8,{outfit,view});if(JSON.stringify([look,h,outfit])!==raw)throw Error('Hero renderer changed a saved appearance, equipment or simulation');
  const pixels=c.getImageData(0,0,440,360).data;let visible=0,edge=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>24){visible++;const p=(i-3)/4,x=p%440,y=Math.floor(p/440);if(x===0||x===439||y===0||y===359)edge++;}
  if(visible<600)throw Error('Invisible hero '+state);if(edge)throw Error('Clipped hero '+state);assertions+=3;draws++;return fingerprint(pixels);
 };
 for(const sample of HERO_SAMPLES)for(const state of PREVIEW_POSES){for(const face of [-1,1])for(const time of [.025,.12,.24,.43,.8])render(sample,state,time,face);progress({assertions,draws,sample:sample.name,state});await yieldToUI();}
 const customization=[];
 for(const [key,values] of Object.entries(LOOK_OPTIONS)){
  const hashes=values.map(value=>render(sanitizeLook({...DEFAULT_LOOK,[key]:value})));if(new Set(hashes).size!==values.length)throw Error('Indistinguishable customization '+key);assertions++;customization.push({key,variants:values.length});await yieldToUI();
 }
 for(const [key,range] of Object.entries(LOOK_RANGES)){if(render({...DEFAULT_LOOK,[key]:range[0]})===render({...DEFAULT_LOOK,[key]:range[1]}))throw Error('Inactive proportion '+key);assertions++;}
 for(const key of COLOR_FIELDS){if(render({...DEFAULT_LOOK,[key]:'#1448cd'})===render({...DEFAULT_LOOK,[key]:'#e49726'}))throw Error('Inactive color '+key);assertions++;}
 if(render({...DEFAULT_LOOK,cape:true})===render({...DEFAULT_LOOK,cape:false}))throw Error('Cape toggle is inactive');assertions++;
 let equipment=0;for(const item of Object.values(EQUIPMENT)){render(DEFAULT_LOOK,'kick',.2,1,{...heroOutfit(),pieces:{[item.part]:item}});equipment++;if(equipment%30===0)await yieldToUI();}
 for(const sample of HERO_SAMPLES)for(const view of ['front','back'])render(sample,'run',.22,1,undefined,view);
 for(const [key,range] of Object.entries(LOOK_RANGES))for(const value of range)for(const state of ['idle','run','kick','air-punch','superKick'])render({...DEFAULT_LOOK,[key]:value},state,.13);
 if(heroMaterialStatus().cacheEntries>HERO_MATERIAL_CACHE_LIMIT)throw Error('Unbounded hero material cache');assertions++;
 return {passed:true,assertions,draws,poses:PREVIEW_POSES.length,customization,equipment,materials:heroMaterialStatus(),scope:'Actual hero renderer, all saved appearance controls, all catalog equipment, both facings, front/back views and proportion extremes'};
}
