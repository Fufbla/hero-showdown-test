// Optional artwork for ordinary attacks by the isolated 0000000000 test hero.
// Attack age already includes Speed/equipment modifiers in the simulation.
import {ATTACKS} from '../core.mjs';
import {BASIC_COMBAT_ART,BASIC_COMBAT_SCALE} from './combat/blue-basic-v1.mjs';

export {BASIC_COMBAT_ART,BASIC_COMBAT_SCALE};
export const BASIC_COMBAT_VERSION='blue-cape-basic-combat-v1';

function poseTimes(kind){
 const {startup,active,duration}=ATTACKS[kind];
 const end=startup+active,recovery=duration-end;
 // Punch reaches extension at pose 3; kick reaches extension at pose 4.
 return Object.freeze(kind==='punch'?
  [0,startup/3,startup*2/3,startup,startup+active*.48,end,end+recovery*.32,end+recovery*.68]:
  [0,startup*.25,startup*.5,startup*.75,startup,end,end+recovery*.375,end+recovery*.72]);
}
export const BASIC_COMBAT_TIMES=Object.freeze({punch:poseTimes('punch'),kick:poseTimes('kick')});

export function selectBasicCombatFrame(hero={}){
 const attack=hero.attack;
 // Special Strength and Super Kick share the approved eight-frame painted
 // punches/kicks. Their reusable power VFX supply the extra gold energy;
 // never swap the hero into the unrelated running/jumping poster frames.
 const empowered=attack?.power==='strength'&&attack.kind==='punch'||
   attack?.power==='superKick'&&attack.kind==='kick';
 if(hero.dead||hero.stun>0||!attack||(attack.power&&!empowered)||
    !Object.hasOwn(BASIC_COMBAT_ART,attack.kind))return null;
 const kind=attack.kind,age=Number.isFinite(attack.age)?Math.max(0,attack.age):0;
 if(age>=ATTACKS[kind].duration)return null;
 // Facing is locked when a strike starts, even if movement turns the hero.
 const direction=(attack.face||hero.face||1)<0?'left':'right';
 const times=BASIC_COMBAT_TIMES[kind];
 let index=0;
 while(index<times.length-1&&age>=times[index+1])index++;
 return {kind,direction,index,...BASIC_COMBAT_ART[kind][direction][index]};
}

export class V2BasicCombatSprites{
 constructor({loader=null}={}){
  this.loader=loader;this.images=new Map();this.errors=new Map();this.loading=null;
 }
 async preload(){
  if(this.images.size===Object.keys(BASIC_COMBAT_ART).length)return true;
  if(this.loading)return this.loading;
  const load=this.loader||((file)=>new Promise((resolve,reject)=>{
   if(typeof Image==='undefined')return reject(Error('Browser image decoder unavailable'));
   const image=new Image();image.decoding='async';
   image.onload=()=>resolve(image);
   image.onerror=()=>reject(Error('V2 basic combat image failed to load: '+file));
   image.src=new URL('./'+file,import.meta.url).href;
  }));
  this.loading=(async()=>{
   // Each optional action can fail independently. Movement atlases and the
   // other attack remain available if one new image cannot be decoded.
   await Promise.all(Object.entries(BASIC_COMBAT_ART).map(async([kind,meta])=>{
    if(this.images.has(kind))return;
    try{
     const image=await load(meta.file);
     if(image.width!==meta.width||image.height!==meta.height)throw Error('Invalid V2 '+kind+' atlas dimensions');
     this.images.set(kind,image);this.errors.delete(kind);
    }catch(error){this.errors.set(kind,error.message);}
   }));
   return this.images.size===Object.keys(BASIC_COMBAT_ART).length;
  })();
  try{return await this.loading;}finally{this.loading=null;}
 }
 draw(ctx,x,y,hero,scale=1){
  const frame=selectBasicCombatFrame(hero);
  if(!frame||!(scale>0)||!Number.isFinite(scale))return false;
  const image=this.images.get(frame.kind);
  if(!image)return false;
  const s=BASIC_COMBAT_SCALE*scale;
  ctx.save();
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(image,frame.x,frame.y,frame.width,frame.height,
   x-frame.anchorX*s,y-frame.anchorY*s,frame.width*s,frame.height*s);
  ctx.restore();
  return true;
 }
}
