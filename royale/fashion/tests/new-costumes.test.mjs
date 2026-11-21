// Production ownership and approved-art regression checks. No reserved account
// flags, wallet grants, or remote services are used in these tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {COLLECTION,NEW_COSTUMES,costumeForState,costumeHairVisible} from '../catalog.mjs';
import {NEW_OUTFITS,NEW_COSTUME_IDS} from '../new-costumes/definitions.mjs';
import {Game,decodeSave} from '../../core.mjs';
import {LocalHeroStore,PROFILE_KEY} from '../../saves.mjs';
import {styleCDefault} from '../../style-c-defaults.mjs';
import {catalogIndex,cosmeticTransaction} from '../../cosmetics/state.mjs';
import {checkCosmeticSave} from '../../four-powers/backend-v3/deploy/cloud/cosmetics/save-guard.mjs';
const index=catalogIndex({sets:COLLECTION});
function transact(game,type,id){
 const result=cosmeticTransaction({state:game.cosmetics,look:game.look,coins:game.hero.coins,index,
  operation:{type,id,confirmed:true,revision:game.cosmetics.revision},safe:true,atWardrobe:true});
 if(result.ok){game.cosmetics=result.state;game.hero.coins=result.coins;}return result;
}

test('The live catalog exposes exactly four approved additions at 700 without changing earlier ownership IDs',()=>{
 assert.deepEqual(NEW_COSTUME_IDS,['mailman-costume','firefighter-costume','ghost-transformation','wolf-transformation']);
 assert.equal(COLLECTION.length,35);assert.equal(COLLECTION.filter(row=>!NEW_COSTUME_IDS.includes(row.id)).length,31);
 assert.deepEqual(COLLECTION.slice(-4),NEW_COSTUMES);
 assert.deepEqual(NEW_COSTUMES.map(row=>row.fullTransform),[false,false,true,true]);
 for(const outfit of NEW_COSTUMES){
  assert.equal(COLLECTION.filter(row=>row.id===outfit.id).length,1);assert.equal(outfit.coinPrice,700);assert.equal(outfit.unisex,true);
  assert.equal(outfit.pieces[0].id,outfit.id+'.fullbody');assert.equal(outfit.pieces[0].coinPrice,700);
  assert.equal(costumeHairVisible(outfit),!outfit.fullTransform);assert.equal(costumeHairVisible(outfit,true),false);
  assert.match(outfit.thumbnail,/\/royale\/fashion\/new-costumes\/assets\//);
  assert.match(outfit.pieces[0].assetManifest,/\/royale\/fashion\/new-costumes\/assets\//);
 }
 assert.equal(COLLECTION.find(row=>row.id==='robot-costume').coinPrice,0);
 assert.equal(COLLECTION.find(row=>row.id==='golden-puppy-costume').name,'Fancy Costume');
 assert.equal(COLLECTION.find(row=>row.id==='vice-costume').name,'Vice Costume');
});

test('Approved artwork stays byte-identical; only two mailman head registrations move five pixels',async()=>{
 let checked=0;
 for(const id of NEW_COSTUME_IDS){
  const released=new URL('../new-costumes/assets/'+id+'/',import.meta.url),approved=new URL('../../../test-only/four-powers/new-costumes/assets/'+id+'/',import.meta.url);
  const files=(await readdir(approved)).sort();assert.deepEqual((await readdir(released)).sort(),files);
  for(const file of files){
   const source=await readFile(new URL(file,approved)),published=await readFile(new URL(file,released));
   if(id==='mailman-costume'&&file==='manifest.json'){
    const expected=JSON.parse(source);
    assert.deepEqual(expected.frames[10].head,[133.1,119.71,0]);
    assert.deepEqual(expected.frames[21].head,[132.65,122.71,0]);
    expected.frames[10].head=[133.1,124.71,0];expected.frames[21].head=[132.65,127.71,0];
    assert.deepEqual(JSON.parse(published),expected,'Only the measured head-anchor corrections are allowed');
   }else assert.deepEqual(published,source,id+'/'+file);
   checked++;
  }
 }
 assert.equal(checked,14);
});

for(const presentation of ['male','female'])test(presentation+' production saves buy and reload all four while preserving other slots, old costumes, appearance and progression',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
 const store=new LocalHeroStore(storage),game=new Game({look:{...styleCDefault(presentation),name:'Released Costume QA',
  hair:presentation==='male'?'long-locs':'box-braids',hairColor:'#753c26',skin:'#613a25'}});
 game.hero.coins=4900;
 for(const id of ['robot-costume','golden-puppy-costume','vice-costume'])assert(transact(game,'purchase',id).ok);
 assert(transact(game,'equip','vice-costume').ok);
 const before=JSON.parse(game.save());assert.equal(before.coins,3500);
 assert(store.writeSlot(0,game.save()).ok);
 const second=new Game({look:{...styleCDefault('female'),name:'Untouched Other Hero'}});second.hero.coins=527;
 assert(store.writeSlot(1,second.save()).ok);const other=structuredClone(store.slot(1));
 let coins=3500;
 for(const outfit of NEW_OUTFITS){
  const previous=JSON.parse(game.save()),worn=structuredClone(game.cosmetics.equipped);
  const bought=transact(game,'purchase',outfit.id);assert(bought.ok,bought.error);assert.equal(bought.debit,700);coins-=700;
  assert.deepEqual(game.cosmetics.equipped,worn);assert(checkCosmeticSave(previous,JSON.parse(game.save())).ok);
  const purchased=JSON.parse(game.save());assert(transact(game,'equip',outfit.id).ok);assert(checkCosmeticSave(purchased,JSON.parse(game.save())).ok);
  assert(store.writeSlot(0,game.save()).ok);
  const reopened=new LocalHeroStore(storage),restored=new Game({save:decodeSave(JSON.stringify(reopened.slot(0).snapshot))});
  assert.equal(costumeForState(restored.cosmetics,restored.look).id,outfit.id);assert.equal(restored.hero.coins,coins);
  assert.deepEqual(restored.look,before.look);assert.deepEqual(reopened.slot(1),other);
  for(const id of ['robot-costume','golden-puppy-costume','vice-costume',outfit.id])assert(restored.cosmetics.owned.includes(id+'.fullbody'));
  for(const field of Object.keys(before).filter(key=>!['coins','cosmetics'].includes(key)))assert.deepEqual(JSON.parse(restored.save())[field],before[field],field);
  const unchanged=restored.save();assert.equal(transact(restored,'purchase',outfit.id).ok,false);assert.equal(restored.save(),unchanged);
 }
 assert.equal(coins,700);assert.equal(values.has(PROFILE_KEY),true);
 assert.equal([...values.keys()].some(key=>key.startsWith('royale-four-powers-')),false);
 const profile=JSON.parse(values.get(PROFILE_KEY));assert.equal(profile.puppyCoinGrant,undefined);
 assert(transact(game,'unequip').ok);assert.deepEqual(game.look,before.look);
});

test('Production purchases reject insufficient funds, stale revisions and unpurchased equipment without changing a save',()=>{
 for(const outfit of NEW_OUTFITS){
  const game=new Game();game.hero.coins=699;const saved=game.save();
  assert.equal(transact(game,'purchase',outfit.id).ok,false);assert.equal(transact(game,'equip',outfit.id).ok,false);assert.equal(game.save(),saved);
  const stale=cosmeticTransaction({state:game.cosmetics,look:game.look,coins:700,index,
   operation:{type:'purchase',id:outfit.id,confirmed:true,revision:game.cosmetics.revision+1},safe:true,atWardrobe:true});
  assert.equal(stale.ok,false);assert.equal(game.save(),saved);
 }
});
