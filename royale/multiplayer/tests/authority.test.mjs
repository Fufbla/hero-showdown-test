import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {AuthorityStore} from '../store.mjs';
import {Authority} from '../authority.mjs';
import {Game,STEP} from '../../core.mjs';
import {regionSurfaces} from '../../world.mjs';
import {encodeRuntime,decodeRuntime} from '../runtime.mjs';
import {runtimeDelta,applyRuntimeDelta} from '../delta.mjs';
import {ROOM_CODE,inputPacket} from '../protocol.mjs';
import {legendaryFixture} from './legendary-fixture.mjs';
import {RESPAWN} from '../../progression.mjs';
const fixture=(capacity=32)=>{
  const store=new AuthorityStore(),a=new Authority(store,{allowLegacyImport:true,capacity,maxConnections:capacity*2}),ws=()=>({close(){}});
  const add=(owner,legacy=null)=>{const h=a.create(owner,{slot:0,legacy,sourceId:legacy?`fixture-${owner}`:null,confirmed:!!legacy});a.attach(owner,h.id,ws());return h;};
  return {a,store,add};
};
const advance=(a,n=1)=>{for(let i=0;i<n;i++)a.tick();};
function together(a,heroes){const r=a.mode(heroes[0].owner,heroes[0].id,'create');for(const h of heroes.slice(1))a.mode(h.owner,h.id,'join',r.code);a.command(heroes[0].owner,heroes[0].id,1,'startRoom');return r;}
test('fresh heroes, no occupied-slot replacement; imported saves once, never overwrite',()=>{
  const {a,store,add}=fixture();const h=add('owner');assert.equal(h.game.hero.level,1);
  assert.throws(()=>a.create('owner',{slot:0}),/already/);
  const save=JSON.parse(new Game().save());save.coins=42;
  const imported=a.create('owner',{slot:1,legacy:save,sourceId:'browser-save-01',confirmed:true});assert.equal(imported.game.hero.coins,42);
  assert.throws(()=>a.create('other',{slot:0,legacy:save,sourceId:'browser-save-01',confirmed:true}),/already/);
  assert.throws(()=>a.create('owner',{slot:1,legacy:save,sourceId:'different-save-01',confirmed:true}),/already/);store.close();
});
test('room codes, ownership, capacity and creator independence',()=>{
  const {a,store,add}=fixture(4),hs=Array.from({length:5},(_,i)=>add('owner-'+i));const r=together(a,hs.slice(0,4));
  assert.match(r.code,ROOM_CODE);assert.throws(()=>a.mode(hs[4].owner,hs[4].id,'join',r.code),/capacity/);
  assert.throws(()=>a.mode('imposter',hs[0].id,'solo'),/account/);
  assert.throws(()=>a.mode(hs[0].owner,hs[0].id,'join','invalid'),/six-digit/);
  const enemy=hs[1].game.enemies[0];a.mode(hs[0].owner,hs[0].id,'solo');advance(a,60);
  assert.equal(a.state.rooms.get(r.id),r);assert.equal(r.members.size,3);assert.equal(hs[1].game.enemies[0],enemy);assert.equal(hs[2].room,r.id);store.close();
});
test('network inputs cannot claim damage, coordinates, rewards or extra ability slots',()=>{
  for(const raw of [{x:5000},{damage:999999},{coins:100},{move:Infinity},{move:2},{powers:[false,false,false,false,true]},{jump:1}])assert.throws(()=>inputPacket(raw));
  assert.equal(inputPacket({move:-1,jump:true}).jump,true);
});
test('replayed input does not double jump; idle input expires; server controls movement',()=>{
  let now=1000;const store=new AuthorityStore(),a=new Authority(store,{allowLegacyImport:true,capacity:8,now:()=>now});const h=a.create('one',{slot:0});a.attach('one',h.id,{close(){}});
  a.input('one',h.id,1,{move:1,jump:true});a.tick();assert.equal(h.game.hero.jumps,1);
  assert.equal(a.input('one',h.id,1,{jump:true}),false);a.tick();assert.equal(h.game.hero.jumps,1);
  a.input('one',h.id,2,{jump:true});a.tick();assert.equal(h.game.hero.jumps,2);now+=500;advance(a,30);assert.equal(h.game.hero.vx,0);store.close();
});
test('same shared enemy takes independently validated attacks; contributors split XP and keep individual drops once',()=>{
  const {a,store,add}=fixture(),hs=[add('a'),add('b')];together(a,hs);
  const e=hs[0].game.enemies[0];assert.equal(e,hs[1].game.enemies[0]);e.protection=0;
  for(const h of hs){Object.assign(h.game.hero,{x:e.x-40,y:e.y,face:1,invulnerable:100});h.game.random=()=>.99;}
  const before=hs.map(h=>({xp:h.game.hero.xp,coins:h.game.hero.coins}));
  for(let tick=0;tick<180&&e.state!=='dead';tick++){for(const h of hs)a.input(h.owner,h.id,tick+1,{punchHeld:true});a.tick();}
  assert.equal(e.state,'dead');assert.equal(e.participants.size,2);
  for(let i=0;i<2;i++){assert.equal(hs[i].game.hero.coins-before[i].coins,1);assert.equal(hs[i].game.hero.xp-before[i].xp,7);}
  a.reward(hs[0],e);assert.equal(hs[0].game.hero.coins,1);assert.equal(hs[1].game.hero.coins,1);store.close();
});
test('multiplayer and solo mode preserve exact elevated platform, HP, progression and equipment',()=>{
  const {a,store,add}=fixture(),h=add('hero',legendaryFixture());const g=h.game;
  const surface=regionSurfaces(7).filter(s=>s.oneWay).at(-1);Object.assign(g.hero,{x:surface.x+surface.w*.6,y:surface.y,face:-1,hp:432.25});
  const expected={x:g.hero.x,y:g.hero.y,hp:g.hero.hp,face:g.hero.face,inventory:structuredClone(g.inventory),powers:structuredClone(g.powers.data),level:g.hero.level};
  a.mode(h.owner,h.id,'create');a.mode(h.owner,h.id,'solo');
  assert.deepEqual({x:h.game.hero.x,y:h.game.hero.y,hp:h.game.hero.hp,face:h.game.hero.face,inventory:h.game.inventory,powers:h.game.powers.data,level:h.game.hero.level},expected);store.close();
});
test('runtime graph roundtrip preserves shared references, sets, powers, projectiles and combat timers',()=>{
  const {a,store,add}=fixture(),hs=[add('a'),add('b')];together(a,hs);hs[0].game.startAttack('punch');hs[0].game.hero.attack.targets.add(3);hs[0].game.hero.hp=56.5;
  const restored=decodeRuntime(encodeRuntime(a.state)),[one,two]=[...restored.heroes.values()];assert.equal(one.game.enemies,two.game.enemies);assert.ok(one.game instanceof Game);assert.equal(one.game.powers.game,one.game);assert.ok(one.game.hero.attack.targets.has(3));assert.equal(one.game.hero.hp,56.5);store.close();
});
test('disk restart retains confirmed position and inventory; a second writer is fenced',()=>{
  const dir=mkdtempSync(join(tmpdir(),'royale-authority-')),path=join(dir,'world.sqlite');
  try{const first=new AuthorityStore(path),a=new Authority(first,{capacity:8}),h=a.create('a',{slot:0});h.game.hero.x=711.125;h.game.hero.hp=73;h.game.hero.coins=21;a.commit();const id=h.id;
    const competitor=new AuthorityStore(path);a.commit();assert.throws(()=>competitor.commit(competitor.initial),/superseded/);competitor.close();first.close();
    const reopened=new AuthorityStore(path),b=new Authority(reopened,{capacity:8}),r=b.owner('a',id);assert.equal(r.game.hero.x,711.125);assert.equal(r.game.hero.hp,73);assert.equal(r.game.hero.coins,21);assert.equal(r.connected,false);reopened.close();
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('reconnect replaces one entity; stale connection close cannot remove replacement',()=>{
  const {a,store,add}=fixture(),h=add('a'),old=a.connections.get(h.id),next={close(){}};a.attach('a',h.id,next);a.detach(h.id,old);assert.equal(h.connected,true);assert.equal(a.connections.size,1);a.detach(h.id,next);assert.equal(h.connected,false);store.close();
});
test('ordered command retry is idempotent, conflicting payload and old sequence rejected',()=>{
  const {a,store,add}=fixture(),h=add('a');const result=a.command('a',h.id,1,'mode',['create']);const count=a.state.rooms.size;
  assert.deepEqual(a.command('a',h.id,1,'mode',['create']),result);assert.equal(a.state.rooms.size,count);
  assert.throws(()=>a.command('a',h.id,1,'mode',['solo']),/conflict/);assert.throws(()=>a.command('a',h.id,3,'mode',['solo']),/conflict/);
  assert.throws(()=>a.command('a',h.id,2,'gainXP',[9999]),/Unsupported/);store.close();
});
test('interest management hides distant regions and other inventories and account identifiers',()=>{
  const {a,store,add}=fixture(),hs=[add('private-owner-a'),add('private-owner-b')];together(a,hs);assert.equal(a.view(hs[0].owner,hs[0].id).nearby.length,1);
  a.command(hs[1].owner,hs[1].id,1,'travel',[2]);const v=a.view(hs[0].owner,hs[0].id);assert.equal(v.nearby.length,0);assert.equal(v.players.length,2);assert.equal(JSON.stringify(v).includes('private-owner-b'),false);store.close();
});
test('graph delta reconstructs exact state after movement and variable-length projectile arrays',()=>{
  const g=new Game();const one=runtimeDelta(null,encodeRuntime(g));g.step(STEP,{jump:true,punch:true});const two=runtimeDelta(one.next,encodeRuntime(g));assert.deepEqual(applyRuntimeDelta(one.next,two.delta),two.next);
  assert.ok(JSON.stringify(two.delta).length<encodeRuntime(g).length/4);
});
test('shared enemy respawn respects every nearby hero, not only the nearest Euclidean target',()=>{
  const {a,store,add}=fixture(),hs=[add('a'),add('b')],r=together(a,hs),w=[...r.worlds.values()][0],e=w.enemies[0];
  Object.assign(e,{state:'dead',hp:0,respawn:0,rewarded:true});
  Object.assign(hs[0].game.hero,{x:e.spawnX+RESPAWN.safeDistance+1,y:e.spawnSurface.y});
  Object.assign(hs[1].game.hero,{x:e.spawnX+RESPAWN.safeDistance-1,y:e.spawnSurface.y+159});
  a.stepWorld(r,w);assert.equal(e.state,'dead');hs[1].game.hero.x+=500;a.stepWorld(r,w);assert.equal(e.state,'patrol');store.close();
});
