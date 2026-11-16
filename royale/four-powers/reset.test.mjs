import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {Game,decodeSave} from '../core.mjs';
import {POWER_IDS,normalizePowers} from '../powers.mjs';
import {LocalHeroStore} from '../saves.mjs';
import {InstantPowerUpgrades} from '../power-upgrades.mjs';
import {appendPowerPreview} from './preview.mjs';
import {skillResetPreview,applySkillReset} from '../skill-reset.mjs';
import {CloudProfile} from '../local-coop/cloud.mjs';
import {preparePowerReset,isPowerReset} from '../../royale-v3-staging/power-reset.mjs';
import {guardPowerSave} from '../../royale-v3-staging/power-policy.mjs';
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k),map};};
function game(){const g=new Game();g.hero.level=30;g.hero.coins=1500;g.powers.data=normalizePowers({levels:Object.fromEntries(POWER_IDS.map(id=>[id,id==='animalAllies'?15:id==='strength'?10:0])),equipped:['strength','animalAllies',null]},30);g.treeVisit=true;g.paused=true;g.started=true;g.combatTimer=0;return g;}
const snapshot=()=>JSON.parse(game().save());
function local(){const g=game(),storage=memory(),store=new LocalHeroStore(storage);assert.ok(store.writeSlot(0,g.save()).ok);const heroId=store.slot(0).id,transaction=new InstantPowerUpgrades(()=>({game:g,store,index:0,heroId}));return {g,storage,store,transaction,heroId};}
test('Paid reset returns every invested point, clears four slots and preserves all other progress',()=>{
 const before=snapshot(),original=structuredClone(before),result=preparePowerReset(before),next=result.snapshot;
 assert.equal(result.refunded,25);assert.equal(result.points,29);assert.equal(next.coins,500);assert.equal(next.economy.coinsSpent,before.economy.coinsSpent+1000);assert.equal(next.economy.revision,before.economy.revision+1);
 assert.ok(POWER_IDS.every(id=>next.powers.levels[id]===0));assert.deepEqual(next.powers.equipped,[null,null,null,null]);assert.equal(next.powers.resetRevision,1);assert.ok(isPowerReset(before,next));assert.ok(decodeSave(JSON.stringify(next)));
 for(const key of Object.keys(before).filter(k=>!['coins','economy','powers'].includes(k)))assert.deepEqual(next[key],before[key],key);
 assert.deepEqual(before,original);for(const id of POWER_IDS.filter(id=>id!=='speed'))assert.equal(next.powers.recovery[id],before.powers.recovery[id]);
});
test('Reset rejects insufficient coins and empty skills without changing the hero',()=>{
 const raw=snapshot();raw.coins=999;const before=structuredClone(raw);assert.throws(()=>preparePowerReset(raw),/1,000 coins/);assert.deepEqual(raw,before);
 const empty=preparePowerReset(snapshot()).snapshot;empty.coins=2000;assert.throws(()=>preparePowerReset(empty),/No spent/);
});
test('Unconfirmed reset is free; confirmed reset survives reload and supports new upgrades',async()=>{
 const {g,storage,store,transaction}=local(),before=g.save();assert.equal((await transaction.reset()).ok,false);assert.equal(g.save(),before);
 const result=await transaction.reset({confirmed:true});assert.ok(result.ok,result.error);assert.equal(g.hero.coins,500);assert.equal(g.powers.data.points,29);
 const loaded=new LocalHeroStore(storage);assert.equal(loaded.slot(0).snapshot.coins,500);assert.equal(loaded.slot(0).snapshot.powers.resetRevision,1);
 assert.ok((await transaction.spend('seismicSmash')).ok);assert.equal(g.powers.data.points,28);assert.equal(store.slot(0).snapshot.powers.levels.seismicSmash,1);
 assert.equal((await transaction.reset({confirmed:true})).ok,false);assert.equal(g.hero.coins,500);
});
test('Failed durable reset write never deducts runtime coins or refunds runtime skills',async()=>{
 const {g,storage,transaction}=local(),before=g.save(),write=storage.setItem;storage.setItem=(k,v)=>{if(JSON.parse(v).slots?.some(s=>s?.snapshot?.powers?.resetRevision===1))throw Error('Disk full');write(k,v);};
 const result=await transaction.reset({confirmed:true});assert.equal(result.ok,false);assert.equal(g.save(),before);
});
test('Reset requires safe Tree of Eris; cooldown debt survives the reset',()=>{
 const g=game();g.treeVisit=false;g.hero.x=1000;assert.equal(skillResetPreview(g).ok,false);g.treeVisit=true;g.hero.dead=true;assert.equal(skillResetPreview(g).ok,false);g.hero.dead=false;
 g.powers.cooldowns.animalAllies=4;const result=skillResetPreview(g);assert.ok(result.ok);applySkillReset(g,result.snapshot);assert.equal(g.powers.cooldowns.animalAllies,4);
});
test('Normal saves cannot manufacture a reset or resurrect a pre-reset build',()=>{
 const before=snapshot(),after=preparePowerReset(before).snapshot;
 assert.throws(()=>guardPowerSave(before,after),/reset changed/);assert.throws(()=>guardPowerSave(after,before),/reset changed/);
 const fake=structuredClone(after);fake.coins=before.coins;assert.equal(isPowerReset(before,fake),false);
 const storage=memory(),store=new LocalHeroStore(storage);assert.ok(store.writeSlot(0,before).ok);assert.equal(store.writeSlot(0,after).ok,false);assert.ok(store.writeSlot(0,after,{allowPowerReset:true}).ok);assert.equal(store.writeSlot(0,before).ok,false);
 const current=structuredClone(after);current.powers.levels.animalAllies=1;assert.equal(guardPowerSave(after,current).powers.levels.animalAllies,1);
});

const require=createRequire(import.meta.url),esbuild=require('../../tools/release-build/node_modules/esbuild');
const built=await esbuild.build({entryPoints:['royale/four-powers/backend-v3/deploy/cloud/backend-v3/index.ts'],bundle:true,write:false,platform:'node',format:'iife',plugins:[{name:'mock-db',setup(b){b.onResolve({filter:/^https:/},()=>({path:'db',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const createClient=()=>__db;'}));}}]});
function backend(initial=snapshot()){
 const row={snapshot:structuredClone(initial),revision:7},other={snapshot:structuredClone(initial),revision:7};let handler,writes=0,lose=false;
 const db={rpc:async()=>({data:true}),from(table){const filters={};let update;
  const q={select(){return q;},eq(k,v){filters[k]=v;return q;},gt(){return q;},update(value){update=value;return q;},async maybeSingle(){
   if(table==='royale_v3_sessions')return {data:filters.token_hash===null?null:{profile_id:'owner'}};
   assert.equal(table,'royale_v3_hero_slots');assert.equal(filters.profile_id,'owner');assert.equal(filters.slot_number,1);
   if(!update)return {data:structuredClone(row)};
   if(filters.revision!==row.revision)return {data:null};Object.assign(row,structuredClone(update));writes++;return {data:{revision:row.revision,updated_at:row.updated_at}};
  }};return q;
 }};
 new Function('Deno','__db',built.outputFiles[0].text)({env:{get:()=>''},serve:fn=>handler=fn},db);
 async function request(body,{auth=true,origin='https://fufbla.github.io'}={}){return handler(new Request('https://example.com/reset',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+'a'.repeat(64)}:{})},body:JSON.stringify(body)}));}
 const fetcher=async(_url,options)=>{const response=await request(JSON.parse(options.body));if(lose&&response.ok){lose=false;throw Error('Acknowledgement lost');}return response;};
 return {row,other,request,fetcher,writes:()=>writes,lose:()=>lose=true};
}
test('Actual backend requires authentication, approved origin and explicit reset confirmation',async()=>{
 const b=backend(),body={action:'reset-powers',slot:1,revision:7,snapshot:snapshot(),confirmed:true};
 assert.equal((await b.request(body,{auth:false})).status,401);assert.equal((await b.request(body,{origin:'https://invalid.example'})).status,403);assert.equal((await b.request({...body,confirmed:false})).status,400);assert.equal(b.writes(),0);
});
test('Actual backend commits fee and refund once with revision fencing and retains other accounts',async()=>{
 const b=backend(),other=structuredClone(b.other),body={action:'reset-powers',slot:1,revision:7,snapshot:snapshot(),confirmed:true};
 const responses=await Promise.all([b.request(body),b.request(body)]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);assert.equal(b.writes(),1);assert.equal(b.row.snapshot.coins,500);assert.equal(b.row.snapshot.powers.points,29);assert.equal(b.row.snapshot.powers.resetRevision,1);assert.deepEqual(b.other,other);
 assert.equal((await b.request({action:'save',slot:1,revision:8,snapshot:body.snapshot})).status,409);
 const next=structuredClone(b.row.snapshot);next.powers.levels.seismicSmash=1;assert.equal((await b.request({action:'save',slot:1,revision:8,snapshot:next})).status,200);assert.equal(b.row.snapshot.powers.levels.seismicSmash,1);
});
test('Actual backend refuses a fee without funds or skills and rejects forged ordinary resets',async()=>{
 for(const variant of ['funds','empty','forged']){let raw=snapshot();if(variant==='funds')raw.coins=999;if(variant==='empty'){raw=preparePowerReset(raw).snapshot;raw.coins=1500;}const b=backend(raw),before=structuredClone(b.row);const response=await b.request({action:variant==='forged'?'save':'reset-powers',slot:1,revision:7,snapshot:variant==='forged'?preparePowerReset(raw).snapshot:raw,confirmed:true});assert.equal(response.status,409);assert.deepEqual(b.row,before);}
});
test('Co-op cloud reset uses its own account, drains saves and blocks retry after lost acknowledgement',async()=>{
 const a=backend(),b=backend(),make=(service,id)=>{const p=new CloudProfile({fetcher:service.fetcher,storage:memory()});p.identity=id;p.access='a'.repeat(64);p.slots=[{slot_number:1,...structuredClone(service.row)}];return p;};
 const first=make(a,'first'),second=make(b,'second');let release;first.queues.set(1,new Promise(r=>release=r));const pending=first.resetPowers(1,snapshot());assert.equal(first.mutating.has(1),true);assert.equal(a.writes(),0);release();const result=await pending;assert.ok(result.ok);assert.equal(first.slots[0].snapshot.coins,500);assert.equal(second.slots[0].snapshot.coins,1500);assert.equal(b.writes(),0);
 b.lose();await assert.rejects(second.resetPowers(1,snapshot()),/Reload/);assert.equal(b.writes(),1);await assert.rejects(second.resetPowers(1,snapshot()),/Reload/);assert.equal(b.writes(),1);assert.ok(second.blocked.has(1));
});
test('Deploy source uses exactly the client power ledger and reset calculator',()=>{for(const name of ['power-policy.mjs','power-reset.mjs'])assert.equal(fs.readFileSync('royale/four-powers/backend-v3/deploy/'+name,'utf8'),fs.readFileSync('royale-v3-staging/'+name,'utf8'));});

test('Every approved production skill preview attaches without sandbox dependencies',t=>{const children=[];const oldDoc=globalThis.document,oldRAF=globalThis.requestAnimationFrame;globalThis.document={createElement:tag=>({tag,setAttribute(){}})};globalThis.requestAnimationFrame=()=>1;t.after(()=>{globalThis.document=oldDoc;globalThis.requestAnimationFrame=oldRAF;});for(const id of POWER_IDS)appendPowerPreview({append:node=>children.push(node)},id,game());assert.equal(children.length,4);assert.ok(children.every(n=>n.tag==='canvas'));});
