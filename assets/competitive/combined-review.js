/* Optional, user-run review harness; never loaded by a game entry. */
'use strict';
const preview=document.getElementById('preview'),status=document.getElementById('status'),results=document.getElementById('results'),gallery=document.getElementById('gallery');
const q=s=>preview.contentWindow.eval(s),wait=ms=>new Promise(r=>setTimeout(r,ms));
const controls=on=>['verify','gallery-button','play'].forEach(id=>document.getElementById(id).disabled=!on);
const report=value=>results.textContent=JSON.stringify(value,null,2);
const controlled=on=>q(`window.reviewControlled=${on};`);
function reset(ids=['bushman','spree'],kind='local',venue=0){q(`if(!HealthiaCompetitive.beginMatch({ids:${JSON.stringify(ids)},kind:${JSON.stringify(kind)},venue:${venue}}))throw Error('Match did not start');`);}
function scene(id,key='punch'){
 reset([id,id]);q(`(()=>{const w=HealthiaCompetitive.session.world;w.clock=1;w.fighters.forEach((f,i)=>{f.x=i?900:380;f.face=i?-1:1;f.clock=1;f.walk=.35;f.power=100;f.charge=4;
 const key=${JSON.stringify(key)};if(['walk','block','hit'].includes(key)){f.state=key;f.vx=key==='walk'?f.face*200:0;f.block=key==='block';f.stun=key==='hit'?.16:0;}
 else{HealthiaCompetitive.Combat.begin(w,f,key);const a=f.action;a.age=a.spec.startup+a.spec.active*.08;a.struck=1;f.state=HealthiaCompetitive.Combat.stateOf(f);}});HealthiaCompetitive.render();})()`);
}
async function poses(){controls(false);controlled(true);preview.hidden=true;results.hidden=true;gallery.replaceChildren();const key=document.getElementById('pose').value;
 try{for(const c of q('HealthiaCompetitive.Data.roster')){scene(c.id,key);const src=q('document.querySelector("canvas").toDataURL("image/png")'),fig=document.createElement('figure'),img=document.createElement('img'),cap=document.createElement('figcaption');img.src=src;img.alt=c.name+' facing both directions, '+key;cap.textContent=c.name+' · '+key+' · both players';fig.append(img,cap);gallery.append(fig);await wait(20);}status.textContent='12 mirror matches rendered. P1 is green; P2 is amber.';}
 catch(e){status.textContent=e.message;}finally{controls(true);}
}
async function verify(){controls(false);controlled(true);preview.hidden=false;results.hidden=false;gallery.replaceChildren();const checks=[];let posesCount=0;
 const check=(name,source)=>{try{const actual=q(`(()=>{${source}})()`);if(actual!==true)throw Error(JSON.stringify(actual));checks.push({name,pass:true});}catch(e){checks.push({name,pass:false,error:e.message});}report({checks,posesCount});};
 try{
  q('HealthiaCompetitiveAnimation.enableInspection(true);');
  for(const c of q('HealthiaCompetitive.Data.roster')){
   reset([c.id,c.id]);check(c.name+' mirror render: states, directions, independent clocks, no mutation',`
    const w=HealthiaCompetitive.session.world,A=HealthiaCompetitiveAnimation,D=HealthiaCompetitive.Data,C=HealthiaCompetitive.Combat;
    const native={hero,boss,selected,opponent,mode,ending,phase,t,elapsed,effects,atom,spree,bushman,plantShots,vines,wasteShots,wastePools,wasteBursts,styroSpikes,styroBursts,soundWaves};let n=0;
    for(const slot of [0,1])for(const key of ['idle','walk','dash','jump','block','hit','knockdown','defeat','punch','kick','shoot','skill','special'])for(const stage of ['windup','active','recovery']){
     const f=C.fighter(${JSON.stringify(c.id)},slot,'human'),other=C.fighter(${JSON.stringify(c.id)},1-slot,'human');f.state=key;f.clock=1;f.walk=.35;f.vx=key==='walk'||key==='dash'?f.face*200:0;f.stun=key==='hit'?.16:0;f.knockdown=key==='knockdown'?.5:0;f.block=key==='block';if(key==='jump')f.y-=100;
     const local={...w,fighters:slot?[other,f]:[f,other]};if(D.moves[f.id][key]){f.power=100;f.charge=4;C.begin(local,f,key);const a=f.action;a.age=stage==='windup'?a.spec.startup*.5:stage==='active'?a.spec.startup+a.spec.active*.08:a.spec.startup+a.spec.active+a.spec.recovery*.5;a.struck=stage==='windup'?0:1;f.state=C.stateOf(f);}
     const before=JSON.stringify(local);A.draw(f,other,local);const p=A.inspect(f);if(!p)return {key,stage,error:'Missing pose'};
     if(JSON.stringify(local)!==before)return {key,stage,error:'Draw mutated combat'};
     if(!['defeat','knockdown'].includes(key)&&(p.facing??p.bear?.facing)!==f.face)return {key,stage,error:'Wrong facing',p};
     n++;
    }
    const after={hero,boss,selected,opponent,mode,ending,phase,t,elapsed,effects,atom,spree,bushman,plantShots,vines,wasteShots,wastePools,wasteBursts,styroSpikes,styroBursts,soundWaves};
    for(const k in native)if(native[k]!==after[k])return {error:'Native global leaked',key:k};return n===78;
   `);posesCount+=78;
   reset([c.id,c.id]);check(c.name+' Pause guide covers both players and freezes combat',`
    pauseGame();const w=HealthiaCompetitive.session.world,before=JSON.stringify(w);
    for(const slot of [0,1])for(const page of [1,2]){document.querySelector('[data-guide-fighter="'+slot+'"]').click();document.querySelector('[data-guide-page="'+page+'"]').click();
     for(const [key,m]of Object.entries(HealthiaCompetitive.Data.moves[${JSON.stringify(c.id)}]).filter(([k])=>page===2?['shoot','skill','special'].includes(k):!['shoot','skill','special'].includes(k))){const row=document.querySelector('[data-guide-move="'+key+'"]')?.textContent;if(!row?.includes(m.name)||!row.includes(m.damage+' HP')||!row.includes('Controller:')||!row.includes('Touch:'))return {slot,page,key};}}
    update(.25);const pass=JSON.stringify(w)===before;pauseGame();return pass&&!paused;
   `);
   await wait(10);
  }
  check('All 144 pairings render with independent 100 HP fighters',`for(const a of HealthiaCompetitive.Data.roster)for(const b of HealthiaCompetitive.Data.roster){HealthiaCompetitive.beginMatch({ids:[a.id,b.id],kind:'local',venue:0});update(1/60);draw();const w=HealthiaCompetitive.session.world;if(!w.fighters.every(f=>f.hp===100&&Number.isFinite(f.x)))return [a.id,b.id];}return true;`);
  reset();check('Keyboard taps between frames queue once for each player',`const w=HealthiaCompetitive.session.world;for(const [key,code] of [['f','KeyF'],['j','KeyJ']]){window.dispatchEvent(new KeyboardEvent('keydown',{key,code,bubbles:true}));window.dispatchEvent(new KeyboardEvent('keyup',{key,code,bubbles:true}));}update(1/120);return w.fighters.every(f=>f.action?.key==='punch'&&f.queued.length===0);`);
  reset(['bushman','spree'],'cpu');check('Short touch shoot tap survives until next simulation step',`const w=HealthiaCompetitive.session.world;w.fighters[1].control='human';const b=document.querySelector('[data-key="shoot"]');battleTouchDown(b,81,{preventDefault(){}});battleTouchUp(81);for(let i=0;i<35;i++)update(1/120);return w.projectiles.some(p=>p.owner===0)&&!touchHeld.shoot;`);
  q(`window.reviewPads=[];window.reviewOldPads=Object.getOwnPropertyDescriptor(navigator,'getGamepads');Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>reviewPads});window.reviewPad=index=>({index,connected:true,axes:[0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))});`);
  reset(['spree','wastelander']);check('Two virtual controllers move separate fighters',`reviewPads=[reviewPad(0),reviewPad(1)];reviewPads[0].axes[0]=1;reviewPads[1].axes[0]=-1;pollPad();for(let i=0;i<24;i++)update(1/120);return HealthiaCompetitive.session.world.fighters[0].x>340&&HealthiaCompetitive.session.world.fighters[1].x<940;`);
  for(const slot of [0,1]){reset();check('Controller '+(slot+1)+' held Start pauses once and resumes once',`reviewPads=[reviewPad(0),reviewPad(1)];pollPad();reviewPads[${slot}].buttons[9].pressed=true;pollPad();pollPad();pollPad();if(!paused)return 'pause bounced';reviewPads[${slot}].buttons[9].pressed=false;pollPad();reviewPads[${slot}].buttons[9].pressed=true;pollPad();pollPad();return !paused;`);}
  reset();check('Focus loss clears movement and pauses',`HealthiaCompetitive.session.keyboard[0].right=true;window.dispatchEvent(new Event('blur'));return paused&&!HealthiaCompetitive.session.keyboard[0].right;`);
  q(`if(reviewOldPads)Object.defineProperty(navigator,'getGamepads',reviewOldPads);else delete navigator.getGamepads;`);
  for(const difficulty of ['easy','medium','hard']){reset(['bushman','wastelander'],'cpu');check('CPU '+difficulty+' uses shared combat and attacks',`const w=HealthiaCompetitive.session.world;w.difficulty=${JSON.stringify(difficulty)};w.random=()=>.3;w.fighters[0].x=540;w.fighters[1].x=690;for(let i=0;i<960;i++)update(1/120);return w.fighters[0].hp<100&&w.fighters.every(f=>f.hp<=100);`);}
  reset(['styro','styro'],'local',3);check('Harbor hazard damages both fighters equally',`const w=HealthiaCompetitive.session.world;w.fighters.forEach(f=>f.x=640);Object.assign(harborHazard.state,{phase:'strike',age:HealthiaHarborCore.timing.strike-.005,x:640});update(1/120);return w.fighters.every(f=>f.hp===82);`);
  reset(['sonic','sonic'],'local',4);check('Tempest hazard respects each fighter block',`const w=HealthiaCompetitive.session.world;w.fighters[0].x=500;w.fighters[1].x=650;Object.assign(tempestHazard.state,{phase:'sweep',age:1.2,x:tempestHazard.sweepX(1.2),direction:1});HealthiaCompetitive.session.keyboard[1].block=true;for(let i=0;i<132;i++)update(1/120);return w.fighters[0].hp===82&&w.fighters[1].hp===100;`);
  for(const winner of [0,1]){reset(['air','vee']);check('Player '+(winner+1)+' win and rematch reset both fighters',`const w=HealthiaCompetitive.session.world;w.fighters[${1-winner}].hp=0;HealthiaCompetitive.Combat.settle(w);for(let i=0;i<144;i++)update(1/120);const button=document.getElementById('competitive-rematch');if(!button)return 'no rematch';button.click();return HealthiaCompetitive.session.world.fighters.every(f=>f.hp===100&&!f.action);`);}
  check('Exit to Story restores original 650 HP boss and chapter modules',`showModeSelect();showStorySelect();story.battle=1;startStoryFight();return !HealthiaCompetitive.session.active&&boss.max===650&&hero.hp===100&&typeof HealthiaCave==='object'&&typeof HealthiaShoreCore==='object';`);
  check('Exit to co-op restores two heroes and original boss health',`showModeSelect();coChooseMode();document.getElementById('competitive-boss').click();document.getElementById('co-local').click();coop.kind='local';coop.choices=[0,1];selected=0;opponent=5;start();return !HealthiaCompetitive.session.active&&coop.players.length===2&&boss.max===1000;`);
 }catch(e){checks.push({name:'Harness',pass:false,error:e.stack});}
 finally{q('HealthiaCompetitiveAnimation.enableInspection(false);');reset();q('HealthiaCompetitive.render();');report({checks,posesCount,failures:checks.filter(c=>!c.pass).length});status.textContent=`Integration checks: ${checks.filter(c=>c.pass).length}/${checks.length} passed; ${posesCount} render states exercised.`;controls(true);}
}
document.getElementById('verify').onclick=verify;document.getElementById('gallery-button').onclick=poses;
document.getElementById('pose').onchange=()=>{if(!document.getElementById('gallery-button').disabled){if(gallery.children.length)poses();else scene(document.getElementById('fighter').value,document.getElementById('pose').value);}};
document.getElementById('fighter').onchange=()=>{gallery.replaceChildren();preview.hidden=false;scene(document.getElementById('fighter').value,document.getElementById('pose').value);};
document.getElementById('play').onclick=()=>{preview.hidden=false;results.hidden=false;gallery.replaceChildren();reset([document.getElementById('fighter').value,'bushman'],'cpu');controlled(false);preview.focus();status.textContent='Playing a CPU match. Use Pause for move lists.';};
document.getElementById('size').onchange=e=>{preview.className=e.target.value;if(e.target.value)q('showBattleTouch();layoutBattleControls();draw();');};
preview.onload=async()=>{
 try{for(let i=0;i<160;i++){if(q('typeof HealthiaCompetitive!=="undefined"&&HealthiaCompetitive.ready()'))break;await wait(100);}
  await q(`Promise.all([HealthiaAnimation,HealthiaWastelanderAnimation,HealthiaStyroAnimation,HealthiaStyrodogAnimation,HealthiaSonicTuskAnimation,HealthiaVenomisThornbearAnimation,HealthiaAtomdustAnimation,HealthiaLighteningSpreeAnimation,HealthiaBushmanAnimation,HealthiaAirPollutionAnimation,HealthiaCompetitiveAnimation].map(a=>a.whenLoaded))`);
  q(`HealthiaIntro.dismiss();muted=true;if(master)master.gain.value=0;window.reviewControlled=true;window.reviewOriginalFrame=frame;frame=function(ms){if(reviewControlled){last=ms;requestAnimationFrame(frame);}else reviewOriginalFrame(ms);};`);
  const select=document.getElementById('fighter');for(const c of q('HealthiaCompetitive.Data.roster')){const option=document.createElement('option');option.value=c.id;option.textContent=c.name;select.append(option);}select.value='styrodog';scene('styrodog');controls(true);status.textContent='Ready. Run checks, review poses, or play the combined test build.';
 }catch(e){status.textContent='Load failed: '+e.message;}
};
