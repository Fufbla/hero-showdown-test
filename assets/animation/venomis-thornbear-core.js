/* Venomis and Thornbear presentation follows the existing combat and hazard clocks. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HealthiaVenomisThornbearCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
 const fraction=n=>((n%1)+1)%1;
 const draw=(frame,state)=>({frame,state});
 function seedStage(p){
  const volley=p.volley||0,age=1.35-p.timer-volley*.35;
  return volley>=1&&volley<=3&&age>=-1e-8?(age<.1?'release':age<.22?'recoil':'ready'):'ready';
 }
 function vineAge(p){return Number.isFinite(p.vineAge)?p.vineAge:Math.max(0,1.35-p.timer);}
 function bearPose(p){
  if(p.victory)return {frame:p.ending<.14?6:p.ending<.35?7:p.ending<.65?8:9,state:'defeated',legacy:true};
  if(p.breakout){const b=p.breakout;return draw(b.age<b.charge?17:b.age<b.charge+.12?19:b.age<b.charge+.3?20:21,'claw counter');}
  if(p.guard>0)return draw(16,'guard');
  if(p.hitstun>0){const q=clamp(1-p.hitstun/(p.hitDuration||.22));return draw(p.heavy?(q<.36?13:q<.74?14:15):(q<.7?12:15),p.heavy?'heavy hit':'light hit');}
  if(p.state==='idle')return p.moving?draw(Math.floor(fraction(p.stride)*8),'walk'):draw(8+Math.floor(fraction(p.time/2.4)*4),'idle');
  if(p.state==='warn'){
   if(p.type==='seeds')return draw(p.timer>.45?22:23,'flytrap windup');
   if(p.type==='vines')return draw(p.timer>.55?26:27,'vine windup');
   return draw(p.timer>.5?16:17,'claw windup');
  }
  if(p.state==='attack'){
   if(p.type==='swipe')return draw(p.timer>.53?17:p.timer>.4?18:p.timer>.28?19:p.timer>.12?20:21,p.timer>.4?'claw approach':p.timer>.28?'claw contact':'claw follow-through');
   if(p.type==='seeds'){const stage=seedStage(p);return draw(stage==='release'?24:stage==='recoil'?25:23,'flytrap '+stage);}
   if(p.type==='vines'){const age=vineAge(p);return draw(age<.7?27:age<.95?28:age<1.25?29:30,age<.7?'vine marking':age<.95?'vine growth':age<1.25?'vine hold':'vine release');}
  }
  if(p.state==='recover'){
   const age=1.2-p.timer;
   if(p.type==='vines')return draw(age<.18?30:age<.4?31:age<.62?15:8,'vine recovery');
   if(p.type==='seeds')return draw(age<.18?25:age<.38?22:age<.62?15:8,'flytrap recovery');
   return draw(age<.2?21:age<.48?15:8,'claw recovery');
  }
  return draw(8,'idle');
 }
 function trainerPose(p){
  if(p.victory)return {frame:p.ending<.35?4:7,state:'defeated',legacy:true};
  if(p.breakout)return draw(47,'braced for counter');
  // Her follower keeps moving during the bear's attacks and hitstun.
  if(p.trainerMoving)return draw(32+Math.floor(fraction(p.trainerStride)*8),'walk');
  if(p.hitstun>0)return draw(47,'braced reaction');
  if(p.guard>0)return draw(42,'command ready');
  if(p.state==='warn')return draw(p.type==='vines'?(p.timer>.55?44:45):(p.timer>.45?42:43),'command windup');
  if(p.state==='attack'){
   if(p.type==='vines')return draw(vineAge(p)<1.25?45:46,'vine command');
   if(p.type==='seeds')return draw(seedStage(p)==='release'?43:42,'volley command');
   return draw(p.timer>.12?43:46,'claw command');
  }
  if(p.state==='recover'&&p.timer>.65)return draw(46,'command recovery');
  return draw(40+Math.floor(fraction(p.time/2.4)*2),'idle');
 }
 function interpolate(previous,current,alpha,locked){
  if(locked||!previous||previous.face!==current.face||Math.abs(previous.x-current.x)>80||previous.state!==current.state)return {...current};
  const a=clamp(alpha),delta=((current.stride-previous.stride)%1000+1000)%1000;
  return {...current,x:previous.x+(current.x-previous.x)*a,stride:delta<1?previous.stride+delta*a:current.stride};
 }
 return Object.freeze({bearPose,trainerPose,interpolate,clamp});
});
