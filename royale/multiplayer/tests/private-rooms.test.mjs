import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {WebSocket} from 'ws';
import {startServer} from '../server.mjs';
import {GameSession} from '../game-session.mjs';
import {Authority} from '../authority.mjs';
import {AuthorityStore} from '../store.mjs';
import {V3Checkpoints,V3CloudBridge,SaveConflict,captureProgress} from '../v3-checkpoints.mjs';
import {MAX_ROOM_PLAYERS,AUTOSAVE_MS} from '../room-rules.mjs';
import {encodeRuntime} from '../runtime.mjs';
import {MemoryV3Bridge} from './v3-fixture.mjs';
import {decodeSave} from '../../core.mjs';

const event=(target,name)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Timeout: '+name)),5000);target.addEventListener(name,e=>{clearTimeout(timer);resolve(e.detail);},{once:true});});
test('five real connections select saved heroes, create/join by six digits; a sixth is refused; every hero autosaves at eight seconds',async()=>{
  let now=1000;const bridge=new MemoryV3Bridge(),Native=globalThis.WebSocket;
  globalThis.WebSocket=class extends WebSocket{constructor(url){super(url,{origin:'http://localhost'});}};
  const app=startServer({capacity:5,maxConnections:8,origins:['http://localhost'],v3Bridge:bridge,autoTick:false,checkpointNow:()=>now});await once(app.server,'listening');
  const sessions=[],identities=[];
  try{
    for(let i=0;i<6;i++){
      const identity=bridge.identity('Room Hero '+(i+1));identities.push(identity);
      const s=new GameSession({url:`ws://127.0.0.1:${app.server.address().port}/royale`,getToken:async()=>({token:identity.token,kind:'v3',slot:0}),storage:{getItem:()=>null,setItem(){}},onState(){},onError(){}});sessions.push(s);
      const heroes=event(s,'heroes');await s.connect();const list=await heroes;assert.equal(list.length,1);assert.equal(list[0].name,'Room Hero '+(i+1));
      const ready=event(s,'state');s.select(list[0].id);await ready;
    }
    const [host]=sessions;await host.command('mode',['create']);const code=host.state.code;assert.match(code,/^\d{6}$/);
    for(const s of sessions.slice(1,5))await s.command('mode',['join',code]);
    await assert.rejects(()=>sessions[5].command('mode',['join',code]),/capacity/);
    const room=[...app.authority.state.rooms.values()].find(r=>r.code===code);assert.equal(room.members.size,MAX_ROOM_PLAYERS);
    const expected=[];
    for(let i=0;i<5;i++){
      const h=app.authority.owner(identities[i].account.id,sessions[i].state.id),g=h.game;
      Object.assign(g.hero,{x:600+i*100.25,y:320+i*.5,hp:35+i,coins:101+i,xp:5+i,vy:-120,jumps:2,grounded:false});
      g.startAttack('punch');g.powers.cooldowns.fireball=3.25;assert.equal(g.save(),null);
      expected.push({x:g.hero.x,y:g.hero.y,hp:g.hero.hp,coins:g.hero.coins,xp:g.hero.xp,look:structuredClone(g.look),inventory:structuredClone(g.inventory)});
    }
    const count=bridge.writes.length;now+=AUTOSAVE_MS-1;await app.checkpoints.due();assert.equal(bridge.writes.length,count);
    const receipts=sessions.slice(0,5).map(s=>event(s,'checkpoint'));now++;await app.checkpoints.due();await Promise.all(receipts);
    for(let i=0;i<5;i++){
      const row=await bridge.read(identities[i].account.profile,0),e=expected[i];
      assert.equal(row.snapshot.world.location.x,e.x);assert.equal(row.snapshot.world.location.y,e.y);assert.equal(row.snapshot.world.location.hp,e.hp);
      assert.equal(row.snapshot.coins,e.coins);assert.equal(row.snapshot.xp,e.xp);assert.deepEqual(row.snapshot.look,e.look);assert.deepEqual(row.snapshot.inventory,e.inventory);
    }
    const guest=sessions[1],id=guest.state.id,coins=guest.game.hero.coins;guest.client.socket.close();await event(guest,'status');const resumed=event(guest,'state');await guest.connect();await resumed;assert.equal(guest.state.id,id);assert.equal(guest.state.code,code);assert.equal(guest.game.hero.coins,expected[1].coins);
    await host.command('mode',['solo']);assert.equal(room.members.size,4);assert.equal(guest.state.code,code);
    const next=bridge.writes.length;now+=AUTOSAVE_MS;await app.checkpoints.due();assert.ok(bridge.writes.length>=next+5);
  }finally{for(const s of sessions)s.client.close();await app.close();globalThis.WebSocket=Native;}
});

test('autosave capture never modifies live combat, health, loot, powers, or exact position',()=>{
  const store=new AuthorityStore(),a=new Authority(store,{capacity:5}),h=a.create('fixture',{slot:0});
  h.game.startAttack('kick');h.game.hero.y=222.75;h.game.hero.hp=43;const before=encodeRuntime(h.game);
  const save=captureProgress(h.game);assert.equal(save.world.location.y,222.75);assert.equal(save.world.location.hp,43);assert.equal(encodeRuntime(h.game),before);store.close();
});

test('disk restart resumes exact runtime and the same V3 slot; newer cloud progress is never overwritten',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'royale-v3-')),path=join(dir,'authority.sqlite'),bridge=new MemoryV3Bridge(),identity=bridge.identity('Saved Hero',1);let now=0;
  try{
    let store=new AuthorityStore(path),a=new Authority(store,{capacity:5}),c=new V3Checkpoints(a,bridge,{now:()=>now}),h=await c.open(identity.account);a.attach(h.owner,h.id,{close(){}});
    Object.assign(h.game.hero,{x:812.125,y:260.5,hp:32.25,coins:490,vy:-100,jumps:2});h.game.startAttack('punch');h.game.powers.cooldowns.fireball=4.5;
    now=8000;await c.due();const id=h.id;store.close();
    store=new AuthorityStore(path);a=new Authority(store,{capacity:5});c=new V3Checkpoints(a,bridge);h=await c.open(identity.account);
    assert.equal(h.id,id);assert.equal(h.slot,1);assert.equal(h.game.hero.y,260.5);assert.equal(h.game.hero.hp,32.25);assert.equal(h.game.powers.cooldowns.fireball,4.5);assert.equal(h.game.hero.attack.kind,'punch');
    const row=bridge.rows.get(identity.account.profile+':1');row.revision++;row.snapshot.coins=700;
    await assert.rejects(()=>c.saveHero(h),SaveConflict);assert.equal(row.snapshot.coins,700);assert.equal(h.game.hero.coins,490);assert.equal(h.cloud.conflict,true);
    const restored=await c.open(identity.account);assert.equal(restored.game.hero.coins,700);assert.equal(a.state.recoveries.get(id).game.hero.coins,490);store.close();
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('production cloud saving requires a server lease and uses the atomic RPC',async()=>{
  const profile='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',lease='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',snapshot={coins:8},calls=[];
  const bridge=new V3CloudBridge({key:'fixture-only',fetcher:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return {ok:true,json:async()=>({revision:4,snapshot})};}});
  await assert.rejects(()=>bridge.write(profile,0,3,snapshot),/lease/);
  assert.equal((await bridge.write(profile,0,3,snapshot,lease)).revision,4);
  assert.ok(calls[0].url.endsWith('/rpc/royale_v3_save_room'));assert.equal(calls[0].body.p_slot,1);assert.equal(calls[0].body.p_token,lease);
});

test('rejoining after a newer solo save keeps that save and archives the old runtime without requiring a failed write',async()=>{
  const bridge=new MemoryV3Bridge(),identity=bridge.identity('Newer Solo'),store=new AuthorityStore(),a=new Authority(store,{capacity:5}),c=new V3Checkpoints(a,bridge);
  try{
    const old=await c.open(identity.account);old.game.hero.coins=14;
    let closed=false;a.attach(old.owner,old.id,{close(code){assert.equal(code,4009);closed=true;}});
    const row=bridge.rows.get(identity.account.profile+':0');row.snapshot.coins=50;row.revision++;
    const restored=await c.open(identity.account);
    assert.equal(restored.game.hero.coins,50);assert.equal(a.state.recoveries.get(old.id).game.hero.coins,14);
    assert.equal(a.state.heroes.has(old.id),false);assert.equal(a.connections.has(old.id),false);assert.equal(closed,true);
    assert.equal(bridge.writes.length,0);
  }finally{store.close();}
});

test('a failed cloud write retries its durable checkpoint and does not stop the next eight-second checkpoint',async()=>{
  let now=0;const bridge=new MemoryV3Bridge(),identity=bridge.identity('Retry'),store=new AuthorityStore(),a=new Authority(store,{capacity:5}),c=new V3Checkpoints(a,bridge,{now:()=>now}),h=await c.open(identity.account);a.attach(h.owner,h.id,{close(){}});
  const write=bridge.write.bind(bridge);let fail=true;bridge.write=async(...args)=>{const result=await write(...args);if(fail){fail=false;throw Error('Lost response');}return result;};
  h.game.hero.coins=9;now=8000;const first=await c.due();assert.equal(first[0].status,'rejected');assert.ok(h.cloud.pending);
  h.game.hero.coins=12;now=16000;const second=await c.due();assert.equal(second[0].status,'fulfilled');assert.equal((await bridge.read(identity.account.profile,0)).snapshot.coins,12);assert.equal(h.cloud.error,null);store.close();
});

test('a reconnect read that overlaps an autosave cannot roll the hero back',async()=>{
  const bridge=new MemoryV3Bridge(),identity=bridge.identity('Concurrent Save'),store=new AuthorityStore(),a=new Authority(store,{capacity:5}),c=new V3Checkpoints(a,bridge);
  try{
    const h=await c.open(identity.account),read=bridge.read.bind(bridge);
    bridge.read=async(...args)=>{const earlier=structuredClone(await read(...args));h.game.hero.coins=42;await c.saveHero(h);return earlier;};
    const reopened=await c.open(identity.account);
    assert.equal(reopened.id,h.id);assert.equal(reopened.game.hero.coins,42);assert.equal(a.state.recoveries?.size||0,0);
  }finally{store.close();}
});

test('a save command waits for cloud confirmation even while other state frames arrive',async()=>{
  const bridge=new MemoryV3Bridge(),identity=bridge.identity('Confirmed Hero'),Native=globalThis.WebSocket;
  globalThis.WebSocket=class extends WebSocket{constructor(url){super(url,{origin:'http://localhost'});}};
  const app=startServer({capacity:5,origins:['http://localhost'],v3Bridge:bridge,autoTick:false});await once(app.server,'listening');
  const s=new GameSession({url:`ws://127.0.0.1:${app.server.address().port}/royale`,getToken:async()=>({token:identity.token,kind:'v3',slot:0}),storage:{getItem:()=>null,setItem(){}},onState(){},onError(){}});
  let release;
  try{
    const heroes=event(s,'heroes');await s.connect();const list=await heroes;const state=event(s,'state');s.select(list[0].id);await state;
    const original=bridge.write.bind(bridge);let started;const began=new Promise(r=>started=r),gate=new Promise(r=>release=r);
    bridge.write=async(...args)=>{started();await gate;return original(...args);};
    let completed=false;const command=s.command('save').then(()=>completed=true);await began;
    const next=event(s,'state');app.publish(false);await next;assert.equal(completed,false);
    release();await command;assert.equal(completed,true);
  }finally{release?.();s.client.close();await app.close();globalThis.WebSocket=Native;}
});

test('replacing a connected stale hero with newer cloud progress keeps the authority available',async()=>{
  const bridge=new MemoryV3Bridge(),identity=bridge.identity('Resumed Hero'),Native=globalThis.WebSocket;
  globalThis.WebSocket=class extends WebSocket{constructor(url){super(url,{origin:'http://localhost'});}};
  const app=startServer({capacity:5,origins:['http://localhost'],v3Bridge:bridge,autoTick:false});await once(app.server,'listening');const sessions=[];
  async function connect(){
    const s=new GameSession({url:`ws://127.0.0.1:${app.server.address().port}/royale`,getToken:async()=>({token:identity.token,kind:'v3',slot:0}),storage:{getItem:()=>null,setItem(){}},onState(){},onError(){}});sessions.push(s);
    const heroes=event(s,'heroes');await s.connect();const list=await heroes;const state=event(s,'state');s.select(list[0].id);await state;return s;
  }
  try{
    const first=await connect(),oldId=first.state.id;const closed=once(first.client.socket,'close');
    const row=bridge.rows.get(identity.account.profile+':0');row.snapshot.coins=88;row.revision++;
    const second=await connect();await closed;
    assert.notEqual(second.state.id,oldId);assert.equal(second.game.hero.coins,88);assert.equal(app.authority.failed,false);
    await second.command('save');assert.equal((await bridge.read(identity.account.profile,0)).snapshot.coins,88);
  }finally{for(const s of sessions)s.client.close();await app.close();globalThis.WebSocket=Native;}
});

test('returning to heroes requires a safe exit, saves once confirmed, and allows later solo progress to rejoin',async()=>{
  const bridge=new MemoryV3Bridge(),identity=bridge.identity('Return Hero'),store=new AuthorityStore(),a=new Authority(store,{capacity:5}),c=new V3Checkpoints(a,bridge),h=await c.open(identity.account),connection={close(){}};a.attach(h.owner,h.id,connection);
  h.game.startAttack('punch');await assert.rejects(()=>c.release(h,connection),/combat/);assert.equal(h.connected,true);assert.ok(a.connections.has(h.id));
  h.game.hero.attack=null;h.game.combatTimer=0;h.game.hero.coins=27;const result=await c.release(h,connection);
  assert.equal(result.snapshot.coins,27);assert.equal(a.state.heroes.has(h.id),false);assert.equal(a.connections.has(h.id),false);
  const row=bridge.rows.get(identity.account.profile+':0');row.snapshot.coins=31;row.revision++;
  const reopened=await c.open(identity.account);assert.equal(reopened.game.hero.coins,31);store.close();
});

test('region changes queue a fresh checkpoint behind an in-flight save in all seven regions',async()=>{
  const bridge=new MemoryV3Bridge(),identity=bridge.identity('Travel Save'),store=new AuthorityStore(),a=new Authority(store,{capacity:5}),c=new V3Checkpoints(a,bridge),h=await c.open(identity.account);
  const write=bridge.write.bind(bridge);let release,began;
  const gate=new Promise(r=>release=r),started=new Promise(r=>began=r);
  bridge.write=async(...args)=>{began();await gate;return write(...args);};
  const first=c.saveHero(h);await started;
  h.game.loadRegion(2);h.game.hero.x=312.125;const changed=c.saveHero(h,{latest:true});release();await Promise.all([first,changed]);
  assert.equal((await bridge.read(identity.account.profile,0)).snapshot.world.region,2);
  assert.equal((await bridge.read(identity.account.profile,0)).snapshot.world.location.x,312.125);
  bridge.write=write;
  for(let region=1;region<=7;region++){h.game.loadRegion(region);a.bind(h);await c.saveHero(h,{latest:true});const row=await bridge.read(identity.account.profile,0);assert.equal(row.snapshot.world.region,region);assert.ok(decodeSave(JSON.stringify(row.snapshot)));}
  store.close();
});

test('death checkpoints retain the XP penalty, restore safely, and do not alter the live death state',async()=>{
  const bridge=new MemoryV3Bridge(),identity=bridge.identity('Defeated Hero'),store=new AuthorityStore(),a=new Authority(store,{capacity:5}),c=new V3Checkpoints(a,bridge),h=await c.open(identity.account);
  h.game.hero.xp=30;h.game.defeat();const before=encodeRuntime(h.game),snapshot=captureProgress(h.game);
  assert.equal(snapshot.xp,h.game.hero.xp);assert.ok(decodeSave(JSON.stringify(snapshot)));assert.equal(encodeRuntime(h.game),before);assert.equal(h.game.hero.dead,true);
  await c.saveHero(h);assert.equal((await bridge.read(identity.account.profile,0)).snapshot.world.location.hp,100);store.close();
});

test('a release in flight rejects a duplicate connection until its final save completes',async()=>{
  const bridge=new MemoryV3Bridge(),identity=bridge.identity('Exit Race'),store=new AuthorityStore(),a=new Authority(store,{capacity:5}),c=new V3Checkpoints(a,bridge),h=await c.open(identity.account),connection={close(){}};
  a.attach(h.owner,h.id,connection);let release,began;const write=bridge.write.bind(bridge),gate=new Promise(r=>release=r),started=new Promise(r=>began=r);
  bridge.write=async(...args)=>{began();await gate;return write(...args);};
  const exit=c.release(h,connection);await started;assert.throws(()=>a.attach(h.owner,h.id,{close(){}}),/finishing a save/);release();await exit;assert.equal(a.state.heroes.has(h.id),false);store.close();
});
