// Release gate missing from the earlier art-only tests: real damage/defense
// with every new saved costume, equipment changes, and reloads.
import test from 'node:test';
import assert from 'node:assert/strict';
import {COSTUMES} from '../catalog.mjs';
import {catalogIndex,cosmeticTransaction} from '../../../royale/cosmetics/state.mjs';
import {combatHero,measure,reload} from '../../kingjames/tests/armor-combat-fixture.mjs';
const index=catalogIndex({sets:COSTUMES});
test('all ten purchased costumes preserve actual armor combat bonuses and learned levels through reload and removal',()=>{
 const bare=measure(combatHero()),expected=measure(combatHero('shore-ordinary'));
 assert(expected.offense.punch.damage>bare.offense.punch.damage);
 assert(expected.incoming<bare.incoming);
 for(const outfit of COSTUMES){
  const g=combatHero('shore-ordinary'),learned=structuredClone(g.powers.data.levels),look=structuredClone(g.look);
  g.hero.coins=20000;
  for(const type of ['purchase','equip']){
   const r=cosmeticTransaction({state:g.cosmetics,coins:g.hero.coins,index,operation:{type,id:outfit.id,revision:g.cosmetics.revision,confirmed:true},safe:true,atWardrobe:true});
   assert(r.ok,r.error);g.cosmetics=r.state;g.hero.coins=r.coins;
  }
  assert.equal(g.hero.coins,19300);
  const inventory=structuredClone(g.inventory);
  assert.deepEqual(measure(g),expected,outfit.id);
  assert.deepEqual(measure(reload(g)),expected,outfit.id+' reloaded');
  assert.deepEqual(g.visualOutfit().pieces,{});
  assert.deepEqual(g.inventory,inventory);assert.deepEqual(g.powers.data.levels,learned);assert.deepEqual(g.look,look);
  g.powers.cancelEffects();g.combatTimer=0;g.paused=true;assert(g.equipItem('drop-1'));
  assert.deepEqual(measure(g),bare,outfit.id+' removed armor');
 }
 console.log(JSON.stringify({costumes:10,punch:{bare:bare.offense.punch.damage,armored:expected.offense.punch.damage},incoming:{bare:bare.incoming,armored:expected.incoming}}));
});
