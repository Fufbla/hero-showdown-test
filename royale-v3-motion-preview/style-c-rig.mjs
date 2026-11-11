// Style C approval rig. Render-only: simulation coordinates and attack clocks
// are inputs; no values are written back to the hero, saves or combat system.
import {sanitizeLook} from './appearance.mjs';
import {ATTACKS} from './core.mjs';
import {animationState,previewHero,PREVIEW_POSES,twoBone,CAPE_LENGTH} from './hero-rig.mjs';
export {animationState,previewHero,PREVIEW_POSES,CAPE_LENGTH};
const PI=Math.PI,TAU=PI*2;
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const ease=t=>{t=clamp(t);return t*t*(3-2*t);};
export function dimensions(raw){
 const l=sanitizeLook(raw),female=l.presentation==='female';
 const b={slender:[14,9.5,7],balanced:[16,11,8.6],strong:[18,12,10],full:[18,15,10.5]}[l.build];
 return {leg:38*l.height*l.legs,arm:30*l.height*l.arms,torso:25*l.height*l.torso,
  shoulder:(b[0]+l.muscle*1.5)*(female?.93:1)*l.shoulders,hip:b[1]*l.hips*(female?1.08:1),
  thick:b[2]+l.muscle,head:l.age==='teen'?1.025:l.age==='older'?.97:1,
  waist:(female?.74:.88)*l.waist,headWidth:17*l.jaw*(l.face==='round'?1.07:l.face==='angular'?1.01:1)};
}
export function attackEnvelope(attack){
 if(!attack)return {extension:0,chamber:0,wind:0};
 const a=ATTACKS[attack.kind],t=attack.age,start=t/a.startup,
  recovery=(t-a.startup-a.active)/(a.duration-a.startup-a.active);
 return {extension:t<a.startup?ease((start-.48)/.52):t<a.startup+a.active?1:1-ease(recovery/.72),
  chamber:t<a.startup?ease(start/.42):t<a.startup+a.active?1:1-ease((recovery-.55)/.45),
  wind:t<a.startup?Math.sin(clamp(start)*PI):0};
}
export function poseFor(raw,h,time,view='game'){
 const d=dimensions(raw),state=animationState(h),front=view!=='game',speed=Math.abs(h.vx||0),
  movement=clamp(speed/80),run=clamp((speed-185)/130),stride=d.leg*mix(.28,.49,run),period=stride*4,
  phase=((h.cycle||0)*52/period)%1;
 // Distance-driven stance: a planted foot's world velocity is exactly zero.
 const step=offset=>{const q=(phase+offset)%1;return q<.5?[mix(stride,-stride,q*2),-4]:
  [mix(-stride,stride,ease((q-.5)*2)),-4-Math.sin((q-.5)*TAU)*mix(9,21,run)];};
 let a=step(0),b=step(.5),hipX=0,hipY=-d.leg*.94-4,lean=run*6*movement;
 a=[mix(10,a[0],movement),mix(-4,a[1],movement)];
 b=[mix(-10,b[0],movement),mix(-4,b[1],movement)];
 hipY+=Math.cos(phase*TAU*2)*mix(.5,1.7,run)*movement;
 let sy=hipY-d.torso;
 let handA=[d.shoulder+7,sy+25],handB=[-d.shoulder-3,sy+25];
 if(movement){const swing=Math.sin(phase*TAU)*mix(11,21,run);
  handA=[d.shoulder*.6-swing,sy+mix(27,15,run)-Math.max(0,-swing)*.21];
  handB=[-d.shoulder*.55+swing,sy+mix(27,15,run)-Math.max(0,swing)*.21];}
 if(!h.grounded){const lift=ease((h.jumpAge??10)/.08),tuck=h.jumps===2?Math.sin(clamp((h.jumpAge||0)/.34)*PI)*12:0;
  a=[mix(a[0],14,lift),mix(a[1],-14-tuck,lift)];b=[mix(b[0],-12,lift),mix(b[1],-7-tuck*.45,lift)];
  handA=[d.shoulder+7,sy+5];handB=[-d.shoulder-6,sy+12];lean=3;
  if(h.vy>0){a[1]=mix(a[1],-7,clamp(h.vy/350));handA[0]+=3;handB[0]-=3;}}
 if(h.flying){a=[7,-16];b=[-11,-8];handA=[d.shoulder+12,sy-2];handB=[-d.shoulder-3,sy+19];lean=6;}
 if((h.castAge??10)<.25){const t=Math.sin(clamp(h.castAge/.25)*PI);handA=[mix(handA[0],43,t),mix(handA[1],-48,t)];lean+=t*3;}
 const land=clamp((h.landing||0)/.13);hipY+=Math.sin(land*PI*.7)*7;
 const {extension,chamber,wind}=attackEnvelope(h.attack);
 const alternate=h.attack?.kind==='punch'&&h.attack.power!=='strength'&&Number.isFinite(h.attack.id)&&h.attack.id%2===0;
 let twist=0;
 if(h.attack?.kind==='punch'){
  twist=(alternate?-1:1)*extension;hipX+=extension*4-wind*2;lean=mix(lean,7,extension)-wind*3;
  handA=[mix(handA[0]-wind*10,54,extension),mix(handA[1]-wind*12,-54,extension)];
  handB=[mix(handB[0],hipX-6,extension),mix(handB[1],sy+4,extension)];
 }else if(h.attack?.kind==='kick'){
  // Keep the original contact target. The compact visual rig shifts the hips,
  // never stretches bones or expands the physical attack box.
  const contactY=-39,kickY=-d.leg*.88-4;
  const reach=Math.sqrt(Math.max(1,(d.leg-.2)**2-(contactY-kickY)**2));
  hipX=mix(hipX,56-d.hip*.46-reach,extension);hipY=mix(hipY,kickY,chamber);lean=mix(lean,-7,chamber);
  a=[mix(mix(a[0],hipX+9,chamber),56,extension),mix(mix(a[1],hipY+6,chamber),contactY,extension)];
  b=[mix(b[0],hipX-d.hip*.46,chamber),-4];
  handA=[mix(handA[0],hipX+d.shoulder+3,chamber),mix(handA[1],sy+1,chamber)];
  handB=[mix(handB[0],hipX-d.shoulder-2,chamber),mix(handB[1],sy+9,chamber)];
  twist=(h.attack.power==='superKick'&&h.attack.comboIndex%2?-1:1)*extension*.85;
 }
 if(state==='hurt'){const f=1-clamp((h.hurtAge||0)/.35);lean=-8*f;handA=[9,hipY-8];handB=[-13,hipY-5];}
 if((h.dodgeAge??10)<.24)lean-=Math.sin(h.dodgeAge/.24*PI)*10;
 let opacity=1,rotation=0;
 if(h.dead){const f=ease((h.defeatAge||0)/.65);hipY=mix(hipY,-17,f);lean=-12*f;a=[mix(a[0],22,f),-4];b=[mix(b[0],-19,f),-4];handA=[14,hipY+5];handB=[-18,hipY+3];rotation=-.16*f;opacity=1-.55*ease(((h.defeatAge||0)-1)/.5);}
 if(state==='respawn'){const f=1-ease(h.respawnAge/.6);hipY+=10*f;lean-=5*f;opacity=1-f*.6;}
 // Lower the body until both planted targets are reachable with fixed bones.
 if(h.grounded)for(const [foot,rootX]of[[a,hipX+d.hip*.46],[b,hipX-d.hip*.46]]){
  hipY=Math.max(hipY,foot[1]-Math.sqrt(Math.max(1,(d.leg-.02)**2-(foot[0]-rootX)**2)));}
 sy=hipY-d.torso+Math.sin(time*2.4)*.65*(1-movement);let sx=hipX+lean;
 if(h.attack?.kind==='punch'){
  const v=-54-(sy+3),reach=Math.sqrt(Math.max(1,(d.arm-.05)**2-v*v));
  sx=mix(sx,Math.max(sx,54-reach-d.shoulder*.84),extension);}
 const arms=[twoBone([sx+d.shoulder*.84,sy+3],handA,d.arm*.48,d.arm*.52,-1),
  twoBone([sx-d.shoulder*.84,sy+3],handB,d.arm*.48,d.arm*.52,1)];
 const legs=[twoBone([hipX+d.hip*.46,hipY],a,d.leg*.5,d.leg*.5,-1),
  twoBone([hipX-d.hip*.46,hipY],b,d.leg*.5,d.leg*.5,front?1:-1)];
 const cape=[[sx-d.shoulder*.55,sy+2]];
 for(let i=1;i<=8;i++){const last=cape[i-1],length=CAPE_LENGTH/8;let angle=(front?-.1:-.25)-Math.min(.95,speed/370)+Math.sin(time*4-i*.55)*(.05+i*.012);
  if(!h.grounded)angle-=clamp(Math.abs(h.vy||0)/1200,0,.3);
  if(h.grounded&&last[1]+Math.cos(angle)*length>-3)angle=-Math.acos(clamp((-3-last[1])/length,-1,1));
  cape.push([last[0]+Math.sin(angle)*length,last[1]+Math.cos(angle)*length]);}
 const footAngles=[0,.5].map(offset=>{const q=(phase+offset)%1;return h.attack?.kind==='kick'?-.08*extension:!h.grounded?.13:q<.5?0:-Math.sin((q-.5)*TAU)*.28*movement;});
 return {d,state,arms,legs,hip:[hipX,hipY],shoulder:[sx,sy],head:[sx+twist*1.1,sy-22*d.head],
  cape,grounded:h.grounded,front,rotation,opacity,extension,twist,alternate,footAngles,
  headTilt:state==='hurt'?-.13:run*.035+Math.sin(time*1.4)*.012*(1-movement),
  hairWind:-clamp(speed/70,0,5)+Math.sin(time*3.6)*.3};
}
