/* Versus-only Bushman. The host owns AI, hit credit and every damaging effect. */
'use strict';
let bushman=BushmanCore.create();
const bushmanImages={motion:new Image(),combat:new Image(),fx:new Image()};
for(const [key,file] of Object.entries({motion:'motion',combat:'combat',fx:'fire-fx'}))bushmanImages[key].src='assets/bushman/'+file+'.webp?v=1';
function bushmanReady(){return Object.values(bushmanImages).every(im=>im.complete&&im.naturalWidth>0);}
function bushmanBegin(kind){
 if(!boss||mode!=='fight'||boss.hitstun>0||boss.breakout||boss.state==='tempest-guard')return false;
 if(!BushmanCore.begin(bushman,kind,hero.x>=boss.x?1:-1,clamp(hero.x,95,W-95)))return false;
 boss.dir=bushman.action.face;boss.state='warn';boss.type=kind;boss.timer=BushmanCore.ATTACKS[kind].windup;bushman.moving=false;
 if(kind==='scorch')bushman.scorchCooldown=7;
 combatSound(kind==='blast'?'wind':'whoosh',kind==='blast'?.8:.45,'vine');return true;
}
function bushmanDamage(d,source,kind,id,cloud=false){
 const before=hero.hp,blocked=hero.block&&!cloud&&Math.sign(source-hero.x)===hero.face;
 const landed=hitHero(d,source,cloud);
 BushmanCore.credit(bushman,id,kind,landed===true&&hero.hp<before,blocked);
 return landed;
}
function bushmanFlare(kind,x,y,face,life=.3){bushman.flares.push({kind,x,y,face,life,max:life});if(bushman.flares.length>24)bushman.flares.shift();}
function bushmanRelease(a){
 const x=boss.x,face=a.face;
 if(a.kind==='punch'||a.kind==='kick'){
  const kick=a.kind==='kick',reach=kick?165:132,above=kick?118:145;
  coEach(()=>{if(BushmanCore.meleeHit(x,face,reach,above,hero)){if(bushmanDamage(BushmanCore.DAMAGE,x,a.kind,a.id))bushmanFlare('impact',hero.x,GROUND-above,face,.22);}});
  combatSound(kick?'kick':'whoosh',.65,'vine');
 }else if(a.kind==='fireball'||a.kind==='scorch'){
  const sx=x+face*102,sy=GROUND-146;
  bushman.projectiles.push({kind:a.kind==='scorch'?'seed':'ball',id:a.id,x:sx,y:sy,sx,sy,face,target:a.target,age:0,life:3.2});
  if(bushman.projectiles.length>12)bushman.projectiles.shift();
  bushmanFlare('impact',sx,sy,face,.16);combatSound('whoosh',.9);
 }else if(a.kind==='blast'){
  bushmanFlare('blast',x+face*28,GROUND-140,face,.6);
  coEach(()=>{if(BushmanCore.blastHit(x,face,hero))bushmanDamage(BushmanCore.BLAST_DAMAGE,x,'blast',a.id);});
  shake=Math.max(shake,14);combatSound('ground',1.2,'vine');combatSound('wind',.95);
 }
}
function updateBushman(dt){
 if(coGuest()||mode!=='fight'||!boss||boss.hp<=0)return;
 bushman.moving=false;
 if(boss.hitstun>0||boss.breakout){BushmanCore.cancel(bushman);bushman.recoil=Math.max(bushman.recoil,.18);boss.cd=Math.max(boss.cd,.45);return;}
 if(boss.state==='tempest-guard'){BushmanCore.cancel(bushman);return;}
 if(bushman.recoil>0){boss.state='recover';return;}
 if(bushman.action){
  const events=BushmanCore.advance(bushman,dt);for(const event of events){bushmanRelease(event);if(mode!=='fight')return;}
  if(bushman.action){const a=bushman.action,p=BushmanCore.ATTACKS[a.kind],s=BushmanCore.stage(a);boss.state=s==='windup'?'warn':s==='active'?'attack':'recover';boss.timer=Math.max(0,(s==='windup'?p.windup:s==='active'?p.windup+p.active:p.windup+p.active+p.recover)-a.age);}
  else{boss.state='idle';boss.cd=.55+Math.random()*.4;}
  return;
 }
 boss.state='idle';boss.cd-=dt;const delta=hero.x-boss.x,dist=Math.abs(delta);boss.dir=delta>=0?1:-1;
 if(dist>151){const before=boss.x;boss.x=clamp(boss.x+boss.dir*Math.min(dist-151,148*dt),150,1120);bushman.walk+=Math.abs(boss.x-before)/110;bushman.moving=Math.abs(boss.x-before)>.05;}
 if(boss.cd>0)return;
 let kind;
 if(bushman.charge>=4&&dist<620)kind='blast';
 else if(bushman.scorchCooldown<=0&&bushman.casts>=2&&bushman.casts%4===2)kind='scorch';
 else if(dist>230)kind='fireball';
 else if(dist>177)kind=Math.random()<.45?'kick':'fireball';
 else kind=bushman.casts%3===2?'fireball':bushman.casts%2?'kick':'punch';
 if(bushmanBegin(kind))bushman.casts++;
}
function advanceBushmanEffects(dt){
 bushman.time+=dt;bushman.recoil=Math.max(0,bushman.recoil-dt);bushman.scorchCooldown=Math.max(0,bushman.scorchCooldown-dt);
 if(boss.breakout)BushmanCore.cancel(bushman);
 for(const p of bushman.projectiles){
  if(mode!=='fight')break;p.age+=dt;p.life-=dt;
  if(p.kind==='seed'){
   const u=Math.min(1,p.age/.7);p.x=p.sx+(p.target-p.sx)*u;p.y=p.sy+(GROUND-18-p.sy)*u-Math.sin(u*Math.PI)*95;
   if(u>=1){p.life=0;bushman.zones=[{x:p.target,radius:76,life:5.5,tick:0}];bushmanFlare('impact',p.target,GROUND-24,p.face,.32);combatSound('ground',.6);}
  }else{
   const old=p.x;p.x+=p.face*440*dt;
   coEach(()=>{if(p.life>0&&BushmanCore.segmentHit(old,p.x,p.y,20,hero)){
    bushmanDamage(BushmanCore.DAMAGE,p.x-p.face*60,'fireball',p.id);p.life=0;bushmanFlare('impact',p.x,p.y,p.face,.25);
   }});
  }
 }
 bushman.projectiles=bushman.projectiles.filter(p=>p.life>0&&p.x>-150&&p.x<W+150);
 for(const z of bushman.zones){z.life-=dt;z.tick-=dt;if(z.life>0&&z.tick<=0){z.tick=.72;coEach(()=>{if(BushmanCore.zoneHit(z,hero))bushmanDamage(4,z.x,'burn',0,true);});}}
 bushman.zones=bushman.zones.filter(z=>z.life>0);
 for(const f of bushman.flares)f.life-=dt;bushman.flares=bushman.flares.filter(f=>f.life>0);
}
(function(){
 villainNames.push('BUSHMAN');villainMoves.push('FIRE PUNCH • FLAME KICK • FIREBALLS • WILDFIRE BLAST');
 breakoutStyles.push({name:'EMBER BREAK',color:'#ffad4f',shape:'scrap'});
 const oldPortrait=enemyPortrait;enemyPortrait=function(i){return i===8?'assets/bushman/portrait.webp?v=1':oldPortrait(i);};
 const oldMaterial=bossMaterial;bossMaterial=function(){return opponent===8?'vine':oldMaterial();};
 const oldStart=start;start=function(...args){
  if(opponent===8&&!bushmanReady()){
   overlay.classList.remove('hidden');overlay.innerHTML='<section class="panel"><h2>Bushman’s artwork is loading.</h2><p>All three sprite sheets must load before this fight starts.</p><div class="row"><button id="bushman-back">CHOOSE OPPONENT</button><button id="bushman-retry">RETRY</button></div></section>';
   document.getElementById('bushman-back').onclick=showOpponent;document.getElementById('bushman-retry').onclick=()=>{for(const im of Object.values(bushmanImages))if(!im.naturalWidth)im.src=im.src.split('?')[0]+'?retry='+Date.now();start(...args);};return;
  }
  if(coGuest()||(coop.kind==='online'&&!coop.ready))return oldStart(...args);
  bushman=BushmanCore.create();const r=oldStart(...args);if(opponent===8&&mode==='fight'){boss.dir=-1;boss.cd=1.3;banner='';}return r;
 };
 const oldHit=hitBoss;hitBoss=function(...args){const hp=boss?.hp,r=oldHit(...args);if(opponent===8&&boss&&boss.hp<hp&&r!==false){BushmanCore.cancel(bushman);bushman.recoil=.27;if(mode==='fight'){boss.state='recover';boss.cd=.5;}}return r;};
 const oldStep=updateStep;updateStep=function(dt){
  const before=elapsed,should=opponent===8&&mode==='fight'&&!paused&&!coGuest()&&!specialSceneLocked()&&hitStop<=0;
  const r=oldStep(dt);
  if(should&&opponent===8&&mode==='fight'&&elapsed>before&&!specialSceneLocked())advanceBushmanEffects(dt);
  return r;
 };
 const oldFinish=finish;finish=function(...args){const r=oldFinish(...args);if(opponent===8&&mode!=='fight'){BushmanCore.cancel(bushman);bushman.projectiles=[];bushman.zones=[];bushman.flares=[];}return r;};
 const oldState=coState;coState=function(){const s=oldState();if(opponent===8)s.bushman=BushmanCore.snapshot(bushman);return s;};
 const oldReceive=coReceive;coReceive=function(d){if(d?.opponent===8&&!BushmanCore.valid(d.bushman))return;const r=oldReceive(d);if(d?.opponent===8&&opponent===8&&Array.isArray(d.players)&&d.players.length===2&&d.boss&&['fight','victory','defeat'].includes(d.mode))bushman=BushmanCore.snapshot(d.bushman);return r;};
 window.HealthiaBushman={ready:bushmanReady,get state(){return BushmanCore.snapshot(bushman);}};
})();
