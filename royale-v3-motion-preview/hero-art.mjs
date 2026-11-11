// This entry exists only in the copied game. Original renderer remains untouched.
import {poseFor} from './style-c-rig.mjs';
import {motionSprites} from './motion-sprites.mjs';
export function drawHero(c,x,y,look,hero,time,scale=1,options={}){
 const h={grounded:true,face:1,vx:0,vy:0,cycle:0,...hero};
 if(options.view==='left')h.face=-1;
 motionSprites.draw(c,x,y,h,time,scale,{menu:!!options.view&&options.view!=='game'});
 // Existing power effects receive their normal read-only attachment metadata.
 return poseFor(look,h,time,options.view||'game');
}
