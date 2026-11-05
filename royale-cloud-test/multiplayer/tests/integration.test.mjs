import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {AuthorityStore} from '../store.mjs';
import {Authority} from '../authority.mjs';
import {startServer} from '../server.mjs';
import {MultiplayerClient} from '../client.mjs';
import {MemoryMigrationBridge} from './migration-fixture.mjs';
import {GameSession,MIGRATION_KEY} from '../game-session.mjs';
import {connect} from './socket-helper.mjs';
import {Game} from '../../core.mjs';
import {WebSocket as NodeWebSocket} from 'ws';
const event=(target,name)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Timed out: '+name)),5000);target.addEventListener(name,e=>{clearTimeout(timer);resolve(e.detail);},{once:true});});
// Same shipped browser transport and session adapter, independent authenticated
// sockets; this complements browser testing, not a substitute for mobile Safari.
test('actual game session: migration, room creation/join, creator exit, reconnect, exact solo location',async()=>{
 const nativeCrypto=Object.getOwnPropertyDescriptor(globalThis,'crypto');Object.defineProperty(globalThis,'crypto',{configurable:true,value:{getRandomValues:globalThis.crypto.getRandomValues.bind(globalThis.crypto)}});
 const Native=globalThis.WebSocket;globalThis.WebSocket=class extends NodeWebSocket{constructor(url){super(url,{origin:'http://localhost'});}};
 const app=startServer({capacity:4,origins:['http://localhost'],autoTick:false,migrationBridge:new MemoryMigrationBridge(),authenticate:async id=>({id,expiresAt:Date.now()+3600000})});await once(app.server,'listening');
 const url=`ws://127.0.0.1:${app.server.address().port}/royale`,sessions=[];
 try{
 for(const name of ['One','Two']){const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)},s=new GameSession({url,getToken:async()=>name,storage,onState(){},onError(){}});sessions.push(s);const connected=event(s,'heroes');await s.connect();await connected;
 const g=new Game({look:{name}}),local={id:'source-'+name,snapshot:JSON.parse(g.save())},preview=await s.migrate(local,0);assert.equal(JSON.parse(map.get(MIGRATION_KEY))[local.id].status,'review');const restored=event(s,'state');await s.confirmMigration(preview.ticket);await restored;assert.equal(s.game.look.name,name);assert.equal(JSON.parse(map.get(MIGRATION_KEY))[local.id].backup.snapshot.coins,0);
 }
 const [a,b]=sessions;await a.command('mode',['create']);const code=a.state.code;await b.command('mode',['join',code]);app.publish();assert.equal(b.state.code,code);
 const h=app.authority.owner('One',a.state.id);h.game.hero.x=882.25;h.game.hero.y=360;h.game.hero.hp=47;h.game.hero.coins=51;h.game.hero.grounded=true;app.publish();await event(a,'state');
 await a.command('mode',['solo']);assert.equal(a.state.code,null);assert.equal(a.game.hero.x,882.25);assert.equal(a.game.hero.y,360);assert.equal(a.game.hero.hp,47);assert.equal(a.game.hero.coins,51);assert.equal(app.authority.state.rooms.get(app.authority.owner('Two',b.state.id).room).code,code);
 await a.command('mode',['join',code]);a.client.socket.close();await event(a.client,'status');const reconnected=event(a,'state');await a.connect();await reconnected;assert.equal(app.authority.connections.size,2);assert.equal(a.game.hero.coins,51);
 }finally{for(const s of sessions)s.client.close();await app.close();globalThis.WebSocket=Native;Object.defineProperty(globalThis,'crypto',nativeCrypto);}
});
test('overlapping roots remain attached when a different caster disconnects or switches modes',()=>{
 const store=new AuthorityStore(),a=new Authority(store,{capacity:4}),one=a.create('a',{slot:0}),two=a.create('b',{slot:0}),ca={close(){}},cb={close(){}};a.attach('a',one.id,ca);a.attach('b',two.id,cb);const room=a.mode('a',one.id,'create');a.mode('b',two.id,'join',room.code);
 const e=one.game.enemies[0];for(const h of [one,two])h.game.powers.active.roots={targets:[e.id],cooldown:10,age:0};e.rooted=true;a.detach(one.id,ca);assert.equal(e.rooted,true);a.mode('b',two.id,'solo');assert.equal(e.rooted,false);assert.equal(two.game.powers.cooldowns.roots,10);store.close();
});
test('protocol mismatches are rejected before selecting or changing a hero',async()=>{
 const app=startServer({capacity:2,origins:['http://localhost'],autoTick:false,authenticate:async id=>({id,expiresAt:Date.now()+3600000})});await once(app.server,'listening');
 const ws=new NodeWebSocket(`ws://127.0.0.1:${app.server.address().port}/royale`,{origin:'http://localhost'});await once(ws,'open');const message=once(ws,'message');ws.send(JSON.stringify({type:'auth',token:'a',protocol:1}));const response=JSON.parse((await message)[0]);assert.equal(response.fatal,true);assert.match(response.message,/version mismatch/);assert.equal(app.authority.state.heroes.size,0);ws.terminate();await app.close();
});


test('a shared pounce can contact each hero once on different ticks',()=>{
 const store=new AuthorityStore(),a=new Authority(store,{capacity:4}),one=a.create('a',{slot:0}),two=a.create('b',{slot:0});
 try{
  a.attach('a',one.id,{close(){}});a.attach('b',two.id,{close(){}});const room=a.mode('a',one.id,'create');a.mode('b',two.id,'join',room.code);
  const world=room.worlds.get(one.zone),e=world.enemies[0];world.enemies.splice(1);
  Object.assign(e,{x:400,y:400,airborne:true,pouncing:true,airVx:0,vy:0,hit:false,state:'strike',protection:0});
  for(const h of [one,two])Object.assign(h.game.hero,{x:h===one?400:700,y:400,invulnerable:0});
  const before=one.game.hero.hp;a.stepWorld(room,world);assert.ok(one.game.hero.hp<before);assert.equal(two.game.hero.hp,before);
  Object.assign(one.game.hero,{x:700,invulnerable:0});Object.assign(two.game.hero,{x:400,invulnerable:0});a.stepWorld(room,world);assert.ok(two.game.hero.hp<before);
  const health=two.game.hero.hp;two.game.hero.invulnerable=0;a.stepWorld(room,world);assert.equal(two.game.hero.hp,health);assert.equal(e.hitHeroes.size,2);
 }finally{store.close();}
});

test('a transferred local tab cannot spend or equip against its retained backup',async()=>{
 const {InstantPowerUpgrades}=await import('../../power-upgrades.mjs');let writes=0;
 const u=new InstantPowerUpgrades(()=>({blocked:true,game:new Game(),store:{writeSlot(){writes++;}}}));
 assert.equal((await u.spend('fireball')).ok,false);assert.equal((await u.equip(0,'fireball')).ok,false);assert.equal(writes,0);
});
