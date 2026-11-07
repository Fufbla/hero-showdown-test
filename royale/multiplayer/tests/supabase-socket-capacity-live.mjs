// Actual shipped client, including automatic heartbeats and reconnect behavior.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {fixtures,wait} from './supabase-live-test.mjs';
import {SupabaseTestClient} from '../supabase-test/client.mjs';
const endpoint='https://adakwbhxiuatjvphutgo.supabase.co/functions/v1/royale-mp-test?forceFunctionRegion=us-west-2',fs=await fixtures(6),cs=[],errors=[];
const until=async fn=>{const end=Date.now()+25000;while(!fn()&&Date.now()<end)await wait(50);assert.ok(fn(),'Client became ready');};
try{
 for(const f of fs){const c=new SupabaseTestClient({endpoint},()=>f.hero.access);c.saves=[];c.addEventListener('state',({detail:s})=>{const at=s.cloud.savedAt;if(at&&c.saves.at(-1)!==at)c.saves.push(at);});c.addEventListener('error',e=>errors.push(e.detail));cs.push(c);}
 await Promise.all(cs.map(async(c,i)=>{await c.connect();c.select(fs[i].hero.id);await until(()=>c.ready);}));const a=cs[0];if(!a.state.code)await a.command('mode',['create']);for(const c of cs.slice(1,5))if(c.state.code!==a.state.code)await c.command('mode',['join',a.state.code]);
 await until(()=>cs.slice(0,5).every(c=>c.state.players.length===5));await assert.rejects(()=>cs[5].command('mode',['join',a.state.code]),/full|capacity|five/i);cs[5].close();
 if(a.state.phase==='lobby')await a.command('startRoom');await Promise.all(cs.slice(0,5).map(c=>c.command('pause',[false])));cs.slice(0,5).forEach(c=>{c.metrics.syncRtt=[];c.saves=[];});await wait(30000);
 const active=cs.slice(0,5),times=active.flatMap(c=>c.metrics.syncRtt).sort((a,b)=>a-b),intervals=active.map(c=>c.saves.slice(1).map((v,i)=>Date.parse(v)-Date.parse(c.saves[i])));
 assert.ok(intervals.every(a=>a.some(x=>x>=8000&&x<10000)),'Each hero has a confirmed eight-second save');
 const report={players:5,sixthRejected:true,latency:{samples:times.length,medianMs:Math.round(times[Math.floor(times.length*.5)]),p95Ms:Math.round(times[Math.floor(times.length*.95)]),maxMs:Math.round(times.at(-1))},autosaveIntervals:intervals,sockets:active.map(c=>c.socket?.metrics),httpFallbackRequests:active.map(c=>c.metrics.httpRequests||0),errors};await writeFile('/tmp/royale-socket-capacity.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));assert.equal(errors.length,0);
}finally{for(const c of cs)c.close();await wait(700);}
