/* Presentation clocks only. Competitive combat owns all contacts and projectiles. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HealthiaCompetitiveAnimationState=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),mix=(a,b,p)=>a+(b-a)*p;
  const types={air:{punch:'punch',kick:'punch',shoot:'punch',skill:'cloud',special:'storm'},styrodog:{punch:'claw',kick:'slam',shoot:'roar',skill:'slam',special:'roar'},sonic:{punch:'pulse',kick:'stomp',shoot:'pulse',skill:'stomp',special:'blast'},venomis:{punch:'swipe',kick:'swipe',shoot:'seeds',skill:'vines',special:'swipe'},styro:{punch:'punch',kick:'punch',shoot:'spikes',skill:'spikes',special:'double'},wastelander:{punch:'mallet',kick:'mallet',shoot:'trash',skill:'acid',special:'mallet'},atomdust:{punch:'punch',kick:'kick',shoot:'caps',skill:'smoke',special:'caps'},spree:{punch:'beam',kick:'spark',shoot:'beam',skill:'spark',special:'beam'},bushman:{punch:'punch',kick:'kick',shoot:'fireball',skill:'scorch',special:'blast'}};
  // Native warning duration, first contact timer, end timer, recovery duration.
  const clocks={
    air:{punch:[1.05,.28,.01,1.2],cloud:[1.1,.6,.01,1.2],storm:[1.1,.7,.01,1.2]},
    styrodog:{claw:[.9,.37,.01,1.05],slam:[1,.50,.01,1.35],roar:[1,1.1,.8,1.05]},
    sonic:{pulse:[1,.54,.01,1.15],stomp:[1,.49,.01,1.15],blast:[1.3,.8,.01,1.5]},
    venomis:{swipe:[.9,.38,.01,1.2],seeds:[.9,1,.75,1.2],vines:[1.1,.64,.01,1.2]},
    styro:{punch:[.85,.37,.01,1.15],spikes:[1,1.06,.8,1.15],double:[1.45,.41,.01,1.65]},
    wastelander:{mallet:[1.15,.39,.01,1.4],trash:[1,1.09,.85,1.15],acid:[1,.64,.01,1.15]},
    atomdust:{punch:[.57,.33,.01,.7],kick:[.57,.33,.01,.7],caps:[.65,.41,.27,.7],smoke:[.78,.37,.01,.7]},
    spree:{beam:[1,.5,.01,1.25],spark:[1,.5,.01,1.25]},
    bushman:{punch:[1,.5,.01,1],kick:[1,.5,.01,1],fireball:[1,.5,.01,1],scorch:[1,.5,.01,1],blast:[1,.5,.01,1]}
  };
  function phaseOf(f){const a=f.action;return !a?'idle':a.age<a.spec.startup?'windup':a.age<a.spec.startup+a.spec.active?'active':'recovery';}
  function view(f,other,world){
    const a=f.action,p=phaseOf(f),key=a?.key.replace(/^heavy/,'').toLowerCase(),normal=['punch','kick','sweep','uppercut'].includes(key),legacyKey=key==='sweep'?'kick':key==='uppercut'?'punch':key;
    const type=types[f.id]?.[legacyKey]||'punch',clip=clocks[f.id]?.[type]||[1,.5,.01,1];
    const progress=!a?0:clamp(p==='windup'?a.age/a.spec.startup:p==='active'?(a.age-a.spec.startup)/a.spec.active:(a.age-a.spec.startup-a.spec.active)/a.spec.recovery);
    const lastRelease=a?Math.max(0,(a.struck||1)-1)*(a.spec.interval||0):0;
    const releaseProgress=a?clamp((a.age-a.spec.startup-lastRelease)/(a.spec.interval||a.spec.active)):0;
    const volley=['seeds','spikes','trash','roar','caps'].includes(type);
    const timer=p==='windup'?clip[0]*(1-progress):p==='active'?mix(clip[1],clip[2],volley?releaseProgress:progress):clip[3]*(1-progress);
    const b={x:f.x,y:f.y,hp:f.hp,max:100,dir:f.face,face:f.face,vx:f.vx,hitstun:f.stun,hitFlash:f.stun,pulse:0,
      state:p==='windup'?'warn':p==='active'?'attack':p==='recovery'?'recover':'idle',type,timer,duration:p==='windup'?clip[0]:f.id==='atomdust'?.55:1,
      target:a?.targetX??other.x,startX:a?.origin??f.x,guardFlash:f.block||f.guardStun>0?.12:0,guardFacing:f.face,count:0,jump:0,struck:!!a?.struck,volley:a?.struck?1:0};
    for(const prefix of ['dog','sonic','venom','styro','waste'])Object.assign(b,{[prefix+'Moving']:['walk','dash'].includes(f.state),[prefix+'Stride']:f.walk,[prefix+'Facing']:f.face,[prefix+'HitFacing']:f.face,[prefix+'DeathFacing']:f.face,[prefix+'Heavy']:f.knockdown>0,[prefix+'HitDuration']:.25,[prefix+'React']:f.stun,[prefix+'ReactDuration']:.25});
    b.bearMoving=['walk','dash'].includes(f.state);b.bearStride=f.walk;b.trainerX=clamp(f.x-f.face*125,65,1215);b.trainerMoving=b.bearMoving;b.trainerStride=f.walk;b.trainerDir=f.face;
    const duration=a?a.spec.startup+a.spec.active+a.spec.recovery:0;
    let specialTick=p==='windup'?mix(0,.12,progress):p==='active'?mix(.13,.46,progress):mix(.46,.9,progress);
    if(f.id==='vee'&&key==='special')specialTick=p==='windup'?mix(0,.07,progress):p==='active'?Math.min(.849,Math.max(0,(a.struck||1)-1)*.17+.08+releaseProgress*.08):mix(.85,1.05,progress);
    const h={...f,walkCycle:f.walk,idleTime:f.clock,stride:130,landing:0,attack:key,anim:a&&normal?duration-a.age:0,attackDuration:duration,
      pendingAttack:a&&normal?{key,kick:['kick','sweep'].includes(key),startup:a.spec.startup,active:a.spec.active,duration,elapsed:a.age,face:a.face}:null,
      special:a&&!normal?1:0,specialTick,hitReact:f.stun,dash:f.dashTime>0?{duration:.16,elapsed:.16-f.dashTime,back:f.dashDir!==f.face,dir:f.dashDir}:null};
    const air={state:b.state,type,timer,phase:1,time:f.clock,struck:b.struck,liveStorm:p==='active'&&b.struck,
      victory:f.state==='defeat'||f.state==='knockdown',hitstun:f.stun,heavy:f.knockdown>0,guard:b.guardFlash,moving:b.bearMoving,stride:f.walk};
    return {boss:b,hero:h,air,phase:p,key,normal,progress,releaseProgress,type,time:world?.clock??f.clock};
  }
  function bushmanAction(f,v,spec){
    if(!f.action)return null;
    const age=v.phase==='windup'?v.progress*spec.windup:v.phase==='active'?spec.windup+spec.contact+v.progress*(spec.active-spec.contact):spec.windup+spec.active+v.progress*spec.recover;
    return {kind:v.type,age,face:f.action.face,target:f.action.targetX,released:!!f.action.struck};
  }
  return Object.freeze({phaseOf,view,bushmanAction});
});
