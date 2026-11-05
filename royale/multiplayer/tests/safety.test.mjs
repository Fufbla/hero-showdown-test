import {CORRECTION_FILES,assertCombatCorrectionScope} from '../../tests/player-corrections-preservation.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {AuthorityStore} from '../store.mjs';
import {Authority} from '../authority.mjs';
import {Game} from '../../core.mjs';
import {decodeRuntime,encodeRuntime} from '../runtime.mjs';
const BASE='defec8c3d66a8a12cef9bf22d49eeccd835e6ce6';
test('production defaults reject client-supplied legacy progression until verified migration exists',()=>{
  const store=new AuthorityStore(),a=new Authority(store,{capacity:16});
  assert.throws(()=>a.create('a',{slot:0,legacy:JSON.parse(new Game().save()),sourceId:'untrusted-local-save',confirmed:true}),/verified account migration/);
  assert.equal(a.list('a').length,0);store.close();
});
test('approved artwork, balance, simulation and legacy save implementation are byte-identical',()=>{
  const paths=execFileSync('git',['diff','--name-only',BASE],{cwd:new URL('../../../',import.meta.url),encoding:'utf8'}).trim().split('\n').filter(Boolean);
  const integration=new Set(['royale/tests/final-mobile.mjs','royale/release-config.mjs', 'royale/multiplayer-gate.mjs', 'royale/tools/build-solo.mjs', 'royale/tests/solo-release.test.mjs', 'royale/SOLO-DEPLOYMENT.md','royale/app.mjs','royale/index.html','royale/eris-ui.mjs','royale/journey-menu.mjs','royale/legendary-ui.mjs','royale/power-menu.mjs','royale/power-upgrades.mjs','royale/tools/build-playtest.mjs','royale/tests/final-preservation.mjs','royale/backend/supabase/migrations/20261104161434_royale_multiplayer_fence.sql']);
  assertCombatCorrectionScope();
  assert.deepEqual(paths.filter(p=>!p.startsWith('royale/multiplayer/')&&!integration.has(p)&&!CORRECTION_FILES.has(p)),[]);
  assert.deepEqual(paths.filter(p=>/\.(png|webp|jpg|svg)$/.test(p)&&!p.startsWith('royale/multiplayer/qa/browser/')),[]);
});
test('combat, current health, cooldowns and exact midair position persist without a safe-save restriction',()=>{
  const store=new AuthorityStore(),a=new Authority(store,{allowLegacyImport:true,capacity:16}),h=a.create('hero',{slot:0});a.attach('hero',h.id,{close(){}});
  h.game.hero.hp=37.5;h.game.hero.x=620.75;h.game.hero.y=350.125;h.game.hero.vy=-140;h.game.hero.grounded=false;h.game.hero.jumps=2;h.game.startAttack('punch');h.game.powers.cooldowns.fireball=3.25;
  assert.equal(h.game.save(),null);a.commit();const restored=decodeRuntime(encodeRuntime(a.state)),g=restored.heroes.get(h.id).game;
  for(const key of ['x','y','hp','vy','jumps'])assert.equal(g.hero[key],h.game.hero[key]);assert.equal(g.powers.cooldowns.fireball,3.25);assert.equal(g.hero.attack.kind,'punch');store.close();
});
test('disconnect grace expires into solo only for the disconnected hero',()=>{
  let now=1000;const store=new AuthorityStore(),a=new Authority(store,{allowLegacyImport:true,capacity:16,now:()=>now,graceMs:1000});const one=a.create('a',{slot:0}),two=a.create('b',{slot:0});const c={close(){}};a.attach('a',one.id,c);a.attach('b',two.id,{close(){}});const room=a.mode('a',one.id,'create');a.mode('b',two.id,'join',room.code);a.detach(one.id,c);now+=500;a.tick();assert.equal(one.room,room.id);now+=501;a.tick();assert.notEqual(one.room,room.id);assert.equal(two.room,room.id);assert.equal(room.members.size,1);store.close();
});
test('solo pause freezes enemies; pausing in a shared room cannot pause other heroes',()=>{
  const store=new AuthorityStore(),a=new Authority(store,{allowLegacyImport:true,capacity:16}),one=a.create('a',{slot:0}),two=a.create('b',{slot:0});a.attach('a',one.id,{close(){}});a.attach('b',two.id,{close(){}});
  a.command('a',one.id,1,'pause',[true]);const age=one.game.enemies[0].age;a.tick();assert.equal(one.game.enemies[0].age,age);
  const room=a.mode('a',one.id,'create');a.mode('b',two.id,'join',room.code);const prior=one.game.enemies[0].age,invulnerable=one.game.hero.invulnerable;a.tick();assert.ok(one.game.enemies[0].age>prior);assert.ok(one.game.hero.invulnerable<invulnerable);assert.equal(one.game.paused,true);store.close();
});
test('duplicate creation/import requests cannot mint extra heroes in an occupied slot',()=>{
  const store=new AuthorityStore(),a=new Authority(store,{allowLegacyImport:true,capacity:16}),save=JSON.parse(new Game().save());
  a.create('a',{slot:0,legacy:save,sourceId:'source-unique',confirmed:true});
  for(let i=0;i<10;i++)assert.throws(()=>a.create('a',{slot:0,legacy:save,sourceId:'source-other-'+i,confirmed:true}));
  assert.equal(a.list('a').length,1);store.close();
});
