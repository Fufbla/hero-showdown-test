import {COLLECTION} from '../../costumes/catalog.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {Game,decodeSave} from '../../../royale/core.mjs';
import {equipmentOutfit,EQUIPMENT} from '../../../royale/equipment.mjs';
import {validateProgress} from '../../../royale/cloud-validation.mjs';
import {LocalHeroStore,PROFILE_KEY} from '../../../royale/saves.mjs';
import {cosmeticTransaction,catalogIndex} from '../../../royale/cosmetics/state.mjs';
import {LocalSession,captureProgress} from '../../../royale/local-coop/session.mjs';
import {encodeRuntime,decodeRuntime} from '../../../royale/multiplayer/runtime.mjs';
import {makeHero,inventoryFor,recordBonuses,testedPowers} from './armor-fixture.mjs';
const catalog={sets:COLLECTION},index=catalogIndex(catalog);
function wear(g,id){
 for(const type of ['purchase','equip']){
  const r=cosmeticTransaction({state:g.cosmetics,coins:10000,index,operation:{type,id,revision:g.cosmetics.revision,confirmed:true},safe:true,atWardrobe:true});
  if(type==='equip')assert(r.ok,r.error);if(r.ok)g.cosmetics=r.state;
 }
}
test('every armor family retains the original eight-power calculations and stat values',()=>{
 const baseline=JSON.parse(execFileSync(process.execPath,[fileURLToPath(new URL('./armor-fixture.mjs',import.meta.url))],{encoding:'utf8',maxBuffer:8e6}));
 const actual=recordBonuses();assert.deepEqual(JSON.parse(JSON.stringify(actual)),baseline);
 console.log(Object.keys(actual).length+' armor families retain original statistics across all eight supported powers');
});
test('equip, replace and remove change bonuses exactly once while every cosmetic stays independent',()=>{
 const g=makeHero(),originalLook=structuredClone(g.look),learned=structuredClone(g.powers.data),items=structuredClone(g.inventory.items);
 const base={...g.equipment};wear(g,catalog.sets[0].id);const appearance=g.visualOutfit(),cosmetics=structuredClone(g.cosmetics);
 assert(g.equipItem('drop-1'));assert.equal(g.equipment.fireballLevels,4);assert.equal(g.equipment.fireball,4);
 assert.deepEqual(g.cosmetics,cosmetics);assert.deepEqual(g.visualOutfit(),appearance);
 const armored={...g.equipment};for(let i=0;i<10;i++){g.refreshEquipment();assert.deepEqual(g.equipment,armored);}
 for(const outfit of catalog.sets){wear(g,outfit.id);assert.deepEqual(g.equipment,armored);assert.deepEqual(g.inventory.equipped,{chest:'drop-1',boots:'drop-2'});assert.deepEqual(g.visualOutfit().pieces,{});}
 assert(g.equipItem('drop-3'));assert.equal(g.equipment.fireballLevels||0,0);assert.equal(g.equipment.steelLevels,1);
 assert(g.equipItem('drop-3'));assert.deepEqual(g.equipment,base);
 assert.deepEqual(g.powers.data,learned);assert.deepEqual(g.look,originalLook);assert.deepEqual(g.inventory.items,items);
 assert.equal(g.visualOutfit().hideBaseCape,undefined);
});
test('default appearance and old armor-rich appearance packets never supply visible pieces',()=>{
 const look={id:'starter-basic',origin:'starter',cosmetics:{visible:true,equipped:{}}};
 const old={...look,pieces:{chest:EQUIPMENT['fireball-flare-chest'],boots:EQUIPMENT['fireball-flare-boots']},hideBaseCape:true,armorOutfitId:'fireball-flare'};
 const original=structuredClone(old);
 for(const set of ['fireball-flare','steel-rivet','legacy-r1-ordinary','merge-lightning'])assert.deepEqual(equipmentOutfit(inventoryFor(set),old),{...look,pieces:{}});
 assert.deepEqual(old,original);
});
test('save, validated cloud payload, runtime packets and repeated reload retain independent equipment and cosmetics',()=>{
 const g=makeHero();wear(g,'blossom-kimono');const before=JSON.parse(g.save());assert(g.equipItem('drop-1'));
 const snapshot=JSON.parse(g.save());assert.doesNotThrow(()=>validateProgress(before,snapshot,{kind:'manual'}));
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 const store=new LocalHeroStore(storage);assert(store.writeSlot(0,snapshot,{expectedId:null,requireDurable:true}).ok);
 for(let i=0;i<4;i++){
  const saved=new LocalHeroStore(storage).slot(0).snapshot,loaded=new Game({save:decodeSave(JSON.stringify(saved))});
  for(const key of ['inventory','cosmetics','look','powers','level','xp','coins'])assert.deepEqual(JSON.parse(loaded.save())[key],snapshot[key],key);
  assert.deepEqual(loaded.equipment,g.equipment);assert.deepEqual(loaded.visualOutfit(),g.visualOutfit());
  store.writeSlot(0,JSON.parse(loaded.save()),{expectedId:store.slot(0).id,requireDurable:true});
 }
 const network=decodeRuntime(encodeRuntime(g));assert.deepEqual(network.equipment,g.equipment);assert.deepEqual(network.visualOutfit(),g.visualOutfit());
 assert(map.has(PROFILE_KEY));
});
test('both local co-op heroes keep their own armor, costume and save after one player changes equipment',async()=>{
 const heroes=[makeHero(),makeHero()];wear(heroes[0],'blossom-kimono');wear(heroes[1],'dolphin-costume');
 heroes[0].equipItem('drop-1');heroes[1].equipItem('drop-3');
 const profiles=heroes.map((g,i)=>({identity:'armor-fixture-'+i,slots:[{slot_number:1,snapshot:JSON.parse(g.save())}],saved:[],async save(slot,snapshot){this.saved.push({slot,snapshot});}}));
 const session=new LocalSession(profiles.map(profile=>({profile,slot:1})));session.paused=true;
 const other=captureProgress(session.games[1]);session.games[0].paused=true;assert(session.games[0].equipItem('drop-3'));
 assert.deepEqual(captureProgress(session.games[1]),other);
 for(let i=0;i<2;i++){
  assert.equal((await session.saveOne(i)).ok,true);
  const loaded=new Game({save:decodeSave(JSON.stringify(profiles[i].saved[0].snapshot))});
  assert.deepEqual(loaded.equipment,session.games[i].equipment);assert.deepEqual(loaded.cosmetics,session.games[i].cosmetics);assert.deepEqual(loaded.visualOutfit().pieces,{});
 }
 assert.notDeepEqual(session.games[0].cosmetics,session.games[1].cosmetics);
});
