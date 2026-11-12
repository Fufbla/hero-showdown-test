import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {Game,decodeSave,STEP} from '../../../royale/core.mjs';
import {LocalHeroStore,PROFILE_KEY} from '../../../royale/saves.mjs';
import {PowerSystem,POWERS,POWER_IDS,normalizePowers} from '../../gameplay/powers.mjs';
import {retireMovementPower,migratePowerSnapshot,guardPowerSave,CURRENT_POWER_IDS} from '../../power-policy.mjs';
import {record} from './simulation-fixture.mjs';
const legacy=(invested=7)=>({levels:Object.fromEntries([...CURRENT_POWER_IDS,'agility'].map(id=>[id,id==='agility'?invested:id==='speed'?5:id==='steel'?4:0])),equipped:['steel','agility','speed'],recovery:{agility:12,steel:6,speed:7}});
test('refund is exact and repeatable without double credit, while slots stay in place',()=>{
 const raw=legacy(),original=structuredClone(raw),p=normalizePowers(raw,30,{strict:true});
 assert.equal(29-(7+5+4),13);assert.equal(p.points,20);assert.equal(p.movementPolicy.refunded,7);
 assert.deepEqual(p.equipped,['steel',null,null]);assert.equal(p.levels.speed,5);assert.equal(p.levels.steel,4);assert.ok(!Object.hasOwn(p.levels,'agility'));
 for(let i=0;i<10;i++)assert.deepEqual(normalizePowers(p,30,{strict:true}),p);
 assert.deepEqual(raw,original);assert.equal(p.recovery.agility,undefined);
});
test('invalid legacy ledgers are rejected rather than silently redistributed',()=>{
 assert.equal(normalizePowers(legacy(20),10,{strict:true}),null);
 for(const n of [-1,21,2.5,'7']){const raw=legacy();raw.levels.agility=n;assert.equal(retireMovementPower(raw,30),null);}
 const bad=legacy();delete bad.levels.flight;assert.equal(normalizePowers(bad,30,{strict:true}),null);
 assert.equal(normalizePowers(null,30,{strict:true}),null);
});
test('cloud projection and save guard keep progress and never restore the retired skill',()=>{
 const g=new Game();const raw=JSON.parse(g.save());Object.assign(raw,{level:30,xp:10,coins:1234,powers:legacy()});
 const copy=structuredClone(raw),next=migratePowerSnapshot(raw);assert.deepEqual(raw,copy);
 for(const key of Object.keys(raw).filter(k=>k!=='powers'))assert.deepEqual(next[key],raw[key]);
 assert.deepEqual(migratePowerSnapshot(next),next);assert.deepEqual(guardPowerSave(raw,next),next);
 const oldTab={...next,powers:legacy()};assert.throws(()=>guardPowerSave(next,oldTab),/reload/);
 const stale=structuredClone(next);stale.powers.levels.steel--;assert.throws(()=>guardPowerSave(next,stale),/progress/);
 const upgraded=structuredClone(next);upgraded.powers.levels.flight=1;assert.equal(guardPowerSave(next,upgraded).powers.points,19);
});
test('existing browser hero loads, saves and reloads with its appearance and progress intact',()=>{
 const raw=JSON.parse(new Game().save());Object.assign(raw,{level:30,xp:10,coins:1234,powers:legacy()});
 const envelope={version:2,revision:3,activeSlot:0,legacyImported:true,slots:[{id:'saved-king',snapshot:raw},null,null]};
 const map=new Map([[PROFILE_KEY,JSON.stringify(envelope)]]),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 const store=new LocalHeroStore(storage);assert.equal(store.writable,true,store.message);const loaded=store.slot(0).snapshot;
 assert.equal(loaded.powers.points,20);assert.equal(loaded.powers.movementPolicy.refunded,7);
 assert.equal(store.writeSlot(0,loaded,{expectedId:'saved-king',requireDurable:true}).ok,true);
 const again=new LocalHeroStore(storage).slot(0).snapshot;
 assert.deepEqual(again,loaded);for(const k of ['look','inventory','world','level','xp','coins','cosmetics'])assert.deepEqual(again[k],decodeSave(JSON.stringify(raw))[k]);
});
test('retired ability cannot be learned, equipped or activated; Speed remains passive',()=>{
 assert.ok(!POWER_IDS.includes('agility'));assert.equal(POWERS.agility,undefined);assert.equal(POWERS.speed.passive,true);assert.equal(POWERS.speed.cooldown,undefined);
 const g=new Game();g.hero.level=30;g.powers=new PowerSystem(g,normalizePowers(legacy(),30));
 assert.equal(g.upgradePower('agility').ok,false);assert.equal(g.powers.activate('agility'),false);assert.equal(g.powers.activate('speed'),false);
 assert.equal(g.powers.ready('agility'),false);assert.equal(g.powers.data.equipped.includes('speed'),false);
});
test('movement, collision dimensions, damage, durations and cooldown balance match production baseline',()=>{
 const baseline=JSON.parse(execFileSync(process.execPath,[fileURLToPath(new URL('./simulation-fixture.mjs',import.meta.url))],{encoding:'utf8'}));
 assert.deepEqual(JSON.parse(JSON.stringify(record())),baseline);
});
test('Steel remains active with Flight, Strength and every Super Kick in the combo',()=>{
 for(const id of ['flight','strength','superKick']){
  const g=new Game({random:()=>.1});g.enemies=[];g.hero.level=99;
  const levels=Object.fromEntries(POWER_IDS.map(key=>[key,['steel',id,'speed'].includes(key)?20:0]));
  g.powers=new PowerSystem(g,normalizePowers({levels,equipped:['steel',id,null]},99));
  assert.equal(g.powers.activate('steel'),true);const before={x:g.hero.x,y:g.hero.y,w:g.hero.w,h:g.hero.h};
  assert.equal(g.powers.activate(id),true);assert.equal(g.hero.steel,true);assert.equal(g.hero.w,before.w);assert.equal(g.hero.h,before.h);
  let punches=0,kicks=new Set();for(let i=0;i<180;i++){g.step(STEP,{move:id==='flight'?1:0});if(g.hero.attack?.power==='strength')punches++;if(g.hero.attack?.power==='superKick')kicks.add(g.hero.attack.comboIndex);assert.equal(g.hero.steel,true);}
  if(id==='flight'){assert.equal(g.hero.flying,true);assert.ok(g.hero.x>before.x);}if(id==='strength')assert.ok(punches>0);if(id==='superKick')assert.equal(kicks.size,6);
  for(let i=0;i<330;i++)g.step(STEP,{});assert.equal(g.hero.steel,false);assert.ok(g.powers.cooldowns.steel>0);
 }
});
test('staging entry maps shared power imports while retaining original non-test renderers',async()=>{
 for(const [p,base]of [['../../index.html','/royale-v3-staging/'],['../index.html','/royale/'],['../../gameplay/index.html','/royale/'],['../../local-coop/index.html','/royale/local-coop/']]){
  const html=await readFile(new URL(p,import.meta.url),'utf8'),m=JSON.parse(html.match(/<script type="importmap">(.*?)<\/script>/s)[1]);
  assert.ok(!html.includes('Agility Power Armor'));
  const mapped=Object.entries(m.imports).find(([k])=>new URL(k,'https://test'+base).pathname==='/royale/powers.mjs');assert.ok(mapped,p);
  assert.equal(new URL(mapped[1],'https://test'+base).pathname,'/royale-v3-staging/gameplay/powers.mjs');
 }
});
