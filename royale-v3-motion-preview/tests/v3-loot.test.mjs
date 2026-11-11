import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game,decodeSave,STEP} from '../core.mjs';
import {emptyInventory,itemDefinition,normalizeInventory,equipmentBonuses,armorOutfitStats,rollEquipment} from '../equipment.mjs';
import {COSTUME_CATALOG,STAT_KEYS,costumeDrop} from '../costume-catalog.mjs';
import {helmetStatRanges,rollHelmetStats} from '../helmet-rolls.mjs';
import {spawnLoot,stepLoot,pickupLoot,nearbyInteractions,normalizeLoot,expireLoot,drawLoot} from '../world-loot.mjs';
import {rollChest} from '../boss-state.mjs';
import {LOOT,regularLootOutcome} from '../progression.mjs';
import {LocalHeroStore} from '../saves.mjs';
import {validateSnapshot} from '../cloud-validation.mjs';
import {paintedCapeMotion,paintedCapeOffset} from '../cape.mjs';
const seedRandom=(seed=20261106)=>()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
const fixture=(random=seedRandom())=>{let now=Date.now();const g=new Game({random,now:()=>now});g.enemies=[];return {g,advance:ms=>now+=ms};};
const defeat=g=>({type:'bottle',state:'dead',hp:0,x:g.hero.x,y:g.hero.y});
const armorPiece=(serial=1,index=0)=>costumeDrop(1,'ordinary',index,serial);
const historicalHelmet=(serial=1,random=()=>.5)=>rollHelmetStats({uid:`drop-${serial}`,catalogId:'eris-shore-ordinary-helmet'},random);
const fill=(g,count)=>{while(g.inventory.items.length<count){const serial=g.inventory.nextId++;g.inventory.items.push(armorPiece(serial,(serial-1)%2));}};

test('10,000 actual regular defeats: independent, exclusive 2/4/94 distribution',()=>{
 const {g}=fixture(),counts={equipment:0,root:0,nothing:0};
 for(let i=0;i<10000;i++){
  const nextId=g.inventory.nextId,e=defeat(g);g.reward(e);g.reward(e);
  assert.ok(g.loot.length<=1);const kind=g.loot[0]?.kind||'nothing';counts[kind]++;
  if(kind==='nothing')assert.equal(g.inventory.nextId,nextId);
  if(g.loot[0])assert.equal(g.loot[0].expiresAt-g.now(),20000);
  g.loot.length=0;g.drain();
 }
 assert.equal(g.kills,10000);
 for(const [kind,expected,tolerance] of [['equipment',200,70],['root',400,100],['nothing',9400,150]])assert.ok(Math.abs(counts[kind]-expected)<tolerance,JSON.stringify(counts));
 console.log('10,000 defeat distribution:',JSON.stringify(counts));
});
test('exact probability boundaries; no pity drops or item allocation on misses',()=>{
 for(const [roll,result] of [[0,'equipment'],[.019999,'equipment'],[.02,'root'],[.059999,'root'],[.06,null],[.999999,null]])assert.equal(regularLootOutcome(roll),result);
 let calls=0;const {g}=fixture(()=>{calls++;return .8;});
 for(let i=0;i<1000;i++)g.reward(defeat(g));
 assert.equal(calls,1000);assert.equal(g.inventory.nextId,1);assert.deepEqual(g.loot,[]);
 const before=calls;g.reward({...defeat(g),summoned:true});assert.equal(calls,before);
});
test('Roots and equipment expire at exactly 20 seconds; no stale pickup or effects',()=>{
 for(const kind of ['root','equipment']){
  const {g,advance}=fixture();const item=kind==='equipment'?armorPiece(g.inventory.nextId++):null;
  spawnLoot(g,g.hero,kind,item);const id=g.loot[0].id;g.interactionTarget=id;
  advance(19999);stepLoot(g,STEP);assert.equal(g.loot.length,1);assert.ok(nearbyInteractions(g).some(o=>o.id===id));
  advance(1);assert.ok(!nearbyInteractions(g).some(o=>o.id===id));
  drawLoot(new Proxy({},{get(){throw Error('Expired effect was drawn');}}),g);
  assert.equal(pickupLoot(g,id),false);assert.equal(g.loot.length,0);assert.equal(g.interactionTarget,null);
  assert.equal(g.healthRoots,0);assert.equal(g.inventory.items.length,0);
 }
});
test('collected/equipped items and roots survive expiration without timer callbacks',()=>{
 const {g,advance}=fixture(),item=armorPiece(g.inventory.nextId++),boots=armorPiece(g.inventory.nextId++,1);
 spawnLoot(g,g.hero,'equipment',item);const id=g.loot[0].id;
 advance(19999);assert.ok(pickupLoot(g,id));assert.equal(pickupLoot(g,id),false);
 g.inventory.items.push(boots);g.paused=true;assert.ok(g.equipItem(item.uid));spawnLoot(g,g.hero,'root');assert.ok(pickupLoot(g,g.loot[0].id));
 advance(60000);expireLoot(g);assert.deepEqual(g.inventory.items,[item,boots]);assert.deepEqual(g.inventory.equipped,{chest:item.uid,boots:boots.uid});assert.equal(g.healthRoots,1);
});
test('expiry continues through pause, travel and saving; deadlines never reset on reload',()=>{
 const {g,advance}=fixture();spawnLoot(g,g.hero,'root');const deadline=g.loot[0].expiresAt;
 const raw=JSON.parse(g.save());assert.equal(normalizeLoot(raw.loot,g.now()+19000)[0].expiresAt,deadline);
 assert.deepEqual(normalizeLoot(raw.loot,deadline),[]);
 g.paused=true;g.travel(2);advance(20000);assert.equal(expireLoot(g),1);assert.equal(JSON.parse(g.save()).loot.length,0);
 const old={...raw.loot[0]};delete old.expiresAt;assert.equal(normalizeLoot([old],g.now())[0].expiresAt,g.now()+20000);
});
test('unopened boss chests and pending rewards never despawn, and chest selections persist',()=>{
 const {g,advance}=fixture(()=>0);g.world.bossVictories=[1];g.bossProgress.records[1]={wins:1,chest:rollChest(1,()=>0)};g.arenaScene={cleared:true,region:1,returnLocation:{x:g.hero.x,y:g.hero.y,face:1}};
 const chest=structuredClone(g.availableChest());advance(86400000);stepLoot(g,STEP);assert.deepEqual(g.availableChest(),chest);
 assert.deepEqual(decodeSave(g.save()).bossProgress.records[1].chest,chest);
 g.healthRoots=9;assert.ok(g.claimChest());assert.equal(g.healthRoots,10);
 assert.deepEqual(g.inventory.pending.map(i=>i.catalogId),chest.items.map(i=>i.catalogId));advance(86400000);expireLoot(g);assert.equal(g.inventory.pending.length,chest.items.length);
 assert.ok(g.acceptReward());assert.equal(g.inventory.items[0].catalogId,chest.items[0].catalogId);assert.equal(g.claimChest(),false);
});
test('all 20 equipment spaces remain distinct; 21st drop leaves inventory intact',()=>{
 const {g}=fixture();fill(g,19);spawnLoot(g,g.hero,'equipment',armorPiece(g.inventory.nextId++));assert.ok(pickupLoot(g,g.loot[0].id));
 assert.equal(new Set(g.inventory.items.map(i=>i.uid)).size,20);
 const before=JSON.stringify(g.inventory.items);spawnLoot(g,g.hero,'equipment',armorPiece(g.inventory.nextId++));assert.equal(pickupLoot(g,g.loot[0].id),false);assert.equal(JSON.stringify(g.inventory.items),before);
 assert.equal(decodeSave(g.save()).inventory.items.length,20);
});
test('Health Root carrying limit and shop restocking are exactly 10',()=>{
 const {g}=fixture();g.healthRoots=9;spawnLoot(g,g.hero,'root');assert.ok(pickupLoot(g,g.loot[0].id));spawnLoot(g,g.hero,'root');assert.equal(pickupLoot(g,g.loot[0].id),false);
 g.hero.hp=1;assert.ok(g.useHealthRoot());assert.ok(pickupLoot(g,g.loot[0].id));assert.equal(g.healthRoots,10);
 g.healthRoots=4;g.hero.coins=1000;g.visitTree();assert.ok(g.buyHealthRoot(6));assert.equal(g.healthRoots,10);assert.equal(g.buyHealthRoot(1),false);
 assert.equal(validateSnapshot(g.save()).healthRoots,10);
});
test('shop purchases and pending chest acceptance use all 20 equipment spaces',()=>{
 const {g}=fixture();fill(g,18);g.hero.coins=9999;g.visitTree();
 const selection={catalogId:'eris-shore-ordinary-boots'},q=g.costumePreview(selection);assert.ok(q.ok);assert.equal(q.needed,0);
 assert.deepEqual(q.definitions.map(d=>d.part),['chest','boots']);
 assert.ok(g.buyCostume(selection,{confirmed:true,revision:q.revision}).ok);assert.equal(g.inventory.items.length,20);
 const next=g.costumePreview(selection);assert.equal(next.needed,2);
 g.inventory.pending.push(armorPiece(g.inventory.nextId++));assert.equal(g.acceptReward(),false);
 g.discardItem(g.inventory.items[0].uid,true);assert.ok(g.acceptReward());assert.equal(g.inventory.items.length,20);
});
test('Legendary progression rewards remain permanent and fit slots 19–20',()=>{
 const {g,advance}=fixture();g.gainXP(1e9);fill(g,18);
 const pieces=['chest','boots'].map(part=>({uid:`drop-${g.inventory.nextId++}`,catalogId:`merge-lightning-${part}`,state:'unclaimed'}));
 g.legendary.defeated.lightning={claimed:false,pieces};g.legendary.revision++;
 const before=JSON.stringify(g.legendary);advance(86400000);expireLoot(g);assert.equal(JSON.stringify(g.legendary),before);
 assert.ok(g.claimMergeReward('lightning',pieces.map(p=>p.uid),[],{confirmed:true,revision:g.legendary.revision}));
 assert.equal(g.inventory.items.length,20);assert.ok(g.inventory.items.slice(-2).every(i=>!Object.hasOwn(i,'stats')));
 advance(86400000);expireLoot(g);assert.equal(g.inventory.items.length,20);
 assert.equal(g.claimMergeReward('lightning',pieces.map(p=>p.uid),[],{confirmed:true,revision:g.legendary.revision}),false);
 assert.ok(decodeSave(g.save()));
});
test('archived helmet tiers retain valid historical rolls below every next-level minimum',()=>{
 const random=seedRandom(47),defs=Object.values(COSTUME_CATALOG).filter(d=>d.part==='helmet');
 for(const def of defs){
  const range=helmetStatRanges(def.id),nextLevel=Math.min(...defs.filter(d=>d.level>def.level).map(d=>d.level));
  for(const k of STAT_KEYS){
   assert.ok(range[k].max<=def.stats[k],def.id+' '+k);
   for(const next of defs.filter(d=>d.level===nextLevel&&d.stats[k]>0))assert.ok(range[k].max<=helmetStatRanges(next.id)[k].min,def.id+' -> '+next.id+' '+k);
  }
  const seen=new Set();
  for(let i=0;i<100;i++){
   const item=rollHelmetStats({uid:`drop-${i+1}`,catalogId:def.id},random);seen.add(JSON.stringify(item.stats));
   const inv={...emptyInventory(),items:[item]};assert.ok(normalizeInventory(inv,{legacy:true}));assert.equal(normalizeInventory(inv),null);
   for(const k of STAT_KEYS){assert.ok(item.stats[k]>=range[k].min&&item.stats[k]<=range[k].max);if(!def.stats[k])assert.equal(item.stats[k],0);}
  }
  assert.ok(seen.size>1,def.id);
 }
});
test('equipment selection retains existing region and rarity while dropping only active outfit parts',()=>{
 for(let region=1;region<=7;region++)for(const roll of [0,.999999]){
  const item=rollEquipment(region,()=>roll,1),d=itemDefinition(item);assert.equal(d.region,region);assert.ok(['chest','boots'].includes(d.part));assert.equal(d.rarity,region>=4&&roll===0?'rare':'ordinary');
 }
});
test('old fixed and rolled helmets retain exact archived history after migration and cannot be worn or sold',()=>{
 const {g}=fixture(),old={uid:'drop-1',catalogId:'eris-shore-ordinary-helmet'},a=historicalHelmet(2,()=>0),b=historicalHelmet(3,()=>.999999),body=armorPiece(4),boots=armorPiece(5,1);
 const raw=JSON.parse(g.save());raw.version=8;raw.legendary.configuration=1;raw.inventory.items=[old,a,b,body,boots];raw.inventory.equipped={helmet:a.uid,chest:body.uid,boots:boots.uid};raw.inventory.nextId=6;assert.notDeepEqual(a.stats,b.stats);
 const copy=decodeSave(JSON.stringify(raw));assert(copy);assert.deepEqual(copy.inventory.items,[body,boots]);
 for(const item of [old,a,b]){
  const archived=copy.inventory.headwearArchive.find(i=>i.uid===item.uid);assert.deepEqual(archived,{...item,source:'inventory'});assert.equal(copy.inventory.retired[item.uid],'discarded');
 }
 assert.equal(Object.hasOwn(copy.inventory.headwearArchive[0],'stats'),false);assert.deepEqual(equipmentBonuses(copy.inventory),armorOutfitStats(body));
 const loaded=new Game({save:copy});loaded.visitTree();
 for(const item of [old,a,b]){assert.equal(loaded.equipItem(item.uid),false);assert.equal(loaded.salePreview(item.uid).ok,false);}
 assert.deepEqual(decodeSave(loaded.save()).inventory,copy.inventory);assert.deepEqual(validateSnapshot(loaded.save()).inventory,copy.inventory);
});
test('invalid stat payloads fail closed; no legacy reroll, duplicate identity, or new stat type',()=>{
 const item=historicalHelmet(),make=i=>({...emptyInventory(),items:[i]});
 for(const stats of [null,{}, {...item.stats,strength:999}, {...item.stats,roots:.1},{...item.stats,extra:1},{...item.stats,strength:NaN}])assert.equal(normalizeInventory(make({...item,stats}),{legacy:true}),null);
 const old={uid:'drop-1',catalogId:'eris-shore-ordinary-helmet'};assert.deepEqual(normalizeInventory(make(old),{legacy:true}).items,[old]);assert.equal(normalizeInventory(make(old)),null);
 assert.equal(normalizeInventory({...emptyInventory(),items:[item,item]},{legacy:true}),null);
 assert.equal(rollHelmetStats(item,()=>{throw Error('Rerolled');}),item);
});
test('both visible slots round-trip independently; stored third slot remains untouched',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};let store=new LocalHeroStore(storage);
 for(const slot of [2,0,1]){
  const {g}=fixture(seedRandom(slot+1));fill(g,slot===2?1:20);g.healthRoots=10;g.hero.x=200+slot*50;g.hero.coins=100+slot;g.hero.xp=10+slot;g.paused=true;g.equipItem(g.inventory.items[0].uid);
  assert.ok(store.writeSlot(slot,g.save()).ok);
 }
 const hidden=store.slot(2),before=[store.slot(0),store.slot(1)];store=new LocalHeroStore(storage);
 for(const slot of [0,1]){assert.deepEqual(store.slot(slot),before[slot]);const g=new Game({save:store.slot(slot).snapshot});assert.deepEqual(g.inventory.items,before[slot].snapshot.inventory.items);assert.equal(g.hero.x,200+slot*50);}
 assert.deepEqual(store.slot(2),hidden);
 const app=readFileSync(new URL('../app.mjs',import.meta.url),'utf8');assert.match(app,/codePlay&&params.get\('codePlay'\)==='v3'\?2:3/);assert.match(app,/if\(codePlay\)setInterval\(sendCodeProgress,8000\)/);
});
test('painted capes pin shoulders, react to speed/takeoff/double jump/fall, settle and remain bounded',()=>{
 const owner={},h={face:1,grounded:true,vx:0,vy:0};let t=0,s;
 const run=(count,dt=STEP)=>{for(let i=0;i<count;i++)s=paintedCapeMotion(owner,h,t+=dt,dt);return {...s};};
 const idle=run(120);h.vx=100;const walk=run(120);h.vx=400;const fast=run(120);assert.ok(Math.abs(fast.lean)>Math.abs(walk.lean));assert.ok(Math.abs(walk.lean)>Math.abs(idle.lean));
 h.grounded=false;h.vy=-560;const up=run(12);h.vy=450;const down=run(25);assert.ok(up.lift<down.lift);h.vy=-500;const double=run(10);assert.ok(double.lift<down.lift);
 h.face=-1;h.vx=-400;run(10);const pin=paintedCapeOffset(s,0);assert.ok(pin.x===0&&pin.y===0);
 const still={...s};paintedCapeMotion(owner,h,t+1,0);assert.deepEqual(s,still);
 h.grounded=true;h.vy=0;h.vx=0;const landed=run(180);assert.ok(Math.abs(landed.lift)<.01);assert.ok(Math.abs(landed.lean)<.01);
 for(let i=0;i<=16;i++){const p=paintedCapeOffset(s,i/16);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));assert.ok(Math.abs(p.x)<100&&Math.abs(p.y)<40);}
});
