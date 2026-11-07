import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {WebSocket} from 'ws';
import {startServer} from '../server.mjs';
import {GameSession} from '../game-session.mjs';
import {MemoryV3Bridge} from './v3-fixture.mjs';

const event=(s,name)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Timeout '+name)),6000);s.addEventListener(name,e=>{clearTimeout(timer);resolve(e.detail);},{once:true});});
// Ordered delay represents TCP/WebSocket latency + jitter, not UDP packet loss.
class DelayedSocket extends WebSocket {
  constructor(url){super(url,{origin:'http://localhost'});this.inAt=0;this.outAt=0;this.n=0;}
  send(data,...args){this.outAt=Math.max(Date.now()+60+(this.n++%3)*20,this.outAt+1);setTimeout(()=>{if(this.readyState===1)super.send(data,...args);},this.outAt-Date.now());}
  emit(type,...args){if(type!=='message')return super.emit(type,...args);this.inAt=Math.max(Date.now()+60+(this.n++%3)*20,this.inAt+1);setTimeout(()=>{if(this.readyState===1)super.emit(type,...args);},this.inAt-Date.now());return true;}
}
test('120–200 ms simulated round-trip delay and jitter preserve movement, peer state and reconnect progress',async()=>{
  const Native=globalThis.WebSocket;globalThis.WebSocket=DelayedSocket;
  const bridge=new MemoryV3Bridge(),sessions=[],app=startServer({capacity:5,maxConnections:8,origins:['http://localhost'],v3Bridge:bridge});await once(app.server,'listening');
  try{
    for(let i=0;i<2;i++){
      const identity=bridge.identity('Delayed '+i),s=new GameSession({url:`ws://127.0.0.1:${app.server.address().port}/royale`,getToken:async()=>({token:identity.token,kind:'v3',slot:0}),storage:{getItem:()=>null,setItem(){}},onState(){},onError(){}});sessions.push(s);
      const list=event(s,'heroes');await s.connect();const heroes=await list,ready=event(s,'state');s.select(heroes[0].id);await ready;
    }
    const [host,guest]=sessions;await host.command('mode',['create']);await guest.command('mode',['join',host.state.code]);await host.command('startRoom');await guest.command('pause',[false]);
    const x=guest.game.hero.x;
    for(let i=0;i<20;i++){guest.input({move:1,run:true});await new Promise(r=>setTimeout(r,50));}
    guest.input({move:0});await guest.command('save');assert.ok(guest.game.hero.x>x+100);assert.equal(guest.state.nearby.length,1);
    const id=guest.state.id,code=guest.state.code,position=guest.game.hero.x;
    guest.client.socket.terminate();await event(guest,'status');const resumed=event(guest,'state');await guest.connect();await resumed;
    assert.equal(guest.state.id,id);assert.equal(guest.state.code,code);assert.ok(guest.game.hero.x>=position);assert.equal(new Set(guest.state.players.map(p=>p.id)).size,2);
  }finally{for(const s of sessions)s.client.close();await app.close();globalThis.WebSocket=Native;}
});
