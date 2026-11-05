import {ROSTER,statesFor,prepareCreature,drawCreature,checkCreatures} from './creature-review-render.mjs';
import {Game,STEP} from '../core.mjs';
import {Renderer} from '../renderer.mjs';
import {WORLD_REGIONS} from '../world.mjs';
import {PROFILE_KEY} from '../saves.mjs';
import {bossFixture,saveBossFixture} from './boss-fixture.mjs';
import {legendaryGame,saveLegendaryFixture} from './legendary-fixture.mjs';
const $=id=>document.getElementById(id),makeCanvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
let selected,clock=.3,playing=false,previous=0,choice=0,frameId=0;
const current=()=>ROSTER.find(i=>i.key===$('creature').value);
for(const item of ROSTER)$('creature').append(new Option(`${item.kind==='monster'?'Monster':item.kind==='regional'?'Regional boss':'Legendary'} · ${item.name}`,item.key));
for(const [i,item] of ROSTER.entries()){
 const card=document.createElement('article'),canvas=makeCanvas(360,250),h=document.createElement('h3'),small=document.createElement('small');
 h.textContent=item.name;small.textContent=item.kind==='monster'?`Region ${item.region} · regular monster`:item.kind==='regional'?`Region ${item.region} · regional boss`:'Legendary boss';canvas.setAttribute('aria-label',item.name+' actual game sprite');card.append(canvas,h,small);$('gallery').append(card);
 const p=await prepareCreature(item);drawCreature(canvas.getContext('2d'),p);p.release();$('status').textContent=`${i+1}/36 creature presentations loaded.`;
}
async function select(){playing=false;$('animate').textContent='Play animation';const ticket=++choice;selected?.release();selected=null;const item=current();$('animation').replaceChildren(...statesFor(item).map(s=>new Option(s==='move'?'Movement':s[0].toUpperCase()+s.slice(1),s)));const next=await prepareCreature(item);if(ticket!==choice){next.release();return;}selected=next;clock=.3;render();}
function render(){if(!selected)return;const canvas=$('selected-canvas'),c=canvas.getContext('2d');c.clearRect(0,0,540,360);drawCreature(c,selected,{state:$('animation').value,u:clock%1,face:Number($('face').value),phase:Number($('phase').value),x:270,y:295,scale:selected.item.kind==='monster'?2:1});$('pose-status').textContent=`${selected.item.name} · ${$('animation').selectedOptions[0].text} · Phase ${$('phase').value} · ${playing?'playing':'paused'}`;}
function animate(now){const dt=previous?Math.min(.1,(now-previous)/1000):0;previous=now;if(playing){clock+=dt*.65;render();}frameId=requestAnimationFrame(animate);}
$('creature').onchange=select;for(const id of ['animation','face','phase'])$(id).onchange=()=>{clock=.3;render();};$('animate').onclick=()=>{playing=!playing;$('animate').textContent=playing?'Pause animation':'Play animation';render();};$('step').onclick=()=>{playing=false;$('animate').textContent='Play animation';clock+=1/30;render();};
function ordinaryGame(item){const g=new Game({look:{name:'Creature Reviewer',cape:true}});g.travel(item.region);g.hero.level=WORLD_REGIONS[item.region-1].levels[1];g.hero.hp=g.hero.maxHp=100+15*(g.hero.level-1);g.hero.coins=200;g.healthRoots=4;const tier=Number($('tier').value),s=g.surfaces.find(s=>s.id===`climb-0-${tier}`);g.hero.x=g.hero.prevX=s?s.x+40:520;g.hero.y=g.hero.prevY=s?s.y:600;const budget=g.hero.level-1;for(const id of ['fireball','whirlwind','steel'])g.powers.data.levels[id]=Math.min(20,Math.floor(budget/3));g.powers.data.points=budget-3*Math.min(20,Math.floor(budget/3));g.powers.data.equipped=['fireball','whirlwind','steel'];return g;}
$('practice').onclick=async()=>{
 const item=current(),session=(item.kind==='monster'?'vertical-practice-':item.kind==='regional'?'boss-practice-':'legendary-practice-')+'creatures-'+Date.now();
 if(item.kind==='regional')saveBossFixture(session,item.id,'control');else if(item.kind==='legendary')saveLegendaryFixture(session,{boss:item.id,loadout:'control'});else {const g=ordinaryGame(item),stamp=new Date().toISOString();sessionStorage.setItem(`royale-test-${session}:`+PROFILE_KEY,JSON.stringify({version:2,revision:0,activeSlot:0,legacyImported:true,slots:[{id:session,createdAt:stamp,updatedAt:stamp,lastRegion:WORLD_REGIONS[item.region-1].name,snapshot:JSON.parse(g.save())},null,null]}));}
 const f=$('practice-frame');await new Promise(resolve=>{f.onload=resolve;f.src='../?qa=1&touch=1&testSession='+session;});
 const start=performance.now();while(!f.contentDocument.querySelector('[data-action="continue"]')&&performance.now()-start<20000)await new Promise(r=>setTimeout(r,50));const continueButton=f.contentDocument.querySelector('[data-action="continue"]');if(!continueButton)throw Error('Practice hero did not load');continueButton.click();$('practice-status').textContent=`${item.name} · disposable practice ready · ${item.kind==='monster'?'platform '+$('tier').value:'original boss encounter'}`;f.focus();
};
$('viewport').onchange=()=>{const phone=$('viewport').value==='phone';for(const id of ['practice-frame','benchmark-canvas']){$(id).style.width=phone?'390px':'100%';$(id).style.height=phone?'844px':'720px';}};
$('validate').onclick=async()=>{playing=false;$('validate').disabled=true;try{const r=await checkCreatures(makeCanvas,{},(n,c)=>$('checks').textContent=`Checking ${n}/36 · ${c} assertions…`);$('checks').textContent=JSON.stringify({...r,userAgent:navigator.userAgent},null,2);}catch(e){$('checks').textContent=JSON.stringify({passed:false,error:e.message,stack:e.stack},null,2);}finally{$('validate').disabled=false;}};
$('benchmark').onclick=async()=>{
 playing=false;$('benchmark').disabled=true;cancelAnimationFrame(frameId);let renderer;
 try{const item=current(),g=item.kind==='monster'?ordinaryGame(item):item.kind==='legendary'?legendaryGame(item.id,{loadout:'control'}):new Game({save:bossFixture(item.id,'control')});
  if(item.kind==='regional'){g.paused=false;g.enterBoss(item.id);}
  g.hero.invulnerable=1e9;g.paused=false;g.hero.x=g.hero.prevX=item.kind==='monster'?g.hero.x:650;
  if(g.bossEncounter){g.damageEnemy(g.bossEncounter.boss,g.bossEncounter.boss.maxHp*.76,{stagger:false});g.stepEncounter(2.3);}
  renderer=new Renderer($('benchmark-canvas'));const begin=performance.now();await renderer.monsterAtlas.preload(g.regionId);if(g.arenaScene)await renderer.bossArt.prepare(item.id);const loadMs=performance.now()-begin;
  const intervals=[],costs=[];let start,last,steps=0,acc=0,maxEffects=0,maxEnemies=0;
  await new Promise(resolve=>{function sample(now){if(start===undefined)start=last=now;if(now>last)intervals.push(now-last);const dt=Math.min(.1,(now-last)/1000);last=now;const t=performance.now();acc+=dt;while(acc>=STEP){g.step(STEP,{powers:[steps%90===0,steps%180===0,steps%120===0]});steps++;acc-=STEP;}renderer.draw(g,acc/STEP,dt);costs.push(performance.now()-t);maxEnemies=Math.max(maxEnemies,g.enemies.filter(e=>e.state!=='dead').length);maxEffects=Math.max(maxEffects,g.powers.projectiles.length+g.powers.bursts.length+Object.keys(g.powers.active).length+g.enemyShots.length+g.mergeEffects.length);if(now-start<12000)requestAnimationFrame(sample);else resolve();}requestAnimationFrame(sample);});
  const mean=a=>a.reduce((s,v)=>s+v,0)/a.length,sorted=[...intervals].sort((a,b)=>b-a),p95=[...costs].sort((a,b)=>a-b)[Math.floor(costs.length*.95)];
  $('performance').textContent=JSON.stringify({creature:item.key,scope:'Cloud browser; no physical-device claim',viewport:[$('benchmark-canvas').clientWidth,$('benchmark-canvas').clientHeight],assetLoadMs:loadMs,seconds:(last-start)/1000,samples:intervals.length,averageFPS:1000/mean(intervals),onePercentLowFPS:1000/mean(sorted.slice(0,Math.max(1,Math.ceil(sorted.length*.01)))),meanStepAndDrawMs:mean(costs),p95StepAndDrawMs:p95,simulationSeconds:steps*STEP,maxEnemies,maxEffects,errors:[...renderer.monsterAtlas.errors],bossReady:g.arenaScene?renderer.bossArt.ready:null},null,2);
 }catch(e){$('performance').textContent=JSON.stringify({passed:false,error:e.message,stack:e.stack},null,2);}finally{renderer?.destroy();$('benchmark').disabled=false;previous=0;frameId=requestAnimationFrame(animate);}
};
await select();frameId=requestAnimationFrame(animate);
