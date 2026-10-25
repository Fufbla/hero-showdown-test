/* Storm Rooftop: deterministic arena simulation shared by host and renderer. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.HealthiaTempestCore=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const timing=Object.freeze({windup:1.9,cast:.48,sweep:3.35,dissipate:.6,recover:.9});
  const width=1280,margin=220,radius=105;
  const phases=['idle',...Object.keys(timing)];
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  class Hazard {
    constructor(random=Math.random){this.random=random;this.reset();}
    roll(){return clamp(Number(this.random())||0,0,.999999999);}
    reset(){this.state={phase:'idle',age:0,clock:0,wait:6+this.roll()*3,serial:0,direction:1,x:-margin,contacts:{}};}
    begin(){const s=this.state;s.phase='windup';s.age=0;s.serial++;s.direction=this.roll()<.5?1:-1;s.x=s.direction===1?-margin:width+margin;s.contacts={};}
    sweepX(age){const q=clamp(age/timing.sweep,0,1);return this.state.direction===1?-margin+(width+margin*2)*q:width+margin-(width+margin*2)*q;}
    cancel(){if(this.state.phase!=='idle'&&this.state.phase!=='recover'){this.state.phase='recover';this.state.age=0;}}
    // Ignore height and ordinary invulnerability: a jump, dash, or special cannot evade wind.
    // Relative motion catches fighters who cross the tornado between simulation frames.
    contactSweep(from,to,fighters,onContact){
      const s=this.state;
      for(const f of fighters||[]){
        if(!f||f.hp<=0||typeof f.id!=='string'||!Number.isFinite(f.x)||Object.hasOwn(s.contacts,f.id))continue;
        const before=Number.isFinite(f.previousX)?f.previousX:f.x;
        const a=before-from,b=f.x-to;
        if(Math.min(a,b)>radius||Math.max(a,b)<-radius)continue;
        const blocked=f.block===true;
        s.contacts[f.id]=blocked?'blocked':'hit';
        onContact?.({id:f.id,blocked,x:f.x,direction:s.direction,serial:s.serial});
      }
    }
    step(dt,{fighters=[],onContact,onPhase,allowNew=true}={}){
      if(!Number.isFinite(dt)||dt<=0)return;
      dt=Math.min(dt,.25);const s=this.state;s.clock+=dt;
      if(!allowNew)this.cancel();
      let remaining=dt;
      while(remaining>1e-9){
        if(s.phase==='idle'){
          if(!allowNew)return;
          if(s.wait>remaining+1e-9){s.wait-=remaining;return;}
          remaining=Math.max(0,remaining-s.wait);this.begin();onPhase?.(s.phase,s);continue;
        }
        const consumed=Math.min(remaining,Math.max(0,timing[s.phase]-s.age));
        const from=s.x;s.age+=consumed;remaining-=consumed;
        if(s.phase==='sweep'){s.x=this.sweepX(s.age);this.contactSweep(from,s.x,fighters,onContact);}
        if(s.age+1e-9<timing[s.phase])break;
        const old=s.phase;s.age=0;
        if(old==='recover'){s.phase='idle';s.wait=9+this.roll()*6;}
        else s.phase=phases[phases.indexOf(old)+1];
        onPhase?.(s.phase,s);
      }
    }
    snapshot(){return {...this.state,contacts:{...this.state.contacts}};}
    receive(value){
      if(!value||!phases.includes(value.phase)||![1,-1].includes(value.direction))return false;
      if(!['age','clock','wait','serial','x'].every(k=>Number.isFinite(value[k])))return false;
      if(value.age<0||value.clock<0||value.wait<0||value.wait>15||value.x< -margin||value.x>width+margin||!Number.isSafeInteger(value.serial)||value.serial<0)return false;
      if(value.phase!=='idle'&&value.age>timing[value.phase]+.001)return false;
      const contacts={};
      for(const key of ['p0','p1','boss'])if(['blocked','hit'].includes(value.contacts?.[key]))contacts[key]=value.contacts[key];
      this.state={phase:value.phase,age:value.age,clock:value.clock,wait:value.wait,serial:value.serial,direction:value.direction,x:value.x,contacts};
      return true;
    }
  }
  return {Hazard,timing,width,margin,radius};
});
