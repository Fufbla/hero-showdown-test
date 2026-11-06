// The creator, wardrobe, roster, and live patrol share this entry point.
import {drawSourceHero} from './style-c-source.mjs';
import {drawTurnaroundHero} from './style-c-turnaround.mjs';
import {styleCHeadStatus} from './style-c-head.mjs';
import {setStyleCCanvas} from './style-c-materials.mjs';
import {liveStyleCOptions} from './style-c-live.mjs';
import {poseFor} from './style-c-rig.mjs';

export const STYLE_C_FACE_CACHE_LIMIT=styleCHeadStatus().limit;
export function configureStyleC({makeCanvas}={}){setStyleCCanvas(makeCanvas);}
export function styleCCacheStatus(){
  const {entries:faceEntries,limit:faceLimit}=styleCHeadStatus();
  return {faceEntries,faceLimit};
}
export function drawHero(c,x,y,look,hero,time,scale=1,options={}){
  const view=options.view||'game';
  const opt=liveStyleCOptions(options,hero,time);
  const render=view==='right'||view==='side'||view==='left'||view==='back' ? drawTurnaroundHero : drawSourceHero;
  return render(c,x,y,look,hero,time,scale,opt)||poseFor(look,hero,time,view);
}
