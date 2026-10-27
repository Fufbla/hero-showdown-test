/* Review-page controls only. Never loaded by the game entry points. */
'use strict';
const preview=document.getElementById('preview'),status=document.getElementById('status'),health=document.getElementById('health');
let reviewHero=0,variant='candidate',session=null,lastError='';
function run(source,report=false){try{return preview.contentWindow.eval(source);}catch(error){if(report)lastError=error.message;return null;}}
function available(){return !!run(`loaded && window.HealthiaVenomisThornbearAnimation && (!HealthiaVenomisThornbearAnimation.enabled || HealthiaVenomisThornbearAnimation.ready() || HealthiaVenomisThornbearAnimation.metrics().errors.length>0)`);}
function load(v){variant=v;session=null;lastError='';preview.src='index.html'+(v==='original'?'?venomis=original':'');document.getElementById('candidate').setAttribute('aria-pressed',v==='candidate');document.getElementById('original').setAttribute('aria-pressed',v==='original');document.querySelectorAll('[data-demo],#practice,#battle').forEach(b=>b.disabled=true);}
function speed(){
 const slow=document.getElementById('slow').checked;
 run(`if(!window.venomisThornbearReviewStep)window.venomisThornbearReviewStep=updateStep;updateStep=${slow?'function(dt){return window.venomisThornbearReviewStep(dt*.25);}':'window.venomisThornbearReviewStep'};`);
}
document.getElementById('slow').onchange=speed;
function play(practice,extra=''){
 if(!available())return false;
 lastError='';speed();
 const ok=run(`HealthiaIntro.dismiss();HealthiaCave.close();story.cleanup?.();specialSceneReset();coLeave();story.active=false;showModeSelect();selected=${reviewHero};opponent=3;venue=0;versusDifficulty='easy';start();${practice?'hero.power=100;hero.inv=999;boss.cd=999;boss.hp=boss.max=100000;':''}${extra};window.HealthiaAnimation?.resetMetrics();mode==='fight'||mode==='victory';`,true);
 if(!ok)return false;
 if(document.getElementById('mirror').checked)run(`hero.x=W-hero.x;hero.face=-1;boss.x=W-boss.x;boss.dir=1;boss.trainerX=W-boss.trainerX;boss.trainerDir=1;if(Number.isFinite(boss.startX))boss.startX=W-boss.startX;if(Number.isFinite(boss.target))boss.target=W-boss.target;if(mode==='victory')boss.venomDeathFacing=1;`);
 session=practice?'practice':'fight';preview.contentWindow.focus();return true;
}
function demo(move){
 let setup=`hero.x=260;boss.x=650;boss.dir=-1;boss.bearStride=0;boss.trainerStride=0;boss.trainerX=895;boss.trainerDir=-1;boss.guardCooldown=999;`;
 if(move==='walk')setup+=`hero.x=150;boss.x=1080;boss.trainerX=1135;`;
 else if(['swipe','seeds','vines'].includes(move))setup+=`hero.x=260;boss.x=750;boss.trainerX=995;boss.state='warn';boss.type='${move}';boss.timer=${move==='vines'?1.1:.9};phase=3;boss.struck=false;boss.startX=boss.x;boss.target=clamp(hero.x,boss.x-280,boss.x+280);`;
 else if(move==='defeat')setup+=`boss.hp=1;hitBoss(2,1,0,'punch');`;
 else setup+=`hero.x=450;boss.x=555;boss.trainerX=800;hero.face=1;`;
 if(play(true,setup)){
  session='demo:'+move;
  // Start the strike after the optional facing change, so the attack captures
  // the displayed direction and position rather than the unmirrored setup.
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
 const w=run('window.HealthiaVenomisThornbearAnimation?.metrics()'),p=run('window.HealthiaVenomisThornbearAnimation?.inspect()'),m=run('window.HealthiaAnimation?.metrics()');
 if(!w)return;
 status.textContent=`${variant==='candidate'?'New':'Original'} Venomis & Thornbear · Thornbear: ${p?.bear.state||'menu'} · Venomis: ${p?.trainer.state||'menu'} · ${m?.fps?m.fps.toFixed(1)+' FPS':'measuring…'}`;
 health.textContent=lastError?'Could not start: '+lastError:w.errors.length?'New artwork unavailable; original animation is active.':session==='fight'?'Live fight: normal health, damage, and opponent attacks.':session?.startsWith('demo:')?'Move preview: your hero is protected. Tap a move to replay.':session==='practice'?'Practice: protected hero, full starting special. Tap Practice to reset.':'Choose a hero, then Practice or Fight Venomis & Thornbear.';
},500);
