/* Sonic Tusk presentation. Attack poses use the existing combat clock. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HealthiaSonicTuskCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
 const fraction=n=>((n%1)+1)%1;
 const draw=(frame,state)=>({frame,state});
 function pose(p){
  if(p.victory)return {frame:p.ending<.14?6:p.ending<.34?7:p.ending<.62?8:9,state:'defeated',legacy:true};
  if(p.breakout){const b=p.breakout;return draw(b.age<b.charge?17:b.age<b.charge+.12?19:b.age<b.charge+.3?20:21,'sonic counter');}
  if(p.guard>0)return draw(16,'guard');
  if(p.hitstun>0){
   const q=clamp(1-p.hitstun/(p.hitDuration||.22));
   return draw(p.heavy?(q<.36?13:q<.74?14:15):(q<.7?12:15),p.heavy?'heavy hit':'light hit');
  }
  if(p.state==='idle')return p.moving?draw(Math.floor(fraction(p.stride)*8),'walk'):draw(8+Math.floor(fraction(p.time/2.4)*4),'idle');
  if(p.state==='warn'){
   if(p.type==='stomp')return draw(p.timer>.65?22:p.timer>.25?23:24,'stomp windup');
   if(p.type==='blast')return draw(p.timer>.55?28:29,'horn charge');
   return draw(p.timer>.6?16:p.timer>.25?17:18,'pulse windup');
  }
  if(p.state==='attack'){
   if(p.type==='pulse')return draw(p.timer>.56?18:p.timer>.44?19:p.timer>.22?20:21,p.timer>.56?'pulse ready':p.timer>.44?'pulse release':'pulse follow-through');
   if(p.type==='stomp')return draw(p.timer>.5?(p.timer>.76?24:25):p.timer>.26?26:27,p.timer>.5?'stomp descend':p.timer>.26?'stomp impact':'stomp follow-through');
   // The original cone is already harmful while it grows. Keep an emitting
   // pose for its entire active interval; anticipation belongs to warn.
   if(p.type==='blast')return draw(30+(Math.floor(Math.max(0,1.3-p.timer)/.14)%2),'horn blast');
  }
  if(p.state==='recover'){
   const age=(p.type==='blast'?1.5:1.15)-p.timer;
   if(p.type==='stomp')return draw(age<.18?27:age<.38?22:age<.6?15:8,'stomp recovery');
   if(p.type==='blast')return draw(age<.2?29:age<.42?28:age<.65?15:8,'horn recovery');
   return draw(age<.2?21:age<.44?15:8,'pulse recovery');
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
