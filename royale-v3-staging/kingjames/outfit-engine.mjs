import {FullBodyAnimator,validateManifest} from './animation.mjs';
import {UniversalHead} from './head.mjs';
import {selectedOutfit,OUTFIT_ID} from './selection.mjs';
export const OUTFITS=Object.freeze({[OUTFIT_ID]:new URL('./outfits/kingjames-original/manifest.json',import.meta.url)});
const browserImage=url=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Outfit atlas unavailable'));im.src=url.href;});
export class OutfitEngine{
 constructor({imageLoader=browserImage,jsonLoader=async url=>{const r=await fetch(url);if(!r.ok)throw Error('Outfit manifest unavailable');return r.json();},canvasFactory}={}){
  this.imageLoader=imageLoader;this.jsonLoader=jsonLoader;this.head=new UniversalHead({imageLoader,canvasFactory});
  this.outfits=new Map();this.states=new WeakMap();this.enabled=false;this.lastFrame=null;this.error=null;
 }
 async preload(id=OUTFIT_ID){
  try{
   if(this.outfits.has(id))return true;
   const url=OUTFITS[id];if(!url)throw Error('Unknown outfit');
   const manifest=validateManifest(await this.jsonLoader(url));
   const [atlas]=await Promise.all([this.imageLoader(new URL(manifest.atlas,url)),this.head.preload()]);
   const width=atlas.naturalWidth||atlas.width,height=atlas.naturalHeight||atlas.height;
   if(manifest.frames.some(f=>f.rect[0]<0||f.rect[1]<0||f.rect[0]+f.rect[2]>width||f.rect[1]+f.rect[3]>height))throw Error('Outfit atlas dimensions do not match manifest');
   this.outfits.set(id,{manifest,atlas});this.error=null;return true;
  }catch(e){this.error=e.message;return false;}
 }
 selected(look){return selectedOutfit(this.enabled,look);}
 draw(c,x,y,look,hero,time,{owner=hero,scale=1}={}){
  const id=this.selected(look),loaded=this.outfits.get(id);
  if(!loaded||!this.head.ready)return false;
  const {manifest:m,atlas}=loaded;
  let animator=this.states.get(owner);if(!animator||animator.manifest!==m){animator=new FullBodyAnimator(m);this.states.set(owner,animator);}
  const sample=animator.sample(hero,time),f=sample.frame,s=m.worldScale*scale;
  c.save();c.translate(x,y);c.scale(sample.direction*s,s);
  if(hero.invulnerable>0&&Math.floor(time*14)%2===0)c.globalAlpha*=.78;
  c.translate(-m.foot[0],-m.foot[1]);
  // One full outfit draw. No bones, independently rotated limbs or cape physics.
  c.drawImage(atlas,...f.rect,0,0,...m.cell);
  const closed=sample.state==='defeat'||sample.state==='idle'&&time%3.9>3.73;
  this.head.draw(c,look,f.head,m.head.scale,{closed});c.restore();
  const toWorld=point=>[(point[0]-m.foot[0])*m.worldScale,(point[1]-m.foot[1])*m.worldScale];
  const neck=toWorld(f.head),hand=toWorld(f.hand),elbow=[(neck[0]+hand[0])*.5,(neck[1]+hand[1])*.5+8];
  this.lastFrame={outfit:id,state:sample.state,frame:sample.frameIndex,direction:sample.direction,head:[...f.head],foot:[...m.foot]};
  return {artSource:'full-body-atlas',clip:sample.state,head:neck,faceCenter:neck,shoulder:neck,hip:[0,-35],arms:[[neck,elbow,hand],[neck,elbow,hand]],legs:[],opacity:1};
 }
 status(){return {enabled:this.enabled,ready:this.outfits.size>0&&this.head.ready,error:this.error,lastFrame:this.lastFrame};}
}
export const kingJamesSprites=new OutfitEngine();
