import {sanitizeLook} from '../../royale/appearance.mjs';
import {UniversalHead} from '../kingjames/head.mjs';
export const browserCanvas=(w,h)=>typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):Object.assign(document.createElement('canvas'),{width:w,height:h});
const keys=['presentation','age','skin','eyes','hair','hairColor','face','jaw','eyeShape','brows','nose','mouth','facialHair'];
export const appearanceKey=look=>keys.map(k=>look[k]).join('|');
// Every costume receives the same customized head. The engine clips covered
// heads to the authored opening; the legacy hideHair flag means containment.
export class CostumeFace {
 constructor({canvasFactory=browserCanvas,imageLoader}={}){this.factory=canvasFactory;this.fullHead=new UniversalHead({canvasFactory,imageLoader});}
 get ready(){return this.fullHead.ready;}
 preload(){return this.fullHead.preload();}
 plate(look,closed){return this.fullHead.facePlate(look,closed);}
 draw(c,raw,frame,{hideHair,closed=false}={}){
  const look=sanitizeLook(raw),[x,y,w,h]=frame.face,p=this.plate(look,closed),[bx,by,bw,bh]=p.bounds,s=Math.min(w/bw,h/bh);
  // Register the actual face ink, not transparent source padding. The full head
  // uses precisely the same transform regardless of the saved hairstyle.
  const dx=x+(w-bw*s)/2-bx*s,dy=hideHair?y+h-bh*s-by*s:frame.head[1]-p.origin[1]*s;
  // The exposed face keeps its own skin tone; the space inside the hood is dark.
  if(hideHair){c.fillStyle='#000000';c.fillRect(x-3,y-3,w+6,h+6);}
  c.drawImage(this.fullHead.plate(look,closed).image,dx,dy,256*s,256*s);
 }
}
