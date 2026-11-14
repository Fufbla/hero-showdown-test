import {sanitizeLook} from '../../royale/appearance.mjs';
import {prepareStyleCFace,drawStyleCFace,STYLE_C_FACE_ANCHORS} from '../../royale/style-c-face.mjs';
import {prepareStyleCHair,drawStyleCHair} from '../../royale/style-c-hair.mjs';
const browserCanvas=(w,h)=>typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):Object.assign(document.createElement('canvas'),{width:w,height:h});
const faceKeys=['presentation','age','skin','eyes','hair','hairColor','face','jaw','eyeShape','brows','nose','mouth','facialHair'];
const FACE_ORIGIN=[128,200];
// Preserve the original facial artwork in one piece. Compress its horizontal
// sampling by the inverse fitting aspect so eyes, brows, nose and mouth receive
// the same final scale on both axes. A soft transition is confined to surrounding
// skin; it never erases/reconstructs features or changes their selected designs.
function proportionalFeatures(canvas,factor,aspect){
 const c=canvas.getContext('2d'),source=c.getImageData(0,0,256,256),out=c.createImageData(256,256);
 const model=STYLE_C_FACE_ANCHORS.female;
 const center=FACE_ORIGIN[0]+(943-model.center[0])*factor;
 const top=FACE_ORIGIN[1]-48*factor+(350-model.center[1])*factor;
 const bottom=FACE_ORIGIN[1]-48*factor+(437-model.center[1])*factor;
 const ramp=12*factor;
 const [edge,,width]=registration(canvas).bounds;
 for(let y=0;y<256;y++){
  const weight=Math.max(0,Math.min(1,(y-top+ramp)/ramp,(bottom+ramp-y)/ramp));
  for(let x=0;x<256;x++){
   const inside=Math.max(0,Math.min(1,(x-edge)/(17*factor),(edge+width-1-x)/(10*factor)));
   const sample=center+(x-center)*(1+(aspect-1)*weight*inside),left=Math.floor(sample),mix=sample-left,i=(y*256+x)*4;
   const a=left>=0&&left<256?(y*256+left)*4:-1,b=left+1>=0&&left+1<256?(y*256+left+1)*4:-1;
   const aa=a<0?0:source.data[a+3]*(1-mix),ba=b<0?0:source.data[b+3]*mix,alpha=aa+ba;
   if(!alpha)continue;
   for(let k=0;k<3;k++)out.data[i+k]=((a<0?0:source.data[a+k]*aa)+(b<0?0:source.data[b+k]*ba))/alpha;
   out.data[i+3]=alpha;
  }
 }
 c.putImageData(out,0,0);
}
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
  let image=canvas,fit=null,fitBounds=null;
  if(look.presentation==='female'){
   // Match the visible male head, not the differently padded source atlases.
   // Measure without a beard so accessories cannot resize the skull or hair.
   if(look.facialHair!=='none')({fit,fitBounds}=this.facePlate({...look,facialHair:'none'},closed));
   else{
    const source=registration(canvas).bounds;
    const target=this.facePlate({...look,presentation:'male'},closed).bounds;
    const sx=target[2]/source[2],sy=target[3]/source[3];
    fit=[sx,sy,target[0]-source[0]*sx,target[1]-source[1]*sy];
    fitBounds=target;
   }
   proportionalFeatures(canvas,factor,fit[0]/fit[1]);
   image=this.factory(256,256);const fitted=image.getContext('2d');
   if(look.facialHair==='none'){fitted.beginPath();fitted.rect(...fitBounds);fitted.clip();}
   fitted.setTransform(fit[0],0,0,fit[1],fit[2],fit[3]);fitted.drawImage(canvas,0,0);
  }
  const metrics=registration(image);
  // A beard must not move the chin attachment or the character's whole head.
  if(look.facialHair!=='none')metrics.origin=this.facePlate({...look,facialHair:'none'},closed).origin;
  const result={image,...metrics,...(fit?{fit,fitBounds}:{})};this.faces.set(key,result);
  if(this.faces.size>32)this.faces.delete(this.faces.keys().next().value);
  return result;
 }
 plate(raw,closed=false){
  const look=sanitizeLook(raw);
  const key=faceKeys.map(k=>look[k]).join('|')+'|'+closed;
  if(this.cache.has(key))return this.cache.get(key);
  // Preserve all of the enlarged hair, including tall puffs and long styles.
  // Padding is transparent and never changes the head's world-space size.
  const pad=look.presentation==='female'?64:0;
  const canvas=this.factory(256+pad*2,256+pad*2),c=canvas.getContext('2d');
  const face=this.facePlate(look,closed);
  if(face.fit)c.setTransform(face.fit[0],0,0,face.fit[1],face.fit[2]+pad,face.fit[3]+pad);
  const model=STYLE_C_FACE_ANCHORS[look.presentation],factor=194/model.size[1];
  c.save();c.translate(128,200);
  const faceCenter=[0,-48*factor];
  c.save();c.translate(...faceCenter);c.scale(2.55*factor,2.55*factor);
  drawStyleCHair(c,look,{wind:0,bounce:0},0,'rear','front');c.restore();
  if(face.fit){c.save();c.resetTransform();c.drawImage(face.image,pad,pad);c.restore();}
  else drawStyleCFace(c,look,{center:faceCenter,scale:factor,mode:'head',blink:closed?1:0});
  c.save();c.translate(...faceCenter);c.scale(2.55*factor,2.55*factor);
  drawStyleCHair(c,look,{wind:0,bounce:0},0,'front','front');c.restore();c.restore();
  const result={image:canvas,origin:pad?face.origin.map(n=>n+pad):face.origin,...(pad?{offset:[pad,pad]}:{})};
  this.cache.set(key,result);if(this.cache.size>24)this.cache.delete(this.cache.keys().next().value);
  return result;
 }
 draw(c,look,anchor,scale,{closed=false}={}){
  if(!this.ready)return false;
  const p=this.plate(look,closed);c.save();c.translate(anchor[0],anchor[1]);c.rotate(anchor[2]);c.scale(scale,scale);
  c.drawImage(p.image,-p.origin[0],-p.origin[1]);c.restore();return true;
 }
}
