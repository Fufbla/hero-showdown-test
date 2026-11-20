import {UniversalHead} from '../../../royale-v3-staging/kingjames/head.mjs';
import {drawStyleCHair} from '../../style-c-hair.mjs';
import {STYLE_C_FACE_ANCHORS} from '../../style-c-face.mjs';
import {sanitizeLook} from '../../appearance.mjs';
import {appearanceKey,browserCanvas} from '../../../royale-v3-staging/costumes/face.mjs';

export const VICE_HEAD_PADDING=64;
export const VICE_HEAD_SIZE=256+VICE_HEAD_PADDING*2;
export const VICE_HEAD_CACHE_LIMIT=24;
const browserImage=url=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Vice headwear artwork unavailable'));image.src=url.href;});
const trim=(cache,limit)=>{while(cache.size>limit)cache.delete(cache.keys().next().value);};
const point=(m,p)=>[m[0]*p[0]+m[2]*p[1]+m[4],m[1]*p[0]+m[3]*p[1]+m[5]];
const finiteRect=r=>Array.isArray(r)&&r.length===4&&r.every(Number.isFinite)&&r[2]>0&&r[3]>0;

function inkBounds(image,factory){
 const canvas=factory(image.width,image.height),c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);
 const {data}=c.getImageData(0,0,image.width,image.height);let x0=image.width,y0=image.height,x1=-1,y1=-1;
 for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++)if(data[(y*image.width+x)*4+3]>16){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 if(x1<x0)throw Error('Vice headwear artwork is empty');return [x0,y0,x1-x0+1,y1-y0+1];
}

// Recolor only the unchanged renderer's irises to locate their actual centers.
// This also includes its female fitting transform and every saved eye shape.
export function measureViceEyes(head,raw){
 const look={...sanitizeLook(raw),hair:'none',facialHair:'none'};
 const a=head.facePlate({...look,eyes:'#00ff00'}).image.getContext('2d').getImageData(0,0,256,256).data;
 const b=head.facePlate({...look,eyes:'#ff00ff'}).image.getContext('2d').getImageData(0,0,256,256).data;
 const samples=[];
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){
  const i=(y*256+x)*4,w=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);
  if(w>24&&a[i+3]>64&&b[i+3]>64)samples.push([x+.5,y+.5,w]);
 }
 if(samples.length<4)throw Error('Vice sunglasses could not locate the customized eyes');
 let centers=[[Math.min(...samples.map(p=>p[0])),0],[Math.max(...samples.map(p=>p[0])),0]];
 for(let iteration=0;iteration<8;iteration++){
  const sums=[[0,0,0],[0,0,0]];
  for(const [x,y,w]of samples){const n=Math.abs(x-centers[0][0])<=Math.abs(x-centers[1][0])?0:1;sums[n][0]+=x*w;sums[n][1]+=y*w;sums[n][2]+=w;}
  if(sums.some(s=>!s[2]))throw Error('Vice sunglasses require two separate eye anchors');
  centers=sums.map(([x,y,w])=>[x/w,y/w]);
 }
 if(centers[1][0]-centers[0][0]<8)throw Error('Vice sunglasses eye anchors overlap');
 return centers;
}

export class ViceHead{
 constructor({canvasFactory=browserCanvas,imageLoader=browserImage}={}){
  this.factory=canvasFactory;this.imageLoader=imageLoader;this.base=new UniversalHead({canvasFactory,imageLoader});
  this.cache=new Map();this.geometryCache=new Map();this.ready=false;this.pending=null;this.error=null;
 }
 async preload(headgear={cap:'cap.png',glasses:'glasses.png'},baseURL=new URL('./assets/manifest.json',import.meta.url)){
  if(this.ready)return true;if(this.pending)return this.pending;
  this.pending=Promise.resolve().then(async()=>{try{
   const capFile=typeof headgear.cap==='string'?headgear.cap:headgear.cap?.atlas;
   const glassesFile=typeof headgear.glasses==='string'?headgear.glasses:headgear.glasses?.atlas;
   if(!capFile||!glassesFile)throw Error('Vice cap and sunglasses artwork are required');
   const [cap,glasses]=await Promise.all([this.imageLoader(new URL(capFile,baseURL)),this.imageLoader(new URL(glassesFile,baseURL)),this.base.preload()]);
   const capBounds=inkBounds(cap,this.factory),glassesBounds=inkBounds(glasses,this.factory);
   const capFit=headgear.capFit||{},glassesFit=headgear.glassesFit||{};
   // Register the forehead band, rather than the lower backwards brim.
   const crown=capFit.crown||[capBounds[0]+capBounds[2]*.09,capBounds[1],capBounds[2]*.91,capBounds[3]*.66];
   if(!finiteRect(crown)||crown[0]<0||crown[1]<0||crown[0]+crown[2]>cap.width||crown[1]+crown[3]>cap.height)throw Error('Invalid Vice cap crown registration');
   const width=capFit.width??1.14,seat=capFit.seatAboveEyes??.22,glassesWidth=glassesFit.width??1.06;
   if(!Number.isFinite(width)||width<.7||width>1.5||!Number.isFinite(seat)||seat<.05||seat>.45||!Number.isFinite(glassesWidth)||glassesWidth<.8||glassesWidth>1.4)throw Error('Invalid Vice headwear fitting proportions');
   const lensEyes=glassesFit.eyes||[[glassesBounds[0]+glassesBounds[2]*.427,glassesBounds[1]+glassesBounds[3]*.55],[glassesBounds[0]+glassesBounds[2]*.82,glassesBounds[1]+glassesBounds[3]*.49]];
   if(!Array.isArray(lensEyes)||lensEyes.length!==2||lensEyes.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||p[0]<0||p[0]>=glasses.width||p[1]<0||p[1]>=glasses.height)||Math.hypot(lensEyes[1][0]-lensEyes[0][0],lensEyes[1][1]-lensEyes[0][1])<2)throw Error('Invalid Vice sunglasses registration');
   this.gear={cap,glasses,capBounds,glassesBounds,crown,lensEyes,capFit,glassesFit};this.cache.clear();this.geometryCache.clear();this.ready=true;this.error=null;return true;
  }catch(error){this.error=error.message;this.ready=false;return false;}finally{this.pending=null;}});
  return this.pending;
 }
 facePlate(raw,closed=false){return this.base.facePlate(raw,closed);}
 geometry(raw){
  if(!this.ready)throw Error(this.error||'Vice headwear has not loaded');
  const look=sanitizeLook(raw),key=[look.presentation,look.age,look.face,look.jaw,look.eyeShape,look.brows,look.nose,look.mouth].join('|');
  if(this.geometryCache.has(key))return this.geometryCache.get(key);
  const clean=this.base.facePlate({...look,hair:'none',facialHair:'none'}),skullBounds=[...clean.bounds],eyes=measureViceEyes(this.base,look);
  const [x,y,w,h]=skullBounds,eyeLine=(eyes[0][1]+eyes[1][1])/2;
  const {crown,capFit,glassesFit,lensEyes,capBounds,glassesBounds}=this.gear;
  const capSeatY=Math.min(eyeLine-h*(capFit.seatAboveEyes??.22),y+h*.5),capScale=w*(capFit.width??1.14)/crown[2];
  const capTransform=[capScale,0,0,capScale,x+w/2-(crown[0]+crown[2]/2)*capScale,capSeatY-(crown[1]+crown[3])*capScale];
  const source=[lensEyes[1][0]-lensEyes[0][0],lensEyes[1][1]-lensEyes[0][1]],target=[eyes[1][0]-eyes[0][0],eyes[1][1]-eyes[0][1]];
  // The frame fits the skull; its two lenses are centered around the actual
  // fitted eyes. A narrower eye separation must not shrink the whole frame.
  const scale=Math.max(Math.hypot(...target)/Math.hypot(...source),w*(glassesFit.width??1.06)/glassesBounds[2]),angle=Math.atan2(target[1],target[0])-Math.atan2(source[1],source[0]);
  const a=Math.cos(angle)*scale,b=Math.sin(angle)*scale;
  const sourceMid=[(lensEyes[0][0]+lensEyes[1][0])/2,(lensEyes[0][1]+lensEyes[1][1])/2],targetMid=[(eyes[0][0]+eyes[1][0])/2,(eyes[0][1]+eyes[1][1])/2];
  const glassesTransform=[a,b,-b,a,targetMid[0]-a*sourceMid[0]+b*sourceMid[1],targetMid[1]-b*sourceMid[0]-a*sourceMid[1]];
  const transformedBounds=(r,t)=>{const ps=[[r[0],r[1]],[r[0]+r[2],r[1]],[r[0],r[1]+r[3]],[r[0]+r[2],r[1]+r[3]]].map(p=>point(t,p));const xs=ps.map(p=>p[0]),ys=ps.map(p=>p[1]);return [Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)];};
  const pad=VICE_HEAD_PADDING;capTransform[4]+=pad;capTransform[5]+=pad;glassesTransform[4]+=pad;glassesTransform[5]+=pad;
  const capPlate=this.factory(VICE_HEAD_SIZE,VICE_HEAD_SIZE),cc=capPlate.getContext('2d');cc.setTransform(...capTransform);cc.drawImage(this.gear.cap,0,0);
  const capPixels=cc.getImageData(0,0,VICE_HEAD_SIZE,VICE_HEAD_SIZE).data,crownCutY=new Int16Array(VICE_HEAD_SIZE);crownCutY.fill(-1);
  let first=-1,last=-1;
  for(let cx=0;cx<VICE_HEAD_SIZE;cx++)for(let cy=VICE_HEAD_SIZE-1;cy>=0;cy--)if(capPixels[(cy*VICE_HEAD_SIZE+cx)*4+3]>=64){crownCutY[cx]=cy;if(first<0)first=cx;last=cx;break;}
  if(first<0)throw Error('Vice cap fitting is outside the head canvas');
  for(let cx=0;cx<first;cx++)crownCutY[cx]=crownCutY[first];
  for(let cx=first+1;cx<VICE_HEAD_SIZE;cx++)if(crownCutY[cx]<0)crownCutY[cx]=crownCutY[Math.min(cx-1,last)];
  const result={skullBounds:[x+pad,y+pad,w,h],eyes:eyes.map(p=>p.map(n=>n+pad)),eyeLine:eyeLine+pad,capSeatY:capSeatY+pad,crownCutY,capTransform,glassesTransform,capRect:transformedBounds(capBounds,capTransform),glassesRect:transformedBounds(glassesBounds,glassesTransform),lensEyes:lensEyes.map(p=>point(glassesTransform,p))};
  this.geometryCache.set(key,result);trim(this.geometryCache,128);return result;
 }
 hairLayer(look,face,layer){
  const canvas=this.factory(VICE_HEAD_SIZE,VICE_HEAD_SIZE),c=canvas.getContext('2d'),pad=VICE_HEAD_PADDING;
  if(face.fit)c.setTransform(face.fit[0],0,0,face.fit[1],face.fit[2]+pad,face.fit[3]+pad);else c.translate(pad,pad);
  const factor=194/STYLE_C_FACE_ANCHORS[look.presentation].size[1];
  c.translate(128,200-48*factor);c.scale(2.55*factor,2.55*factor);
  if(!drawStyleCHair(c,look,{wind:0,bounce:0},0,layer,'front'))throw Error('Vice hairstyle artwork is unavailable: '+look.hair);
  return canvas;
 }
 layers(raw,{closed=false}={}){
  const look=sanitizeLook(raw);
  const geometry=this.geometry(look),facePlate=this.base.facePlate(look,closed),pad=VICE_HEAD_PADDING;
  const rawRear=this.hairLayer(look,facePlate,'rear'),rawFront=this.hairLayer(look,facePlate,'front');
  const clipped=source=>{const canvas=this.factory(VICE_HEAD_SIZE,VICE_HEAD_SIZE),c=canvas.getContext('2d');c.drawImage(source,0,0);for(let x=0;x<VICE_HEAD_SIZE;x++)c.clearRect(x,0,1,geometry.crownCutY[x]);return canvas;};
  const rear=clipped(rawRear),front=clipped(rawFront),face=this.factory(VICE_HEAD_SIZE,VICE_HEAD_SIZE);face.getContext('2d').drawImage(facePlate.image,pad,pad);
  const accessory=(image,transform)=>{const canvas=this.factory(VICE_HEAD_SIZE,VICE_HEAD_SIZE),c=canvas.getContext('2d');c.setTransform(...transform);c.drawImage(image,0,0);return canvas;};
  const cap=accessory(this.gear.cap,geometry.capTransform),glasses=accessory(this.gear.glasses,geometry.glassesTransform);
  const image=this.factory(VICE_HEAD_SIZE,VICE_HEAD_SIZE),c=image.getContext('2d');
  for(const layer of [rear,face,front,cap,glasses])c.drawImage(layer,0,0);
  const origin=facePlate.origin.map(n=>n+pad);
  const result={image,composite:image,origin,offset:[pad,pad],rawRear,rawFront,rear,front,face,cap,glasses,geometry};
  return result;
 }
 plate(raw,closed=false){
  const look=sanitizeLook(raw),key=appearanceKey(look)+'|'+closed;
  if(this.cache.has(key)){const old=this.cache.get(key);this.cache.delete(key);this.cache.set(key,old);return old;}
  const {image,origin,offset,geometry}=this.layers(look,{closed}),result={image,origin,offset,geometry};
  this.cache.set(key,result);trim(this.cache,VICE_HEAD_CACHE_LIMIT);return result;
 }
 draw(c,raw,anchor,scale,{closed=false}={}){
  if(!this.ready)return false;
  const p=this.plate(raw,closed);c.save();c.translate(anchor[0],anchor[1]);c.rotate(anchor[2]);c.scale(scale,scale);c.drawImage(p.image,-p.origin[0],-p.origin[1]);c.restore();return true;
 }
}
