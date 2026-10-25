'use strict';

// Story team state is reset whenever players return to the game modes.
Object.assign(story, {team:[], tag:null, tagQueued:false, tagCooldown:0, tagPadDown:false});
const teamModes=showModeSelect;
showModeSelect=function(...args){
  story.team=[];story.tag=null;story.tagQueued=false;story.tagCooldown=0;
  storyTagButton.hidden=true;
  return teamModes(...args);
};
const teamFight=startStoryFight;
startStoryFight=function(...args){
  const value=teamFight(...args);
  if(mode==='fight'&&story.active){
    story.team=heroes.map((_,i)=>i===selected?hero:JSON.parse(JSON.stringify(hero)));
    story.tag=null;story.tagQueued=false;story.tagCooldown=0;story.tagPadDown=true;
  }
  return value;
};

// All three hero objects retain their own health and special charge while benched.
function storyNextHero() {
  for(let step=1;step<heroes.length;step++){const i=(selected+step)%heroes.length;if(story.team[i]?.hp>0)return i;}
  return -1;
}
function storyTagReady() {
  // Wait for the current move / projectile to finish so its damage and special
  // movie keep the correct owner. A queued tag must not disable combat inputs.
  return story.active&&mode==='fight'&&!paused&&!story.playing&&!specialSceneLocked()&&hero&&hero.hp>0&&
    !story.tag&&story.tagCooldown<=0&&hero.y>=GROUND-.5&&hero.jumps===0&&
    !hero.dash&&hero.anim<=0&&hero.special<=0&&hero.stun<=0&&hero.knockdown<=0&&hero.guardStun<=0&&shots.length===0;
}
function requestStoryTag() {
  if(!story.active||mode!=='fight'||paused||story.playing||specialSceneLocked()||story.tag||storyNextHero()<0)return false;
  if(storyTagReady())return beginStoryTag(false);
  story.tagQueued=true;return true;
}
function storyResetMotion(p) {
  Object.assign(p,{comboChain:null,vx:0,vy:0,y:GROUND,jumps:0,walkCycle:0,idleTime:0,state:'idle',previousState:'idle',stateTime:0,
    dash:null,dashCooldown:0,hitReact:0,knockdown:0,stun:0,guardStun:0,landing:0,cd:0,inv:0,anim:0,attack:'',
    special:0,specialTick:0,pendingAttack:null,buffer:null,block:false,cinematicSpecial:null,rockFx:null});
}
function beginStoryTag(automatic=false) {
  const next=storyNextHero();if(next<0||story.tag)return false;
  const side=hero.x<=boss.x?-1:1,edge=side<0?-280:W+280;
  story.tag={from:selected,to:next,side,edge,spot:hero.x,phase:automatic?'down':'out',age:0,
    origin:hero.x,startY:hero.y,duration:automatic?.6:clamp(Math.abs(edge-hero.x)/2000,.20,.34),distance:0,steps:0,automatic,input:null};
  // Keep live keyboard, controller and touch holds through the handoff. Clearing
  // them here loses a held analog pointer / key until the player releases it.
  story.tagQueued=false;directionTaps={};hitStop=0;comboTime=0;
  if(!automatic)storyResetMotion(hero);
  else{hero.pendingAttack=null;hero.anim=0;hero.special=0;hero.buffer=null;hero.dash=null;hero.block=false;hero.vx=0;hero.vy=0;}
  hero.face=side;hero.inv=10;
  combatSound('whoosh',.45);
  return true;
}
function storyTagEnter() {
  const tag=story.tag;
  selected=tag.to;hero=story.team[selected];storyResetMotion(hero);
  hero.x=tag.edge;hero.face=-tag.side;hero.inv=10;
  const limits=heroStageBounds(hero.face);
  tag.spot=clamp(tag.spot,limits.min,limits.max);
  tag.phase='in';tag.age=0;tag.origin=tag.edge;tag.distance=0;tag.steps=0;
  tag.duration=clamp(Math.abs(tag.spot-tag.edge)/2000,.22,.36);
}
// Ramp the velocity at the ends, with a constant-speed sprint through the middle.
function storyRunProgress(p) {
  const ramp=.16,area=1-ramp;
  if(p<ramp)return p*p/(2*ramp*area);
  if(p>1-ramp)return 1-(1-p)*(1-p)/(2*ramp*area);
  return (p-ramp/2)/area;
}
function stepStoryTag(dt) {
  const tag=story.tag;tag.age=Math.min(tag.duration,tag.age+dt);
  if(tag.input){tag.input.ttl-=dt;if(tag.input.ttl<=0)tag.input=null;}
  if(tag.phase==='down'){
    hero.y=tag.startY+(GROUND-tag.startY)*Math.min(1,tag.age/.3);
    if(tag.age>=tag.duration)storyTagEnter();
    return;
  }
  const target=tag.phase==='out'?tag.edge:tag.spot,oldX=hero.x;
  hero.x=tag.origin+(target-tag.origin)*storyRunProgress(tag.age/tag.duration);
  hero.vx=(hero.x-oldX)/dt;hero.face=Math.sign(target-tag.origin);hero.y=GROUND;
  tag.distance+=Math.abs(hero.x-oldX);hero.walkCycle=tag.distance/220;
  const steps=Math.floor(hero.walkCycle*2);
  if(steps>tag.steps&&hero.x>0&&hero.x<W){dashDust(hero.x,hero.face,3);combatSound('fall',.14);}
  tag.steps=steps;
  if(tag.age+1e-8>=tag.duration){
    if(tag.phase==='out')storyTagEnter();
    else{
      hero.x=tag.spot;hero.face=boss.x>=hero.x?1:-1;hero.vx=0;hero.inv=.35;hero.state='idle';hero.block=held('block');
      story.tag=null;story.tagCooldown=.35;directionTaps={};syncAnimation();
      // Resume on the arrival frame, without requiring a controller-neutral
      // cycle. A recent attack or jump during the entrance is accepted once.
      if(tag.input)action(tag.input.key);
    }
  }
}
const teamStep=updateStep;
updateStep=function(dt){
  if(story.active&&mode==='fight'){
    if(paused||specialSceneLocked())return;
    story.tagCooldown=Math.max(0,story.tagCooldown-dt);
    if(story.tagQueued&&storyTagReady())beginStoryTag();
    if(story.tag){t+=dt;elapsed+=dt;stepStoryTag(dt);updateParticles(dt);return;}
  }
  return teamStep(dt);
};
const teamHit=hitHero;
hitHero=function(...args){if(story.active&&story.tag)return false;return teamHit(...args);};
const teamFinish=finish;
finish=function(win){
  if(story.active&&!win&&storyNextHero()>=0){if(!story.tag)beginStoryTag(true);return;}
  story.tag=null;story.tagQueued=false;return teamFinish(win);
};
const teamAction=action;
action=function(key,fromBuffer=false){
  if(story.active&&story.tag){
    if(!paused&&!fromBuffer&&['jump','punch','kick','special'].includes(key))story.tag.input={key,ttl:.16};
    return;
  }
  return teamAction(key,fromBuffer);
};
const teamDirection=directionPress;
directionPress=function(...args){if(story.active&&story.tag)return false;return teamDirection(...args);};
const teamFighter=fighter;
fighter=function(x,y,...args){
  const tag=story.active&&story.tag;
  if(!tag)return teamFighter(x,y,...args);
  if(tag.phase==='down'){
    heroArt(selected,tag.age<.15?13:tag.age<.32?15:14,x,y,hero.face,Math.min(1,(tag.duration-tag.age)/.15));return;
  }
  const cycle=((hero.walkCycle%1)+1)%1,pose=1+Math.floor(cycle*6);
  const speed=Math.min(1,Math.abs(hero.vx)/1300),bob=Math.abs(Math.sin(cycle*Math.PI*2))*6*speed;
  // Keep the complete authored sprite. Lean about the planted feet, never slide a static pose.
  const plant=-(((cycle*6)%1)-.5)*(220/6)*hero.face*speed;
  ctx.save();ctx.translate(x,y-bob);ctx.rotate(hero.face*.11*speed);
  heroArt(selected,pose,plant,0,hero.face,1,0);ctx.restore();
};

const storyTagButton=document.createElement('button');
storyTagButton.id='story-tag';storyTagButton.type='button';storyTagButton.hidden=true;
storyTagButton.setAttribute('aria-label','Tag next hero. Keyboard Q or controller RT / R2.');
storyTagButton.innerHTML='<b>TAG</b><small>Q · RT / R2</small>';
cleanStage.append(storyTagButton);
storyTagButton.onclick=e=>{e.preventDefault();requestStoryTag();};
const teamDraw=draw;
draw=function(...args){
  const value=teamDraw(...args);
  storyTagButton.hidden=!(story.active&&mode==='fight'&&!paused&&!story.playing&&!specialSceneLocked()&&overlay.classList.contains('hidden'));
  storyTagButton.disabled=!!story.tag||storyNextHero()<0;
  storyTagButton.querySelector('b').textContent=story.tag?'SWAPPING':story.tagQueued?'QUEUED':'TAG';
  if(!storyTagButton.hidden){
    const w=parseFloat(cleanTouch.style.width),h=parseFloat(cleanTouch.style.height);
    const portrait=cleanTouch.dataset.layout==='portrait';
    storyTagButton.style.left=(parseFloat(cleanTouch.style.left)+w*(portrait?.5:.4))+'px';
    storyTagButton.style.top=(parseFloat(cleanTouch.style.top)+(portrait?48:h-8))+'px';
  }
  return value;
};
const teamHud=hud;
hud=function(...args){
  if(!story.active||!story.team.length)return teamHud(...args);
  ctx.save();ctx.shadowColor='#071b28';ctx.shadowBlur=4;ctx.shadowOffsetY=1;
  story.team.forEach((p,i)=>{
    const x=30+i*216,width=202,active=i===selected,color=p.hp<=0?'#86959f':heroes[i].color;
    battleText(heroes[i].name,x,21,16,color);
    rect(x,28,width,21,'#0a2029c9');rect(x,28,width*clamp(p.hp/100,0,1),21,color);
    if(active){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(x-3,25,width+6,27);}
    battleText(p.hp<=0?'OUT':Math.ceil(p.hp)+' HP'+(active?' · ACTIVE':''),x,68,12,color);
    if(p.power>=100&&p.hp>0){
      ctx.save();ctx.shadowColor='#dcff75';ctx.shadowBlur=10+8*Math.sin(t*7);battleText('SPECIAL',x+width,68,15,'#efffa6','right');ctx.restore();
    }else{rect(x,76,width,4,'#0a2029a8');rect(x,76,width*clamp(p.power/100,0,1),4,color);}
  });
  battleText(villainNames[opponent]+' · '+storyOpponentRound()+' / 3',1250,21,18,'#ffe3c7','right');
  rect(830,28,420,21,'#0a2029a8');rect(1250-420*clamp(boss.hp/boss.max,0,1),28,420*clamp(boss.hp/boss.max,0,1),21,'#f5a466');
  if(comboTime>0&&combo>0)battleText(combo+' HITS',36,120,32,'#efffae');
  ctx.restore();
};

const teamPoll=pollPad;
pollPad=function(...args){
  const pads=storyPads(),down=i=>pads.some(p=>p.buttons[i]?.pressed||p.buttons[i]?.value>.5);
  const tagDown=down(7),pressed=tagDown&&!story.tagPadDown;story.tagPadDown=tagDown;
  if(pressed&&story.active&&mode==='fight'&&!paused)requestStoryTag();
  return teamPoll(...args);
};
window.addEventListener('keydown',e=>{
  if(window.HealthiaIntro?.active||story.playing)return;
  if(story.active&&mode==='fight'&&(e.code==='KeyQ'||e.key.toLowerCase()==='q')){
    e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)requestStoryTag();
  }
},true);
