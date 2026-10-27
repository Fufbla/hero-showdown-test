/* Review-page controls only. Never loaded by the game entry points. */
'use strict';
const preview=document.getElementById('preview'),status=document.getElementById('status'),health=document.getElementById('health');
let reviewHero=0,variant='candidate',session=null,lastError='';
function run(source,report=false){try{return preview.contentWindow.eval(source);}catch(error){if(report)lastError=error.message;return null;}}
function available(){return !!run(`loaded && window.HealthiaSonicTuskAnimation && (!HealthiaSonicTuskAnimation.enabled || HealthiaSonicTuskAnimation.ready() || HealthiaSonicTuskAnimation.metrics().errors.length>0)`);}
function load(v){variant=v;session=null;lastError='';preview.src='index.html'+(v==='original'?'?sonictusk=original':'');document.getElementById('candidate').setAttribute('aria-pressed',v==='candidate');document.getElementById('original').setAttribute('aria-pressed',v==='original');document.querySelectorAll('[data-demo],#practice,#battle').forEach(b=>b.disabled=true);}
function speed(){
 const slow=document.getElementById('slow').checked;
 run(`if(!window.sonicTuskReviewStep)window.sonicTuskReviewStep=updateStep;updateStep=${slow?'function(dt){return window.sonicTuskReviewStep(dt*.25);}':'window.sonicTuskReviewStep'};`);
}
document.getElementById('slow').onchange=speed;
function play(practice,extra=''){
 if(!available())return false;
 lastError='';speed();
 const ok=run(`HealthiaIntro.dismiss();HealthiaCave.close();story.cleanup?.();specialSceneReset();coLeave();story.active=false;showModeSelect();selected=${reviewHero};opponent=2;venue=0;versusDifficulty='easy';start();${practice?'hero.power=100;hero.inv=999;boss.cd=999;boss.hp=boss.max=100000;':''}${extra};window.HealthiaAnimation?.resetMetrics();mode==='fight'||mode==='victory';`,true);
 if(!ok)return false;
 if(document.getElementById('mirror').checked)run(`hero.x=W-hero.x;hero.face=-1;boss.x=W-boss.x;boss.dir=1;boss.sonicFacing=1;if(mode==='victory')boss.sonicDeathFacing=1;`);
 session=practice?'practice':'fight';preview.contentWindow.focus();return true;
}
function demo(move){
 let setup=`hero.x=260;boss.x=650;boss.dir=-1;boss.sonicStride=0;boss.guardCooldown=999;`;
 if(move==='walk')setup+=`hero.x=150;boss.x=1080;`;
 else if(['pulse','stomp','blast'].includes(move))setup+=`hero.x=260;boss.x=750;boss.state='warn';boss.type='${move}';boss.timer=${move==='pulse'?.9:move==='stomp'?1:1.35};phase=3;boss.struck=false;`;
 else if(move==='defeat')setup+=`boss.hp=1;hitBoss(2,1,0,'punch');`;
 else setup+=`hero.x=450;boss.x=555;hero.face=1;`;
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
 const w=run('window.HealthiaSonicTuskAnimation?.metrics()'),p=run('window.HealthiaSonicTuskAnimation?.inspect()'),m=run('window.HealthiaAnimation?.metrics()');
 if(!w)return;
 status.textContent=`${variant==='candidate'?'New':'Original'} Sonic Tusk · ${p?.state||'menu'} · ${m?.fps?m.fps.toFixed(1)+' FPS':'measuring…'}`;
 health.textContent=lastError?'Could not start: '+lastError:w.errors.length?'New artwork unavailable; original animation is active.':session==='fight'?'Live fight: normal health, damage, and opponent attacks.':session?.startsWith('demo:')?'Move preview: your hero is protected. Tap a move to replay.':session==='practice'?'Practice: protected hero, full starting special. Tap Practice to reset.':'Choose a hero, then Practice or Fight Sonic Tusk.';
},500);
