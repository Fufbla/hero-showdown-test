// The creator, wardrobe, roster, and live patrol share this entry point.
import {drawSourceHero} from './style-c-source.mjs';
import {drawTurnaroundHero} from './style-c-turnaround.mjs';
import {styleCFaceStatus} from './style-c-face.mjs';
import {setStyleCCanvas} from './style-c-materials.mjs';
import {liveStyleCOptions} from './style-c-live.mjs';
import {poseFor} from './style-c-rig.mjs';
import {universalRenderLook} from './cosmetics/template.mjs';
import {clothingRuntime} from './cosmetics/runtime.mjs';

export const STYLE_C_FACE_CACHE_LIMIT=styleCFaceStatus().limit;
export function configureStyleC({makeCanvas}={}){setStyleCCanvas(makeCanvas);}
export function styleCCacheStatus(){
  const {entries:faceEntries,limit:faceLimit}=styleCFaceStatus();
  return {faceEntries,faceLimit};
}
export function drawHero(c,x,y,look,hero,time,scale=1,options={}){
  const view=options.view||'game';
  const opt=liveStyleCOptions({...options,universalBody:options.universalBody!==false},hero,time);
  opt.clothing=options.clothing||clothingRuntime.layers(options.cosmetics||options.outfit?.cosmetics);
  if(opt.universalBody)look=universalRenderLook(look);
  const render=view==='side'||view==='right'||view==='left'||view==='back' ? drawTurnaroundHero : drawSourceHero;
  return render(c,x,y,look,hero,time,scale,opt)||poseFor(opt.universalBody?{...look,presentation:'male'}:look,hero,time,view);
}
