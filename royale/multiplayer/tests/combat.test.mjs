import test from 'node:test';
import assert from 'node:assert/strict';
import {AuthorityStore} from '../store.mjs';
import {Authority} from '../authority.mjs';
import {legendaryFixture} from './legendary-fixture.mjs';
import {LEGENDARY} from '../../legendary-data.mjs';
import {Game} from '../../core.mjs';
import {initialBossProgress} from '../../boss-state.mjs';
import {BOSSES} from '../../boss-data.mjs';
function encounter(region,legendary=null) {
  const store=new AuthorityStore(),a=new Authority(store,{allowLegacyImport:true,capacity:16});
  const hs=[0,1].map(n=>{const save=legendaryFixture();if(!legendary){save.world.bossVictories=[];save.bossProgress=initialBossProgress([]);}const h=a.create('owner'+n,{slot:0,legacy:save,sourceId:'boss-fixture-'+n,confirmed:true});a.attach(h.owner,h.id,{close(){}});h.game.travel(region);return h;});
  const room=a.mode(hs[0].owner,hs[0].id,'create');a.mode(hs[1].owner,hs[1].id,'join',room.code);a.startRoom(hs[0]);
  for(const h of hs){if(legendary)assert.equal(h.game.enterLegendary(legendary),true);else assert.equal(h.game.enterBoss(),true);a.bind(h);h.game.hero.invulnerable=10000;}
  return {store,a,hs,boss:hs[0].game.arenaScene.boss,room};
}
for(let region=1;region<=7;region++)test(`regional boss ${region}: shared phases, server-validated attacks, individual chest ownership`,()=>{
  const {store,a,hs,boss}=encounter(region);const phases=new Set();
  try{
    assert.equal(boss,hs[1].game.arenaScene.boss);
    for(let tick=0;tick<5000&&!hs[0].game.arenaScene.cleared;tick++){
      // Late encounters use the fixture's owned brawler powers. Keep basic
      // attacks on early bosses so this level-99 fixture observes every phase.
      for(const h of hs){const target=h.game.enemies.find(e=>e.state!=='dead');if(target){Object.assign(h.game.hero,{x:target.x+(target.x<320?40:-40),y:target.y,face:target.x<320?-1:1,vx:0,vy:0});const usePowers=region>=4,ready=usePowers&&['strength','superKick'].some(id=>h.game.powers.ready(id));a.input(h.owner,h.id,tick+1,{punchHeld:!ready,powers:[usePowers,usePowers,false]});}}
      a.tick();phases.add(boss.phase);
    }
    assert.equal(boss.hp,0);assert.ok(phases.has(2));assert.ok(phases.has(3));
    for(const h of hs){assert.equal(h.game.arenaScene.cleared,true);assert.equal(h.game.bossProgress.records[region].wins,1);}
    const original=hs[1].game.bossProgress.records[region].chest.state;
    assert.equal(hs[0].game.claimChest(),true);assert.equal(hs[0].game.claimChest(),false);assert.equal(hs[1].game.bossProgress.records[region].chest.state,original);
  }finally{store.close();}
});
for(const [id,definition] of Object.entries(LEGENDARY))test(`legendary ${id}: shared warning/state, individual permanent record once`,()=>{
  const {store,a,hs,boss}=encounter(definition.region,id);
  try{
    boss.state='idle';boss.age=2;a.tick();assert.equal(boss.state,'windup');assert.ok(boss.attack.warning>0);
    assert.equal(hs[0].game.arenaScene.boss.attack,hs[1].game.arenaScene.boss.attack);
    if(id==='lightning')assert.equal(boss.attack.zones.length,1);
    // Unit-level completion setup, not a claim of a full browser boss playtest.
    for(const h of hs)h.game.damageEnemy(boss,boss.maxHp/2,{stagger:false});a.tick();
    for(const h of hs){assert.equal(h.game.legendary.revision,1);assert.equal(h.game.legendary.defeated[id].claimed,false);assert.equal(h.game.prepareLegendaryVictory(),false);}
    assert.notEqual(hs[0].game.legendary.defeated[id],hs[1].game.legendary.defeated[id]);
  }finally{store.close();}
});
test('solo authority retains original step behavior at the same input sequence',()=>{
  const store=new AuthorityStore(),a=new Authority(store,{allowLegacyImport:true,capacity:16}),h=a.create('a',{slot:0});a.attach('a',h.id,{close(){}});const solo=new Game();
  for(let i=0;i<120;i++){const input={move:1,run:true,jump:i===20||i===40};a.input('a',h.id,i+1,input);a.tick();solo.step(1/60,input);assert.equal(h.game.hero.x,solo.hero.x);assert.equal(h.game.hero.y,solo.hero.y);assert.equal(h.game.hero.hp,solo.hero.hp);}
  store.close();
});

test('regional boss XP is one conserved pool for damage contributors and cannot repeat',()=>{
  const {store,a,hs,boss,room}=encounter(1);
  try{
    for(const h of hs){h.game.hero.level=1;h.game.hero.xp=0;h.game.drain();h.game.damageEnemy(boss,1,{stagger:false});}
    const w=room.worlds.get(hs[0].zone);boss.hp=0;for(const e of w.enemies)e.state='dead';a.completeWorld(room,w);
    const earned=hs.map(h=>h.game.events.find(e=>e.type==='boss-victory').xp);
    assert.equal(earned.reduce((x,y)=>x+y),BOSSES[1].xp);assert.ok(Math.abs(earned[0]-earned[1])<=1);
    const revisions=hs.map(h=>h.revision);a.tick();assert.deepEqual(hs.map(h=>h.revision),revisions);
    assert.equal(hs[0].game.bossProgress.records[1].wins,1);
  }finally{store.close();}
});
