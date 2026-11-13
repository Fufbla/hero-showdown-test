import {FullBodyAnimator,validateManifest} from './animation.mjs';
import {UniversalHead} from './head.mjs';
import {selectedOutfit,OUTFIT_ID} from './selection.mjs';
import {APPROVED_OUTFITS} from './outfit-catalog.mjs';
export const STEEL_ID='steel-universal';
export const OUTFITS=Object.freeze({[OUTFIT_ID]:new URL('./outfits/kingjames-original/manifest.json?v=basic-attacks-1',import.meta.url),[STEEL_ID]:new URL('./transforms/steel/manifest.json',import.meta.url),...Object.fromEntries(APPROVED_OUTFITS.map(({id})=>[id,new URL('./outfits/'+id+'/manifest.json',import.meta.url)]))});
const browserImage=url=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Outfit atlas unavailable'));im.src=url.href;});
export class OutfitEngine{
 constructor({imageLoader=browserImage,jsonLoader=async url=>{const r=await fetch(url);if(!r.ok)throw Error('Outfit manifest unavailable');return r.json();},canvasFactory}={}){
  this.imageLoader=imageLoader;this.jsonLoader=jsonLoader;this.head=new UniversalHead({imageLoader,canvasFactory});
  this.outfits=new Map();this.states=new WeakMap();this.enabled=false;this.lastFrame=null;this.error=null;this.outfitID=OUTFIT_ID;this.selectionRequest=0;
 }
 async preload(id=OUTFIT_ID,source=OUTFITS[id]){
  try{
   if(this.outfits.has(id))return true;
   const url=source;if(!url)throw Error('Unknown outfit');
   const manifest=validateManifest(await this.jsonLoader(url));
   const [atlas]=await Promise.all([this.imageLoader(new URL(manifest.atlas,url)),this.head.preload()]);
   const atlases={default:atlas};
   await Promise.all(Object.entries(manifest.atlases||{}).map(async([key,file])=>{atlases[key]=await this.imageLoader(new URL(file,url));}));
   for(const f of manifest.frames){const image=atlases[f.atlas||'default'];
    if(!image||f.rect[0]<0||f.rect[1]<0||f.rect[0]+f.rect[2]>(image.naturalWidth||image.width)||f.rect[1]+f.rect[3]>(image.naturalHeight||image.height))throw Error('Outfit atlas dimensions do not match manifest');
   }
   this.outfits.set(id,{manifest,atlas,atlases});this.error=null;return true;
  }catch(e){this.error=e.message;return false;}
 }
 async choose(id){
  if(id!==OUTFIT_ID&&!APPROVED_OUTFITS.some(o=>o.id===id))return false;
  const request=++this.selectionRequest;
  if(!await this.preload(id)||request!==this.selectionRequest)return false;
  this.outfitID=id;this.enabled=true;
  // Keep only the current trial atlas in addition to Original and Steel.
  for(const key of this.outfits.keys())if(key!==id&&key!==OUTFIT_ID&&key!==STEEL_ID)this.outfits.delete(key);
  return true;
 }
 selected(look){return selectedOutfit(this.enabled,look)?this.outfitID:null;}
 draw(c,x,y,look,hero,time,{owner=hero,scale=1}={}){
  const selected=this.selected(look),id=selected&&hero.steel?STEEL_ID:selected,loaded=this.outfits.get(id);
  if(!loaded||!this.head.ready)return false;
  const {manifest:m,atlas}=loaded;
  let animator=this.states.get(owner);if(!animator||animator.manifest!==m){animator=new FullBodyAnimator(m);this.states.set(owner,animator);}
  const sample=animator.sample(hero,time),f=sample.frame,s=m.worldScale*scale;
  const sweep=id===STEEL_ID?Math.min(1,(hero.v2Active?.steel?.age??1)/.24):1;
  if(sweep<1){
   const original=this.outfits.get(selected)?.manifest;
   const clip=original?.animations[sample.state]||original?.animations.idle;
   if(clip)this.drawEcho(c,x,y,{id:selected,frame:clip.frames[Math.min(sample.index,clip.frames.length-1)],direction:sample.direction,look});
  }
  c.save();
  if(sweep<1){c.beginPath();c.rect(x-100,y-160,200,160*sweep);c.clip();}
  c.save();c.translate(x,y);c.scale(sample.direction*s,s);
  if(hero.invulnerable>0&&Math.floor(time*14)%2===0)c.globalAlpha*=.78;
  c.translate(-m.foot[0],-m.foot[1]);
  // One full outfit draw. No bones, independently rotated limbs or cape physics.
  c.drawImage(loaded.atlases[f.atlas||'default'],...f.rect,0,0,...m.cell);
  const closed=sample.state==='defeat'||sample.state==='idle'&&time%3.9>3.73;
  if(!m.head.embedded)this.head.draw(c,look,f.head,m.head.scale,{closed});c.restore();c.restore();
  const toWorld=point=>[(point[0]-m.foot[0])*m.worldScale,(point[1]-m.foot[1])*m.worldScale];
  const neck=toWorld(f.head),hand=toWorld(f.hand),elbow=[(neck[0]+hand[0])*.5,(neck[1]+hand[1])*.5+8];
  this.lastFrame={outfit:id,state:sample.state,frame:sample.frameIndex,direction:sample.direction,head:[...f.head],foot:[...m.foot]};
  this.lastPaint={id,frame:sample.frameIndex,direction:sample.direction,look};
  return {artSource:'full-body-atlas',clip:sample.state,head:neck,faceCenter:neck,shoulder:neck,hip:[0,-35],arms:[[neck,elbow,hand],[neck,elbow,hand]],legs:[],opacity:1};
 }
 drawEcho(c,x,y,paint){
  if(!paint)return;const loaded=this.outfits.get(paint.id);if(!loaded)return;
  const {manifest:m,atlas}=loaded,f=m.frames[paint.frame];
  c.save();c.translate(x,y);c.scale(paint.direction*m.worldScale,m.worldScale);c.translate(-m.foot[0],-m.foot[1]);
  c.drawImage(loaded.atlases[f.atlas||'default'],...f.rect,0,0,...m.cell);
  if(!m.head.embedded)this.head.draw(c,paint.look,f.head,m.head.scale);c.restore();
 }
 status(){return {enabled:this.enabled,ready:this.outfits.size>0&&this.head.ready,error:this.error,selectedOutfit:this.outfitID,lastFrame:this.lastFrame};}
}
export const kingJamesSprites=new OutfitEngine();
