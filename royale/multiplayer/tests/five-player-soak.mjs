// Disposable local measurement: no production credentials or cloud rows.
// npm run soak --prefix royale/multiplayer
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtemp,rm,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {WebSocket} from 'ws';
import {startServer} from '../server.mjs';
import {GameSession} from '../game-session.mjs';
import {MemoryV3Bridge} from './v3-fixture.mjs';

const duration=Math.max(24,Math.min(300,Number(process.env.SOAK_SECONDS)||24));
const event=(target,name)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Timed out: '+name)),10000);target.addEventListener(name,e=>{clearTimeout(timer);resolve(e.detail);},{once:true});});
const dir=await mkdtemp(join(tmpdir(),'royale-soak-')),Native=globalThis.WebSocket,bridge=new MemoryV3Bridge(),errors=[],sessions=[],identities=[],frames=[],rtts=[],lastFrame=[],gaps=[],sent=[];
globalThis.WebSocket=class extends WebSocket{constructor(url){super(url,{origin:'http://localhost'});}};
const app=startServer({capacity:5,maxConnections:8,path:join(dir,'authority.sqlite'),origins:['http://localhost'],v3Bridge:bridge});await once(app.server,'listening');let timer;
try{
  for(let i=0;i<5;i++){
    const identity=bridge.identity('Soak '+(i+1));identities.push(identity);frames[i]=0;sent[i]=new Map();
    const s=new GameSession({url:`ws://127.0.0.1:${app.server.address().port}/royale`,getToken:async()=>({token:identity.token,slot:0,kind:'v3'}),storage:{getItem:()=>null,setItem(){}},onError:e=>errors.push(String(e)),onState:(_g,state)=>{
      frames[i]++;const now=performance.now();if(lastFrame[i])gaps.push(now-lastFrame[i]);lastFrame[i]=now;
      if(sent[i].has(state.inputSeq))rtts.push(now-sent[i].get(state.inputSeq));
      for(const seq of sent[i].keys())if(seq<=state.inputSeq)sent[i].delete(seq);
    }});sessions.push(s);s.addEventListener('error',e=>errors.push(e.detail));
    const ready=event(s,'heroes');await s.connect();const list=await ready,next=event(s,'state');s.select(list[0].id);await next;
  }
  await sessions[0].command('mode',['create']);const code=sessions[0].state.code;
  for(const s of sessions.slice(1))await s.command('mode',['join',code]);
  await sessions[0].command('startRoom');
  const initial=app.metrics(),started=performance.now();console.log(`Running ${duration}s with five clients, 30 Hz inputs, durable SQLite and eight-second saves.`);
  timer=setInterval(()=>{
    for(let i=0;i<sessions.length;i++){
      const s=sessions[i],move=s.game.hero.x>1100?-1:s.game.hero.x<250?1:Math.sin((performance.now()-started)/3000)>0?1:-1;
      sent[i].set(s.client.inputSeq+1,performance.now());s.input({move,run:true,punchHeld:true,jump:Math.random()<.015});
    }
  },1000/30);
  await new Promise(resolve=>setTimeout(resolve,duration*1000));clearInterval(timer);
  assert.equal(app.authority.connections.size,5);assert.deepEqual(errors,[]);
  for(const s of sessions){assert.equal(s.state.players.length,5);assert.equal(s.state.phase,'playing');}
  const writes=identities.map(i=>bridge.writes.filter(w=>w.profile===i.account.profile));
  for(const list of writes)assert.ok(list.length>=3,'at least three cloud writes per hero');
  const metrics=app.metrics(),elapsed=(performance.now()-started)/1000,percentile=(list,p)=>[...list].sort((a,b)=>a-b)[Math.min(list.length-1,Math.floor(list.length*p))]||0;
  const result={kind:'local-five-client-soak',seconds:Number(elapsed.toFixed(2)),players:5,transport:'loopback WebSocket; not WAN or physical-device testing',persistence:'temporary SQLite + fixture cloud',ticks:metrics.ticks-initial.ticks,tickP95Ms:Number(metrics.tickP95Ms.toFixed(2)),inputConfirmationP95Ms:Number(percentile(rtts,.95).toFixed(2)),frameGapP95Ms:Number(percentile(gaps,.95).toFixed(2)),outboundKBps:Number(((metrics.bytesOut-initial.bytesOut)/1024/elapsed).toFixed(2)),stateFrames:frames,cloudWritesPerHero:writes.map(w=>w.length),errors};
  const output=new URL('../qa/five-player-soak.json',import.meta.url);await mkdir(new URL('../qa/',import.meta.url),{recursive:true});await writeFile(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{clearInterval(timer);for(const s of sessions)s.client.close();await app.close();globalThis.WebSocket=Native;await rm(dir,{recursive:true,force:true});}
