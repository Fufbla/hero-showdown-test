// Opt-in: actual browser transport against disposable test identities only.
// Run after build-test.mjs has generated the pinned Realtime SDK bundle.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {fixtures,wait} from './supabase-live-test.mjs';
import {SupabaseTestClient} from '../supabase-test/client.mjs';
import {GameSession} from '../game-session.mjs';
const endpoint='https://adakwbhxiuatjvphutgo.supabase.co/functions/v1/royale-mp-test?forceFunctionRegion=us-west-2';
const samples=[],errors=[],sessions=[],identities=await fixtures();
const quantiles=a=>{a=[...a].sort((x,y)=>x-y);return {samples:a.length,medianMs:Math.round(a[Math.floor(a.length*.5)]||0),p95Ms:Math.round(a[Math.floor(a.length*.95)]||0),maxMs:Math.round(a.at(-1)||0)};};
try{
 for(const fixture of identities){
  const client=new SupabaseTestClient({endpoint},async()=>fixture.hero.access),session=new GameSession({client,storage:{getItem:()=>null},onState(){},onError:e=>errors.push(e)});sessions.push(session);
  client.addEventListener('motion',({detail:p})=>{if(session.state?.nearby.some(h=>h.id===p.id))samples.push(Date.now()-p.sentAt);});
  await client.connect();client.select(fixture.hero.id);
 }
 let until=Date.now()+20000;while(!sessions.every(s=>s.client.ready&&s.client.subscribed&&s.state.nearby.length)&&Date.now()<until)await wait(50);
 assert.ok(sessions.every(s=>s.client.ready&&s.client.subscribed&&s.state.nearby.length),'Both real transports must be connected');
 for(const s of sessions)await s.command('pause',[false]);
 const start=sessions.map(s=>s.game.hero.x),untilPlay=Date.now()+10000;let tick=0;
 while(Date.now()<untilPlay){sessions.forEach((s,i)=>s.input({move:tick<60?(i?-1:1):tick<120?(i?1:-1):0}));tick++;await wait(1000/30);}
 assert.ok(samples.length>80,'Realtime must deliver motion throughout the run');
 assert.ok(sessions.every(s=>s.peerMotion.peers.size>0),'The shipped renderer must accept peer movement');
 const report={buffersMs:sessions.flatMap(s=>[...s.peerMotion.peers.values()].map(t=>t.buffer||100)),movement:quantiles(samples),authoritativeRequests:quantiles(sessions.flatMap(s=>s.client.metrics.rtt)),transports:sessions.map(s=>s.client.metrics),inputTicks:tick,positions:sessions.map(s=>s.game.hero.x),start,errors};
 await writeFile('/tmp/royale-movement-result.json',JSON.stringify(report));console.log(JSON.stringify({...report,transports:report.transports.map(({rtt,...m})=>m)}));
 assert.equal(errors.length,0);
}finally{for(const s of sessions)s.client.close();await wait(600);}
