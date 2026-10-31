import {MONSTER_SPRITES} from './monster-sprite-catalog.mjs';
import {TYPES} from './world.mjs';
// This is single-pose reference animation, not an authored limb/frame sequence.
// All transforms are visual. Neither atlas building nor drawing mutates enemies.
export const SPRITE_CLIPS=Object.freeze({idle:{start:0,count:4},move:{start:4,count:8},warn:{start:12,count:3},attack:{start:15,count:4},recover:{start:19,count:2},hit:{start:21,count:2},defeat:{start:23,count:5}});
export const SPRITE_CELL=Object.freeze({w:192,h:160,columns:4,rows:7,baseline:150});
const TAU=Math.PI*2,clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export function spriteFrame(e,t=0){
 let clip='idle',u=0;
 if(e.state==='dead'){clip='defeat';u=clamp((e.deadAge||0)/.55);}
 else if(e.flash>0){clip='hit';u=clamp(1-e.flash/.12);}
 else if(e.state==='warn'){clip='warn';const region=TYPES[e.type]?.region||1;const duration=region===1?(e.type==='crawler'?.55:.7):Math.max(.38,.8-region*.045);u=clamp((e.age||0)/duration);}
 else if(e.state==='strike'){clip='attack';u=clamp((e.age||0)/.28);}
 else if(e.state==='recover'){clip='recover';u=clamp((e.age||0)/.65);}
 else if(!e.rooted&&!e.lifted&&(e.state==='patrol'||e.state==='chase'||e.state==='desperation'||e.airborne||e.pouncing)){
  clip='move';u=((e.walkCycle??t*.8)%1+1)%1;
 }else u=((t*.65+(e.id||0)*.137)%1+1)%1;
 const {start,count}=SPRITE_CLIPS[clip];return start+Math.min(count-1,Math.floor(u*count));
}
export function spritePose(motion,clip,u){
 const p=u*TAU,ooze=motion==='ooze',hover=motion==='hover';
 let sy=1,sx=1,shear=0,wave=0,drift=0;
 if(clip==='idle'){sy+=Math.sin(p)*(ooze?.027:.009);sx+=Math.sin(p)*(ooze?-.018:0);if(hover)drift=-Math.sin(p)*1.4;}
 if(clip==='move'){sy+=Math.cos(p*2)*(ooze?.035:.012);sx+=Math.sin(p)*(ooze?.025:0);wave=Math.sin(p)*(motion==='scuttle'?1.8:motion==='serpent'?1.7:1.2);if(hover)drift=-Math.sin(p)*1.6;}
 if(clip==='warn'){sy-=u*(ooze?.08:.025);sx+=u*(ooze?.045:0);shear=.045*u;}
 if(clip==='attack'){const a=Math.sin(u*Math.PI);shear=-.085*a;sy-=a*.018;sx+=a*(ooze?.075:.025);wave=a*.7;}
 if(clip==='recover'){shear=-.035*(1-u);sy-=.015*(1-u);}
 if(clip==='hit'){shear=.035*(1-u);sy-=.018*(1-u);}
 // The renderer supplies the continuous, ground-anchored collapse and fade.
 if(clip==='defeat'){shear=.05*u;sy-=.08*u;sx+=.035*u;}
 return {sx,sy,shear,wave,drift,anchorY:0};
}
export class ReferenceMonsterAtlas{
 constructor({fallback,heights,enabledRegions=[1,2,3,4,5,6,7],loadImages=typeof Image!=='undefined'}={}){
  this.fallback=fallback;this.heights=heights;this.enabledRegions=new Set(enabledRegions);this.loadImages=loadImages;this.entries=new Map();this.sources=new Map();this.errors=new Map();this.limit=6;this.cell=SPRITE_CELL;this.disposed=false;this.whenLoaded=Promise.resolve(true);
 }
 hasSprite(type){return this.enabledRegions.has(MONSTER_SPRITES[type]?.region)&&!!this.sources.get(type)?.image;}
 load(type){
  if(!this.enabledRegions.has(MONSTER_SPRITES[type]?.region)||!this.loadImages||this.disposed)return Promise.resolve(false);
  if(this.sources.has(type))return this.sources.get(type).promise;
  const entry={image:null,promise:null};this.sources.set(type,entry);
  entry.promise=new Promise(resolve=>{
   const image=new Image();image.decoding='async';
   const finish=(ok,error)=>{image.onload=image.onerror=null;if(error)this.errors.set(type,error);if(ok&&!this.disposed){entry.image=image;for(const n of [false,true]){const key=`${type}:${n}`,old=this.fallback?.entries.get(key);if(old){this.fallback.entries.delete(key);old.width=old.height=1;}}}resolve(ok&&!this.disposed);};
   image.onload=()=>{const valid=image.naturalWidth===MONSTER_SPRITES[type].width&&image.naturalHeight===MONSTER_SPRITES[type].height;finish(valid,valid?'':'Unexpected reference PNG dimensions; using original art.');};
   image.onerror=()=>finish(false,'Reference PNG could not load; original canvas art remains available.');
   image.src=new URL('./assets/monsters/'+MONSTER_SPRITES[type].file,import.meta.url).href;
  });return entry.promise;
 }
 preload(region){this.whenLoaded=Promise.all(Object.keys(MONSTER_SPRITES).filter(k=>MONSTER_SPRITES[k].region===region).map(k=>this.load(k))).then(a=>a.every(Boolean));return this.whenLoaded;}
 atlas(type,night=false){
  if(!this.hasSprite(type)){this.load(type);return null;}
  const key=`${type}:${night}`;
  if(this.entries.has(key)){const a=this.entries.get(key);this.entries.delete(key);this.entries.set(key,a);return a;}
  const {w,h,columns,rows,baseline}=this.cell,meta=MONSTER_SPRITES[type],image=this.sources.get(type).image;
  // Compose eye light once, not every frame. The same deformation carries eyes
  // with the original face, including mirrored left-facing reference poses.
  const source=document.createElement('canvas');source.width=image.width;source.height=image.height;const s=source.getContext('2d');s.drawImage(image,0,0);
  if(night){s.fillStyle='#fff12c';s.shadowColor='#ffe100';s.shadowBlur=3;for(const [x,y] of meta.eyes){s.beginPath();s.ellipse(x*image.width,y*image.height,Math.max(1,image.width*.012),Math.max(1,image.height*.016),0,0,TAU);s.fill();}s.shadowBlur=0;}
  const canvas=document.createElement('canvas');canvas.width=w*columns;canvas.height=h*rows;const c=canvas.getContext('2d');
  const scale=this.heights[type]/(meta.anchor[1]-4),dw=source.width*scale,dx=-meta.anchor[0]*scale;
  for(const [clip,{start,count}] of Object.entries(SPRITE_CLIPS))for(let i=0;i<count;i++){
   const f=start+i,p=spritePose(meta.motion,clip,clip==='idle'||clip==='move'?i/count:i/(count-1));
   c.save();c.beginPath();c.rect(f%columns*w,Math.floor(f/columns)*h,w,h);c.clip();c.translate(f%columns*w+w/2,Math.floor(f/columns)*h+baseline+p.drift);c.transform(p.sx,0,p.shear,p.sy,0,0);c.scale(meta.sourceFacing,1);
   // Eight overlapping bands give a continuous silhouette; no independent limb
   // cutouts or invented anatomy. Rasterized once, then one drawImage per enemy.
   const bands=8;
   for(let b=0;b<bands;b++){
    const y0=b*source.height/bands,y1=Math.min(source.height,(b+1)*source.height/bands+.5),v=(b+.5)/bands;
    const warp=p.wave*Math.sin(v*Math.PI)*v;
    c.drawImage(source,0,y0,source.width,y1-y0,dx+warp,(y0-meta.anchor[1])*scale,dw,(y1-y0)*scale);
   }
   c.restore();
  }
  this.entries.set(key,canvas);while(this.entries.size>this.limit){const oldest=this.entries.keys().next().value,removed=this.entries.get(oldest);this.entries.delete(oldest);removed.width=removed.height=1;}
  return canvas;
 }
 draw(c,e,t,night=false){
  const atlas=this.atlas(e.type,night);if(!atlas){this.fallback?.draw(c,e,t,night);return;}
  const f=spriteFrame(e,t),{w,h,columns,baseline}=this.cell;
  c.drawImage(atlas,f%columns*w,Math.floor(f/columns)*h,w,h,-w/2,-baseline,w,h);
 }
 get textureBytes(){return this.entries.size*this.cell.w*this.cell.h*this.cell.columns*this.cell.rows*4;}
 destroy(){this.disposed=true;for(const a of this.entries.values())a.width=a.height=1;this.entries.clear();this.sources.clear();this.fallback?.entries.clear();}
}
