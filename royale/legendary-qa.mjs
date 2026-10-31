// These commands exist only inside visibly labelled, session-storage practice frames.
import { createEquipment } from './equipment.mjs';
export function installLegendaryQA(getGame,refresh,art,input,hooks={}){
 const p=new URLSearchParams(location.search);if(!p.has('qa')||!/^legendary-(practice|checks)-/.test(p.get('testSession')||''))return;
 const state=()=>{const g=getGame(),b=g.arenaScene?.boss;return {level:g.hero.level,hp:g.hero.hp,x:g.hero.x,y:g.hero.y,face:g.hero.face,time:g.time,paused:g.paused,combat:g.inCombat(),boss:b?{id:g.arenaScene.legendary,hp:b.hp,maxHp:b.maxHp,phase:b.phase,state:b.state}:null,art:b?art.inspect(b):null,waves:g.bossEncounter?.waves||0,spawned:g.bossEncounter?.spawned||0,helpers:g.enemies.filter(e=>e.summoned&&e.state!=='dead').length,disrupted:g.disruptedPower,cleared:!!g.arenaScene?.cleared,defeated:Object.keys(g.legendary.defeated),pending:g.pendingMergeReward(),active:g.legendary.active,items:g.inventory.items.length,coins:g.hero.coins,roots:g.healthRoots,storage:g.legendaryStorageReady,effects:g.mergeEffects.map(e=>e.id),shots:g.mergeShots.length,cooldowns:{...g.mergeCooldowns}};};
 addEventListener('message',async e=>{if(e.origin!==location.origin||e.source!==parent||e.data?.type!=='royale-legendary-fixture')return;const g=getGame(),b=g.bossEncounter?.boss,{action,value,request}=e.data;
  if(action==='fail-save')hooks.failSave?.();
  if(action==='phase'&&b){b.hp=b.maxHp*({1:1,2:.5,3:.2}[value]||1);g.bossDamaged(b);}
  if(action==='wave'&&b){b.hp=b.maxHp*.2;g.bossDamaged(b);g.stepEncounter(0);g.stepEncounter(g.bossEncounter.waves?14:2.5);}
  if(action==='boss-down'&&b)g.damageEnemy(b,b.maxHp*5,{stagger:false});
  if(action==='helpers-down')for(const h of g.enemies.filter(m=>m.summoned&&m.state!=='dead')){h.protection=0;g.damageEnemy(h,h.maxHp*5,{stagger:false});}
  if(['boss-down','helpers-down'].includes(action))g.stepEncounter(0);
  if(action==='retreat')g.leaveBoss();
  if(action==='defeat')g.defeat();
  if(action==='heal'){g.hero.hp=g.hero.maxHp/2;g.healthRoots=4;}
  if(action==='safe'){g.combatTimer=0;g.hero.attack=null;g.hero.attackBuffer=null;g.enemyShots=[];g.powers.cancelEffects();g.cancelMergeEffects();}
  if(action==='step'){const paused=g.paused;g.paused=false;for(let i=0;i<Math.min(1200,Number(value)||0);i++)g.step(1/60,input.sample());g.paused=paused;}
  if(action==='power'){const paused=g.paused;g.paused=false;g.powers.activateSlot(Number(value));g.paused=paused;}
  if(action==='fill'&&!g.pendingMergeReward()){while(g.inventory.items.length<7)g.inventory.items.push(createEquipment(7,'ordinary',0,g.inventory.nextId++));g.refreshEquipment();}
  refresh();if(action==='art'&&g.arenaScene)await art.prepare(g.arenaScene.legendary);e.source.postMessage({type:'royale-legendary-result',request,state:state()},e.origin);
 });
}
