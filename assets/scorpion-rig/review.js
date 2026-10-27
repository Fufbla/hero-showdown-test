/* Local QA UI. Injection is restricted to this same-origin, user-opened test page. */
'use strict';
const preview=document.getElementById('preview'),status=document.getElementById('status'),results=document.getElementById('results');
const q=s=>preview.contentWindow.eval(s),wait=ms=>new Promise(r=>setTimeout(r,ms)),buttons=['play','compare','debug','checks','hero','size','pose'];
const controls=on=>buttons.forEach(id=>document.getElementById(id).disabled=!on);
const report=value=>results.textContent=JSON.stringify(value,null,2);
function start(controlled=false){q(`HealthiaIntro.dismiss();HealthiaCave.close();story.cleanup?.();specialSceneReset();coLeave();showModeSelect();selected=${Number(document.getElementById('hero').value)};story.mainHeroIndex=selected;showShoreFront(3);startShoreBattle(3);window.scorpionControlled=${controlled};draw();`);}
function inspect(state){start(true);const age={idle:0,clawWindup:.65,clawSweep:.51,clawRecover:.15,stingerWindup:.74,stingerPlunge:.22,stingerExposed:.5,reflect:.53,stunned:.10}[state];
 q(`shore.model.state=${JSON.stringify(state==='idle'?'intro':state)};shore.model.age=${age};shore.model.time=2;shore.model.side=1;shore.model.targetX=790;shore.model.dodged=true;shore.model.locked=true;HealthiaScorpionRig.reset(shore.model);for(let i=0;i<35;i++){shore.model.time+=1/120;HealthiaScorpionRig.inspect(shore.model);}draw();`);status.textContent='Frozen pose. Start / restart resumes a normal battle.';
}
document.getElementById('play').onclick=()=>{document.getElementById('pose').value='';start(false);preview.contentWindow.focus();q('if(paused)pauseGame();draw();');status.textContent='Playing the actual Chapter 3 boss encounter.';};
document.getElementById('pose').onchange=e=>{if(e.target.value)inspect(e.target.value);};
document.getElementById('compare').onclick=()=>{const on=q('HealthiaScorpionRig.enabled=!HealthiaScorpionRig.enabled;if(scorpionControlled&&paused)pauseGame();draw();HealthiaScorpionRig.enabled');document.getElementById('compare').textContent=on?'View original animation':'View new animation';status.textContent=on?'Articulated animation enabled.':'Original animation enabled for comparison.';};
document.getElementById('debug').onclick=()=>{const on=q('HealthiaScorpionRig.debug=!HealthiaScorpionRig.debug;if(scorpionControlled&&paused)pauseGame();draw();HealthiaScorpionRig.debug');document.getElementById('debug').textContent=on?'Hide joints & hitboxes':'Show joints & hitboxes';};
document.getElementById('size').onchange=e=>{preview.className=e.target.value;if(e.target.value)q('showBattleTouch();layoutBattleControls();if(scorpionControlled&&paused)pauseGame();draw();');};
async function checks(){
 controls(false);start(true);const out=[];const check=(name,source)=>{try{const value=q(`(()=>{${source}})()`);out.push({name,pass:value===true,...(value===true?{}:{actual:value})});}catch(e){out.push({name,pass:false,error:e.message});}report({checks:out});};
 try{
  check('Approved artwork loaded without replacement images',`return HealthiaScorpionRig.ready()&&HealthiaScorpionRig.metrics().errors.length===0;`);
  check('Actual Chapter 3 boss starts at 650 HP with all three heroes',`return shore.round===3&&shore.model.kind==='boss'&&shore.model.hp===650&&story.team.every(p=>p.hp===100);`);
  check('Eight articulated legs, ten connected tail sections and two claw arms',`const p=HealthiaScorpionRig.inspect(shore.model);return p.legs.length===8&&p.legs.every(l=>l.joints.length===4)&&p.tail.length===11&&p.claws.length===2;`);
  check('Back/front draw passes do not alter combat state',`const m=shore.model,before=JSON.stringify(m);for(let i=0;i<10;i++){drawShoreBossBack(m);drawShoreBossFront(m);}return JSON.stringify(m)===before;`);
  check('Pause freezes animation and the boss clock',`pauseGame();const before=JSON.stringify(HealthiaScorpionRig.inspect(shore.model));update(.2);draw();const same=JSON.stringify(HealthiaScorpionRig.inspect(shore.model))===before;pauseGame();return same;`);
  check('Hit-stop freezes presentation with model time',`hitStop=.12;const before=JSON.stringify(HealthiaScorpionRig.inspect(shore.model));updateStep(1/120);const same=JSON.stringify(HealthiaScorpionRig.inspect(shore.model))===before;hitStop=0;return same;`);
  for(const target of [110,380,640,940,1170]){
   check('Contact registration and attached joints at target '+target,`const m=new HealthiaShoreBoss.Encounter(),r=new HealthiaScorpionRigCore.Rig(m),C=HealthiaScorpionRigCore;for(let n=0;n<1800;n++){m.step(1/120,{x:${target},y:604,dash:true});const p=r.advance(m);if(C.dist(p.tail[0],p.root)>.001||C.dist(p.tail.at(-1),p.stingerSocket)>.001)return {step:n,tail:'disconnected'};for(const l of p.legs){if(C.dist(l.position,l.joints[3])>.001)return {step:n,leg:l.id};}for(const a of p.claws){const native=m.clawPose(a.weapon.side);if(C.dist(a.weapon,native)>.001||C.dist(a.wrist,native.wrist)>.001)return 'claw contact moved';}}return true;`);
   await wait(10);
  }
  for(const state of ['intro','clawWindup','clawSweep','clawRecover','stingerWindup','stingerPlunge','stingerExposed','stingerRecover','reflect','stunned','dissolve']){
   check(state+' renders with a stable model snapshot',`const m=new HealthiaShoreBoss.Encounter();m.state=${JSON.stringify(state)};m.age=.2;m.time=3;m.targetX=700;m.dodged=true;m.side=1;m.deathAge=.2;const before=JSON.stringify(m);drawShoreBossBack(m);drawShoreBossFront(m);return JSON.stringify(m)===before;`);
  }
  check('Tagging pauses the boss rig and preserves hero health',`const from=selected,next=(selected+1)%3;hero.hp=82;story.team[next].hp=67;const before=shore.model.time;requestStoryTag();for(let i=0;i<240&&story.tag;i++)updateStep(1/120);return selected===next&&hero.hp===67&&story.team[from].hp===82&&shore.model.time===before;`);
  start(true);check('Normal rounds still use the original scorpion encounter',`startShoreBattle(1);const a=shore.model instanceof HealthiaShoreCore.Encounter;draw();startShoreBattle(2);draw();return a&&shore.model instanceof HealthiaShoreCore.Encounter;`);
  check('Returning to Versus leaves Chapter 3 and the rig inactive',`showModeSelect();coLeave();story.active=false;shore.active=false;selected=0;opponent=4;start();const count=HealthiaScorpionRig.metrics().draws;update(1/120);draw();return !shore.active&&opponent===4&&boss.max===650&&HealthiaScorpionRig.metrics().draws===count;`);
  start(true);
  check('Live battle update reaches the stinger after four alternating sweeps',`const sides=[];let previous=shore.model.state;hero.x=640;for(let i=0;i<1800&&shore.model.state!=='stingerWindup';i++){updateStep(1/120);if(shore.model.state==='clawSweep'&&previous!==shore.model.state)sides.push(shore.model.side);previous=shore.model.state;}return JSON.stringify(sides)==='[1,-1,1,-1]'&&shore.model.state==='stingerWindup'&&shore.model.clawCount===4;`);
  check('Actual hero punch reflects a dodged sting and removes exactly 150 boss HP',`const m=shore.model;hero.x=380;for(let i=0;i<200&&!m.locked;i++)updateStep(1/120);const target=m.targetX;hero.x=target+250;for(let i=0;i<180&&m.state!=='stingerExposed';i++)updateStep(1/120);if(!m.dodged)return 'sting was not dodged';hero.x=target+95;hero.face=-1;action('punch');for(let i=0;i<80&&m.state!=='reflect';i++)updateStep(1/120);if(m.state!=='reflect')return {state:m.state,attack:hero.pendingAttack};const before=m.hp;for(let i=0;i<110&&m.state==='reflect';i++)updateStep(1/120);draw();return m.reflections===1&&before-m.hp===150&&m.state==='stunned';`);
  start(true);
  const timings=[],fullFrame=[];
  for(let batch=0;batch<6;batch++){const values=q(`(()=>{const boss=[],frame=[];for(let i=0;i<30;i++){let at=performance.now();drawShoreBossBack(shore.model);drawShoreBossFront(shore.model);boss.push(performance.now()-at);at=performance.now();update(1/60);draw();frame.push(performance.now()-at);}return {boss,frame};})()`);timings.push(...values.boss);fullFrame.push(...values.frame);await wait(15);}
  const summary=values=>{values.sort((a,b)=>a-b);return {samples:values.length,median:values[Math.floor(values.length*.5)],p95:values[Math.floor(values.length*.95)]};};
  const metrics=q('HealthiaScorpionRig.metrics()');report({checks:out,passed:out.filter(c=>c.pass).length,total:out.length,bossDrawMs:summary(timings),fullUpdateAndDrawMs:summary(fullFrame),metrics,note:'CPU submission timings in this browser, excluding display/compositor/GPU wait; not a guarantee of physical-device frame rate.'});
  status.textContent=`${out.filter(c=>c.pass).length}/${out.length} checks passed. Review results below.`;
 }finally{controls(true);q('draw();');}
}
document.getElementById('checks').onclick=checks;
preview.onload=async()=>{
 try{
  const doc=preview.contentDocument;for(const name of ['rig-core','rig-renderer'])await new Promise((resolve,reject)=>{const script=doc.createElement('script');script.src='assets/scorpion-rig/'+name+'.js';script.onload=resolve;script.onerror=()=>reject(Error('Could not load '+name));doc.body.append(script);});
  await q('HealthiaScorpionRig.whenLoaded');for(let i=0;i<200;i++){if(q('loaded&&shoreBossParts.complete&&shoreBossParts.naturalWidth&&HealthiaBushman.ready()'))break;await wait(100);}
  q(`HealthiaIntro.dismiss();muted=true;if(master)master.gain.value=0;window.scorpionControlled=true;window.scorpionOriginalFrame=frame;frame=function(ms){if(scorpionControlled){last=ms;requestAnimationFrame(frame);}else scorpionOriginalFrame(ms);};`);
  inspect('idle');controls(true);status.textContent='Ready. Start the real boss fight or inspect a pose.';
 }catch(e){status.textContent='Could not start test: '+e.message;}
};
