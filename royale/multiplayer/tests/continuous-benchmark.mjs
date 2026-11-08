// Local, reproducible comparison. Delays are synthetic, not measured WAN latency.
// No production credentials: disposable SQLite and fixture cloud checkpoints.
import assert from 'node:assert/strict';
import net from 'node:net';
import {once} from 'node:events';
import {mkdtemp,rm,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {WebSocket} from 'ws';
import {startServer} from '../server.mjs';
import {GameSession} from '../game-session.mjs';
import {MemoryV3Bridge} from './v3-fixture.mjs';
const seconds=Math.max(24,Number(process.env.BENCH_SECONDS)||24);
const p=(xs,q)=>[...xs].sort((a,b)=>a-b)[Math.min(xs.length-1,Math.floor(xs.length*q))]||0;
const round=n=>Number(n.toFixed(2));
const event=(target,name)=>new Promise((resolve,reject)=>{const fail=setTimeout(()=>reject(Error('Timed out: '+name)),10000);target.addEventListener(name,e=>{clearTimeout(fail);resolve(e.detail);},{once:true});});
async function run(players,snapshotHz,rttMs){
  const dir=await mkdtemp(join(tmpdir(),'royale-continuous-')),bridge=new MemoryV3Bridge();
  const app=startServer({path:join(dir,'authority.sqlite'),maxConnections:8,origins:['http://localhost'],v3Bridge:bridge,snapshotHz});
  await once(app.server,'listening');
  const sockets=new Set(),delays=new Set();
  const proxy=net.createServer(down=>{
    const up=net.connect(app.server.address().port,'127.0.0.1');
    for(const s of [down,up]){sockets.add(s);s.setNoDelay(true);s.on('error',()=>{});s.on('close',()=>{sockets.delete(s);down.destroy();up.destroy();});}
    const forward=(from,to)=>from.on('data',data=>{const t=setTimeout(()=>{delays.delete(t);if(!to.destroyed)to.write(data);},rttMs/2);delays.add(t);});
    forward(down,up);forward(up,down);
  });
  proxy.listen(0,'127.0.0.1');await once(proxy,'listening');
  const Native=globalThis.WebSocket,sessions=[],identities=[],errors=[],samples=[],gaps=[],pending=[],last=[],confirmed=new Set();let timer,measuring=false;
  globalThis.WebSocket=class extends WebSocket{constructor(url){super(url,{origin:'http://localhost'});}};
  try{
    for(let i=0;i<players;i++){
      const identity=bridge.identity('Benchmark '+i);identities.push(identity);pending[i]=new Map();
      const s=new GameSession({url:`ws://127.0.0.1:${proxy.address().port}/royale`,getToken:async()=>({kind:'v3',token:identity.token,slot:0}),storage:{getItem:()=>null,setItem(){}},onError:e=>errors.push(String(e)),onState:(_g,state)=>{
        if(!measuring)return;const now=performance.now();if(last[i])gaps.push(now-last[i]);last[i]=now;
        // Count ALL coalesced input packets, not just the newest/fastest one.
        for(const [seq,sent] of pending[i])if(seq<=state.inputSeq){samples.push(now-sent);pending[i].delete(seq);confirmed.add(i);}
      }});sessions.push(s);s.addEventListener('error',e=>errors.push(String(e.detail)));
      let ready=event(s,'heroes');await s.connect();const heroes=await ready;ready=event(s,'state');s.select(heroes[0].id);await ready;
    }
    await sessions[0].command('mode',['create']);const code=sessions[0].state.code;assert.match(code,/^\d{6}$/);
    for(const s of sessions.slice(1))await s.command('mode',['join',code]);
    await sessions[0].command('startRoom');
    const initial=app.metrics(),began=performance.now();measuring=true;
    timer=setInterval(()=>sessions.forEach((s,i)=>{pending[i].set(s.client.inputSeq+1,performance.now());s.input({move:Math.floor((performance.now()-began)/2000)%2?-1:1,run:true});}),1000/30);
    await new Promise(r=>setTimeout(r,seconds*1000));clearInterval(timer);timer=null;
    await new Promise(r=>setTimeout(r,rttMs+250));
    assert.equal(confirmed.size,players);assert.deepEqual(errors,[]);
    for(const s of sessions){assert.equal(s.state.phase,'playing');assert.equal(s.state.players.length,players);}
    const writes=identities.map(i=>bridge.writes.filter(w=>w.profile===i.account.profile));
    for(const w of writes)assert.ok(w.length>=3,'eight-second checkpoints remain active');
    const metrics=app.metrics(),elapsed=(performance.now()-began)/1000;
    const result={players,snapshotHz,syntheticRttMs:rttMs,seconds:round(elapsed),confirmedInputs:samples.length,inputConfirmationMedianMs:round(p(samples,.5)),inputConfirmationP95Ms:round(p(samples,.95)),frameGapP95Ms:round(p(gaps,.95)),tickP95Ms:round(metrics.tickP95Ms),outboundKBps:round((metrics.bytesOut-initial.bytesOut)/1024/elapsed),cloudWritesPerHero:writes.map(w=>w.length),errors};
    console.log(JSON.stringify(result));return result;
  }finally{clearInterval(timer);for(const s of sessions)s.client.close();for(const t of delays)clearTimeout(t);for(const s of sockets)s.destroy();await new Promise(r=>proxy.close(r));await app.close();globalThis.WebSocket=Native;await rm(dir,{recursive:true,force:true});}
}
const results=[];
for(const players of [2,5])for(const hz of [20,30])results.push(await run(players,hz,50));
const report={kind:'local-continuous-authority-comparison',limitations:'Synthetic 50 ms round-trip TCP delay on loopback. Fixture cloud, real temporary SQLite. Not a hosted server, mobile rendering, or real Supabase save-latency test.',measuredAt:new Date().toISOString(),results};
await mkdir(new URL('../qa/',import.meta.url),{recursive:true});await writeFile(new URL('../qa/prediction-benchmark.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
