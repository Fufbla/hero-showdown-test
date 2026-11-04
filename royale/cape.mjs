import {CAPE_LENGTH} from './hero-rig.mjs';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Eight damped angular springs. Cosmetic only: no collision or combat state is read back.
// Exact link lengths avoid stretch, and bending above the floor avoids clipped hems.
export class CapeCloth{
 constructor(){this.angles=null;this.velocity=Array(8).fill(0);this.lastVx=0;this.lastVy=0;this.face=1;}
 advance(p,h,time,dt){
  const desired=p.cape.slice(1).map((v,i)=>Math.atan2(v[0]-p.cape[i][0],v[1]-p.cape[i][1]));
  if(!this.angles||this.face!==h.face){this.angles=desired;this.velocity.fill(0);}
  this.face=h.face;const impulse=clamp(((h.vx||0)-this.lastVx)*-.0015+((h.vy||0)-this.lastVy)*.0006,-.28,.28);
  this.lastVx=h.vx||0;this.lastVy=h.vy||0;
  const steps=Math.max(1,Math.ceil(Math.min(dt,.1)*120)),step=Math.min(dt,.1)/steps;
  for(let n=0;n<steps;n++)for(let i=0;i<8;i++){
    const target=desired[i]+impulse*(i+1)/8;
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
