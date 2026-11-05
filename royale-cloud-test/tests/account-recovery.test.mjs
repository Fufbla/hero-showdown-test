import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,SAVE_KEY} from '../core.mjs';
import {LocalHeroStore,PROFILE_KEY,BACKUP_KEY} from '../saves.mjs';
import {inspectLocalHeroes,exportLocalRecovery,recoveryImportCandidate} from '../save-recovery.mjs';
import {CloudHeroStore} from '../cloud-client.mjs';
const fresh=()=>JSON.parse(new Game().save());
const storage=()=>{const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};};
const row=(slot=0)=>({slot,hero_id:crypto.randomUUID(),revision:1,snapshot:fresh(),deleted:false});
test('recovery reads healthy siblings of a damaged slot without changing any source',()=>{
 const s=storage(),store=new LocalHeroStore(s);store.writeSlot(0,fresh());store.writeSlot(1,fresh());const raw=JSON.parse(s.getItem(PROFILE_KEY));raw.slots[1].snapshot.powers=null;s.setItem(PROFILE_KEY,JSON.stringify(raw));const before=[...s.map];
 const result=inspectLocalHeroes(s);assert.ok(result.heroes.some(h=>h.key===PROFILE_KEY&&h.slot===0));assert.ok(result.issues.some(h=>h.key===PROFILE_KEY&&h.slot===1));assert.deepEqual([...s.map],before);assert.equal(new LocalHeroStore(s).writable,false);
});
test('recovery exports exact known sources, including damaged JSON, excluding auth sessions',()=>{
 const s=storage();s.setItem(PROFILE_KEY,'{damaged');s.setItem(SAVE_KEY,JSON.stringify({version:1,level:3,coins:12}));s.setItem('healthia.royale.auth.v1','SECRET');const out=exportLocalRecovery(s);assert.equal(out.includes('SECRET'),false);assert.equal(JSON.parse(out).sources[0].raw,'{damaged');assert.equal(inspectLocalHeroes(s).heroes[0].snapshot.level,3);
});
test('successful local updates retain a readable previous envelope',()=>{
 const s=storage(),store=new LocalHeroStore(s);store.writeSlot(0,fresh());const previous=s.getItem(PROFILE_KEY),next=fresh();next.coins=21;assert.ok(store.writeSlot(0,next).ok);assert.equal(s.getItem(BACKUP_KEY),previous);assert.equal(inspectLocalHeroes(s).heroes.find(h=>h.key===BACKUP_KEY).snapshot.coins,0);
});
test('failed backup storage never overwrites the primary save',()=>{
 const s=storage(),store=new LocalHeroStore(s);store.writeSlot(0,fresh());const previous=s.getItem(PROFILE_KEY);s.setItem=(k,v)=>{if(k===BACKUP_KEY)throw Error('quota');s.map.set(k,v);};assert.equal(store.writeSlot(0,fresh(),{requireDurable:true}).ok,false);assert.equal(s.getItem(PROFILE_KEY),previous);
});
test('legacy imports have stable IDs and do not mutate their recovered source',async()=>{
 const s=storage();s.setItem(SAVE_KEY,JSON.stringify({version:1,level:2}));const hero=inspectLocalHeroes(s).heroes[0],a=await recoveryImportCandidate(hero),b=await recoveryImportCandidate(hero);assert.equal(a.id,b.id);a.snapshot.coins=999;assert.equal(hero.snapshot.coins,0);
});
test('unavailable storage is reported instead of inventing replacement heroes',()=>{
 const result=inspectLocalHeroes({getItem(){throw Error('denied');}});assert.equal(result.heroes.length,0);assert.equal(result.issues.length,3);
});
for(const kind of ['damaged','duplicate','bad-slot','wrong-account','unavailable'])test(`cloud roster remains intact after ${kind} response`,async()=>{
 let response={user:{id:'owner'},slots:[row()]};const api={pending:null,call:async()=>{if(response instanceof Error)throw response;return response;}};
 const store=new CloudHeroStore(api);await store.refresh();const before=structuredClone(store.data),meta=structuredClone(store.meta);api.pending={requestId:'uncertain'};
 if(kind==='damaged')response={user:{id:'owner'},slots:[row(),{...row(1),snapshot:{version:8}}]};
 if(kind==='duplicate')response={user:{id:'owner'},slots:[row(),row()]};
 if(kind==='bad-slot')response={user:{id:'owner'},slots:[row(3)]};
 if(kind==='wrong-account')response={user:{id:'other'},slots:[]};
 if(kind==='unavailable')response=Error('offline');
 await assert.rejects(()=>store.refresh());assert.deepEqual(store.data,before);assert.deepEqual(store.meta,meta);assert.equal(store.user.id,'owner');assert.equal(api.pending.requestId,'uncertain');
});
