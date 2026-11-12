import {ATTACKS} from '../../royale/core.mjs';
export const REQUIRED_STATES=Object.freeze(['idle','start','run','stop','jump','doubleJump','fall','land','punch','kick','hurt','defeat','recovery']);
export function validateManifest(m){
 if(m?.version!==1||m.rig!=='action-chibi-v1')throw Error('Unsupported full-body outfit contract');
 if(!Array.isArray(m.cell)||m.cell.some(n=>!Number.isInteger(n)||n<1))throw Error('Invalid sprite cell');
 if(!Array.isArray(m.foot)||!m.foot.every(Number.isFinite)||!Number.isFinite(m.worldScale))throw Error('Invalid foot reference');
 if(!m.frames?.length||!m.head||!Number.isFinite(m.head.scale))throw Error('Missing head registration');
 for(const [i,f] of m.frames.entries()){
  if(!Array.isArray(f.rect)||f.rect.length!==4||!f.rect.every(Number.isFinite)||f.rect[2]!==m.cell[0]||f.rect[3]!==m.cell[1])throw Error('Frame size mismatch '+i);
  if(!Array.isArray(f.head)||f.head.length!==3||!f.head.every(Number.isFinite))throw Error('Missing head anchor '+i);
  if(!f.hand?.every(Number.isFinite))throw Error('Missing effect attachment '+i);
 }
 for(const id of REQUIRED_STATES){const s=m.animations?.[id];
  if(!s||s.frames.length<2||s.frames.some(i=>!m.frames[i])||!(s.duration>0))throw Error('Invalid animation '+id);
 }
 return m;
}
const limit=(x,a,b)=>Math.max(a,Math.min(b,x));
function stateFor(h,m){
 if(h.dead)return 'defeat';
 if(h.respawnAge<.6)return 'recovery';
 if(h.stun>0)return 'hurt';
 if(h.attack&&ATTACKS[h.attack.kind])return m.animations[h.attack.power]?h.attack.power:h.attack.kind;
 if(h.castAge>=0&&h.castAge<(m.animations.fireball?.duration||0))return !h.grounded&&m.animations.fireballAir?'fireballAir':'fireball';
 if(!h.grounded){
  if(h.flying&&m.animations.fly)return (h.v2Active?.flight?.age??1)<m.animations.flightStart.duration?'flightStart':Math.abs(h.vx||0)>15||Math.abs(h.vy||0)>35?'fly':'hover';
  if(h.flying)return 'fall';
  if(h.jumpAge<.11||h.vy<-65)return h.jumps>=2?'doubleJump':'jump';
  return 'fall';
 }
 if(h.landing>0)return 'land';
 return Math.abs(h.vx||0)>8?'run':'idle';
}
export class FullBodyAnimator{
 constructor(manifest){this.manifest=validateManifest(manifest);this.reset();}
 reset(){this.state=null;this.entered=0;this.lastTime=null;this.phase=0;this.lastJumpAge=100;this.lastAttack=null;}
 sample(h,time){
  const m=this.manifest,dt=this.lastTime===null?0:limit(time-this.lastTime,0,.1);
  if(this.lastTime!==null&&time<this.lastTime)this.reset();
  this.lastTime=time;
  let next=stateFor(h,m);
  if(next==='run'){
   if(this.state==='idle'||this.state==='stop')next='start';
   else if(this.state==='start'&&time-this.entered<m.animations.start.duration)next='start';
  }else if(next==='idle'){
   if(this.state==='run'||this.state==='start')next='stop';
   else if(this.state==='stop'&&time-this.entered<m.animations.stop.duration)next='stop';
  }
  const jumped=(h.jumpAge??100)<this.lastJumpAge;
  if(next!==this.state||jumped&&next==='doubleJump'){
   this.state=next;this.entered=time;
   if(next==='run'&&this.phase===0)this.phase=0;
  }
  this.lastJumpAge=h.jumpAge??100;
  const a=m.animations[next],n=a.frames.length,age=Math.max(0,time-this.entered);
  let index=0;
  if(['punch','kick','strength','superKick'].includes(next)){
   // Contact artwork begins at the existing simulation's active hit window.
   const attack=h.attack,d=ATTACKS[attack.kind],t=Math.max(0,attack.age||0);
   if(a.phases){
    const [wind,contact,recover,end]=a.phases;
    index=t<d.startup?wind+Math.floor(t/d.startup*(contact-wind)):
     t<d.startup+d.active?contact+Math.floor((t-d.startup)/d.active*(recover-contact)):
     recover+Math.floor(limit((t-d.startup-d.active)/(d.duration-d.startup-d.active),0,.999)*(end-recover));
   }else if(t<d.startup)index=Math.min(1,Math.floor(t/d.startup*2));
   else if(t<d.startup+d.active)index=2;
   else index=3;
   if(a.comboStride)index+=limit(h.attack.comboIndex||0,0,Math.floor(n/a.comboStride)-1)*a.comboStride;
  }else if(next==='fireball'||next==='fireballAir'){
   index=Math.floor(limit(h.castAge/a.duration,0,.999)*n);
  }else if(next==='run'){
   this.phase=(this.phase+Math.abs(h.vx||0)*dt/m.strideDistance)%1;
   index=Math.floor(this.phase*n)%n;
  }else if(next==='jump'||next==='doubleJump'){
   index=h.jumpAge<.035?0:h.jumpAge<.085?1:h.vy<-220?2:3;
  }else if(next==='fall'){
   index=h.flying?Math.floor(age/.18)%n:h.vy<75?0:h.vy<220?1:h.vy<420?2:3;
  }else if(next==='land')index=Math.floor(limit((.13-h.landing)/.13,0,.999)*n);
  else if(next==='hurt')index=Math.floor(limit((h.hurtAge||0)/.16,0,.999)*n);
  else if(next==='defeat')index=Math.floor(limit((h.defeatAge||0)/a.duration,0,.999)*n);
  else if(next==='recovery')index=Math.floor(limit((h.respawnAge||0)/.6,0,.999)*n);
  else index=Math.floor((a.loop?age%a.duration:Math.min(age,a.duration-.00001))/a.duration*n);
  index=limit(index,0,n-1);
  const frameIndex=a.frames[index];
  return {state:next,index,frameIndex,frame:m.frames[frameIndex],direction:(h.attack?.face||h.face||1)<0?-1:1};
 }
}
