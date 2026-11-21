import {ATTACKS} from '../../core.mjs';
import {validateManifest} from '../../../royale-v3-staging/kingjames/animation.mjs';

export const WOLF_WALK_MAX_SPEED=220;
export const NEW_COSTUME_STATES=Object.freeze([
 'idle','start','run','stop','jump','doubleJump','fall','land','punch','kick',
 'strength','superKick','fireball','fireballAir','flightStart','hover','fly',
 'hurt','defeat','recovery','seismicSmash'
]);
const limit=(x,a,b)=>Math.max(a,Math.min(b,x));
const exists=(m,id)=>!!m.animations[id];

// Same simulation priorities and attack windows as the normal full-body
// animator. Only the wolf adds a separately authored walking gait.
export function costumeStateFor(h,m){
 if(h.dead)return 'defeat';
 if(h.respawnAge<.6)return 'recovery';
 if(h.stun>0)return 'hurt';
 if(h.powerPose?.id==='seismicSmash'&&exists(m,'seismicSmash'))return 'seismicSmash';
 if(h.attack&&ATTACKS[h.attack.kind])return exists(m,h.attack.power)?h.attack.power:h.attack.kind;
 if(h.castAge>=0&&h.castAge<(m.animations.fireball?.duration||0))return !h.grounded&&exists(m,'fireballAir')?'fireballAir':'fireball';
 if(!h.grounded){
  if(h.flying&&exists(m,'fly'))return (h.v2Active?.flight?.age??1)<m.animations.flightStart.duration?'flightStart':Math.abs(h.vx||0)>15||Math.abs(h.vy||0)>35?'fly':'hover';
  if(h.jumpAge<.11||h.vy<-65)return h.jumps>=2?'doubleJump':'jump';
  return 'fall';
 }
 if(h.landing>0)return 'land';
 const speed=Math.abs(h.vx||0);
 return speed<=8?'idle':m.id==='wolf-transformation'&&speed<=WOLF_WALK_MAX_SPEED?'walk':'run';
}

export class CostumeAnimator{
 constructor(manifest){this.manifest=validateManifest(manifest);this.reset();}
 reset(){this.state=null;this.entered=0;this.lastTime=null;this.phase=0;this.lastJumpAge=100;}
 locomotion(next,time){
  const m=this.manifest,state=this.state,age=time-this.entered;
  if(m.id!=='wolf-transformation'){
   if(next==='run'){
    if(state==='idle'||state==='stop')return 'start';
    if(state==='start'&&age<m.animations.start.duration)return 'start';
   }else if(next==='idle'){
    if(state==='run'||state==='start')return 'stop';
    if(state==='stop'&&age<m.animations.stop.duration)return 'stop';
   }
   return next;
  }
  // Transitions contain real lowering/rising poses. Airborne/combat states
  // interrupt these immediately and never wait for a gait change to finish.
  if(next==='run'){
   if(['idle','walk','walkStart','walkStop','rise','stop'].includes(state))return 'runStart';
   if(state==='runStart'&&age<m.animations.runStart.duration)return 'runStart';
  }else if(next==='walk'){
   if(['run','runStart','start'].includes(state))return 'rise';
   if(['rise','stop'].includes(state)&&age<m.animations[state].duration)return state;
   if(state==='idle'||state==='walkStop')return 'walkStart';
   if(state==='walkStart'&&age<m.animations.walkStart.duration)return 'walkStart';
  }else if(next==='idle'){
   if(['run','runStart','start'].includes(state))return 'stop';
   if(['walk','walkStart'].includes(state))return 'walkStop';
   if(['stop','walkStop','rise'].includes(state)&&age<m.animations[state].duration)return state;
  }
  return next;
 }
 sample(h,time){
  if(!Number.isFinite(time))throw Error('Animation time must be finite');
  if(this.lastTime!==null&&time<this.lastTime)this.reset();
  const m=this.manifest,dt=this.lastTime===null?0:limit(time-this.lastTime,0,.1);
  this.lastTime=time;
  const desired=costumeStateFor(h,m),next=this.locomotion(desired,time);
  const jumped=(h.jumpAge??100)<this.lastJumpAge;
  if(next!==this.state||jumped&&next==='doubleJump'){this.state=next;this.entered=time;}
  this.lastJumpAge=h.jumpAge??100;
  const a=m.animations[next];if(!a)throw Error('Missing costume animation: '+next);
  const n=a.frames.length,age=Math.max(0,time-this.entered);let index=0;
  if(['punch','kick','strength','superKick'].includes(next)){
   const attack=h.attack,d=ATTACKS[attack.kind],t=Math.max(0,attack.age||0);
   if(a.phases){
    const [wind,contact,recover,end]=a.phases;
    index=t<d.startup?wind+Math.floor(t/d.startup*(contact-wind)):
     t<d.startup+d.active?contact+Math.floor((t-d.startup)/d.active*(recover-contact)):
     recover+Math.floor(limit((t-d.startup-d.active)/(d.duration-d.startup-d.active),0,.999)*(end-recover));
   }else if(t<d.startup)index=Math.min(1,Math.floor(t/d.startup*2));
   else if(t<d.startup+d.active)index=2;
   else index=3;
   if(a.comboStride)index+=limit(attack.comboIndex||0,0,Math.floor(n/a.comboStride)-1)*a.comboStride;
  }else if(next==='seismicSmash'){
   index=h.powerPose.age<.10?0:h.powerPose.age<.20?1:h.powerPose.age<.42?2:3;
  }else if(next==='fireball'||next==='fireballAir')index=Math.floor(limit(h.castAge/a.duration,0,.999)*n);
  else if(next==='run'||next==='walk'){
   this.phase=(this.phase+Math.abs(h.vx||0)*dt/(next==='walk'?(m.walkStrideDistance||118):m.strideDistance))%1;
   index=Math.floor(this.phase*n)%n;
  }else if(next==='jump'||next==='doubleJump')index=h.jumpAge<.035?0:h.jumpAge<.085?1:h.vy<-220?2:3;
  else if(next==='fall')index=h.vy<75?0:h.vy<220?1:h.vy<420?2:3;
  else if(next==='land')index=Math.floor(limit((.13-h.landing)/.13,0,.999)*n);
  else if(next==='hurt')index=Math.floor(limit((h.hurtAge||0)/.16,0,.999)*n);
  else if(next==='defeat')index=Math.floor(limit((h.defeatAge||0)/a.duration,0,.999)*n);
  else if(next==='recovery')index=Math.floor(limit((h.respawnAge||0)/.6,0,.999)*n);
  else index=Math.floor((a.loop?age%a.duration:Math.min(age,a.duration-.00001))/a.duration*n);
  index=limit(index,0,n-1);const frameIndex=a.frames[index];
  return {state:next,desired,index,frameIndex,frame:m.frames[frameIndex],direction:(h.powerPose?.face||h.attack?.face||h.face||1)<0?-1:1};
 }
}
