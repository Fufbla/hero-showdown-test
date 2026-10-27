/* Review-page controls only. Never loaded by the game entry points. */
'use strict';
const preview=document.getElementById('preview'),status=document.getElementById('status'),health=document.getElementById('health');
let reviewHero=0,variant='candidate',session=null,lastError='';
function run(source,report=false){try{return preview.contentWindow.eval(source);}catch(error){if(report)lastError=error.message;return null;}}
function available(){return !!run(`loaded && bushmanReady() && window.HealthiaBushmanAnimation && (!HealthiaBushmanAnimation.enabled || HealthiaBushmanAnimation.ready() || HealthiaBushmanAnimation.metrics().errors.length>0)`);}
function load(v){variant=v;session=null;lastError='';preview.src='index.html'+(v==='original'?'?bushman=original':'');document.getElementById('candidate').setAttribute('aria-pressed',v==='candidate');document.getElementById('original').setAttribute('aria-pressed',v==='original');document.querySelectorAll('[data-demo],#practice,#battle').forEach(b=>b.disabled=true);}
function speed(){
 const slow=document.getElementById('slow').checked;
 run(`if(!window.bushmanReviewStep)window.bushmanReviewStep=updateStep;updateStep=function(dt){if(window.bushmanReviewFrozen)return;return window.bushmanReviewStep(dt*${slow?.25:1});};`);
}
document.getElementById('slow').onchange=speed;
document.getElementById('hold').onchange=()=>run(`window.bushmanReviewHold=${session?.startsWith('demo:')&&document.getElementById('hold').checked?true:false};window.bushmanReviewFrozen=false;`);
function releaseHold(armed){
 run(`window.bushmanReviewFrozen=false;window.bushmanReviewHold=${!!armed};if(!window.bushmanReviewFire)window.bushmanReviewFire=bushmanRelease;bushmanRelease=function(...args){const r=window.bushmanReviewFire(...args);if(window.bushmanReviewHold){window.bushmanReviewFrozen=true;window.bushmanReviewHold=false;}return r;};`);
}
function play(practice,extra=''){
 if(!available())return false;
 lastError='';releaseHold(false);speed();
 const ok=run(`HealthiaIntro.dismiss();HealthiaCave.close();story.cleanup?.();specialSceneReset();coLeave();story.active=false;showModeSelect();selected=${reviewHero};opponent=8;venue=0;versusDifficulty='easy';start();${practice?'hero.power=100;hero.inv=999;boss.cd=999;boss.hp=boss.max=100000;':''}${extra};window.HealthiaAnimation?.resetMetrics();mode==='fight'||mode==='victory';`,true);
 if(!ok)return false;
 if(document.getElementById('mirror').checked)run(`hero.x=W-hero.x;hero.face=-1;boss.x=W-boss.x;boss.dir=1;if(bushman.action){bushman.action.face=1;bushman.action.target=W-bushman.action.target;}for(const p of bushman.projectiles){p.x=W-p.x;p.sx=W-p.sx;p.target=W-p.target;p.face=-p.face;}for(const z of bushman.zones)z.x=W-z.x;for(const f of bushman.flares){f.x=W-f.x;f.face=-f.face;}`);
 session=practice?'practice':'fight';preview.contentWindow.focus();return true;
}
function demo(move){
 let setup=`hero.x=400;boss.x=750;boss.dir=-1;boss.guardCooldown=999;`;
 if(move==='walk')setup+=`hero.x=150;boss.x=1080;`;
 else if(['punch-attack','kick-attack','fireball','scorch','blast'].includes(move)){
  const kind=move.replace('-attack','');setup+=`hero.x=${kind==='punch'||kind==='kick'?600:400};boss.x=750;${kind==='blast'?'bushman.charge=4;':''}bushmanBegin('${kind}');`;
 }else if(move==='defeat')setup+=`boss.hp=1;hitBoss(2,1,0,'punch');`;
 else setup+=`hero.x=450;boss.x=545;hero.face=1;`;
 if(play(true,setup)){
  session='demo:'+move;releaseHold(document.getElementById('hold').checked);
  if(move==='punch'||move==='kick')run(`action('${move}');`);
 }
}
document.getElementById('candidate').onclick=()=>load('candidate');
document.getElementById('original').onclick=()=>load('original');
document.getElementById('practice').onclick=()=>play(true);
document.getElementById('battle').onclick=()=>play(false);
document.querySelectorAll('[data-demo]').forEach(b=>b.onclick=()=>demo(b.dataset.demo));
document.querySelectorAll('[data-hero]').forEach(b=>b.onclick=()=>{
 reviewHero=Number(b.dataset.hero);document.querySelectorAll('[data-hero]').forEach(n=>n.setAttribute('aria-pressed',n===b));
 if(session)play(session!=='fight');
});
setInterval(()=>{
 const ready=available();document.querySelectorAll('[data-demo],#practice,#battle').forEach(b=>b.disabled=!ready);
 if(session?.startsWith('demo:'))run("if(mode==='fight'&&boss.state==='idle')boss.cd=999;");
 const w=run('window.HealthiaBushmanAnimation?.metrics()'),p=run('window.HealthiaBushmanAnimation?.inspect()'),m=run('window.HealthiaAnimation?.metrics()');
 if(!w)return;
 status.textContent=`${variant==='candidate'?'New':'Original'} Bushman · ${p?.state||'menu'} · ${m?.fps?m.fps.toFixed(1)+' FPS':'measuring…'}`;
 health.textContent=lastError?'Could not start: '+lastError:w.errors.length?'New artwork unavailable; original animation is active.':run('!!window.bushmanReviewFrozen')?'Contact held. Uncheck Hold contact to continue.':session==='fight'?'Live fight: normal health, damage, and opponent attacks.':session?.startsWith('demo:')?'Move preview: your hero is protected. Tap a move to replay.':session==='practice'?'Practice: protected hero, full starting special. Tap Practice to reset.':'Choose a hero, then Practice or Fight Bushman.';
},500);
