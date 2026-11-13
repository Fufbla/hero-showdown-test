// Explicit opt-in; creates one isolated QA account, never opens a user's slots.
import assert from 'node:assert/strict';import fs from 'node:fs';
import {Game,decodeSave} from '../../../royale/core.mjs';
if(process.env.LIVE_GAMEPLAY_CLOUD_QA!=='1')throw Error('Set LIVE_GAMEPLAY_CLOUD_QA=1 for isolated staging API verification.');
const endpoint='https://adakwbhxiuatjvphutgo.supabase.co/functions/v1/royale-v3-staging';
let access='';
async function request(action,body={}){const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://fufbla.github.io',...(access?{Authorization:'Bearer '+access}:{})},body:JSON.stringify({action,...body})});return {status:response.status,body:await response.json()};}
const created=await request('create');assert.equal(created.status,200,created.body.error);access=created.body.access;
// Keep transient QA credentials outside the repository and report.
fs.writeFileSync('/tmp/v3-economy-qa-session.json',JSON.stringify(created.body),{mode:0o600});
const g=new Game();g.look.name='Economy QA 20261113';g.hero.coins=10000;g.hero.level=99;g.powers.data.points=98;
const snapshot=()=>JSON.parse(g.save());let revision=0;
async function save(s){const response=await request('save',{slot:1,revision,snapshot:s});assert.equal(response.status,200,response.body.error);revision=response.body.revision;}
await save(snapshot());assert(g.fastTravel({region:7,board:1},0));await save(snapshot());assert.equal(g.hero.coins,6500);
assert(g.enterBoss());g.enemies.forEach(e=>{e.hp=0;e.state='dead';});assert(g.completeBoss());await save(snapshot());const available=snapshot();assert(g.claimChest());await save(snapshot());const claimed=snapshot();assert.equal(claimed.coins,7700);
assert.equal((await request('save',{slot:1,revision:revision-1,snapshot:available})).status,409);
const reopened=structuredClone(claimed);reopened.bossProgress.records[7].chest.state='available';assert.equal((await request('save',{slot:1,revision,snapshot:reopened})).status,409);
const refund=structuredClone(claimed);refund.economy.coinsSpent=0;refund.coins=11200;assert.equal((await request('save',{slot:1,revision,snapshot:refund})).status,409);
const signed=await request('verify',{code:created.body.code});assert.equal(signed.status,200);access=signed.body.access;
const slots=await request('slots');assert.equal(slots.status,200);const row=slots.body.slots.find(s=>s.slot_number===1);assert.equal(row.revision,revision);assert.equal(row.snapshot.coins,7700);assert.equal(row.snapshot.world.region,7);assert.equal(row.snapshot.bossProgress.records[7].chest.state,'claimed');assert(decodeSave(JSON.stringify(row.snapshot)));assert(slots.body.slots.filter(s=>s.slot_number!==1).every(s=>s.snapshot===null));
const report={passed:true,endpoint,functionVersion:9,isolatedQaAccount:true,realUserAccountsTouched:false,checks:['paid travel persists 3500-coin debit and exact destination','1200-coin first chest save and claim accepted','stale revision rejected with 409','reopened claimed chest rejected with 409','travel refund/coinsSpent rollback rejected with 409','second authenticated session restores latest wallet, location and claimed chest','other two QA slots remain empty'],revision};
fs.writeFileSync('docs/gameplay-20261113/cloud-live.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
