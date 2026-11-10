// The creator, wardrobe, roster, and live patrol share this entry point.
import {drawSourceHero} from './style-c-source.mjs';
import {drawTurnaroundHero} from './style-c-turnaround.mjs';
import {styleCFaceStatus} from './style-c-face.mjs';
import {setStyleCCanvas} from './style-c-materials.mjs';
import {liveStyleCOptions} from './style-c-live.mjs';
import {poseFor} from './style-c-rig.mjs';
import {clothingAppearance} from './cosmetics/visibility.mjs';

export const STYLE_C_FACE_CACHE_LIMIT=styleCFaceStatus().limit;
export function configureStyleC({makeCanvas}={}){setStyleCCanvas(makeCanvas);}
export function styleCCacheStatus(){
  const {entries:faceEntries,limit:faceLimit}=styleCFaceStatus();
  return {faceEntries,faceLimit};
}
export function drawHero(c,x,y,look,hero,time,scale=1,options={}){
  const view=options.view||'game';
  const opt=liveStyleCOptions(options,hero,time);
  const sourceView=!['side','right','left','back'].includes(view);
  // Cosmetic gear is VISUAL ONLY: never mutate saved armor, equipment, wallet
  // or the hero's original appearance. Every released outfit uses this rule.
  const styled=clothingAppearance(opt.outfit,look,opt.clothing);
  const clothingActive=Array.isArray(opt.clothing)&&opt.clothing.some(layer=>layer?.image&&layer.manifest?.layers?.length);
  const appearance=styled.look;
  const renderOptions=clothingActive?{...opt,outfit:styled.outfit,
    clothingActive:true,clothingRegionBase:styled.regionBase}:opt;
  const render=sourceView?drawSourceHero:drawTurnaroundHero;
  // All four views draw garments between animated body layers, never over
  // a finished armored sprite. This also keeps unowned try-on looks identical
  // to purchased looks without modifying cloud-save records.
  const result=render(c,x,y,appearance,hero,time,scale,renderOptions);
  return result||poseFor(look,hero,time,view);
}
