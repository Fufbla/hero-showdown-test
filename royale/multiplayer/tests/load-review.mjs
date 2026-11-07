// Reproducible local load sample. Synthetic heroes, disk WAL, real WebSockets.
// This does not establish capacity on a hosting provider or physical phones.
import {once} from 'node:events';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {WebSocket} from 'ws';
import {startServer} from '../server.mjs';
import {GameSession} from '../game-session.mjs';
import {MemoryV3Bridge} from './v3-fixture.mjs';
globalThis.WebSocket=class extends WebSocket{constructor(url){super(url,{origin:'http://localhost'});}};
const event=(s,name)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Timeout '+name)),5000);s.addEventListener(name,e=>{clearTimeout(timer);resolve(e.detail);},{once:true});});
const dir=mkdtempSync(join(tmpdir(),'royale-load-')),bridge=new MemoryV3Bridge(),sessions=[],errors=[],duration=Number(process.env.REVIEW_SECONDS||20);
const app=startServer({path:join(dir,'authority.sqlite'),capacity:5,maxConnections:8,origins:['http://localhost'],v3Bridge:bridge});await once(app.server,'listening');
const wireSections={};app.wss.on('connection',ws=>{const send=ws.send.bind(ws);ws.send=(data,...args)=>{const message=JSON.parse(data);for(const [key,value] of Object.entries(message))wireSections[key]=(wireSections[key]||0)+Buffer.byteLength(JSON.stringify(value));return send(data,...args);};});
try{
  for(let i=0;i<5;i++){
    const identity=bridge.identity('Load '+i),s=new GameSession({url:`ws://127.0.0.1:${app.server.address().port}/royale`,getToken:async()=>({token:identity.token,kind:'v3',slot:0}),storage:{getItem:()=>null,setItem(){}},onState(){},onError:e=>errors.push(String(e))});sessions.push(s);
    const list=event(s,'heroes');await s.connect();const heroes=await list,ready=event(s,'state');s.select(heroes[0].id);await ready;
  }
  await sessions[0].command('mode',['create']);for(const s of sessions.slice(1))await s.command('mode',['join',sessions[0].state.code]);await sessions[0].command('startRoom');for(const s of sessions)await s.command('pause',[false]);
  const wireBytes=()=>[...app.wss.clients].reduce((sum,ws)=>sum+ws._socket.bytesWritten,0);
  const initial=app.metrics(),initialWire=wireBytes(),start=performance.now();let sample=0;
  while(performance.now()-start<duration*1000){for(const [i,s] of sessions.entries())s.input({move:sample%80<40?1:-1,run:true,punchHeld:true,jump:sample%25===i});sample++;await new Promise(r=>setTimeout(r,50));}
  for(const s of sessions)await s.command('save');
  const end=app.metrics(),seconds=(performance.now()-start)/1000;
  console.log(JSON.stringify({kind:'local synthetic load; not hosted WAN or physical-device certification',node:process.version,players:5,seconds:+seconds.toFixed(2),ticks:end.ticks-initial.ticks,tickP95Ms:+end.tickP95Ms.toFixed(2),maxTickMs:+end.maxTickMs.toFixed(2),eventLoopP99Ms:+end.eventLoopP99Ms.toFixed(2),rssMiB:+(end.rssBytes/1048576).toFixed(1),outKiBPerSecondPerPlayer:+((end.bytesOut-initial.bytesOut)/seconds/5/1024).toFixed(2),wireKiBPerSecondPerPlayer:+((wireBytes()-initialWire)/seconds/5/1024).toFixed(2),cloudWrites:bridge.writes.length,uniqueSavedProfiles:new Set(bridge.writes.map(w=>w.profile)).size,wireSections,errors},null,2));
  if(errors.length||app.authority.failed)process.exitCode=1;
}finally{for(const s of sessions)s.client.close();await app.close();rmSync(dir,{recursive:true,force:true});}
