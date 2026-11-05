// Explicit real-provider checks. Not part of npm test and never use player credentials.
// Supply a private JSON array of three single-use staging invitations, already
// provisioned as SHA-256 verifiers in royale8_test_invites. No secrets are logged.
import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';
import {CLOUD_CONFIG as c} from '../cloud-config.mjs';import {ACCOUNT_ENDPOINT as endpoint} from '../player-accounts-config.mjs';import {Game} from '../core.mjs';
if(!process.env.ROYALE_TEST_INVITES_FILE)throw Error('BLOCKED: Apply the reviewed recovery migration and provision private staging invitations first.');
const invites=JSON.parse(await readFile(process.env.ROYALE_TEST_INVITES_FILE,'utf8'));assert.equal(invites.length,3);let pass=0,fail=0;
async function check(name,fn){try{await fn();pass++;console.log('PASS '+name);}catch(e){fail++;console.log('FAIL '+name+': '+e.message);}}
async function call(body,token){const r=await fetch(endpoint,{method:'POST',headers:{apikey:c.publishableKey,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
const name='qatest_'+crypto.randomUUID().replaceAll('-','').slice(0,12),password=crypto.randomUUID()+'-Ocean!',other=name+'_b';let a,b,codes,slot;
await check('public signup stays closed',async()=>assert.equal((await call({action:'username-signup',username:name,passcode:password})).status,503));
await check('private no-email signup issues session and eight recovery codes',async()=>{const r=await call({action:'username-signup',username:name,passcode:password,acknowledgeNoRecovery:true,invite:invites[0]});assert.equal(r.status,200);assert.equal(r.data.recoveryCodes?.length,8);a=r.data.session.access_token;codes=r.data.recoveryCodes;});
if(!a)throw Error('Signup failed. Stop before dependent tests; no player saves touched.');
await check('case-insensitive duplicate username rejected',async()=>assert.equal((await call({action:'username-signup',username:name.toUpperCase(),passcode:password,acknowledgeNoRecovery:true,invite:invites[1]})).status,400));
await check('second independent account created',async()=>{const r=await call({action:'username-signup',username:other,passcode:password,acknowledgeNoRecovery:true,invite:invites[2]});assert.equal(r.status,200);b=r.data.session.access_token;});
await check('invalid password rejected',async()=>assert.equal((await call({action:'username-login',username:name,passcode:'Definitely an invalid password!'})).status,401));
const snapshot=()=>JSON.parse(new Game().save()),rows=[];
for(let i=0;i<3;i++)await check('cloud hero slot '+(i+1),async()=>{const r=await call({action:'commit',kind:'create',slot:i,heroId:null,expectedRevision:0,requestId:crypto.randomUUID(),snapshot:snapshot()},a);assert.equal(r.status,200);rows[i]=r.data.slot;});
slot=rows[0];if(!slot)throw Error('Test hero missing. Stop before dependent writes.');
await check('accounts isolated',async()=>{const r=await call({action:'list'},b);assert.equal(r.status,200);assert.equal(r.data.slots.length,0);});
const next=structuredClone(slot.snapshot);Object.assign(next.world.location,{x:3450.25,y:500.5,hp:42.25,face:-1,vx:0,vy:0,jumps:1});
const write={action:'commit',kind:'manual',slot:0,heroId:slot.hero_id,expectedRevision:slot.revision,requestId:crypto.randomUUID(),snapshot:next};
await check('save current position and health',async()=>{const r=await call(write,a);assert.equal(r.status,200);slot=r.data.slot;});
await check('independent login restores exact cloud location',async()=>{const login=await call({action:'username-login',username:name,passcode:password});assert.equal(login.status,200);const r=await call({action:'list'},login.data.session.access_token);assert.equal(r.status,200);assert.deepEqual(r.data.slots.find(s=>s.slot===0).snapshot.world.location,next.world.location);});
await check('stale write cannot overwrite',async()=>assert.equal((await call({...write,requestId:crypto.randomUUID()},a)).status,409));
await check('retry is idempotent',async()=>assert.equal((await call(write,a)).data.slot.revision,slot.revision));
await check('rotation requires current password',async()=>assert.equal((await call({action:'rotate-recovery-codes',passcode:'This is not the current password!'},a)).status,401));
const changed=crypto.randomUUID()+'-Coast!';
await check('recovery code changes password',async()=>assert.equal((await call({action:'recover-code',username:name,code:codes[0],passcode:changed})).status,200));
await check('code cannot be replayed',async()=>assert.equal((await call({action:'recover-code',username:name,code:codes[0],passcode:password})).status,401));
await check('previous account session cannot read or save',async()=>assert.equal((await call({action:'list'},a)).status,401));
await check('new password restores same heroes',async()=>{const r=await call({action:'username-login',username:name,passcode:changed});assert.equal(r.status,200);a=r.data.session.access_token;const roster=await call({action:'list'},a);assert.equal(roster.status,200);assert.equal(roster.data.slots.length,3);assert.deepEqual(roster.data.slots.find(s=>s.slot===0).snapshot.world.location,next.world.location);});
await check('logout invalidates application session',async()=>{assert.equal((await call({action:'logout'},a)).status,200);assert.equal((await call({action:'list'},a)).status,401);});
console.log(JSON.stringify({passed:pass,failed:fail,skipped:0,scope:'Real staging API; no email delivery or physical-device claim'}));process.exitCode=fail?1:0;
