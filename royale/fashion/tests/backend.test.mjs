// Test the exact deployable save guard with in-memory snapshots. No accounts.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {checkCosmeticSave} from '../backend-v3/deploy/cloud/cosmetics/save-guard.mjs';
import {OUTFIT_POLICIES as server,historicalPiece as serverPiece} from '../backend-v3/deploy/cloud/cosmetics/outfit-policy.mjs';
import {OUTFIT_POLICIES as client,historicalPiece as clientPiece} from '../outfit-policy.mjs';
import {COLLECTION} from '../catalog.mjs';
import {Game,decodeSave} from '../../core.mjs';
import {catalogIndex,cosmeticTransaction} from '../../cosmetics/state.mjs';
const index=catalogIndex({sets:COLLECTION});
test('deployed policy is identical to the client for new, existing and historical ownership',()=>{
 assert.deepEqual(server,client);
 for(const outfit of Object.values(client))for(const piece of outfit.historicalPieces)assert.deepEqual(serverPiece(piece.id),clientPiece(piece.id));
});
test('exact live save guard accepts all 28 paid outfits, preserves old ownership, and rejects unknown IDs/stale writes',()=>{
 const g=new Game();g.hero.coins=30000;
 for(const outfit of COLLECTION){
  const before=JSON.parse(g.save());
  for(const type of ['purchase','equip']){
   const r=cosmeticTransaction({state:g.cosmetics,coins:g.hero.coins,index,operation:{type,id:outfit.id,revision:g.cosmetics.revision,confirmed:true},safe:true,atWardrobe:true});
   assert(r.ok,r.error);if(type==='purchase')assert.equal(r.debit,700);g.cosmetics=r.state;g.hero.coins=r.coins;
  }
  const after=JSON.parse(g.save());assert(checkCosmeticSave(before,after).ok,outfit.id);
  for(const piece of before.cosmetics.owned)assert(after.cosmetics.owned.includes(piece));
  assert(decodeSave(JSON.stringify(after)));
  const unknown=structuredClone(after);unknown.cosmetics.owned.push('unregistered.fullbody');assert.equal(checkCosmeticSave(before,unknown).ok,false);
  const stale=structuredClone(after);stale.cosmetics.revision=before.cosmetics.revision;assert.equal(checkCosmeticSave(before,stale).ok,false);
 }
 assert.equal(g.cosmetics.owned.length,28);assert.equal(g.hero.coins,10400);
});
test('live service auth, account handlers, save schema, economy and power guards remain byte-for-byte unchanged',async()=>{
 const files=['cloud/backend-v3/index.ts','power-policy.mjs','gameplay/economy-save-guard.mjs','gameplay/economy.mjs','cloud/cosmetics/save-guard.mjs','cloud/cosmetics/state.mjs'];
 for(const path of files){const a=await readFile(new URL('../backend-v3/baseline/'+path,import.meta.url));const b=await readFile(new URL('../backend-v3/deploy/'+path,import.meta.url));assert.deepEqual(a,b,path);}
 assert.deepEqual(await readFile(new URL('../backend-v3/baseline/cloud/cosmetics/outfit-policy.mjs',import.meta.url)),await readFile(new URL('../backend-v3/deploy/cloud/cosmetics/outfit-policy-base.mjs',import.meta.url)));
});
