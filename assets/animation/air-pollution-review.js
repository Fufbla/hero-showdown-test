/* Optional local playtest only; never loaded by production entry points. */
'use strict';
const preview=document.getElementById('preview'),status=document.getElementById('status'),health=document.getElementById('health');
let reviewHero=0,variant='candidate',session=null,lastError='';
function run(source,report=false){try{return preview.contentWindow.eval(source);}catch(error){if(report)lastError=error.message;return null;}}
function available(){return !!run('loaded && window.HealthiaAirPollutionAnimation && (!HealthiaAirPollutionAnimation.enabled || HealthiaAirPollutionAnimation.ready() || HealthiaAirPollutionAnimation.metrics().errors.length>0)');}
function load(v){variant=v;session=null;lastError='';preview.src='index.html'+(v==='original'?'?air=original':'');document.getElementById('candidate').setAttribute('aria-pressed',v==='candidate');document.getElementById('original').setAttribute('aria-pressed',v==='original');document.querySelectorAll('[data-demo],#practice,#battle').forEach(b=>b.disabled=true);}
function releaseHold(armed){run(`window.airReviewFrozen=false;window.airReviewHold=${!!armed};`);}
function speed(){
 const slow=document.getElementById('slow').checked;
 run(`if(!window.airReviewStep)window.airReviewStep=updateStep;updateStep=function(dt){if(window.airReviewFrozen)return;const before=HealthiaAirPollutionAnimation.inspect()?.releaseSerial||0;const r=window.airReviewStep(dt*${slow?.25:1});if(window.airReviewHold&&(HealthiaAirPollutionAnimation.inspect()?.releaseSerial||0)>before){window.airReviewFrozen=true;window.airReviewHold=false;}return r;};`);
}
function play(practice,extra=''){
 if(!available())return false;lastError='';releaseHold(false);speed();
 const ok=run(`HealthiaIntro.dismiss();HealthiaCave.close();story.cleanup?.();specialSceneReset();coLeave();story.active=false;showModeSelect();selected=${reviewHero};opponent=0;venue=0;versusDifficulty='easy';start();${practice?'hero.power=100;hero.inv=999;boss.cd=999;boss.hp=boss.max=100000;':''}${extra};window.HealthiaAnimation?.resetMetrics();mode==='fight'||mode==='victory';`,true);
 if(!ok)return false;
 if(document.getElementById('mirror').checked)run('hero.x=W-hero.x;hero.face=-1;boss.x=W-boss.x;boss.target=W-boss.target;for(const h of hazards)h.x=W-h.x;');
 session=practice?'practice':'fight';preview.contentWindow.focus();return true;
}
function demo(move){
 let setup='hero.x=400;boss.x=800;boss.guardCooldown=999;';
 if(move==='glide')setup+='hero.x=150;boss.x=1080;';
 else if(['punch-attack','cloud','storm'].includes(move)){
  const kind=move.replace('-attack',''),phase=kind==='storm'?3:kind==='cloud'?2:1;
  setup+=`phase=${phase};boss.hp=boss.max*${phase===3?.25:phase===2?.5:1};boss.type='${kind}';boss.target=hero.x;boss.state='warn';boss.timer=${kind==='storm'?1.25:kind==='cloud'?1.1:1.05};boss.struck=false;boss.stormTick=.52;`;
 }else if(move==='defeat')setup+="boss.hp=1;hitBoss(2,1,0,'punch');";
 else setup+='hero.x=450;boss.x=545;hero.face=1;';
 if(play(true,setup)){session='demo:'+move;releaseHold(document.getElementById('hold').checked);if(move==='punch'||move==='kick')run(`action('${move}');`);}
}
document.getElementById('slow').onchange=speed;
document.getElementById('hold').onchange=()=>releaseHold(session?.startsWith('demo:')&&document.getElementById('hold').checked);
document.getElementById('candidate').onclick=()=>load('candidate');document.getElementById('original').onclick=()=>load('original');
document.getElementById('practice').onclick=()=>play(true);document.getElementById('battle').onclick=()=>play(false);
document.querySelectorAll('[data-demo]').forEach(b=>b.onclick=()=>demo(b.dataset.demo));
document.querySelectorAll('[data-hero]').forEach(b=>b.onclick=()=>{reviewHero=Number(b.dataset.hero);document.querySelectorAll('[data-hero]').forEach(n=>n.setAttribute('aria-pressed',n===b));if(session)play(session!=='fight');});
setInterval(()=>{
 const ready=available();document.querySelectorAll('[data-demo],#practice,#battle').forEach(b=>b.disabled=!ready);
 if(session?.startsWith('demo:'))run("if(mode==='fight'&&boss.state==='idle')boss.cd=999;");
 const w=run('window.HealthiaAirPollutionAnimation?.metrics()'),p=run('window.HealthiaAirPollutionAnimation?.inspect()'),m=run('window.HealthiaAnimation?.metrics()');if(!w)return;
 status.textContent=`${variant==='candidate'?'New':'Original'} monster · ${p?.state||'menu'} · ${m?.fps?m.fps.toFixed(1)+' FPS':'measuring…'}`;
 health.textContent=lastError?'Could not start: '+lastError:w.errors.length?'New artwork unavailable; original animation is active.':run('!!window.airReviewFrozen')?'Impact held. Uncheck Hold impact to continue.':session==='fight'?'Live fight: normal health, damage, and opponent attacks.':session?.startsWith('demo:')?'Move preview: your hero is protected. Tap a move to replay.':session==='practice'?'Practice: protected hero, full starting special. Tap Practice to reset.':'Choose a hero, then Practice or Fight Monster.';
},500);
