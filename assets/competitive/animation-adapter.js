/* Read-only bridge to the currently loaded artwork and animation renderers. */
'use strict';
window.HealthiaCompetitiveAnimation=(()=>{
  const custom=new Map();
  function register(id,renderer){if(!HealthiaCompetitiveData.byId[id]||typeof renderer!=='function')throw Error('Invalid animation adapter');custom.set(id,renderer);return ()=>custom.delete(id);}
  function phaseOf(f){const a=f.action;if(!a)return 'idle';return a.age<a.spec.startup?'windup':a.age<a.spec.startup+a.spec.active?'active':'recovery';}
  const types={air:{punch:'punch',kick:'punch',shoot:'punch',skill:'cloud',special:'storm'},styrodog:{punch:'claw',kick:'slam',shoot:'roar',skill:'slam',special:'roar'},sonic:{punch:'pulse',kick:'stomp',shoot:'pulse',skill:'stomp',special:'blast'},venomis:{punch:'swipe',kick:'swipe',shoot:'seeds',skill:'vines',special:'swipe'},styro:{punch:'punch',kick:'punch',shoot:'spikes',skill:'spikes',special:'double'},wastelander:{punch:'mallet',kick:'mallet',shoot:'trash',skill:'acid',special:'mallet'},atomdust:{punch:'punch',kick:'kick',shoot:'caps',skill:'smoke',special:'caps'},spree:{punch:'beam',kick:'spark',shoot:'beam',skill:'spark',special:'beam'},bushman:{punch:'punch',kick:'kick',shoot:'fireball',skill:'scorch',special:'blast'}};
  function view(f,other){
    const a=f.action,p=phaseOf(f),key=a?.key.replace(/^heavy/,'').toLowerCase(),legacyKey=key==='sweep'?'kick':key==='uppercut'?'punch':key,type=types[f.id]?.[legacyKey]||'punch';
    let duration=type==='mallet'?.85:type==='trash'?1.45:type==='acid'?1.05:type==='double'?1.1:type==='blast'?1.3:type==='slam'?.95:type==='stomp'?.85:type==='swipe'?.7:type==='seeds'?1.35:.7;
    const progress=a?(p==='windup'?a.age/a.spec.startup:p==='active'?(a.age-a.spec.startup)/a.spec.active:(a.age-a.spec.startup-a.spec.active)/a.spec.recovery):0;
    const timer=p==='windup'?(1-progress)*(type==='mallet'?1.15:1):p==='active'?duration*(.6-.55*progress):1.4*(1-progress);
    const b={x:f.x,y:f.y,hp:f.hp,max:100,dir:f.face,face:f.face,vx:f.vx,hitstun:f.stun,hitFlash:f.stun,pulse:0,state:p==='windup'?'warn':p==='active'?'attack':p==='recovery'?'recover':'idle',type,timer,duration,target:a?.targetX||other.x,startX:a?.origin||f.x,guardFlash:f.block?.12:0,count:0,jump:0};
    for(const prefix of ['dog','sonic','venom','styro','waste'])Object.assign(b,{[prefix+'Moving']:['walk','dash'].includes(f.state),[prefix+'Stride']:f.walk,[prefix+'Facing']:f.face,[prefix+'HitFacing']:f.face,[prefix+'DeathFacing']:f.face,[prefix+'Heavy']:f.knockdown>0,[prefix+'HitDuration']:.25,[prefix+'React']:f.stun,[prefix+'ReactDuration']:.25});
    b.bearMoving=['walk','dash'].includes(f.state);b.bearStride=f.walk;b.trainerX=clamp(f.x-f.face*125,65,1215);b.trainerMoving=b.bearMoving;b.trainerStride=f.walk;b.trainerDir=f.face;
    return {boss:b,phase:p,key,progress,type};
  }
  function draw(f,other,world){
    const c=HealthiaCompetitiveData.byId[f.id];
    if(custom.has(f.id)){ctx.save();try{custom.get(f.id)({ctx,fighter:f,opponent:other,state:f.state,phase:phaseOf(f),world,ground:GROUND});}finally{ctx.restore();}return;}
    const saved={hero,boss,selected,opponent,mode,ending,atom,spree,bushman,plantShots,vines,wasteShots,wastePools,wasteBursts,styroSpikes,styroBursts,soundWaves};
    ctx.save();
    try{
      const v=view(f,other),a=f.action;
      hero={...other};boss=v.boss;selected=c.hero??0;opponent=c.villain??0;
      mode=f.state==='defeat'?'victory':f.state==='knockdown'?'victory':'fight';ending=f.state==='knockdown'?.4:world.endTime;
      plantShots=[];vines=[];wasteShots=[];wastePools=[];wasteBursts=[];styroSpikes=[];styroBursts=[];soundWaves=[];
      // The second player's ring and outlined badge distinguish mirror matches without repainting art.
      if(f.invisible>0){ctx.globalAlpha=.17;if(f.invisible<.4)ctx.globalAlpha=.17+(1-f.invisible/.4)*.6;}
      if(c.hero!==undefined){
        mode=f.state==='defeat'?'defeat':f.state==='victory'?'victory':'fight';
        const duration=a?a.spec.startup+a.spec.active+a.spec.recovery:0;
        hero={...f,walkCycle:f.walk,idleTime:f.clock,stride:130,landing:0,attack:v.key,anim:a?duration-a.age:0,attackDuration:duration,
          pendingAttack:a?{key:v.key,kick:['kick','sweep'].includes(v.key),startup:a.spec.startup,active:a.spec.active,duration,elapsed:a.age,face:f.face}:null,
          special:f.state==='special'?1:0,specialTick:a?.age||0,stun:f.stun,guardStun:f.guardStun,hitReact:f.stun,
          dash:f.dashTime>0?{duration:.16,elapsed:.16-f.dashTime,back:f.dashDir!==f.face,dir:f.dashDir}:null};
        fighter(f.x,f.y,0,0,f.state==='defeat');
      }else{
        const scale=c.height/([405,350,300,310,320,340,350,350,240][c.villain]);
        ctx.translate(f.x,f.y);ctx.scale(scale,scale);ctx.translate(-f.x,-GROUND);
        atom={walk:f.walk,move:f.vx,disperse:f.evade>0?.18:0,recoil:f.stun,clouds:[],caps:[],slow:false,hits:0};
        spree={hidden:0,charge:v.progress,beams:[],rings:[],aim:0,flash:0};
        bushman={time:f.clock,walk:f.walk,moving:['walk','dash'].includes(f.state),recoil:f.stun,charge:f.charge,zones:[],flares:[],projectiles:[],action:null};
        if(f.id==='bushman'&&a){const kind=v.type,sp=BushmanCore.ATTACKS[kind],age=v.phase==='windup'?v.progress*sp.windup:v.phase==='active'?sp.windup+v.progress*sp.active:sp.windup+sp.active+v.progress*sp.recover;bushman.action={kind,age,face:a.face,target:a.targetX};}
        if(f.id==='air'){
          const fallen=f.state==='defeat'||f.state==='knockdown';sprite(3,f.x,GROUND+8,405,f.face===1?-1:1,fallen?f.face*.9:0,fallen?.65:1);
          if(a&&v.phase==='active'){const reach=a.spec.range;smokeStrand(f.x+f.face*40,GROUND-170,f.x+f.face*reach*.5,GROUND-200,f.x+f.face*Math.min(reach,280),GROUND-135,1,36,.6);smokyFist(f.x+f.face*Math.min(reach,280),GROUND-140,.55,f.face);}
        }else if(f.id==='styrodog')drawStyrodog();else if(f.id==='sonic')drawSonic();else if(f.id==='venomis')drawVenomis();else if(f.id==='styro')drawDrStyro();else if(f.id==='wastelander')drawWastelander();else if(f.id==='atomdust')drawAtom();else if(f.id==='spree')drawSpree();else if(f.id==='bushman')drawBushman();
      }
    }finally{
      ctx.restore();({hero,boss,selected,opponent,mode,ending,atom,spree,bushman,plantShots,vines,wasteShots,wastePools,wasteBursts,styroSpikes,styroBursts,soundWaves}=saved);
    }
    if(f.block){ctx.save();ctx.strokeStyle=f.slot?'#ffbf91':'#9cf9e1';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(f.x+f.face*48,f.y-120,38,94,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
  }
  function projectile(p){
    ctx.save();const visual=p.spec.visual;
    if(visual==='fire')bushmanFX(Math.floor(p.life*12)%2,p.x,p.y,p.dir,.20,.20,150,270);
    else if(visual==='foam')foamChunk(p.x,p.y,19,p.life*6);
    else if(visual==='trash')wasteArt(4,p.x,p.y+24,48,p.dir,1,p.life*5);
    else if(visual==='spike')styroArt(4,p.x,p.y+20,40,p.dir);
    else if(visual==='cap'||visual==='debris')drawAtomCap(p.x,p.y,p.life*12,p.id%4);
    else if(visual==='plant')venomPart([434,886,88,69],p.x,p.y+24,64,48,p.dir);
    else if(visual==='sonic'){resonantRing(p.x,p.y,16,34,.9);soundCone(p.x-p.dir*50,p.y,100,65,p.dir,.8);}
    else if(visual==='smoke'){smokePuff(p.x,p.y,70,.75,p.life);smokyFist(p.x,p.y,.23,p.dir);}
    else if(visual==='tornado')tornado({x:p.x,y:GROUND,dir:p.dir,life:p.life});
    else{const color=visual==='light'?'#e0f6ff':visual==='rock'?'#e8cf94':'#b7ffe3';ctx.shadowColor=color;ctx.shadowBlur=12;line([[p.x-p.dir*45,p.y],[p.x+p.dir*12,p.y]],color,visual==='light'?7:14);}
    ctx.restore();
  }
  function zone(z){
    const active=z.age>=(z.spec.delay||.24),visual=z.spec.visual,color=visual==='fire'?'#ffb05a':visual==='acid'?'#b8ef52':visual==='smoke'||visual==='cigarette'?'#b6c0a4':'#b0ed80';
    ctx.save();ctx.globalAlpha=active?.75:.6;ctx.strokeStyle=color;ctx.fillStyle=color+'33';ctx.lineWidth=3;ctx.setLineDash(active?[]:[8,6]);ctx.beginPath();ctx.ellipse(z.x,GROUND+2,z.spec.radius||82,14,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    if(active){if(visual==='fire')bushmanFX(3+Math.floor(z.age*8)%2,z.x,GROUND+12,-1,.33,.30,256,360);
      else if(visual==='acid')wasteArt(5,z.x,GROUND+12,94,-1,.85);
      else if(visual==='smoke'||visual==='cigarette'){for(let i=0;i<4;i++)smokePuff(z.x+(i-1.5)*30,GROUND-35-i%2*28,85,.52,i+z.age);if(visual==='cigarette'&&atomDebris.naturalWidth)for(let i=0;i<3;i++)ctx.drawImage(atomDebris,i*128,0,128,128,z.x-32+i*23,GROUND-22,28,28);}
      else if(visual==='vine')venomPart([320,887,106,123],z.x,GROUND,100,160,1,.9);
      else if(visual==='spike')for(let i=-1;i<=1;i++)styroArt(4,z.x+i*40,GROUND,90,-1);}
    ctx.restore();
  }
  return {register,draw,projectile,zone,phaseOf};
})();
