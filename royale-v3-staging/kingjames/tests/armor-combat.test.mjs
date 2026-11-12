import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {EQUIPMENT} from '../../../royale/equipment.mjs';
import {cosmeticTransaction,catalogIndex} from '../../../royale/cosmetics/state.mjs';
import {inventoryFor,testedPowers} from './armor-fixture.mjs';
import {combatHero,recordCombat,measure,hitPointsLost,incomingLost,reload} from './armor-combat-fixture.mjs';

test('actual combat HP loss for every armor family matches the commit immediately before d4bec40',()=>{
 const loader=new URL('./armor-combat-baseline-loader.mjs',import.meta.url).href;
 const baseline=JSON.parse(execFileSync(process.execPath,['--import',`data:text/javascript,import {register} from 'node:module';register(${JSON.stringify(loader)});`,fileURLToPath(new URL('./armor-combat-fixture.mjs',import.meta.url))],{encoding:'utf8',maxBuffer:8e6}));
 assert.deepEqual(recordCombat(),baseline);
 console.log(`${Object.keys(baseline).length-1} armor families: seven actual attack paths, incoming HP loss, Steel Body, Flight, movement and attack rate match bba835f.`);
});
test('regional armor measurably changes damage and defense, and removing it restores the baseline',()=>{
 const bare=measure(combatHero()),g=combatHero('shore-ordinary'),armored=measure(g);
 for(const id of ['punch','kick','strength','superKick','fireball'])assert(armored.offense[id].damage>bare.offense[id].damage,id);
 assert(armored.incoming<bare.incoming);assert.equal(armored.maxHp,bare.maxHp);
 g.powers.cancelEffects();g.combatTimer=0;g.paused=true;assert(g.equipItem('drop-1'));
 assert.deepEqual(measure(g),bare);
 console.log(JSON.stringify({punch:{bare:bare.offense.punch.damage,armored:armored.offense.punch.damage},incoming:{bare:bare.incoming,armored:armored.incoming}}));
});
test('power armor bonuses survive maxed test powers, repeated refresh and save/reload without becoming learned levels',()=>{
 for(const id of testedPowers){
  const set=Object.values(EQUIPMENT).find(d=>d.part==='chest'&&d[id+'Levels']===9).setId;
  const g=combatHero(set,{learned:20,testPowers:true}),before=structuredClone(g.powers.data.levels),base=combatHero(null,{learned:20,testPowers:true});
  const equipped={...g.equipment};for(let n=0;n<10;n++){g.refreshEquipment();assert.deepEqual(g.equipment,equipped);}
  const actual=measure(g),unarmored=measure(base);
  if(id==='steel')assert(actual.steelIncoming<unarmored.steelIncoming);
  else if(id==='flight')assert(actual.flightFrames>unarmored.flightFrames);
  else if(id==='speed'){assert.equal(actual.runVelocity,unarmored.runVelocity);assert.equal(actual.attackRate,unarmored.attackRate);}
  else assert(actual.offense[id].damage>unarmored.offense[id].damage,id);
  for(let n=0;n<3;n++){const loaded=reload(g);assert.deepEqual(measure(loaded),actual);assert.deepEqual(loaded.powers.data.levels,before);assert.deepEqual(loaded.inventory,g.inventory);}
  assert.deepEqual(g.powers.data.levels,before);
 }
});
test('changing every saved cosmetic and replacing armor cannot remove or accumulate actual combat bonuses',()=>{
 const catalog=JSON.parse(readFileSync(new URL('../../../royale/cosmetics/catalog.json',import.meta.url))),index=catalogIndex(catalog);
 const g=combatHero('shore-ordinary'),expected=measure(g),learned=structuredClone(g.powers.data.levels),look=structuredClone(g.look);
 for(const outfit of catalog.sets){
  for(const type of ['purchase','equip']){
   const r=cosmeticTransaction({state:g.cosmetics,coins:10000,index,operation:{type,id:outfit.id,revision:g.cosmetics.revision,confirmed:true},safe:true,atWardrobe:true});
   if(type==='equip')assert(r.ok,r.error);if(r.ok)g.cosmetics=r.state;
  }
  assert.deepEqual(measure(g),expected,outfit.id);assert.deepEqual(g.visualOutfit().pieces,{});
 }
 const originalItems=structuredClone(g.inventory.items),cosmetics=structuredClone(g.cosmetics);
 g.inventory.items.push(...inventoryFor('fireball-flare',3).items);g.inventory.nextId=5;
 g.powers.cancelEffects();g.combatTimer=0;g.paused=true;assert(g.equipItem('drop-3'));
 assert.equal(g.equipment.defense,0);assert.equal(g.equipment.fireballLevels,4);
 assert.deepEqual(measure(g),measure(combatHero('fireball-flare')));
 assert.deepEqual(g.inventory.items.slice(0,2),originalItems);assert.deepEqual(g.cosmetics,cosmetics);assert.deepEqual(g.look,look);assert.deepEqual(g.powers.data.levels,learned);
 assert.deepEqual(measure(reload(g)),measure(g));
});
