import {sanitizeLook} from '../../royale/appearance.mjs';
import {prepareStyleCFace,drawStyleCFace,STYLE_C_FACE_ANCHORS} from '../../royale/style-c-face.mjs';
import {prepareStyleCHair,drawStyleCHair} from '../../royale/style-c-hair.mjs';
const browserCanvas=(w,h)=>typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):Object.assign(document.createElement('canvas'),{width:w,height:h});
const faceKeys=['presentation','age','skin','eyes','hair','hairColor','face','jaw','eyeShape','brows','nose','mouth','facialHair'];
const FACE_ORIGIN=[128,200];
function registration(canvas){
 const data=canvas.getContext('2d').getImageData(0,0,256,256).data;
 let x0=256,y0=256,x1=-1,y1=-1;
 const chin=[];
 for(let x=0;x<256;x++){
  let bottom=-1;
  for(let y=0;y<256;y++){
   const alpha=data[(y*256+x)*4+3];
   if(alpha>32){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
   if(alpha>=192)bottom=y;
  }
  if(x>=124&&x<=132&&bottom>=0)chin.push(bottom);
 }
 // Attach the opaque underside of the chin, not the transparent padding below
 // it. A one-pixel overlap prevents a seam after scaling/rotation on Safari.
 return {bounds:[x0,y0,x1-x0+1,y1-y0+1],origin:[128,Math.min(...chin)-1]};
}
export class UniversalHead{
 constructor({canvasFactory=browserCanvas,imageLoader}={}){this.factory=canvasFactory;this.imageLoader=imageLoader;this.cache=new Map();this.faces=new Map();this.ready=false;}
 async preload(){
  const opt={canvasFactory:this.factory,...(this.imageLoader?{imageLoader:this.imageLoader}:{})};
  this.ready=(await Promise.all([prepareStyleCFace(opt),prepareStyleCHair(opt)])).every(Boolean);
  if(!this.ready)throw Error('Customized head artwork unavailable');return true;
 }
 facePlate(raw,closed=false){
  const look=sanitizeLook(raw),key=faceKeys.filter(k=>k!=='hair').map(k=>look[k]).join('|')+'|'+closed;
  if(this.faces.has(key))return this.faces.get(key);
  const canvas=this.factory(256,256),c=canvas.getContext('2d'),factor=194/STYLE_C_FACE_ANCHORS[look.presentation].size[1];
  drawStyleCFace(c,look,{center:[FACE_ORIGIN[0],FACE_ORIGIN[1]-48*factor],scale:factor,mode:'head',blink:closed?1:0});
  const metrics=registration(canvas);
  // A beard must not move the chin attachment or the character's whole head.
  if(look.facialHair!=='none')metrics.origin=this.facePlate({...look,facialHair:'none'},closed).origin;
  const result={image:canvas,...metrics};this.faces.set(key,result);
  if(this.faces.size>32)this.faces.delete(this.faces.keys().next().value);
  return result;
 }
 plate(raw,closed=false){
  const look=sanitizeLook(raw);
  const key=faceKeys.map(k=>look[k]).join('|')+'|'+closed;
  if(this.cache.has(key))return this.cache.get(key);
  // Hair and face keep their original shared coordinates and dimensions.
  const canvas=this.factory(256,256),c=canvas.getContext('2d');
  const model=STYLE_C_FACE_ANCHORS[look.presentation],factor=194/model.size[1];
  c.save();c.translate(128,200);
  const faceCenter=[0,-48*factor];
  c.save();c.translate(...faceCenter);c.scale(2.55*factor,2.55*factor);
  drawStyleCHair(c,look,{wind:0,bounce:0},0,'rear','front');c.restore();
  drawStyleCFace(c,look,{center:faceCenter,scale:factor,mode:'head',blink:closed?1:0});
  c.save();c.translate(...faceCenter);c.scale(2.55*factor,2.55*factor);
  drawStyleCHair(c,look,{wind:0,bounce:0},0,'front','front');c.restore();c.restore();
  const result={image:canvas,origin:this.facePlate(look,closed).origin};
  this.cache.set(key,result);if(this.cache.size>24)this.cache.delete(this.cache.keys().next().value);
  return result;
 }
 draw(c,look,anchor,scale,{closed=false}={}){
  if(!this.ready)return false;
  const p=this.plate(look,closed);c.save();c.translate(anchor[0],anchor[1]);c.rotate(anchor[2]);c.scale(scale,scale);
  c.drawImage(p.image,-p.origin[0],-p.origin[1]);c.restore();return true;
 }
}
