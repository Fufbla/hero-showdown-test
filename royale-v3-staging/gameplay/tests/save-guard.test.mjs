import test from 'node:test';import assert from 'node:assert/strict';
import {Game,decodeSave} from '../../../royale/core.mjs';
import {guardEconomySave} from '../economy-save-guard.mjs';
function won(){const g=new Game();g.loadRegion(7);g.hero.level=99;g.enterBoss();g.enemies.forEach(e=>{e.hp=0;e.state='dead';});g.completeBoss();return g;}
test('save guard accepts genuine 1200-coin claim and blocks reopened, mutated and downgraded rewards',()=>{
 const g=won(),before=JSON.parse(g.save());g.claimChest();const after=JSON.parse(g.save());assert.equal(guardEconomySave(before,after),after);assert(decodeSave(JSON.stringify(after)));
 for(const change of [s=>s.bossProgress.records[7].chest.state='available',s=>s.bossProgress.records[7].chest.rewardVersion=undefined,s=>s.bossProgress.records[7].chest.coins=1201,s=>delete s.bossProgress.records[7],s=>s.bossProgress.records[7].wins=0]){const invalid=structuredClone(after);change(invalid);assert.throws(()=>guardEconomySave(after,invalid));}
});
test('old unclaimed chest receives only its unpaid balance and cannot increase on repeat migration',()=>{
 const g=won(),old=JSON.parse(g.save());old.coins=100;Object.assign(old.bossProgress.records[7].chest,{coins:25,roots:2,rewardVersion:undefined});
 const upgraded=new Game({save:decodeSave(JSON.stringify(old))});const next=JSON.parse(upgraded.save());assert.equal(next.bossProgress.records[7].chest.coins,1100);guardEconomySave(old,next);guardEconomySave(next,JSON.parse(new Game({save:decodeSave(JSON.stringify(next))}).save()));
 const invalid=structuredClone(next);invalid.bossProgress.records[7].chest.coins=1200;assert.throws(()=>guardEconomySave(old,invalid));
});
test('save guard refuses rollback of paid-travel spending and economy revision',()=>{
 const g=new Game();g.hero.coins=10000;const before=JSON.parse(g.save());g.fastTravel({region:7},0);const next=JSON.parse(g.save());guardEconomySave(before,next);
 for(const key of ['revision','coinsSpent']){const invalid=structuredClone(next);invalid.economy[key]=0;assert.throws(()=>guardEconomySave(next,invalid));}
});
