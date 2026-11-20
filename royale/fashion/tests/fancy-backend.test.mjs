// Exercise the exact deployable cloud handler with a revision-aware memory
// database. These checks never create, read or change a remote account.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {Game,decodeSave} from '../../core.mjs';
import {catalogIndex,cosmeticTransaction} from '../../cosmetics/state.mjs';
import {COLLECTION} from '../catalog.mjs';
import {migratePowerSnapshot} from '../../four-powers/backend-v3/deploy/power-policy.mjs';

const deploy=process.env.FANCY_BACKEND_SOURCE_DIR?.replace(/\/?$/,'/')||'royale/four-powers/backend-v3/deploy/';
const id='golden-puppy-costume',piece=id+'.fullbody';
const index=catalogIndex({sets:COLLECTION});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const clone=value=>structuredClone(value);
const snapshot=game=>JSON.parse(game.save());
function transact(game,type,costume=id){
 const result=cosmeticTransaction({state:game.cosmetics,look:game.look,coins:game.hero.coins,index,
  operation:{type,id:costume,revision:game.cosmetics.revision,confirmed:true},safe:true,atWardrobe:true});
 assert.ok(result.ok,result.error);game.cosmetics=result.state;game.hero.coins=result.coins;return result;
}
function hero(presentation='male'){
 const game=new Game({look:{presentation}});game.hero.coins=1500;
 transact(game,'purchase','robot-costume');
 return game;
}

const require=createRequire(import.meta.url),esbuild=require('../../../tools/release-build/node_modules/esbuild');
const built=await esbuild.build({entryPoints:[deploy+'cloud/backend-v3/index.ts'],bundle:true,write:false,
 platform:'node',format:'iife',plugins:[{name:'memory-cloud',setup(build){
  build.onResolve({filter:/^https:/},()=>({path:'database',namespace:'mock'}));
  build.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const createClient=()=>__db;'}));
 }}]});
function backend(initial){
 const row={snapshot:clone(initial),revision:7},other={snapshot:clone(initial),revision:7};
 let handler,writes=0;
 const db={rpc:async()=>({data:true}),from(table){
  const filters={};let update;
  const query={select(){return query;},eq(key,value){filters[key]=value;return query;},gt(){return query;},
   update(value){update=value;return query;},
   async order(){
    assert.equal(table,'royale_v3_hero_slots');assert.equal(filters.profile_id,'fixture-owner');
    return {data:[{slot_number:1,...clone(row)}]};
   },
   async maybeSingle(){
    if(table==='royale_v3_sessions')return {data:{profile_id:'fixture-owner'}};
    assert.equal(table,'royale_v3_hero_slots');assert.equal(filters.profile_id,'fixture-owner');assert.equal(filters.slot_number,1);
    if(!update)return {data:clone(row)};
    if(filters.revision!==row.revision)return {data:null};
    Object.assign(row,clone(update));writes++;return {data:{revision:row.revision,updated_at:row.updated_at}};
   }};
  return query;
 }};
 new Function('Deno','__db',built.outputFiles[0].text)({env:{get:()=>''},serve:fn=>handler=fn},db);
 async function request(body,{auth=true,origin='https://fufbla.github.io'}={}){
  return handler(new Request('https://example.test/fancy-costume',{method:'POST',
   headers:{Origin:origin,'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+'a'.repeat(64)}:{})},
   body:JSON.stringify(body)}));
 }
 return {row,other,request,writes:()=>writes};
}

test('Fancy Costume cloud package changes only two policy files from live version 17',()=>{
 const manifest=JSON.parse(fs.readFileSync('royale/four-powers/backend-v3/package.json','utf8'));
 assert.equal(manifest.projectId,'adakwbhxiuatjvphutgo');assert.equal(manifest.functionName,'royale-v3-staging');
 assert.equal(manifest.baselineVersion,17);assert.equal(manifest.verifyJWT,false);assert.equal(manifest.databaseMigration,false);
 assert.deepEqual([...manifest.changedFiles].sort(),['fashion/definitions.mjs','fashion/extend-policy.mjs']);
 assert.equal(Object.keys(manifest.files).length,14);assert.deepEqual(Object.keys(manifest.files).sort(),Object.keys(manifest.baselineFiles).sort());
 for(const [name,digest]of Object.entries(manifest.files)){
  const source=fs.readFileSync(deploy+name);assert.equal(hash(source),digest,name);
  assert.equal(digest!==manifest.baselineFiles[name],manifest.changedFiles.includes(name),name);
  assert.doesNotMatch(source.toString(),/puppyCoinGrant|applyPuppyTestCoins|royale-four-powers-0000000000-v1:/,name);
 }
 for(const name of manifest.changedFiles)assert.deepEqual(fs.readFileSync(deploy+name),fs.readFileSync('royale/'+name),name);
});

test('Actual cloud handler saves a 700-coin Fancy Costume purchase, equip and reload for both presentations',async()=>{
 for(const presentation of ['male','female']){
  // Existing cloud saves already use this unchanged power normalization.
  const game=hero(presentation),before=migratePowerSnapshot(snapshot(game)),service=backend(before),other=clone(service.other);
  assert.equal(index.get(id).name,'Fancy Costume');assert.equal(transact(game,'purchase').debit,700);
  const purchased=snapshot(game),purchase=await service.request({action:'save',slot:1,revision:7,snapshot:purchased});
  assert.equal(purchase.status,200,JSON.stringify(await purchase.json()));
  assert.equal(service.row.snapshot.coins,800);assert.ok(service.row.snapshot.cosmetics.owned.includes(piece));
  assert.ok(service.row.snapshot.cosmetics.owned.includes('robot-costume.fullbody'));
  assert.deepEqual(service.row.snapshot.cosmetics.equipped,{});
  assert.equal(transact(game,'equip').debit,0);
  const equip=await service.request({action:'save',slot:1,revision:8,snapshot:snapshot(game)});
  assert.equal(equip.status,200,JSON.stringify(await equip.json()));
  const reload=await service.request({action:'slots'});assert.equal(reload.status,200);
  const loaded=(await reload.json()).slots[0];
  assert.equal(loaded.revision,9);assert.equal(loaded.snapshot.coins,800);
  assert.deepEqual(loaded.snapshot.cosmetics.equipped,{fullbody:piece});
  assert.ok(decodeSave(JSON.stringify(loaded.snapshot)));
  for(const key of Object.keys(before).filter(key=>!['coins','cosmetics'].includes(key)))assert.deepEqual(loaded.snapshot[key],before[key],presentation+': '+key);
  assert.deepEqual(service.other,other);assert.equal(service.writes(),2);
 }
});

test('Fancy Costume saves retain authentication, origin, revision and paid-ownership protection',async()=>{
 const game=hero(),service=backend(snapshot(game));transact(game,'purchase');transact(game,'equip');
 const body={action:'save',slot:1,revision:7,snapshot:snapshot(game)};
 assert.equal((await service.request(body,{auth:false})).status,401);
 assert.equal((await service.request(body,{origin:'https://invalid.example'})).status,403);
 assert.equal(service.writes(),0);
 const responses=await Promise.all([service.request(body),service.request(body)]);
 assert.deepEqual(responses.map(response=>response.status).sort(),[200,409]);assert.equal(service.writes(),1);
 const current=clone(service.row);
 for(const variant of ['unknown','remove-owned','stale-wardrobe']){
  const invalid=clone(current.snapshot);invalid.cosmetics.revision++;
  if(variant==='unknown')invalid.cosmetics.owned.push('unregistered.fullbody');
  if(variant==='remove-owned'){invalid.cosmetics.owned=invalid.cosmetics.owned.filter(value=>value!==piece);invalid.cosmetics.equipped={};}
  if(variant==='stale-wardrobe')invalid.cosmetics.revision=0;
  assert.equal((await service.request({action:'save',slot:1,revision:8,snapshot:invalid})).status,409,variant);
  assert.deepEqual(service.row,current,variant);
 }
 assert.equal(service.writes(),1);
});
