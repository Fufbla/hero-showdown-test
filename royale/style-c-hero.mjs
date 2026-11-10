// The creator, wardrobe, roster, and live patrol share this entry point.
import {drawSourceHero} from './style-c-source.mjs';
import {drawTurnaroundHero} from './style-c-turnaround.mjs';
import {styleCFaceStatus} from './style-c-face.mjs';
import {setStyleCCanvas} from './style-c-materials.mjs';
import {liveStyleCOptions} from './style-c-live.mjs';
import {poseFor} from './style-c-rig.mjs';
import {drawClothingPass,clothingCoverage} from './cosmetics/renderer.mjs';

export const STYLE_C_FACE_CACHE_LIMIT=styleCFaceStatus().limit;
export function configureStyleC({makeCanvas}={}){setStyleCCanvas(makeCanvas);}
export function styleCCacheStatus(){
  const {entries:faceEntries,limit:faceLimit}=styleCFaceStatus();
  return {faceEntries,faceLimit};
}
export function drawHero(c,x,y,look,hero,time,scale=1,options={}){
  const view=options.view||'game';
  const opt=liveStyleCOptions(options,hero,time);
  // Clothes visually cover armor only where their artwork is fully loaded.
  // The actual inventory and armor statistics remain unchanged.
  const coverage=clothingCoverage(opt.clothing);
  const garment=coverage.size>0;
  const armor=opt.outfit?.pieces||{};
  const hide={
    suit:coverage.has('torso'),chest:coverage.has('torso'),
    belt:coverage.has('belt')||coverage.has('torso'),
    emblem:coverage.has('emblem')||coverage.has('torso'),
    gloves:coverage.has('gloves')||coverage.has('arms'),
    boots:coverage.has('boots')||coverage.has('feet')||coverage.has('legs'),
    helmet:coverage.has('helmet'),mask:coverage.has('mask'),
    cape:coverage.has('cape'),
  };
  const visibleArmor=garment?Object.fromEntries(Object.entries(armor).filter(([part])=>!hide[part])):armor;
  const appearance=garment&&coverage.has('cape')?{...look,cape:false}:look;
  const renderOptions=garment?{...opt,outfit:{...opt.outfit,pieces:visibleArmor}}:opt;
  const render=view==='side'||view==='right'||view==='left'||view==='back' ? drawTurnaroundHero : drawSourceHero;
  const result=render(c,x,y,appearance,hero,time,scale,renderOptions);
  // Cosmetic artwork is composited after armor without modifying its stats.
  // Each pass follows the same animated hero pose; failed textures leave armor intact.
  if(result?.arms?.length&&Array.isArray(opt.clothing)&&opt.clothing.length){
    const facing=view==='game'?(hero.attack?.face||hero.face||1):1;
    const garmentView=view==='game'?'front':view==='side'?'right':view;
    c.save();c.translate(x,y);c.scale(scale*facing,scale);
    try{for(const pass of ['behindBody','farLeg','nearLeg','torso','farArm','nearArm','overBody','behindHead','headwear','accessory'])drawClothingPass(c,result,garmentView,pass,opt.clothing);}
    finally{c.restore();}
  }
  return result||poseFor(look,hero,time,view);
}
