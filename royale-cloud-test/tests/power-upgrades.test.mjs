import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,decodeSave} from '../core.mjs';
import {LocalHeroStore,PROFILE_KEY} from '../saves.mjs';
import {InstantPowerUpgrades,powerUpgradeSnapshot} from '../power-upgrades.mjs';
import {powerStats} from '../powers.mjs';

function fixture({level=9,fireball=3}={}){
  const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},store=new LocalHeroStore(storage);
  const game=new Game();game.started=true;game.hero.level=level;game.hero.xp=0;game.powers.data.levels.fireball=fireball;game.powers.data.points=level-1-fireball;
  assert.ok(store.writeSlot(0,game.save(),{expectedId:null,requireDurable:true}).ok);
  game.visitTree();game.paused=true;
  const context={game,store,index:0,heroId:store.slot(0).id},upgrades=new InstantPowerUpgrades(()=>context);
  return {game,store,storage,values,context,upgrades};
}
test('one arrow transaction spends one point, upgrades one level and activates stats immediately after storage',async()=>{
  const f=fixture(),before=f.game.powers.stats('fireball');const r=await f.upgrades.spend('fireball');
  assert.ok(r.ok);assert.equal(r.level,4);assert.equal(r.points,4);assert.equal(f.game.powers.data.levels.fireball,4);assert.equal(f.game.powers.data.points,4);
  assert.deepEqual(f.game.powers.stats('fireball'),powerStats('fireball',4,{heroLevel:9,equipment:f.game.equipment}));
  assert.ok(f.game.powers.stats('fireball').damage>before.damage);assert.equal(f.game.powers.stats('fireball').cooldown,before.cooldown);
  assert.equal(f.game.events.filter(e=>e.type==='upgrade').length,1);
});
test('upgrade survives closure, region transitions and reload without a separate manual save',async()=>{
  const f=fixture();assert.ok((await f.upgrades.spend('fireball')).ok);f.game.leaveTree();f.game.travel(2);
  const store=new LocalHeroStore(f.storage),reloaded=new Game({save:store.slot(0).snapshot});
  assert.equal(reloaded.powers.data.levels.fireball,4);assert.equal(reloaded.powers.data.points,4);
});
test('upgrade preserves saved location, coins, equipment, portals, health and every unrelated saved field',async()=>{
  const f=fixture(),before=f.store.slot(0).snapshot;
  f.game.hero.x=1200;f.game.hero.coins=777;f.game.hero.hp=37;f.game.healthRoots=3;
  assert.ok((await f.upgrades.spend('fireball')).ok);
  const after=f.store.slot(0).snapshot;
  for(const key of Object.keys(before))if(!['powers','economy'].includes(key))assert.deepEqual(after[key],before[key],key);
  assert.deepEqual(after.powers.equipped,before.powers.equipped);assert.deepEqual(after.powers.recovery,before.powers.recovery);
  assert.equal(f.game.hero.x,1200);assert.equal(f.game.hero.coins,777);assert.equal(f.game.hero.hp,37);
});
test('a newly earned hero level and its single point are committed with an upgrade',async()=>{
  const f=fixture({level:4,fireball:3});f.game.hero.level=5;f.game.hero.xp=12;f.game.powers.data.points=1;
  assert.ok((await f.upgrades.spend('fireball')).ok);const s=new LocalHeroStore(f.storage).slot(0).snapshot;
  assert.equal(s.level,5);assert.equal(s.xp,12);assert.equal(s.powers.levels.fireball,4);assert.equal(s.powers.points,0);
});
test('level 20 and zero points reject upgrades and never overspend under rapid calls',async()=>{
  const f=fixture({level:22,fireball:19});const results=await Promise.all(Array.from({length:80},()=>f.upgrades.spend('fireball')));
  assert.equal(results.filter(r=>r.ok).length,1);assert.equal(f.game.powers.data.levels.fireball,20);assert.equal(f.game.powers.data.points,1);
  assert.ok((await f.upgrades.spend('speed')).ok);assert.equal(f.game.powers.data.points,0);assert.equal((await f.upgrades.spend('speed')).ok,false);
  assert.equal(f.store.slot(0).snapshot.powers.points,0);
});
test('storage failure does not change live, cached or persisted authoritative state',async()=>{
  const f=fixture(),before=f.game.save(),raw=f.values.get(PROFILE_KEY),cached=structuredClone(f.store.data);
  f.storage.setItem=()=>{throw Error('Storage full');};const r=await f.upgrades.spend('fireball');
  assert.equal(r.ok,false);assert.equal(f.game.save(),before);assert.equal(f.values.get(PROFILE_KEY),raw);assert.deepEqual(f.store.data,cached);
});
test('a stale tab cannot spend or roll back another tab’s permanent upgrade',async()=>{
  const f=fixture(),other=new LocalHeroStore(f.storage),old=f.store.slot(0).snapshot;
  const newer=structuredClone(old);newer.powers.levels.fireball++;newer.powers.points--;
  assert.ok(other.writeSlot(0,newer,{expectedId:f.context.heroId,requireDurable:true}).ok);
  assert.equal((await f.upgrades.spend('fireball')).ok,false);
  assert.equal(new LocalHeroStore(f.storage).slot(0).snapshot.powers.levels.fireball,4);
  assert.equal(other.writeSlot(0,old,{expectedId:f.context.heroId,requireDurable:true}).ok,false);
});
test('cloud success waits for acknowledgment; one in-flight press cannot spend twice',async()=>{
  const f=fixture(),previous=f.store.slot(0).snapshot;let release,calls=0;
  f.store.cloud=true;f.store.meta=[{snapshot:previous}];f.store.commit=async(_index,snapshot)=>{calls++;await new Promise(r=>release=r);f.store.meta[0].snapshot=snapshot;return {ok:true};};
  const a=f.upgrades.spend('fireball');assert.equal(f.game.powers.data.levels.fireball,3);assert.equal(f.game.powers.data.points,5);
  assert.equal((await f.upgrades.spend('fireball')).ok,false);assert.equal(calls,1);release();assert.ok((await a).ok);assert.equal(f.game.powers.data.levels.fireball,4);
});
test('cloud errors never announce or apply an unacknowledged upgrade',async()=>{
  const f=fixture();f.store.cloud=true;f.store.meta=[{snapshot:f.store.slot(0).snapshot}];f.store.commit=async()=>{throw Error('offline');};
  assert.equal((await f.upgrades.spend('fireball')).ok,false);assert.equal(f.game.powers.data.levels.fireball,3);assert.equal(f.game.powers.data.points,5);
});
test('invalid or forged point counts and combat restrictions cannot bypass progression',()=>{
  const f=fixture(),before=f.store.slot(0).snapshot;f.game.powers.data.points=999;
  assert.equal(powerUpgradeSnapshot(f.game,before,'fireball').ok,false);f.game.powers.data.points=5;f.game.markCombat();
  assert.equal(powerUpgradeSnapshot(f.game,before,'fireball').ok,false);assert.equal(powerUpgradeSnapshot(f.game,before,'not-a-power').ok,false);
  assert.ok(decodeSave(JSON.stringify(before)));
});

test('a learned active power equips from the patrol HUD and survives reload without saving unrelated adventure progress', async () => {
  const f = fixture();
  f.game.leaveTree();
  f.game.paused = true;
  f.game.hero.coins += 123;
  const before = f.store.slot(0).snapshot;
  assert.ok((await f.upgrades.equip(2, 'fireball')).ok);
  assert.deepEqual(f.game.powers.data.equipped, [null, null, 'fireball']);
  const after = new LocalHeroStore(f.storage).slot(0).snapshot;
  assert.deepEqual(after.powers.equipped, f.game.powers.data.equipped);
  assert.equal(after.coins, before.coins);
  assert.deepEqual(after.world, before.world);
  assert.deepEqual(after.powers.levels, before.powers.levels);
  assert.ok((await f.upgrades.equip(2, null)).ok);
  assert.deepEqual(f.store.slot(0).snapshot.powers.equipped, [null, null, null]);
});

test('HUD choices protect combat, cooldowns, passives, ownership, duplicate powers and the Villain Merge slot', async () => {
  const f = fixture();
  const equip = (slot, id) => f.upgrades.equip(slot, id);
  assert.ok((await f.upgrades.spend('speed')).ok);
  for (const [slot, id] of [[0,'speed'], [0,'whirlwind'], [3,'fireball'], [-1,'fireball']]) assert.equal((await equip(slot,id)).ok, false);
  f.game.combatTimer = 3;
  assert.equal((await equip(0, 'fireball')).ok, false);
  f.game.combatTimer = 0;
  f.game.powers.cooldowns.fireball = 3;
  assert.equal((await equip(0, 'fireball')).ok, false);
  f.game.powers.cooldowns.fireball = 0;
  assert.ok((await equip(0, 'fireball')).ok);
  assert.equal((await equip(1, 'fireball')).ok, false);
  f.game.powers.cooldowns.fireball = 2;
  assert.equal((await equip(0, null)).ok, false);
  assert.deepEqual(f.game.powers.data.equipped, ['fireball',null,null]);
  assert.equal(f.game.powers.cooldowns.fireball, 2);
});

test('a failed or superseded HUD write keeps the current loadout and a double press saves once', async () => {
  const f = fixture();
  const pair = await Promise.all([f.upgrades.equip(1,'fireball'),f.upgrades.equip(2,'fireball')]);
  assert.equal(pair.filter(r => r.ok).length, 1);
  const other = new LocalHeroStore(f.storage);
  assert.ok(other.writeSlot(0,other.slot(0).snapshot,{expectedId:f.context.heroId, requireDurable:true}).ok);
  assert.equal((await f.upgrades.equip(1,null)).ok, false);
  assert.deepEqual(f.game.powers.data.equipped, [null,'fireball',null]);
  assert.deepEqual(new LocalHeroStore(f.storage).slot(0).snapshot.powers.equipped, f.game.powers.data.equipped);
  const unwriteable = fixture();
  unwriteable.storage.setItem = () => { throw Error('Full'); };
  assert.equal((await unwriteable.upgrades.equip(2,'fireball')).ok, false);
  assert.deepEqual(unwriteable.game.powers.data.equipped, [null,null,null]);
});
