import {UniversalHead} from '../../../royale-v3-staging/kingjames/head.mjs';
import {drawStyleCHair} from '../../../royale/style-c-hair.mjs';
import {STYLE_C_FACE_ANCHORS} from '../../../royale/style-c-face.mjs';
import {sanitizeLook} from '../../../royale/appearance.mjs';
import {appearanceKey,browserCanvas} from '../../../royale-v3-staging/costumes/face.mjs';
import {measureViceEyes} from '../../../royale/fashion/vice/head.mjs';

export const HAT_HEAD_PADDING=64;
export const HAT_HEAD_SIZE=256+HAT_HEAD_PADDING*2;
const browserImage=url=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Costume hat artwork unavailable'));image.src=url.href;});
const trim=(cache,limit)=>{while(cache.size>limit)cache.delete(cache.keys().next().value);};
const finiteRect=r=>Array.isArray(r)&&r.length===4&&r.every(Number.isFinite)&&r[2]>0&&r[3]>0;
function inkBounds(image,factory){
 const canvas=factory(image.width,image.height),c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);
 const {data}=c.getImageData(0,0,image.width,image.height);let x0=image.width,y0=image.height,x1=-1,y1=-1;
 for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++)if(data[(y*image.width+x)*4+3]>16){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 if(x1<x0)throw Error('Costume hat artwork is empty');return [x0,y0,x1-x0+1,y1-y0+1];
}

// The unchanged customized face and the lower portions of every saved hairstyle
// remain visible. Only hair above the actual cap/helmet silhouette is clipped.
export class CostumeHatHead{
 constructor({canvasFactory=browserCanvas,imageLoader=browserImage}={}){
  this.factory=canvasFactory;this.imageLoader=imageLoader;this.base=new UniversalHead({canvasFactory,imageLoader});
  this.cache=new Map();this.geometryCache=new Map();this.ready=false;this.pending=null;this.error=null;
 }
 async preload(headgear,baseURL){
  if(this.ready)return true;if(this.pending)return this.pending;
  this.pending=Promise.resolve().then(async()=>{try{
   const file=typeof headgear?.hat==='string'?headgear.hat:headgear?.hat?.atlas;
   if(!file)throw Error('Costume hat artwork is required');
   const [hat,headReady]=await Promise.all([this.imageLoader(new URL(file,baseURL)),this.base.preload()]);
   if(!headReady)throw Error(this.base.error||'Customized head artwork unavailable');
   const bounds=inkBounds(hat,this.factory),fit=headgear.hatFit||{},crown=fit.crown||[bounds[0]+bounds[2]*.06,bounds[1],bounds[2]*.88,bounds[3]*.78];
   if(!finiteRect(crown)||crown[0]<0||crown[1]<0||crown[0]+crown[2]>hat.width||crown[1]+crown[3]>hat.height)throw Error('Invalid costume hat crown registration');
   const width=fit.width??1.14,seat=fit.seatAboveEyes??.22;
   if(!Number.isFinite(width)||width<.7||width>1.5||!Number.isFinite(seat)||seat<.05||seat>.45)throw Error('Invalid costume hat fitting proportions');
   this.gear={hat,bounds,crown,fit};this.ready=true;this.error=null;this.cache.clear();this.geometryCache.clear();return true;
  }catch(error){this.error=error.message;this.ready=false;return false;}finally{this.pending=null;}});
  return this.pending;
 }
 geometry(raw){
  if(!this.ready)throw Error(this.error||'Costume hat has not loaded');
  const look=sanitizeLook(raw),key=[look.presentation,look.age,look.face,look.jaw,look.eyeShape,look.brows,look.nose,look.mouth].join('|');
  if(this.geometryCache.has(key))return this.geometryCache.get(key);
  const face=this.base.facePlate({...look,hair:'none',facialHair:'none'}),[x,y,w,h]=face.bounds,eyes=measureViceEyes(this.base,look),eyeLine=(eyes[0][1]+eyes[1][1])/2;
  const {crown,fit,bounds}=this.gear,seat=Math.min(eyeLine-h*(fit.seatAboveEyes??.22),y+h*.5),s=w*(fit.width??1.14)/crown[2],pad=HAT_HEAD_PADDING;
  const transform=[s,0,0,s,x+w/2-(crown[0]+crown[2]/2)*s+pad,seat-(crown[1]+crown[3])*s+pad];
  const hat=this.factory(HAT_HEAD_SIZE,HAT_HEAD_SIZE),c=hat.getContext('2d');c.setTransform(...transform);c.drawImage(this.gear.hat,0,0);
  const data=c.getImageData(0,0,HAT_HEAD_SIZE,HAT_HEAD_SIZE).data,crownCutY=new Int16Array(HAT_HEAD_SIZE);crownCutY.fill(-1);let first=-1,last=-1;
  for(let cx=0;cx<HAT_HEAD_SIZE;cx++)for(let cy=HAT_HEAD_SIZE-1;cy>=0;cy--)if(data[(cy*HAT_HEAD_SIZE+cx)*4+3]>=64){crownCutY[cx]=cy;if(first<0)first=cx;last=cx;break;}
  if(first<0)throw Error('Costume hat fitting is outside the head canvas');
  for(let cx=0;cx<first;cx++)crownCutY[cx]=crownCutY[first];
  for(let cx=first+1;cx<HAT_HEAD_SIZE;cx++)if(crownCutY[cx]<0)crownCutY[cx]=crownCutY[Math.min(cx-1,last)];
  const result={skullBounds:[x+pad,y+pad,w,h],eyes:eyes.map(p=>p.map(n=>n+pad)),eyeLine:eyeLine+pad,hatSeatY:seat+pad,crownCutY,hatTransform:transform,hatRect:[bounds[0]*s+transform[4],bounds[1]*s+transform[5],bounds[2]*s,bounds[3]*s]};
  this.geometryCache.set(key,result);trim(this.geometryCache,128);return result;
 }
 hairLayer(look,face,layer){
  const canvas=this.factory(HAT_HEAD_SIZE,HAT_HEAD_SIZE),c=canvas.getContext('2d'),pad=HAT_HEAD_PADDING;
  if(face.fit)c.setTransform(face.fit[0],0,0,face.fit[1],face.fit[2]+pad,face.fit[3]+pad);else c.translate(pad,pad);
  const factor=194/STYLE_C_FACE_ANCHORS[look.presentation].size[1];
  c.translate(128,200-48*factor);c.scale(2.55*factor,2.55*factor);
  if(!drawStyleCHair(c,look,{wind:0,bounce:0},0,layer,'front'))throw Error('Costume hairstyle artwork unavailable: '+look.hair);
  return canvas;
 }
 layers(raw,{closed=false}={}){
  const look=sanitizeLook(raw),geometry=this.geometry(look),facePlate=this.base.facePlate(look,closed),pad=HAT_HEAD_PADDING;
  const rawRear=this.hairLayer(look,facePlate,'rear'),rawFront=this.hairLayer(look,facePlate,'front');
  const clipped=source=>{const canvas=this.factory(HAT_HEAD_SIZE,HAT_HEAD_SIZE),c=canvas.getContext('2d');c.drawImage(source,0,0);for(let x=0;x<HAT_HEAD_SIZE;x++)c.clearRect(x,0,1,geometry.crownCutY[x]);return canvas;};
  const rear=clipped(rawRear),front=clipped(rawFront),face=this.factory(HAT_HEAD_SIZE,HAT_HEAD_SIZE);face.getContext('2d').drawImage(facePlate.image,pad,pad);
  const hat=this.factory(HAT_HEAD_SIZE,HAT_HEAD_SIZE),hc=hat.getContext('2d');hc.setTransform(...geometry.hatTransform);hc.drawImage(this.gear.hat,0,0);
  const image=this.factory(HAT_HEAD_SIZE,HAT_HEAD_SIZE),c=image.getContext('2d');for(const layer of[rear,face,front,hat])c.drawImage(layer,0,0);
  return {image,origin:facePlate.origin.map(n=>n+pad),offset:[pad,pad],rawRear,rawFront,rear,front,face,hat,geometry};
 }
 plate(raw,closed=false){
  const look=sanitizeLook(raw),key=appearanceKey(look)+'|'+closed;
  if(this.cache.has(key)){const old=this.cache.get(key);this.cache.delete(key);this.cache.set(key,old);return old;}
  const {image,origin,offset,geometry}=this.layers(look,{closed}),result={image,origin,offset,geometry};this.cache.set(key,result);trim(this.cache,24);return result;
 }
 draw(c,raw,anchor,scale,{closed=false}={}){
  if(!this.ready)return false;const p=this.plate(raw,closed);c.save();c.translate(anchor[0],anchor[1]);c.rotate(anchor[2]);c.scale(scale,scale);c.drawImage(p.image,-p.origin[0],-p.origin[1]);c.restore();return true;
 }
}
