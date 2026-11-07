import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {WebSocket} from 'ws';
import {Authority} from '../authority.mjs';
import {AuthorityStore} from '../store.mjs';
import {startServer} from '../server.mjs';
import {GameSession} from '../game-session.mjs';
import {splitXP,healthScale} from '../coop-rules.mjs';
import {captureProgress} from '../v3-checkpoints.mjs';
import {MemoryV3Bridge} from './v3-fixture.mjs';
import {Game,decodeSave} from '../../core.mjs';
import {TYPES} from '../../world.mjs';
import {rollEquipment} from '../../equipment.mjs';

const event=(target,name)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Timeout: '+name)),5000);target.addEventListener(name,e=>{clearTimeout(timer);resolve(e.detail);},{once:true});});
function fixture(n=5){
  let now=1000;const store=new AuthorityStore(),a=new Authority(store,{capacity:5,now:()=>now});
  const hs=Array.from({length:n},(_,i)=>{const h=a.create('owner'+i,{slot:0});a.attach(h.owner,h.id,{close(){}});return h;});
  const room=a.mode(hs[0].owner,hs[0].id,'create');for(const h of hs.slice(1))a.mode(h.owner,h.id,'join',room.code);
  if(n>=2)a.startRoom(hs[0]);return {a,store,hs,room,advance:ms=>now+=ms};
}

test('XP splits conserve every point, use stable ID ordering, and never duplicate participants',()=>{
  for(let n=2;n<=5;n++)for(let total=0;total<=501;total++){
    const ids=Array.from({length:n},(_,i)=>'hero-'+i),a=splitXP(total,ids),b=splitXP(total,[...ids].reverse().concat(ids[0]));
    assert.deepEqual(a,b);assert.equal([...a.values()].reduce((x,y)=>x+y,0),total);
    assert.ok(Math.max(...a.values())-Math.min(...a.values())<=1);
  }
  assert.deepEqual([...splitXP(100,['c','b','a']).values()],[34,33,33]);
  assert.deepEqual([...splitXP(150,['a','b','c']).values()],[50,50,50]);
});

for(let count=2;count<=5;count++)test(`${count} socket players: lobby, movement, shared combat, XP, loot race, independent 8-second saves`,async()=>{
  const Native=globalThis.WebSocket;globalThis.WebSocket=class extends WebSocket{constructor(url){super(url,{origin:'http://localhost'});}};
  let now=1000;const bridge=new MemoryV3Bridge(),sessions=[],identities=[];
  const app=startServer({capacity:5,maxConnections:8,origins:['http://localhost'],v3Bridge:bridge,autoTick:false,checkpointNow:()=>now});await once(app.server,'listening');
  app.authority.now=()=>now;
  try{
    for(let i=0;i<count;i++){
      const identity=bridge.identity('Player '+i,i%2);identities.push(identity);
      const s=new GameSession({url:`ws://127.0.0.1:${app.server.address().port}/royale`,getToken:async()=>({token:identity.token,kind:'v3',slot:i%2}),storage:{getItem:()=>null,setItem(){}},onState(){},onError(){}});sessions.push(s);
      const list=event(s,'heroes');await s.connect();const heroes=await list,ready=event(s,'state');s.select(heroes[0].id);await ready;
    }
    const host=sessions[0];await host.command('mode',['create']);const code=host.state.code;
    await assert.rejects(()=>host.command('startRoom'),/two players/);
    const hs=sessions.map((s,i)=>app.authority.owner(identities[i].account.id,s.state.id));
    const x=hs[0].game.hero.x;app.authority.input(hs[0].owner,hs[0].id,1,{move:1});app.step();assert.equal(hs[0].game.hero.x,x);
    for(const s of sessions.slice(1))await s.command('mode',['join',code]);
    await assert.rejects(()=>sessions[1].command('startRoom'),/leader/);
    await host.command('startRoom');
    for(const s of sessions){await s.command('pause',[false]);s.input({move:1,run:true});await s.command('save');}
    for(let tick=0;tick<20;tick++)app.step();
    for(const h of hs)assert.ok(h.game.hero.x>x);
    const world=hs[0].game.enemies,e=world[0];assert.equal(e.maxHp,Math.round(TYPES[e.type].hp*healthScale(count)));world.splice(1);
    for(const h of hs){Object.assign(h.game.hero,{x:e.x-40,y:e.y,face:1,invulnerable:999});h.game.random=()=>.04;e.protection=0;}
    // Use the shipped browser input packets; the server alone calculates damage.
    for(const s of sessions){s.input({punchHeld:true});await s.command('save');}
    for(let tick=0;tick<1200&&e.state!=='dead';tick++)app.step();
    assert.equal(e.state,'dead');assert.equal(e.participants.size,count);
    assert.equal(hs.reduce((sum,h)=>sum+h.game.hero.xp,0),TYPES[e.type].xp);
    const earned=hs.map(h=>h.game.hero.xp);app.authority.reward(hs[0],e);assert.deepEqual(hs.map(h=>h.game.hero.xp),earned);
    const drop=hs[0].game.loot[0];assert.ok(drop);assert.equal(hs.every(h=>h.game.loot===hs[0].game.loot),true);
    const claims=await Promise.all(sessions.map(s=>s.command('pickupLoot',[drop.id])));assert.equal(claims.filter(Boolean).length,1);
    assert.equal(hs.reduce((sum,h)=>sum+h.game.healthRoots,0),1);assert.equal(hs[0].game.loot.length,0);
    const before=bridge.writes.length;now+=7999;await app.checkpoints.due();assert.equal(bridge.writes.length,before);
    now++;await app.checkpoints.due();assert.equal(bridge.writes.length,before+count);
    for(let i=0;i<count;i++){
      const row=await bridge.read(identities[i].account.profile,i%2);assert.equal(row.snapshot.xp,earned[i]);assert.equal(row.snapshot.healthRoots,hs[i].game.healthRoots);assert.equal(row.snapshot.world.location.x,hs[i].game.hero.x);assert.ok(decodeSave(JSON.stringify(row.snapshot)));
    }
    const views=sessions.map(s=>event(s,'state'));app.publish();await Promise.all(views);
    for(const s of sessions){assert.equal(s.state.players.length,count);assert.equal(s.state.nearby.length,count-1);assert.equal(s.game.enemies[0].hp,0);}
    const room=app.authority.state.rooms.get(hs[0].room);await host.command('mode',['solo']);assert.equal(room.members.size,count-1);assert.equal(room.started,true);
  }finally{for(const s of sessions)s.client.close();await app.close();globalThis.WebSocket=Native;}
});

test('only connected damaging contributors share XP; presence, departure and replay do not earn it',()=>{
  const {a,store,hs}=fixture();try{
    const e=hs[0].game.enemies[0];e.protection=0;
    hs[0].game.damageEnemy(e,1);hs[1].game.damageEnemy(e,1);hs[2].game.damageEnemy(e,1);hs[3].game.damageEnemy(e,1);
    a.detach(hs[2].id,a.connections.get(hs[2].id));a.mode(hs[3].owner,hs[3].id,'solo');hs[0].game.damageEnemy(e,1e6);
    assert.deepEqual(hs.map(h=>h.game.hero.xp),[7,7,0,0,0]);assert.equal(e.xpAwards.size,2);
    a.reward(hs[0],e);assert.deepEqual(hs.map(h=>h.game.hero.xp),[7,7,0,0,0]);
  }finally{store.close();}
});

test('health scales with active peers, cannot be reduced mid-fight by leaving, and solo balance is restored',()=>{
  const {a,store,hs,room}=fixture(2);try{
    const e=hs[0].game.enemies[0],base=TYPES[e.type].hp;assert.equal(e.maxHp,base*2);e.protection=0;hs[0].game.damageEnemy(e,10);
    const hp=e.hp;a.detach(hs[1].id,a.connections.get(hs[1].id));a.tick();assert.equal(e.maxHp,base*2);assert.equal(e.hp,hp);
    a.mode(hs[0].owner,hs[0].id,'solo');assert.equal(hs[0].game.enemies[0].maxHp,base);assert.equal(hs[0].game.enemies[0].hp,hp/2);
    assert.ok(a.state.rooms.has(room.id));
  }finally{store.close();}
});

test('shared rolled equipment gets a collision-free personal ID, limits hold, and ground loot expires at 20 seconds',()=>{
  const {a,store,hs,room,advance}=fixture(2);try{
    const g=hs[0].game,item=rollEquipment(1,()=>.01,1),original=structuredClone(item);
    const drop={id:'loot-1',kind:'equipment',item,region:1,x:g.hero.x,y:g.hero.y,vy:0,expiresAt:21000};room.loot.push(drop);g.inventory.nextId=200;
    assert.equal(a.pickup(hs[0],drop.id),true);const received=g.inventory.items.at(-1);assert.equal(received.uid,'drop-200');assert.deepEqual({...received,uid:original.uid},original);assert.equal(a.pickup(hs[1],drop.id),false);
    for(let i=0;g.inventory.items.length<20;i++)g.inventory.items.push({...item,uid:'drop-'+(300+i)});g.inventory.nextId=1000;
    room.loot.push({...drop,id:'loot-2',item:original});assert.equal(a.pickup(hs[0],'loot-2'),false);assert.equal(room.loot.length,1);
    g.healthRoots=10;room.loot.push({...drop,id:'loot-3',kind:'root',item:null});assert.equal(a.pickup(hs[0],'loot-3'),false);assert.equal(g.healthRoots,10);
    const snapshot=captureProgress(g);assert.equal(snapshot.loot.length,0);assert.ok(decodeSave(JSON.stringify(snapshot)));
    advance(20000);a.tick();assert.equal(room.loot.length,0);
  }finally{store.close();}
});

test('lobby leadership survives creator disconnection and the room expires when empty',()=>{
  const {a,store,hs,room,advance}=fixture(2);try{
    room.started=false;a.detach(hs[0].id,a.connections.get(hs[0].id));assert.equal(a.view(hs[1].owner,hs[1].id).leader,hs[1].id);
    assert.throws(()=>a.startRoom(hs[1]),/two players/);
    a.detach(hs[1].id,a.connections.get(hs[1].id));advance(30001);a.tick();assert.equal(a.state.rooms.has(room.id),false);
  }finally{store.close();}
});
