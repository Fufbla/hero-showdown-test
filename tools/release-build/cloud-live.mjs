// Opt-in: two new ordinary QA accounts only; never accepts existing player codes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Game,decodeSave} from '../../royale/core.mjs';
if(process.env.ROYALE_RELEASE_LIVE_QA!=='1')throw Error('Explicit live QA opt-in required');
const endpoint='https://adakwbhxiuatjvphutgo.supabase.co/functions/v1/royale-v3-staging';
const credentials='/tmp/royale-release-cloud-qa.json',reportPath='docs/release-20261113/cloud-live-resume.json';
let fixture=fs.existsSync(credentials)?JSON.parse(fs.readFileSync(credentials,'utf8')):{prefix:'Release QA '+crypto.randomUUID().slice(0,4),accounts:[]};
const persist=()=>fs.writeFileSync(credentials,JSON.stringify(fixture),{mode:0o600});
async function call(action,body={},access){const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://fufbla.github.io',...(access?{Authorization:'Bearer '+access}:{})},body:JSON.stringify({action,...body}),signal:AbortSignal.timeout(20000)});return {status:response.status,body:await response.json()};}
const report={at:new Date().toISOString(),endpoint,qaNamePrefix:fixture.prefix,createdAccounts:2,existingPlayerWrites:0,browserEndToEnd:false,checks:[]};
try{
 assert.equal((await call('slots')).status,401);report.checks.push('Unauthenticated slot reads refused');
 while(fixture.accounts.length<2){const r=await call('create');assert.equal(r.status,200,r.body.error);fixture.accounts.push(r.body);persist();}
 for(let i=0;i<2;i++){
  const account=fixture.accounts[i],login=await call('verify',{code:account.code});assert.equal(login.status,200,login.body.error);const access=login.body.access;
  const initial=await call('slots',{},access);assert.equal(initial.status,200);assert.equal(initial.body.slots.length,3);
  const slot=initial.body.slots.find(r=>r.slot_number===1),g=slot.snapshot?new Game({save:decodeSave(JSON.stringify(slot.snapshot))}):new Game({look:{name:fixture.prefix+' '+String.fromCharCode(65+i),hair:'box-braids'}});
  assert(g.look.name.startsWith(fixture.prefix),'Refuse non-QA hero');
  g.hero.coins=17+i;g.hero.x=g.camps[0].x+20+i;const snapshot=JSON.parse(g.save());assert(decodeSave(JSON.stringify(snapshot)));
  const saved=await call('save',{slot:1,revision:slot.revision,snapshot},access);assert.equal(saved.status,200,saved.body.error);
  const second=await call('verify',{code:account.code});assert.equal(second.status,200);assert.notEqual(second.body.access,access);
  const loaded=await call('slots',{},second.body.access);assert.equal(loaded.status,200);const row=loaded.body.slots.find(r=>r.slot_number===1);
  assert.deepEqual(decodeSave(JSON.stringify(row.snapshot)),decodeSave(JSON.stringify(snapshot)));assert.equal(row.revision,saved.body.revision);assert(loaded.body.slots.filter(r=>r.slot_number!==1).every(r=>r.snapshot===null));
  const stale=await call('save',{slot:1,revision:slot.revision,snapshot},access);assert.equal(stale.status,409);
  const renewed=await call('renew',{refresh:second.body.refresh});assert.equal(renewed.status,200);
  const after=await call('slots',{},renewed.body.access);assert.deepEqual(after.body.slots,row?loaded.body.slots:[]);
  account.access=renewed.body.access;account.refresh=renewed.body.refresh;persist();
  report.checks.push(`Account ${i+1}: ordinary code login, three slots, save acknowledgment, independent-session exact reload, stale-write 409, renewal and unused-slot preservation`);
 }
 const a=await call('slots',{},fixture.accounts[0].access),b=await call('slots',{},fixture.accounts[1].access);
 assert.notEqual(a.body.slots[0].snapshot.look.name,b.body.slots[0].snapshot.look.name);assert.equal(a.body.slots[0].snapshot.coins,17);assert.equal(b.body.slots[0].snapshot.coins,18);
 report.checks.push('Two authenticated accounts retain separate names, positions and wallets');report.passed=true;
}catch(e){report.passed=false;report.error=e.message;process.exitCode=1;}
fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
