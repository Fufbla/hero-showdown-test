import {sanitizeLook} from '../../royale/appearance.mjs';
import {drawStyleCFace,STYLE_C_FACE_ANCHORS} from '../../royale/style-c-face.mjs';
import {UniversalHead} from '../kingjames/head.mjs';
export const browserCanvas=(w,h)=>typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):Object.assign(document.createElement('canvas'),{width:w,height:h});
const keys=['presentation','age','skin','eyes','hairColor','face','jaw','eyeShape','brows','nose','mouth','facialHair'];
export const appearanceKey=(look,hideHair)=>[...keys.map(k=>look[k]),hideHair?'hood':look.hair].join('|');
function alphaBounds(canvas){const d=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let x0=canvas.width,y0=canvas.height,x1=0,y1=0;for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(d[(y*canvas.width+x)*4+3]>32){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}return [x0,y0,x1-x0+1,y1-y0+1];}
// The hood path never calls a hair painter and never modifies saved appearance.
export class CostumeFace {
 constructor({canvasFactory=browserCanvas,imageLoader}={}){this.factory=canvasFactory;this.fullHead=new UniversalHead({canvasFactory,imageLoader});this.faces=new Map();}
 get ready(){return this.fullHead.ready;}
 preload(){return this.fullHead.preload();}
 plate(look,closed){const key=appearanceKey(look,true)+'|'+closed;if(this.faces.has(key))return this.faces.get(key);
  const canvas=this.factory(256,256),c=canvas.getContext('2d'),model=STYLE_C_FACE_ANCHORS[look.presentation],factor=194/model.size[1];
  drawStyleCFace(c,look,{center:[128,200-48*factor],scale:factor,mode:'head',blink:closed?1:0});
  const p={image:canvas,bounds:alphaBounds(canvas)};this.faces.set(key,p);while(this.faces.size>32)this.faces.delete(this.faces.keys().next().value);return p;
 }
 draw(c,raw,frame,{hideHair,closed=false}={}){
  const look=sanitizeLook(raw),[x,y,w,h]=frame.face,p=this.plate(look,closed),[bx,by,bw,bh]=p.bounds,s=Math.min(w/bw,h/bh);
  // Register the actual face ink, not transparent source padding. The full head
  // uses precisely the same transform regardless of the saved hairstyle.
  const dx=x+(w-bw*s)/2-bx*s,dy=y+h-bh*s-by*s;
  if(hideHair){c.fillStyle=look.skin;c.fillRect(x-3,y-3,w+6,h+6);c.drawImage(p.image,dx,dy,256*s,256*s);}
  else c.drawImage(this.fullHead.plate(look,closed).image,dx,dy,256*s,256*s);
 }
}
