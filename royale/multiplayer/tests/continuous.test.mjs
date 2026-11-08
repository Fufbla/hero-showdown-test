import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {startServer} from '../server.mjs';

test('continuous authority publishes at 20 Hz without increasing the periodic disk-save cadence',async()=>{
  const app=startServer({autoTick:false});await once(app.server,'listening');
  try{
    const revision=app.authority.store.revision;
    for(let n=0;n<60;n++)app.step();
    assert.equal(app.metrics().frames,20);
    assert.equal(app.authority.store.revision-revision,10);
    assert.equal(app.metrics().snapshotHz,20);
  }finally{await app.close();}
  assert.throws(()=>startServer({snapshotHz:17}),/snapshotHz/);
});

test('continuous authority retains equal mixed-level XP, deduplication and host succession',async()=>{
  const app=startServer({autoTick:false});await once(app.server,'listening');const a=app.authority;
  try{
    const heroes=[0,1].map(i=>{const h=a.create('fixture-'+i,{slot:0});a.attach(h.owner,h.id,{close(){}});return h;});
    const [host,guest]=heroes,room=a.mode(host.owner,host.id,'create');a.mode(guest.owner,guest.id,'join',room.code);a.command(host.owner,host.id,1,'startRoom');
    host.game.hero.level=8;
    const enemy=host.game.enemies[0],hp=enemy.maxHp;enemy.protection=0;
    host.game.damageEnemy(enemy,hp/2+1);assert.ok(enemy.hp<hp&&enemy.hp>0);assert.equal(guest.game.enemies[0],enemy);
    guest.game.damageEnemy(enemy,hp/2+1);assert.equal(enemy.maxHp,hp);assert.deepEqual(heroes.map(h=>h.game.hero.xp),[7,7]);
    a.reward(host,enemy);assert.deepEqual(heroes.map(h=>h.game.hero.xp),[7,7]);
    a.detach(host.id,a.connections.get(host.id));assert.equal(a.view(guest.owner,guest.id).phase,'playing');
    assert.equal(a.state.rooms.get(guest.room).hostId,guest.id);
  }finally{await app.close();}
});
