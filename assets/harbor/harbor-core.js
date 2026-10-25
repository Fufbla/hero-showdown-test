/* Toxic Harbor's authoritative, render-independent arena hazard. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.HealthiaHarborCore=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const timing=Object.freeze({windup:1.35,strike:.24,hold:.20,retract:.85});
  const smooth=x=>x*x*(3-2*x);
  class Hazard {
    constructor(random=Math.random){this.random=random;this.reset();}
    reset(){this.state={phase:'idle',age:0,clock:0,wait:5+this.random()*2,x:640,arm:'left',serial:0,lastLane:-1,radius:108,returnFrom:null};}
    begin(){
      const s=this.state,lanes=[180,410,640,870,1100];
      let lane=Math.min(4,Math.floor(this.random()*5));
      if(lane===s.lastLane)lane=(lane+1+Math.floor(this.random()*4))%5;
      s.lastLane=lane;s.x=lanes[lane]+(this.random()-.5)*70;
      s.arm=s.x<640?'left':s.x>640?'right':(this.random()<.5?'left':'right');
      s.phase='windup';s.age=0;s.serial++;s.returnFrom=null;
    }
    pose(){
      const s=this.state,q=timing[s.phase]?Math.min(1,s.age/timing[s.phase]):0;
      if(s.phase==='windup')return {reach:0,lift:smooth(q)};
      if(s.phase==='strike'){const p=q*q;return {reach:p,lift:1-p};}
      if(s.phase==='hold')return {reach:1,lift:0};
      if(s.phase==='retract'){const p=1-smooth(q),from=s.returnFrom||{reach:1,lift:0};return {reach:from.reach*p,lift:from.lift*p};}
      return {reach:0,lift:0};
    }
    cancel(){const s=this.state;if(s.phase==='idle'||s.phase==='retract')return;s.returnFrom=this.pose();s.phase='retract';s.age=0;}
    step(dt,onImpact,allowNew=true){
      if(!Number.isFinite(dt)||dt<=0)return;
      // Every caller advances with a fixed simulation step. Bound catch-up after tab suspension.
      dt=Math.min(dt,.25);const s=this.state;s.clock+=dt;
      if(!allowNew)this.cancel();
      let remaining=dt;
      while(remaining>1e-9){
        if(s.phase==='idle'){
          if(!allowNew)return;
          if(s.wait>remaining+1e-9){s.wait-=remaining;return;}
          remaining=Math.max(0,remaining-s.wait);this.begin();continue;
        }
        const needed=Math.max(0,timing[s.phase]-s.age);
        if(remaining+1e-9<needed){s.age+=remaining;return;}
        remaining=Math.max(0,remaining-needed);
        const old=s.phase;s.age=0;
        if(old==='windup')s.phase='strike';
        else if(old==='strike'){s.phase='hold';onImpact?.({x:s.x,radius:s.radius,serial:s.serial});}
        else if(old==='hold')s.phase='retract';
        else {s.phase='idle';s.wait=7+this.random()*5;s.returnFrom=null;}
      }
    }
    snapshot(){return {...this.state,returnFrom:this.state.returnFrom?{...this.state.returnFrom}:null};}
    receive(s){
      if(!s||!['idle','windup','strike','hold','retract'].includes(s.phase)||!['left','right'].includes(s.arm))return false;
      if(!['age','clock','wait','x','serial','radius','lastLane'].every(k=>Number.isFinite(s[k])))return false;
      if(s.x<100||s.x>1180||s.radius!==108||s.age<0)return false;
      const from=s.returnFrom;
      if(from&&(!Number.isFinite(from.reach)||!Number.isFinite(from.lift)))return false;
      this.state={phase:s.phase,age:s.age,clock:s.clock,wait:s.wait,x:s.x,arm:s.arm,serial:s.serial,lastLane:s.lastLane,radius:108,returnFrom:from?{reach:Math.max(0,Math.min(1,from.reach)),lift:Math.max(0,Math.min(1,from.lift))}:null};
      return true;
    }
  }
  // The marker shows the full hit region. A high jump clears the ground impact.
  function inSlam(fighter,slam,ground){return fighter&&fighter.hp>0&&Math.abs(fighter.x-slam.x)<=slam.radius&&fighter.y>ground-150;}
  return {Hazard,timing,inSlam};
});
