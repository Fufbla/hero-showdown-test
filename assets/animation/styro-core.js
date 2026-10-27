/* Dr. Styro presentation. Gameplay clocks and contacts remain authoritative. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HealthiaStyroCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
 const fraction=n=>((n%1)+1)%1;
 const at=(frames,q)=>frames[Math.min(frames.length-1,Math.floor(clamp(q)*frames.length))];
 const draw=(frame,state)=>({frame,state});
 function pose(p){
  if(p.victory)return {frame:p.ending<.16?8:p.ending<.38?9:p.ending<.62?10:11,state:'defeated',legacy:true};
  if(p.breakout)return draw(p.breakout.age<p.breakout.charge?28:29,'counterattack');
  if(p.guard>0)return draw(16,'guard');
  // Recovery art must not hide a resumed strike after the shorter hitstun ends.
  if(p.react>0&&(p.hitstun>0||p.state==='idle'&&!p.moving)){
   const q=1-p.react/(p.reactDuration||.38);
   return draw(at(p.heavy?[13,14,15,8]:[12,15,8],q),p.heavy?'heavy hit':'light hit');
  }
  if(p.state==='idle')return p.moving?draw(Math.floor(fraction(p.stride)*8),'walk'):draw(8+Math.floor(fraction(p.time/2.4)*4),'idle');
  if(p.state==='warn'){
   const duration=p.type==='double'?1.45:p.type==='spikes'?1:.85,age=duration-p.timer;
   if(p.type==='double')return draw(age<.3?28:age<.75?29:30,'split windup');
   if(p.type==='spikes')return draw(age<.48?24:25,'spike windup');
   return draw(age<.22?16:17,'crush windup');
  }
  if(p.state==='attack'){
   if(p.type==='spikes'){
    const age=1.4-p.timer;
    // Exactly the same floor as the volley logic: never anticipate a projectile.
    const shot=Math.min(3,Math.floor(age/.34)),since=age-shot*.34;
    if(shot===0)return draw(25,'spike ready');
    return draw(since<.09?26:since<.2?27:shot<3?25:31,since<.09?'spike release':'spike recovery');
   }
   const contact=p.type==='double'?.42:.38;
   if(p.timer>contact)return draw(p.type==='double'?(p.timer>.64?30:18):(p.timer>.52?17:18),p.type==='double'?'double swing':'crush swing');
   return draw(p.timer>contact-.10?19:p.timer>.16?20:21,p.type==='double'?'double impact':'crush impact');
  }
  if(p.state==='recover'){
   const age=(p.type==='double'?1.65:1.15)-p.timer;
   if(p.type==='spikes')return draw(age<.16?27:age<.35?31:age<.55?15:8,'spike recovery');
   if(p.type==='double')return draw(age<.12?21:age<.3?22:age<.65?31:age<.85?15:8,'merge recovery');
   return draw(age<.10?21:age<.28?22:age<.48?23:age<.66?15:8,'crush recovery');
  }
  return draw(8,'idle');
 }
 function renderX(previous,current,alpha,locked){
  if(locked||!previous||previous.face!==current.face||Math.abs(previous.x-current.x)>80)return current.x;
  return previous.x+(current.x-previous.x)*clamp(alpha);
 }
 return Object.freeze({pose,renderX,clamp,walkFrames:8,addedDrawings:32});
});
