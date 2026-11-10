// The creator, wardrobe, roster, and live patrol share this entry point.
import {drawSourceHero} from './style-c-source.mjs';
import {drawTurnaroundHero} from './style-c-turnaround.mjs';
import {styleCFaceStatus} from './style-c-face.mjs';
import {setStyleCCanvas} from './style-c-materials.mjs';
import {liveStyleCOptions} from './style-c-live.mjs';
import {poseFor} from './style-c-rig.mjs';
import {drawClothingPass} from './cosmetics/renderer.mjs';
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
  const garment=styled.coverage.size>0;
  const appearance=styled.look;
  const renderOptions=garment?{...opt,outfit:styled.outfit,
    clothingActive:sourceView,clothingRegionBase:styled.regionBase}:opt;
  const render=sourceView?drawSourceHero:drawTurnaroundHero;
  const result=render(c,x,y,appearance,hero,time,scale,renderOptions);
  // Cosmetic artwork is composited after armor without modifying its stats.
  // Each pass follows the same animated hero pose; failed textures leave armor intact.
  if(!sourceView&&result?.arms?.length&&Array.isArray(opt.clothing)&&opt.clothing.length){
    const facing=view==='game'?(hero.attack?.face||hero.face||1):1;
    const garmentView=view==='game'?'front':view==='side'?'right':view;
    c.save();c.translate(x,y);c.scale(scale*facing,scale);
    try{for(const pass of ['behindBody','farLeg','nearLeg','torso','farArm','nearArm','overBody','behindHead','headwear','accessory'])drawClothingPass(c,result,garmentView,pass,opt.clothing);}
    finally{c.restore();}
  }
  return result||poseFor(look,hero,time,view);
}
