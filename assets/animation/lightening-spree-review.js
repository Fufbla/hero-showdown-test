/* Review-page controls only. Never loaded by the game entry points. */
'use strict';
const preview=document.getElementById('preview'),status=document.getElementById('status'),health=document.getElementById('health');
let reviewHero=0,variant='candidate',session=null,lastError='';
function run(source,report=false){try{return preview.contentWindow.eval(source);}catch(error){if(report)lastError=error.message;return null;}}
function available(){return !!run(`loaded && window.HealthiaLighteningSpreeAnimation && (!HealthiaLighteningSpreeAnimation.enabled || HealthiaLighteningSpreeAnimation.ready() || HealthiaLighteningSpreeAnimation.metrics().errors.length>0)`);}
function load(v){variant=v;session=null;lastError='';preview.src='index.html'+(v==='original'?'?spree=original':'');document.getElementById('candidate').setAttribute('aria-pressed',v==='candidate');document.getElementById('original').setAttribute('aria-pressed',v==='original');document.querySelectorAll('[data-demo],#practice,#battle').forEach(b=>b.disabled=true);}
function speed(){
 const slow=document.getElementById('slow').checked;
 run(`if(!window.spreeReviewStep)window.spreeReviewStep=updateStep;updateStep=function(dt){if(window.spreeReviewFrozen)return;return window.spreeReviewStep(dt*${slow?.25:1});};`);
}
document.getElementById('slow').onchange=speed;
document.getElementById('hold').onchange=()=>run(`window.spreeReviewHold=${session?.startsWith('demo:')&&document.getElementById('hold').checked?true:false};window.spreeReviewFrozen=false;`);
function releaseHold(armed){
 run(`window.spreeReviewFrozen=false;window.spreeReviewHold=${!!armed};if(!window.spreeReviewFire)window.spreeReviewFire=spreeFire;spreeFire=function(...args){const r=window.spreeReviewFire(...args);if(window.spreeReviewHold){window.spreeReviewFrozen=true;window.spreeReviewHold=false;}return r;};`);
}
function play(practice,extra=''){
 if(!available())return false;
 lastError='';releaseHold(false);speed();
 const ok=run(`HealthiaIntro.dismiss();HealthiaCave.close();story.cleanup?.();specialSceneReset();coLeave();story.active=false;showModeSelect();selected=${reviewHero};opponent=7;venue=0;versusDifficulty='easy';start();${practice?'hero.power=100;hero.inv=999;boss.cd=999;boss.hp=boss.max=100000;':''}${extra};window.HealthiaAnimation?.resetMetrics();mode==='fight'||mode==='victory';`,true);
 if(!ok)return false;
 if(document.getElementById('mirror').checked)run(`hero.x=W-hero.x;hero.face=-1;boss.x=W-boss.x;boss.dir=1;spree.destination=W-spree.destination;spree.aim=Math.PI-spree.aim;for(const e of spree.rings)e.x=W-e.x;for(const b of spree.beams){b.x=W-b.x;b.angle=Math.PI-b.angle;}`);
 session=practice?'practice':'fight';preview.contentWindow.focus();return true;
}
function demo(move){
 let setup=`hero.x=400;boss.x=750;boss.dir=-1;boss.guardCooldown=999;`;
 if(move==='vanish')setup+=`spreeVanish();`;
 else if(['beam','spark','double'].includes(move))setup+=`phase=${move==='double'?3:1};spreeAttack('${move==='beam'?'beam':'spark'}');`;
 else if(move==='defeat')setup+=`boss.hp=1;hitBoss(2,1,0,'punch');`;
 else if(move==='punch'||move==='kick')setup+=`hero.x=450;boss.x=555;hero.face=1;`;
 if(play(true,setup)){
  session='demo:'+move;
  releaseHold(document.getElementById('hold').checked);
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
 const w=run('window.HealthiaLighteningSpreeAnimation?.metrics()'),p=run('window.HealthiaLighteningSpreeAnimation?.inspect()'),m=run('window.HealthiaAnimation?.metrics()');
 if(!w)return;
 status.textContent=`${variant==='candidate'?'New':'Original'} Lightening Spree · ${p?.state||'menu'} · ${m?.fps?m.fps.toFixed(1)+' FPS':'measuring…'}`;
 health.textContent=lastError?'Could not start: '+lastError:w.errors.length?'New artwork unavailable; original animation is active.':run('!!window.spreeReviewFrozen')?'Release held. Uncheck Hold release to continue.':session==='fight'?'Live fight: normal health, damage, and opponent attacks.':session?.startsWith('demo:')?'Move preview: your hero is protected. Tap a move to replay.':session==='practice'?'Practice: protected hero, full starting special. Tap Practice to reset.':'Choose a hero, then Practice or Fight Lightening Spree.';
},500);
