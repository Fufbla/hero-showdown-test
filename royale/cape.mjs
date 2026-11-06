import {CAPE_LENGTH} from './hero-rig.mjs';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Live Style C uses painted cape tiles, not the older angular-chain renderer.
// Keep inertia outside hero/save state; a WeakMap releases retired renderers.
const paintedCapes=new WeakMap();
export function paintedCapeMotion(owner,h,time,dt=1/60){
 let s=paintedCapes.get(owner);
 if(!s){s={lean:0,lift:0,speed:0,air:0,kick:0,lastVy:h.vy||0,face:h.face||1,time};paintedCapes.set(owner,s);}
 const step=clamp(Number.isFinite(dt)?dt:1/60,0,.05);
 if(!step)return s;
 const face=h.face||1,vx=h.vx||0,vy=h.vy||0,speed=clamp(Math.abs(vx)/400,0,1.3),air=h.grounded?0:1;
 if(face!==s.face){s.lean*=-.45;s.face=face;}
 // Takeoff and double-jump acceleration briefly lift the hem; landing damps it.
 s.kick=clamp(s.kick+(vy-s.lastVy)*.025,-18,18)*Math.exp(-step*7);s.lastVy=vy;
 const blend=1-Math.exp(-step*8),direction=Math.sign(vx*face)||1;
 const lean=-direction*speed*60-air*10;
 const lift=air?clamp(vy*.028,-18,13)+s.kick:0;
 s.lean+=(lean-s.lean)*blend;s.lift+=(lift-s.lift)*blend;
 s.speed+=(speed-s.speed)*blend;s.air+=(air-s.air)*blend;s.time=time;
 return s;
}
export function paintedCapeOffset(s,fraction){
 const t=clamp(fraction,0,1),weight=t*t;
 const wave=Math.sin(s.time*(3+s.speed*5)-t*5)*(1.5+s.speed*5+s.air*2);
 return {x:(s.lean+wave)*weight,y:(s.lift+Math.sin(s.time*4-t*6)*(s.speed+s.air)*2)*weight};
}
// Eight damped angular springs. Cosmetic only: no collision or combat state is read back.
// Exact link lengths avoid stretch, and bending above the floor avoids clipped hems.
export class CapeCloth{
 constructor(){this.angles=null;this.velocity=Array(8).fill(0);this.lastVx=0;this.lastVy=0;this.face=1;}
 advance(p,h,time,dt){
  const desired=p.cape.slice(1).map((v,i)=>Math.atan2(v[0]-p.cape[i][0],v[1]-p.cape[i][1]));
  if(!this.angles||this.face!==h.face){this.angles=desired;this.velocity.fill(0);}
  this.face=h.face;
  const vx=h.vx||0,vy=h.vy||0,airborne=!h.grounded;
  const speed=clamp(Math.abs(vx)/300,0,1),direction=Math.sign(vx)||this.face||1;
  const flutter=Math.sin(time*(3.4+speed*7))* (.018+speed*.065);
  const drift=direction*speed*.28+(airborne?clamp(vy/650,-.18,.2):0);
  const impulse=clamp((vx-this.lastVx)*-.0015+(vy-this.lastVy)*.0006,-.28,.28);
  this.lastVx=h.vx||0;this.lastVy=h.vy||0;
  const steps=Math.max(1,Math.ceil(Math.min(dt,.1)*120)),step=Math.min(dt,.1)/steps;
  for(let n=0;n<steps;n++)for(let i=0;i<8;i++){
    const tip=(i+1)/8;const target=desired[i]+impulse*tip+drift*tip+flutter*tip;
    this.velocity[i]+=(42*(target-this.angles[i])-10*this.velocity[i])*step;
    this.angles[i]+=this.velocity[i]*step;
  }
  const chain=[p.cape[0]],length=CAPE_LENGTH/8;
  for(let i=0;i<8;i++){
    const a=chain.at(-1);let angle=clamp(this.angles[i],-1.7,p.front?.35:-.03);
    if(p.grounded&&a[1]+Math.cos(angle)*length>-4)angle=-Math.acos(clamp((-4-a[1])/length,-1,1));
    chain.push([a[0]+Math.sin(angle)*length,a[1]+Math.cos(angle)*length]);
  }
  return chain;
 }
}
