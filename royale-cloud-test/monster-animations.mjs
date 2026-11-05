import {ReferenceMonsterAtlas,SPRITE_CELL,spriteFrame} from './monster-sprites.mjs';
import {MONSTER_ANIMATIONS} from './monster-animation-catalog.mjs';
import {TYPES} from './world.mjs';

export const ANIMATION_CELL=Object.freeze({...SPRITE_CELL,columns:6,rows:5});
const clamp=n=>Math.max(0,Math.min(1,n));
const phase=n=>((n%1)+1)%1;
// Read the simulation's clocks. Rendering never starts attacks, moves feet,
// changes hitboxes, applies knockback, or writes enemy state.
export function animationFrame(e,t=0){
 const clips=MONSTER_ANIMATIONS[e.type]?.clips||{idle:{start:0,count:6},move:{start:6,count:6},attack:{start:12,count:6},hit:{start:18,count:6},defeat:{start:24,count:6}};
 const frame=(state,u)=>clips[state].start+Math.min(clips[state].count-1,Math.floor(clamp(u)*clips[state].count));
 if(e.state==='dead')return frame('defeat',(e.deadAge||0)/.55);
 if(e.flash>0)return frame('hit',1-e.flash/.12);
 const region=TYPES[e.type]?.region||1;
 if(e.state==='warn'){
  const duration=region===1?(e.type==='crawler'?.55:.7):Math.max(.38,.8-region*.045);
  return frame('attack',Math.min(1-1e-9,clamp((e.age||0)/duration))/3);
 }
 if(e.state==='strike')return frame('attack',(1+Math.min(1-1e-9,clamp((e.age||0)/(region===1?.24:.28))))/3);
 if(e.state==='recover'&&(e.age||0)<.24)return frame('attack',(2+(e.age||0)/.24)/3);
 if(!e.rooted&&!e.lifted&&(e.state==='patrol'||e.state==='chase'||e.state==='desperation'||e.airborne||e.pouncing))return frame('move',phase(e.walkCycle??t*.8));
 return frame('idle',phase(t*.65+(e.id||0)*.137));
}

export class AnimatedMonsterAtlas extends ReferenceMonsterAtlas{
 hasAnimation(type){return !!MONSTER_ANIMATIONS[type]&&this.hasSprite(type);}
 cellFor(type){return MONSTER_ANIMATIONS[type]?ANIMATION_CELL:SPRITE_CELL;}
 frameFor(e,t){return MONSTER_ANIMATIONS[e.type]?animationFrame(e,t):spriteFrame(e,t);}
 load(type){
  const meta=MONSTER_ANIMATIONS[type];if(!meta)return super.load(type);
  if(!this.enabledRegions.has(meta.region)||!this.loadImages||this.disposed)return Promise.resolve(false);
  if(this.sources.has(type))return this.sources.get(type).promise;
  const entry={image:null,promise:null};this.sources.set(type,entry);
  entry.promise=new Promise(resolve=>{
   const image=new Image();image.decoding='async';
   const finish=(ok)=>{
    image.onload=image.onerror=null;
    if(!ok)this.errors.set(type,'Animation PNG failed validation; original canvas art remains available.');
    if(ok&&!this.disposed&&this.sources.get(type)===entry){entry.image=image;for(const night of [false,true]){const key=`${type}:${night}`,old=this.fallback?.entries.get(key);if(old){this.fallback.entries.delete(key);old.width=old.height=1;}}}
    resolve(ok&&!this.disposed&&this.sources.get(type)===entry);
   };
   image.onload=()=>finish(image.naturalWidth===meta.cellWidth*meta.columns&&image.naturalHeight===meta.cellHeight*meta.rows);
   image.onerror=()=>finish(false);
   image.src=new URL('./assets/monsters/'+meta.file,import.meta.url).href;
  });return entry.promise;
 }
 preload(region){
  // Retain only the current region's large masters, plus at most six small
  // display atlases. A late image load cannot repopulate an evicted entry.
  for(const [type] of this.sources)if(MONSTER_ANIMATIONS[type]&&MONSTER_ANIMATIONS[type].region!==region)this.sources.delete(type);
  return super.preload(region);
 }
 atlas(type,night=false){
  const meta=MONSTER_ANIMATIONS[type];if(!meta)return super.atlas(type,night);
  if(!this.hasAnimation(type)){this.load(type);return null;}
  const key=`${type}:${night}`;
  if(this.entries.has(key)){const a=this.entries.get(key);this.entries.delete(key);this.entries.set(key,a);return a;}
  const {w,h,columns,rows,baseline}=ANIMATION_CELL,image=this.sources.get(type).image;
  const canvas=document.createElement('canvas');canvas.width=w*columns;canvas.height=h*rows;const c=canvas.getContext('2d');
  const scale=this.heights[type]/meta.referenceHeight,dw=meta.cellWidth*scale,dh=meta.cellHeight*scale;
  for(let f=0;f<meta.frameCount;f++){
   const x=f%columns*w,y=Math.floor(f/columns)*h,dx=x+w/2-meta.anchor[0]*scale,dy=y+baseline-meta.anchor[1]*scale;
   c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
   c.drawImage(image,f%meta.columns*meta.cellWidth,Math.floor(f/meta.columns)*meta.cellHeight,meta.cellWidth,meta.cellHeight,dx,dy,dw,dh);
   if(night&&f<(meta.clips?.defeat.start??24)){c.fillStyle='#fff12c';c.shadowColor='#ffe100';c.shadowBlur=2;for(const [ex,ey] of meta.eyes[f]){c.beginPath();c.ellipse(dx+ex*scale,dy+ey*scale,Math.max(.65,scale*1.8),Math.max(.8,scale*2.2),0,0,Math.PI*2);c.fill();}}
   c.restore();
  }
  this.entries.set(key,canvas);while(this.entries.size>this.limit){const oldest=this.entries.keys().next().value,removed=this.entries.get(oldest);this.entries.delete(oldest);removed.width=removed.height=1;}
  return canvas;
 }
 draw(c,e,t,night=false){
  if(!MONSTER_ANIMATIONS[e.type])return super.draw(c,e,t,night);
  const atlas=this.atlas(e.type,night);if(!atlas){this.fallback?.draw(c,e,t,night);return;}
  const f=animationFrame(e,t),{w,h,columns,baseline}=ANIMATION_CELL;
  c.drawImage(atlas,f%columns*w,Math.floor(f/columns)*h,w,h,-w/2,-baseline,w,h);
 }
 get textureBytes(){return [...this.entries.values()].reduce((n,a)=>n+a.width*a.height*4,0);}
}
