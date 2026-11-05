import {drawHero} from '../style-c-hero.mjs';
import {prepareStyleCMaterials,styleCTextureStatus} from '../style-c-materials.mjs';
import {previewHero} from '../style-c-rig.mjs';
import {STYLE_C_SAMPLES,styleCOutfit} from './style-c-scenes.mjs';
import {runStyleCBrowserChecks} from './style-c-browser.mjs';
import {LOOK_OPTIONS,LOOK_RANGES,COLOR_FIELDS,sanitizeLook} from '../appearance.mjs';
import {LEGENDARY} from '../legendary-data.mjs';
import {Game,STEP} from '../core.mjs';
import {POWER_IDS, normalizePowers} from '../powers.mjs';
import {Renderer} from '../renderer.mjs';
import {PROFILE_KEY} from '../saves.mjs';
import {legendaryGame,ownMerge} from './legendary-fixture.mjs';
const $=id=>document.getElementById(id),makeCanvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
let looks=STYLE_C_SAMPLES.map(l=>({...l})),pose='idle',playing=true,time=.2,last=0,raf=0;
const owners=[{},{}],fields=new Map();
for(const [id,d]of Object.entries(LEGENDARY))$('equipment').append(new Option(d.name+' Merge','merge:'+id));
function field(key,input){const label=document.createElement('label');label.textContent=key.replace(/([A-Z])/g,' $1');input.setAttribute('aria-label',key);label.append(input);$('fields').append(label);fields.set(key,input);input.oninput=()=>{const i=Number($('sample').value);looks[i]=sanitizeLook({...looks[i],[key]:input.type==='checkbox'?input.checked:input.type==='range'?Number(input.value):input.value});render();};}
for(const [key,values]of Object.entries(LOOK_OPTIONS)){const input=document.createElement('select');values.forEach(v=>input.append(new Option(v,v)));field(key,input);}
for(const key of COLOR_FIELDS){const input=document.createElement('input');input.type='color';field(key,input);}
for(const [key,[min,max]]of Object.entries(LOOK_RANGES)){const input=document.createElement('input');Object.assign(input,{type:'range',min,max,step:.01});field(key,input);}
const cape=document.createElement('input');cape.type='checkbox';field('cape',cape);
function sync(){const l=looks[Number($('sample').value)];for(const [key,input]of fields)input.type==='checkbox'?input.checked=l[key]:input.value=l[key];}
function render(){const c=$('heroes').getContext('2d');c.fillStyle='#e4e7dc';c.fillRect(0,0,700,435);c.strokeStyle='#abbab3';c.beginPath();c.moveTo(24,375);c.lineTo(676,375);c.stroke();
 for(let i=0;i<2;i++){drawHero(c,175+i*350,374,looks[i],previewHero(pose,time),time,2.5,{view:$('view').value,outfit:styleCOutfit($('equipment').value),artState:owners[i]});c.fillStyle='#19323d';c.font='14px system-ui';c.fillText(looks[i].presentation+' · '+looks[i].build,105+i*350,409);}
 $('status').textContent=`${pose} · ${playing?'playing':'paused'} · new artwork ${styleCTextureStatus().ready?'ready':'loading'} · editable examples`;
}
for(const b of document.querySelectorAll('[data-pose]'))b.onclick=()=>{pose=b.dataset.pose;time=pose==='kick'?.15:pose==='punch'?.09:.2;for(const x of document.querySelectorAll('[data-pose]'))x.setAttribute('aria-pressed',String(x===b));render();};
$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'Pause animation':'Play animation';render();};
$('step').onclick=()=>{playing=false;$('play').textContent='Play animation';time+=1/60;render();};
$('sample').onchange=sync;$('reset').onclick=()=>{const i=Number($('sample').value);looks[i]={...STYLE_C_SAMPLES[i]};sync();render();};
$('view').onchange=render;$('equipment').onchange=render;
function frame(now){const dt=last?Math.min(.1,(now-last)/1000):0;last=now;if(playing){time+=dt;render();}raf=requestAnimationFrame(frame);}
function practiceGame(){const l=looks[Number($('practice-hero').value)],mode=$('equipment').value,g=mode.startsWith('merge:')?legendaryGame(null):new Game({look:l,random:()=>.4});g.look=sanitizeLook(l);g.hero.level=99;g.hero.maxHp=g.hero.hp=1570;g.hero.coins=5000;g.healthRoots=4;
 if(mode.startsWith('merge:')){ownMerge(g,mode.slice(6));for(const part of g.legendary.defeated[mode.slice(6)].pieces)g.inventory.equipped[part.catalogId.split('-').at(-1)]=part.uid;}
 else{const unique=new Map(Object.values(styleCOutfit(mode).pieces||{}).map(item=>[item.id,item]));for(const item of unique.values()){const uid=`drop-${g.inventory.nextId++}`;g.inventory.items.push({uid,catalogId:item.id});g.inventory.equipped[item.part]=uid;}}
 g.travel(1);g.paused=false;g.combatTimer=0;g.refreshEquipment();g.hero.x=g.hero.prevX=340;g.hero.y=g.hero.prevY=600;
 if (!mode.startsWith('merge:')) {
   const levels = Object.fromEntries(POWER_IDS.map(id => [id, ['fireball','superKick','steel'].includes(id) ? 20 : 1]));
   g.powers.data = normalizePowers({levels, equipped:['fireball','superKick',null]}, g.hero.level);
 }
 return g;
}
function resizePractice(){const type=$('viewport').value,f=$('practice-frame');f.style.width=type==='portrait'?'390px':type==='landscape'?'844px':'100%';f.style.height=type==='portrait'?'844px':type==='landscape'?'390px':'720px';}
$('viewport').onchange=resizePractice;
async function startPractice(upgrades=false){try{resizePractice();const g=practiceGame();if(upgrades){g.hero.level=9;g.hero.maxHp=g.hero.hp=220;g.hero.xp=0;for(const id of Object.keys(g.powers.data.levels))g.powers.data.levels[id]=0;g.powers.data.levels.fireball=3;g.powers.data.points=5;g.powers.data.equipped=['fireball',null,null];}const session='vertical-practice-style-c-'+Date.now(),stamp=new Date().toISOString();sessionStorage.setItem(`royale-test-${session}:`+PROFILE_KEY,JSON.stringify({version:2,revision:0,activeSlot:0,legacyImported:true,slots:[{id:session,createdAt:stamp,updatedAt:stamp,lastRegion:'Coastal Beginnings',snapshot:JSON.parse(g.save())},null,null]}));const f=$('practice-frame');await new Promise(resolve=>{f.onload=resolve;f.src='../index.html?qa=1&touch=1&testSession='+session;});const style=f.contentDocument.createElement('style');style.textContent='#diagnostics{display:none!important}';f.contentDocument.head.append(style);const start=performance.now();while(!f.contentDocument.querySelector('[data-action="continue"]')&&performance.now()-start<15000)await new Promise(r=>setTimeout(r,50));const button=f.contentDocument.querySelector('[data-action="continue"]');if(!button)throw Error('Practice save did not load');button.click();if(upgrades){const waitStart=performance.now();while(f.contentDocument.getElementById('pause').disabled&&performance.now()-waitStart<10000)await new Promise(r=>setTimeout(r,30));f.contentDocument.getElementById('pause').click();f.contentDocument.getElementById('open-loadout').click();f.contentDocument.querySelector('[data-power=fireball]').click();}$('practice-status').textContent=`${g.look.name} · disposable practice ready · ${$('viewport').selectedOptions[0].textContent}`;f.focus();}catch(e){$('practice-status').textContent='Practice error: '+e.message;}};
$('start').onclick=()=>startPractice();$('upgrade-demo').onclick=()=>startPractice(true);
$('start').disabled = $('upgrade-demo').disabled = false;
$('checks').onclick=async()=>{playing=false;$('play').textContent='Play animation';$('checks').disabled=true;$('checks-result').textContent='Checking 49 hairstyles, body builds and connected equipment…';try{$('checks-result').textContent=JSON.stringify(await runStyleCBrowserChecks(makeCanvas),null,2);}catch(e){$('checks-result').textContent=JSON.stringify({passed:false,error:e.message},null,2);}finally{$('checks').disabled=false;}};
$('benchmark').onclick=async()=>{playing=false;cancelAnimationFrame(raf);$('benchmark').disabled=true;let renderer;try{
 const g=practiceGame();g.hero.invulnerable=1e9;renderer=new Renderer($('benchmark-canvas'));const begin=performance.now();await Promise.all([prepareStyleCMaterials(),renderer.monsterAtlas.preload(g.regionId)]);const assetPreparationMs=performance.now()-begin,intervals=[],costs=[],visibility=[];let start,lastFrame,acc=0,steps=0,maxEnemies=0;
 $('performance').textContent='Measuring 12 seconds of actual game rendering…';
 await new Promise(resolve=>{function sample(now){if(start===undefined)start=lastFrame=now;if(now>lastFrame)intervals.push(now-lastFrame);const dt=Math.min(.1,(now-lastFrame)/1000);lastFrame=now;const tick=performance.now();acc+=dt;while(acc>=STEP){g.step(STEP,{move:steps%360<180?1:-1,run:true,jump:steps%180===0,punchHeld:steps%150<35,kickHeld:steps%150>=70&&steps%150<105,powers:[steps%300===0,steps%420===0,steps%600===0]});steps++;acc-=STEP;}renderer.draw(g,acc/STEP,dt);costs.push(performance.now()-tick);maxEnemies=Math.max(maxEnemies,g.enemies.filter(e=>e.state!=='dead').length);if(!visibility.includes(document.visibilityState))visibility.push(document.visibilityState);if(now-start<12000)requestAnimationFrame(sample);else resolve();}requestAnimationFrame(sample);});
 const mean=a=>a.reduce((s,v)=>s+v,0)/a.length,sorted=[...intervals].sort((a,b)=>b-a),ordered=[...costs].sort((a,b)=>a-b);
 $('performance').textContent=JSON.stringify({scope:'Cloud Chrome browser sample; not physical phone testing',userAgent:navigator.userAgent,viewport:[$('benchmark-canvas').clientWidth,$('benchmark-canvas').clientHeight],visibility,focused:document.hasFocus(),seconds:(lastFrame-start)/1000,samples:intervals.length,averageFPS:1000/mean(intervals),onePercentLowFPS:1000/mean(sorted.slice(0,Math.max(1,Math.ceil(sorted.length*.01)))),meanStepAndDrawMs:mean(costs),p95StepAndDrawMs:ordered[Math.floor(ordered.length*.95)],assetPreparationMs,heapBytes:performance.memory?.usedJSHeapSize??null,simulationSeconds:steps*STEP,maxEnemies,creatureErrors:[...renderer.monsterAtlas.errors],textures:styleCTextureStatus()},null,2);
 }catch(e){$('performance').textContent=JSON.stringify({passed:false,error:e.message},null,2);}finally{renderer?.destroy();$('benchmark').disabled=false;last=0;raf=requestAnimationFrame(frame);}};
sync();await prepareStyleCMaterials();render();raf=requestAnimationFrame(frame);
