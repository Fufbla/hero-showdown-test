/* Presentation only: the original Spree controller owns every timer and beam. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HealthiaLighteningSpreeCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
 const draw=(frame,state,extra={})=>({frame,state,...extra});
 function pose(p){
  if(p.victory)return draw(5,'shatter',{legacy:true});
  if(p.hidden>0)return draw(null,'invisible',{hidden:true});
  if(p.breakout)return draw(0,'prism counter',{legacy:true});
  if(p.hitstun>0)return draw(p.heavy?15:14,p.heavy?'heavy hit':'light hit');
  if(p.guard>0)return draw(3,'guard');
  if(Number.isFinite(p.arrivalAge)&&p.arrivalAge<.16)return draw(p.arrivalAge<.07?12:13,'reappear');
  const spark=p.type==='spark';
  if(p.state==='warn'){
   const q=clamp(1-p.timer/p.duration);
   return draw(spark?(q<.55?8:9):(q<.5?4:5),spark?'spark charge':'beam charge');
  }
  if(p.state==='attack'){
   // Beams keep ageing during hitstun; use their live presence, not a visual timer.
   if(p.liveBeams>0)return draw(spark?10:6,spark?'spark release':'beam release',{emitting:true});
   if(!p.struck)return draw(spark?9:5,spark?'spark ready':'beam ready');
   if(spark&&p.phase===3&&p.volley===0)return draw(9,'second spark ready');
   return draw(spark?11:7,spark?'spark follow-through':'beam follow-through');
  }
  if(p.state==='recover'){
   const age=(p.phase===3?.9:1.25)-p.timer;
   return draw(age<.20?(spark?11:7):age<.38?(spark?8:4):age<.56?13:0,spark?'spark recovery':'beam recovery');
  }
  const cycle=((p.time%2.4)+2.4)%2.4;
  return draw([0,1,2,1][Math.floor(cycle/.6)],'idle',{breathe:1+Math.sin(p.time*Math.PI/1.2)*.004});
 }
 function registration(frame,referenceHeight,emitting,type){
  const [x,y,w,h,ax,ay]=frame.crop;
  if(emitting&&frame.emitter){
   const [px,py]=frame.emitter,height=type==='spark'?229:248,reach=type==='spark'?142:151;
   const scale=height/(ay-py);
   return {scale,anchor:[px-x-reach/scale,ay-y],emitter:[px-x,py-y]};
  }
  return {scale:350/referenceHeight,anchor:[ax-x,ay-y]};
 }
 return Object.freeze({pose,registration,clamp});
});
