/* Presentation only. Seconds and combat phase boundaries are authoritative. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.HealthiaMotionCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
 const phase=v=>((v%1)+1)%1;
 function sample(frames,p){return frames[Math.min(frames.length-1,Math.floor(clamp(p,0,1)*frames.length))];}
 function attackPhase(a){return a.elapsed<a.startup?'startup':a.elapsed<a.startup+a.active?'active':'recovery';}
 // A rendering clip can gain drawings without changing startup/active/recovery.
 function attackPose(a,link=false){
  const stage=attackPhase(a),e=a.elapsed,s=a.startup,end=s+a.active;
  if(a.key==='sweep'){
   if(stage==='startup')return sample([20,21],e/s);
   if(stage==='active')return 22;
   return sample([21,23,115,108],(e-end)/(a.duration-end));
  }
  if(a.key==='uppercut'){
   if(stage==='startup')return sample([24,25],e/s);
   if(stage==='active')return e<s+a.active*.3?25:26;
   return sample([25,27,115,108],(e-end)/(a.duration-end));
  }
  if(a.kick){
   if(stage==='startup')return sample(link?[112,113,10,11]:[115,113,10,11],e/s);
   if(stage==='active')return 12; // exact original contact art and hitbox
   return sample([114,113,115,108],(e-end)/(a.duration-end));
  }
  if(stage==='startup')return sample([108,7,8],e/s);
  if(stage==='active')return 9; // exact original contact art and hitbox
  return sample(link?[8,112,113]:[8,7,111,108],(e-end)/(a.duration-end));
 }
 const WALK=[1,100,2,3,101,4,102,5,6,103];
 function pose(p){
  if(p.attack)return attackPose(p.attack,p.link);
  switch(p.state){
   case 'walk':return WALK[Math.floor(phase(p.cycle)*WALK.length+1e-8)%WALK.length];
   case 'run':return 124+Math.floor(phase(p.cycle)*4);
   case 'dash-forward':return p.dash<.12?16:p.dash<.8?sample([124,125,126,127],(p.dash-.12)/.68):115;
   case 'dash-back':return p.dash<.22?18:p.dash<.8?19:p.dash<.92?111:108;
   case 'idle':return 120+Math.floor(phase(p.idle/2.4)*4);
   case 'block':return p.age<.045?108:109;
   case 'guard-hit':return p.guard>.07?110:111;
   case 'jump':return p.age<1/60?104:105;
   case 'fall':return 106;
   case 'land':return p.landing>.045?107:115;
   case 'hit':return sample([13,132,111],clamp(p.age/.24,0,1));
   case 'knockdown':return p.knockdown>.69?132:p.knockdown>.55?133:134;
   case 'recover':return p.knockdown>.12?134:135;
   case 'victory':return 120+Math.floor(phase(p.ending/2.4)*4);
   case 'defeat':return p.ending<.16?132:p.ending<.38?134:14;
   case 'special':
    // The three powers have different durations. Vee repeats her strike for
    // each blitz pass; Sadie returns to guard after her longer heavy recovery.
    if(p.heroIndex===2){
     if(p.special>=.85)return p.special<.96?131:108;
     const tick=phase(p.special/.17)*.17;
     return tick<.045?128:tick<.08?129:130;
    }
    if(p.heroIndex===1)return p.special<.08?128:p.special<.12?129:p.special<.46?130:p.special<.68?129:p.special<.86?131:108;
    return p.special<.075?128:p.special<.13?129:p.special<.46?130:131;
   default:return p.fallback;
  }
 }
 // No extrapolation, smoothing of hitboxes, face scaling, limb morphing or body crossfade.
 function renderPosition(previous,current,alpha,locked){
  if(!previous||locked||previous.face!==current.face||Math.abs(current.x-previous.x)>80||Math.abs(current.y-previous.y)>80)return {x:current.x,y:current.y};
  alpha=clamp(alpha,0,1);
  return {x:previous.x+(current.x-previous.x)*alpha,y:previous.y+(current.y-previous.y)*alpha};
 }
 return Object.freeze({clamp,smooth,phase,sample,attackPhase,attackPose,pose,renderPosition,WALK:Object.freeze(WALK)});
});
