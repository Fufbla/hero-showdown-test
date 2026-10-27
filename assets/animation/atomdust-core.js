/* Visual joints only. The original atomSkeleton and atomHand remain authoritative. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HealthiaAtomdustCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 const ease=x=>{const q=clamp(x);return q*q*(3-2*q);};
 const copy=j=>Object.fromEntries(Object.entries(j).map(([k,p])=>[k,[...p]]));
 const mix=(a,b,q)=>Object.fromEntries(Object.keys(a).map(k=>[k,[a[k][0]+(b[k][0]-a[k][0])*q,a[k][1]+(b[k][1]-a[k][1])*q]]));
 // Contact / down / passing / lift, followed by the opposite leg.
 const walk=[
  [50,0,-50,8,10,30], [20,0,-28,32,6,42], [-10,0,5,44,-4,35], [-38,0,40,20,-8,25],
  [-50,8,50,0,-10,30], [-28,32,20,0,-6,42], [5,44,-10,0,4,35], [40,20,-38,0,8,25]
 ];
 function walkSample(stride){const phase=((stride%1)+1)%1*8,i=Math.floor(phase),q=ease(phase-i);return walk[i].map((v,k)=>v+(walk[(i+1)%8][k]-v)*q);}
 function solveKnee(hip,foot,baseHip,baseKnee,baseFoot,side){
  const a=Math.hypot(baseKnee[0]-baseHip[0],baseKnee[1]-baseHip[1]),b=Math.hypot(baseFoot[0]-baseKnee[0],baseFoot[1]-baseKnee[1]);
  const dx=foot[0]-hip[0],dy=foot[1]-hip[1],d=Math.max(.001,Math.hypot(dx,dy));
  const along=clamp((a*a-b*b+d*d)/(2*d),0,d),height=Math.sqrt(Math.max(0,a*a-along*along));
  return [hip[0]+dx/d*along-dy/d*height*side,hip[1]+dy/d*along+dx/d*height*side];
 }
 function label(p){
  if(p.victory)return 'defeated';if(p.disperse>0)return 'disperse / reform';if(p.breakout)return 'counter';
  if(p.hitstun>0)return p.hitStrength>.8?'heavy hit':'hit recoil';if(p.guard>0)return 'guard';
  if(p.state==='idle')return p.moving?'walk':'idle';
  const names={punch:'debris punch',kick:'scatter kick',jumpkick:'jump kick',smoke:'toxic smoke',caps:'sharp caps'};
  return (names[p.type]||'guard')+' '+(p.state==='warn'?'windup':p.state==='recover'?'recovery':p.type==='caps'?'volley':p.type==='smoke'?(p.age<.18?'ready':'release'):(p.age<(p.type==='jumpkick'?.35:.22)?'approach':'follow-through'));
 }
 function joints(original,base,p){
  const J=copy(original);
  if(p.victory||p.disperse>0||p.breakout||p.guard>0)return J;
  if(p.hitstun>0){
   const q=clamp(p.hitstun/.14)*(p.hitStrength||.6);
   for(const k of ['neck','head','bs','fs']){J[k][0]-=q*10;J[k][1]-=q*3;}
   J.be=solveKnee(J.bs,J.bh,base.bs,base.be,base.bh,1);J.fe=solveKnee(J.fs,J.fh,base.fs,base.fe,base.fh,-1);
   return J;
  }
  if(p.state==='idle'){
   const breathing=Math.sin(p.time*2.4)*3;
   for(const k of ['hip','neck','head','bs','fs','be','fe','bh','fh','bl','fl'])J[k]=[base[k][0],base[k][1]+breathing];
   J.bf=[...base.bf];J.ff=[...base.ff];J.bk=[...base.bk];J.fk=[...base.fk];
   if(p.walkWeight>0){
    const W=copy(base),[fx,fy,bx,by,hx,hy]=walkSample(p.stride);
    for(const k of ['hip','neck','head','bs','fs','bl','fl']){W[k][0]+=hx;W[k][1]+=hy;}
    W.ff=[base.ff[0]+fx,base.ff[1]-fy];W.bf=[base.bf[0]+bx,base.bf[1]-by];
    W.fk=solveKnee(W.fl,W.ff,base.fl,base.fk,base.ff,-1);W.bk=solveKnee(W.bl,W.bf,base.bl,base.bk,base.bf,1);
    W.fh=[base.fh[0]-fx*.35+hx,base.fh[1]+hy*.4];W.bh=[base.bh[0]-bx*.35+hx,base.bh[1]+hy*.4];
    W.fe=solveKnee(W.fs,W.fh,base.fs,base.fe,base.fh,-1);W.be=solveKnee(W.bs,W.bh,base.bs,base.be,base.bh,1);
    return mix(J,W,ease(p.walkWeight));
   }
   return J;
  }
  if(p.state==='warn'){
   const duration=p.type==='smoke'?.78:p.type==='caps'?.65:p.type==='jumpkick'?.82:.57,q=ease(1-p.timer/duration);
   const crouch=p.type==='jumpkick'?30:p.type==='kick'?12:7;
   for(const k of ['hip','bl','fl'])J[k][1]+=q*crouch;
   for(const k of ['neck','head','bs','fs']){J[k][0]-=q*9;J[k][1]+=q*(crouch*.55-4);}
  }else if(p.state==='attack'){
   const impact=p.type==='jumpkick'?.35:.22;
   const q=p.age<impact?ease(p.age/impact):1-ease((p.age-impact)/Math.max(.01,p.duration-impact));
   let lean=p.type==='punch'?18*q:p.type==='kick'||p.type==='jumpkick'?-8*q:p.type==='smoke'?8*ease(p.age/.18)*ease(p.timer/.2):0;
   if(p.type==='caps'&&p.volley>0){const fired=[.14,.30,.46][Math.min(3,p.volley)-1],elapsed=p.age-fired;lean=elapsed>=0?-10*(1-ease(elapsed/.13)):0;}
   for(const k of ['neck','head','bs','fs'])J[k][0]+=lean;
   if(p.type==='jumpkick')J.head[1]-=q*5;
  }
  // Hands and the kicking foot stay exactly where the existing collision and
  // projectile calculations place them. Elbows/knees flex around those points.
  J.fh=[...original.fh];J.bh=[...original.bh];J.ff=[...original.ff];J.bf=[...original.bf];
  J.fe=solveKnee(J.fs,J.fh,base.fs,base.fe,base.fh,-1);J.be=solveKnee(J.bs,J.bh,base.bs,base.be,base.bh,1);
  J.fk=solveKnee(J.fl,J.ff,base.fl,base.fk,base.ff,-1);J.bk=solveKnee(J.bl,J.bf,base.bl,base.bk,base.bf,1);
  return J;
 }
 function interpolate(previous,current,alpha,locked){
  if(locked||!previous||previous.face!==current.face||previous.state!==current.state||Math.abs(previous.x-current.x)>80)return {...current};
  const q=clamp(alpha);return {...current,x:previous.x+(current.x-previous.x)*q,stride:previous.stride+(current.stride-previous.stride)*q};
 }
 return Object.freeze({joints,label,walkSample,mix,interpolate,clamp,ease});
});
