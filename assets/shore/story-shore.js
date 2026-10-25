'use strict';
// Chapter 3 follows the cave and rescue in Story Mode. All wrappers delegate unchanged
// whenever the Shore Front encounter is not active.
const shore={active:false,phase:'',model:null,round:1,endTime:0,completed:false,endingPlayed:false,assetError:false,specialPending:false,specialOwner:null};
const shoreBackground=new Image(),shoreAtlas=new Image(),shoreSplitAtlas=new Image(),shoreBossParts=new Image(),shoreBossDeath=new Image();
shoreBossParts.src='assets/shore/boss-parts.png';shoreBossDeath.src='assets/shore/boss-defeat.png';
shoreBackground.src='assets/shore/shore-front.jpg';shoreAtlas.src='assets/shore/scorpion-atlas.png';shoreSplitAtlas.src='assets/shore/scorpion-split.png';
function shoreAssetsReady(){return [shoreBackground,shoreAtlas,shoreSplitAtlas,...(shore.round===3?[shoreBossParts,shoreBossDeath]:[])].every(im=>im.complete&&im.naturalWidth>0);}
function refreshShoreReady(){const b=document.getElementById('shore-begin');if(!b)return;b.disabled=!shoreAssetsReady();b.textContent=shoreAssetsReady()?(shore.round===3?'FACE THE BOSS →':'BEGIN SHORE FRONT →'):shore.assetError?'ARTWORK COULD NOT LOAD':'LOADING SHORE FRONT…';const retry=document.getElementById('shore-reload');if(retry)retry.hidden=!shore.assetError;}
for(const im of [shoreBackground,shoreAtlas,shoreSplitAtlas,shoreBossParts,shoreBossDeath]){im.addEventListener('load',refreshShoreReady);im.addEventListener('error',()=>{shore.assetError=true;refreshShoreReady();});}
function showShoreFront(round=1){
 shore.round=round===3?3:round===2?2:1;
 story.cleanup?.();story.active=true;story.playing=false;story.waiting=false;story.tag=null;
 clearInput();shore.active=true;shore.phase='ready';shore.model=null;shore.completed=false;
 mode='shore-ready';paused=false;scoreTick();
 overlay.classList.remove('hidden');overlay.innerHTML='<section class="panel shore-panel"><div class="eyebrow">STORY MODE / CHAPTER 03</div><h2>SHORE FRONT</h2><p>The pollution puddles are moving.</p><div class="shore-rules"><div><strong>GROUND · KICK</strong><span>Kick any scorpion on the ground.</span></div><div><strong>AIR · PUNCH</strong><span>Punch any scorpion in the air.</span></div></div><p>Watch the bubbling puddles and the crouch before each jump.<br>Keep fighting until the shore is clear.</p><p class="shore-note">Use your usual movement, block, jump and attack controls.<br>Tag: Q · screen TAG · RT / R2. Each girl keeps her own health.<br>A charged special clears every scorpion in the arena.</p><div class="row"><button class="primary" id="shore-begin">BEGIN SHORE FRONT →</button><button id="shore-heroes">CHOOSE HERO</button><button id="shore-exit">GAME MODES</button><button id="shore-reload" hidden>RELOAD ARTWORK</button></div></section>';
 if(shore.round===3)overlay.innerHTML='<section class="panel shore-panel"><div class="eyebrow">STORY MODE / CHAPTER 03 · FINAL BATTLE</div><h2>THE TOXIN SCORPION</h2><p>Something bigger rises from the shore.</p><div class="shore-rules"><div><strong>CLAW · DODGE OR COUNTER</strong><span>Move or jump past the sweep. Punch or kick the claw to knock it away.</span></div><div><strong>STINGER · DODGE, THEN PUNCH</strong><span>After four claw swings, dodge the green target. Punch the exposed stinger to turn it against the boss.</span></div></div><p class="shore-note">The reflected stinger deals the most damage.<br>Attack during recovery and use charged specials to hurt the boss.<br>Same controls. Tag with Q / TAG / RT or R2.</p><div class="row"><button class="primary" id="shore-begin">FACE THE BOSS →</button><button id="shore-heroes">CHOOSE HERO</button><button id="shore-exit">GAME MODES</button><button id="shore-reload" hidden>RELOAD ARTWORK</button></div></section>';
 document.getElementById('shore-begin').onclick=()=>startShoreBattle(shore.round);
 document.getElementById('shore-heroes').onclick=showShoreHeroes;
 document.getElementById('shore-exit').onclick=showModeSelect;
 document.getElementById('shore-reload').onclick=()=>{shore.assetError=false;shoreBackground.src='assets/shore/shore-front.jpg?retry='+Date.now();shoreAtlas.src='assets/shore/scorpion-atlas.png?retry='+Date.now();shoreSplitAtlas.src='assets/shore/scorpion-split.png?retry='+Date.now();shoreBossParts.src='assets/shore/boss-parts.png?retry='+Date.now();shoreBossDeath.src='assets/shore/boss-defeat.png?retry='+Date.now();refreshShoreReady();};
 refreshShoreReady();syncMenuFocus(document.getElementById('shore-begin'));layoutBattleControls();
}
function showShoreHeroes(){
 clearInput();shore.phase='select';mode='shore-select';paused=false;overlay.classList.remove('hidden');
 overlay.innerHTML='<section class="panel shore-panel"><div class="eyebrow">CHAPTER 03 / STARTING HERO</div><h2>Choose your hero.</h2><div class="cards">'+heroes.map((h,i)=>'<button class="card '+(selected===i?'selected':'')+'" data-shore-hero="'+i+'"><img class="portrait" src="'+portraitData(i)+'" alt="'+h.name+'"><h3>'+h.name+'</h3><p>'+h.move+'</p></button>').join('')+'</div><p>All three girls join the battle. Tag freely between living teammates.</p><div class="row"><button class="primary" id="shore-confirm">CONTINUE →</button><button id="shore-exit">GAME MODES</button></div></section>';
 overlay.querySelectorAll('[data-shore-hero]').forEach(b=>b.onclick=()=>{selected=Number(b.dataset.shoreHero);showShoreHeroes();});
 document.getElementById('shore-confirm').onclick=()=>showShoreFront(shore.round);document.getElementById('shore-exit').onclick=showModeSelect;syncMenuFocus();
}
function startShoreBattle(round=shore.round){
 round=round===3?3:round===2?2:1;shore.round=round;
 if(!shoreAssetsReady())return showShoreFront(round);
 coLeave();story.active=true;story.playing=false;story.battle=7;story.tag=null;story.tagQueued=false;story.tagCooldown=0;story.tagPadDown=true;story.releasePad=false;
 shore.active=true;shore.phase='fight';shore.round=round;shore.completed=false;shore.endingPlayed=false;shore.endTime=0;shore.specialPending=false;shore.specialOwner=null;opponent=0;
 start(); // Same fresh battle health and power as the earlier Story Mode fights.
 const template=JSON.parse(JSON.stringify(hero));
 story.team=heroes.map(()=>JSON.parse(JSON.stringify(template)));hero=story.team[selected];hero.x=640;
 shore.model=round===3?new HealthiaShoreBoss.Encounter():new HealthiaShoreCore.Encounter({round});if(round===3)hero.x=380;shore.model.player={x:hero.x,y:hero.y};
 boss.max=boss.hp=650;boss.state='recover';boss.timer=999;boss.x=shoreTarget()?.x||950;
 banner='';bannerTime=0;layoutBattleControls();scoreTick();
}
function playShoreChapterIntro(){
 if(story.playing)return;
 clearInput();shore.active=true;shore.round=1;shore.phase='chapter-cutscene';shore.model=null;shore.completed=false;
 shore.specialPending=false;shore.specialOwner=null;story.active=true;story.tag=null;story.tagQueued=false;
 playStoryMovie('videos/shore-chapter-intro.mp4','CHAPTER 3 · SHORE FRONT',null,true,()=>{
  if(shore.active&&shore.phase==='chapter-cutscene'){startShoreBattle(1);story.releasePad=true;}
 });
 const movie=story.movie;
 movie?.addEventListener('error',()=>{
  if(story.movie===movie&&shore.phase==='chapter-cutscene')document.querySelector('.story-movie-status').textContent='Video could not load. Retry or skip to Shore Front.';
 });
}
function playShoreInterlude(){
 if(story.playing)return;
 clearInput();shore.active=true;shore.phase='cutscene';shore.specialPending=false;story.active=true;
 return playStoryMovie('videos/shore-split.mp4','SHORE FRONT · THE SWARM RETURNS',null,true,()=>{
  if(shore.active&&shore.phase==='cutscene'){startShoreBattle(2);story.releasePad=true;}
 });
}
function playShoreBossIntro(){
 if(story.playing)return;
 clearInput();shore.active=true;shore.round=3;shore.phase='boss-cutscene';shore.specialPending=false;shore.specialOwner=null;
 story.active=true;story.tag=null;story.tagQueued=false;
 playStoryMovie('videos/shore-boss-intro.mp4','SHORE FRONT · THE TOXIN SCORPION',null,true,()=>{
  if(shore.active&&shore.phase==='boss-cutscene'){startShoreBattle(3);story.releasePad=true;}
 });
 const movie=story.movie;
 movie?.addEventListener('error',()=>{
  if(story.movie===movie&&shore.phase==='boss-cutscene')document.querySelector('.story-movie-status').textContent='Video could not load. Retry or skip to the boss fight.';
 });
}
const shoreAction=action;
action=function(key,...args){
 const before=hero?.special||0,value=shoreAction(key,...args);
 if(shore.active&&shore.phase==='fight'&&key==='special'&&before<=0&&hero.special>0){shore.specialPending=true;shore.specialOwner=hero;}
 return value;
};
function shoreTarget(){if(shore.model?.kind==='boss')return shore.model.target();return shore.model?.enemies.slice().sort((a,b)=>Math.abs(a.x-(hero?.x||640))-Math.abs(b.x-(hero?.x||640)))[0];}
function shoreStrikeBox(a){
 const original=attackHitbox(a);
 if(a.key==='kick'){
  // The existing high kick sweeps through a low enemy's footprint. This
  // generous downward contact volume avoids pixel-perfect mobile targeting.
  const first=hero.x+a.face*14,last=original.cx+a.face*36;
  return {x:Math.min(first,last),y:original.y-8,w:Math.abs(last-first),h:Math.max(original.h,GROUND-original.y+10)};
 }
 if(a.key==='sweep')return {...original,y:original.y-22,h:original.h+38};
 const first=hero.x+a.face*14,last=original.cx+a.face*30;
 return {x:Math.min(first,last),y:original.y-22,w:Math.abs(last-first),h:original.h+44};
}
const shoreResolveAttack=resolveHeroAttack;
resolveHeroAttack=function(dt){
 if(!shore.active||shore.phase!=='fight')return shoreResolveAttack(dt);
 const a=hero.pendingAttack;if(!a)return;a.elapsed+=dt;hero.anim=Math.max(0,a.duration-a.elapsed);
 if(a.elapsed+1e-8>=Math.max(0,a.startup-.025)&&a.elapsed<a.startup+a.active+.045){
  a.shoreTargets=a.shoreTargets||new Set();
  const hits=shore.model.strike({key:a.key,box:shoreStrikeBox(a),origin:hero.x,feet:hero.y,face:a.face,targets:a.shoreTargets});
  for(const hit of hits)if(hit.defeated||hit.damage>0||hit.reflected){a.hit=true;hero.power=clamp(hero.power+9,0,100);combo++;best=Math.max(best,combo);comboTime=1.6;combatSound(a.kick?'kick':'punch',.8,'body');shake=Math.max(shake,a.kick?5:4);hitStop=Math.max(hitStop,.035);effects.push({type:'impact',x:hit.x,y:hit.y,life:.18,max:.18});}
 }
 if(!a.hit&&!a.missSound&&a.elapsed>=a.startup+a.active+.045){a.missSound=true;combatSound('whoosh',.5);}
 if(a.elapsed+1e-8>=a.duration){hero.pendingAttack=null;hero.anim=0;}
};
const shoreInvisible=spreeInvisible;
spreeInvisible=function(){return shore.active||shoreInvisible();};
const shoreHitBoss=hitBoss;
hitBoss=function(...args){
 if(!shore.active)return shoreHitBoss(...args);
 if(shore.phase==='fight')combatSound('heavy',.35);
 return false;
};
function finishShore(win){
 shore.phase=win?'victory':'defeat';shore.endTime=0;mode=win?'victory':'defeat';ending=0;
 shore.model.phase=shore.phase;story.tag=null;story.tagQueued=false;hero.defeatY=hero.y;
 hero.pendingAttack=null;hero.anim=0;hero.special=0;hero.block=false;hero.buffer=null;hero.dash=null;hero.vx=0;shore.specialPending=false;shore.specialOwner=null;
 clearInput();shots=[];scoreTick();
}
const shoreFinish=finish;
finish=function(win){
 if(!shore.active)return shoreFinish(win);
 if(!win&&storyNextHero()>=0){if(!story.tag)beginStoryTag(true);return;}
 finishShore(win);
};
function shoreEvents(){
 for(const e of shore.model.drain()){
  if(e.type==='defeat'){
   for(let n=0;n<12;n++)particles.push({x:e.x,y:e.y,vx:(Math.random()-.5)*230,vy:-70-Math.random()*150,life:.25+Math.random()*.3,r:2+Math.random()*5,color:'#12151c'});
  }else if(e.type==='attack'&&mode==='fight'&&!story.tag){const landed=hitHero(e.damage,e.x);if(landed&&e.kind==='poison')for(let n=0;n<10;n++)particles.push({x:hero.x,y:hero.y-110,vx:(Math.random()-.5)*180,vy:-Math.random()*150,life:.4,r:3+Math.random()*3,color:'#b6ee38'});}
  else if(e.type==='parry'||e.type==='reflect'){combatSound(e.type==='reflect'?'heavy':'block',.9);shake=Math.max(shake,e.type==='reflect'?8:4);}
  else if(e.type==='bossSwing')combatSound('whoosh',.5);
  else if(e.type==='stingerLock')combatSound('ground',.35);
  else if(e.type==='bossHurt'){if(e.kind==='reflected-stinger'){shake=Math.max(shake,12);combatSound('heavy',1);effects.push({type:'impact',x:640,y:430,life:.3,max:.3});}}

  else if(e.type==='resist'){combatSound('block',.4);}
  else if(e.type==='leap')combatSound('whoosh',.3);
  else if(e.type==='split'){combatSound('ground',.4);shake=Math.max(shake,3);}
  else if(e.type==='complete'&&shore.phase==='fight')finishShore(true);
 }
}
const shoreUpdate=updateStep;
updateStep=function(dt){
 if(!shore.active)return shoreUpdate(dt);
 if(paused||specialSceneLocked()||!shore.model)return;
 if(!['fight','victory','defeat'].includes(shore.phase))return;
 t+=dt;shake=Math.max(0,shake-dt*25);advanceEffects(dt);updateParticles(dt);
 if(shore.phase!=='fight'){
  ending+=dt;shore.endTime+=dt;shore.model.step(dt,hero);
  if(shore.endTime>=(shore.round===3?3.2:2.1))showShoreResult(shore.phase==='victory');return;
 }
 if(hitStop>0){hitStop=Math.max(0,hitStop-dt);return;}
 elapsed+=dt;music(dt);comboTime=Math.max(0,comboTime-dt);if(!comboTime)combo=0;
 story.tagCooldown=Math.max(0,story.tagCooldown-dt);
 if(story.tagQueued&&storyTagReady())beginStoryTag();
 if(story.tag){stepStoryTag(dt);return;}
 const target=shoreTarget();if(target)boss.x=target.x;else if(hero.special<=0)boss.x=clamp(hero.x+hero.face*180,110,1170);
 stepHero(dt);if(shore.phase!=='fight')return;
 stepSpecial(dt);
 if(shore.specialPending&&shore.specialOwner===hero&&hero.specialTick>=.12){
  shore.specialPending=false;shore.model.clearVenue(hero.face,Math.max(.55,hero.special+.25));
  shake=Math.max(shake,9);combatSound('heavy',.8);effects.push({type:'shoreClear',life:.38,max:.38,color:heroes[selected].color});
 }
 for(const s of shots){s.x+=s.dir*430*dt;s.life-=dt;}
 shots=shots.filter(s=>s.life>0&&s.x>-100&&s.x<W+100);
 shore.model.step(dt,hero);shoreEvents();
};
function playShoreEnding(){
 if(!story.active||!shore.active||shore.round!==3||shore.phase!=='victory'||shore.model?.kind!=='boss'||shore.model.hp!==0||shore.endingPlayed||story.playing)return;
 clearInput();shore.phase='ending-cutscene';shore.specialPending=false;shore.specialOwner=null;
 story.tag=null;story.tagQueued=false;
 return playStoryMovie('videos/shore-chapter-ending.mp4','CHAPTER 3 · ENDING',null,true,()=>{
  if(!shore.active||shore.phase!=='ending-cutscene')return;
  shore.endingPlayed=true;shore.phase='victory';
  showShoreResult(true);scoreTick();
 });
}
function replayStoryFromBeginning(){
 const firstHero=story.mainHeroIndex??selected;
 showModeSelect();selected=firstHero;showStorySelect();
}
function showShoreResult(win,refresh=false){
 if(['chapter-cutscene','boss-cutscene','ending-cutscene'].includes(shore.phase))return;
 if(win&&shore.round===1){if(shore.phase!=='cutscene')playShoreInterlude();return;}
 if(win&&shore.round===2){playShoreBossIntro();return;}
 if(win&&shore.round===3&&shore.phase==='victory'&&shore.model?.hp===0&&!shore.endingPlayed&&!refresh){playShoreEnding();return;}
 if(!refresh&&(shore.phase==='complete'||shore.phase==='retry'))return;
 clearInput();shore.phase=win?'complete':'retry';mode=win?'shore-complete':'shore-defeat';paused=false;
 if(win&&!shore.completed){shore.completed=true;story.chapter3Complete=true;story.chapter3Result={chapter:3,scene:'shore-front',rounds:3,bossDefeated:shore.model.hp===0,reflections:shore.model.reflections,elapsed,health:story.team.map(p=>p.hp)};window.dispatchEvent(new CustomEvent('healthia:shore-complete',{detail:story.chapter3Result}));}
 overlay.classList.remove('hidden');overlay.innerHTML='<section class="panel shore-panel"><div class="eyebrow">STORY MODE / CHAPTER 03</div><h2>'+(win?'CHAPTER 3 COMPLETE':'THE FIGHT ISN’T OVER')+'</h2><p>'+(win?'To be continued…':shore.round===3?'Dodge or counter the claws. After the fourth swing,<br>dodge the stinger, then punch it back. Tag when health is low.':'Watch the jump windup. Kick on the ground, punch in the air,<br>and tag to another hero when health is low.')+'</p><div class="row"><button class="primary" id="shore-retry">'+(win?'REPLAY STORY':'RETRY SHORE FRONT')+'</button>'+(win?'':'<button id="shore-heroes">CHOOSE HERO</button>')+'<button id="shore-exit">GAME MODES</button></div></section>';
 document.getElementById('shore-retry').onclick=()=>win?replayStoryFromBeginning():startShoreBattle(shore.round);if(!win)document.getElementById('shore-heroes').onclick=showShoreHeroes;document.getElementById('shore-exit').onclick=showModeSelect;
 story.releasePad=true;syncMenuFocus(document.getElementById(win?'shore-exit':'shore-retry'));
}
const shorePause=pauseGame;
pauseGame=function(...args){const value=shorePause(...args);if(shore.active&&paused){const choose=document.getElementById('choose');if(choose)choose.onclick=showShoreHeroes;}return value;};
const shoreModes=showModeSelect;
showModeSelect=function(...args){shore.active=false;shore.phase='';shore.model=null;return shoreModes(...args);};
const shoreSelect=showSelect;
showSelect=function(...args){
 if(shore.active)return showShoreHeroes();
 return shoreSelect(...args);
};
const shoreHelp=document.getElementById('help').onclick;
document.getElementById('help').onclick=()=>{
 if(!shore.active)return shoreHelp();const running=mode==='fight',returnPhase=shore.phase;if(running&&!paused)pauseGame();
 overlay.classList.remove('hidden');overlay.innerHTML='<section class="panel shore-panel"><div class="eyebrow">SHORE FRONT / HOW TO PLAY</div><h2>Read the scorpion.</h2><div class="shore-rules"><div><strong>GROUND · KICK</strong><span>Kick any scorpion on the ground.</span></div><div><strong>AIR · PUNCH</strong><span>Punch any scorpion in the air.</span></div></div><p>Keep your usual keyboard, touch or controller controls.<br>Block, move or jump to avoid attacks. Tag with Q / TAG / RT or R2.<br>Charged specials clear all scorpions in the arena.<br>Some scorpions split into two. Their offspring do not split again.</p><button class="primary" id="closehelp">'+(running?'RESUME FIGHT':'BACK')+'</button></section>';
 if(shore.round===3)overlay.innerHTML='<section class="panel shore-panel"><div class="eyebrow">SHORE FRONT / BOSS CONTROLS</div><h2>Turn its sting against it.</h2><p>Move or jump to dodge the claws, or punch / kick them away.<br>After four swings, the green ring marks the stinger target.<br>Dodge the strike, then punch the exposed stinger to hurt the boss most.<br>Hit its body during recovery. Charged specials also deal damage.<br>Tag: Q / TAG / RT or R2. Every hero keeps her own health.</p><button class="primary" id="closehelp">'+(running?'RESUME FIGHT':'BACK')+'</button></section>';
 document.getElementById('closehelp').onclick=()=>{if(running){if(paused)pauseGame();else overlay.classList.add('hidden');}else if(returnPhase==='select')showShoreHeroes();else if(['complete','retry'].includes(returnPhase))showShoreResult(returnPhase==='complete',true);else if(['victory','defeat'].includes(returnPhase))overlay.classList.add('hidden');else showShoreFront(shore.round);};syncMenuFocus(document.getElementById('closehelp'));
};
function shoreMenuBack(){if(mode==='shore-select')showShoreFront(shore.round);else showModeSelect();}
const shorePollPad=pollPad;
pollPad=function(...args){
 if(shore.active&&['shore-ready','shore-select','shore-complete','shore-defeat'].includes(mode)&&!story.releasePad){
  const back=storyPads().some(p=>p.buttons[8]?.pressed||p.buttons[8]?.value>.5);
  if(back&&!gamepadPrev.back&&!document.getElementById('closehelp')){shoreMenuBack();gamepadPrev.back=true;return;}
 }
 return shorePollPad(...args);
};
window.addEventListener('keydown',e=>{if(shore.active&&e.key==='Escape'&&mode.startsWith('shore-')&&!document.getElementById('closehelp')){e.preventDefault();e.stopImmediatePropagation();shoreMenuBack();}},true);
