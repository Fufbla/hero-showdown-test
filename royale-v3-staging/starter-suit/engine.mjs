// Universal starter clothing, drawn from complete authored frames. This module
// reads appearance only: no accounts, storage, equipment, or save mutations.
import {sanitizeLook} from '../../royale/appearance.mjs';
import {emblem,curve,tone} from '../../royale/style-c-paint.mjs';
import {UniversalHead} from '../kingjames/head.mjs';
import {FullBodyAnimator,validateManifest} from '../kingjames/animation.mjs';
import {rearHead} from './rear-head.mjs';

export const STARTER_SUIT_ID='starter-superhero';
export const STARTER_CACHE_LIMIT=96;
const manifestURL=new URL('./assets/manifest.json',import.meta.url);
const canvas=(w,h)=>typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):Object.assign(document.createElement('canvas'),{width:w,height:h});
const image=url=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Starter suit artwork unavailable'));im.src=url.href;});
const rgb=color=>[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
const paletteKey=l=>[l.suit,l.trim,l.emblem,l.emblemColor,l.cape,l.capeColor].join('|');

// Keep only the connected costume and its antialiased edge. The source images
// are retained verbatim; tiny isolated generation specks never become clothing.
function costumeMask(data,w,h){
 const n=w*h,labels=new Int32Array(n),queue=new Uint32Array(n);let id=0,best=0,size=0;
 for(let p=0;p<n;p++){
  if(labels[p]||data[p*4+3]<128)continue;
  id++;let start=0,end=1;queue[0]=p;labels[p]=id;
  while(start<end){const at=queue[start++],x=at%w,y=Math.floor(at/w);
   for(const next of [x?at-1:-1,x<w-1?at+1:-1,y?at-w:-1,y<h-1?at+w:-1]){
    if(next>=0&&!labels[next]&&data[next*4+3]>=128){labels[next]=id;queue[end++]=next;}
   }
  }
  if(end>size){best=id;size=end;}
 }
 const mask=new Uint8Array(n);
 for(let p=0;p<n;p++)if(labels[p]===best){mask[p]=1;const x=p%w,y=Math.floor(p/w);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(x+dx>=0&&x+dx<w&&y+dy>=0&&y+dy<h)mask[p+dy*w+dx]=1;
 }
 return mask;
}

function recolor(data,primary,secondary){
 for(let i=0;i<data.length;i+=4){
  if(!data[i+3])continue;
  const r=data[i],g=data[i+1],b=data[i+2];
  const blue=b>r+12&&b>g+4,gold=r>b+14&&g>b+4;
  if(!blue&&!gold)continue;
  const target=blue?primary:secondary;
  const shade=(r*.2126+g*.7152+b*.0722)/(blue?83:190);
  for(let k=0;k<3;k++)data[i+k]=Math.round(shade<=1?target[k]*shade:target[k]+(255-target[k])*Math.min(.58,(shade-1)*.65));
 }
}

// Each cape contour is baked with its complete body frame. No separately
// simulated cape or independent limb rig is introduced.
function paintCape(c,f,index,color){
 const [x,y]=f.head;
 let trail=0,wave=0;
 if(index===4)trail=.3;else if(index===5)trail=.7;else if(index===6)trail=.35;
 else if(index>=8&&index<=15){trail=1;wave=Math.sin((index-8)/8*Math.PI*2)*8;}
 else if(index>=16&&index<=27){trail=.65;wave=(index%4-1.5)*4;}
 else if(index>=28&&index<=30)trail=(31-index)*.12;
 else if(index>=48)trail=.22;
 const left=Math.max(3,x-58-trail*44),bottom=Math.min(222,y+103-trail*36+wave),right=x+47-trail*49;
 const points=[[x-24,y+4],[x-30-trail*24,y+25,left+5,bottom-24,left,bottom],
  [left+18,bottom+5,right-12,bottom-4,right,bottom-3],[x+16,y+28,x+12,y+4],[x-24,y+4]];
 curve(c,points,color,'#141b29',2.5);
 curve(c,[[x-22,y+7],[x-29-trail*28,y+45,left+8,bottom-17,left+8,bottom-2],
  [left+23,bottom+1,left+31,bottom-1,left+36,bottom-2],[x-9,y+35,x-8,y+7]],tone(color,.72),null);
}

export class StarterSuitEngine{
 constructor({imageLoader=image,jsonLoader=async url=>{const r=await fetch(url);if(!r.ok)throw Error('Starter suit manifest unavailable');return r.json();},canvasFactory=canvas,head}={}){
  this.factory=canvasFactory;this.imageLoader=imageLoader;this.jsonLoader=jsonLoader;
  this.head=head||new UniversalHead({imageLoader,canvasFactory});this.ready=false;this.pending=null;
  this.states=new WeakMap();this.templates=new Map();this.cache=new Map();this.lastFrame=null;this.lastPaint=null;this.error=null;
 }
 async preload(){
  if(this.ready)return true;if(this.pending)return this.pending;
  this.pending=(async()=>{try{
   const m=validateManifest(await this.jsonLoader(manifestURL));
   const entries=Object.entries({default:m.atlas,...m.atlases});
   const loaded=await Promise.all(entries.map(async([key,path])=>[key,await this.imageLoader(new URL(path,manifestURL))]));
   await this.head.preload();this.images=Object.fromEntries(loaded);
   for(const f of m.frames){const im=this.images[f.atlas||'default'],r=f.sourceRect;
    if(!r||r.some(n=>!Number.isFinite(n))||r[0]<0||r[1]<0||r[2]<=0||r[3]<=0||r[0]+r[2]>im.width||r[1]+r[3]>im.height)throw Error('Starter suit frame exceeds its atlas');
   }
   this.manifest=m;this.ready=true;this.error=null;return true;
  }catch(e){this.error=e.message;this.pending=null;return false;}})();return this.pending;
 }
 template(index){
  if(this.templates.has(index))return this.templates.get(index);
  const f=this.manifest.frames[index],[,,w,h]=f.sourceRect,plate=this.factory(w,h),c=plate.getContext('2d',{willReadFrequently:true});
  c.drawImage(this.images[f.atlas||'default'],...f.sourceRect,0,0,w,h);
  const pixels=c.getImageData(0,0,w,h),keep=costumeMask(pixels.data,w,h);
  for(let p=0;p<keep.length;p++)if(!keep[p]||pixels.data[p*4+3]<32)pixels.data[p*4+3]=0;
  const value={pixels,w,h};this.templates.set(index,value);return value;
 }
 frame(index,raw,{back=false}={}){
  const look=sanitizeLook(raw),key=index+'|'+paletteKey(look)+'|'+back;
  if(this.cache.has(key)){const result=this.cache.get(key);this.cache.delete(key);this.cache.set(key,result);return result;}
  const m=this.manifest,f=m.frames[index],t=this.template(index),body=this.factory(t.w,t.h),bc=body.getContext('2d');
  const pixels=bc.createImageData(t.w,t.h);pixels.data.set(t.pixels.data);recolor(pixels.data,rgb(look.suit),rgb(look.trim));bc.putImageData(pixels,0,0);
  const plate=this.factory(...m.cell),c=plate.getContext('2d');
  if(look.cape&&!back)paintCape(c,f,index,look.capeColor);
  c.drawImage(body,...f.paintRect);
  if(look.cape&&back)paintCape(c,f,index,look.capeColor);
  if(!back){
   // Restrict the emblem to primary-colored chest fabric, preserving gloves
   // crossing the torso during punches, casts and recovery poses.
   const mark=this.factory(...m.cell),mc=mark.getContext('2d');
   mc.save();mc.translate(f.chest[0],f.chest[1]);mc.rotate(f.chest[2]);mc.scale(.94,1);emblem(mc,0,0,look.emblem,look.emblemColor,1.65);mc.restore();
   const mask=this.factory(t.w,t.h),maskc=mask.getContext('2d'),mp=maskc.createImageData(t.w,t.h);
   for(let i=0;i<t.pixels.data.length;i+=4){const d=t.pixels.data;mp.data[i+3]=d[i+2]>d[i]+12&&d[i+2]>d[i+1]+4?d[i+3]:0;}
   maskc.putImageData(mp,0,0);mc.globalCompositeOperation='destination-in';mc.drawImage(mask,...f.paintRect);c.drawImage(mark,0,0);
  }
  this.cache.set(key,plate);while(this.cache.size>STARTER_CACHE_LIMIT)this.cache.delete(this.cache.keys().next().value);return plate;
 }
 draw(c,x,y,raw,hero,time,{owner=hero,scale=1,view='game'}={}){
  if(!this.ready)return false;const look=sanitizeLook(raw),m=this.manifest;
  let animator=this.states.get(owner);if(!animator){animator=new FullBodyAnimator(m);this.states.set(owner,animator);}
  const sample=animator.sample(hero,time),f=sample.frame;
  const paint={id:STARTER_SUIT_ID,frame:sample.frameIndex,direction:sample.direction,look,view};
  this.paint(c,x,y,paint,{scale,closed:sample.state==='defeat'||sample.state==='idle'&&time%3.9>3.73,alpha:hero.invulnerable>0&&Math.floor(time*14)%2===0?.78:1});
  const toWorld=p=>[(p[0]-m.foot[0])*m.worldScale,(p[1]-m.foot[1])*m.worldScale];
  const neck=toWorld(f.head),hand=toWorld(f.hand),elbow=[(neck[0]+hand[0])*.5,(neck[1]+hand[1])*.5+8];
  this.lastFrame={outfit:STARTER_SUIT_ID,state:sample.state,frame:sample.frameIndex,direction:sample.direction,head:[...f.head],foot:[...m.foot]};this.lastPaint=paint;
  return {artSource:'full-body-atlas',clip:sample.state,head:neck,faceCenter:neck,shoulder:neck,hip:[0,-35],arms:[[neck,elbow,hand],[neck,elbow,hand]],legs:[],opacity:1};
 }
 paint(c,x,y,paint,{scale=1,closed=false,alpha=1}={}){
  const m=this.manifest,f=m.frames[paint.frame];if(!f)return;
  c.save();c.translate(x,y);c.scale(paint.direction*m.worldScale*scale,m.worldScale*scale);c.translate(-m.foot[0],-m.foot[1]);c.globalAlpha*=alpha;
  c.drawImage(this.frame(paint.frame,paint.look,{back:paint.view==='back'}),0,0);
  if(paint.view==='back'){
   const p=rearHead(this.head,paint.look,this.factory);c.save();c.translate(f.head[0],f.head[1]);c.rotate(f.head[2]);c.scale(m.head.scale,m.head.scale);c.drawImage(p.image,-p.origin[0],-p.origin[1]);c.restore();
  }else this.head.draw(c,paint.look,f.head,m.head.scale,{closed});
  c.restore();
 }
 drawEcho(c,x,y,paint){if(this.ready&&paint)this.paint(c,x,y,paint);}
 status(){return {ready:this.ready,error:this.error,frames:this.manifest?.frames.length||0,cacheEntries:this.cache.size,cacheLimit:STARTER_CACHE_LIMIT,lastFrame:this.lastFrame};}
}

export const starterSuit=new StarterSuitEngine();
