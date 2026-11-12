import {migratePowerSnapshot} from '../../royale-v3-staging/power-policy.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CHARACTER_TEST_CODE,CHARACTER_TEST_URL,LEGACY_CHARACTER_TEST_PREFIX,LEGACY_CHARACTER_TEST_DATABASE,isCharacterTestCode,clearLegacyCharacterTest} from '../../royale-v3-staging/character-test/reset.mjs';

function memory(entries=[]){
 const values=new Map(entries);
 return {values,get length(){return values.size;},key:index=>[...values.keys()][index]??null,
  getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
}
function database(outcome='success'){
 const requested=[];
 return {requested,deleteDatabase(name){
  requested.push(name);const request={};
  queueMicrotask(()=>request['on'+outcome]?.());return request;
 }};
}
const legacy=LEGACY_CHARACTER_TEST_PREFIX;

test('the reserved code accepts exactly ten zeroes without treating ordinary codes as tests',()=>{
 assert.equal(CHARACTER_TEST_CODE,'0000000000');
 for(const value of ['0000000000',' 0000000000 '])assert.equal(isCharacterTestCode(value),true);
 for(const value of ['0000000001','00000000000','000000000','1234567890',0,null,undefined])assert.equal(isCharacterTestCode(value),false);
});

test('cleanup removes every old test key while preserving real accounts, other tests and the new character',async()=>{
 const retained=[
  ['royale-v3-play:healthia.royale.profiles.v2','cloud profile'],
  ['healthia.royale.profiles.v2','ordinary local profile'],
  ['royale-v2-prototype-0000000001:healthia.royale.profiles.v2','another test'],
  ['royale-v2-prototype-0000000000-other:profile','similar prefix'],
  ['royale-character-test-v1:name','fresh character']
 ];
 const localStorage=memory([...retained,[legacy+'healthia.royale.profiles.v2','old hero'],[legacy+'backup:1','old backup'],[legacy+'controls','old controls']]);
 const sessionStorage=memory([['other-session','keep'],[legacy+'journal','old journal']]);
 const indexedDB=database();const result=clearLegacyCharacterTest({localStorage,sessionStorage,indexedDB});
 assert.equal(result.removedKeys,4);assert.deepEqual(result.storageErrors,[]);
 assert.deepEqual([...localStorage.values],retained);
 assert.deepEqual([...sessionStorage.values],[['other-session','keep']]);
 assert.equal(await result.database,'deleted');
 assert.deepEqual(indexedDB.requested,[LEGACY_CHARACTER_TEST_DATABASE]);
 assert.equal(clearLegacyCharacterTest({localStorage,sessionStorage}).removedKeys,0);
});

test('an old open tab cannot block the fresh page while its precise old database waits for deletion',async()=>{
 const scope={localStorage:memory([[legacy+'profile','old']]),indexedDB:database('blocked')};
 const result=clearLegacyCharacterTest(scope);
 assert.equal(scope.localStorage.length,0);
 assert.equal(await result.database,'blocked');
 assert.deepEqual(scope.indexedDB.requested,['royale-v2-prototype-0000000000:permanent']);
});

test('unavailable or denied browser storage does not prevent the new character page opening',async()=>{
 const scope={sessionStorage:memory([[legacy+'profile','old']]),get localStorage(){throw Error('Access denied');},get indexedDB(){throw Error('Access denied');}};
 const result=clearLegacyCharacterTest(scope);
 assert.equal(result.removedKeys,1);assert.deepEqual(result.storageErrors,['localStorage']);assert.equal(await result.database,'error');
 assert.equal(await clearLegacyCharacterTest({}).database,'unavailable');
 assert.equal(await clearLegacyCharacterTest({indexedDB:database('error')}).database,'error');
});

const parentSource=await readFile(new URL('../../royale-v3-staging/app.mjs',import.meta.url),'utf8');
const resetURL=new URL('../../royale-v3-staging/character-test/reset.mjs',import.meta.url).href;
const storeURL=new URL('../saves.mjs',import.meta.url).href;
const tick=()=>new Promise(resolve=>setTimeout(resolve,10));
async function until(predicate){
 const deadline=Date.now()+3000;
 while(!predicate()){if(Date.now()>deadline)assert.fail('Parent action did not complete');await tick();}
}

// Run the actual parent entry module with a minimal DOM and a recording API.
// Relative imports are rebased because this fixture uses a fresh data URL.
async function parentFixture(run,{forbidGameImports=false}={}){
 const globals=['document','window','location','localStorage','sessionStorage','indexedDB','fetch','setInterval','console'];
 const previous=new Map(globals.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const nodes=new Map(),listeners=[],intervals=[],requests=[],messages=[],note={hidden:false};
 const get=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,textContent:'',value:'',src:'',querySelector:()=>note,contentWindow:{postMessage:data=>messages.push(data)}});return nodes.get(id);};
 const localStorage=memory([[legacy+'profile','old test'],['healthia.royale.profiles.v2','real local hero']]);
 const sessionStorage=memory([[legacy+'journal','old test journal']]);const indexedDB=database();
 const fixtures={
  document:{getElementById:get},window:{addEventListener:(type,handler)=>{if(type==='message')listeners.push(handler);}},
  location:{origin:'https://fufbla.github.io'},localStorage,sessionStorage,indexedDB,
  setInterval:handler=>{intervals.push(handler);return intervals.length;},console:{info(){},error(){}},
  fetch:async(_url,options)=>{
   const body=JSON.parse(options.body);requests.push({body,authorization:options.headers.Authorization});
   const result=body.action==='verify'||body.action==='renew'?{access:'fixture-access',refresh:'fixture-refresh'}:
    body.action==='slots'?{slots:[1,2,3].map(slot_number=>({slot_number,revision:0,snapshot:null}))}:
    body.action==='save'?{revision:body.revision+1}:{};
   return {ok:true,json:async()=>result};
  }
 };
 for(const [key,value] of Object.entries(fixtures))Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
 try{
  const dependency=forbidGameImports?'data:text/javascript,throw new Error("Old game module loaded during fresh test")':storeURL;
  const source=parentSource.replace("from './character-test/reset.mjs'",'from '+JSON.stringify(resetURL))
   .replace("from './power-policy.mjs'",'from '+JSON.stringify(new URL('../../royale-v3-staging/power-policy.mjs',import.meta.url).href))
   .replace("import('../royale/saves.mjs')",'import('+JSON.stringify(dependency)+')');
  await import('data:text/javascript,'+encodeURIComponent(source+'\n// fixture '+Math.random()));
  const enter=async value=>{get('input').value=value;get('load').onclick();await until(()=>get('game-frame').src||get('status').textContent);await tick();};
  const message=async data=>{const event={origin:fixtures.location.origin,source:get('game-frame').contentWindow,data};await Promise.all(listeners.map(handler=>handler(event)));await tick();};
  await run({get,note,enter,message,localStorage,sessionStorage,indexedDB,requests,intervals,messages});
 }finally{
  for(const key of globals){const descriptor=previous.get(key);if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
 }
}

test('entering and reloading 000 opens the full-body staging adapter and preserves test saves without cloud requests',()=>parentFixture(async f=>{
 await f.enter('0000000000');
 assert.ok(f.get('game-frame').src.startsWith('./kingjames/index.html?v2TestCharacter=0000000000'));
 assert.equal(f.get('refresh').textContent,'Reload Character Test');assert.equal(f.note.hidden,true);
 assert.equal(f.localStorage.getItem(legacy+'profile'),'old test');assert.equal(f.sessionStorage.length,1);
 assert.equal(f.localStorage.getItem('healthia.royale.profiles.v2'),'real local hero');
 assert.deepEqual(f.requests,[]);
 f.localStorage.setItem(legacy+'old-tab-write','old test');f.get('refresh').onclick();await tick();
 assert.equal(f.localStorage.getItem(legacy+'old-tab-write'),'old test');
 for(const interval of f.intervals)interval();await tick();assert.deepEqual(f.requests,[]);
},{forbidGameImports:true}));

test('fresh preview messages cannot acquire a cloud session or write a player snapshot',()=>parentFixture(async f=>{
 await f.enter('0000000000');
 const snapshot={world:{location:{x:10,y:20}},cosmetics:{revision:1},coins:0};
 await f.message({type:'royale-clothing-session-check',slot:0});
 await f.message({type:'royale-code-progress',slot:0,snapshot});
 await f.message({type:'royale-clothing-save',slot:0,requestId:'clothes',snapshot});
 await f.message({type:'royale-travel-save',slot:0,requestId:'travel',snapshot});
 assert.deepEqual(f.requests,[]);
 assert.equal(f.messages.find(message=>message.type==='royale-clothing-session-status').verified,false);
 assert.equal(f.messages.find(message=>message.type==='royale-clothing-saved').result.ok,false);
 assert.equal(f.messages.find(message=>message.type==='royale-travel-saved').result.ok,false);
},{forbidGameImports:true}));

test('ordinary codes retain authenticated cloud loading and saves; switching to 000 drops those credentials',()=>parentFixture(async f=>{
 await f.enter('1234567890');
 assert.deepEqual(f.requests.map(request=>request.body.action),['verify','slots']);
 assert.equal(f.requests[0].authorization,undefined);assert.equal(f.requests[1].authorization,'Bearer fixture-access');
 assert.match(f.get('game-frame').src,/\.\/gameplay\/\?codePlay=v3/);assert.equal(f.note.hidden,false);
 assert.equal(f.localStorage.getItem(legacy+'profile'),'old test','Ordinary login does not clear the isolated test');
 const snapshot={world:{region:1,location:{x:120,y:600}},look:{name:'Cloud Hero'},coins:12,level:1,xp:0};
 await f.message({type:'royale-code-progress',slot:0,snapshot});
 assert.equal(f.requests.at(-1).body.action,'save');assert.equal(f.requests.at(-1).authorization,'Bearer fixture-access');
 assert.deepEqual(f.requests.at(-1).body.snapshot,migratePowerSnapshot(snapshot));
 const count=f.requests.length;
 const queued=f.message({type:'royale-code-progress',slot:0,snapshot:{...snapshot,coins:13}});
 await f.enter('0000000000');await queued;
 await f.message({type:'royale-code-progress',slot:0,snapshot});
 for(const interval of f.intervals)interval();await tick();
 assert.equal(f.requests.length,count,'Test mode cannot save or renew the previous real session');
 assert.equal(f.note.hidden,true);assert.equal(f.localStorage.getItem(legacy+'profile'),'old test');
 assert.ok(f.localStorage.getItem('royale-v3-play:healthia.royale.profiles.v2'));
 assert.equal(JSON.parse(f.localStorage.getItem('royale-v3-play:journal:0')).snapshot.coins,13,'A prior queued real save keeps its recovery journal');
}));
