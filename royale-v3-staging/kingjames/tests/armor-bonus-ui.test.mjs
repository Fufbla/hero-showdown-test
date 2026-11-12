import test from 'node:test';
import assert from 'node:assert/strict';
import {makeHero,inventoryFor} from './armor-fixture.mjs';
import {appliedEquipment,statComparison} from '../../gameplay/eris-ui.mjs';
import {EQUIPMENT} from '../../../royale/equipment.mjs';
import {appliedBonusSummary} from '../../gameplay/armor-bonus-summary.mjs';

test('the applied armor comparison includes effective power bonuses instead of an all-zero Steel table',()=>{
 const g=makeHero(),bare=appliedEquipment(g,g.inventory);
 assert(g.equipItem('drop-3'));
 const equipped=appliedEquipment(g,g.inventory);
 assert.equal(equipped.steelLevels,1);
 assert.match(appliedBonusSummary(equipped),/Steel Body armor levels \+1/);
 assert.doesNotMatch(appliedBonusSummary(equipped),/No stat bonuses/);
 assert.equal(equipped.defense,0,'Steel armor improves the active power, not passive defense');
 const original=globalThis.document;
 globalThis.document={createElement:tag=>({tag,textContent:'',children:[],append(...items){this.children.push(...items);}})};
 try{
  const table=statComparison(bare,equipped),text=n=>[n.textContent,...n.children.map(text)].join(' ');
  assert.match(text(table),/Steel Body armor levels\s+\+0\s+\+1/);
 }finally{if(original===undefined)delete globalThis.document;else globalThis.document=original;}
});
test('armor UI uses the same learned-power and level gates as combat without changing saved powers',()=>{
 const g=makeHero(),learned=structuredClone(g.powers.data);
 for(const id of ['fireball','steel','roots','strength','whirlwind','superKick','speed','flight']){
  const set=Object.values(EQUIPMENT).find(d=>d.part==='chest'&&d[id+'Levels']===9).setId;
  g.inventory=inventoryFor(set);g.refreshEquipment();
  assert.equal(appliedEquipment(g,g.inventory)[id+'Levels'],g.equipment[id+'Levels']);
  assert.match(appliedBonusSummary(appliedEquipment(g,g.inventory)),/armor levels \+9/);
 }
 g.inventory=inventoryFor('fireball-flare');g.refreshEquipment();
 assert.equal(appliedEquipment(g,g.inventory).fireballLevels,4);
 assert.equal(appliedEquipment(g,g.inventory).fireball,4);
 assert.equal(appliedEquipment(g,g.inventory,1).fireballLevels,0);
 assert.deepEqual(g.powers.data,learned);
 g.powers.data.levels.fireball=0;
 assert.equal(appliedEquipment(g,g.inventory).fireballLevels,0);
});
