import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {Authority} from '../authority.mjs';
import {AuthorityStore} from '../store.mjs';
import {encodeRuntime} from '../runtime.mjs';
import {Game,xpForLevel} from '../../core.mjs';
import {TYPES} from '../../world.mjs';
import {monsterXP} from '../../progression.mjs';
import {BOSSES} from '../../boss-data.mjs';
import {V3Checkpoints} from '../v3-checkpoints.mjs';
import {MemoryV3Bridge} from './v3-fixture.mjs';

function fixture(n=2,path=':memory:'){
  const store=new AuthorityStore(path);let now=1000;
  const a=new Authority(store,{capacity:5,maxConnections:8,now:()=>now});
  const heroes=Array.from({length:n},(_,i)=>{const h=a.create('owner-'+i,{slot:0});a.attach(h.owner,h.id,{close(){}});h.game.random=()=>.99;return h;});
  const room=a.mode(heroes[0].owner,heroes[0].id,'create');
  for(const h of heroes.slice(1))a.mode(h.owner,h.id,'join',room.code);
  return {a,store,heroes,room,advance(ms){now+=ms;}};
}
const start=(a,h)=>a.command(h.owner,h.id,h.commandSeq+1,'startRoom');
function defeat(heroes,index=0){
  const e=heroes[0].game.enemies[index];e.protection=0;
  for(const h of heroes)h.game.damageEnemy(e,e.maxHp/heroes.length+1,{stagger:false});
  assert.equal(e.state,'dead');return e;
}
const xpTotal=g=>{let xp=g.hero.xp;for(let l=1;l<g.hero.level;l++)xp+=xpForLevel(l);return xp;};

test('lobby freezes movement, damage and enemies; only a connected host can start with two players',()=>{
  const {a,store,heroes:[host],room}=fixture(1);
  try{
    const before=encodeRuntime(host.game);
    a.input(host.owner,host.id,1,{move:1,punchHeld:true,jump:true});
    for(let i=0;i<120;i++)a.tick();
    assert.equal(encodeRuntime(host.game),before);
    assert.equal(a.view(host.owner,host.id).canStart,false);
    assert.throws(()=>start(a,host),/At least two/);
    assert.throws(()=>a.command(host.owner,host.id,1,'travel',[2]),/Wait for/);
    assert.equal(a.command(host.owner,host.id,1,'save').ok,true);
    const guest=a.create('guest',{slot:0});a.attach(guest.owner,guest.id,{close(){}});a.mode(guest.owner,guest.id,'join',room.code);
    assert.equal(a.view(host.owner,host.id).canStart,true);
    assert.throws(()=>start(a,guest),/Only the room/);
    a.detach(guest.id,a.connections.get(guest.id));assert.throws(()=>start(a,host),/At least two/);
    a.attach(guest.owner,guest.id,{close(){}});start(a,host);assert.equal(room.phase,'playing');
    a.tick();assert.equal(host.game.hero.jumps,0);assert.equal(host.game.hero.attack,null);
    const x=host.game.hero.x;a.input(host.owner,host.id,2,{move:1,run:true});for(let i=0;i<20;i++)a.tick();assert.ok(host.game.hero.x>x);
  }finally{store.close();}
});

test('host succession on disconnect and leave keeps a waiting room startable and an active room playing',()=>{
  const {a,store,heroes:[host,next,last],room}=fixture(3);
  try{
    a.detach(host.id,a.connections.get(host.id));assert.equal(room.hostId,next.id);assert.equal(a.view(next.owner,next.id).canStart,true);
    a.attach(host.owner,host.id,{close(){}});assert.equal(room.hostId,next.id);
    a.mode(next.owner,next.id,'solo');assert.equal(room.hostId,host.id);
    start(a,host);a.mode(host.owner,host.id,'solo');assert.equal(room.hostId,last.id);assert.equal(room.phase,'playing');
    const x=last.game.hero.x;a.input(last.owner,last.id,1,{move:1});a.tick();assert.ok(last.game.hero.x>x);
  }finally{store.close();}
});

for(const count of [2,3,4,5])test(`${count} contributors divide one monster XP pool without loss or duplicated rewards`,()=>{
  const {a,store,heroes,room}=fixture(count);
  try{
    start(a,heroes[0]);const before=heroes.map(h=>xpTotal(h.game)),e=defeat(heroes),pool=TYPES[e.type].xp;
    const gains=heroes.map((h,i)=>xpTotal(h.game)-before[i]);
    assert.equal(gains.reduce((s,x)=>s+x,0),pool);assert.ok(Math.max(...gains)-Math.min(...gains)<=1);
    for(let i=0;i<count;i++){assert.equal(heroes[i].game.events.findLast(e=>e.type==='reward').xp,gains[i]);assert.equal(heroes[i].game.hero.coins,1);}
    a.reward(heroes[0],e);assert.deepEqual(heroes.map(h=>xpTotal(h.game)-before[heroes.indexOf(h)]),gains);
    assert.equal(room.xpTurn,1);
  }finally{store.close();}
});

test('idle teammates and contributors in another zone receive no XP; solo kills retain full XP',()=>{
  const {a,store,heroes}=fixture(4);
  try{
    start(a,heroes[0]);const e=heroes[0].game.enemies[0];e.protection=0;
    heroes[2].game.damageEnemy(e,1);heroes[2].game.combatTimer=0;assert.equal(a.command(heroes[2].owner,heroes[2].id,1,'travel',[2]),true);
    for(const h of heroes.slice(0,2))h.game.damageEnemy(e,e.maxHp/2+1);
    assert.deepEqual(heroes.map(h=>h.game.hero.xp),[7,7,0,0]);
    const before=xpTotal(heroes[0].game),alone=defeat([heroes[0]],1);assert.equal(xpTotal(heroes[0].game)-before,TYPES[alone.type].xp);
  }finally{store.close();}
});

test('split XP preserves existing personal level penalties, level-ups and Power Points',()=>{
  const {a,store,heroes}=fixture(2);
  try{
    start(a,heroes[0]);heroes[0].game.hero.xp=xpForLevel(1)-3;heroes[1].game.hero.level=8;
    const points=heroes[0].game.powers.data.points,e=defeat(heroes);
    assert.equal(heroes[0].game.hero.level,2);assert.equal(heroes[0].game.hero.xp,4);assert.equal(heroes[0].game.powers.data.points,points+1);
    assert.equal(heroes[1].game.hero.xp,Math.floor(monsterXP(TYPES[e.type].xp,8,e.level)/2));
  }finally{store.close();}
});

test('briefly disconnected contributors retain their share; expired connections do not',()=>{
  const {a,store,heroes,advance}=fixture(3);
  try{
    start(a,heroes[0]);const e=heroes[0].game.enemies[0];e.protection=0;
    for(const h of heroes.slice(1))h.game.damageEnemy(e,1);
    a.detach(heroes[2].id,a.connections.get(heroes[2].id));advance(30001);
    a.detach(heroes[1].id,a.connections.get(heroes[1].id));heroes[0].game.damageEnemy(e,e.maxHp);
    assert.deepEqual(heroes.map(h=>h.game.hero.xp),[7,7,0]);
  }finally{store.close();}
});

test('lobby/start and reward allocation survive a durable server restart without duplicate XP',()=>{
  const dir=mkdtempSync(join(tmpdir(),'royale-lobby-')),path=join(dir,'authority.sqlite');let store;
  try{
    let f=fixture(3,path);store=f.store;f.a.commit();const ids=f.heroes.map(h=>h.id),roomId=f.room.id;store.close();
    store=new AuthorityStore(path);let a=new Authority(store,{capacity:5});const hs=ids.map(id=>a.state.heroes.get(id));for(const h of hs)a.attach(h.owner,h.id,{close(){}});
    assert.equal(a.state.rooms.get(roomId).phase,'lobby');start(a,hs[0]);const e=defeat(hs);a.commit();const gains=hs.map(h=>h.game.hero.xp),enemyId=e.id;store.close();
    store=new AuthorityStore(path);a=new Authority(store,{capacity:5});const host=a.state.heroes.get(ids[0]);
    assert.equal(a.state.rooms.get(roomId).phase,'playing');assert.equal(a.state.rooms.get(roomId).xpTurn,1);
    a.reward(host,host.game.enemies.find(e=>e.id===enemyId));assert.deepEqual(ids.map(id=>a.state.heroes.get(id).game.hero.xp),gains);
  }finally{store?.close();rmSync(dir,{recursive:true,force:true});}
});

test('regional boss contributors split XP while each keeps their chest and victory record',()=>{
  const {a,store,heroes,room}=fixture(2);
  try{
    start(a,heroes[0]);for(const h of heroes){h.game.hero.level=10;h.game.hero.xp=0;assert.equal(h.game.enterBoss(),true);a.bind(h);}
    const world=room.worlds.get(heroes[0].zone),boss=world.fight.boss;
    boss.participants=new Set(heroes.map(h=>h.id));for(const e of world.enemies){e.hp=0;e.state='dead';}
    a.completeWorld(room,world);
    const pool=monsterXP(BOSSES[1].xp,10,BOSSES[1].level);assert.equal(heroes.reduce((n,h)=>n+h.game.hero.xp,0),pool);
    for(const h of heroes){assert.equal(h.game.bossProgress.records[1].wins,1);assert.equal(h.game.bossProgress.records[1].chest.state,'available');}
  }finally{store.close();}
});

test('eight-second cloud checkpoints save lobby heroes and split XP to each selected slot',async()=>{
  let now=1000;const bridge=new MemoryV3Bridge(),store=new AuthorityStore(),a=new Authority(store,{capacity:5}),c=new V3Checkpoints(a,bridge,{now:()=>now});
  try{
    const identities=[bridge.identity('Host'),bridge.identity('Guest')],heroes=[];
    for(const i of identities){const h=await c.open(i.account);a.attach(h.owner,h.id,{close(){}});heroes.push(h);}
    const room=a.mode(heroes[0].owner,heroes[0].id,'create');a.mode(heroes[1].owner,heroes[1].id,'join',room.code);
    now+=8000;await c.due();assert.equal(bridge.writes.length,2);assert.equal(room.phase,'lobby');
    start(a,heroes[0]);defeat(heroes);now+=8000;await c.due();
    for(const i of identities)assert.equal((await bridge.read(i.account.profile,0)).snapshot.xp,7);
  }finally{store.close();}
});
