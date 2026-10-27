/* Bushman presentation follows the native action age and released flag. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HealthiaBushmanMotionCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
 const fraction=n=>((n%1)+1)%1;
 const draw=(frame,state,extra={})=>({frame,state,...extra});
 function pose(p){
  if(p.victory)return draw(7,'defeated',{legacy:true});
  if(p.breakout)return draw(0,'ember counter',{legacy:true});
  if(p.recoil>0||p.hitstun>0){
   const age=Math.max(0,(p.reactionDuration||.27)-p.recoil);
   return draw(p.heavy?(age<.10?13:age<.21?14:15):(age<.16?12:15),p.heavy?'heavy hit':'light hit');
  }
  if(p.guard>0||p.guarding)return draw(11,'guard');
  if(p.action){
   const a=p.action,s=p.attack,kind=a.kind,activeEnd=s.windup+s.active,after=a.age-s.windup-s.contact;
   if(a.age>=activeEnd){
    const age=a.age-activeEnd;
    const end=kind==='punch'?19:kind==='kick'?23:kind==='blast'?31:27;
    return draw(age<.18?end:age<.34?15:8,kind+' recovery');
   }
   if(!a.released){
    const q=clamp(a.age/s.windup),ready=a.age>=s.windup;
    if(kind==='punch')return draw(q<.55?16:17,ready?'punch ready':'punch windup');
    if(kind==='kick')return draw(q<.64?20:21,ready?'kick ready':'kick windup');
    if(kind==='blast')return draw(q<.45?28:29,ready?'blast ready':'crossed-arm charge');
    return draw(q<.55?24:25,ready?kind+' ready':kind+' windup');
   }
   if(kind==='punch')return draw(after<.14?18:19,after<.14?'punch contact':'punch follow-through',{contact:after<.14});
   if(kind==='kick')return draw(after<.15?22:23,after<.15?'kick contact':'kick retract',{contact:after<.15});
   if(kind==='blast')return draw(30,'crossed-arm blast');
   return draw(after<.14?26:27,after<.14?kind+' release':kind+' follow-through',{emitting:after<.14});
  }
  if(p.moving)return draw(Math.floor(fraction(p.stride)*8),'walk');
  return draw(8+Math.floor(fraction(p.time/2.4)*4),'idle');
 }
 function interpolate(previous,current,alpha,locked){
  if(locked||!previous||previous.face!==current.face||Math.abs(previous.x-current.x)>80||previous.state!==current.state)return {...current};
  const a=clamp(alpha),delta=current.stride-previous.stride;
  return {...current,x:previous.x+(current.x-previous.x)*a,stride:delta>=0&&delta<1?previous.stride+delta*a:current.stride};
 }
 function registration(frame,referenceHeight,p){
  const [x,y,w,h,ax,ay]=frame.crop;
  if((p.contact||p.emitting)&&frame.contact){
   const [px,py,reach,height]=frame.contact,scale=height/(ay-py);
   return {scale,anchor:[px-x+reach/scale,ay-y],contact:[px-x,py-y]};
  }
  return {scale:240/referenceHeight,anchor:[ax-x,ay-y]};
 }
 return Object.freeze({pose,interpolate,registration,clamp});
});
