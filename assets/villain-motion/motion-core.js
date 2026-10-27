/* Fighter poses use competitive clocks directly; no native boss AI or timers. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HealthiaVillainMotionCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),mix=(a,b,q)=>a+(b-a)*q,ease=v=>{v=clamp(v);return v*v*(3-2*v);};
 const normal=new Set(['punch','heavyPunch','kick','heavyKick','sweep','uppercut']);
 const frameNames=['guard','takeoff','rise','apex','fall','landing','punch-windup','punch-contact','punch-recovery','kick-windup','kick-contact','kick-recovery','sweep','uppercut','air-punch','air-kick'];
 function phase(action){return !action?'idle':action.age<action.spec.startup?'windup':action.age<action.spec.startup+action.spec.active?'active':'recovery';}
 function pose(f,world={}){
  const a=f.action,p=phase(a),air=f.y<603.9||f.vy<0,k=a?.key,heavy=k?.startsWith('heavy'),time=f.clock||0;
  const progress=a?clamp(p==='windup'?a.age/a.spec.startup:p==='active'?(a.age-a.spec.startup)/a.spec.active:(a.age-a.spec.startup-a.spec.active)/a.spec.recovery):0;
  const v={frame:0,state:'guard',phase:p,progress,air,normal:normal.has(k),key:k,face:a?.face??f.face,time,lean:0,bodyY:0,roll:0,weight:1,landing:f.landing||0,heavy:!!heavy};
  if(f.hp<=0){v.state=air?'air-knockout':'defeat';v.frame=air?4:5;v.roll=-.08-1.17*ease((f.stateTime||0)/.38);v.bodyY=0;v.groundContact=!air;return v;}
  if(f.knockdown>0){const q=clamp(1-f.knockdown/.68);v.state=q<.68?'knockdown':'get-up';v.frame=q<.68?4:5;v.roll=-Math.sin(clamp(q/.8)*Math.PI)*.95;v.bodyY=0;v.groundContact=!air;return v;}
  if(f.stun>0){v.state=air?'air-hit':'hit';v.frame=air?4:6;v.lean=-8*clamp(f.stun/.16);v.roll=-.055*clamp(f.stun/.16);return v;}
  if(v.normal){
   const kick=['kick','heavyKick','sweep'].includes(k),wind=kick?9:6,contact=k==='sweep'?12:k==='uppercut'?13:kick?10:7,recover=kick?11:8;
   if(air){v.frame=p==='windup'&&progress<.72?3:p==='recovery'&&progress>.42?(f.vy>180?4:3):kick?15:14;v.state=kick?'air-kick':'air-punch';}
   else if(p==='windup'){v.frame=progress<.72?wind:recover;v.state=k+' windup';}
   else if(p==='active'){v.frame=contact;v.state=k+' contact';}
   else{v.frame=progress<.38?recover:progress<.68?wind:0;v.state=k+' recovery';}
   const reach=p==='windup'?-ease(progress)*2:p==='active'?mix(3,heavy?10:6,ease(progress)):mix(heavy?10:6,0,ease(progress));
   v.lean=reach;v.bodyY=k==='uppercut'?-Math.sin(progress*Math.PI)*5:k==='sweep'?3:0;return v;
  }
  if(air&&a){v.state='air-ability';v.frame=p==='windup'?3:p==='active'?14:(f.vy>180?4:3);return v;}
  if(air){
   v.frame=time-(f.jumpAt??-10)<.035?1:f.vy<-180?2:f.vy<=180?3:4;v.state=frameNames[v.frame];
   v.roll=clamp(f.vx/600,-.07,.07);return v;
  }
  if(f.landing>0&&!a){v.frame=f.landing>.055?5:0;v.state='landing';v.bodyY=Math.sin(clamp(f.landing/.16)*Math.PI)*3;return v;}
  if(a){v.state='ability';return v;}
  if(f.block||f.guardStun>0){v.state='block';v.frame=6;v.lean=-3;return v;}
  if(f.won){v.state='victory';v.frame=13;return v;}
  if(f.dashTime>0){v.state='dash';v.frame=1;v.roll=.09;return v;}
  if(Math.abs(f.vx)>12){v.state='walk';v.step=((f.walk||0)%1+1)%1;v.bodyY=Math.sin(v.step*Math.PI*4)*1.4;return v;}
  v.bodyY=Math.sin(time*2.3)*.8;return v;
 }
 return Object.freeze({pose,phase,frameNames,normal,clamp,mix,ease});
});
