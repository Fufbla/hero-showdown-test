'use strict';
// Classic-script module: shares the original game bindings.

function dashReady(){
 return mode==='fight'&&!paused&&hero&&hero.hp>0&&hero.y>=GROUND-.5&&hero.jumps===0&&
  !hero.dash&&hero.dashCooldown<=0&&hero.stun<=0&&hero.knockdown<=0&&hero.guardStun<=0&&
  hero.anim<=0&&hero.cd<=1e-7&&hero.special<=0&&!held('block');
}

function directionPress(dir,source){
 if(!dashReady()){delete directionTaps[source];return false;}
 const now=performance.now()/1000,previous=directionTaps[source];
 if(previous&&previous.dir===dir&&now-previous.at>=.025&&now-previous.at<=DASH_TAP_WINDOW){
  delete directionTaps[source];return startDash(dir);
 }
 directionTaps[source]={dir,at:now};return false;
}

function dashDust(x,dir,count=7){
 for(let i=0;i<count;i++)particles.push({x:x-dir*rand(0,18),y:GROUND-rand(1,7),vx:-dir*rand(25,95),vy:rand(-85,-30),life:rand(.18,.32),color:'#e5d9b7',r:rand(2,5)});
}

function startDash(dir){
 if(!dashReady()||(dir!==1&&dir!==-1))return false;
 hero.face=boss.x>=hero.x?1:-1;
 const back=dir!==hero.face,duration=back?.25:.24;
 hero.dash={dir,face:hero.face,back,duration,elapsed:0,trailClock:0,distance:(back?[140,128,165]:[180,164,212])[selected]};
 hero.dashCooldown=duration+.14;hero.vx=0;hero.block=false;hero.buffer=null;hero.landing=0;
 directionTaps={};dashDust(hero.x,dir);combatSound('whoosh',selected===2?.55:.42);syncAnimation();return true;
}

function dashPose(){
 const d=hero.dash,p=d.elapsed/d.duration;
 if(p>.91)return 15;
 return d.back?(p<.52?18:19):(p<.16?16:p<.79?17:16);
}

function finishDash(){
 if(!hero.dash)return;
 dashDust(hero.x,hero.dash.dir,4);hero.dash=null;hero.vx=0;
}

function stepDash(dt,limits){
 const d=hero.dash,curve=p=>p*p*(3-2*p),p0=clamp(d.elapsed/d.duration,0,1);
 d.elapsed=Math.min(d.duration,d.elapsed+dt);const p1=d.elapsed/d.duration;
 const dx=d.dir*d.distance*(curve(p1)-curve(p0))*atomSlowFactor(),oldX=hero.x;
 let next=clamp(oldX+dx,limits.min,limits.max);
 // Sweep against the opponent's pushbox. A dash stops at contact; it cannot tunnel or shove.
 if(!spreeInvisible()&&d.dir*(boss.x-oldX)>0&&hero.y>GROUND-130){
  const stop=boss.x-d.dir*105;
  next=d.dir>0?Math.max(oldX,Math.min(next,stop)):Math.min(oldX,Math.max(next,stop));
 }
 hero.x=next;hero.vx=(next-oldX)/dt;d.trailClock+=dt;
 if(d.trailClock>=.045&&p1>.12&&p1<.8){
  d.trailClock=0;effects.push({type:'dashGhost',index:selected,pose:dashPose(),x:hero.x,y:hero.y,face:d.face,life:.105,max:.105});
 }
 if(Math.abs(next-oldX-dx)>.001||d.elapsed+1e-8>=d.duration)finishDash();
}

function drawDashTrails(){
 for(const e of effects)if(e.type==='dashGhost')heroArt(e.index,e.pose,e.x,e.y,e.face,.15*e.life/e.max);
}

function padHorizontal(x){
 if(x<-.35)padAxisDirection=-1;else if(x>.35)padAxisDirection=1;
 else if((padAxisDirection===-1&&x>-.2)||(padAxisDirection===1&&x<.2))padAxisDirection=0;
 return padAxisDirection;
}

function animationState(){
 if(!hero)return 'idle';
 if(mode==='defeat')return 'defeat';
 if(mode==='victory')return 'victory';
 if(hero.knockdown>0)return hero.knockdown>.24?'knockdown':'recover';
 if(hero.stun>0)return 'hit';
 if(hero.guardStun>0)return 'guard-hit';
 if(hero.special>0)return 'special';
 if(hero.anim>0)return hero.attack;
 if(hero.dash)return hero.dash.back?'dash-back':'dash-forward';
 if(hero.y<GROUND-.5)return hero.vy<0?'jump':'fall';
 if(hero.block)return 'block';
 if(Math.abs(hero.vx)>12)return 'walk';
 return 'idle';
}

function syncAnimation(dt=0){
 const state=animationState();
 if(hero.state!==state){hero.previousState=hero.state;hero.state=state;hero.stateTime=0;}
 else hero.stateTime+=dt;
}

function attackSpec(key){
 const kick=key==='kick',fast=selected===2;
 return {key,kick,duration:kick?(fast?.41:.50):(fast?.27:.36),startup:kick?(fast?.145:.19):(fast?.09:.12),active:kick?.105:.075,damage:heroes[selected].damage*(kick?1.5:1)};
}

function attackPose(){
 const a=hero.pendingAttack||attackSpec(hero.attack),time=hero.attackDuration-hero.anim;
 if(a.kick){if(time<a.startup*.40)return 15;if(time<a.startup*.73)return 10;if(time<a.startup)return 11;if(time<a.startup+a.active)return 12;const p=(time-a.startup-a.active)/(a.duration-a.startup-a.active);return p<.32?11:p<.68?10:p<.9?15:0;}
 if(time<a.startup*.45)return 7;if(time<a.startup)return 8;if(time<a.startup+a.active)return 9;
 const p=(time-a.startup-a.active)/(a.duration-a.startup-a.active);return p<.37?8:p<.74?7:0;
}

function heroPose(){
 const state=animationState();
 if(state==='defeat')return ending<.16?13:ending<.38?15:14;
 if(state==='knockdown')return hero.knockdown>.69?13:hero.knockdown>.55?15:14;
 if(state==='recover')return 15;
 if(state==='hit')return hero.stun>.08?13:15;
 if(state==='guard-hit')return 15;
 if(state==='special'){
  if(selected===0)return hero.specialTick<.075?7:hero.specialTick<.13?8:hero.specialTick<.46?9:7;
  if(selected===1)return hero.specialTick<.08?7:hero.specialTick<.12?8:hero.specialTick<.46?9:hero.specialTick<.68?8:hero.specialTick<.86?7:0;
  const cycle=hero.specialTick%.17;return cycle<.045?7:cycle<.08?8:9;
 }
 if(state==='dash-forward'||state==='dash-back')return dashPose();
 if(state==='punch'||state==='kick')return attackPose();
 if(state==='jump')return 10;if(state==='fall')return 6;
 if(state==='block')return 0;
 if(state==='walk')return 1+Math.floor(((hero.walkCycle%1)+1)%1*6);
 return 0;
}

function heroScale(index){return heroes[index].height/atlasDefinitions[index].referenceHeight;}

function heroStageBounds(face=hero.face){
 const m=atlasDefinitions[selected],s=heroScale(selected);let left=0,right=0;
 for(const f of m.frames){left=Math.max(left,f.anchor[0]*s);right=Math.max(right,(f.rect[2]-f.anchor[0])*s);}
 const ds=heroes[selected].height/dashDefinitions[selected].referenceHeight;
 for(const f of dashDefinitions[selected].frames){left=Math.max(left,f.anchor[0]*ds);right=Math.max(right,(f.rect[2]-f.anchor[0])*ds);}
 return face>0?{min:left+16,max:W-right-16}:{min:right+16,max:W-left-16};
}

function heroArt(index,pose,x,feet,face=1,alpha=1,breath=0){
 const dashing=pose>=16,definition=dashing?dashDefinitions[index]:atlasDefinitions[index];
 const im=dashing?dashSheet:animationSheets[index],f=definition.frames[dashing?pose-16:pose];
 if(!im.complete||!im.width){sprite(index,x,feet,heroes[index].height,face,0,alpha);return;}
 const s=heroes[index].height/definition.referenceHeight,[sx,sy,sw,sh]=f.rect;
 ctx.save();ctx.globalAlpha*=alpha;ctx.translate(x,feet);ctx.scale(face*s,s*(1+breath));
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(im,sx,sy,sw,sh,-f.anchor[0],-f.anchor[1],sw,sh);ctx.restore();
}

function fighter(x,y,lean,celebration,defeated){
 if(!hero){heroArt(selected,0,x,y);return;}
 const state=animationState(),pose=heroPose();let ox=0,feet=y,breath=0;
 if(state==='walk'){
  // Six authored contact/down/passing drawings. Phase follows distance, not frame rate.
  // Within each exposure compensate translation so the supporting foot does not slide.
  const fraction=((hero.walkCycle%1+1)%1*6)%1;
  ox=-(fraction-.5)*(hero.stride/6)*hero.face;
 }else if(state==='idle'||state==='block'||state==='victory'){
  breath=Math.sin(hero.idleTime*2.6)*.0035;
 }
 if(state==='guard-hit')ox=-hero.face*Math.sin(hero.guardStun/.16*Math.PI)*5;
 if(state==='victory')feet=GROUND-Math.abs(Math.sin(ending*5))*16;
 if(state==='defeat')feet=GROUND-Math.max(0,GROUND-(hero.defeatY||GROUND))*Math.max(0,1-ending/.38);
 if(hero.landing>0&&state==='idle')breath-=.014*(hero.landing/.09);
 // Never blink or cross-fade body parts during invulnerability.
 heroArt(selected,pose,x+ox,feet,hero.face,1,breath);
}

function attackHitbox(a){
 const pose=a.kick?12:9,f=atlasDefinitions[selected].frames[pose],s=heroScale(selected);
 const tip=(f.rect[2]-f.anchor[0]-5)*s;
 const above=(a.kick?[188,170,187]:[193,185,202])[selected]*s;
 const width=a.kick?64:52,height=a.kick?48:40;
 const cx=hero.x+a.face*(tip-width*.32);
 return {x:cx-width/2,y:hero.y-above-height/2,w:width,h:height,cx,cy:hero.y-above};
}

function resolveHeroAttack(dt){
 const a=hero.pendingAttack;if(!a)return;
 a.elapsed+=dt;hero.anim=Math.max(0,a.duration-a.elapsed);
 if(!a.hit&&a.elapsed+1e-8>=a.startup&&a.elapsed<a.startup+a.active){
  const box=attackHitbox(a),bw=[190,210,170,230,170,210,160,135][opponent];
  if(!spreeInvisible()&&rectHit(box.x,box.y,box.w,box.h,boss.x-bw/2,GROUND-320-(opponent===6?(boss.jump||0):0),bw,310)){
   a.hit=true;const contactX=clamp(box.cx,boss.x-bw/2,boss.x+bw/2);
   effects.push({type:'slash',x:contactX,y:box.cy,life:.16,max:.16,dir:a.face,kick:a.kick});
   hitBoss(a.damage,a.face,5,a.kick?'kick':'punch',{x:contactX,y:box.cy});
  }
 }
 if(!a.hit&&!a.missSound&&a.elapsed>=a.startup+a.active){a.missSound=true;combatSound('whoosh',a.kick?1:.7);}
 if(a.elapsed+1e-8>=a.duration){hero.pendingAttack=null;hero.anim=0;}
}

function action(k,fromBuffer=false){
 audio();if(mode!=='fight'||paused||!hero)return;
 if(hero.stun>0||hero.knockdown>0||hero.guardStun>0||hero.special>0)return;
 if(hero.dash){
  if(!fromBuffer&&['jump','punch','kick','special'].includes(k))hero.buffer={key:k,ttl:.13};
  return;
 }
 if(hero.anim>0||((k==='punch'||k==='kick')&&hero.cd>1e-7)){
  if(!fromBuffer&&['jump','punch','kick','special'].includes(k))hero.buffer={key:k,ttl:.11};
  return;
 }
 if(k==='jump'&&hero.jumps<2){hero.vy=hero.jumps?-510:-610;hero.jumps++;hero.block=false;hero.landing=0;combatSound('whoosh',.45);burst(hero.x,hero.y,12,'#ecffba');}
 if((k==='punch'||k==='kick')&&!held('block')){
  const a=attackSpec(k);hero.attack=k;hero.attackDuration=a.duration;hero.anim=a.duration;hero.cd=a.duration;hero.block=false;
  hero.pendingAttack={...a,face:hero.face,elapsed:0,hit:false,missSound:false};
 }
 if(k==='special'&&hero.power>=100){hero.power=0;hero.special=selected===0?.65:1.05;hero.specialTick=0;hero.origin=hero.x;hero.inv=1.1;hero.slam=false;hero.specialLaunched=false;hero.rockFx=null;hero.blitzTick=0;hero.block=false;banner=heroes[selected].move;bannerTime=1.2;combatSound(selected===0?'wind':'whoosh',.85);}
 syncAnimation();
}

function stepHero(dt){
 for(const k of ['hitReact','stun','guardStun','knockdown','landing','cd','inv','dashCooldown'])hero[k]=Math.max(0,(hero[k]||0)-dt);
 if(hero.buffer){hero.buffer.ttl-=dt;if(hero.buffer.ttl<=0)hero.buffer=null;else if(!hero.dash&&hero.anim<=0&&hero.cd<=1e-7){const key=hero.buffer.key;hero.buffer=null;action(key,true);}}
 const locked=hero.stun>0||hero.knockdown>0||hero.guardStun>0;
 if(!locked&&!hero.dash&&hero.anim<=0&&hero.special<=0)hero.face=boss.x>=hero.x?1:-1;
 hero.block=held('block')&&hero.y>=GROUND&&!locked&&!hero.dash&&hero.special<=0&&hero.anim<=0;
 const move=(held('right')?1:0)-(held('left')?1:0),wasDashing=!!hero.dash;
 const canMove=!locked&&!wasDashing&&!hero.block&&hero.special<=0&&hero.anim<=0;
 const limits=heroStageBounds(),oldX=hero.x;
 if(wasDashing)stepDash(dt,limits);
 else{
  if(locked)hero.vx*=Math.exp(-7*dt);
  else{const target=canMove?move*heroes[selected].speed:0,accel=heroes[selected].speed*(move&&canMove?11:15);hero.vx+=clamp(target-hero.vx,-accel*dt,accel*dt);}
  hero.x=clamp(hero.x+hero.vx*dt*atomSlowFactor(),limits.min,limits.max);
  if(hero.x===limits.min||hero.x===limits.max)hero.vx=0;
 }
 if(canMove&&hero.y>=GROUND&&Math.abs(hero.vx)>12){hero.walkCycle+=(hero.x-oldX)*hero.face/hero.stride;}else hero.idleTime+=dt;
 const wasAir=hero.y<GROUND-.1;hero.vy+=1500*dt;hero.y+=hero.vy*dt;
 if(hero.y>=GROUND){hero.y=GROUND;hero.vy=0;hero.jumps=0;if(wasAir){hero.landing=.09;if(hero.knockdown>0&&!hero.fallLanded){hero.fallLanded=true;combatSound('fall',1);burst(hero.x,GROUND,12,'#e8dcad');}else combatSound('fall',.28);}}
 if(!spreeInvisible()&&Math.abs(hero.x-boss.x)<105&&hero.y>GROUND-130&&!(hero.special>0&&selected===2)){
  const sign=hero.x<boss.x?-1:1,gap=105-Math.abs(hero.x-boss.x),before=hero.x;
  hero.x=clamp(hero.x+sign*gap/2,limits.min,limits.max);boss.x=clamp(boss.x-sign*(gap-Math.abs(hero.x-before)),150,1120);
  if(Math.abs(hero.x-boss.x)<105)hero.x=clamp(boss.x+sign*105,limits.min,limits.max);
 }
 resolveHeroAttack(dt);syncAnimation(dt);
}

function kneel(x,face){const p=clamp(ending/.78,0,1),ease=1-Math.pow(1-p,3),h=heroes[selected].height;const r=[[0,62,658,553],[678,70,634,545],[0,626,643,563]][selected];const height=h*.72;const air=Math.max(0,GROUND-(hero.defeatY||GROUND))*(1-ease);const feet=GROUND-air-16*(1-ease);if(p<.25){sprite(selected,x-face*p*25,feet,h*(1-p*.3),face,-face*.10*p,1-p/.25)}artPart(r,x-face*9,feet-height/2,height*r[2]/r[3],height,clamp(p/.25,0,1),-face*.02*(1-ease),face);if(p>.7&&p<1){ctx.strokeStyle='#e5d6a880';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x,GROUND,60*p,7,0,0,Math.PI*2);ctx.stroke()}}

function powerArt(im,r,x,y,w,h,dir=1,alpha=1,angle=0){
 if(!im.complete||!im.width)return;
 ctx.save();ctx.globalAlpha*=clamp(alpha,0,1);ctx.translate(x,y);ctx.rotate(angle);ctx.scale(dir,1);
 ctx.drawImage(im,...r,-w/2,-h/2,w,h);ctx.restore();
}

function specialHand(){
 const pose=heroPose(),reach=pose===7?-28:pose===8?69:104;
 return {x:hero.x+hero.face*reach,y:hero.y-heroes[selected].height*(pose===7?.72:.66)};
}

function tornado(s){
 const age=Math.max(0,2.8-s.life),grow=.68+.32*Math.min(1,age/.15),fade=clamp(s.life/.25,0,1),height=322*grow;
 const frame=(age*10)%4,index=Math.floor(frame),blend=frame-index;
 ctx.save();ctx.translate(s.x,s.y);ctx.rotate(Math.sin(age*8)*.013*s.dir);
 ellipse(0,2,91*grow,13,'#40644733');
 powerArt(windFX,windRects[index],Math.sin(age*9)*3,-height/2+7,height,height,s.dir,(1-blend)*fade);
 powerArt(windFX,windRects[(index+1)%4],Math.sin(age*9)*3,-height/2+7,height,height,s.dir,blend*fade);
 // Fine front wind filaments keep the authored rotation fluid between frames.
 for(let i=0;i<4;i++){const q=(age*1.9+i/4)%1,yy=-28-q*(height-68),radius=18+q*94,a=age*16+i*1.57;
  ctx.strokeStyle=`rgba(229,255,238,${.24*fade})`;ctx.lineWidth=1.6;ctx.beginPath();ctx.ellipse(Math.sin(a)*5,yy,radius,8+q*8,-.15,a,a+1.15);ctx.stroke();}
 ctx.restore();
}

function drawHeroPower(){
 if(!hero||hero.special<=0||selected===2)return;
 const p=specialHand(),a=hero.specialTick,fade=clamp(1-Math.max(0,a-.14)/.30,0,1),radius=14+Math.min(1,a/.12)*11;
 if(fade<=0)return;
 ctx.save();ctx.globalAlpha=fade*.72;const g=ctx.createRadialGradient(p.x,p.y,1,p.x,p.y,radius);
 g.addColorStop(0,'#fffce5');g.addColorStop(.28,selected===0?'#d9fff3':'#ffe49c');g.addColorStop(1,selected===0?'#6feab000':'#ffc05b00');
 ctx.fillStyle=g;ctx.fillRect(p.x-radius,p.y-radius,radius*2,radius*2);ctx.restore();
}

function makeRockSmash(x,dir){
 const fx={type:'rockSmash',x,y:GROUND-151,dir,life:1.25,max:1.25,burst:false,dissipate:false};effects.push(fx);return fx;
}

function breakRock(fx,x){
 fx.x=x;fx.burst=true;fx.life=.72;fx.max=.72;
 fx.shards=Array.from({length:6},(_,i)=>({vx:(i-2.5)*65,vy:-160-(i%3)*50,size:16+(i%3)*7,spin:(i%2?1:-1)*(2+i*.3)}));
}

function drawPowerEffect(e){
 const age=e.max-e.life;
 if(e.type==='superPunch'){
  const length=Math.max(70,Math.abs(e.x-e.fromX)),fade=clamp(e.life/.16,0,1),grow=clamp(age/.045,0,1);
  const endX=e.fromX+(e.x-e.fromX)*grow;
  powerArt(rockFX,rockRects[7],(e.fromX+endX)/2,(e.fromY+e.y)/2,length*grow,92,e.dir,fade*.92);
 }
 if(e.type==='rockSmash'){
  if(e.dissipate){powerArt(rockFX,rockRects[5],e.x,e.y,280,278,e.dir,clamp(e.life/.2,0,1)*.5);return;}
  if(!e.burst){const progress=clamp(age/.29,0,1),size=212+34*progress;
   powerArt(rockFX,rockRects[0],e.x,e.y,size,size,e.dir,(1-progress)*.92);
   powerArt(rockFX,rockRects[1],e.x,e.y,size,size,e.dir,progress*.95);
  }else{
   const frame=age<.10?2:age<.23?3:age<.42?4:5,size=246+Math.min(age,.43)*200;
   powerArt(rockFX,rockRects[frame],e.x,e.y,size,size,e.dir,clamp(e.life/.22,0,1));
   for(const shard of e.shards||[]){const xx=e.x+shard.vx*age,yy=Math.min(GROUND-8,e.y+shard.vy*age+420*age*age);
    powerArt(rockFX,rockRects[6],xx,yy,shard.size,shard.size,1,clamp(e.life/.24,0,1),age*shard.spin);}
   ctx.save();ctx.globalAlpha=clamp(e.life/.5,0,1)*.17;ellipse(e.x,GROUND-2,65+age*180,8+age*8,'#d6ae77');ctx.restore();
  }
 }
}

function advanceEffects(dt){
 for(const e of effects){e.life-=dt;if(e.type==='rockSmash'&&!e.burst&&!e.dissipate){if(mode==='fight')e.x=boss.x;else{e.dissipate=true;e.life=Math.min(e.life,.2);}}}
 effects=effects.filter(e=>e.life>0);
}

function stepSpecial(dt){
 if(hero.special<=0)return;hero.special=Math.max(0,hero.special-dt);hero.specialTick+=dt;
 if(selected===0&&!hero.specialLaunched&&hero.specialTick>=.12){hero.specialLaunched=true;shots.push({x:hero.x+hero.face*90,y:GROUND,dir:hero.face,life:2.8,hit:0});}
 if(selected===1){
  if(!hero.specialLaunched&&hero.specialTick>=.12){
   hero.specialLaunched=true;const hand=specialHand(),inRange=Math.abs(hero.x-boss.x)<440;
   const target=inRange?boss.x:hero.x+hero.face*360;
   effects.push({type:'superPunch',x:target,y:GROUND-165,fromX:hand.x,fromY:hand.y,dir:hero.face,life:.24,max:.24});
   if(inRange)hero.rockFx=makeRockSmash(boss.x,hero.face);
   if(Math.abs(hero.x-boss.x)<240)hitBoss(32,hero.face,0,'special',{x:boss.x-hero.face*65,y:GROUND-165});
  }
  if(hero.specialTick>=.42&&!hero.slam){
   hero.slam=true;
   if(Math.abs(hero.x-boss.x)<440){
    const fx=hero.rockFx&&effects.includes(hero.rockFx)?hero.rockFx:makeRockSmash(boss.x,hero.face);
    breakRock(fx,boss.x);shake=15;combatSound('ground',1.15);hitBoss(72,hero.face,0,'special',{x:boss.x,y:GROUND-151});
   }else{if(hero.rockFx){hero.rockFx.dissipate=true;hero.rockFx.life=.2;}combatSound('whoosh',.65);}
  }
 }
 if(selected===2){const tick=Math.floor((hero.specialTick+1e-8)/.17);if(tick>hero.blitzTick&&tick<=5){hero.blitzTick=tick;hero.x=boss.x+(tick%2?-105:105);hero.face=boss.x>=hero.x?1:-1;const b=heroStageBounds();hero.x=clamp(hero.x,b.min,b.max);hitBoss(20,hero.face,0);effects.push({type:'ghost',x:hero.x,y:hero.y,face:hero.face,life:.2,max:.2});}
  if(hero.special<=0){const b=heroStageBounds();hero.x=clamp(hero.origin,b.min,b.max);}}
 syncAnimation();
}
