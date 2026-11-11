// V2 TEST HERO ONLY — retrieve the approved, painted 24-pose POWER ART,
// but never draw its baked-in character or clothing. Each effect is isolated
// into its own transparent texture and layered over the single live Style C
// renderer. Preserves equipment, masks, face, cape and cosmetic wardrobe.
import {APPROVED_MOTION_ATLAS,APPROVED_POSES} from './approved-motion.mjs';
import {speedMotionActive} from './consistent-motion.mjs';
export const APPROVED_FX_VERSION='approved-painted-fx-only-v1';
const CELL=APPROVED_MOTION_ATLAS.cell;
const FRAMES=Object.freeze({
 strengthWindup:'strength-windup',strengthImpact:'strength-impact',
 strengthLeft:'strength-left',kickWindup:'kick-windup',
 kickImpact:'kick-impact',kickLeft:'kick-left',
 fireballCharge:'fireball-charge',fireballRelease:'fireball-release',
 fireballLeft:'fireball-left',steel:'steel',roots:'roots',
 whirlwind:'whirlwind',agility:'agility',flight:'flight',
 speed:'speed',merge:'merge'
});
const NAMES=Object.freeze(Object.values(FRAMES));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const rgbaOffset=(x,y)=>(y*CELL+x)*4;
// Source art is RGB+alpha on transparent 256x256 tiles. Exclude the inner
// character silhouette unconditionally: no colored suit, hair, cape or armor
// from the poster is permitted to replace live character customizations.
export function extractPaintedEffectPixels(source,name){
 const data=new Uint8ClampedArray(source);
 let count=0;
 for(let y=0;y<CELL;y++)for(let x=0;x<CELL;x++){
  const n=rgbaOffset(x,y),a=data[n+3];
  if(a<15){data[n+3]=0;continue;}
  const r=data[n],g=data[n+1],b=data[n+2],hi=Math.max(r,g,b),low=Math.min(r,g,b);
  const dx=(x-128)/58,dy=(y-128)/104;
  const character=dx*dx+dy*dy<1.0 && y<220;
  // Screen-space chromatic key: saturated, painted energy rather than dark
  // suit/cape pixels. Speed uses only ground-level painted motion accents;
  // moving character echoes themselves come from the canonical live renderer.
  const green=g>119&&g>r*1.17&&g>b*.91;
  const cyan=b>128&&b>r*1.17&&b>=g*.77;
  const yellow=r>164&&g>93&&r>b*1.25&&r>g*1.08;
  const magenta=r>109&&b>115&&r>g*1.16&&b>g*1.12;
  const white=low>179&&hi-low<75;
  const vivid=(hi>148&&(green||cyan||yellow||magenta))||white;
  const outside=(!character&&vivid)&&
   (name!=='speed'||y>=157);
  if(!outside){data[n+3]=0;continue;}
  // Keep soft antialiasing but never turn a diffuse aura into an opaque body.
  data[n+3]=Math.round(a*clamp((hi-99)/92,.2,1));
  count++;
 }
 return {data,count};
}
export function selectApprovedPowerEffect(game){
 const h=game?.hero;
 if(!h||h.dead||h.stun>0)return null;
 const left=(h.attack?.face||h.face||1)<0;
 const attack=h.attack;
 if(attack?.power==='strength')
  return {name:left?FRAMES.strengthLeft:attack.age<.13?FRAMES.strengthWindup:FRAMES.strengthImpact,age:attack.age||0,duration:.48,left};
 if(attack?.power==='superKick')
  return {name:left?FRAMES.kickLeft:attack.age<.13?FRAMES.kickWindup:FRAMES.kickImpact,age:attack.age||0,duration:.48,left};
 if((h.castAge??Infinity)<.24)
  return {name:left?FRAMES.fireballLeft:h.castAge<.12?FRAMES.fireballCharge:FRAMES.fireballRelease,age:h.castAge,duration:.24,left};
 const active=game?.powers?.active||{};
 if(h.flying||active.flight)return {name:FRAMES.flight,age:active.flight?.age||0,duration:active.flight?.duration||4,left};
 if(game?.legendary?.active&&(game?.mergeEffects?.length||game?.mergeShots?.length))
  return {name:FRAMES.merge,age:game.time||0,duration:Infinity,left};
 if(active.steel)return {name:FRAMES.steel,age:active.steel.age||0,duration:active.steel.duration||8,left};
 if(h.grounded&&active.roots)return {name:FRAMES.roots,age:active.roots.age||0,duration:active.roots.duration||2,left};
 if(h.grounded&&active.whirlwind)return {name:FRAMES.whirlwind,age:active.whirlwind.age||0,duration:active.whirlwind.duration||2,left};
 if(h.agile||(h.dodgeAge??Infinity)<.22)return {name:FRAMES.agility,age:h.dodgeAge||0,duration:.35,left};
 if(speedMotionActive(game))return {name:FRAMES.speed,age:game.time||0,duration:Infinity,left};
 return null;
}
export class ApprovedPaintedPowerFX{
 constructor({loader=null,makeCanvas=null}={}){
  this.loader=loader||(()=>new Promise((resolve,reject)=>{
   if(typeof Image==='undefined')return reject(Error('Browser image decoder unavailable'));
   const image=new Image();image.decoding='async';
   image.onload=()=>resolve(image);
   image.onerror=()=>reject(Error('Approved action atlas unavailable'));
   image.src=new URL('./'+APPROVED_MOTION_ATLAS.file,import.meta.url).href;
  }));
  this.makeCanvas=makeCanvas||(()=>typeof document==='undefined'?null:document.createElement('canvas'));
  this.images=new Map();this.ready=false;this.loading=null;this.error=null;
 }
 async preload(){
  if(this.ready)return true;
  if(this.loading)return this.loading;
  this.loading=(async()=>{
   try{
    const source=await this.loader();
    if(source.width!==APPROVED_MOTION_ATLAS.cols*CELL||
       source.height!==APPROVED_MOTION_ATLAS.rows*CELL)
      throw Error('Approved atlas dimensions do not match 24 poses');
    const local=new Map();
    for(const name of NAMES){
     const frameIndex=APPROVED_POSES.indexOf(name);
     if(frameIndex<0)continue;
     const canvas=this.makeCanvas();
     if(!canvas)throw Error('Canvas unavailable');
     canvas.width=canvas.height=CELL;
     const context=canvas.getContext('2d',{willReadFrequently:true});
     if(!context)throw Error('Painted FX canvas unavailable');
     context.clearRect(0,0,CELL,CELL);
     context.drawImage(source,(frameIndex%APPROVED_MOTION_ATLAS.cols)*CELL,
      Math.floor(frameIndex/APPROVED_MOTION_ATLAS.cols)*CELL,CELL,CELL,0,0,CELL,CELL);
     const pixels=context.getImageData(0,0,CELL,CELL);
     const extracted=extractPaintedEffectPixels(pixels.data,name);
     pixels.data.set(extracted.data);
     context.putImageData(pixels,0,0);
     let bottom=APPROVED_MOTION_ATLAS.anchorY;
     if(name==='roots'||name==='whirlwind'||name==='speed'){
      let found=false;
      for(let y=CELL-1;y>=0&&!found;y--)for(let x=0;x<CELL;x++){
       if(extracted.data[rgbaOffset(x,y)+3]>32){bottom=y+1;found=true;break;}
      }
     }
     local.set(name,{canvas,count:extracted.count,bottom});
    }
    this.images=local;this.ready=true;this.error=null;
    return true;
   }catch(error){this.ready=false;this.images.clear();this.error=error.message;return false;}
   finally{this.loading=null;}
  })();
  return this.loading;
 }
 draw(ctx,game,pos,time){
  if(!this.ready||!game?.testPowers)return false;
  const fx=selectApprovedPowerEffect(game);
  if(!fx)return false;
  const art=this.images.get(fx.name);
  if(!art||art.count===0)return false;
  const size=176;
  const grounded=fx.name==='roots'||fx.name==='whirlwind'||fx.name==='speed';
  // Preserve the grounded baseline while the painted effect pulses.
  const pulse=1+.017*Math.sin(time*12),w=size*pulse,h=size*pulse;
  const bottom=grounded?art.bottom:APPROVED_MOTION_ATLAS.anchorY;
  const fade=Number.isFinite(fx.duration)?
   clamp(Math.min((fx.duration-fx.age)/.20,1),.15,1):1;
  ctx.save();ctx.globalAlpha*=fade*(.76+.16*Math.sin(time*17));
  // Mirror generic ability effects toward travel, but use authored left attack
  // frames without mirroring their source artwork a second time.
  const hasLeftFrame=['strength-left','kick-left','fireball-left'].includes(fx.name);
  if(fx.left&&!hasLeftFrame){ctx.translate(pos.x*2,0);ctx.scale(-1,1);}
  const drift=grounded?Math.sin(time*7)*1.7:Math.sin(time*11)*1.1;
  ctx.drawImage(art.canvas,pos.x-w*.5+drift,pos.y-h*bottom/CELL,w,h);
  ctx.restore();
  return true;
 }
}
export const approvedPaintedPowerFX=new ApprovedPaintedPowerFX();
