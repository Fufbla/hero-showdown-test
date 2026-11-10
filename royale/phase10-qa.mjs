import {Game} from './core.mjs';
import {scenarioGame,scenarioInput} from './tests/benchmark-scenes.mjs';
export function installPhase10QA(getGame,replaceGame,input,renderer,refresh,audio,measure){
 const params=new URLSearchParams(location.search);if(!params.has('qa')||!/^p10-(checks|benchmark)-/.test(params.get('testSession')||''))return null;
 let scene=null,tick=0;
 const state=()=>{const g=getGame();return {x:g.hero.x,y:g.hero.y,hp:g.hero.hp,level:g.hero.level,coins:g.hero.coins,points:g.powers.data.points,region:g.regionId,safe:g.canSave(),paused:g.paused,monsters:g.enemies.filter(e=>e.state!=='dead').length,shots:g.enemyShots.length,boss:g.arenaScene?.boss?.hp??null,waves:g.bossEncounter?.waves??null,artReady:!g.arenaScene||renderer.bossArt.ready,audio:{enabled:audio.enabled,state:audio.context?.state||'not-started',music:audio.current?.id,voices:audio.voices.size,musicVoices:audio.current?.player.nodes.size||0},snapshot:g.save()};};
 addEventListener('message',event=>{if(event.source!==parent||event.origin!==location.origin||event.data?.type!=='royale-phase10-fixture')return;const {action,value,request}=event.data;let detail=null,g=getGame();
  if(action==='setup'){scene=value;tick=0;replaceGame(scenarioGame(Game,scene));g=getGame();}
  if(action==='place'){Object.assign(g.hero,{x:value.x,prevX:value.x,y:value.y,prevY:value.y,vx:0,vy:0,jumps:0,grounded:true});g.hero.attack=null;g.combatTimer=0;g.clearEnemyShots();g.powers.cancelEffects();g.cancelMergeEffects();}
  if(action==='combat')g.markCombat();
  if(action==='step'){const paused=g.paused;g.paused=false;for(let i=0;i<Math.min(1200,value||0);i++)g.step(1/60,{});g.paused=paused;}
  if(action==='measure')measure(Number(value)||20);
  if(action==='stop')scene=null;
  if(action==='input'){input.pollGamepad();detail=input.sample();}
  if(action==='dispose-input'){const before=g.paused;input.destroy();dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',key:'Escape',bubbles:true}));detail={pausedBefore:before,pausedAfter:g.paused,keys:input.keys.size,aborted:input.abort.signal.aborted};}
  renderer.draw(g,1,1/60);refresh();event.source.postMessage({type:'royale-phase10-result',request,state:state(),detail},event.origin);
 });
 document.documentElement.dataset.phase10Ready='true';
 return {sample(){if(scene==='touch'){
   const stick=document.getElementById('stick'),r=stick.getBoundingClientRect(),phase=tick++%180;
   // Synthetic fingers go through the same handlers as a real touchscreen.
   // Pointer capture is absent for synthetic IDs, as in the vertical QA suite.
   const pointer=(node,type,id,x,y)=>node.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:id,pointerType:'touch',clientX:x,clientY:y}));
   stick.setPointerCapture=()=>{};
   if(phase===0)pointer(stick,'pointerdown',901,r.left+r.width*.8,r.top+r.height*.5);
   if(phase===90)pointer(stick,'pointermove',901,r.left+r.width*.2,r.top+r.height*.5);
   if(phase===179)pointer(stick,'pointerup',901,r.left+r.width*.5,r.top+r.height*.5);
   if(phase===12||phase===32){const b=document.querySelector('[data-control="jump"]');b.setPointerCapture=()=>{};pointer(b,'pointerdown',902,0,0);pointer(b,'pointerup',902,0,0);}
   return input.sample();
  }return scene?scenarioInput(getGame(),scene,tick++):null;}};
}
