// Explicit, disposable browser fixtures. Never installed for a real hero namespace.
import { createEquipment } from './equipment.mjs';
export function installBossQA(getGame,refresh){
  const p=new URLSearchParams(location.search);if(!p.has('qa')||!/^boss-(practice|checks)-/.test(p.get('testSession')||''))return;
  const status=()=>{const g=getGame(),b=g.arenaScene?.boss;return {region:g.regionId,boss:b?{name:b.type,hp:b.hp,maxHp:b.maxHp,phase:b.phase,state:b.state}:null,active:!!g.bossEncounter,cleared:!!g.arenaScene?.cleared,waves:g.bossEncounter?.waves||0,spawned:g.bossEncounter?.spawned||0,helpers:g.enemies.filter(e=>e.summoned&&e.state!=='dead').length,coins:g.hero.coins,xp:g.hero.xp,level:g.hero.level,hp:g.hero.hp,maxHp:g.hero.maxHp,dead:g.hero.dead,roots:g.healthRoots,items:g.inventory.items.length,pending:g.inventory.pending.length,unlocked:[...g.world.unlocked],wins:g.bossProgress.records[g.regionId]?.wins||0,chest:g.bossProgress.records[g.regionId]?.chest?.state||null,x:g.hero.x,y:g.hero.y,combat:g.inCombat()};};
  window.addEventListener('message',e=>{
    if(e.origin!==location.origin||e.source!==parent||e.data?.type!=='royale-boss-fixture')return;
    const g=getGame(),b=g.bossEncounter?.boss,{action,value,request}=e.data;
    if(action==='phase'&&b){b.hp=b.maxHp*({1:1,2:.5,3:.2}[value]||1);g.bossDamaged(b);}
    if(action==='wave'&&b){b.hp=b.maxHp*.2;g.bossDamaged(b);g.stepEncounter(0);g.stepEncounter(2.1);}
    if(action==='boss-down'&&b)g.damageEnemy(b,b.maxHp*2,{stagger:false});
    if(action==='helpers-down')for(const helper of g.enemies.filter(m=>m.summoned&&m.state!=='dead')){helper.protection=0;g.damageEnemy(helper,helper.maxHp*2,{stagger:false});}
    if(action==='full-inventory'&&!g.bossEncounter){g.inventory.items=Array.from({length:7},(_,i)=>createEquipment(g.regionId,'ordinary',i,g.inventory.nextId++));g.inventory.equipped={};g.refreshEquipment();}
    if(action==='hurt-hero'){g.hero.hp=Math.max(1,g.hero.maxHp*.25);g.healthRoots=4;}
    if(action==='defeat')g.defeat();
    if(action==='retreat'&&g.arenaScene){g.hero.x=170;g.stepEncounter(0);}
    if(action==='at-chest'&&g.arenaScene?.cleared){g.hero.x=1060;g.hero.y=600;g.hero.grounded=true;}
    if(action==='step'){const paused=g.paused;g.paused=false;for(let i=0;i<Math.min(1200,Math.max(0,Number(value)||0));i++)g.step(1/60);g.paused=paused;}
    if(['boss-down','helpers-down'].includes(action))g.stepEncounter(0);
    refresh();e.source.postMessage({type:'royale-boss-fixture-result',request,state:status()},e.origin);
  });
}
