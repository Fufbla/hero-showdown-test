/* Styrodog presentation only. Combat timers determine all contact poses. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HealthiaStyrodogCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
 const fraction=n=>((n%1)+1)%1;
 const poseAt=(frames,q)=>frames[Math.min(frames.length-1,Math.floor(clamp(q)*frames.length))];
 const draw=(frame,state,lift=0)=>({frame,state,lift});
 function pose(p){
  if(p.victory)return {frame:p.ending<.13?6:p.ending<.32?7:p.ending<.56?8:9,state:'defeated',legacy:true,lift:0};
  if(p.breakout){const b=p.breakout;return draw(b.age<b.charge?16:b.age<b.charge+.12?19:b.age<b.charge+.3?20:21,'counterattack');}
  if(p.guard>0)return draw(16,'guard');
  // A recoil cannot cover a resumed attack after authoritative hitstun expires.
  if(p.hitstun>0){
   const q=clamp(1-p.hitstun/(p.hitDuration||.22));
   return draw(poseAt(p.heavy?[13,14,15]:[12,12,15],q),p.heavy?'heavy hit':'light hit');
  }
  if(p.state==='idle')return p.moving?draw(Math.floor(fraction(p.stride)*8),'walk'):draw(8+Math.floor(fraction(p.time/2.4)*4),'idle');
  if(p.state==='warn'){
   if(p.type==='slam')return draw(p.timer>.4?22:23,'slam windup');
   if(p.type==='roar')return draw(p.timer>.4?28:29,'roar windup');
   return draw(p.timer>.55?16:17,'claw windup');
  }
  if(p.state==='attack'){
   if(p.type==='claw'){
    if(p.timer>.38)return draw(p.timer>.56?17:18,'claw swing');
    return draw(p.timer>.28?19:p.timer>.13?20:21,p.timer>.28?'claw impact':'claw follow-through');
   }
   if(p.type==='slam'){
    if(p.timer>.53){
     const q=clamp((.95-p.timer)/.42),lift=-Math.sin(q*Math.PI)*48;
     return draw(q<.22?23:q<.66?24:25,q<.66?'slam rise':'slam descend',lift);
    }
    return draw(p.timer>.22?26:27,p.timer>.22?'slam impact':'slam follow-through');
   }
   if(p.type==='roar'){
    const age=1.5-p.timer,shot=Math.min(3,Math.floor(age/.4)),since=age-shot*.4;
    if(shot===0)return draw(29,'roar ready');
    return draw(since<.10?30:since<.23?31:shot<3?29:31,since<.10?'roar release':'roar recovery');
   }
  }
  if(p.state==='recover'){
   const age=(p.type==='slam'?1.35:1.05)-p.timer;
   if(p.type==='slam')return draw(age<.2?27:age<.43?22:age<.63?15:8,'slam recovery');
   if(p.type==='roar')return draw(age<.2?31:age<.42?28:8,'roar recovery');
   return draw(age<.16?21:age<.38?15:8,'claw recovery');
  }
  return draw(8,'idle');
 }
 function interpolate(previous,current,alpha,locked){
  if(locked||!previous||previous.face!==current.face||Math.abs(previous.x-current.x)>80||previous.state!==current.state)return {...current};
  const a=clamp(alpha),delta=((current.stride-previous.stride)%1000+1000)%1000;
  return {...current,x:previous.x+(current.x-previous.x)*a,stride:delta<1?previous.stride+delta*a:current.stride};
 }
 return Object.freeze({pose,interpolate,clamp});
});
