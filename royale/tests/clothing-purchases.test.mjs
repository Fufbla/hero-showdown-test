import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {emptyCosmetics,normalizeCosmetics,catalogIndex,cosmeticTransaction,saleReady} from '../cosmetics/state.mjs';
const base=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const catalog=JSON.parse(readFileSync(resolve(base,'cosmetics/catalog.json'),'utf8'));
const index=catalogIndex(catalog);
const args=(state,coins,operation)=>({state,coins,index,operation,safe:true,atWardrobe:true});
test('all 36 complete outfits are exactly 700 coins and all 153 manifests exist',()=>{
 assert.equal(catalog.sets.length,36);
 assert.equal(catalog.sets.reduce((n,s)=>n+s.pieces.length,0),153);
 for(const set of catalog.sets){
  assert.equal(set.coinPrice,700,set.name);
  assert.equal(saleReady(set),true,set.name);
  for(const piece of set.pieces){
   assert.ok(existsSync(resolve(base,'cosmetics',piece.assetManifest)),piece.id);
   assert.equal(saleReady(index.get(piece.id)),true,piece.id);
  }
 }
});
test('older hero snapshots default to an empty wardrobe',()=>{
 assert.deepEqual(normalizeCosmetics(undefined),emptyCosmetics());
 assert.equal(normalizeCosmetics({version:1,revision:0,owned:['owned'],equipped:{top:'not-owned'},visible:true}),null);
});
test('buy only after review, deduct once and equip without another charge',()=>{
 const set=catalog.sets[0],start=emptyCosmetics();
 let denied=cosmeticTransaction(args(start,1000,{type:'purchase',id:set.id,revision:0,confirmed:false}));
 assert.equal(denied.ok,false);
 let buy=cosmeticTransaction(args(start,1000,{type:'purchase',id:set.id,revision:0,confirmed:true}));
 assert.equal(buy.ok,true);
 assert.equal(buy.debit,700);
 assert.equal(buy.coins,300);
 assert.equal(buy.state.owned.length,set.pieces.length);
 let wear=cosmeticTransaction(args(buy.state,buy.coins,{type:'equip',id:set.id,revision:buy.state.revision}));
 assert.equal(wear.ok,true);
 assert.equal(wear.coins,300);
 assert.ok(Object.keys(wear.state.equipped).length);
 let again=cosmeticTransaction(args(wear.state,wear.coins,{type:'purchase',id:set.id,revision:wear.state.revision,confirmed:true}));
 assert.equal(again.ok,false);
 assert.equal(again.error,'Already owned.');
});
test('stale revisions cannot buy clothing or change equipped items',()=>{
 const set=catalog.sets[1];
 let buy=cosmeticTransaction(args(emptyCosmetics(),900,{type:'purchase',id:set.id,revision:0,confirmed:true}));
 assert.equal(buy.ok,true);
 let stale=cosmeticTransaction(args(buy.state,buy.coins,{type:'equip',id:set.id,revision:0}));
 assert.equal(stale.ok,false);
 assert.match(stale.error,/changed/i);
});
