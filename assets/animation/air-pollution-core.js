/* Presentation only: the original controller owns every hit and hazard. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HealthiaAirPollutionCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),fraction=n=>((n%1)+1)%1;
 const pose=(frame,state,extra={})=>({frame,state,...extra});
 function select(p){
  if(p.victory)return pose(0,'dissipating',{legacy:true});
  if(p.breakout)return pose(0,'smoke counter',{legacy:true});
  if(p.hitstun>0)return pose(p.heavy?15:14,p.heavy?'heavy hit':'light hit');
  if(p.guard>0)return pose(10,'guard');
  if(p.state==='warn'){
   if(p.type==='storm')return pose(12,'storm charge');
   const duration=p.type==='cloud'?1.1:p.phase===1?1.05:.78,q=clamp(1-p.timer/duration);
   return p.type==='cloud'?pose(q<.2?1:10,'cloud charge',{mouth:true}):pose(q<.2?0:7,'punch windup');
  }
  if(p.state==='attack'){
   if(p.type==='punch')return !p.struck?pose(7,'punch ready'):pose(p.timer>.14?8:9,p.timer>.14?'punch contact':'punch follow-through');
   if(p.type==='cloud')return pose(11,p.struck?'cloud release':'cloud channel',{mouth:true});
   if(p.type==='storm')return pose(p.liveStorm?13:12,p.liveStorm?'storm impact':'storm gather');
  }
  if(p.state==='recover')return pose(p.timer>(p.phase===1?1.2:.95)-.3?9:2,'recovery');
  if(p.moving)return pose(3+Math.floor(fraction(p.stride)*4),'glide');
  return pose(Math.floor(fraction(p.time/2.4)*3),'hover');
 }
 function interpolate(previous,current,alpha,locked){
  if(locked||!previous||previous.face!==current.face||previous.state!==current.state||Math.abs(previous.x-current.x)>80)return {...current};
  const a=clamp(alpha),delta=current.stride-previous.stride;
  return {...current,x:previous.x+(current.x-previous.x)*a,stride:delta>=0&&delta<1?previous.stride+delta*a:current.stride};
 }
 function registration(frame,height,referenceHeight,p){
  const [x,y,w,h,ax,ay]=frame.crop,scale=height/referenceHeight;
  if(p.mouth&&frame.mouth){const [mx,my]=frame.mouth;return {scale,anchor:[mx-x+84/scale,my-y+215/scale],mouth:[mx-x,my-y]};}
  return {scale,anchor:[ax-x,ay-y]};
 }
 return Object.freeze({pose:select,interpolate,registration,clamp});
});
