import {FullBodyAnimator,validateManifest} from '../../../royale-v3-staging/kingjames/animation.mjs';
import {STEEL_ID} from '../../../royale-v3-staging/kingjames/outfit-engine.mjs';
import {sanitizeLook} from '../../appearance.mjs';
import {appearanceKey} from '../../../royale-v3-staging/costumes/face.mjs';
import {ViceHead} from './head.mjs';
import {VICE_ID} from '../definitions.mjs';

export const VICE_STATES=Object.freeze([
 'idle','start','run','stop','jump','doubleJump','fall','land','punch','kick',
 'strength','superKick','fireball','fireballAir','flightStart','hover','fly',
 'hurt','defeat','recovery','seismicSmash'
]);
export const VICE_CACHE_LIMIT=128;
const trim=cache=>{while(cache.size>VICE_CACHE_LIMIT)cache.delete(cache.keys().next().value);};
const rgb=color=>[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));

export function validateViceManifest(raw,atlas){
 const m=validateManifest(raw);
 if(m.id!==VICE_ID||m.frames.length!==48||m.cell.length!==2||m.cell[0]!==256||m.cell[1]!==256||m.foot.length!==2||m.foot[0]!==128||m.foot[1]!==230||m.worldScale!==.62||m.head.mode!=='vice-cap'||m.head.scale!==.62)
  throw Error('Invalid Vice Costume registration');
 if(!(m.strideDistance>0)||m.flightPose!=='authored-horizontal')throw Error('Missing Vice movement registration');
 if(!m.headgear?.cap||!m.headgear?.glasses||!m.lettering?.atlas||m.lettering.text!=='Vice')throw Error('Missing Vice cap, sunglasses or lettering');
 for(const state of VICE_STATES){
  const a=m.animations[state];
  if(!a||!Array.isArray(a.frames)||a.frames.length<2||!(a.duration>0)||a.frames.some(i=>!Number.isInteger(i)||!m.frames[i]))throw Error('Missing Vice animation: '+state);
 }
 for(const [index,f]of m.frames.entries()){
  const [x,y,w,h]=f.rect;
  if(x<0||y<0||atlas&&(x+w>atlas.width||y+h>atlas.height))throw Error('Vice frame exceeds its atlas: '+index);
  if(f.head[0]<0||f.head[0]>256||f.head[1]<0||f.head[1]>256||!Array.isArray(f.hand)||f.hand.length!==2||f.hand.some(n=>!Number.isFinite(n)||n<0||n>256))throw Error('Vice attachment exceeds its frame: '+index);
  if(!Array.isArray(f.chest)||f.chest.length!==5||!f.chest.every(Number.isFinite)||f.chest[0]<0||f.chest[0]>256||f.chest[1]<0||f.chest[1]>256||f.chest[2]<=0||f.chest[3]<=0||f.chest[2]>256||f.chest[3]>256)throw Error('Invalid Vice shirt registration: '+index);
 }
 return m;
}

function visibleBounds(image,factory){
 const c=factory(image.width,image.height).getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);
 const pixels=c.getImageData(0,0,image.width,image.height).data;let x0=image.width,y0=image.height,x1=-1,y1=-1;
 for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++)if(pixels[(y*image.width+x)*4+3]>16){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 if(x1<x0)throw Error('Vice lettering artwork is empty');return [x0,y0,x1-x0+1,y1-y0+1];
}

// Add the approved Vice frames and headwear to the existing costume engine.
// Other costumes and Steel Body retain their normal rendering paths.
export function withViceCostume(BaseCostumeEngine){return class ViceCostumeEngine extends BaseCostumeEngine{
 constructor(options={}){super(options);this.viceHead=new ViceHead({canvasFactory:this.factory,imageLoader:this.imageLoader});this.viceBodies=new Map();}
 async preload(id){
  if(id!==VICE_ID)return super.preload(id);
  if(this.outfits.has(id))return true;if(this.pending.has(id))return this.pending.get(id);
  // Defer the body so synchronous loader failures also clear a registered task.
  const task=Promise.resolve().then(async()=>{try{
   const url=new URL('./assets/manifest.json',import.meta.url),manifest=validateViceManifest(await this.jsonLoader(url));
   const [atlas,lettering,head,steel]=await Promise.all([
    this.imageLoader(new URL(manifest.atlas,url)),this.imageLoader(new URL(manifest.lettering.atlas,url)),
    this.viceHead.preload(manifest.headgear,url),this.steel.preload(STEEL_ID)
   ]);
   if(!head||!steel)throw Error(this.viceHead.error||this.steel.error||'Vice transformation artwork unavailable');
   validateViceManifest(manifest,atlas);
   this.outfits.set(id,{vice:true,manifest,atlas,lettering,letteringRect:visibleBounds(lettering,this.factory),templates:new Map()});
   this.error=null;return true;
  }catch(error){this.error=error.message;return false;}finally{this.pending.delete(id);}});
  this.pending.set(id,task);return task;
 }
 viceTemplate(index){
  const loaded=this.outfits.get(VICE_ID);if(!loaded?.vice)throw Error('Vice Costume artwork has not loaded');
  if(loaded.templates.has(index))return loaded.templates.get(index);
  const frame=loaded.manifest.frames[index];if(!frame)throw Error('Invalid Vice frame: '+index);
  const [w,h]=loaded.manifest.cell,c=this.factory(w,h).getContext('2d',{willReadFrequently:true});c.drawImage(loaded.atlas,...frame.rect,0,0,w,h);
  const pixels=c.getImageData(0,0,w,h),skin=[],shade=[],shirtMask=this.factory(w,h),sc=shirtMask.getContext('2d'),mask=sc.createImageData(w,h),candidates=new Uint8Array(w*h),skinMask=new Uint8Array(w*h),queue=new Uint32Array(w*h);let count=0;
  for(let p=0;p<w*h;p++){
   const i=p*4,r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2],alpha=pixels.data[i+3];if(alpha<8)continue;
   // Only cyan authored skin is recolored. Pink printing is a separate image,
   // and neither the white tank nor black fabric participates in this mask.
   const minimum=Math.min(g,b),cyan=minimum>35&&minimum>r+15&&r<minimum*.9&&Math.abs(g-b)<Math.max(g,b)*.4;
   if(cyan)candidates[p]=1;
   if(cyan&&minimum>60&&r<minimum*.65&&minimum>r+20){skinMask[p]=1;queue[count++]=p;}
   const low=Math.min(r,g,b),high=Math.max(r,g,b);
   if(!cyan&&low>75&&high-low<Math.max(18,high*.12)){mask.data[i]=mask.data[i+1]=mask.data[i+2]=255;mask.data[i+3]=alpha;}
  }
  // Cyan lighting can include pale highlights and darker shadow edges. Grow
  // from actual cyan skin rather than treating cool gray shorts/shoes as skin.
  for(let q=0;q<count;q++){
   const p=queue[q],x=p%w,y=Math.floor(p/w);
   for(const next of[x?p-1:-1,x<w-1?p+1:-1,y?p-w:-1,y<h-1?p+w:-1])if(next>=0&&candidates[next]&&!skinMask[next]){skinMask[next]=1;queue[count++]=next;}
  }
  for(let n=0;n<count;n++){const i=queue[n]*4;skin.push(i);shade.push((pixels.data[i+1]+pixels.data[i+2])/510);}
  sc.putImageData(mask,0,0);
  const result={pixels,skin:Uint32Array.from(skin),shade:Float32Array.from(shade),shirtMask,w,h};loaded.templates.set(index,result);return result;
 }
 viceBody(index,raw){
  const look=sanitizeLook(raw),key=index+'|'+look.skin;
  if(this.viceBodies.has(key)){const old=this.viceBodies.get(key);this.viceBodies.delete(key);this.viceBodies.set(key,old);return old;}
  const template=this.viceTemplate(index),canvas=this.factory(template.w,template.h),c=canvas.getContext('2d'),pixels=c.createImageData(template.w,template.h),color=rgb(look.skin);
  pixels.data.set(template.pixels.data);
  for(let n=0;n<template.skin.length;n++)for(let k=0;k<3;k++)pixels.data[template.skin[n]+k]=Math.min(255,color[k]*(.48+.57*template.shade[n]));
  c.putImageData(pixels,0,0);this.viceBodies.set(key,canvas);trim(this.viceBodies);return canvas;
 }
 letteringLayer(index,direction=1){
  const loaded=this.outfits.get(VICE_ID);if(!loaded?.vice)throw Error('Vice Costume artwork has not loaded');
  const m=loaded.manifest,frame=m.frames[index];if(!frame)throw Error('Invalid Vice frame: '+index);
  const canvas=this.factory(...m.cell),c=canvas.getContext('2d'),[x,y,w,h,angle]=frame.chest,[,,iw,ih]=loaded.letteringRect,s=Math.min(w/iw,h/ih);
  c.save();c.translate(x,y);c.rotate(angle);if(direction<0)c.scale(-1,1);
  c.drawImage(loaded.lettering,...loaded.letteringRect,-iw*s/2,-ih*s/2,iw*s,ih*s);c.restore();
  // Sample the original white fabric, before skin tint, so a crossed arm or
  // black shorts always occlude the lettering. Reverse letters only, never art.
  c.globalCompositeOperation='destination-in';c.drawImage(this.viceTemplate(index).shirtMask,0,0);c.globalCompositeOperation='source-over';return canvas;
 }
 compose(id,index,raw,closed=false,direction=1,...rest){
  if(id!==VICE_ID)return super.compose(id,index,raw,closed,direction,...rest);
  const loaded=this.outfits.get(id);if(!loaded?.vice)throw Error('Vice Costume artwork has not loaded');
  const look=sanitizeLook(raw),key=id+'|'+index+'|'+appearanceKey(look)+'|'+closed+'|'+(direction<0?-1:1);
  if(this.composites.has(key)){const old=this.composites.get(key);this.composites.delete(key);this.composites.set(key,old);return old;}
  const m=loaded.manifest,f=m.frames[index],canvas=this.factory(...m.cell),c=canvas.getContext('2d');
  c.drawImage(this.viceBody(index,look),0,0);c.drawImage(this.letteringLayer(index,direction),0,0);
  if(!this.viceHead.draw(c,look,f.head,m.head.scale,{closed}))throw Error(this.viceHead.error||'Vice headwear has not loaded');
  this.composites.set(key,canvas);trim(this.composites);return canvas;
 }
 draw(c,x,y,raw,hero,time,{id,owner=hero,scale=1}={}){
  if(id!==VICE_ID||hero.steel)return super.draw(c,x,y,raw,hero,time,{id,owner,scale});
  const loaded=this.outfits.get(id);if(!loaded?.vice||!this.viceHead.ready)return false;
  const m=loaded.manifest;let animator=this.states.get(owner);
  if(!animator||animator.manifest!==m){animator=new FullBodyAnimator(m);this.states.set(owner,animator);}
  const sample=animator.sample(hero,time),frame=sample.frame;
  const closed=sample.state==='defeat'||sample.state==='idle'&&time%3.9>3.73;
  const picture=this.compose(id,sample.frameIndex,raw,closed,sample.direction),s=m.worldScale*scale;
  c.save();c.translate(x,y);c.scale(sample.direction*s,s);c.translate(-m.foot[0],-m.foot[1]);
  if(hero.invulnerable>0&&Math.floor(time*14)%2===0)c.globalAlpha*=.78;
  c.drawImage(picture,0,0);c.restore();
  const world=p=>[(p[0]-m.foot[0])*m.worldScale,(p[1]-m.foot[1])*m.worldScale];
  const neck=world(frame.head),hand=world(frame.hand),elbow=[(neck[0]+hand[0])/2,(neck[1]+hand[1])/2+8];
  this.lastFrame={outfit:id,state:sample.state,frame:sample.frameIndex,direction:sample.direction,hairVisible:true,hairContained:false,hairCrownCovered:true,head:[...frame.head],foot:[...m.foot]};
  return {artSource:'full-body-costume',clip:sample.state,head:neck,faceCenter:neck,shoulder:neck,hip:[0,-35],arms:[[neck,elbow,hand],[neck,elbow,hand]],legs:[],opacity:1};
 }
};}
