import {drawHero,styleCCacheStatus} from '../style-c-hero.mjs';
import {styleCTextureStatus} from '../style-c-materials.mjs';
import {previewHero,PREVIEW_POSES} from '../style-c-rig.mjs';
import {HAIR_STYLES,LOOK_OPTIONS} from '../appearance.mjs';
import {STYLE_C_SAMPLES,styleCOutfit} from './style-c-scenes.mjs';
export async function runStyleCBrowserChecks(makeCanvas){
 const canvas=makeCanvas(480,480),c=canvas.getContext('2d',{willReadFrequently:true});let draws=0,assertions=0;
 for(const hair of HAIR_STYLES)for(const build of LOOK_OPTIONS.build)for(const presentation of LOOK_OPTIONS.presentation){
  const l={...STYLE_C_SAMPLES[0],hair,build,presentation};
  for(const state of ['idle','run','punch','kick']){c.clearRect(0,0,480,480);const h=previewHero(state,.15),before=JSON.stringify([l,h]);drawHero(c,215,400,l,h,.15,2.2,{view:'game'});if(JSON.stringify([l,h])!==before)throw Error('Renderer mutated appearance or gameplay');const px=c.getImageData(0,0,480,480).data;let ink=0,edge=0;for(let i=3;i<px.length;i+=4)if(px[i]>16){ink++;const pos=(i-3)/4;if(pos%480===0||pos%480===479||pos<480||pos>=480*479)edge++;}if(ink<100||edge)throw Error('Invisible or clipped '+hair+'/'+build+'/'+state);draws++;assertions+=3;}
  if(draws%64===0)await new Promise(r=>setTimeout(r,0));
 }
 for(const kind of ['rare',...['lightning','air','styrodog','sonic','styro','wastelander','venomis','atomdust'].map(x=>'merge:'+x)])for(const state of PREVIEW_POSES){const gear=styleCOutfit(kind),before=JSON.stringify(gear);drawHero(c,215,400,STYLE_C_SAMPLES[1],previewHero(state,.15),.15,2.2,{outfit:gear});if(before!==JSON.stringify(gear))throw Error('Equipment mutation');draws++;assertions++;}
 return {passed:true,draws,assertions,hairstyles:HAIR_STYLES.length,builds:LOOK_OPTIONS.build.length,presentations:2,poses:PREVIEW_POSES.length,textures:styleCTextureStatus(),faces:styleCCacheStatus(),userAgent:navigator.userAgent,scope:'Canvas render visibility, bounds and immutable appearance/equipment. Not physical-device or subjective animation approval.'};
}
