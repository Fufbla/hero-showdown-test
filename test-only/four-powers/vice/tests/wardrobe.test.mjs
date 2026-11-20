import test from 'node:test';
import assert from 'node:assert/strict';

// Each test file runs in its own Node process. Establish the permitted route
// before loading the released wardrobe modules used by the test build too.
globalThis.location={pathname:'/hero-showdown-test/four-powers-test/gameplay/',search:'?testAccount=0000000000'};
const [{COLLECTION,costumeForState},{VICE_ID},{Game,decodeSave},{catalogIndex,cosmeticTransaction},
 {LocalHeroStore,PROFILE_KEY},{createTestSnapshot,TEST_PREFIX},{CloudProfile},
 {applyPuppyTestCoins}]=await Promise.all([
 import('../catalog.mjs'),import('../definitions.mjs'),import('../../../../royale/core.mjs'),
 import('../../../../royale/cosmetics/state.mjs'),import('../../../../royale/saves.mjs'),
 import('../../review.mjs'),import('../../profile.mjs'),import('../../coin-grant.mjs')
]);
const index=catalogIndex({sets:COLLECTION});
const transaction=(game,type,id=VICE_ID)=>{
 const result=cosmeticTransaction({state:game.cosmetics,look:game.look,coins:game.hero.coins,index,
  operation:{type,id,confirmed:true,revision:game.cosmetics.revision},safe:true,atWardrobe:true});
 if(result.ok){game.cosmetics=result.state;game.hero.coins=result.coins;}return result;
};
function fixture(presentation){
 const values=new Map([[PROFILE_KEY,'ordinary profile sentinel']]);let serial=0;
 const storage={getItem:key=>values.get(TEST_PREFIX+key)??null,setItem:(key,value)=>values.set(TEST_PREFIX+key,value)};
 const open=()=>new LocalHeroStore(storage,{now:()=> '2026-11-20T00:00:00.000Z',id:()=>`vice-test-${++serial}`});
 const store=open(),snapshot=createTestSnapshot(presentation==='female'?1:0);
 Object.assign(snapshot.look,{skin:'#6b3f2a',hair:presentation==='female'?'long-wavy':'long-locs',hairColor:'#5c27a6',eyes:'#237be0',facialHair:'none'});
 assert(store.writeSlot(0,snapshot,{expectedId:null,requireDurable:true}).ok);
 assert(applyPuppyTestCoins(store,{storagePrefix:TEST_PREFIX}).ok);
 const game=new Game({save:store.slot(0).snapshot}),heroId=store.slot(0).id;
 const persist=()=>{const result=store.writeSlot(0,game.save(),{expectedId:heroId,requireDurable:true});assert(result.ok,result.error);};
 return {values,store,open,game,persist};
}

for(const presentation of ['male','female'])test(presentation+' test hero buys Vice with the existing wallet, keeps prior ownership and reloads appearance unchanged',()=>{
 const f=fixture(presentation),{game}=f;
 assert(transaction(game,'purchase','golden-puppy-costume').ok);assert(transaction(game,'equip','golden-puppy-costume').ok);f.persist();
 const before=JSON.parse(game.save()),receipt=structuredClone(f.store.data.puppyCoinGrant);
 assert.equal(before.coins,9300);
 assert.equal(transaction(game,'purchase').debit,700);assert.equal(game.hero.coins,8600);
 assert.deepEqual(game.cosmetics.equipped,before.cosmetics.equipped,'Purchase must not equip automatically');f.persist();
 assert(transaction(game,'equip').ok);f.persist();
 const store=f.open(),restored=new Game({save:store.slot(0).snapshot}),after=JSON.parse(restored.save());
 assert.equal(after.coins,8600);assert.equal(costumeForState(restored.cosmetics,restored.look).id,VICE_ID);
 assert.deepEqual(after.cosmetics.owned,[...before.cosmetics.owned,VICE_ID+'.fullbody']);
 for(const key of Object.keys(before).filter(key=>!['coins','cosmetics'].includes(key)))assert.deepEqual(after[key],before[key],key);
 assert.deepEqual(store.data.puppyCoinGrant,receipt);assert.equal(applyPuppyTestCoins(store,{storagePrefix:TEST_PREFIX}).granted,false);
 assert.equal(store.slot(0).snapshot.coins,8600);assert.equal(f.values.get(PROFILE_KEY),'ordinary profile sentinel');
 const unchanged=restored.save();assert.equal(transaction(restored,'purchase').ok,false);assert.equal(restored.save(),unchanged);
 assert(transaction(restored,'unequip').ok);assert.deepEqual(restored.cosmetics.equipped,{});assert.equal(restored.hero.coins,8600);
});

test('Vice cannot debit insufficient funds or a stale wardrobe and never refills a used test grant',()=>{
 const f=fixture('male'),{game}=f;game.hero.coins=699;f.persist();const before=game.save();
 const result=transaction(game,'purchase');assert.equal(result.ok,false);assert.match(result.error,/Not enough coins/);assert.equal(game.save(),before);
 const reloaded=f.open();assert.equal(applyPuppyTestCoins(reloaded,{storagePrefix:TEST_PREFIX}).granted,false);assert.equal(reloaded.slot(0).snapshot.coins,699);
 const stale=cosmeticTransaction({state:game.cosmetics,look:game.look,coins:10000,index,
  operation:{type:'purchase',id:VICE_ID,confirmed:true,revision:game.cosmetics.revision+1},safe:true,atWardrobe:true});
 assert.equal(stale.ok,false);assert.equal(game.save(),before);
});

test('Both co-op test profiles preserve independent Vice purchases and looks without a network or production storage key',async()=>{
 const values=new Map([[PROFILE_KEY,'ordinary profile sentinel']]);
 const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>{assert(key.startsWith(TEST_PREFIX));values.set(key,value);}};
 const players=[new CloudProfile({storage}),new CloudProfile({storage})];
 for(let i=0;i<players.length;i++){
  const profile=players[i];await profile.login('0000000000');assert.equal(profile.slots[0].snapshot.coins,0,'Existing co-op wallet defaults must not change');
  assert.equal(profile.endpoint,null);assert.equal(profile.fetcher,undefined);
  const raw=structuredClone(profile.slots[0].snapshot);raw.coins=1500; // In-memory fixture funding only.
  Object.assign(raw.look,{skin:i?'#d7a078':'#493025',hair:i?'long-straight':'high-loc-bun',hairColor:i?'#9f4327':'#212121'});
  const game=new Game({save:raw}),look=structuredClone(game.look);
  assert(transaction(game,'purchase').ok);assert(transaction(game,'equip').ok);
  await profile.save(1,JSON.parse(game.save()));assert.deepEqual(profile.slots[0].snapshot.look,look);
 }
 const otherBefore=JSON.stringify(players[1].slots);
 for(const profile of players){
  const restored=new CloudProfile({storage});restored.identity=profile.identity;await restored.load();
  const snapshot=restored.slots[0].snapshot;assert.equal(snapshot.coins,800);assert.equal(snapshot.cosmetics.equipped.fullbody,VICE_ID+'.fullbody');
  assert.deepEqual(snapshot.look,profile.slots[0].snapshot.look);assert(decodeSave(JSON.stringify(snapshot)));
 }
 assert.equal(JSON.stringify(players[1].slots),otherBefore);assert.equal(values.get(PROFILE_KEY),'ordinary profile sentinel');
 assert.notEqual(players[0].identity,players[1].identity);
});
