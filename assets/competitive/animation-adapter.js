/* Read-only bridge to the approved artwork. Native boss controllers never run here. */
'use strict';
window.HealthiaCompetitiveAnimation=(()=>{
  const State=HealthiaCompetitiveAnimationState,phaseOf=State.phaseOf,custom=new Map(),last=new WeakMap();
  const inspectors={styrodog:'HealthiaStyrodogAnimation',sonic:'HealthiaSonicTuskAnimation',venomis:'HealthiaVenomisThornbearAnimation',styro:'HealthiaStyroAnimation',wastelander:'HealthiaWastelanderAnimation',atomdust:'HealthiaAtomdustAnimation',spree:'HealthiaLighteningSpreeAnimation',bushman:'HealthiaBushmanAnimation'};
  const airImage=new Image();let airReady=false,inspection=false;
  const airLoaded=new Promise(resolve=>{airImage.onload=()=>{airReady=true;resolve(true);};airImage.onerror=()=>resolve(false);airImage.src='assets/animation/'+HealthiaAirPollutionAtlas.file;});
  function register(id,renderer){if(!HealthiaCompetitiveData.byId[id]||typeof renderer!=='function')throw Error('Invalid animation adapter');custom.set(id,renderer);return ()=>custom.delete(id);}
  function drawAir(f,v){
    const p=HealthiaAirPollutionCore.pose(v.air),fallen=f.state==='defeat'||f.state==='knockdown';
    if(p.legacy||!airReady){sprite(3,f.x,GROUND+8,405,f.face===1?-1:1,fallen?f.face*.9:0,fallen?.65:1);}
    else{
      const profile=HealthiaAirPollutionAtlas,frame=profile.frames[p.frame],reg=HealthiaAirPollutionCore.registration(frame,405,profile.referenceHeight,p),[x,y,w,h]=frame.crop;
      ctx.save();ctx.translate(f.x,GROUND+8);ctx.scale(-f.face*reg.scale,reg.scale);ctx.drawImage(airImage,x,y,w,h,-reg.anchor[0],-reg.anchor[1],w,h);ctx.restore();
    }
    if(inspection)last.set(f,{state:p.state,pose:p.frame,facing:f.face,legacy:!!p.legacy||!airReady});
    if(f.action&&v.type==='punch'&&v.normal&&v.phase==='active'){
      const reach=f.action.spec.range;smokeStrand(f.x+f.face*40,GROUND-170,f.x+f.face*reach*.5,GROUND-200,f.x+f.face*Math.min(reach,280),GROUND-135,1,36,.6);smokyFist(f.x+f.face*Math.min(reach,280),GROUND-140,.55,f.face);
    }
  }
  function draw(f,other,world){
    const c=HealthiaCompetitiveData.byId[f.id];
    if(custom.has(f.id)){ctx.save();try{const descriptor=custom.get(f.id)({ctx,fighter:f,opponent:other,state:f.state,phase:phaseOf(f),world,ground:GROUND});if(inspection&&descriptor)last.set(f,descriptor);}finally{ctx.restore();}return;}
    const saved={hero,boss,selected,opponent,mode,ending,phase,t,elapsed,effects,atom,spree,bushman,plantShots,vines,wasteShots,wastePools,wasteBursts,styroSpikes,styroBursts,soundWaves};
    ctx.save();
    try{
      const v=State.view(f,other,world),a=f.action;
      hero={...other};boss=v.boss;selected=c.hero??0;opponent=c.villain??0;phase=1;t=v.time;elapsed=v.time;effects=[];
      mode=f.state==='defeat'||f.state==='knockdown'?'victory':'fight';ending=f.state==='knockdown'?.4:world.endTime;
      plantShots=[];vines=[];wasteShots=[];wastePools=[];wasteBursts=[];styroSpikes=[];styroBursts=[];soundWaves=[];
      if(f.invisible>0){ctx.globalAlpha=.17;if(f.invisible<.4)ctx.globalAlpha=.17+(1-f.invisible/.4)*.6;}
      if(c.hero!==undefined){
        mode=f.state==='defeat'?'defeat':f.state==='victory'?'victory':'fight';hero=v.hero;
        fighter(f.x,f.y,0,0,f.state==='defeat');if(inspection)last.set(f,{...HealthiaAnimation.inspect(),facing:f.face});
      }else{
        const scale=c.height/([405,350,300,310,320,340,350,350,240][c.villain]);
        ctx.translate(f.x,f.y);ctx.scale(scale,scale);ctx.translate(-f.x,-GROUND);
        atom={walk:f.walk,move:f.vx,disperse:f.evade>0?.18:0,recoil:f.stun,clouds:[],caps:[],slow:false,hits:0};
        // Beam markers select the approved release pose; competitive render owns effects.
        spree={hidden:0,charge:v.progress,beams:v.phase==='active'&&a?.struck?[{life:1}]:[],rings:[],aim:0,flash:0};
        bushman={time:f.clock,walk:f.walk,moving:['walk','dash'].includes(f.state),recoil:f.stun,charge:f.charge,zones:[],flares:[],projectiles:[],action:null};
        if(f.id==='bushman'&&a)bushman.action=State.bushmanAction(f,v,BushmanCore.ATTACKS[v.type]);
        if(f.id==='air')drawAir(f,v);
        else{
          if(f.id==='styrodog')drawStyrodog();else if(f.id==='sonic')drawSonic();else if(f.id==='venomis')drawVenomis();else if(f.id==='styro')drawDrStyro();else if(f.id==='wastelander')drawWastelander();else if(f.id==='atomdust')drawAtom();else if(f.id==='spree')drawSpree();else if(f.id==='bushman')drawBushman();
          if(inspection)last.set(f,window[inspectors[f.id]]?.inspect());
        }
      }
    }finally{
      ctx.restore();({hero,boss,selected,opponent,mode,ending,phase,t,elapsed,effects,atom,spree,bushman,plantShots,vines,wasteShots,wastePools,wasteBursts,styroSpikes,styroBursts,soundWaves}=saved);
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
  return {register,draw,projectile,zone,phaseOf,whenLoaded:airLoaded,inspect:f=>last.get(f)||null,enableInspection:value=>{inspection=!!value;}};
})();
