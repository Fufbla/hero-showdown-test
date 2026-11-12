import {sanitizeLook} from '../../royale/appearance.mjs';
import {prepareStyleCFace,drawStyleCFace,STYLE_C_FACE_ANCHORS} from '../../royale/style-c-face.mjs';
import {prepareStyleCHair,drawStyleCHair} from '../../royale/style-c-hair.mjs';
const browserCanvas=(w,h)=>typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):Object.assign(document.createElement('canvas'),{width:w,height:h});
const faceKeys=['presentation','age','skin','eyes','hair','hairColor','face','jaw','eyeShape','brows','nose','mouth','facialHair'];
export class UniversalHead{
 constructor({canvasFactory=browserCanvas,imageLoader}={}){this.factory=canvasFactory;this.imageLoader=imageLoader;this.cache=new Map();this.ready=false;}
 async preload(){
  const opt={canvasFactory:this.factory,...(this.imageLoader?{imageLoader:this.imageLoader}:{})};
  this.ready=(await Promise.all([prepareStyleCFace(opt),prepareStyleCHair(opt)])).every(Boolean);
  if(!this.ready)throw Error('Customized head artwork unavailable');return true;
 }
 plate(raw,closed=false){
  const look=sanitizeLook(raw);
  const key=faceKeys.map(k=>look[k]).join('|')+'|'+closed;
  if(this.cache.has(key))return this.cache.get(key);
  // Fixed head canvas and neck origin for every sex and saved body shape.
  const canvas=this.factory(256,256),c=canvas.getContext('2d');
  const model=STYLE_C_FACE_ANCHORS[look.presentation],factor=194/model.size[1];
  c.save();c.translate(128,200);
  const faceCenter=[0,-48*factor];
  c.save();c.translate(...faceCenter);c.scale(2.55*factor,2.55*factor);
  drawStyleCHair(c,look,{wind:0,bounce:0},0,'rear','front');c.restore();
  drawStyleCFace(c,look,{center:faceCenter,scale:factor,mode:'head',blink:closed?1:0});
  c.save();c.translate(...faceCenter);c.scale(2.55*factor,2.55*factor);
  drawStyleCHair(c,look,{wind:0,bounce:0},0,'front','front');c.restore();c.restore();
  const result={image:canvas,origin:[128,200]};
  this.cache.set(key,result);if(this.cache.size>24)this.cache.delete(this.cache.keys().next().value);
  return result;
 }
 draw(c,look,anchor,scale,{closed=false}={}){
  if(!this.ready)return false;
  const p=this.plate(look,closed);c.save();c.translate(anchor[0],anchor[1]);c.rotate(anchor[2]);c.scale(scale,scale);
  c.drawImage(p.image,-p.origin[0],-p.origin[1]);c.restore();return true;
 }
}
