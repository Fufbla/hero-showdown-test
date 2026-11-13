import test from 'node:test';
import assert from 'node:assert/strict';
import {StoreController} from './store-controller.mjs';
import {COLLECTION} from '../../royale/fashion/catalog.mjs';
import {emptyCosmetics,catalogIndex,cosmeticTransaction,quoteOutfit,ownsOutfit} from '../costumes/state.mjs';
import {Game} from '../../royale/core.mjs';
import {LocalHeroStore} from '../../royale/saves.mjs';
const index=catalogIndex({sets:COLLECTION}),outfit=COLLECTION[1];
function fixture({coins=1400,delay=false,reject=false}={}){
 let state={cosmetics:emptyCosmetics(),coins,ready:true},calls=0,release;
 const controller=new StoreController({status:()=>state,quote:quoteOutfit,owns:ownsOutfit,operate:async operation=>{
  calls++;if(delay)await new Promise(r=>release=r);if(reject)return {ok:false,error:'Cloud acknowledgement failed.'};
  const result=cosmeticTransaction({state:state.cosmetics,coins:state.coins,index,operation:{...operation,revision:state.cosmetics.revision},safe:true,atWardrobe:true});
  if(result.ok)state={...state,cosmetics:result.state,coins:result.coins};return result;
 }});
 return {controller,status:()=>state,calls:()=>calls,release:()=>release?.()};
}
test('preview and Cancel retain selection without changing ownership, equipment or coins',()=>{
 const f=fixture(),before=structuredClone(f.status());f.controller.select(outfit);assert.deepEqual(f.status(),before);f.controller.request(outfit);f.controller.cancel();assert.equal(f.controller.selected,outfit);assert.equal(f.controller.confirming,null);assert.equal(f.calls(),0);assert.deepEqual(f.status(),before);
});
test('double Buy while a delayed save is pending deducts exactly once',async()=>{
 const f=fixture({delay:true});f.controller.request(outfit);const pending=f.controller.buy();assert.equal(f.controller.busy,true);assert.equal((await f.controller.buy()).ignored,true);assert.equal(f.controller.cancel(),false);assert.equal(f.status().coins,1400);f.release();assert.equal((await pending).ok,true);assert.equal(f.calls(),1);assert.equal(f.status().coins,700);assert(ownsOutfit(f.status().cosmetics,outfit));assert.deepEqual(f.status().cosmetics.equipped,{});assert.equal(f.controller.confirming,null);
});
test('insufficient coins produce a clear message and never invoke persistence',async()=>{
 const f=fixture({coins:50}),before=structuredClone(f.status());f.controller.request(outfit);assert.equal((await f.controller.buy()).ok,false);assert.match(f.controller.message,/650 more/);assert.equal(f.calls(),0);assert.deepEqual(f.status(),before);
});
test('failed cloud acknowledgement retains balance and allows cancel',async()=>{
 const f=fixture({reject:true}),before=structuredClone(f.status());f.controller.request(outfit);assert.equal((await f.controller.buy()).ok,false);assert.deepEqual(f.status(),before);assert.equal(f.controller.busy,false);assert(f.controller.confirming);assert.equal(f.controller.cancel(),true);
});
test('owned outfit cannot be purchased again; Equip is a separate saved operation',async()=>{
 const f=fixture();f.controller.request(outfit);await f.controller.buy();assert.equal(f.controller.request(outfit),false);assert.equal(f.calls(),1);assert.equal((await f.controller.equip(outfit)).ok,true);assert.equal(f.status().coins,700);assert.equal(f.status().cosmetics.equipped.fullbody,outfit.pieces[0].id);
});
test('all 28 catalog prices come from existing quotes and preserve outfit identities',()=>{
 const f=fixture();for(const set of COLLECTION){assert(f.controller.request(set));assert.equal(f.controller.confirming.price,quoteOutfit(f.status().cosmetics,set).debit);assert.equal(set.coinPrice,700);f.controller.cancel();}assert.equal(COLLECTION.length,28);assert.equal(f.calls(),0);
});
test('purchase and equipment survive real local serialization while armor, XP, powers and position remain unchanged',()=>{
 const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},store=new LocalHeroStore(storage),game=new Game();
 game.hero.coins=1400;assert(store.writeSlot(0,JSON.parse(game.save()),{expectedId:null,requireDurable:true}).ok);const original=structuredClone(store.slot(0).snapshot);
 let result=cosmeticTransaction({state:game.cosmetics,coins:1400,index,operation:{type:'purchase',id:outfit.id,confirmed:true,revision:0},safe:true,atWardrobe:true});assert(result.ok);
 result=cosmeticTransaction({state:result.state,coins:result.coins,index,operation:{type:'equip',id:outfit.id,revision:result.state.revision},safe:true,atWardrobe:true});assert(result.ok);
 const next={...original,coins:result.coins,cosmetics:result.state};assert(store.writeSlot(0,next,{expectedId:store.slot(0).id,requireDurable:true}).ok);
 const restored=new LocalHeroStore(storage).slot(0).snapshot;
 assert.equal(restored.coins,700);assert.equal(restored.cosmetics.equipped.fullbody,outfit.pieces[0].id);
 for(const field of ['look','inventory','powers','world','level','xp'])assert.deepEqual(restored[field],original[field],field);
});
