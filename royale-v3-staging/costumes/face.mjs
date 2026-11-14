import {sanitizeLook} from '../../royale/appearance.mjs';
import {UniversalHead} from '../kingjames/head.mjs';
export const browserCanvas=(w,h)=>typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):Object.assign(document.createElement('canvas'),{width:w,height:h});
export const FACE_CLEARANCE=2;
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
  if(!hideHair){this.fullHead.draw(c,look,frame.faceAnchor||frame.head,.35,{closed});return;}
  // Register the actual face ink, not transparent source padding. The full head
  // uses precisely the same transform regardless of the saved hairstyle.
  // Uncovered necks start at the lower edge of the cleared placeholder, not
  // at the bottom of its magenta marker. Align the same chin used by outfits.
  const dx=hideHair?x+(w-bw*s)/2-bx*s:frame.head[0]-p.origin[0]*s;
  const dy=hideHair?y+h-bh*s-by*s:y+h+FACE_CLEARANCE-p.origin[1]*s;
  // The exposed face keeps its own skin tone; the space inside the hood is dark.
  if(hideHair){c.fillStyle='#000000';c.fillRect(x-3,y-3,w+6,h+6);}
  const picture=this.fullHead.plate(look,closed).image;
  c.drawImage(picture,dx,dy,picture.width*s,picture.height*s);
 }
}
