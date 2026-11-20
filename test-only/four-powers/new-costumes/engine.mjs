import {CostumeEngine as ReleasedCostumeEngine} from '../../../royale/fashion/engine.mjs?four-base=1';
import {validateManifest} from '../../../royale-v3-staging/kingjames/animation.mjs';
import {STEEL_ID} from '../../../royale-v3-staging/kingjames/outfit-engine.mjs';
import {sanitizeLook} from '../../../royale/appearance.mjs';
import {appearanceKey} from '../../../royale-v3-staging/costumes/face.mjs';
import {NEW_OUTFITS,isNewCostumeId} from './definitions.mjs';
import {NEW_COSTUMES_TEST_ENABLED} from './scope.mjs';
import {CostumeAnimator,NEW_COSTUME_STATES} from './animation.mjs';
import {CostumeHatHead} from './head.mjs';

export const NEW_COSTUME_CACHE_LIMIT=128;
export const WOLF_GAIT_STATES=Object.freeze(['walk','walkStart','walkStop','runStart','rise']);
const definitions=new Map(NEW_OUTFITS.map(outfit=>[outfit.id,outfit]));
const trim=cache=>{while(cache.size>NEW_COSTUME_CACHE_LIMIT)cache.delete(cache.keys().next().value);};
const rgb=color=>[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
const insidePoint=(p,length)=>Array.isArray(p)&&p.length===length&&p.every(Number.isFinite)&&p[0]>=0&&p[0]<=256&&p[1]>=0&&p[1]<=256;

export function validateNewCostumeManifest(raw,atlas){
 const m=validateManifest(raw),outfit=definitions.get(m.id);
 if(!outfit||m.cell.length!==2||m.cell[0]!==256||m.cell[1]!==256||m.foot.length!==2||m.foot[0]!==128||m.foot[1]!==230||m.worldScale!==.62)
  throw Error('Invalid reserved costume registration');
 if(!(m.strideDistance>0)||!Number.isFinite(m.strideDistance))throw Error('Missing costume movement registration');
 if(outfit.fullTransform){
  if(m.fullTransform!==true||m.head.mode!=='full-transform'||m.head.scale!==0)throw Error('Full transformation must retain its authored head');
 }else if(m.head.mode!=='costume-hat'||m.head.scale!==.62||!m.headgear?.hat||m.materialKeys?.skin!=='#00ffff'){
  throw Error('Missing customized costume head or skin registration');
 }
 const required=m.id==='wolf-transformation'?[...NEW_COSTUME_STATES,...WOLF_GAIT_STATES]:NEW_COSTUME_STATES;
 for(const state of required){
  const clip=m.animations[state];
  if(!clip||!Array.isArray(clip.frames)||clip.frames.length<2||!(clip.duration>0)||!Number.isFinite(clip.duration)||clip.frames.some(index=>!Number.isInteger(index)||!m.frames[index]))
   throw Error('Missing costume animation: '+state);
 }
 if(m.id==='wolf-transformation'&&(!(m.walkStrideDistance>0)||!Number.isFinite(m.walkStrideDistance)))throw Error('Missing wolf walking stride');
 for(const [index,frame]of m.frames.entries()){
  const [x,y,w,h]=frame.rect;
  if(x<0||y<0||atlas&&(x+w>atlas.width||y+h>atlas.height))throw Error('Costume frame exceeds its atlas: '+index);
  if(!insidePoint(frame.head,3)||!insidePoint(frame.hand,2))throw Error('Costume attachment exceeds its frame: '+index);
 }
 for(const key of ['floatHeight','floatAmplitude','floatPeriod'])if(m[key]!==undefined&&(!Number.isFinite(m[key])||m[key]<0||m[key]>30))throw Error('Invalid ghost floating registration');
 if(m.floatPeriod===0)throw Error('Ghost floating period must be positive');
 return m;
}

// Keep the exact authored silhouette and alpha, including the ghost's translucent
// edges, while converting its material to silver. Transformations never acquire
// a human steel head/body during the temporary Steel Body ability.
function metalPlate(factory,source){
 const canvas=factory(source.width,source.height),c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(source,0,0);
 const pixels=c.getImageData(0,0,canvas.width,canvas.height),d=pixels.data;
 for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
  const i=(y*canvas.width+x)*4;if(!d[i+3])continue;
  const l=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2],shine=22*Math.max(0,1-Math.abs((y-x*.32)/canvas.height-.38)*9);
  const value=l<65?l*.72:Math.min(255,55+l*.65+shine);
  d[i]=Math.min(255,value*.9);d[i+1]=Math.min(255,value*.97);d[i+2]=Math.min(255,value+9);
 }
 c.putImageData(pixels,0,0);return canvas;
}

export class CostumeEngine extends ReleasedCostumeEngine{
 constructor(options={}){super(options);this.newCostumeBodies=new Map();this.newCostumeComposites=new Map();}
 async preload(id){
  if(!isNewCostumeId(id))return super.preload(id);
  if(!NEW_COSTUMES_TEST_ENABLED)return false;
  if(this.outfits.has(id))return true;if(this.pending.has(id))return this.pending.get(id);
  const task=Promise.resolve().then(async()=>{try{
   const url=new URL('./assets/'+id+'/manifest.json',import.meta.url),manifest=validateNewCostumeManifest(await this.jsonLoader(url));
   if(manifest.id!==id)throw Error('Reserved costume manifest ID does not match its directory');
   const fullTransform=definitions.get(id).fullTransform;
   const hat=fullTransform?null:new CostumeHatHead({canvasFactory:this.factory,imageLoader:this.imageLoader});
   const [atlas,headReady,steelReady]=await Promise.all([
    this.imageLoader(new URL(manifest.atlas,url)),hat?hat.preload(manifest.headgear,url):true,
    fullTransform?true:this.steel.preload(STEEL_ID)
   ]);
   if(!headReady||!steelReady)throw Error(hat?.error||this.steel.error||'Costume head artwork unavailable');
   validateNewCostumeManifest(manifest,atlas);
   this.outfits.set(id,{newCostume:true,fullTransform,manifest,atlas,hat,templates:new Map()});this.error=null;return true;
  }catch(error){this.error=error.message;return false;}finally{this.pending.delete(id);}});
  this.pending.set(id,task);return task;
 }
 newCostumeTemplate(id,index){
  const loaded=this.outfits.get(id);if(!loaded?.newCostume)throw Error('Reserved costume artwork has not loaded');
  if(loaded.templates.has(index))return loaded.templates.get(index);
  const frame=loaded.manifest.frames[index];if(!frame)throw Error('Invalid reserved costume frame: '+index);
  const [w,h]=loaded.manifest.cell,canvas=this.factory(w,h),c=canvas.getContext('2d',{willReadFrequently:true});
  c.drawImage(loaded.atlas,...frame.rect,0,0,w,h);
  const pixels=c.getImageData(0,0,w,h),skin=[],shade=[];
  if(!loaded.fullTransform){
   const d=pixels.data,candidates=new Uint8Array(w*h),selected=new Uint8Array(w*h),queue=new Uint32Array(w*h);let count=0;
   for(let p=0;p<w*h;p++){
    const i=p*4,r=d[i],g=d[i+1],b=d[i+2],minimum=Math.min(g,b),cyanDelta=Math.abs(g-b)/Math.max(1,g,b);if(d[i+3]<8)continue;
    // The mail shirt is light blue, so the general Vice cyan test is too broad:
    // it can mistake cool blue sleeve shadows for skin. Saturated cyan keys
    // accept their blue shadow edges; pale highlights require nearly equal
    // green/blue channels and a connection to a strongly saturated skin seed.
    if(minimum>35&&minimum>r+15&&(r<minimum*.5&&cyanDelta<.4||r<minimum*.82&&cyanDelta<.07))candidates[p]=1;
    if(candidates[p]&&minimum>60&&r<minimum*.35&&cyanDelta<.15){selected[p]=1;queue[count++]=p;}
   }
   // Broader cyan highlights are included only when attached to an authored
   // cyan skin key. Navy uniform cloth and black gloves retain their colors.
   for(let q=0;q<count;q++){
    const p=queue[q],x=p%w,y=Math.floor(p/w);
    for(const next of[x?p-1:-1,x<w-1?p+1:-1,y?p-w:-1,y<h-1?p+w:-1])if(next>=0&&candidates[next]&&!selected[next]){selected[next]=1;queue[count++]=next;}
   }
   for(let n=0;n<count;n++){const i=queue[n]*4;skin.push(i);shade.push((d[i+1]+d[i+2])/510);}
  }
  const template={pixels,w,h,skin:Uint32Array.from(skin),shade:Float32Array.from(shade)};loaded.templates.set(index,template);return template;
 }
 newCostumeBody(id,index,raw){
  const loaded=this.outfits.get(id);if(!loaded?.newCostume)throw Error('Reserved costume artwork has not loaded');
  const look=loaded.fullTransform?null:sanitizeLook(raw),key=id+'|'+index+'|'+(look?.skin||'authored');
  if(this.newCostumeBodies.has(key)){const old=this.newCostumeBodies.get(key);this.newCostumeBodies.delete(key);this.newCostumeBodies.set(key,old);return old;}
  const template=this.newCostumeTemplate(id,index),canvas=this.factory(template.w,template.h),c=canvas.getContext('2d'),pixels=c.createImageData(template.w,template.h);
  pixels.data.set(template.pixels.data);
  if(look){const color=rgb(look.skin);for(let n=0;n<template.skin.length;n++)for(let k=0;k<3;k++)pixels.data[template.skin[n]+k]=Math.min(255,color[k]*(.48+.57*template.shade[n]));}
  c.putImageData(pixels,0,0);this.newCostumeBodies.set(key,canvas);trim(this.newCostumeBodies);return canvas;
 }
 compose(id,index,raw,closed=false,direction=1,options=null){
  if(!isNewCostumeId(id))return super.compose(id,index,raw,closed,direction,options);
  const loaded=this.outfits.get(id);if(!loaded?.newCostume)throw Error('Reserved costume artwork has not loaded');
  const look=loaded.fullTransform?null:sanitizeLook(raw),steel=loaded.fullTransform&&!!options?.steel;
  const key=id+'|'+index+'|'+(look?appearanceKey(look)+'|'+closed:'authored')+'|'+steel;
  if(this.newCostumeComposites.has(key)){const old=this.newCostumeComposites.get(key);this.newCostumeComposites.delete(key);this.newCostumeComposites.set(key,old);return old;}
  const m=loaded.manifest,frame=m.frames[index];if(!frame)throw Error('Invalid reserved costume frame: '+index);
  let canvas=this.factory(...m.cell);const c=canvas.getContext('2d');c.drawImage(this.newCostumeBody(id,index,look),0,0);
  if(look&&!loaded.hat.draw(c,look,frame.head,m.head.scale,{closed}))throw Error(loaded.hat.error||'Costume headwear has not loaded');
  if(steel)canvas=metalPlate(this.factory,canvas);
  this.newCostumeComposites.set(key,canvas);trim(this.newCostumeComposites);return canvas;
 }
 draw(c,x,y,raw,hero,time,{id,owner=hero,scale=1}={}){
  if(!isNewCostumeId(id))return super.draw(c,x,y,raw,hero,time,{id,owner,scale});
  if(!NEW_COSTUMES_TEST_ENABLED)return false;
  const loaded=this.outfits.get(id);if(!loaded?.newCostume)return false;
  if(hero.steel&&!loaded.fullTransform)return super.draw(c,x,y,raw,hero,time,{id,owner,scale});
  const m=loaded.manifest;let animator=this.states.get(owner);
  if(!animator||animator.manifest!==m){animator=new CostumeAnimator(m);this.states.set(owner,animator);}
  const sample=animator.sample(hero,time),frame=sample.frame;
  const closed=sample.state==='defeat'||sample.state==='idle'&&time%3.9>3.73;
  const floatOffset=id==='ghost-transformation'?-(m.floatHeight??5)-Math.sin(time*Math.PI*2/(m.floatPeriod??1.8))*(m.floatAmplitude??2):0;
  const picture=this.compose(id,sample.frameIndex,raw,closed,sample.direction,{steel:hero.steel}),s=m.worldScale*scale;
  c.save();c.translate(x,y);c.scale(sample.direction*s,s);c.translate(-m.foot[0],-m.foot[1]+floatOffset);
  if(hero.invulnerable>0&&Math.floor(time*14)%2===0)c.globalAlpha*=.78;
  c.drawImage(picture,0,0);c.restore();
  const world=p=>[(p[0]-m.foot[0])*m.worldScale,(p[1]-m.foot[1]+floatOffset)*m.worldScale];
  const neck=world(frame.head),hand=world(frame.hand),elbow=[(neck[0]+hand[0])/2,(neck[1]+hand[1])/2+8];
  this.lastFrame={outfit:id,state:sample.state,frame:sample.frameIndex,direction:sample.direction,
   fullTransform:loaded.fullTransform,hairVisible:!loaded.fullTransform,hairContained:false,hairCrownCovered:!loaded.fullTransform,
   steel:!!hero.steel,head:[...frame.head],hand:[...frame.hand],foot:[...m.foot],floatOffset};
  return {artSource:'full-body-costume',clip:sample.state,head:neck,faceCenter:neck,shoulder:neck,hip:[0,-35+floatOffset*m.worldScale],arms:[[neck,elbow,hand],[neck,elbow,hand]],legs:[],opacity:1};
 }
}
export const costumeSprites=new CostumeEngine();
