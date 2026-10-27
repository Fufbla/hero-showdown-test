/* Optional review harness. Not loaded by either production entry point. */
'use strict';
const preview=document.getElementById('preview'),status=document.getElementById('status'),results=document.getElementById('results');
const q=source=>preview.contentWindow.eval(source);
const buttons=[...document.querySelectorAll('#benchmark,#checks,#chapters,#live,#pixels,#play')];
let ready=false,busy=false;
const report=value=>{results.textContent=JSON.stringify(value,null,2);};
function controls(enabled){buttons.forEach(b=>b.disabled=!enabled);}
function reset(hero=0,enemy=0,stage=0,kind='solo'){
 q(`HealthiaIntro.dismiss();HealthiaCave.close();story.cleanup?.();specialSceneReset();coLeave();story.active=false;showModeSelect();muted=true;if(master)master.gain.value=0;selected=${hero};opponent=${enemy};venue=${stage};versusDifficulty='easy';coop.kind=${JSON.stringify(kind)};coop.choices=[${hero},${(hero+1)%3}];start();hero.inv=999;boss.cd=999;`);
}
function controlled(value){q(`if(!window.reviewOriginalFrame){window.reviewOriginalFrame=frame;frame=function(ms){if(window.reviewControlled){last=ms;requestAnimationFrame(frame);}else{if(window.reviewCaptureFrames){if(window.reviewFrameStamp)reviewFrameIntervals.push(ms-reviewFrameStamp);window.reviewFrameStamp=ms;}window.reviewOriginalFrame(ms);}};}window.reviewControlled=${value};`);}
// Use timer-yielded CPU samples: embedded/headless browsers can suspend a
// parent's animation callbacks while its game iframe has focus. Do not turn
// these scheduling intervals into an advertised game FPS measurement.
const nextFrame=()=>new Promise(resolve=>setTimeout(()=>resolve(performance.now()),16));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function stats(values){const a=[...values].sort((a,b)=>a-b);return {mean:+(a.reduce((s,n)=>s+n,0)/a.length).toFixed(3),p95:+a[Math.floor((a.length-1)*.95)].toFixed(3),max:+a.at(-1).toFixed(3)};}
async function benchmark(){
 busy=true;controls(false);controlled(true);
 const records=[],errors=[];
 try{
  q(`window.reviewTimings={};window.reviewWrapped={};for(const name of ['sky','renderLivingStage','stageOcclusion','drawFoliage','drawBeachWaves','drawScopeWater','bossMotion','fighter','hud','drawAtom','drawBushman','drawSpree','heroStageBounds']){const original=window[name];if(typeof original!=='function')continue;reviewWrapped[name]=original;window[name]=function(...args){const at=performance.now();try{return original.apply(this,args);}finally{const item=reviewTimings[name]||(reviewTimings[name]={ms:0,calls:0});item.ms+=performance.now()-at;item.calls++;}};}window.reviewImageCalls=0;window.reviewImageOriginal=ctx.drawImage;ctx.drawImage=function(...args){reviewImageCalls++;return reviewImageOriginal.apply(this,args);};`);
  const scenes=Array.from({length:9},(_,enemy)=>({name:'opponent '+enemy,hero:enemy%3,enemy,stage:enemy%5}));
  scenes.push({name:'Air storm / Scope',hero:0,enemy:0,stage:2,storm:true},{name:'local co-op / Bushman',hero:2,enemy:8,stage:0,coop:true});
  for(const scene of scenes){
   status.textContent=`Measuring scene ${records.length+1}/${scenes.length}…`;
   reset(scene.hero,scene.enemy,scene.stage,scene.coop?'local':'solo');
   q(`environment.quality=2;environment.time=15;window.reviewTimings={};window.reviewImageCalls=0;bannerTime=0;`);
   const draw=[],update=[],input=[],interval=[];let last=0;
   for(let i=0;i<100;i++){
    const stamp=await nextFrame();if(i>=10&&last)interval.push(stamp-last);last=stamp;
    const measured=q(`(()=>{if(${!!scene.storm}){phase=3;boss.type='storm';boss.state='attack';boss.timer=1;boss.stormTick=.4;boss.target=600;}hero.inv=999;boss.cd=999;const a=performance.now();pollPad();const b=performance.now();update(1/60);environment.time+=1/60;const c=performance.now();HealthiaAnimation.beginFrame(performance.now());draw();HealthiaAnimation.endFrame();const d=performance.now();return [b-a,c-b,d-c];})()`);
    if(i>=10){input.push(measured[0]);update.push(measured[1]);draw.push(measured[2]);}
   }
   const detail=q(`({hero:heroes[selected].name,opponent:villainNames[opponent],venue:venueNames[venue],timings:reviewTimings,imageCalls:reviewImageCalls})`);
   records.push({...scene,...detail,frames:100,samples:90,inputMs:stats(input),updateMs:stats(update),drawMs:stats(draw),frameMs:stats(interval)});
   status.textContent=`Measured ${records.length}/${scenes.length}: ${detail.opponent}`;report({records,errors});
  }
 }catch(e){errors.push(e.stack||e.message);}finally{
  q(`for(const [name,original] of Object.entries(window.reviewWrapped||{}))window[name]=original;if(window.reviewImageOriginal)ctx.drawImage=reviewImageOriginal;`);
  busy=false;controls(true);status.textContent=`Performance measurement complete: ${records.length} scenes, ${errors.length} errors.`;report({records,errors});
 }
}
async function checks(){
 busy=true;controls(false);controlled(true);const checks=[];
 const check=(name,source)=>{try{const detail=q(`(()=>{${source}})()`);if(detail!==true)throw Error(JSON.stringify(detail));checks.push({name,pass:true});}catch(e){checks.push({name,pass:false,error:e.message});}report({checks});};
 q(`window.reviewPad={connected:true,index:0,axes:[0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};window.reviewOriginalGamepads=Object.getOwnPropertyDescriptor(navigator,'getGamepads');Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>window.reviewPads||[]});window.reviewPads=[];window.reviewKey=(type,key,code)=>window.dispatchEvent(new KeyboardEvent(type,{key,code,bubbles:true,cancelable:true}));window.reviewNeutral=()=>{for(const p of reviewPads){p.axes.fill(0);p.buttons.forEach(b=>{b.pressed=false;b.value=0;});}pollPad();};window.reviewButton=(index,held)=>{reviewPad.buttons[index]={pressed:held,value:held?1:0};pollPad();};`);
 try{
  reset();check('Solo keyboard taps dispatch once between frames',`let hits=0;const old=action;action=function(k,...a){if(k==='punch')hits++;return old(k,...a);};try{reviewKey('keydown','j','KeyJ');reviewKey('keyup','j','KeyJ');pollPad();return hits===1;}finally{action=old;}`);
  reset();check('Touch tap and cancel release without a render tick',`const b=document.querySelector('[data-key="punch"]');let hits=0;const old=action;action=function(k,...a){if(k==='punch')hits++;return old(k,...a);};try{battleTouchDown(b,81,{preventDefault(){}});battleTouchUp(81);return hits===1&&!touchHeld.punch&&!battleTouchPointers.size;}finally{action=old;}`);
  reset();check('Analog ignores another finger release and resets on lost capture',`analogPointer=82;analogSetDirection(1);analogRelease({pointerId:83});const kept=analogPointer===82&&touchHeld.right;analogRelease({pointerId:82});return kept&&analogPointer===null&&!touchHeld.right;`);
  reset();check('Focus loss pauses and clears all held controls',`keys.right=true;touchHeld.block=true;analogPointer=84;window.dispatchEvent(new Event('blur'));return paused&&!held('right')&&!held('block')&&analogPointer===null;`);
  reset();check('Disconnected active controller releases movement',`reviewPads=[reviewPad];reviewPad.axes[0]=1;pollPad();const moving=padHeld.right;reviewPads=[];window.dispatchEvent(Object.assign(new Event('gamepaddisconnected'),{gamepad:reviewPad}));pollPad();return moving&&!padHeld.right;`);
  reset(0,0,0,'local');check('Local co-op keyboard taps dispatch between frames',`let hits=0;const old=action;action=function(k,...a){if(k==='punch')hits++;return old(k,...a);};try{reviewKey('keydown','f','KeyF');reviewKey('keyup','f','KeyF');pollPad();return {hits,pass:hits===1}.pass||{hits};}finally{action=old;}`);
  reset(0,0,0,'local');check('Held controller Start keeps local co-op paused',`reviewPads=[reviewPad];reviewNeutral();reviewButton(9,true);const first=paused;pollPad();pollPad();const still=paused;reviewButton(9,false);return first&&still;`);
  reset(0,0,0,'local');check('Second controller can pause and resume without bouncing',`reviewPads=[reviewPad,{connected:true,index:1,axes:[0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))}];reviewNeutral();reviewPads[1].buttons[9]={pressed:true,value:1};pollPad();pollPad();const first=paused;reviewPads[1].buttons[9]={pressed:false,value:0};pollPad();reviewPads[1].buttons[9]={pressed:true,value:1};pollPad();pollPad();return first&&!paused;`);
  reset(0,0,0,'local');check('One downed teammate does not end the round',`coop.players[0].hp=0;coWith(0,()=>finish(false));const live=mode==='fight';coop.players[1].hp=0;coWith(1,()=>finish(false));return live&&mode==='defeat';`);
  for(const win of [true,false]){
   reset();check((win?'Win':'Loss')+' menu supports mouse selection then controller confirm',`reviewPads=[reviewPad];reviewNeutral();finish(${win});ending=3;result();const buttons=padMenuButtons(),target=buttons.find(b=>overlay.contains(b));if(!target)return 'no result buttons';syncMenuFocus(target);const before=mode;reviewButton(0,true);reviewButton(0,false);return mode!==before;`);
  }
  reset();check('Story entry remains public with chapter codes intact',`showStorySelect();return story.active&&story.resumeChapter===1&&!!document.getElementById('story-begin')&&!!document.getElementById('story-enter-code')&&storyChapterForCode('1992')===2&&storyChapterForCode('2014')===3&&storyChapterForCode('0000')===null;`);
  reset();check('Story hero swap preserves health, power and held movement',`showStorySelect();startStoryFight();boss.cd=999;story.team[0].hp=75;story.team[1].hp=62;story.team[1].power=54;keys.right=true;requestStoryTag();for(let i=0;i<160&&story.tag;i++)updateStep(1/120);return selected===1&&hero.hp===62&&hero.power===54&&story.team[0].hp===75&&keys.right&&!story.tag;`);
  reset();check('All three heroes launch against all nine opponents in all five venues',`for(let h=0;h<3;h++)for(let o=0;o<9;o++)for(let v=0;v<5;v++){selected=h;opponent=o;venue=v;start();hero.inv=999;boss.cd=999;update(1/60);draw();if(mode!=='fight'||!Number.isFinite(hero.x)||!Number.isFinite(boss.x))return {h,o,v,mode};}return true;`);
 }finally{
  q(`if(reviewOriginalGamepads)Object.defineProperty(navigator,'getGamepads',reviewOriginalGamepads);else delete navigator.getGamepads;window.reviewPads=[];clearInput();`);
  reset();busy=false;controls(true);status.textContent=`Control checks complete: ${checks.filter(c=>c.pass).length}/${checks.length} passed.`;report({checks});
 }
}
document.getElementById('benchmark').onclick=benchmark;
document.getElementById('checks').onclick=checks;
document.getElementById('chapters').onclick=async()=>{
 controls(false);controlled(true);const checks=[];
 const check=(name,source)=>{try{const actual=q(`(()=>{${source}})()`);if(actual!==true)throw Error(JSON.stringify(actual));checks.push({name,pass:true});}catch(e){checks.push({name,pass:false,error:e.message});}report({checks});};
 const until=async(source)=>{for(let i=0;i<100;i++){if(q(source))return true;await wait(100);}throw Error('Chapter assets did not become ready within 10 seconds');};
 try{
  reset();check('Chapter 1 ending preserves the movie, then reveals 1992',`showStorySelect();story.mainHeroIndex=1;story.battle=6;startStoryFight();finish(true);ending=3;result();if(story.movie?.getAttribute('src')!=='videos/is-this-the-end.mp4')return 'wrong ending movie';document.getElementById('story-movie-skip').click();return mode==='story-chapter-complete'&&document.getElementById('story-earned-code')?.textContent==='1992';`);
  q(`selected=2;document.getElementById('story-chapter-continue')?.click();`);
  await until('HealthiaCave.scene?.ready&&HealthiaCave.scene.movie');
  check('Chapter 2 preserves the main hero and starts the cave mission',`const correct=HealthiaCave.scene.model.character==='sadie';document.querySelector('[data-movie="skip"]').click();return correct&&HealthiaCave.scene.model.state==='running'&&mode==='story-cave';`);
  check('Chapter 2 rescue movie precedes code 2014',`HealthiaCave.scene.model.state='complete';HealthiaCave.scene.finish();if(story.movie?.getAttribute('src')!=='videos/rescue-sadie.mp4')return 'wrong rescue movie';document.getElementById('story-movie-skip').click();return mode==='story-chapter-complete'&&story.chapter2Complete&&document.getElementById('story-earned-code')?.textContent==='2014'&&!HealthiaCave.active;`);
  check('Chapter 3 starts with its movie and first scorpion round',`document.getElementById('story-chapter-continue').click();if(story.movie?.getAttribute('src')!=='videos/shore-chapter-intro.mp4')return 'wrong chapter movie';document.getElementById('story-movie-skip').click();return shore.phase==='fight'&&shore.round===1&&selected===1;`);
  check('Chapter 3 advances through round two and the boss',`finishShore(true);showShoreResult(true);if(story.movie?.getAttribute('src')!=='videos/shore-split.mp4')return 'wrong split movie';document.getElementById('story-movie-skip').click();if(shore.round!==2)return 'wrong second round';finishShore(true);showShoreResult(true);if(story.movie?.getAttribute('src')!=='videos/shore-boss-intro.mp4')return 'wrong boss movie';document.getElementById('story-movie-skip').click();return shore.round===3&&shore.model.kind==='boss'&&mode==='fight';`);
  check('Chapter 3 ending completes without awarding an extra code',`shore.model.hp=0;finishShore(true);showShoreResult(true);if(story.movie?.getAttribute('src')!=='videos/shore-chapter-ending.mp4')return 'wrong final movie';document.getElementById('story-movie-skip').click();return shore.completed&&story.chapter3Complete&&mode==='shore-complete'&&!document.getElementById('story-earned-code');`);
  reset();check('A lost Story fight awards no chapter code',`showStorySelect();story.battle=6;startStoryFight();story.team.forEach(p=>p.hp=0);finish(false);ending=3;result();return mode==='defeat'&&!document.getElementById('story-earned-code');`);
 }catch(e){checks.push({name:'Chapter transition setup',pass:false,error:e.message});}finally{reset();controls(true);status.textContent=`Chapter checks complete: ${checks.filter(c=>c.pass).length}/${checks.length} passed.`;report({checks});}
};
document.getElementById('live').onclick=async()=>{
 controls(false);const samples=[];
 q('window.reviewCurrentSky=sky;window.reviewCurrentStage=renderLivingStage;');
 try{
  for(const original of [true,false]){
   controlled(true);reset(0,0,2);q('environment.quality=2;environment.lastStamp=-1;');
   if(original)q(window.reviewSceneryReference);else q('sky=reviewCurrentSky;renderLivingStage=reviewCurrentStage;');
   q("boss.state='warn';boss.type='storm';boss.timer=1.25;boss.target=hero.x;phase=3;hero.inv=999;boss.cd=0;");
   status.textContent=`Measuring live frames: ${original?'original':'optimized'} scenery…`;
   controlled(false);await wait(1500);q('HealthiaAnimation.resetMetrics();window.reviewFrameIntervals=[];window.reviewFrameStamp=0;window.reviewCaptureFrames=true;');await wait(6500);
   const raw=q('reviewFrameIntervals.slice()');q('window.reviewCaptureFrames=false;');
   const timing=raw.length?stats(raw):null,animation=q('HealthiaAnimation.metrics()');
   samples.push({scenery:original?'original':'optimized',rawFrameSamples:raw.length,rawFrameMs:timing,
    fps:timing&&raw.length>=30&&timing.p95<250?+(1000/timing.mean).toFixed(2):null,
    needsDeviceCheck:!timing||raw.length<30||timing.p95>=250,drawP95:animation.drawP95,
    simulationHz:animation.simulationHz,allArtworkReady:animation.allReady,errors:animation.errors});report({samples});
  }
 }catch(e){report({samples,error:e.message});}finally{controlled(true);q('sky=reviewCurrentSky;renderLivingStage=reviewCurrentStage;');controls(true);status.textContent=samples.some(s=>s.needsDeviceCheck)?'Long animation callback gaps detected. Repeat this check on your device; these samples cannot verify 60 FPS.':'Live frame comparison complete. Browser load and device hardware affect these results.';report({samples});}
};
document.getElementById('pixels').onclick=()=>{
 controlled(true);reset();controls(false);
 try{
  // Compare the actual before/after scenery commands in this browser, including
  // all three living stages and quality tiers. Readback is QA-only.
  const comparison=q(`(()=>{
   const current=renderLivingStage,reference=${JSON.stringify(window.reviewSceneryReference)};
   const original=eval('('+reference.slice(0,reference.indexOf('\\nfunction sky'))+')');
   const rows=[];
   for(const stage of [0,1,2])for(const quality of [0,1,2])for(const time of [0,15,39.25]){
    venue=stage;environment.time=time;environment.quality=quality;environment.lastStamp=-1;
    ctx.clearRect(0,0,W,H);const base=original(stage);ctx.drawImage(base,0,0);
    const before=ctx.getImageData(0,0,W,H).data;
    environment.lastStamp=-1;ctx.clearRect(0,0,W,H);current(stage);
    const after=ctx.getImageData(0,0,W,H).data;
    let changed=0,total=0,max=0;for(let i=0;i<before.length;i++){const delta=Math.abs(before[i]-after[i]);if(delta){changed++;total+=delta;max=Math.max(max,delta);}}
    rows.push({stage,quality,time,changedChannels:changed,meanChannelDifference:total/before.length,maxChannelDifference:max});
   }
   return rows;
  })()`);
  report({sceneryComparison:comparison});status.textContent='Scenery comparison complete. Small edge differences may come from canvas antialiasing.';
 }catch(e){report({error:e.stack||e.message});}finally{controls(true);}
};
document.getElementById('play').onclick=()=>{controlled(false);reset();preview.contentWindow.focus();status.textContent='Live fight: normal controls, protected hero for practice.';};
document.getElementById('size').onchange=e=>{preview.className=e.target.value;if(e.target.value)q('showBattleTouch();layoutBattleControls();');};
const loading=setInterval(()=>{try{if(!q(`loaded&&HealthiaAnimation.metrics().allReady&&HealthiaBushman.ready()&&HealthiaTempest.ready()&&["HealthiaAirPollutionAnimation","HealthiaStyrodogAnimation","HealthiaSonicTuskAnimation","HealthiaVenomisThornbearAnimation","HealthiaStyroAnimation","HealthiaWastelanderAnimation","HealthiaAtomdustAnimation","HealthiaLighteningSpreeAnimation","HealthiaBushmanAnimation"].every(name=>window[name]?.ready())`))return;ready=true;clearInterval(loading);controls(true);status.textContent='Ready. Choose performance measurement, control checks, or live play.';}catch(_){}},250);
