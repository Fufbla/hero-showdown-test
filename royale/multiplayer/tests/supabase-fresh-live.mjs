// Opt-in live QA, exclusively disposable royale_mp_test_* identities.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {fixtures,wait} from './supabase-live-test.mjs';
import {SupabaseTestClient} from '../supabase-test/client.mjs';
const originals=await fixtures(),next=[],errors=[],statuses=[],endpoint='https://adakwbhxiuatjvphutgo.supabase.co/functions/v1/royale-mp-test?forceFunctionRegion=us-west-2';
const until=async fn=>{const end=Date.now()+20000;while(!fn()&&Date.now()<end)await wait(100);assert.ok(fn(),'Confirmed state arrived');};
try{
 for(const c of originals)await c.call({action:'select'});
 const oldCode=originals[0].state.code;
 for(const [i,c] of originals.entries()){
  const body={action:'fresh-session',freshId:crypto.randomUUID(),nextAccess:Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('')};
  const fresh=await c.call(body),retry=await c.call(body);
  assert.equal(fresh.id,retry.id);assert.equal(fresh.access,retry.access);assert.equal(fresh.roomId,null);assert.deepEqual(fresh.snapshot,fresh.previous.snapshot);
  const old=await c.call({action:'profile'});assert.deepEqual(old.snapshot,fresh.snapshot);
  const n=new SupabaseTestClient({endpoint},()=>fresh.access);n.saves=[];n.addEventListener('state',({detail:s})=>{const at=s.cloud.savedAt;if(at&&n.saves.at(-1)!==at)n.saves.push(at);});n.addEventListener('error',e=>errors.push(e.detail));n.addEventListener('status',e=>{if(e.detail.startsWith('Reconnecting'))statuses.push(e.detail);});next.push(n);await n.connect();n.select(fresh.id);await until(()=>n.ready);
  if(i===0){await originals[1].sync();assert.equal(originals[1].state.code,oldCode);assert.equal(originals[1].state.hostId,originals[1].state.id);}
 }
 await next[0].command('mode',['create']);assert.notEqual(next[0].state.code,oldCode);await next[1].command('mode',['join',next[0].state.code]);await until(()=>next.every(c=>c.state.players.length===2));
 await next[0].command('startRoom');for(const c of next)await c.command('pause',[false]);
 const before=next.map(c=>c.game.hero.x);next.forEach((c,i)=>c.input({move:i?-1:1}));await until(()=>next.every((c,i)=>c.game.hero.x!==before[i]));next.forEach(c=>c.input({}));await until(()=>next.every(c=>c.state.nearby.length===1));
 next.forEach(c=>{c.metrics.syncRtt=[];c.saves=[];});await wait(21000);
 const times=next.flatMap(c=>c.metrics.syncRtt).sort((a,b)=>a-b),intervals=next.map(c=>c.saves.slice(1).map((v,i)=>Date.parse(v)-Date.parse(c.saves[i])));
 assert.ok(intervals.every(a=>a.some(x=>x>=8000&&x<10000)),'Each hero has a confirmed eight-second save');assert.equal(errors.length,0);
 const report={freshSession:true,retryKeepsIdentity:true,previousSessionRetained:true,progressCopiedExactly:true,oldRoomContinues:true,newCode:next[0].state.code,createJoin:true,independentMovement:true,peerCounts:next.map(c=>c.state.nearby.length),xp:next.map(c=>c.game.hero.xp),autosaveIntervals:intervals,latency:{samples:times.length,medianMs:Math.round(times[Math.floor(times.length*.5)]),p95Ms:Math.round(times[Math.floor(times.length*.95)]),maxMs:Math.round(times.at(-1))},httpRecovery:next.map(c=>c.metrics.transportFallbacks||0),errors,statuses};
 await writeFile('/tmp/royale-fresh-live.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{for(const c of originals)try{await c.call({action:'disconnect'});}catch{}for(const c of next)c.close();await wait(700);}
