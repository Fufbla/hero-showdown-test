import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {COLLECTION,COSTUMES,costumeForState} from '../catalog.mjs';
import {ClothingRuntime} from '../runtime.mjs';
import {CostumeEngine} from '../engine.mjs';
import {OutfitTrial,trialOutfits} from '../trial.mjs';
import {motionHero} from '../preview.mjs';
import {Game,decodeSave} from '../../../royale/core.mjs';
import {emptyCosmetics,cosmeticTransaction,normalizeCosmetics,selectedOutfit,catalogIndex,ownsOutfit} from '../../../royale/cosmetics/state.mjs';
import {checkCosmeticSave} from '../../cloud/cosmetics/save-guard.mjs';
import {APPROVED_OUTFITS} from '../../kingjames/outfit-catalog.mjs';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
const engine=new CostumeEngine({canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u)),jsonLoader:async u=>JSON.parse(await readFile(u))});
const {data,index}=await new ClothingRuntime({readJSON:()=>{throw Error('Old catalog must not be loaded');}}).catalog();
const transaction=(g,type,id)=>cosmeticTransaction({state:g.cosmetics,coins:g.hero.coins,index,operation:{type,id,confirmed:true,revision:g.cosmetics.revision},safe:true,atWardrobe:true});

test('one catalog provides exactly the 22 approved shop and free-trial outfits',async()=>{
 assert.equal(COLLECTION.length,22);assert.equal(COSTUMES.length,10);
 assert.strictEqual(data.sets,COLLECTION);assert.strictEqual(trialOutfits(),COLLECTION);
 assert.deepEqual(COLLECTION.filter(o=>o.renderer==='approved').map(o=>o.id),APPROVED_OUTFITS.map(o=>o.id));
 for(const o of COLLECTION){assert.equal(o.collection,'Mascots & Formal');assert.equal(o.coinPrice,700);assert.equal(o.pieces.length,1);await access(new URL(o.thumbnail,new URL('../',import.meta.url)));}
 const source=JSON.parse(await readFile(new URL('../collection.json',import.meta.url)));
 assert.deepEqual(source.map(o=>o.id),trialOutfits().map(o=>o.id));
});
test('every old outfit is absent, cannot be bought or equipped, and migrates without deleting ownership',async()=>{
 const legacy=JSON.parse(await readFile(new URL('../../../royale/cosmetics/catalog.json',import.meta.url)));
 assert.equal(legacy.sets.length,36);
 for(const o of legacy.sets){
  assert(!index.has(o.id));assert(!COLLECTION.some(c=>c.id===o.id));
  const g=new Game();g.hero.coins=5000;
  for(const type of ['purchase','equip'])assert.equal(transaction(g,type,o.id).ok,false);
  const owned=o.pieces.map(p=>p.id),old={version:1,revision:5,visible:true,owned,equipped:Object.fromEntries(o.pieces.map(p=>[p.category,p.id]))};
  const migrated=normalizeCosmetics(old);assert(migrated);assert.deepEqual(migrated.owned,owned);assert.deepEqual(migrated.equipped,{});assert.equal(migrated.revision,5);assert.equal(selectedOutfit(migrated),null);assert.equal(ownsOutfit(migrated,o),false);
  const previous=JSON.parse(g.save());previous.cosmetics=old;const next=structuredClone(previous);next.cosmetics=migrated;
  assert(checkCosmeticSave(previous,next).ok,o.id);assert(decodeSave(JSON.stringify(next)),o.id);assert.equal(next.coins,5000);
  const injected=structuredClone(next);injected.cosmetics.owned.push(o.pieces[0].id);injected.cosmetics.revision++;
  const fresh=JSON.parse(g.save());assert.equal(checkCosmeticSave(fresh,injected).ok,false,o.id);
 }
 assert.throws(()=>catalogIndex(legacy));
});
test('all 22 outfits can be purchased once, worn, saved, restored, and removed under the same cloud policy',()=>{
 for(const o of COLLECTION){
  const g=new Game();g.hero.coins=700;const before=JSON.parse(g.save());
  const bought=transaction(g,'purchase',o.id);assert(bought.ok,o.id);assert.equal(bought.coins,0);g.cosmetics=bought.state;g.hero.coins=bought.coins;
  const worn=transaction(g,'equip',o.id);assert(worn.ok,o.id);g.cosmetics=worn.state;
  const snapshot=JSON.parse(g.save());assert(checkCosmeticSave(before,snapshot).ok,o.id);
  const restored=new Game({save:decodeSave(JSON.stringify(snapshot))});assert.equal(costumeForState(restored.cosmetics).id,o.id);
  assert.equal(transaction(restored,'purchase',o.id).ok,false);assert(transaction(restored,'unequip').ok);assert.deepEqual(restored.look,g.look);
 }
});
test('all trial outfits render both directions and combat motions without buying or changing a save',async()=>{
 const g=new Game(),trial=new OutfitTrial(engine);g.hero.coins=0;const before=g.save(),c=createCanvas(360,360).getContext('2d');
 for(const o of trialOutfits()){
  assert(await trial.choose(o.id),engine.error);assert.equal(trial.selected(null).id,o.id);
  for(const direction of [-1,1])for(const motion of ['idle','run','jump','doubleJump','punch','kick','strength','superKick','fireball','steel']){
   const pose=engine.draw(c,180,320,g.look,motionHero(motion,.3,direction),2,{id:trial.id,owner:g.hero});assert(pose,o.id+' '+motion);assert.equal(engine.lastFrame.direction,direction);assert.equal(g.save(),before);
  }
 }
 trial.original();assert.equal(trial.selected(COLLECTION[0]),null);assert.equal(trial.active,true);
 trial.clear();assert.strictEqual(trial.selected(COLLECTION[0]),COLLECTION[0]);assert.equal(g.save(),before);
});
test('failed or superseded trials keep the last selection and never grant ownership',async()=>{
 let finish;const trial=new OutfitTrial({preload:id=>id==='dolphin-costume'?new Promise(r=>finish=r):Promise.resolve(id!=='pink-shark-costume')});
 assert(await trial.choose('santa-street'));assert.equal(await trial.choose('pink-shark-costume'),false);assert.equal(trial.id,'santa-street');
 const pending=trial.choose('dolphin-costume');trial.clear();finish(true);assert.equal(await pending,false);assert.equal(trial.active,false);assert.equal(trial.id,null);
 assert.equal(await trial.choose('royal-kimono'),false);
});
