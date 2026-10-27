/* Wastelander presentation only. Combat timers remain the source of truth. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.HealthiaWastelanderCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
 const fraction=n=>((n%1)+1)%1;
 const at=(frames,q)=>frames[Math.min(frames.length-1,Math.floor(clamp(q)*frames.length))];
 const draw=(frame,state,pour=false)=>({frame,state,pour,legacy:false});
 function pose(p){
  if(p.victory){
   // Keep the four approved collapse drawings and their original ground contacts.
   return {frame:p.ending<.18?8:p.ending<.42?9:p.ending<.68?10:11,state:'defeated',pour:false,legacy:true};
  }
  if(p.breakout){
   return draw(p.breakout.age<p.breakout.charge?14:26,'counterattack');
  }
  if(p.guard>0)return draw(p.guard>.12?12:15,'guard');
  if(p.react>0&&(p.hitstun>0||p.state==='idle'&&!p.moving)){
   const q=1-p.react/(p.reactDuration||.4);
   return draw(at(p.heavy?[13,14,15,8]:[12,15,8],q),p.heavy?'heavy hit':'light hit');
  }
  if(p.state==='idle'){
   return p.moving?draw(Math.floor(fraction(p.stride)*8),'walk'):draw(8+Math.floor(fraction(p.time/2.4)*4),'idle');
  }
  if(p.state==='warn'){
   const age=(p.type==='mallet'?1.15:1)-p.timer;
   if(p.type==='mallet')return draw(age<.2?16:age<.57?17:18,'mallet windup');
   if(p.type==='trash')return draw(age<.38?24:25,'throw windup');
   return draw(age<.55?28:29,'acid windup');
  }
  if(p.state==='attack'){
   if(p.type==='mallet'){
    // Damage occurs at timer <= .4; never show the impact drawing early.
    return draw(p.timer>.67?18:p.timer>.5?32:p.timer>.4?33:p.timer>.27?20:p.timer>.12?19:21,p.timer>.4?'mallet swing':'mallet impact');
   }
   if(p.type==='trash'){
    const age=1.45-p.timer,shotCount=p.phase===3?3:2;
    if(age<.36-1e-9)return draw(25,'throw ready');
    const shot=Math.min(shotCount,Math.floor((age+1e-9)/.36)),since=age-shot*.36;
    return draw(since<.09?26:since<.2?27:shot<shotCount?(since<.29?24:25):8,since<.09?'throw release':'throw recovery');
   }
   const pour=p.timer<=.65&&p.timer>.16;
   return draw(p.timer>.82?28:p.timer>.65?29:pour?30:31,pour?'acid pour':'acid recovery',pour);
  }
  if(p.state==='recover'){
   const age=(p.type==='mallet'?1.4:1.15)-p.timer;
   if(p.type==='mallet')return draw(age<.12?21:age<.32?22:age<.56?23:age<.76?15:8,'mallet recovery');
   if(p.type==='trash')return draw(age<.18?27:age<.36?15:8,'throw recovery');
   return draw(age<.27?31:age<.48?28:age<.66?15:8,'acid recovery');
  }
  return draw(8,'idle');
 }
 function renderX(previous,current,alpha,locked){
  if(locked||!previous||previous.face!==current.face||Math.abs(previous.x-current.x)>80)return current.x;
  return previous.x+(current.x-previous.x)*clamp(alpha);
 }
 return Object.freeze({pose,renderX,clamp,walkFrames:8,addedDrawings:34});
});
