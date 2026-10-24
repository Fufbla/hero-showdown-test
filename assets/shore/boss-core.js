/* Front-facing Shore Front boss. Rendering and input share these exact poses. */
(function(root){
 'use strict';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const lerp=(a,b,p)=>a+(b-a)*p;
 const ease=p=>{p=clamp(p,0,1);return p*p*(3-2*p);};
 const rotate=(p,a)=>({x:p.x*Math.cos(a)-p.y*Math.sin(a),y:p.x*Math.sin(a)+p.y*Math.cos(a)});
 const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
 const DURATIONS={intro:1.2,clawWindup:.9,clawSweep:.82,clawRecover:.65,stingerWindup:1.15,stingerPlunge:.32,stingerExposed:1.75,stingerRecover:.7,reflect:.72,stunned:1.2};
 // Each rigid claw/forearm rotates around its own shoulder. The painted
 // pincer tips stop at the body's centre line; neither arm stretches.
 const CLAWS=[
  {side:1,shoulder:{x:490,y:280},home:{x:325,y:445},angle:-.12,limit:1.12,anchor:[.42,.70],socket:[329/380,56/473]},
  {side:-1,shoulder:{x:790,y:280},home:{x:955,y:445},angle:.12,limit:1.155,anchor:[.58,.70],socket:[50/432,56/470]}
 ];
 class Encounter{
  constructor(){
   this.kind='boss';this.round=3;this.x=640;this.y=560;this.maxHp=650;this.hp=this.maxHp;
   this.phase='fight';this.state='intro';this.age=0;this.time=0;this.clawCount=0;this.totalSwings=0;this.stingers=0;this.reflections=0;
   this.side=-1;this.clawReturnAngle=0;this.targetX=640;this.locked=false;this.dodged=false;this.contact=false;this.parried=false;this.flash=0;this.deathAge=0;
   this.events=[];this.enemies=[];this.remains=[];this.splits=[];this.pools=[];this.player={x:640,y:604};
  }
  emit(type,extra={}){this.events.push({type,...extra});}
  drain(){const a=this.events;this.events=[];return a;}
  enter(state){
   if(state==='clawRecover')this.clawReturnAngle=this.clawRotation();
   this.state=state;this.age=0;this.contact=false;
   if(state==='clawWindup'){this.side=this.totalSwings%2?-1:1;this.parried=false;this.emit('bossWarn',{kind:'claw'});}
   if(state==='clawSweep'){this.clawCount++;this.totalSwings++;this.emit('bossSwing',{ordinal:this.clawCount});}
   if(state==='stingerWindup'){this.targetX=clamp(this.player.x,110,1170);this.locked=false;this.dodged=false;this.stingers++;this.emit('bossWarn',{kind:'stinger'});}
  }
  nextAttack(){this.enter(this.clawCount>=4?'stingerWindup':'clawWindup');}
  clawRotation(side=this.side){
   if(side!==this.side)return 0;
   const rig=CLAWS[side===1?0:1];
   if(this.state==='clawWindup')return side*.08*ease(this.age/DURATIONS.clawWindup);
   if(this.state==='clawSweep')return side*lerp(.08,-rig.limit,ease(this.age/DURATIONS.clawSweep));
   if(this.state==='clawRecover')return lerp(this.clawReturnAngle,0,ease(this.age/DURATIONS.clawRecover));
   return 0;
  }
  clawPose(side=this.side){
   const rig=CLAWS[side===1?0:1],rotation=this.clawRotation(side),angle=rig.angle+rotation;
   const offset=rotate({x:rig.home.x-rig.shoulder.x,y:rig.home.y-rig.shoulder.y},rotation);
   const x=rig.shoulder.x+offset.x,y=rig.shoulder.y+offset.y;
   const socket=rotate({x:(rig.socket[0]-rig.anchor[0])*210,y:(rig.socket[1]-rig.anchor[1])*260},angle);
   return {x,y,angle,side,shoulder:rig.shoulder,wrist:{x:x+socket.x,y:y+socket.y},anchor:rig.anchor};
  }
  clawBox(side=this.side){
   const p=this.clawPose(side),corners=[[-80,-60],[75,-60],[75,65],[-80,65]].map(([x,y])=>rotate({x,y},p.angle));
   let left=p.x+Math.min(...corners.map(v=>v.x)),right=p.x+Math.max(...corners.map(v=>v.x));
   const top=p.y+Math.min(...corners.map(v=>v.y)),bottom=p.y+Math.max(...corners.map(v=>v.y));
   if(side===1)right=Math.min(this.x,right);else left=Math.max(this.x,left);
   return {x:left,y:top,w:right-left,h:bottom-top};
  }
  stingerPose(){
   let x=640,y=195;
   if(this.state==='stingerWindup'){const p=clamp(this.age/.8,0,1);x=lerp(640,this.targetX,p);y=185-22*Math.sin(this.age*13);}
   else if(this.state==='stingerPlunge'){x=this.targetX;y=lerp(185,500,clamp(this.age/.22,0,1)**2);}
   else if(this.state==='stingerExposed'){x=this.targetX;y=500+4*Math.sin(this.age*12);}
   else if(this.state==='stingerRecover'){const p=clamp(this.age/.7,0,1);x=lerp(this.targetX,640,p);y=lerp(500,195,p);}
   else if(this.state==='reflect'){const p=clamp(this.age/.6,0,1);x=lerp(this.targetX,640,p);y=lerp(500,430,p)-Math.sin(p*Math.PI)*240;}
   else if(this.state==='stunned'){y=430;}
   return {x,y};
  }
  stingerBox(){const p=this.stingerPose();return {x:p.x-68,y:p.y-100,w:136,h:135};}
  bodyBox(){return {x:500,y:345,w:280,h:220};}
  target(){if(this.state.startsWith('claw')&&this.state!=='clawRecover')return this.clawPose();if(['stingerPlunge','stingerExposed'].includes(this.state))return this.stingerPose();return {x:this.x,y:450};}
  hurtbox(p){return {x:p.x-35,y:p.y-195,w:70,h:190};}
  damage(amount,kind){
   if(this.hp<=0||this.phase!=='fight')return false;
   this.hp=Math.max(0,this.hp-amount);this.flash=.18;this.emit('bossHurt',{damage:amount,kind,x:640,y:430});
   if(!this.hp){this.phase='victory';this.state='dissolve';this.age=0;this.deathAge=0;this.emit('complete');}
   return true;
  }
  strike(a){
   if(this.phase!=='fight'||!a.box)return [];
   const targets=a.targets||(a.targets=new Set()),punch=['punch','uppercut'].includes(a.key),kick=['kick','sweep'].includes(a.key);
   if(!punch&&!kick)return [];
   const hit=(id,box)=>!targets.has('boss:'+id)&&overlap(a.box,box)&&(!a.face||Math.abs(box.x+box.w/2-a.origin)<40||Math.sign(box.x+box.w/2-a.origin)===a.face);
   if(this.state==='stingerExposed'&&this.dodged&&punch&&hit('stinger',this.stingerBox())){
    targets.add('boss:stinger');this.reflections++;this.enter('reflect');this.emit('reflect',{x:this.targetX,y:500});
    return [{reflected:true,damage:0,x:this.targetX,y:475}];
   }
   if((this.state==='clawSweep'||(this.state==='clawWindup'&&this.age>=.45))&&!this.parried&&hit('claw',this.clawBox())){
    const p=this.clawPose();targets.add('boss:claw');this.parried=true;
    // A counter during anticipation still resolves this swing in the four-swing cadence.
    if(this.state==='clawWindup'){this.clawCount++;this.totalSwings++;this.emit('bossSwing',{ordinal:this.clawCount,countered:true});}
    this.damage(18,'claw');if(this.hp>0)this.enter('clawRecover');this.emit('parry',{x:p.x,y:p.y});
    return [{damage:18,x:p.x,y:p.y}];
   }
   if(['clawRecover','stingerRecover','stunned'].includes(this.state)&&hit('body',this.bodyBox())){
    targets.add('boss:body');const damage=(kick?12:10)*(['sweep','uppercut'].includes(a.key)?1.08:1);this.damage(damage,'body');return [{damage,x:clamp(a.origin,500,780),y:450}];
   }
   return [];
  }
  // Keep existing specials useful; the reflected stinger is the largest single hit.
  clearVenue(){this.damage(70,'special');}
  step(dt,player=this.player){
   dt=clamp(dt,0,.05);this.player=player;this.time+=dt;this.flash=Math.max(0,this.flash-dt);
   if(this.state==='dissolve'){this.deathAge+=dt;this.age+=dt;return;}
   if(this.phase!=='fight')return;
   this.age+=dt;
   if(this.state==='stingerWindup'&&!this.locked){this.targetX=clamp(player.x,110,1170);if(this.age>=.6){this.locked=true;this.emit('stingerLock',{x:this.targetX});}}
   if(this.state==='clawSweep'&&!this.contact&&overlap(this.clawBox(),this.hurtbox(player))){this.contact=true;this.emit('attack',{damage:12,x:this.clawPose().x,kind:'claw'});}
   if(this.state==='stingerPlunge'&&this.age>=.22&&!this.contact){
    this.contact=true;const area={x:this.targetX-72,y:465,w:144,h:157};
    this.dodged=!overlap(area,this.hurtbox(player))||!!player.dash;
    if(!this.dodged)this.emit('attack',{damage:18,x:this.targetX,kind:'poison'});
    else this.emit('stingerDodged',{x:this.targetX,y:500});
   }
   if(this.age+1e-8<(DURATIONS[this.state]||1))return;
   switch(this.state){
    case 'intro':this.enter('clawWindup');break;
    case 'clawWindup':this.enter('clawSweep');break;
    case 'clawSweep':this.enter('clawRecover');break;
    case 'clawRecover':this.nextAttack();break;
    case 'stingerWindup':this.enter('stingerPlunge');break;
    case 'stingerPlunge':this.enter('stingerExposed');break;
    case 'stingerExposed':this.enter('stingerRecover');break;
    case 'stingerRecover':this.clawCount=0;this.nextAttack();break;
    case 'reflect':this.damage(150,'reflected-stinger');if(this.hp>0)this.enter('stunned');break;
    case 'stunned':this.clawCount=0;this.nextAttack();break;
   }
  }
 }
 const api={Encounter,DURATIONS,CLAWS};root.HealthiaShoreBoss=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
