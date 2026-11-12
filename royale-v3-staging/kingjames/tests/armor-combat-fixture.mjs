import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {Game,STEP,decodeSave} from '../../../royale/core.mjs';
import {PowerSystem,normalizePowers} from '../../../royale/powers.mjs';
import {EQUIPMENT,armorOutfitKey,emptyInventory} from '../../../royale/equipment.mjs';
import {inventoryFor,testedPowers} from './armor-fixture.mjs';

export const attacks=['punch','kick','strength','superKick','fireball','roots','whirlwind'];
export const families=[...new Set(Object.values(EQUIPMENT).map(armorOutfitKey))];
export function combatHero(setId=null,{learned=5,testPowers=false}={}){
 const g=new Game({random:()=>.99,now:()=>1800000000000,testPowers});
 g.gainXP(1e9);g.paused=true;
 g.powers=new PowerSystem(g,normalizePowers({levels:Object.fromEntries(testedPowers.map(id=>[id,learned])),equipped:['strength','superKick','fireball']},99,{allowOverBudget:testPowers}));
 g.inventory=setId?inventoryFor(setId):emptyInventory();
 if(setId){g.inventory.equipped={};g.treeVisit=true;assert(g.equipItem(g.inventory.items[0].uid),setId);g.treeVisit=false;}
 g.refreshEquipment();return g;
}
function ready(g){
 g.enemies=[];g.powers.cancelEffects();g.powers.cooldowns={};g.hero.attack=null;g.hero.attackBuffer=null;
 g.hero.dead=false;g.hero.stun=0;g.hero.invulnerable=0;g.combatTimer=0;g.paused=false;
 g.hero.x=700;g.hero.y=600;g.hero.vx=g.hero.vy=0;g.hero.grounded=true;g.hero.face=1;
 g.events=[];g.hitRecovery.clear();g.hitEvents.clear();
 // Hold only the target AI still, leaving actual contact, attacks, projectiles,
 // damage scaling, power clocks and HP subtraction in the game engine.
 g.stepEnemy=()=>{};g.stepEncounter=()=>{};
}
export function hitPointsLost(g,attack){
 ready(g);g.powers.data.equipped=['strength','superKick','fireball'].includes(attack)?['strength','superKick','fireball']:[attack,null,null];
 const e=g.makeEnemy('guardian',740,'sand-a',0);e.protection=0;e.hp=e.maxHp=1e6;g.enemies=[e];
 const powers=g.powers.data.equipped.map(id=>id===attack);
 for(let i=0;i<720;i++){
  e.x=g.hero.x+40;e.y=g.hero.y;e.prevX=e.x;e.prevY=e.y;
  g.step(STEP,i===0?{punch:attack==='punch',kick:attack==='kick',powers}:{});
 }
 const hits=g.events.filter(e=>e.type==='hit').length;
 assert(hits>0,attack+' did not hit');
 return {damage:Number((e.maxHp-e.hp).toFixed(8)),hits};
}
export function incomingLost(g,steel=false){
 ready(g);g.hero.hp=g.hero.maxHp;g.powers.data.equipped=['steel',null,null];
 if(steel)assert(g.powers.activateSlot(0));
 const before=g.hero.hp;assert(g.hurt(100,g.hero.x+40,{level:99,boss:true}));
 return Number((before-g.hero.hp).toFixed(8));
}
export function measure(g){
 const offense=Object.fromEntries(attacks.map(id=>[id,hitPointsLost(g,id)]));
 const incoming=incomingLost(g),steelIncoming=incomingLost(g,true);
 ready(g);g.powers.data.equipped=['flight',null,null];assert(g.powers.activateSlot(0));
 let flightFrames=0;while(g.powers.flying&&flightFrames<3000){g.powers.step(STEP);flightFrames++;}
 ready(g);for(let i=0;i<120;i++)g.step(STEP,{move:1,run:true});
 return {offense,incoming,steelIncoming,flightFrames,runVelocity:Number(g.hero.vx.toFixed(8)),attackRate:Number(g.powers.attackRate.toFixed(8)),maxHp:g.hero.maxHp};
}
export function reload(g){
 ready(g);g.paused=true;g.powers.data.equipped=['strength','superKick','fireball'];
 const raw=g.save();assert(raw);const saved=decodeSave(raw,{allowOverBudgetPowers:g.testPowers});assert(saved);
 return new Game({save:saved,random:()=>.99,now:g.now,testPowers:g.testPowers});
}
export function recordCombat(){
 const rows={unarmored:measure(combatHero())};
 for(const family of families)rows[family]=measure(combatHero(family));
 return rows;
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(JSON.stringify(recordCombat()));
