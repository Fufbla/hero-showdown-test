import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.location={pathname:'/hero-showdown-test/four-powers-test/gameplay/',search:'?testAccount=0000000000'};
const [{COLLECTION,costumeForState},{NEW_COSTUME_IDS},{Game,decodeSave},{catalogIndex,cosmeticTransaction},
 {LocalHeroStore,PROFILE_KEY},{createTestSnapshot,TEST_PREFIX},{CloudProfile},{applyPuppyTestCoins}]=await Promise.all([
 import('../catalog.mjs'),import('../definitions.mjs'),import('../../../../royale/core.mjs'),
 import('../../../../royale/cosmetics/state.mjs'),import('../../../../royale/saves.mjs'),
 import('../../review.mjs'),import('../../profile.mjs'),import('../../coin-grant.mjs')
]);
const index=catalogIndex({sets:COLLECTION});
function transaction(game,type,id){
 const result=cosmeticTransaction({state:game.cosmetics,look:game.look,coins:game.hero.coins,index,
  operation:{type,id,confirmed:true,revision:game.cosmetics.revision},safe:true,atWardrobe:true});
 if(result.ok){game.cosmetics=result.state;game.hero.coins=result.coins;}return result;
}
function fixture(presentation){
 const values=new Map([[PROFILE_KEY,'ordinary profile sentinel']]);let serial=0;
 const storage={getItem:key=>values.get(TEST_PREFIX+key)??null,setItem:(key,value)=>values.set(TEST_PREFIX+key,value)};
 const open=()=>new LocalHeroStore(storage,{id:()=>`new-costumes-${++serial}`});
 const store=open(),snapshot=createTestSnapshot(presentation==='female'?1:0);
 Object.assign(snapshot.look,{skin:'#6b3f2a',hair:presentation==='female'?'long-wavy':'long-locs',hairColor:'#5c27a6',eyes:'#237be0',facialHair:'none'});
 assert(store.writeSlot(0,snapshot,{expectedId:null,requireDurable:true}).ok);
 assert(applyPuppyTestCoins(store,{storagePrefix:TEST_PREFIX}).ok);
 const game=new Game({save:store.slot(0).snapshot}),heroId=store.slot(0).id;
 const persist=()=>{const result=store.writeSlot(0,game.save(),{expectedId:heroId,requireDurable:true});assert(result.ok,result.error);};
 return {values,store,open,game,persist};
}

for(const presentation of ['male','female'])test(presentation+' buys, swaps and reloads all four without losing Fancy, Vice, saved appearance, powers or the existing grant receipt',()=>{
 const f=fixture(presentation),{game}=f;
 for(const id of ['golden-puppy-costume','vice-costume'])assert(transaction(game,'purchase',id).ok);
 assert(transaction(game,'equip','vice-costume').ok);f.persist();
 const baseline=JSON.parse(game.save()),receipt=structuredClone(f.store.data.puppyCoinGrant);
 let expectedCoins=8600;
 for(const id of NEW_COSTUME_IDS){
  const selection=structuredClone(game.cosmetics.equipped);
  assert.equal(transaction(game,'purchase',id).debit,700);expectedCoins-=700;
  assert.deepEqual(game.cosmetics.equipped,selection,'Purchase must not change the worn outfit');
  assert(transaction(game,'equip',id).ok);f.persist();
  const restored=new Game({save:f.open().slot(0).snapshot});
  assert.equal(costumeForState(restored.cosmetics,restored.look).id,id);
  assert.equal(restored.hero.coins,expectedCoins);assert.deepEqual(restored.look,baseline.look);
  assert.deepEqual(restored.powers.data,game.powers.data);
  assert(restored.cosmetics.owned.includes('golden-puppy-costume.fullbody'));
  assert(restored.cosmetics.owned.includes('vice-costume.fullbody'));
  const unchanged=game.save();assert.equal(transaction(game,'purchase',id).ok,false);assert.equal(game.save(),unchanged);
 }
 assert.equal(expectedCoins,5800);
 const finalStore=f.open(),after=JSON.parse(new Game({save:finalStore.slot(0).snapshot}).save());
 for(const key of Object.keys(baseline).filter(key=>!['coins','cosmetics'].includes(key)))assert.deepEqual(after[key],baseline[key],key);
 assert.deepEqual(finalStore.data.puppyCoinGrant,receipt);assert.equal(applyPuppyTestCoins(finalStore,{storagePrefix:TEST_PREFIX}).granted,false);
 assert.equal(finalStore.slot(0).snapshot.coins,5800);assert.equal(f.values.get(PROFILE_KEY),'ordinary profile sentinel');
 assert(transaction(game,'unequip').ok);assert.deepEqual(game.cosmetics.equipped,{});assert.deepEqual(game.look,baseline.look);
});

test('Insufficient funds and stale transactions cannot grant the new transformations or refill the existing test wallet',()=>{
 const f=fixture('male'),{game}=f;game.hero.coins=699;f.persist();
 for(const id of NEW_COSTUME_IDS){
  const before=game.save(),result=transaction(game,'purchase',id);
  assert.equal(result.ok,false);assert.match(result.error,/Not enough coins/);assert.equal(game.save(),before);
  const stale=cosmeticTransaction({state:game.cosmetics,look:game.look,coins:10000,index,
   operation:{type:'purchase',id,confirmed:true,revision:game.cosmetics.revision+1},safe:true,atWardrobe:true});
  assert.equal(stale.ok,false);assert.equal(game.save(),before);
 }
 const reloaded=f.open();assert.equal(applyPuppyTestCoins(reloaded,{storagePrefix:TEST_PREFIX}).granted,false);
 assert.equal(reloaded.slot(0).snapshot.coins,699);
});

test('Separate local co-op profiles retain independent new-costume ownership and human looks without cloud requests',async()=>{
 const values=new Map([[PROFILE_KEY,'ordinary profile sentinel']]);
 const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>{assert(key.startsWith(TEST_PREFIX));values.set(key,value);}};
 const profiles=[new CloudProfile({storage}),new CloudProfile({storage})];
 for(let i=0;i<profiles.length;i++){
  const profile=profiles[i];await profile.login('0000000000');
  assert.equal(profile.endpoint,null);assert.equal(profile.fetcher,undefined);
  const raw=structuredClone(profile.slots[0].snapshot);raw.coins=2800;
  Object.assign(raw.look,{hair:i?'long-straight':'high-loc-bun',hairColor:i?'#9f4327':'#212121'});
  const game=new Game({save:raw});
  for(const id of NEW_COSTUME_IDS)assert(transaction(game,'purchase',id).ok);
  assert(transaction(game,'equip',NEW_COSTUME_IDS[i+2]).ok);await profile.save(1,JSON.parse(game.save()));
  const restored=new CloudProfile({storage});restored.identity=profile.identity;await restored.load();
  assert.equal(restored.slots[0].snapshot.coins,0);assert.deepEqual(restored.slots[0].snapshot.look,game.look);
  assert.equal(restored.slots[0].snapshot.cosmetics.equipped.fullbody,NEW_COSTUME_IDS[i+2]+'.fullbody');
  assert(decodeSave(JSON.stringify(restored.slots[0].snapshot)));
 }
 assert.notEqual(profiles[0].identity,profiles[1].identity);assert.equal(values.get(PROFILE_KEY),'ordinary profile sentinel');
});
