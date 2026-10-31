import { sanitizeLook } from './appearance.mjs';
import { ATTACKS } from './core.mjs';

const PI = Math.PI, TAU = PI * 2;
const clamp = (v, a=0, b=1) => Math.max(a, Math.min(b, v));
const mix = (a,b,t) => a+(b-a)*t;
const smooth = t => { t=clamp(t); return t*t*(3-2*t); };
export const CAPE_LENGTH = 48;
export const PREVIEW_POSES = ['idle','walk','run','jump','double-jump','fall','land','punch','kick','air-punch','air-kick','hurt','defeat','respawn'];

// Two bones of fixed length, with a shared elbow/knee. Targets never stretch a limb.
export function twoBone(root, target, upper, lower, bend=1) {
  const dx=target[0]-root[0], dy=target[1]-root[1], raw=Math.hypot(dx,dy);
  const d=clamp(raw,Math.abs(upper-lower)+.001,upper+lower-.001);
  const a=Math.atan2(dy,dx), cosine=clamp((upper*upper+d*d-lower*lower)/(2*upper*d),-1,1);
  const angle=a+bend*Math.acos(cosine);
  return [root,[root[0]+Math.cos(angle)*upper,root[1]+Math.sin(angle)*upper],[root[0]+Math.cos(a)*d,root[1]+Math.sin(a)*d]];
}
export function dimensions(raw) {
  const l=sanitizeLook(raw), build={slender:[12,10,6],balanced:[15,12,7.5],strong:[18,13,9],full:[18,17,10]}[l.build];
  return {leg:44*l.height*l.legs,torso:30*l.height*l.torso,arm:49*l.height*l.arms,
    shoulder:(build[0]+l.muscle*2)*l.shoulders,hip:build[1],thick:build[2]+l.muscle*2,
    head:l.age==='teen'?1.04:l.age==='older'?.96:1,waist:l.presentation==='female'?.73:.88};
}
export function animationState(h) {
  if(h.dead) return 'defeat';
  if(h.respawnAge<.6) return 'respawn';
  if(h.stun>0) return 'hurt';
  if(h.attack) return `${h.grounded?'':'air-'}${h.attack.kind}`;
  if(h.flying)return 'flight';
  if((h.castAge??100)<.25)return 'fireball';
  if(!h.grounded) return h.vy<0?(h.jumps===2?'double-jump':'jump'):'fall';
  if(h.landing>0) return 'land';
  return Math.abs(h.vx)>240?'run':Math.abs(h.vx)>5?'walk':'idle';
}
export function previewHero(pose,time) {
  const h={face:1,grounded:true,cycle:0,vx:0,vy:0,stun:0,landing:0,jumps:0,dead:false,
    invulnerable:0,respawnAge:100,jumpAge:100,hurtAge:100,defeatAge:0};
  if(pose==='walk'||pose==='run'){h.vx=pose==='run'?315:185;h.cycle=time*h.vx/52;}
  if(['jump','double-jump','fall','air-punch','air-kick'].includes(pose)){h.grounded=false;h.vy=pose==='fall'?220:-300;h.jumps=pose==='double-jump'?2:1;h.jumpAge=time%1;}
  if(pose.includes('punch')||pose.includes('kick')){const kind=pose.includes('punch')?'punch':'kick';h.attack={kind,age:time%(ATTACKS[kind].duration+.35),face:1};if(h.attack.age>ATTACKS[kind].duration)h.attack=null;}
  if(pose==='land')h.landing=.13*(1-time%1);
  if(pose==='hurt'){h.stun=.16;h.hurtAge=time%.6;}
  if(pose==='defeat'){h.dead=true;h.defeatAge=time%2;}
  if(pose==='respawn')h.respawnAge=time%1.2;
  return h;
}
// Cosmetic skeleton only. No position here is used by collision or combat.
export function poseFor(raw,h,time,view='game') {
  const d=dimensions(raw), state=animationState(h), front=view!=='game';
  const motion=clamp(Math.abs(h.vx||0)/80), run=clamp((Math.abs(h.vx||0)-185)/130);
  const stride=d.leg*mix(.26,.46,run), period=stride*4;
  const phase=((h.cycle||0)*52/period)%1;
  function foot(offset) {
    const p=(phase+offset)%1;
    // Half of each cycle plants the foot: its world-space velocity cancels travel.
    return p<.5?[mix(stride,-stride,p*2),-5]:[mix(-stride,stride,smooth((p-.5)*2)),-5-Math.sin((p-.5)*TAU)*mix(9,19,run)];
  }
  let a=foot(0),b=foot(.5),hipX=0,hipY=-d.leg*.89-5,lean=run*5*motion;
  a=[mix(front?d.hip*.64:10,a[0],motion),mix(-5,a[1],motion)];
  b=[mix(front?-d.hip*.64:-10,b[0],motion),mix(-5,b[1],motion)];
  hipY+=Math.cos(phase*TAU*2)*1.1*motion;
  let handA=[d.shoulder+15,hipY-d.torso*.45],handB=[-d.shoulder-15,hipY-d.torso*.43];
  if(motion){handA[0]-=Math.sin(phase*TAU)*stride*.8;handB[0]+=Math.sin(phase*TAU)*stride*.8;handA[1]+=4;handB[1]+=4;}
  if(!h.grounded){
    const tuck=h.jumps===2?Math.sin(clamp((h.jumpAge||0)/.4)*PI)*10:0;
    const lift=smooth((h.jumpAge??100)/.09);a=[mix(a[0],15,lift),mix(a[1],-16-tuck,lift)];b=[mix(b[0],-14,lift),mix(b[1],-9-tuck*.4,lift)];hipY=-d.leg*.89-5;
    handA=[d.shoulder+8,hipY-d.torso*.65];handB=[-d.shoulder-8,hipY-d.torso*.5];lean=3;
    if(h.vy>0){a[1]=mix(a[1],-7,clamp(h.vy/400));b[1]=-4;handA[0]+=4;handB[0]-=3;}
  }
  if(h.flying){a=[10,-12];b=[-11,-8];lean=4;handA=[d.shoulder+9,hipY-d.torso*.8];handB=[-d.shoulder-6,hipY-d.torso*.4];}
  if((h.castAge??100)<.25){const extend=Math.sin(clamp(h.castAge/.25)*PI);handA=[mix(handA[0],43,extend),mix(handA[1],-48,extend)];}
  const landing=clamp((h.landing||0)/.13);
  hipY+=Math.sin(landing*PI*.75)*7;
  let extension=0;
  if(h.attack){
    const def=ATTACKS[h.attack.kind],t=h.attack.age;
    extension=t<def.startup?smooth(t/def.startup):t<def.startup+def.active?1:1-smooth((t-def.startup-def.active)/(def.duration-def.startup-def.active));
    if(h.attack.kind==='punch'){
      lean=mix(lean,3,extension);handA=[mix(handA[0],54,extension),mix(handA[1],-54,extension)];handB=[mix(handB[0],-d.shoulder-10,extension),mix(handB[1],hipY-15,extension)];
    } else {
      const kickHipY=-d.leg*.87-5;
      const reach=Math.sqrt(Math.max(1,(d.leg-.2)**2-(-39-kickHipY)**2));
      hipX=Math.max(0,56-d.hip*.42-reach)*extension;hipY=mix(hipY,kickHipY,extension);lean=mix(lean,-5,extension);
      a=[mix(a[0],56,extension),mix(a[1],-39,extension)];b=[mix(b[0],hipX-d.hip*.42,extension),b[1]];
      handA=[mix(handA[0],hipX+d.shoulder+(h.attack.power==='superKick'&&h.attack.comboIndex%2?-2:4),extension),mix(handA[1],hipY-d.torso-6,extension)];handB=[mix(handB[0],hipX-d.shoulder-4,extension),mix(handB[1],hipY-d.torso-2,extension)];
    }
  }
  if(state==='hurt'){lean=-7*(1-clamp((h.hurtAge||0)/.3));handA=[8,hipY-9];handB=[-10,hipY-7];}
  let rotation=0,opacity=1;
  if(h.dead){const f=smooth((h.defeatAge||0)/.65);hipY=mix(hipY,-18,f);lean=-11*f;a=[mix(a[0],21,f),-5];b=[mix(b[0],-23,f),-5];handA=[14,hipY+9];handB=[-20,hipY+8];rotation=-.1*f;opacity=1-.55*smooth(((h.defeatAge||0)-1)/.5);}
  if(state==='respawn'){const f=1-smooth(h.respawnAge/.6);hipY+=12*f;lean=-4*f;opacity=1-f*.6;}
  if(h.grounded){
    for(const [foot,rootX] of [[a,hipX+d.hip*.42],[b,hipX-d.hip*.42]]){
      const vertical=Math.sqrt(Math.max(1,(d.leg-.1)**2-(foot[0]-rootX)**2));
      hipY=Math.max(hipY,foot[1]-vertical);
    }
  }
  const shoulderY=hipY-d.torso+Math.sin(time*2.4)*.45*(1-motion);
  let sx=hipX+lean;
  if(h.attack?.kind==='punch'){
    const vertical=-54-(shoulderY+4),horizontal=Math.sqrt(Math.max(1,(d.arm-.15)**2-vertical**2));
    sx=mix(sx,Math.max(sx,54-horizontal-d.shoulder*.82),extension);
  }
  const arms=[twoBone([sx+d.shoulder*.82,shoulderY+4],handA,d.arm*.48,d.arm*.52,1),twoBone([sx-d.shoulder*.82,shoulderY+4],handB,d.arm*.48,d.arm*.52,-1)];
  const legs=[twoBone([hipX+d.hip*.42,hipY],a,d.leg*.5,d.leg*.5,-1),twoBone([hipX-d.hip*.42,hipY],b,d.leg*.5,d.leg*.5,1)];
  const cape=[[sx-(front?0:d.shoulder*.65),shoulderY+1]];
  for(let i=1;i<=8;i++){
    const wind=front?.05:-.2-Math.min(.85,Math.abs(h.vx||0)/350);
    let angle=wind+Math.sin(time*4.2-i*.55)*(.08+i*.014);
    if(!h.grounded)angle-=Math.min(.35,Math.abs(h.vy||0)/1200);
    const last=cape.at(-1),len=CAPE_LENGTH/8;
    // Bend the cloth along the floor instead of shortening it or letting it clip.
    if(h.grounded&&last[1]+Math.cos(angle)*len>-4)angle=-Math.acos(clamp((-4-last[1])/len,-1,1));
    cape.push([last[0]+Math.sin(angle)*len,last[1]+Math.cos(angle)*len]);
  }
  return {d,state,grounded:h.grounded,arms,legs,hip:[hipX,hipY],shoulder:[sx,shoulderY],head:[sx,shoulderY-20*d.head],cape,rotation,opacity,extension,front};
}
