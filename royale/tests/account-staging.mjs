// Opt-in real staging checks. Credentials live outside the repository.
// ROYALE_TEST_CREDENTIAL_FILE=/private/file.json node tests/account-staging.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {CLOUD_CONFIG as c} from '../cloud-config.mjs';
import {Game} from '../core.mjs';
if(!process.env.ROYALE_TEST_CREDENTIAL_FILE)throw Error('Provide an isolated staging test account credential file.');
const credentials=JSON.parse(await readFile(process.env.ROYALE_TEST_CREDENTIAL_FILE,'utf8'));
if(!credentials.email?.includes('+royale-test-'))throw Error('Use a disposable Royale test account, never a player account.');
const endpoint=c.url+'/functions/v1/royale-player-accounts-staging';let pass=0,fail=0;
async function check(name,fn){try{await fn();pass++;console.log('PASS '+name);}catch(e){fail++;console.log('FAIL '+name+': '+e.message);}}
async function login(){const r=await fetch(c.url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:c.publishableKey,'Content-Type':'application/json'},body:JSON.stringify(credentials)});const d=await r.json();assert.equal(r.status,200);return d.access_token;}
const a=await login(),b=await login();
async function call(body,token=a){const r=await fetch(endpoint,{method:'POST',headers:{apikey:c.publishableKey,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
const initial=await call({action:'list'});assert.equal(initial.status,200);assert.equal(initial.data.slots.filter(s=>!s.deleted).length,0,'Test requires empty slots. Do not overwrite saves.');
const rows=[];const snapshot=()=>JSON.parse(new Game().save());
await check('no-token access rejected',async()=>assert.equal((await call({action:'list'},null)).status,401));
await check('invalid session rejected',async()=>assert.equal((await call({action:'list'},'invalid')).status,401));
await check('public username registration remains closed',async()=>assert.equal((await call({action:'username-signup',username:'qa_closed_test',passcode:'Not a real player password!'},null)).status,503));
for(let slot=0;slot<3;slot++)await check('create cloud slot '+(slot+1),async()=>{
 const current=initial.data.slots.find(s=>s.slot===slot),result=await call({action:'commit',kind:'create',slot,heroId:current?.hero_id||null,expectedRevision:current?.revision||0,requestId:crypto.randomUUID(),snapshot:snapshot()});assert.equal(result.status,200,JSON.stringify(result.data));rows[slot]=result.data.slot;
});
assert.equal(rows.filter(Boolean).length,3,'Cannot continue without three test heroes');
await check('fourth slot rejected',async()=>assert.equal((await call({action:'commit',kind:'create',slot:3,heroId:null,expectedRevision:0,requestId:crypto.randomUUID(),snapshot:snapshot()})).status,400));
const next=structuredClone(rows[0].snapshot);Object.assign(next.world.location,{x:3450.25,y:500.5,hp:42.25,face:-1,vx:0,vy:0,jumps:1});
const write={action:'commit',kind:'manual',slot:0,heroId:rows[0].hero_id,expectedRevision:rows[0].revision,requestId:crypto.randomUUID(),snapshot:next};
await check('save exact position and current health',async()=>{const r=await call(write);assert.equal(r.status,200,JSON.stringify(r.data));rows[0]=r.data.slot;});
await check('independent session loads identical hero',async()=>{const r=await call({action:'list'},b);assert.equal(r.status,200);assert.deepEqual(r.data.slots.find(s=>s.slot===0).snapshot.world.location,next.world.location);});
await check('retry does not duplicate save revision',async()=>{const r=await call(write);assert.equal(r.status,200);assert.equal(r.data.slot.revision,rows[0].revision);});
await check('stale session cannot overwrite progress',async()=>assert.equal((await call({...write,requestId:crypto.randomUUID()},b)).status,409));
await check('request identifier cannot be reused for changed payload',async()=>assert.equal((await call({...write,snapshot:snapshot()})).status,409));
await check('occupied cloud slot cannot be imported over',async()=>assert.equal((await call({action:'commit',kind:'import',slot:1,heroId:rows[1].hero_id,expectedRevision:rows[1].revision,requestId:crypto.randomUUID(),snapshot:snapshot(),sourceId:'qa-local-source-'+crypto.randomUUID(),confirmed:true})).status,409));
await check('anonymous direct database read denied',async()=>{const r=await fetch(c.url+'/rest/v1/royale8_heroes?select=slot',{headers:{apikey:c.publishableKey}});assert.ok([401,403].includes(r.status));});
await check('authenticated direct database read denied',async()=>{const r=await fetch(c.url+'/rest/v1/royale8_heroes?select=slot',{headers:{apikey:c.publishableKey,Authorization:'Bearer '+a}});assert.ok([401,403].includes(r.status));});
for(const row of rows)await check('remove disposable test slot '+(row.slot+1),async()=>{const r=await call({action:'commit',kind:'delete',slot:row.slot,heroId:row.hero_id,expectedRevision:row.revision,requestId:crypto.randomUUID(),snapshot:null,confirmed:true});assert.equal(r.status,200);});
console.log(JSON.stringify({passed:pass,failed:fail,skipped:0}));process.exitCode=fail?1:0;
