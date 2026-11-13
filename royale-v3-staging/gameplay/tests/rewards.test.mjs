import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game,decodeSave} from '../../../royale/core.mjs';
import {BOSSES} from '../../../royale/boss-data.mjs';
import {LEGENDARY,LEGENDARY_HP} from '../../../royale/legendary-data.mjs';
import {makeBoss} from '../../../royale/bosses.mjs';
import {makeLegendary} from '../../../royale/legendary-bosses.mjs';
import {monsterXP} from '../../../royale/progression.mjs';
import {TYPES} from '../../../royale/world.mjs';
import {normalizeBossProgress} from '../../../royale/boss-state.mjs';
import {LocalSession,captureProgress} from '../../../royale/local-coop/session.mjs';
const base=await import('data:text/javascript;base64,'+Buffer.from(readFileSync(new URL('../../../royale/boss-data.mjs',import.meta.url))).toString('base64'));
const expected=l=>l<20?1:l<30?2:l<40?3:l<50?5:l<60?8:l<70?12:l<80?18:l<90?25:35;
const expectedBoss=l=>l<20?100:l<40?200:l<60?400:l<80?750:1200;
for(const night of [false,true])test(`all 99 actual monster levels award exact coins, unchanged XP, no drops (${night?'night':'day'})`,()=>{
 for(let level=1;level<=99;level++){
  const g=new Game({random:()=>{throw Error('A monster must not roll loot');}});g.clock=()=>({night});
  const e=g.enemies[0];e.level=level;e.hp=0;e.state='dead';const hp=TYPES[e.type].hp;
  g.reward(e);assert.equal(g.hero.coins,expected(level));assert.equal(g.hero.xp,monsterXP(TYPES[e.type].xp,1,level));
  assert.deepEqual(g.loot,[]);assert.equal(TYPES[e.type].hp,hp);g.reward(e);assert.equal(g.hero.coins,expected(level));
 }
});
test('summoned monsters cannot farm coins or drops',()=>{const g=new Game(),e=g.enemies[0];Object.assign(e,{level:99,summoned:true,state:'dead',hp:0});g.reward(e);assert.equal(g.hero.coins,0);assert.deepEqual(g.loot,[]);});
test('all 15 bosses double HP exactly once; damage, attacks and movement definitions stay identical',()=>{
 for(const [id,d]of Object.entries(BOSSES)){
  assert.deepEqual({...d,hp:base.BOSSES[id].hp},base.BOSSES[id]);const b=makeBoss(+id,{});assert.equal(b.hp,base.BOSSES[id].hp*2);assert.equal(b.maxHp,b.hp);
 }
 for(const id of Object.keys(LEGENDARY)){const b=makeLegendary(id,{});assert.equal(b.hp,base.BOSSES[7].hp*3*2);assert.equal(b.maxHp,b.hp);}
 assert.equal(LEGENDARY_HP(),252000);
});
function defeat(g){g.combatTimer=0;g.hero.grounded=true;assert(g.enterBoss());for(const e of g.enemies){e.hp=0;e.state='dead';}assert(g.completeBoss());}
for(const id of [1,2,3,4,5,6,7])test(`region ${id}: one coin-only first chest, repeat reward unchanged, save/reload cannot duplicate`,()=>{
 const g=new Game();g.loadRegion(id);g.hero.level=99;defeat(g);
 const coins=expectedBoss(BOSSES[id].level);assert.equal(g.hero.coins,0);assert.equal(g.availableChest().coins,coins);assert.equal(g.availableChest().roots,0);assert.deepEqual(g.availableChest().items,[]);
 const loaded=decodeSave(g.save());assert(loaded);const restored=new Game({save:loaded});
 assert(restored.claimChest());assert.equal(restored.hero.coins,coins);assert.equal(restored.healthRoots,0);assert.deepEqual(restored.inventory.pending,[]);assert(!restored.claimChest());
 const again=new Game({save:decodeSave(restored.save())});assert(!again.claimChest());again.leaveBoss();defeat(again);assert.equal(again.hero.coins,coins+10);assert.equal(again.availableChest(),null);
});
test('legacy unclaimed chest migration deducts the 100 already paid; claimed rewards and owned equipment are preserved',()=>{
 for(const id of [1,2,3,4,5,6,7]){
  const old={records:{[id]:{wins:1,chest:{state:'available',coins:25,roots:2,items:[]}}}};
  const next=normalizeBossProgress(old,[id]);assert.equal(next.records[id].chest.coins,expectedBoss(BOSSES[id].level)-100);assert.equal(next.records[id].chest.roots,0);assert.deepEqual(normalizeBossProgress(next,[id]),next);
  old.records[id].chest.state='claimed';assert.deepEqual(normalizeBossProgress(old,[id]),old);
 }
});
test('co-op chest eligibility is per hero, even when player one claimed previously',()=>{
 const first=new Game();first.world.bossVictories=[1];first.bossProgress.records[1]={wins:1,chest:{state:'claimed',coins:100,roots:0,items:[],rewardVersion:1}};
 const profiles=[first,new Game()].map((g,i)=>({identity:'economy-test-'+i,slots:[{slot_number:1,snapshot:JSON.parse(g.save())}],async save(){}}));
 const s=new LocalSession(profiles.map(profile=>({profile,slot:1})));assert(s.command(0,'enterBoss'));
 const room=s.authority.state.rooms.get(s.heroes[0].room),world=room.worlds.get(s.heroes[0].zone);for(const e of world.enemies){e.hp=0;e.state='dead';}s.authority.completeWorld(room,world);
 assert.deepEqual(s.games.map(g=>g.hero.coins),[10,0]);assert(!s.command(0,'claimChest'));assert(s.command(1,'claimChest'));assert.deepEqual(s.games.map(g=>g.hero.coins),[10,100]);
 const before=s.games.map(captureProgress);s.authority.completeWorld(room,world);assert(!s.command(1,'claimChest'));assert.deepEqual(s.games.map(captureProgress),before);
 for(const g of s.games)assert(decodeSave(JSON.stringify(captureProgress(g))));
});
for(const id of Object.keys(LEGENDARY))test(`Legendary ${id}: original equipment survives claim and save/reload without duplication`,()=>{
 const g=new Game();g.hero.level=99;g.powers.data.levels.fireball=1;g.powers.data.points=97;g.powers.data.equipped=['fireball',null,null];g.legendaryStorageReady=true;assert(g.enterLegendary(id));
 g.enemies.forEach(e=>{e.hp=0;e.state='dead';});g.pendingLegendaryVictory=id;assert(g.prepareLegendaryVictory());
 const pieces=structuredClone(g.legendary.defeated[id].pieces);assert.equal(pieces.length,2);assert(pieces.every(p=>p.catalogId.startsWith('merge-'+id+'-')));
 assert(g.claimMergeReward(id,pieces.map(p=>p.uid),[],{confirmed:true,revision:g.legendary.revision}));assert.equal(g.inventory.items.length,2);
 assert(!g.claimMergeReward(id,pieces.map(p=>p.uid),[],{confirmed:true,revision:g.legendary.revision}));
 const saved=decodeSave(g.save());assert(saved);const loaded=new Game({save:saved});assert.deepEqual(loaded.inventory.items,g.inventory.items);assert(loaded.legendary.defeated[id].claimed);
});
test('co-op shares the same base XP and full monster coins without drops or repeated death payouts',()=>{
 const profiles=[0,1].map(i=>{const g=new Game();g.loadRegion(7);return {identity:'monsters-'+i,slots:[{slot_number:1,snapshot:JSON.parse(g.save())}],async save(){}};});
 const s=new LocalSession(profiles.map(profile=>({profile,slot:1}))),g=s.games[0],e=g.enemies.find(e=>e.type==='titan');
 s.games.forEach(g=>{g.hero.level=99;g.random=()=>{throw Error('No loot roll expected');};});e.protection=0;e.hp=1;g.damageEnemy(e,999999);assert.deepEqual(s.games.map(g=>g.hero.coins),[35,35]);assert(s.games.every(g=>g.loot.length===0));s.authority.reward(s.heroes[0],e);assert.deepEqual(s.games.map(g=>g.hero.coins),[35,35]);
 const foe=g.enemies.find(e=>e.type==='guardian');s.games[0].hero.level=1;s.games[0].hero.xp=0;s.games[1].hero.level=98;s.games[1].hero.xp=0;
 const credits=[0,0];s.games.forEach((g,i)=>g.gainXP=n=>{credits[i]+=n;});foe.protection=0;foe.hp=1;g.damageEnemy(foe,999999);assert.equal(credits[0]+credits[1],TYPES.guardian.xp);assert.equal(credits[0],credits[1]);
});
