/* Pure competitive simulation. No boss AI, DOM, rendering, audio or Story globals. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./roster.js'):root.HealthiaCompetitiveData);if(typeof module==='object'&&module.exports)module.exports=api;else root.HealthiaCompetitiveCombat=api;})(typeof window!=='undefined'?window:globalThis,function(Data){
  'use strict';
  const GROUND=604,STEP=1/120,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const actions=['jump','punch','kick','shoot','skill','special','dash'];
  function fighter(id,slot,control){
    if(!Data.byId[id])throw Error('Unknown fighter '+id);
    return {id,slot,control,x:slot?940:340,y:GROUND,previousX:slot?940:340,face:slot?-1:1,hp:100,max:100,power:35,vx:0,vy:0,jumps:0,walk:0,clock:0,state:'idle',stateTime:0,action:null,buffer:null,block:false,stun:0,guardStun:0,knockdown:0,inv:0,slow:0,root:0,invisible:0,evade:0,dashTime:0,dashCd:0,dashDir:1,cooldowns:{},charge:0,combo:0,comboTime:0,best:0,receivedCombo:0,comboSafe:0,lastHitTime:-100,lastTap:{left:-10,right:-10},previous:{},queued:[],visual:{},cpu:{wait:.5,held:{}}};
  }
  function create(options={}){
    const ids=options.ids||['summy','bushman'],controls=options.controls||['human','cpu'];
    return {fighters:ids.map((id,i)=>fighter(id,i,controls[i])),difficulty:options.difficulty||'medium',venue:options.venue||0,clock:0,remainder:0,serial:0,projectiles:[],zones:[],events:[],status:'fight',winner:null,endTime:0,random:options.random||Math.random};
  }
  function stateOf(f){
    if(f.hp<=0)return 'defeat';if(f.won)return 'victory';if(f.knockdown>0)return f.knockdown>.22?'knockdown':'recovery';
    if(f.stun>0)return 'hit';if(f.guardStun>0)return 'block';if(f.action)return ['punch','heavyPunch','uppercut'].includes(f.action.key)?'punch':['kick','heavyKick','sweep'].includes(f.action.key)?'kick':'special';
    if(f.dashTime>0)return 'dash';if(f.y<GROUND-.1)return 'jump';if(f.block)return 'block';return Math.abs(f.vx)>12?'walk':'idle';
  }
  function setState(f){const state=stateOf(f);if(state!==f.state){f.state=state;f.stateTime=0;}}
  function queue(world,slot,key,heavy=false){const f=world.fighters[slot];if(f&&actions.includes(key)&&f.queued.length<8)f.queued.push({key,heavy});}
  function pressDirection(world,slot,dir){
    const f=world.fighters[slot],key=dir<0?'left':'right';if(!f)return;
    if(world.clock-f.lastTap[key]<.25)dash(world,f,dir);
    f.lastTap[key]=world.clock;f.previous[key]=true;
  }
  function ready(f,key){const m=Data.moves[f.id][key];return !!m&&!f.action&&f.hp>0&&f.stun<=0&&f.knockdown<=0&&f.guardStun<=0&&f.dashTime<=0&&(f.cooldowns[key]||0)<=0&&f.power>=m.cost&&f.charge>=(m.requiresHits||0);}
  function begin(world,f,key){
    if(!ready(f,key))return false;
    const spec=Data.moves[f.id][key],target=world.fighters[1-f.slot];
    f.block=false;f.invisible=0;f.action={key,spec,age:0,id:++world.serial,face:f.face,targetX:clamp(target.x,f.x-spec.range,f.x+spec.range),origin:f.x,struck:0,hitSlots:new Set()};
    f.power-=spec.cost;if(spec.requiresHits)f.charge=0;f.cooldowns[key]=spec.cooldown;world.events.push({type:'attack',slot:f.slot,key});setState(f);return true;
  }
  function dash(world,f,dir){
    if(f.action||f.stun>0||f.knockdown>0||f.guardStun>0||f.dashCd>0||f.y<GROUND-1||f.hp<=0||f.root>0)return false;
    f.dashDir=dir;f.dashTime=.16;f.dashCd=f.id==='atomdust'?1.4:.9;f.block=false;
    if(f.id==='atomdust')f.evade=.12;world.events.push({type:'dash',slot:f.slot});return true;
  }
  function command(world,f,key,heavy){
    // Preserve the established KKPP input sequence with a bounded four-move queue.
    const grounded=f.y>=GROUND-1&&f.stun<=0&&f.knockdown<=0&&f.guardStun<=0&&!f.block;
    if(!heavy&&grounded&&['punch','kick'].includes(key)){
      if(f.chain&&f.chain.expires<world.clock)f.chain=null;
      if(f.chain){
        const stages={1:['kick','sweep'],2:['punch','punch'],3:['punch','uppercut']},next=stages[f.chain.stage];
        if(next&&next[0]===key){f.chain.stage++;f.chain.expires=world.clock+.9;f.chain.queue.push(next[1]);return true;}
        if(f.chain.stage===4)return false;f.chain=null;
      }
      if(key==='kick'&&ready(f,'kick')){f.chain={stage:1,queue:[],expires:world.clock+.9};return begin(world,f,'kick');}
    }else f.chain=null;
    if(key==='jump'){
      if(f.hp>0&&!f.action&&f.stun<=0&&f.knockdown<=0&&f.guardStun<=0&&f.jumps<2&&f.root<=0){f.vy=-720;f.jumps++;f.block=false;f.dashTime=0;return true;}return false;
    }
    if(key==='dash')return dash(world,f,f.face);
    const move=heavy&&['punch','kick'].includes(key)?'heavy'+key[0].toUpperCase()+key.slice(1):key;
    if(begin(world,f,move))return true;
    if(f.action&&f.action.age>f.action.spec.startup+f.action.spec.active)f.buffer={key:move,expires:world.clock+.13};return false;
  }
  function box(f){const c=Data.byId[f.id];return {left:f.x-c.width,right:f.x+c.width,top:f.y-c.height*.86,bottom:f.y-12};}
  function inMelee(f,target,m,face){const b=box(target),start=f.x,front=f.x+face*m.range;return Math.min(start,front)<b.right&&Math.max(start,front)>b.left&&f.y-m.band[1]<b.bottom&&f.y-m.band[0]>b.top;}
  function hurt(world,target,damage,source,options={}){
    if(world.status!=='fight'||target.hp<=0||(!options.hazard&&(target.inv>0||target.evade>0)))return {hit:false,blocked:false};
    const dir=Math.sign(source-target.x)||-target.face;
    const blocked=options.forceBlock===true||(options.blockable!==false&&target.block&&target.face===dir&&target.y>=GROUND-1);
    if(blocked){
      target.guardStun=Math.max(target.guardStun,.10);target.vx=-dir*75;target.power=clamp(target.power+4,0,100);
      // No chip deaths and no guard-break loop: competitive blocking costs no HP.
      world.events.push({type:'block',slot:target.slot,x:target.x,y:target.y-135});return {hit:false,blocked:true};
    }
    const attacker=options.owner===undefined?null:world.fighters[options.owner];
    const multi=options.multi===true,scaled=options.hazard||multi?damage:damage*Math.max(.55,1-target.receivedCombo*.12);
    target.hp=clamp(target.hp-scaled,0,100);target.power=clamp(target.power+7,0,100);target.action=null;target.buffer=null;target.chain=null;target.block=false;target.dashTime=0;target.invisible=0;
    target.stun=options.stun??(damage>=18?.25:.16);target.vx=(target.x>=source?1:-1)*(options.push||160);target.lastHitTime=world.clock;
    if(!multi)target.receivedCombo++;
    const knock=options.knockdown||target.receivedCombo>=4;
    if(knock){target.knockdown=.68;target.vy=-200;target.inv=.78;target.receivedCombo=0;}else target.inv=multi?.055:.095;
    if(options.root)target.root=options.root;if(options.slow)target.slow=options.slow;
    if(attacker){attacker.power=clamp(attacker.power+12,0,100);attacker.combo=attacker.comboTime>0?attacker.combo+1:1;attacker.comboTime=1;attacker.best=Math.max(attacker.best,attacker.combo);
      if(attacker.id==='bushman'&&options.qualifies&&attacker.lastCredit!==options.attackId){attacker.lastCredit=options.attackId;attacker.charge=Math.min(4,attacker.charge+1);}}
    world.events.push({type:'hit',slot:target.slot,owner:options.owner,x:target.x,y:target.y-130,damage:scaled,knockdown:knock,visual:options.visual});setState(target);return {hit:true,blocked:false,damage:scaled};
  }
  function hitOptions(f,a,last){return {owner:f.slot,attackId:a.id,qualifies:['punch','kick','heavyPunch','heavyKick','sweep','uppercut','shoot'].includes(a.key),push:a.spec.push,knockdown:a.spec.knockdown&&last,root:a.spec.root,slow:a.spec.slow,multi:(a.spec.strikes||1)>1,visual:a.spec.visual};}
  function release(world,f,a,index){
    const m=a.spec,target=world.fighters[1-f.slot],count=m.strikes||1,last=index===count-1,opts=hitOptions(f,a,last);
    if(m.kind==='teleport'||m.kind==='evade'){
      const dir=m.kind==='evade'?-a.face:a.face;
      f.x=clamp(f.x+dir*(m.kind==='evade'?150:m.range),105,1175);f.inv=m.kind==='evade'?.16:.12;if(m.kind==='teleport')f.invisible=2;
      world.events.push({type:m.kind,slot:f.slot,x:f.x,y:f.y});return;
    }
    if(['zone','snare','storm'].includes(m.kind)){
      const positions=m.kind==='storm'?[a.targetX-110,a.targetX,a.targetX+110]:[a.targetX];
      for(const x of positions)world.zones.push({id:a.id,owner:f.slot,x:clamp(x,70,1210),y:GROUND,sourceX:f.x,spec:m,age:0,next:m.delay||.24,ticks:0,damage:m.damage/(m.kind==='storm'?1:m.ticks||1),options:opts,hit:new Set()});
      return;
    }
    if(m.kind==='projectile'||m.kind==='wave'){
      if(world.projectiles.filter(p=>p.owner===f.slot).length>=4)return;
      const x=f.x+a.face*65,y=m.kind==='wave'?GROUND-27:f.y-145;
      world.projectiles.push({id:a.id,owner:f.slot,x,y,previousX:x,dir:a.face,speed:m.speed||500,radius:m.radius||24,left:m.range,life:3.5,damage:m.damage/count,spec:m,options:opts});return;
    }
    if(inMelee(f,target,m,a.face))hurt(world,target,m.damage/count,f.x,opts);
    world.events.push({type:'strike',slot:f.slot,x:f.x+a.face*Math.min(m.range,170),y:f.y-125,face:a.face,range:m.range,kind:m.kind,visual:m.visual||f.id,life:.18});
  }
  function sample(world,f,input){
    input=input||{};
    for(const key of ['left','right'])if(input[key]&&!f.previous[key]){if(world.clock-f.lastTap[key]<.25)dash(world,f,key==='left'?-1:1);f.lastTap[key]=world.clock;}
    for(const key of actions)if(input[key]&&!f.previous[key])command(world,f,key,input.heavy===true);
    for(const q of f.queued.splice(0))command(world,f,q.key,q.heavy);
    f.previous={...input};return input;
  }
  function stepFighter(world,f,input,dt){
    const c=Data.byId[f.id],target=world.fighters[1-f.slot];f.previousX=f.x;f.clock+=dt;f.stateTime+=dt;
    for(const key of ['stun','guardStun','knockdown','inv','slow','root','invisible','evade','dashCd','comboTime'])f[key]=Math.max(0,f[key]-dt);
    for(const key in f.cooldowns)f.cooldowns[key]=Math.max(0,f.cooldowns[key]-dt);
    if(world.clock-f.lastHitTime>.85)f.receivedCombo=0;
    if(!f.action&&f.stun<=0&&f.knockdown<=0&&f.dashTime<=0)f.face=target.x>=f.x?1:-1;
    input=sample(world,f,input);
    if(input.block||f.stun>0||f.knockdown>0||f.y<GROUND-1)f.chain=null;
    if(f.chain?.queue.length&&(!f.action||f.action.age>=f.action.spec.startup+f.action.spec.active+.065)){
      f.action=null;const next=f.chain.queue.shift();begin(world,f,next);f.chain.expires=world.clock+.9;
    }else if(f.chain&&f.chain.expires<world.clock)f.chain=null;
    f.block=!!input.block&&!f.action&&f.stun<=0&&f.knockdown<=0&&f.dashTime<=0&&f.y>=GROUND-1;
    if(f.action){
      const a=f.action,m=a.spec;a.age+=dt;
      if(m.lunge&&a.age<=m.startup)f.x+=a.face*(m.lunge/m.startup)*dt;
      const n=m.strikes||1;
      while(a.struck<n&&a.age>=m.startup+a.struck*(m.interval||0)){release(world,f,a,a.struck);a.struck++;}
      if(a.age>=m.startup+m.active+m.recovery){if(f.id==='vee'&&a.key==='special')f.x=clamp(a.origin,105,1175);f.action=null;}
      f.vx=0;
    }else if(f.stun>0||f.knockdown>0||f.guardStun>0){f.x+=f.vx*dt;f.vx*=Math.exp(-8*dt);}
    else if(f.dashTime>0){f.dashTime=Math.max(0,f.dashTime-dt);f.vx=f.dashDir*720;f.x+=f.vx*dt;}
    else{const dir=(input.right?1:0)-(input.left?1:0);f.vx=dir*c.speed*(f.block?.22:1)*(f.slow>0?.65:1)*(f.root>0?0:1);f.x+=f.vx*dt;f.walk+=Math.abs(f.vx)*dt/130;}
    if(f.buffer&&f.buffer.expires>=world.clock&&!f.action){begin(world,f,f.buffer.key);f.buffer=null;}else if(f.buffer&&f.buffer.expires<world.clock)f.buffer=null;
    f.vy+=2000*dt;f.y+=f.vy*dt;if(f.y>=GROUND){f.y=GROUND;f.vy=0;f.jumps=0;}
    f.x=clamp(f.x,105,1175);setState(f);
  }
  function effects(world,dt){
    for(const p of world.projectiles){
      const old=p.x;p.previousX=old;p.x+=p.dir*p.speed*dt;p.left-=Math.abs(p.x-old);p.life-=dt;
      const target=world.fighters[1-p.owner],b=box(target);
      if(Math.max(old,p.x)+p.radius>=b.left&&Math.min(old,p.x)-p.radius<=b.right&&p.y+p.radius>=b.top&&p.y-p.radius<=b.bottom){
        const r=hurt(world,target,p.damage,p.x-p.dir*70,p.options);if(r.hit||r.blocked)p.life=0;
      }
    }
    world.projectiles=world.projectiles.filter(p=>p.life>0&&p.left>0&&p.x>-80&&p.x<1360);
    for(const z of world.zones){
      z.age+=dt;const m=z.spec,delay=m.delay||.24,maxTicks=m.kind==='storm'?1:m.ticks||1;
      const target=world.fighters[1-z.owner];
      if(z.age>=z.next&&z.ticks<maxTicks){
        z.ticks++;z.next+=m.life/(m.ticks||1);
        if(Math.abs(target.x-z.x)<(m.radius||85)&&target.y>GROUND-(m.kind==='storm'?230:70)){
          // Each storm or snare can contact a target once, even when warning areas overlap.
          if(m.kind==='storm'&&target.lastStorm===z.id)continue;
          const r=hurt(world,target,z.damage,z.sourceX,{...z.options,blockable:m.kind==='storm',multi:maxTicks>1});if(r.hit||r.blocked){z.hit.add(target.slot);if(m.kind==='storm')target.lastStorm=z.id;}
        }
      }
    }
    world.zones=world.zones.filter(z=>z.age<(z.spec.delay||.24)+(z.spec.life||.6));
  }
  function settle(world){
    if(world.status!=='fight')return;const dead=world.fighters.map(f=>f.hp<=0);if(!dead.some(Boolean))return;
    world.status='finished';world.winner=dead.every(Boolean)?null:dead[0]?1:0;world.endTime=0;
    for(const f of world.fighters){f.won=f.slot===world.winner;f.action=null;f.buffer=null;f.queued=[];f.vx=0;f.block=false;f.invisible=0;setState(f);}
    world.projectiles=[];world.zones=[];world.events.push({type:'finish',winner:world.winner});
  }
  function step(world,inputs,dt=STEP){
    if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,STEP);world.clock+=dt;
    if(world.status!=='fight'){world.endTime+=dt;for(const f of world.fighters)f.stateTime+=dt;return;}
    // Alternate update order each tick to avoid a permanent P1 simultaneous-hit advantage.
    const order=Math.floor(world.clock/STEP)%2?[0,1]:[1,0];for(const i of order)stepFighter(world,world.fighters[i],inputs[i]||{},dt);
    const [a,b]=world.fighters;if(Math.abs(a.y-b.y)<150){const min=Data.byId[a.id].width+Data.byId[b.id].width,dx=b.x-a.x;if(Math.abs(dx)<min){const push=(min-Math.abs(dx))/2,sign=dx>=0?1:-1;a.x=clamp(a.x-sign*push,105,1175);b.x=clamp(b.x+sign*push,105,1175);}}
    effects(world,dt);settle(world);
  }
  function advance(world,seconds,inputs){if(!Number.isFinite(seconds)||seconds<=0)return;world.remainder+=Math.min(seconds,.25);while(world.remainder+1e-9>=STEP){world.remainder-=STEP;step(world,typeof inputs==='function'?inputs(world):inputs,STEP);}}
  return {GROUND,STEP,create,fighter,queue,pressDirection,ready,begin,dash,box,inMelee,hurt,settle,step,advance,stateOf};
});
