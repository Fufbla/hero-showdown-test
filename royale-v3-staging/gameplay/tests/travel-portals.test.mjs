import test from 'node:test';import assert from 'node:assert/strict';
import {Game,decodeSave} from '../../../royale/core.mjs';
import {boardIndex,regionSurfaces,regionCamps} from '../../../royale/world.mjs';
import {nearbyInteractions} from '../../../royale/world-loot.mjs';
import {LocalSession,captureProgress} from '../../../royale/local-coop/session.mjs';
import {boardPortals,regionPortals,travelQuote,destinationLevel} from '../portal-layout.mjs';
import {travelCoins,bossChestCoins} from '../economy.mjs';
const expected=[100,200,300,800,1200,2500,3500];
test('every approved travel and boss coin bracket including all boundaries',()=>{
 for(let level=1;level<=99;level++){
  const coin=level<20?1:level<30?2:level<40?3:level<50?5:level<60?8:level<70?12:level<80?18:level<90?25:35;
  assert.equal(travelCoins(level),coin*100);assert.equal(bossChestCoins(level),level<20?100:level<40?200:level<60?400:level<80?750:1200);
 }
});
for(let region=1;region<=7;region++){
 const board=0;
 test(`phase ${region}: exact price, insufficient funds, paid return and reload`,()=>{
  const g=new Game();g.loadRegion(region===1?2:1);g.hero.hp=37;const d={region,board},q=travelQuote(g,d);assert.equal(q.cost,expected[region-1]);
  g.hero.coins=q.cost-1;assert(!g.fastTravel(d,g.economy.revision));assert.equal(g.hero.coins,q.cost-1);
  g.hero.coins=10000;const revision=g.economy.revision;assert(g.fastTravel(d,revision));assert.equal(g.hero.coins,10000-q.cost);assert.equal(boardIndex(g.hero.x),board);assert.equal(g.hero.hp,37);
  assert(!g.fastTravel(d,revision));assert(!g.fastTravel(d,g.economy.revision));assert.equal(g.hero.coins,10000-q.cost);
  const loaded=decodeSave(g.save());assert(loaded);const restored=new Game({save:loaded});assert.equal(restored.regionId,region);assert.equal(restored.hero.x,g.hero.x);assert.equal(restored.hero.y,g.hero.y);assert.equal(restored.hero.coins,g.hero.coins);
  assert(restored.fastTravel({region:region===1?2:1,board:0},restored.economy.revision));assert.equal(restored.hero.coins,g.hero.coins-(region===1?200:100));
 });
 test(`phase ${region}: exactly four rendered/interactive accessible portals and correct destinations`,()=>{
  const portals=regionPortals(region);assert.equal(portals.length,4);assert.deepEqual([0,1,2].map(board=>boardPortals(region,board).length),[2,0,2]);assert.deepEqual(portals.map(p=>boardIndex(p.x)),[0,0,2,2]);assert(portals[0].x<portals[1].x&&portals[2].x<portals[3].x);assert.deepEqual(new Set(portals.map(p=>p.role)),new Set(['entrance','fast-travel','boss','exit']));
  const surfaces=regionSurfaces(region);
  for(const p of portals){
   assert(surfaces.some(s=>!s.oneWay&&s.y===600&&p.x-17>=s.x&&p.x+17<=s.x+s.w),'portal is on reachable ground');
   const g=new Game();g.loadRegion(region,{x:p.x,y:p.y});g.hero.coins=0;g.combatTimer=0;g.portalPickupGuard=null;
   assert(nearbyInteractions(g).some(i=>i.id===p.id));g.drain();g.enterPortal();assert.equal(g.hero.coins,0);
   if(p.role==='fast-travel'){assert(g.drain().some(e=>e.type==='world-portal'));assert.equal(g.regionId,region);}
   else if(p.destination.boss){assert(g.bossEncounter);g.leaveBoss();assert.equal(g.hero.x,p.x);}
   else if(p.destination.hub){assert(g.drain().some(e=>e.type==='tree'));}
   else{assert.equal(g.regionId,p.destination.region);assert.equal(boardIndex(g.hero.x),p.destination.board);assert(decodeSave(g.save()));}
  }
 });
}
test('removed section portals cannot render, interact, or use legacy travel commands; old saves still resume in place',()=>{
 for(let region=1;region<=7;region++){
  const removed=[1640,1860,2000,regionCamps(region)[1].x+90,3720,3940,4080,regionCamps(region)[2].x+90];
  for(const x of removed){
   const g=new Game();g.loadRegion(region,{x,y:600});g.hero.coins=10000;g.drain();
   assert(!g.nearPortal());assert(!g.portalTravel(region===7?1:7,g.economy.revision));assert(!g.usePassage());
   assert(!nearbyInteractions(g).some(i=>i.kind==='passage'||i.kind==='portal'));
   g.enterPortal();assert(!g.drain().some(e=>e.type==='world-portal'));assert.equal(g.hero.coins,10000);
   const restored=new Game({save:decodeSave(g.save())});assert.equal(restored.regionId,region);assert.equal(restored.hero.x,x);assert.equal(restored.hero.y,600);
  }
  const g=new Game();g.loadRegion(region,{x:3500,y:600});g.hero.coins=10000;
  assert(g.fastTravel({region},g.economy.revision));assert.equal(g.hero.x,regionCamps(region)[0].x);assert.equal(g.world.checkpoint.index,0);assert.equal(g.hero.coins,10000-expected[region-1]);
 }
});
test('legacy free commands cannot teleport without a current revision and payment',()=>{
 for(const method of ['travel','portalTravel']){const g=new Game();g.hero.x=g.camps[0].x+90;g.hero.coins=0;assert(!g[method](2,0));g.hero.coins=1000;assert(!g[method](2));assert(g[method](2,0));assert.equal(g.hero.coins,800);assert(!g[method](3,0));}
});
test('invalid, locked, failed and combat trips never debit',()=>{
 for(const destination of [{region:8},{region:2,board:1},{region:2,board:2},{region:2,board:4},{region:2,board:.5},{legendary:'missing'}]){const g=new Game();g.hero.coins=9999;assert(!g.fastTravel(destination,0));assert.equal(g.hero.coins,9999);}
 const g=new Game();g.hero.coins=9999;g.world.unlocked=[1];assert(!g.fastTravel({region:2},0));g.world.unlocked.push(2);g.combatTimer=3;assert(!g.fastTravel({region:2},0));g.combatTimer=0;g.loadRegion=()=>false;assert(!g.fastTravel({region:2},0));assert.equal(g.hero.coins,9999);assert.equal(g.economy.revision,0);
});
test('Legendary paid entry charges after success and checkpoints the debit; entry failure is free',()=>{
 const g=new Game();g.hero.coins=5000;assert(!g.fastTravel({legendary:'styro'},0));assert.equal(g.hero.coins,5000);
 g.hero.level=99;g.powers.data.levels.fireball=1;g.powers.data.equipped=['fireball',null,null];g.legendaryStorageReady=true;
 assert(g.fastTravel({legendary:'styro'},0));assert.equal(g.hero.coins,1500);
 const event=g.drain().find(e=>e.type==='boss-entry'),s=JSON.parse(event.snapshot);assert.equal(s.coins,1500);assert.equal(s.economy.coinsSpent,3500);assert(!g.fastTravel({legendary:'styro'},0));
});
test('shared-screen restriction blocks every former free-teleport alias without debiting either player',()=>{
 const profiles=[0,1].map(i=>{const g=new Game();g.hero.coins=5000;return {identity:'travel-'+i,slots:[{slot_number:1,snapshot:JSON.parse(g.save())}],async save(){}};});
 const s=new LocalSession(profiles.map(profile=>({profile,slot:1})));
 for(const method of ['travel','portalTravel','fastTravel']){const result=s.command(0,method,method==='fastTravel'?[{region:2},0]:[2,0]);assert.equal(result.ok,false);}
 assert.deepEqual(s.games.map(g=>[g.regionId,g.hero.coins]),[[1,5000],[1,5000]]);
});
function legendaryParty(){
 const profiles=[0,1].map(i=>{const g=new Game();g.hero.level=99;g.hero.coins=5000;g.powers.data.levels.fireball=1;g.powers.data.equipped=['fireball',null,null];return {identity:'legendary-travel-'+i,slots:[{slot_number:1,snapshot:JSON.parse(g.save())}],async save(){}};});
 const s=new LocalSession(profiles.map(profile=>({profile,slot:1})));
 for(const g of s.games){g.hero.grounded=true;g.combatTimer=0;g.legendaryStorageReady=true;}
 return s;
}
test('shared legendary trip charges each hero once and checkpoints each debit',()=>{
 const s=legendaryParty(),revisions=Object.fromEntries(s.games.map((g,i)=>[i,g.economy.revision]));
 assert.equal(s.command(1,'enterLegendary',['styro',revisions]),true);
 for(const g of s.games){assert.equal(g.hero.coins,1500);assert.equal(g.economy.coinsSpent,3500);assert.equal(g.arenaScene.legendary,'styro');const saved=captureProgress(g);assert.equal(saved.coins,1500);assert.equal(saved.arena.legendary,'styro');assert(decodeSave(JSON.stringify(saved)));}
 assert.equal(s.games[0].arenaScene.boss,s.games[1].arenaScene.boss);
 const entry=s.games[0].drain().find(e=>e.type==='boss-entry');assert.equal(JSON.parse(entry.snapshot).coins,1500);
 assert.equal(s.command(1,'enterLegendary',['styro',revisions]).ok,false);assert.deepEqual(s.games.map(g=>g.hero.coins),[1500,1500]);
});
test('shared legendary trip refuses missing or stale confirmations and an ineligible companion without any debit',()=>{
 for(const failure of ['missing','stale','funds','level','power','storage','grounded','failed-entry']){
  const s=legendaryParty(),r=Object.fromEntries(s.games.map((g,i)=>[i,g.economy.revision]));
  if(failure==='stale')r[1]--;
  if(failure==='funds')s.games[1].hero.coins=3499;
  if(failure==='level')s.games[1].hero.level=98;
  if(failure==='power')s.games[1].powers.data.equipped=[null,null,null];
  if(failure==='storage')s.games[1].legendaryStorageReady=false;
  if(failure==='grounded')s.games[1].hero.grounded=false;
  if(failure==='failed-entry')s.games[0].enterLegendary=()=>false;
  const balances=s.games.map(g=>g.hero.coins),result=s.command(0,'enterLegendary',failure==='missing'?['styro']:['styro',r]);
  assert(result===false||result?.ok===false,failure);assert.deepEqual(s.games.map(g=>g.hero.coins),balances);assert(s.games.every(g=>!g.arenaScene));
 }
});
