import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, decodeSave, STEP } from '../core.mjs';
import { COSTUME_CATALOG, COSTUME_SETS, COSTUME_PARTS, STAT_KEYS, LEGENDARY_POLICY, resaleValue } from '../costume-catalog.mjs';
import { itemDefinition, equipmentBonuses, equipmentOutfit, normalizeInventory, createEquipment } from '../equipment.mjs';
import { appearanceQuote, APPEARANCE_PRICES } from '../eris.mjs';
import { DEFAULT_LOOK } from '../appearance.mjs';
import { POWER_IDS, powerStats, attackRate } from '../powers.mjs';
import { LocalHeroStore, PROFILE_KEY } from '../saves.mjs';
import { bossVictory, CLOCK } from '../progression.mjs';
const camp=(level=99)=>{const g=new Game({random:()=>.99});g.hero.level=level;g.hero.maxHp=g.hero.hp=100+(level-1)*15;g.powers.data.points=level-1;g.hero.coins=10000;g.started=true;g.enemies=[];assert.ok(g.visitTree());return g;};
const buy=(g,selection,discardUids=[])=>g.buyCostume(selection,{discardUids,confirmed:true,revision:g.economy.revision});
const set=(name='shore')=>({setId:`${name}-ordinary`});
const item=(name='shore',part='helmet',rarity='ordinary')=>({catalogId:`eris-${name}-${rarity}-${part}`});
const tick=(g,n,input={})=>{for(let i=0;i<n;i++)g.step(STEP,input);};
function storage(){const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};}

test('sanctuary freezes the exact board, position, velocity, HP and live monster objects; real clock advances',()=>{
 let now=0;const g=new Game({now:()=>now});for(let r=1;r<4;r++)bossVictory(g.world,r);g.travel(4);g.hero.x=2498.25;g.hero.y=330.5;g.hero.vx=85;g.hero.vy=144;g.hero.grounded=false;g.hero.hp=75;g.hero.xp=30;const enemies=g.enemies,enemiesBefore=JSON.stringify(enemies),camps=g.camps;
 assert.ok(g.visitTree());assert.equal(g.sanctuary.returnLocation.board,1);tick(g,1000,{move:1});now=CLOCK.day;assert.ok(g.clock().night);assert.equal(JSON.stringify(g.enemies),enemiesBefore);assert.equal(g.travel(1),false);assert.equal(g.usePassage(),false);g.leaveTree();assert.deepEqual([g.hero.x,g.hero.y,g.hero.vx,g.hero.vy,g.hero.hp,g.hero.xp],[2498.25,330.5,85,144,75,30]);assert.equal(g.enemies,enemies);assert.equal(g.camps,camps);
});
test('Tree requires five full safe seconds and active boss encounters always block it',()=>{
 const g=new Game();g.enemies=[];g.hero.x=1000;g.startAttack('punch');assert.equal(g.visitTree(),false);tick(g,299);assert.equal(g.visitTree(),false);tick(g,2);assert.ok(g.visitTree());g.leaveTree();g.paused=false;g.hero.invulnerable=0;g.hurt(1,0);tick(g,299);assert.equal(g.visitTree(),false);tick(g,2);g.combatTimer=0;g.bossEncounter={};assert.equal(g.visitTree(),false);
});
test('sanctuary round-trip survives reload, retains damaged health and rejects forged return gates',()=>{
 const g=camp(50);g.leaveTree();g.hero.x=3500.5;g.hero.y=600;g.hero.hp=321;g.visitTree();buy(g,set());const raw=JSON.parse(g.save()),decoded=decodeSave(JSON.stringify(raw));assert.ok(decoded);const copy=new Game({save:decoded});assert.ok(copy.treeVisit);assert.equal(copy.hero.hp,321);assert.equal(copy.hero.x,3500.5);copy.leaveTree();assert.equal(copy.hero.x,3500.5);assert.equal(copy.inventory.items.length,3);
 for(const change of [s=>s.sanctuary.returnLocation.region=7,s=>s.sanctuary.returnLocation.x=6140,s=>s.sanctuary.returnLocation.board=0]){const bad=structuredClone(raw);change(bad);assert.equal(decodeSave(JSON.stringify(bad)),null);}
});
test('cleared boss arena can visit Tree and reload to the exact arena position without duplicating victory',()=>{
 const g=camp(10);g.leaveTree();g.hero.x=5840;g.enterBoss();g.bossEncounter.boss.hp=0;g.bossEncounter.boss.state='dead';g.completeBoss();g.hero.x=1060;assert.ok(g.visitTree());const copy=new Game({save:decodeSave(g.save())});assert.ok(copy.arenaScene.cleared);assert.ok(copy.treeVisit);assert.equal(copy.hero.x,1060);copy.leaveTree();assert.equal(copy.hero.x,1060);assert.equal(copy.bossProgress.records[1].wins,1);
});
for(const power of POWER_IDS)test(`${power}: single, bulk and maximum upgrades preserve exact preview and permanent points`,()=>{
 const g=camp(99),before=powerStats(power,1,{heroLevel:99,equipment:g.equipment});assert.ok(g.upgradePower(power,1).ok);assert.equal(g.powers.data.points,97);assert.ok(g.upgradePower(power,7).ok);const q=g.upgradePreview(power,12);assert.equal(q.next,20);assert.ok(g.upgradePower(power,12).ok);assert.equal(g.powers.data.levels[power],20);assert.equal(g.powers.data.points,78);assert.equal(g.upgradePower(power,1).ok,false);assert.equal(g.upgradePower(power,-1).ok,false);const saved=decodeSave(g.save());assert.equal(saved.powers.levels[power],20);assert.equal(saved.powers.points,78);assert.ok(before.level===1);
});
test('points cannot be overspent, fractional upgrades rejected, active Speed slot rejected',()=>{
 const g=camp(3);assert.equal(g.upgradePower('speed',3).ok,false);assert.equal(g.upgradePower('speed',1.5).ok,false);assert.ok(g.upgradePower('speed',2).ok);assert.equal(g.equipPower(0,'speed'),false);assert.equal(g.powers.data.points,0);
});
for(const s of Object.values(COSTUME_SETS))test(`${s.name}: three-piece 33/33/34 distribution totals exactly one set benefit`,()=>{
 const g=camp(99),q=buy(g,set(s.id));assert.ok(q.ok);assert.equal(q.items.length,3);assert.equal(q.cost,s.value);for(const i of q.items)assert.ok(g.equipItem(i.uid));const stats=equipmentBonuses(g.inventory);for(const key of STAT_KEYS)assert.ok(Math.abs(stats[key]-s.stats[key])<1e-8,`${key}: ${stats[key]} vs ${s.stats[key]}`);assert.equal(Object.keys(g.inventory.equipped).length,3);assert.equal(g.inventory.items.length,3);
});
test('shop enforces required levels, coins, integer physical-item capacity and no rare purchases',()=>{
 const g=camp(1),coins=g.hero.coins;assert.equal(buy(g,set('horizon')).ok,false);assert.equal(buy(g,item('cavern','helmet','rare')).ok,false);assert.equal(g.hero.coins,coins);assert.ok(buy(g,item()).ok);g.hero.coins=0;assert.equal(buy(g,item('shore','boots')).ok,false);assert.equal(g.hero.coins,0);assert.equal(buy(g,{catalogId:'unknown'}).ok,false);
});
test('full outfits require explicit chosen discards atomically; cancel and stale double submit change nothing',()=>{
 const g=camp();buy(g,set());buy(g,set('beacon'));buy(g,item('briar','boots'));const before=g.save(),selection=set('horizon'),revision=g.economy.revision,ids=g.inventory.items.slice(0,3).map(i=>i.uid),coins=g.hero.coins;
 assert.equal(g.costumePreview(selection).needed,3);assert.equal(g.buyCostume(selection,{discardUids:ids,revision}).ok,false);assert.equal(g.save(),before);assert.equal(buy(g,selection,[ids[0],ids[0],ids[1]]).ok,false);assert.equal(buy(g,selection,ids.slice(0,2)).ok,false);
 const q=g.buyCostume(selection,{discardUids:ids,confirmed:true,revision});assert.ok(q.ok);assert.equal(g.inventory.items.length,7);assert.equal(g.hero.coins,coins-q.cost);assert.ok(ids.every(uid=>g.inventory.retired[uid]==='discarded'));assert.equal(g.buyCostume(selection,{discardUids:ids,confirmed:true,revision}).ok,false);
});
test('mixed pieces combine their own contributions; appearance never changes bonuses or hitboxes',()=>{
 const g=camp();for(const selection of [item('shore','helmet'),item('cavern','chest'),item('horizon','boots')]){const q=buy(g,selection);g.equipItem(q.items[0].uid);}const stats=equipmentBonuses(g.inventory),defs=g.inventory.items.map(itemDefinition);for(const k of STAT_KEYS)assert.ok(Math.abs(stats[k]-defs.reduce((s,d)=>s+d.stats[k],0))<1e-8);
 const damage=g.attackDefinition('punch').damage,box=g.heroBox();g.look={...g.look,height:1.12,muscle:1,build:'full',presentation:'female'};g.refreshEquipment();assert.equal(g.attackDefinition('punch').damage,damage);assert.deepEqual(g.heroBox(),box);
});
test('equipment level checks also protect equipping earned pieces and loading underleveled references',()=>{
 const g=camp(1);g.inventory.items=[{uid:'drop-1',...item('horizon')}];g.inventory.nextId=2;assert.equal(g.equipItem('drop-1'),false);g.inventory.equipped.helmet='drop-1';g.refreshEquipment();assert.equal(g.equipment.strength,0);
});
test('equipment defense multiplies Steel reduction; speed caps and power enhancements leave cooldowns unchanged',()=>{
 const g=camp();const q=buy(g,set('horizon'));for(const i of q.items)g.equipItem(i.uid);g.powers.data.levels.speed=20;g.powers.data.levels.steel=20;g.powers.data.equipped=['steel','fireball',null];g.powers.data.levels.fireball=20;g.leaveTree();g.paused=false;g.powers.activate('steel');const damage=g.powers.incoming(100,{});assert.ok(Math.abs(damage-100*.25*(1-g.equipment.defense))<1e-8);assert.equal(g.powers.speed,.6);assert.equal(g.powers.attackRate,1.5);assert.equal(g.powers.stats('fireball').cooldown,5);assert.equal(g.powers.stats('fireball').damage,119+g.equipment.fireball);assert.equal(g.powers.stats('fireball').pierce,2);
 const natural=13+3*98;assert.ok(g.attackDefinition('punch').damage<natural*1.3);assert.ok(g.equipment.defense<=.25);
});
test('fixed costume colors, glyphs and glow are independent of all starter palette changes',()=>{
 const g=camp();const q=buy(g,set('cavern'));for(const i of q.items)g.equipItem(i.uid);const colors=JSON.stringify(g.visualOutfit().pieces);for(const k of ['suit','trim','emblemColor','capeColor'])g.look[k]='#ffffff';g.look.emblem='wave';assert.equal(JSON.stringify(g.visualOutfit().pieces),colors);assert.ok(COSTUME_CATALOG['eris-cavern-rare-chest'].stats.strength>COSTUME_CATALOG['eris-cavern-ordinary-chest'].stats.strength);
});
test('resale is exactly floor(25%), sales once only, worn references removed and Legendary never sellable',()=>{
 for(const value of [100,400,1000,103])assert.equal(resaleValue({catalogValue:value}),Math.floor(value/4));assert.equal(resaleValue({catalogValue:1000,rarity:'legendary'}),null);assert.equal(LEGENDARY_POLICY.enabled,false);
 const g=camp(),q=buy(g,item()),uid=q.items[0].uid;g.equipItem(uid);const revision=g.economy.revision,value=g.salePreview(uid).value,coins=g.hero.coins;assert.equal(g.sellItem(uid,{revision}).ok,false);assert.ok(g.sellItem(uid,{confirmed:true,revision}).ok);assert.equal(g.hero.coins,coins+value);assert.equal(g.inventory.equipped.helmet,undefined);assert.equal(g.inventory.retired[uid],'sold');assert.equal(g.sellItem(uid,{confirmed:true,revision:g.economy.revision}).ok,false);assert.equal(g.hero.coins,coins+value);
});
test('discard requires confirmation and leaves permanent tombstones after save reload',()=>{
 const g=camp(),q=buy(g,set()),uid=q.items[0].uid;g.equipItem(uid);assert.equal(g.discardItem(uid),false);assert.ok(g.discardItem(uid,true));assert.equal(g.discardItem(uid,true),false);const copy=new Game({save:decodeSave(g.save())});assert.equal(copy.inventory.retired[uid],'discarded');assert.ok(copy.inventory.items.every(i=>i.uid!==uid));assert.equal(copy.inventory.equipped.helmet,undefined);
});
for(const [key,value,cost] of [['hair','locs',100],['hairColor','#ff00aa',100],['eyes','#00ff00',100],['skin','#603322',150],['face','angular',200],['height',1.12,300],['build','full',300],['age','older',300]])test(`appearance ${key} costs ${cost}, charges only on confirmation and keeps progression`,()=>{
 const g=camp(50),before=JSON.stringify({xp:g.hero.xp,level:g.hero.level,powers:g.powers.data,world:g.world}),coins=g.hero.coins,draft={...g.look,[key]:value};assert.equal(g.makeoverPreview(draft).cost,cost);assert.equal(g.applyMakeover(draft).ok,false);assert.equal(g.hero.coins,coins);assert.ok(g.applyMakeover(draft,{confirmed:true,revision:g.economy.revision}).ok);assert.equal(g.hero.coins,coins-cost);assert.equal(g.look[key],value);assert.equal(JSON.stringify({xp:g.hero.xp,level:g.hero.level,powers:g.powers.data,world:g.world}),before);
});
test('appearance groups charge once, full makeover caps at 750; starter recolor is free',()=>{
 const g=camp();assert.equal(appearanceQuote(g.look,{...g.look,hair:'locs',hairColor:'#ffffff'}).cost,100);assert.equal(appearanceQuote(g.look,{...g.look,height:1.12,build:'full',muscle:1,presentation:'female'}).cost,300);
 const draft={...g.look,hair:'locs',eyes:'#00ff00',skin:'#442211',face:'round',height:1.1,age:'older'};assert.equal(g.makeoverPreview(draft).cost,750);g.hero.coins=749;assert.equal(g.applyMakeover(draft,{confirmed:true,revision:g.economy.revision}).ok,false);assert.equal(g.hero.coins,749);const q=g.makeoverPreview({...g.look,suit:'#aabbcc',trim:'#ccbbdd'});assert.equal(q.cost,0);assert.ok(g.applyMakeover(q.next,{confirmed:true,revision:q.revision}).ok);assert.equal(g.hero.coins,749);
});
test('bulk Roots enforce price, capacity, integer quantity, no negative balance; healing works in Tree',()=>{
 const g=camp(20);g.hero.coins=150;assert.equal(g.rootPreview(4).ok,false);assert.equal(g.buyHealthRoot(0),false);assert.equal(g.buyHealthRoot(1.5),false);assert.ok(g.buyHealthRoot(3));assert.equal(g.hero.coins,0);assert.equal(g.healthRoots,3);g.hero.coins=200;assert.equal(g.buyHealthRoot(2),false);assert.ok(g.buyHealthRoot(1));assert.equal(g.healthRoots,4);g.hero.hp=1;for(let i=0;i<4;i++)assert.ok(g.useHealthRoot());assert.equal(g.hero.hp,g.hero.maxHp);assert.equal(g.inventory.items.length,0);
});
test('regular drops always preview before acceptance; all inventory references remain unique',()=>{
 const g=camp(99);g.leaveTree();g.random=()=>0;g.reward({type:'bottle'});assert.equal(g.inventory.items.length,0);assert.equal(g.inventory.pending.length,1);assert.ok(g.acceptReward());assert.equal(g.inventory.items.length,1);const bad=structuredClone(g.inventory);bad.items.push(bad.items[0]);assert.equal(normalizeInventory(bad),null);
});
test('permanent progress rejects stale snapshots within one tab and optimistic conflicts across tabs',()=>{
 const memory=storage(),g=camp(50),store=new LocalHeroStore(memory);assert.ok(store.writeSlot(0,g.save()).ok);const stale=JSON.parse(g.save());const q=buy(g,set()),uid=q.items[0].uid;g.discardItem(uid,true);g.upgradePower('strength',1);assert.ok(store.writeSlot(0,g.save()).ok);assert.equal(store.writeSlot(0,stale).ok,false);assert.equal(store.slot(0).snapshot.inventory.retired[uid],'discarded');const other=new LocalHeroStore(memory);buy(g,item());assert.ok(store.writeSlot(0,g.save()).ok);assert.equal(other.writeSlot(0,other.slot(0).snapshot).ok,false);
});
test('atomic storage failures do not retain failed transactions in the save envelope',()=>{
 const memory=storage(),g=camp(),store=new LocalHeroStore(memory);store.writeSlot(0,g.save());const before=store.slot(0);memory.setItem=()=>{throw Error('Quota');};buy(g,item());const result=store.writeSlot(0,g.save(),{requireDurable:true});assert.equal(result.ok,false);assert.equal(result.retained,false);assert.deepEqual(store.slot(0),before);
});
test('Phase 1–5 saves migrate without resetting legacy inventory, powers, appearance, coins or boss rewards',()=>{
 const g=camp(50);g.leaveTree();g.inventory.items=[createEquipment(4,'rare',1,1)];g.inventory.equipped.suit='drop-1';g.inventory.nextId=2;g.powers.data.levels.strength=20;g.powers.data.points=29;const raw=JSON.parse(g.save());raw.version=5;delete raw.economy;delete raw.sanctuary;delete raw.inventory.retired;const state=decodeSave(JSON.stringify(raw));assert.equal(state.version,6);assert.equal(state.coins,10000);assert.equal(state.powers.levels.strength,20);assert.equal(state.inventory.equipped.suit,'drop-1');assert.deepEqual(state.look,g.look);assert.equal(state.inventory.items[0].catalogId,'r4-rare-suit');const copy=new Game({save:state});assert.ok(copy.equipment.damage>0);
});

for(const [region,level] of [[1,10],[2,20],[3,35],[4,50],[5,65],[6,80],[7,99]])test(`Region ${region}: recommended-level full suit keeps regional bosses dangerous and power rules intact`,()=>{
 const g=camp(level),catalog=Object.values(COSTUME_SETS).filter(s=>s.level<=level).at(-1),natural=g.attackDefinition('punch').damage;
 const q=buy(g,set(catalog.id));for(const i of q.items)g.equipItem(i.uid);assert.ok(g.attackDefinition('punch').damage<natural*1.35);g.leaveTree();g.paused=false;for(let r=1;r<region;r++)bossVictory(g.world,r);g.travel(region);g.hero.x=5840;g.enterBoss();const b=g.bossEncounter.boss,hp=b.maxHp;
 g.hero.invulnerable=0;const before=g.hero.hp;assert.ok(g.hurt(b.damage,b.x,b));assert.ok(g.hero.hp<before);assert.equal(b.hp,hp);assert.equal(g.monsterDamage(b),b.damage);assert.equal(g.visitTree(),false);
 for(const power of POWER_IDS){const stats=powerStats(power,Math.min(20,level-1),{heroLevel:level,equipment:g.equipment});assert.equal(stats.cooldown,powerStats(power,Math.min(20,level-1)).cooldown);}
});
test('invalid Phase 6 ledgers, retired-item resurrection and conflicting head slots are rejected',()=>{
 const g=camp(50);buy(g,set());const raw=JSON.parse(g.save());
 for(const mutate of [r=>delete r.economy,r=>delete r.inventory.retired,r=>r.economy.revision=-1,r=>r.inventory.retired[r.inventory.items[0].uid]='discarded',r=>r.inventory.items[0].uid='drop-'+ '9'.repeat(30)]){const bad=structuredClone(raw);mutate(bad);assert.equal(decodeSave(JSON.stringify(bad)),null);}
 const under=structuredClone(raw);under.inventory.items[0].catalogId='eris-horizon-ordinary-helmet';under.inventory.equipped.helmet=under.inventory.items[0].uid;assert.equal(decodeSave(JSON.stringify(under)),null);
});
test('Health Root use creates a new permanent revision so stale safe snapshots cannot replenish it',()=>{
 const g=camp(),memory=storage(),store=new LocalHeroStore(memory);g.healthRoots=4;store.writeSlot(0,g.save());const old=g.save();g.hero.hp=1;g.useHealthRoot();store.writeSlot(0,g.save());assert.equal(store.writeSlot(0,old).ok,false);assert.equal(store.slot(0).snapshot.healthRoots,3);
});

test('long-battle reward queues survive reload without exceeding seven owned items',()=>{
 const g=camp(99);g.inventory.pending=Array.from({length:40},(_,i)=>({uid:`drop-${i+1}`,catalogId:'eris-shore-ordinary-boots'}));g.inventory.nextId=41;const copy=decodeSave(g.save());assert.ok(copy);assert.equal(copy.inventory.pending.length,40);assert.equal(copy.inventory.items.length,0);
});
