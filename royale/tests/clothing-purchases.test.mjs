import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {emptyCosmetics,normalizeCosmetics,catalogIndex,cosmeticTransaction,saleReady,
 ownsOutfit,outfitSelection,selectedOutfit,quoteOutfit,hasCanonicalOutfitSelection} from '../cosmetics/state.mjs';
import {OUTFIT_POLICIES,RETIRED_COSMETIC_IDS,historicalPiece,isRetiredCosmeticId} from '../cosmetics/outfit-policy.mjs';
import {checkCosmeticSave} from '../cosmetics/save-guard.mjs';
const base=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const catalog=JSON.parse(readFileSync(resolve(base,'cosmetics/catalog.json'),'utf8'));
const index=catalogIndex(catalog),set=id=>index.get(id);
const args=(state,coins,operation)=>({state,coins,index,operation,safe:true,atWardrobe:true});
const act=(state,type,id,extra={})=>cosmeticTransaction(args(state,5000,{type,id,revision:state.revision,confirmed:true,...extra}));
const owned=(id,extra={})=>({...emptyCosmetics(),owned:set(id).pieces.map(p=>p.id),...extra});

test('36 matching outfits cost 700; active catalog excludes all 35 retired head items',()=>{
 assert.equal(catalog.sets.length,36);
 assert.equal(catalog.sets.reduce((n,s)=>n+s.pieces.length,0),118);
 assert.equal(RETIRED_COSMETIC_IDS.length,35);
 assert.equal(Object.values(OUTFIT_POLICIES).reduce((n,s)=>n+s.historicalPieces.length,0),153);
 for(const outfit of catalog.sets){
  assert.equal(outfit.coinPrice,700,outfit.name);
  assert.equal(saleReady(outfit),true,outfit.name);
  assert.equal(OUTFIT_POLICIES[outfit.id].historicalPieces.reduce((n,p)=>n+p.coinPrice,0),700);
  for(const piece of outfit.pieces){
   assert.ok(existsSync(resolve(base,'cosmetics',piece.assetManifest)),piece.id);
   assert.equal(isRetiredCosmeticId(piece.id),false,piece.id);
   assert.notEqual(piece.category,'headwear');
   assert.equal(saleReady(index.get(piece.id)),false,'Individual pieces are no longer offers');
   const manifest=JSON.parse(readFileSync(resolve(base,'cosmetics',piece.assetManifest),'utf8'));
   assert(!manifest.layers.some(l=>l.attach==='head'||l.part==='headwear'||l.pass==='headwear'),piece.id);
  }
 }
 for(const id of RETIRED_COSMETIC_IDS){assert(!index.has(id));assert(historicalPiece(id));}
 assert(Object.isFrozen(OUTFIT_POLICIES['royal-kimono'].historicalPieces[0]));
});

test('every new outfit charges 700 once and equips its complete active selection',()=>{
 for(const outfit of catalog.sets){
  const start=emptyCosmetics();
  const denied=cosmeticTransaction(args(start,1000,{type:'purchase',id:outfit.id,revision:0,confirmed:false}));
  assert.equal(denied.ok,false);
  const buy=cosmeticTransaction(args(start,1000,{type:'purchase',id:outfit.id,revision:0,confirmed:true}));
  assert.equal(buy.ok,true,outfit.id);assert.equal(buy.debit,700);assert.equal(buy.coins,300);
  assert.deepEqual(buy.state.owned,outfit.pieces.map(p=>p.id));
  const wear=cosmeticTransaction(args(buy.state,buy.coins,{type:'equip',id:outfit.id,revision:buy.state.revision}));
  assert.equal(wear.ok,true);assert.equal(wear.coins,300);
  assert.deepEqual(wear.state.equipped,outfitSelection(outfit));
  assert.equal(hasCanonicalOutfitSelection(wear.state),true);
  const again=act(wear.state,'purchase',outfit.id);assert.equal(again.ok,false);assert.equal(again.error,'Already owned.');
 }
});

test('individual-piece and retired headwear purchase/equip requests fail without mutation',()=>{
 const state=owned('urban-hero');const original=structuredClone(state);
 for(const id of ['urban-hero.top','urban-hero.footwear',...RETIRED_COSMETIC_IDS]){
  for(const type of ['purchase','equip'])assert.equal(act(state,type,id).ok,false,id+' '+type);
 }
 assert.deepEqual(state,original);
});

test('outfit switch is atomic, drops prior cape/accessory, and Wear unhides legacy clothing',()=>{
 const state=owned('vampire');state.owned.push(...set('royal-kimono').pieces.map(p=>p.id));state.visible=false;
 const first=act(state,'equip','vampire');assert.equal(first.state.visible,true);assert(first.state.equipped.cape);
 const before=[...first.state.owned];
 const second=act(first.state,'equip','royal-kimono');assert.deepEqual(second.state.equipped,{fullbody:'royal-kimono.fullbody',footwear:'royal-kimono.footwear'});
 assert.deepEqual(second.state.owned,before);
 // Old Remove-piece callers also remove the entire outfit, never a single slot.
 const removed=act(second.state,'unequip',undefined,{slot:'footwear'});assert.equal(removed.ok,true);assert.deepEqual(removed.state.equipped,{});assert.deepEqual(removed.state.owned,before);
});

test('legacy single-piece ownership receives its original credit for all 36 outfits',()=>{
 for(const policy of Object.values(OUTFIT_POLICIES))for(const piece of policy.historicalPieces){
  const state={...emptyCosmetics(),revision:7,owned:[piece.id]};
  const quote=quoteOutfit(state,set(policy.id));assert.equal(quote.ok,true);
  assert.equal(quote.debit,700-piece.coinPrice,piece.id);
  const complete=act(state,'purchase',policy.id);assert.equal(complete.ok,true);
  assert.equal(complete.debit+piece.coinPrice,700,piece.id);
  assert(complete.state.owned.includes(piece.id),'Historical credit ID remains owned');
  assert(ownsOutfit(complete.state,set(policy.id)));
  assert(complete.state.owned.every(id=>id===piece.id||!isRetiredCosmeticId(id)));
 }
});

test('completion credit includes retired head accessories and is independent of catalog repricing',()=>{
 const ninja={...emptyCosmetics(),owned:['ninja-warrior.headwear','ninja-warrior.accessory']};
 assert.equal(quoteOutfit(ninja,set('ninja-warrior')).debit,500);
 const oldKimono={...emptyCosmetics(),owned:['royal-kimono.fullbody']};
 assert.equal(quoteOutfit(oldKimono,set('royal-kimono')).debit,200);
 const repriced=structuredClone(set('royal-kimono'));repriced.pieces[0].coinPrice=600;
 assert.equal(quoteOutfit(oldKimono,repriced).debit,200);
 oldKimono.owned.push('royal-kimono.headwear');assert.equal(quoteOutfit(oldKimono,set('royal-kimono')).debit,100);
});

test('all remaining wearable pieces are grandfathered as an owned outfit without buying removed headwear',()=>{
 const state=owned('royal-kimono');
 assert.equal(ownsOutfit(state,set('royal-kimono')),true);
 assert.deepEqual(quoteOutfit(state,set('royal-kimono')),{ok:false,error:'Already owned.',debit:0,missing:[]});
 const wear=act(state,'equip','royal-kimono');assert.equal(wear.ok,true);assert.equal(wear.debit,0);
 assert(!wear.state.owned.includes('royal-kimono.headwear'));
});

test('legacy normalization retains ownership/revision and chooses only the old body set when fully owned',()=>{
 const legacy={version:1,revision:12,visible:false,
  owned:['royal-kimono.headwear',...set('royal-kimono').pieces.map(p=>p.id),...set('vampire').pieces.map(p=>p.id),'future-summer.top'],
  equipped:{headwear:'royal-kimono.headwear',fullbody:'royal-kimono.fullbody',footwear:'vampire.footwear',cape:'vampire.cape'}};
 const before=structuredClone(legacy),migrated=normalizeCosmetics(legacy);
 assert.deepEqual(migrated.owned,legacy.owned);assert.equal(migrated.revision,12);assert.equal(migrated.visible,false);
 assert.deepEqual(migrated.equipped,outfitSelection(set('royal-kimono')));
 assert.equal(selectedOutfit(migrated).id,'royal-kimono');
 assert.deepEqual(normalizeCosmetics(migrated),migrated);assert.deepEqual(legacy,before);
 const missingBoot={...legacy,owned:legacy.owned.filter(id=>id!=='royal-kimono.footwear')};
 assert.deepEqual(normalizeCosmetics(missingBoot).equipped,{});
 const noBody={...legacy,equipped:{headwear:'royal-kimono.headwear',cape:'vampire.cape'}};
 assert.deepEqual(normalizeCosmetics(noBody).equipped,{});
});

test('malformed saves stay invalid; retired and unknown ownership stay readable',()=>{
 assert.deepEqual(normalizeCosmetics(undefined),emptyCosmetics());
 const old={...emptyCosmetics(),owned:['royal-kimono.headwear','future-summer.top'],equipped:{headwear:'royal-kimono.headwear',top:'future-summer.top'}};
 assert.deepEqual(normalizeCosmetics(old),{...old,equipped:{}});
 for(const invalid of [
  {...old,version:2},{...old,revision:-1},{...old,owned:['bad id']},
  {...old,equipped:{top:'unowned.top'}},{...old,equipped:{top:'royal-kimono.headwear'}},
  {...old,owned:['royal-kimono.fullbody','urban-hero.top'],equipped:{fullbody:'royal-kimono.fullbody',top:'urban-hero.top'}},
 ])assert.equal(normalizeCosmetics(invalid),null);
});

test('stale revisions, insufficient balance, combat and release gates still protect transactions',()=>{
 const start=emptyCosmetics(),operation={type:'purchase',id:'royal-kimono',revision:0,confirmed:true};
 for(const change of [{coins:699},{safe:false},{atWardrobe:false}])assert.equal(cosmeticTransaction({...args(start,700,operation),...change}).ok,false);
 const bought=act(start,'purchase','royal-kimono');
 assert.equal(act(bought.state,'equip','royal-kimono',{revision:0}).ok,false);
 const unreleased=structuredClone(catalog);unreleased.sets[0].availability='fitting';
 assert.equal(cosmeticTransaction({...args(start,700,operation),index:catalogIndex(unreleased)}).ok,false);
});

test('cloud accepts migration without a revision bump and the first subsequent +1 purchase',()=>{
 const legacy={version:1,revision:6,owned:['royal-kimono.headwear'],equipped:{headwear:'royal-kimono.headwear'},visible:true};
 const before={version:8,cosmetics:legacy},migrated=normalizeCosmetics(legacy);
 assert(checkCosmeticSave(before,{version:9,cosmetics:migrated}).ok);
 const buy=act(migrated,'purchase','royal-kimono');assert.equal(buy.state.revision,legacy.revision+1);
 assert(checkCosmeticSave(before,{version:9,cosmetics:buy.state}).ok);
 // The original old headwear payload is not accepted just because normalization cleans it.
 assert.equal(checkCosmeticSave(before,{version:9,cosmetics:legacy}).ok,false);
});

test('cloud rejects raw partial/mixed selections, new retired IDs, and incomplete purchases',()=>{
 const start={version:9,cosmetics:emptyCosmetics()};
 for(const ids of [['royal-kimono.headwear'],['royal-kimono.fullbody'],['future-summer.top']]){
  assert.equal(checkCosmeticSave(start,{version:9,cosmetics:{...emptyCosmetics(),revision:1,owned:ids}}).ok,false);
 }
 const complete=owned('royal-kimono',{revision:1});
 assert(checkCosmeticSave(start,{version:9,cosmetics:complete}).ok);
 assert.equal(checkCosmeticSave(start,{version:9,cosmetics:{...complete,equipped:{fullbody:'royal-kimono.fullbody'}}}).ok,false);
 const both={...complete,owned:[...complete.owned,...set('vampire').pieces.map(p=>p.id)]};
 const mixed={...both,equipped:{fullbody:'royal-kimono.fullbody',footwear:'vampire.footwear',cape:'vampire.cape'}};
 assert.equal(checkCosmeticSave(start,{version:9,cosmetics:mixed}).ok,false);
});

test('cloud preserves all historical IDs and blocks stale tabs from downgrading v9',()=>{
 const state=owned('royal-kimono',{revision:3});state.owned.push('royal-kimono.headwear','future-summer.top');state.equipped=outfitSelection(set('royal-kimono'));
 const before={version:9,cosmetics:state};
 assert.equal(checkCosmeticSave(before,{version:8,cosmetics:state}).ok,false);
 assert.equal(checkCosmeticSave(before,{version:9}).ok,false);
 assert.equal(checkCosmeticSave(before,{version:9,cosmetics:{...state,revision:4,owned:state.owned.filter(id=>id!=='royal-kimono.headwear')}}).ok,false);
 const ordered={...state,owned:[...state.owned].reverse(),equipped:Object.fromEntries(Object.entries(state.equipped).reverse())};
 assert(checkCosmeticSave(before,{version:9,cosmetics:ordered}).ok);
 assert.equal(checkCosmeticSave(before,{version:9,cosmetics:{...state,equipped:{}}}).ok,false);
 assert(checkCosmeticSave(before,{version:9,cosmetics:{...state,revision:4,equipped:{}}}).ok);
});
