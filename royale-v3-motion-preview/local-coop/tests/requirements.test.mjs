import test from 'node:test';import assert from 'node:assert/strict';
import {Game,decodeSave,xpForLevel} from '../../core.mjs';import {POWERS} from '../../powers.mjs';import {TYPES} from '../../world.mjs';import {BOSSES} from '../../boss-data.mjs';import {createEquipment} from '../../equipment.mjs';import {pickupLoot,expireLoot} from '../../world-loot.mjs';import {monsterXP} from '../../progression.mjs';
import {LocalSession,captureProgress} from '../session.mjs';import {isOffscreen,safeLanding,teleportFollower} from '../teleport.mjs';
function setup({now=Date.now}={}){const profiles=[0,1].map(i=>({identity:'a'+i,slots:[{slot_number:1,snapshot:JSON.parse(new Game().save())}],saved:[],async save(slot,snapshot){this.saved.push({slot,snapshot});}}));return {profiles,s:new LocalSession(profiles.map(profile=>({profile,slot:1})),{now})};}
function kill(s,n=0,random=()=>.9){const g=s.games[0],e=g.enemies[n];e.protection=0;e.hp=1;g.random=random;g.damageEnemy(e,999999);return e;}
function ready(s){s.markReady(0);s.markReady(1);}
function bossVictory(s){s.command(0,'enterBoss');const room=s.authority.state.rooms.get(s.heroes[0].room),world=room.worlds.get(s.heroes[0].zone);for(const e of world.enemies){e.hp=0;e.state='dead';}s.authority.completeWorld(room,world);return {room,world};}

test('regular full coin rewards accrue independently without duplicate deaths',()=>{const {s}=setup(),e=kill(s);assert.deepEqual(s.games.map(g=>g.hero.coins),[1,1]);s.authority.reward(s.heroes[0],e);assert.deepEqual(s.games.map(g=>g.hero.coins),[1,1]);});
test('odd XP remainder alternates deterministically and conserves base XP',()=>{const {s}=setup();s.command(0,'travel',[2]);s.games.forEach(g=>g.hero.level=10);const odd=s.games[0].enemies.filter(e=>TYPES[e.type].xp%2);assert(odd.length>=2);const balances=[0,0];for(const e of odd.slice(0,2)){e.protection=0;e.hp=1;const before=s.games.map(g=>g.hero.xp);s.games[0].damageEnemy(e,999999);const gained=s.games.map((g,i)=>g.hero.xp-before[i]);assert.equal(gained[0]+gained[1],TYPES[e.type].xp);gained.forEach((v,i)=>balances[i]+=v);}assert.equal(balances[0],balances[1]);});
test('both heroes get boss XP and full first-victory coins without final-hit ownership',()=>{const {s}=setup();const {room,world}=bossVictory(s);assert.deepEqual(s.games.map(g=>g.hero.coins),[100,100]);assert(s.games.every(g=>g.bossProgress.records[1].wins===1));const before=s.games.map(g=>captureProgress(g));s.authority.completeWorld(room,world);assert.deepEqual(s.games.map(g=>captureProgress(g)),before);});
test('first-defeat boss coin eligibility stays per account',()=>{const {s}=setup();const g=s.games[0];g.world.bossVictories=[1];g.bossProgress.records[1]={wins:1,chest:{state:'claimed',coins:0,roots:0,items:[]}};bossVictory(s);assert.deepEqual(s.games.map(g=>g.hero.coins),[10,100]);});
test('boss chest claims are independent and cannot repeat',()=>{const {s}=setup();bossVictory(s);s.games.forEach(g=>g.combatTimer=0);assert(s.command(0,'claimChest'));assert(s.games[1].availableChest());const coins=s.games[0].hero.coins;assert.equal(s.command(0,'claimChest'),false);assert.equal(s.games[0].hero.coins,coins);assert(s.command(1,'claimChest'));});
for(const order of [[0,1],[1,0]])test(`one loot roll; matching independent copies; pickup order ${order}`,async()=>{
 const {s}=setup();let rolls=0;kill(s,0,()=>{rolls++;return .001;});assert.equal(s.authority.sharedDrops.size,1);assert.equal(s.visualLoot().length,1);const [a,b]=s.games;assert.equal(a.loot.length,1);assert.equal(b.loot.length,1);assert(rolls>0);assert.notEqual(a.loot[0].item,b.loot[0].item);
 assert.deepEqual({...a.loot[0].item,uid:''},{...b.loot[0].item,uid:''});
 for(const i of order){const g=s.games[i],drop=g.loot[0];g.hero.x=drop.x;g.hero.y=drop.y;assert(pickupLoot(g,drop.id));assert.equal(pickupLoot(g,drop.id),false);s.authority.reconcileDrops();}
 assert.equal(s.visualLoot().length,0);assert.equal(s.authority.sharedDrops.size,0);assert.equal(a.inventory.items.length,1);assert.equal(b.inventory.items.length,1);
 assert.notEqual(a.inventory.items[0],b.inventory.items[0]);
 for(const g of [a,b])assert(decodeSave(JSON.stringify(captureProgress(g))));
});
test('equipment drop rate is rolled once, without a second player random roll',()=>{const {s}=setup();s.games[1].random=()=>{throw Error('Second independent roll');};kill(s,0,()=>.9);assert.equal(s.visualLoot().length,0);});
for(const fullPlayer of [0,1])test(`full inventory only blocks player ${fullPlayer+1}`,()=>{const {s}=setup();const full=s.games[fullPlayer];for(let i=0;i<20;i++)full.inventory.items.push(createEquipment(1,'ordinary',0,full.inventory.nextId++));kill(s,0,()=>.001);for(let i=0;i<2;i++){const g=s.games[i],o=g.loot[0];g.hero.x=o.x;g.hero.y=o.y;assert.equal(pickupLoot(g,o.id),i!==fullPlayer);}assert.equal(full.loot.length,1);assert.equal(s.games[1-fullPlayer].loot.length,0);assert.equal(s.visualLoot().length,1);});
test('shared ordinary loot expires at 20 seconds while boss rewards remain',()=>{let now=50000;const {s}=setup({now:()=>now});kill(s,0,()=>.001);now+=19999;s.expireLoot();assert.equal(s.visualLoot().length,1);now++;s.expireLoot();assert.equal(s.visualLoot().length,0);assert(s.games.every(g=>!g.loot.length));});
test('inventory copies and independent coin balances survive snapshot restoration',async()=>{const {s,profiles}=setup();kill(s,0,()=>.001);for(const g of s.games){const o=g.loot[0];g.hero.x=o.x;g.hero.y=o.y;pickupLoot(g,o.id);g.combatTimer=0;}await s.saveAll();const restored=profiles.map(p=>new Game({save:decodeSave(JSON.stringify(p.saved[0].snapshot))}));assert(restored.every(g=>g.inventory.items.length===1&&g.hero.coins===1));assert.deepEqual(restored[0].inventory.items[0].stats,restored[1].inventory.items[0].stats);});
test('offscreen test waits until the entire hero crosses the margin',()=>{const h={x:0,y:100,w:34,h:88},v={x:0,y:0,width:600,height:400};assert(!isOffscreen(h,v));h.x=-48;assert(!isOffscreen(h,v));h.x=-50;assert(isOffscreen(h,v));h.x=650;assert(isOffscreen(h,v));});
test('teleport finds ground beside airborne leader and preserves progression',()=>{const {s}=setup(),g=s.games[1],leader=s.games[0].hero;leader.x=160;leader.y=400;g.hero.x=1500;const before={hp:g.hero.hp,xp:g.hero.xp,coins:g.hero.coins,inventory:structuredClone(g.inventory),powers:structuredClone(g.powers.data)};assert(teleportFollower(g,leader,{x:0,y:0,width:1000,height:720}));assert.equal(g.hero.y,600);assert.equal(g.hero.vx,0);assert.equal(g.hero.vy,0);assert(Math.abs(g.hero.x-leader.x)>=46);assert.deepEqual({hp:g.hero.hp,xp:g.hero.xp,coins:g.hero.coins,inventory:g.inventory,powers:g.powers.data},before);assert.equal(teleportFollower(g,leader,{x:0,y:0,width:1000,height:720}),false);});
test('teleport avoids enemies, solid walls and hazards; no unsafe fallback',()=>{const {s}=setup(),g=s.games[1],leader={x:160,y:400};g.surfaces=[{x:0,y:600,w:500,h:60,id:'floor'},{x:70,y:400,w:80,h:200,id:'wall'}];g.enemies=[{x:224,y:600,w:100,h:100,hp:100,state:'idle'}];g.legendaryHazards=[{x:280,y:400,w:220,h:200,life:5}];const place=safeLanding(g,leader,{x:0,y:0,width:500,height:720});if(place){const box={x:place.x-g.hero.w/2,y:place.y-g.hero.h,w:g.hero.w,h:g.hero.h};assert(!g.legendaryHazards.some(a=>box.x<a.x+a.w&&box.x+box.w>a.x&&box.y<a.y+a.h&&box.y+box.h>a.y));assert(!g.surfaces.some(a=>box.x<a.x+a.w&&box.x+box.w>a.x&&box.y<a.y+a.h&&box.y+box.h>a.y));}g.surfaces=[];assert.equal(safeLanding(g,leader,{x:0,y:0,width:500,height:720}),null);});
test('single player Ready never unpauses; cancellation and both Ready work',()=>{const {s}=setup();s.setPaused(false);s.pause();assert.equal(s.markReady(0),false);assert(s.paused);s.markReady(0,false);assert.deepEqual(s.ready,[false,false]);s.markReady(1);assert(s.paused);assert(s.markReady(0));assert.equal(s.paused,false);});
test('simultaneous upgrades affect only each hero and preserve caps',()=>{const {s}=setup();s.games.forEach(g=>{g.hero.level=10;g.powers.data.points=9;});s.command(0,'visitTree');s.command(1,'visitTree');assert(s.command(0,'upgradePower',['fireball',2]).ok);assert(s.command(1,'upgradePower',['strength',3]).ok);assert.equal(s.games[0].powers.data.levels.strength,0);assert.equal(s.games[1].powers.data.levels.fireball,0);assert.deepEqual(s.games.map(g=>g.powers.data.points),[7,6]);assert.equal(s.command(0,'upgradePower',['fireball',20]).ok,false);});
for(const departing of [0,1])test(`player ${departing+1} leaves, other preserves world and resumes solo rewards/autosave`,async()=>{const {s,profiles}=setup(),remaining=1-departing,enemies=s.games[remaining].enemies;await s.leave(departing);assert.equal(profiles[departing].saved.length,1);assert.equal(s.leader,remaining);assert.equal(s.games[remaining].enemies,enemies);assert.equal(s.paused,false);const g=s.games[remaining],e=g.enemies[0];e.hp=1;e.protection=0;g.damageEnemy(e,99999);assert.equal(g.hero.xp,monsterXP(TYPES[e.type].xp,g.hero.level,e.level));await s.saveAll();assert.equal(profiles[remaining].saved.length,1);assert.equal(profiles[departing].saved.length,1);});
test('failed final save keeps departing hero and pending session available',async()=>{const {s,profiles}=setup();profiles[1].save=async()=>{throw Error('Offline');};const result=await s.leave(1);assert.equal(result.ok,false);assert.equal(s.active.size,2);assert(s.paused);});
test('region travel joins both heroes to the same authoritative enemies',()=>{const {s}=setup();assert(s.command(1,'travel',[2]));assert.deepEqual(s.games.map(g=>g.regionId),[2,2]);assert.equal(s.games[0].enemies,s.games[1].enemies);assert.equal(s.leader,0);});
test('checkpoint capture is equivalent to solo save outside combat',()=>{const {s}=setup(),g=s.games[0];assert.deepEqual(captureProgress(g),JSON.parse(g.save()));});
test('boss XP is conserved exactly across independent level-ups',()=>{
 const {s}=setup();bossVictory(s);const total=g=>g.hero.xp+Array.from({length:g.hero.level-1},(_,n)=>xpForLevel(n+1)).reduce((a,b)=>a+b,0);
 assert.equal(total(s.games[0])+total(s.games[1]),BOSSES[1].xp);assert(Math.abs(total(s.games[0])-total(s.games[1]))<=1);
});
test('dead active partner still receives their share without duplicate deaths',()=>{
 const {s}=setup();s.games[1].hero.dead=true;s.games[1].hero.hp=0;const e=kill(s);assert.equal(s.games[0].hero.xp+s.games[1].hero.xp,TYPES[e.type].xp);assert.equal(s.games[1].hero.coins,1);assert(decodeSave(JSON.stringify(captureProgress(s.games[1]))));
});
test('one authority advances each shared enemy once per simulation tick',()=>{
 const {s}=setup();let count=0;const original=Game.prototype.stepEnemy;Game.prototype.stepEnemy=function(...args){count++;return original.apply(this,args);};
 try{ready(s);s.step([{},{}]);assert.equal(count,s.games[0].enemies.length);}finally{Game.prototype.stepEnemy=original;}
});
for(const [id,def] of Object.entries(POWERS).filter(([,def])=>!def.passive))test(`active ${id} can checkpoint safely during combat`,()=>{
 const {s}=setup();for(const g of s.games){g.hero.level=99;g.powers.data.levels[id]=20;g.powers.data.points=78;g.powers.data.equipped=[id,null,null];g.hero.grounded=true;}
 ready(s);s.games.forEach(g=>assert(g.powers.activate(id)));s.step([{},{}]);for(const g of s.games)assert(decodeSave(JSON.stringify(captureProgress(g))));
});
test('concurrent departures remain paused until both final saves settle',async()=>{
 const {s,profiles}=setup();const release=[];profiles.forEach((p,i)=>p.save=()=>new Promise(r=>release[i]=r));
 const a=s.leave(0),b=s.leave(1);assert(s.paused);release[0]();await a;assert(s.paused);assert.equal(s.markReady(1),false);release[1]();await b;assert.equal(s.active.size,0);
});

for(const claimed of [[false,false],[true,false],[false,true],[true,true]])test(`mixed boss chest eligibility ${claimed}: retries and restore retain each hero's claim`,async()=>{
 const {s,profiles}=setup();
 for(let i=0;i<2;i++)if(claimed[i]){s.games[i].world.bossVictories=[1];s.games[i].bossProgress.records[1]={wins:1,chest:{state:'claimed',coins:0,roots:0,items:[]}};}
 const {room,world}=bossVictory(s);const before=s.games.map(g=>structuredClone(g.bossProgress));s.authority.completeWorld(room,world);assert.deepEqual(s.games.map(g=>g.bossProgress),before);
 for(let i=0;i<2;i++){s.games[i].combatTimer=0;assert.equal(!!s.games[i].availableChest(),!claimed[i]);assert.equal(s.command(i,'claimChest'),!claimed[i]);assert.equal(s.command(i,'claimChest'),false);}
 await s.saveAll();for(const p of profiles){const g=new Game({save:decodeSave(JSON.stringify(p.saved[0].snapshot))});assert.equal(g.bossProgress.records[1].chest.state,'claimed');assert.equal(g.claimChest(),false);}
});
test('companion in leader-only unlocked region earns own chest after actual shared victory',()=>{
 const {s}=setup();s.games[0].world.unlocked=[1,2,3,4];s.command(0,'travel',[4]);s.games[1].world.unlocked=[1,2];
 s.games[0].world.bossVictories=[4];s.games[0].bossProgress.records[4]={wins:1,chest:{state:'claimed',coins:0,roots:0,items:[]}};
 bossVictory(s);assert.equal(s.games[0].availableChest(),null);assert(s.games[1].availableChest());assert(s.games[1].world.bossVictories.includes(4));assert.deepEqual(s.games.map(g=>g.hero.coins),[10,100]);
});
test('full inventory holds all chest equipment safely through save/restore',async()=>{
 const {s,profiles}=setup();for(const g of s.games)for(let n=0;n<20;n++)g.inventory.items.push(createEquipment(1,'ordinary',0,g.inventory.nextId++));
 bossVictory(s);for(let i=0;i<2;i++){const g=s.games[i];g.combatTimer=0;assert(s.command(i,'claimChest'));assert(g.inventory.pending.length>0);assert.equal(s.command(i,'acceptReward'),false);}
 await s.saveAll();for(const p of profiles){const g=new Game({save:decodeSave(JSON.stringify(p.saved[0].snapshot))});assert.equal(g.inventory.items.length,20);assert(g.inventory.pending.length>0);assert.equal(g.claimChest(),false);}
});
