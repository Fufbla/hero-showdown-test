import test from 'node:test';
import assert from 'node:assert/strict';
import {LocalHeroStore,PROFILE_KEY} from '../../royale/saves.mjs';
import {createTestSnapshot} from './review.mjs';
import {applyPuppyTestCoins,PUPPY_TEST_PREFIX,PUPPY_TEST_BALANCE} from './coin-grant.mjs';

function fixture(){
 const values=new Map([['healthia.royale.profiles.v2','live profile sentinel']]);
 let fail=false,id=0;
 const storage={getItem:key=>values.get(PUPPY_TEST_PREFIX+key)??null,setItem:(key,value)=>{if(fail)throw Error('disk full');values.set(PUPPY_TEST_PREFIX+key,value);}};
 const open=()=>new LocalHeroStore(storage,{now:()=> '2026-11-20T00:00:00.000Z',id:()=>`puppy-test-${++id}`});
 const store=open(),snapshot=createTestSnapshot();snapshot.coins=1234;
 assert.equal(store.writeSlot(0,snapshot,{expectedId:null,requireDurable:true}).ok,true);
 return {values,storage,store,open,setFailure:value=>fail=value,key:PUPPY_TEST_PREFIX+PROFILE_KEY};
}
const grant=store=>applyPuppyTestCoins(store,{storagePrefix:PUPPY_TEST_PREFIX});

test('the approved balance is exactly 10,000 and only coins change in the saved hero',()=>{
 const f=fixture(),before=f.store.slot(0),rawBefore=f.values.get(f.key),result=grant(f.store);
 assert.equal(result.ok,true);assert.equal(result.granted,true);assert.equal(result.coins,10000);
 const after=f.store.slot(0);assert.deepEqual(after,{...before,snapshot:{...before.snapshot,coins:PUPPY_TEST_BALANCE}});
 assert.notEqual(f.values.get(f.key),rawBefore);
 assert.equal(f.values.get(PROFILE_KEY),'live profile sentinel');
 assert.deepEqual(f.store.data.puppyCoinGrant,{version:1,targetBalance:10000,heroId:before.id});
});

test('purchasing or spending coins and reloading never refills the test wallet',()=>{
 const f=fixture();assert.equal(grant(f.store).ok,true);
 const hero=f.store.slot(0),spent={...hero.snapshot,coins:9300};
 assert.equal(f.store.writeSlot(0,spent,{expectedId:hero.id,requireDurable:true}).ok,true);
 const raw=f.values.get(f.key),reloaded=f.open();
 assert.equal(reloaded.slot(0).snapshot.coins,9300);assert.equal(grant(reloaded).granted,false);
 assert.equal(reloaded.slot(0).snapshot.coins,9300);assert.equal(f.values.get(f.key),raw);
 const again=f.open();assert.equal(grant(again).granted,false);assert.equal(again.slot(0).snapshot.coins,9300);
});

test('only the selected test hero receives the balance; other slots and selections remain intact',()=>{
 const f=fixture(),second=createTestSnapshot(1);second.coins=987;
 assert.equal(f.store.writeSlot(1,second,{expectedId:null,requireDurable:true}).ok,true);
 const first=f.store.slot(0),active=f.store.slot(1),selection=f.store.data.activeSlot;
 const result=grant(f.store);assert.equal(result.index,1);assert.equal(f.store.slot(1).snapshot.coins,10000);
 assert.deepEqual(f.store.slot(0),first);assert.equal(f.store.slot(1).id,active.id);assert.equal(f.store.data.activeSlot,selection);
 assert.deepEqual(f.store.slot(1).snapshot.cosmetics,active.snapshot.cosmetics);
});

test('a failed durable write changes neither wallet nor receipt and can be retried after reload',()=>{
 const f=fixture(),before=structuredClone(f.store.data),raw=f.values.get(f.key);
 f.setFailure(true);const result=grant(f.store);assert.equal(result.ok,false);
 assert.deepEqual(f.store.data,before);assert.equal(f.values.get(f.key),raw);assert.equal(Object.hasOwn(f.store.data,'puppyCoinGrant'),false);
 f.setFailure(false);const reloaded=f.open();assert.equal(grant(reloaded).granted,true);assert.equal(reloaded.slot(0).snapshot.coins,10000);
});

test('a stale tab cannot overwrite a newer test save or duplicate an already committed grant',()=>{
 const f=fixture(),stale=f.open();assert.equal(grant(f.store).granted,true);
 const raw=f.values.get(f.key);assert.equal(grant(stale).ok,false);assert.equal(f.values.get(f.key),raw);
 const reloaded=f.open();assert.equal(grant(reloaded).granted,false);assert.equal(reloaded.slot(0).snapshot.coins,10000);
});

test('normal profiles, cloud profiles, empty stores and invalid receipts are never written',()=>{
 const f=fixture(),raw=f.values.get(f.key);
 for(const storagePrefix of ['',undefined,'royale-v3-play:',PUPPY_TEST_PREFIX+'extra'])assert.equal(applyPuppyTestCoins(f.store,{storagePrefix}).ok,false);
 f.store.cloud=true;assert.equal(grant(f.store).ok,false);delete f.store.cloud;
 assert.equal(f.values.get(f.key),raw);
 f.store.data.puppyCoinGrant={version:999,targetBalance:10000,heroId:f.store.slot(0).id};assert.equal(grant(f.store).ok,false);assert.equal(f.values.get(f.key),raw);
 const empty=new LocalHeroStore({getItem:()=>null,setItem:()=>{throw Error('must not write');}});assert.equal(grant(empty).ok,false);
});
