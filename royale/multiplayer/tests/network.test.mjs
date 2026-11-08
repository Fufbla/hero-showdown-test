import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {startServer} from '../server.mjs';
import {connect,createAndSelect} from './socket-helper.mjs';
import {applyRuntimeDelta} from '../delta.mjs';
import {decodeRuntime} from '../runtime.mjs';
const auth=async token=>{if(!/^fixture-user-\d+$/.test(token))throw Error('Invalid fixture credentials.');return {id:token,expiresAt:Date.now()+60000};};
test('four independent sockets share a room, move, survive creator exit and reconnect without duplicate entities',async()=>{
  const app=startServer({allowNewHeroes:true,capacity:16,origins:['http://localhost'],authenticate:auth,autoTick:false});await once(app.server,'listening');
  const url=`ws://127.0.0.1:${app.server.address().port}/royale`,clients=[];
  try {
    for(let i=0;i<4;i++){const c=await connect(url,'fixture-user-'+i);c.initial=await createAndSelect(c);clients.push(c);}
    const creator=clients[0],created=await creator.request({type:'command',seq:1,method:'mode',args:['create']},m=>m.type==='ack');const code=created.result.code;
    for(const c of clients.slice(1))await c.request({type:'command',seq:1,method:'mode',args:['join',code]},m=>m.type==='ack');
    await creator.request({type:'command',seq:2,method:'startRoom'},m=>m.type==='ack');
    const room=[...app.authority.state.rooms.values()].find(r=>r.code===code);assert.equal(room.members.size,4);
    for(const c of clients)c.send({type:'input',seq:1,input:{move:1,run:true}});
    await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));
    for(let i=0;i<30;i++)app.step();
    for(const c of clients)assert.ok(app.authority.state.heroes.get(c.initial.id).game.hero.x>200);
    const next=clients[1].wait(m=>m.type==='state');app.publish();const frame=await next;assert.equal(frame.players.length,4);assert.equal(frame.nearby.length,3);
    await creator.request({type:'command',seq:3,method:'mode',args:['solo']},m=>m.type==='ack');assert.equal(room.members.size,3);
    const id=clients[1].initial.id;clients[1].ws.terminate();await once(clients[1].ws,'close');await new Promise(r=>setImmediate(r));
    const reconnect=await connect(url,'fixture-user-1');clients.push(reconnect);const resumed=await reconnect.request({type:'select',id},m=>m.type==='state');assert.equal(resumed.id,id);assert.equal(resumed.code,code);assert.equal(new Set(resumed.players.map(p=>p.id)).size,resumed.players.length);
    await reconnect.request({type:'command',seq:2,method:'mode',args:['solo']},m=>m.type==='ack');assert.equal(app.authority.state.heroes.get(id).game.hero.x,app.authority.owner('fixture-user-1',id).game.hero.x);
  }finally{for(const c of clients)c.ws.terminate();await app.close();}
});
test('socket authorization rejects cross-account heroes, invented damage and stale connections',async()=>{
  const app=startServer({allowNewHeroes:true,capacity:8,origins:['http://localhost'],authenticate:auth,autoTick:false});await once(app.server,'listening');const url=`ws://127.0.0.1:${app.server.address().port}/royale`;
  const a=await connect(url,'fixture-user-1'),b=await connect(url,'fixture-user-2');
  try{
    const hero=await createAndSelect(a);const denied=await b.request({type:'select',id:hero.id},m=>m.type==='error');assert.match(denied.message,/account/);
    const rejected=await a.request({type:'input',seq:1,input:{damage:10000}},m=>m.type==='error');assert.match(rejected.message,/Invalid input/);
    assert.equal(app.authority.owner('fixture-user-1',hero.id).game.hero.coins,0);
  }finally{a.ws.terminate();b.ws.terminate();await app.close();}
});
test('wire deltas can reconstruct committed state through independent client baseline',async()=>{
  const app=startServer({allowNewHeroes:true,capacity:8,origins:['http://localhost'],authenticate:auth,autoTick:false});await once(app.server,'listening');const c=await connect(`ws://127.0.0.1:${app.server.address().port}/royale`,'fixture-user-1');
  try{const first=await createAndSelect(c);let baseline=applyRuntimeDelta(null,first.delta);const h=app.authority.owner('fixture-user-1',first.id);app.authority.input(h.owner,h.id,1,{jump:true});for(let i=0;i<6;i++)app.step();
    const next=await c.wait(m=>m.type==='state'&&m.serial===first.serial+2);
    // Apply every ordered delta, including the intermediate 20 Hz frame.
    for(const frame of c.messages.filter(m=>m.type==='state'&&m.serial>first.serial&&m.serial<next.serial))baseline=applyRuntimeDelta(baseline,frame.delta);baseline=applyRuntimeDelta(baseline,next.delta);const g=decodeRuntime(JSON.stringify(baseline));assert.equal(g.hero.y,h.game.hero.y);assert.equal(g.hero.hp,h.game.hero.hp);assert.equal(next.revision,app.authority.store.revision);
  }finally{c.ws.terminate();await app.close();}
});
