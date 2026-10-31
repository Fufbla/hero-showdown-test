import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, STEP, decodeSave, xpForLevel } from '../core.mjs';
import { BOSSES, BOSS_ATTACKS, ARENA, bossPhase } from '../boss-data.mjs';
import { rollChest, normalizeBossProgress } from '../boss-state.mjs';
import { bossVictory, CLOCK } from '../progression.mjs';
import { powerStats, POWER_IDS } from '../powers.mjs';
import { createEquipment } from '../equipment.mjs';
import { LocalHeroStore, PROFILE_KEY } from '../saves.mjs';
const tick=(g,seconds,input={})=>{for(let i=0;i<Math.ceil(seconds/STEP);i++)g.step(STEP,input);};
function fixture(region=1,random=()=>.99){
  const g=new Game({random});for(let i=1;i<region;i++)bossVictory(g.world,i);g.travel(region);
  const level=BOSSES[region].level;Object.assign(g.hero,{level,hp:100+15*(level-1),maxHp:100+15*(level-1),x:5840,prevX:5840,coins:300});g.healthRoots=4;g.powers.data.points=level-1;
  assert.ok(g.enterBoss());return g;
}
function vulnerable(g){g.hero.invulnerable=0;g.hero.stun=0;}
function kill(g,e){e.protection=0;g.damageEnemy(e,e.maxHp*2,{stagger:false});}
function clear(g){kill(g,g.bossEncounter.boss);for(const e of g.enemies.filter(e=>e.summoned))kill(g,e);g.stepEncounter(STEP);}
function setPower(g,id,level=20){for(const key of POWER_IDS)g.powers.data.levels[key]=0;g.hero.level=99;g.hero.hp=g.hero.maxHp=1570;g.powers.data.levels[id]=level;g.powers.data.points=98-level;g.powers.data.equipped=[id,null,null];g.powers.cooldowns[id]=0;g.hero.stun=0;g.hero.attack=null;g.hero.invulnerable=0;g.powers.cancelEffects();g.powers.cooldowns[id]=0;}

test('phase boundaries are exact at 50% and 20%',()=>{assert.deepEqual([1,.51,.500001,.5,.21,.200001,.2,0].map(bossPhase),[1,1,1,2,2,2,3,3]);});
test('all major patterns have readable warnings and recovery windows, with unique regional signatures',()=>{
  for(const a of Object.values(BOSS_ATTACKS)){assert.ok(a.warning>=.95);assert.ok(a.recovery>=1.1);assert.ok(a.duration>0);}
  assert.equal(new Set(Object.values(BOSSES).map(b=>JSON.stringify(b.patterns))).size,7);
  assert.ok(BOSSES[7].hp>Math.max(...Object.values(BOSSES).slice(0,6).map(b=>b.hp)));
});
for(const region of [1,2,3,4,5,6,7]){
  const def=BOSSES[region];
  test(`${def.name}: immediate entry, defined scaling, no introductions or level lock`,()=>{
    const g=fixture(region),b=g.bossEncounter.boss;assert.equal(b.hp,def.hp);assert.equal(b.damage,def.damage);assert.equal(b.phase,1);assert.equal(g.enemies.length,1);assert.equal(g.camps.length,0);assert.equal(g.canSave(),false);assert.equal(g.visitTree(),false);assert.equal(g.travel(1),false);assert.equal(g.returnCheckpoint(),false);
    g.leaveBoss();g.hero.level=1;g.hero.x=5840;g.combatTimer=0;assert.ok(g.enterBoss());assert.equal(g.bossEncounter.boss.hp,def.hp);
  });
  test(`${def.name}: phases update immediately; no waves above 20%, exactly three per wave and max nine`,()=>{
    const g=fixture(region),b=g.bossEncounter.boss;g.hero.invulnerable=9999;g.damageEnemy(b,b.maxHp*.5);assert.equal(b.phase,2);tick(g,18);assert.equal(g.bossEncounter.spawned,0);
    g.damageEnemy(b,b.maxHp*.3);assert.equal(b.phase,3);tick(g,2.2);assert.equal(g.bossEncounter.spawned,3);assert.equal(g.bossEncounter.waves,1);
    tick(g,15);assert.equal(g.bossEncounter.waves,1,'live helpers delay another wave');
    for(let wave=2;wave<=3;wave++){for(const e of g.enemies.filter(e=>e.summoned&&e.state!=='dead'))kill(g,e);tick(g,12.1);assert.equal(g.bossEncounter.waves,wave);assert.equal(g.enemies.filter(e=>e.summoned&&e.state!=='dead').length,3);}
    for(const e of g.enemies.filter(e=>e.summoned))kill(g,e);tick(g,50);assert.equal(g.bossEncounter.spawned,9);assert.equal(g.bossEncounter.waves,3);
  });
  test(`${def.name}: helpers survive boss death, award only XP, and gate victory until cleared`,()=>{
    const g=fixture(region,()=>0),b=g.bossEncounter.boss;g.hero.invulnerable=9999;g.damageEnemy(b,b.maxHp*.8);tick(g,2.2);
    assert.equal(g.enemies.filter(e=>e.summoned).length,3);const coins=g.hero.coins,roots=g.healthRoots,items=g.inventory.items.length,xp=g.hero.xp;
    kill(g,b);tick(g,20);assert.ok(g.bossEncounter);assert.equal(g.world.bossVictories.includes(region),false);assert.equal(g.hero.coins,coins);assert.equal(g.bossEncounter.waves,1);
    for(const e of g.enemies.filter(e=>e.summoned))kill(g,e);
    assert.equal(g.hero.coins,coins);assert.equal(g.healthRoots,roots);assert.equal(g.inventory.items.length,items);if(g.hero.level<99)assert.ok(g.hero.xp>xp||g.hero.level>def.level);
    g.stepEncounter(STEP);assert.equal(g.bossEncounter,null);assert.equal(g.hero.coins,coins+100);assert.equal(g.bossProgress.records[region].wins,1);assert.ok(g.availableChest());
    assert.ok(g.world.bossVictories.includes(region));if(region<7)assert.ok(g.world.unlocked.includes(region+1));assert.equal(g.completeBoss(),false);assert.equal(g.hero.coins,coins+100);
  });
  test(`${def.name}: death after boss is down resets everything, keeps earned helper XP except penalty`,()=>{
    const g=fixture(region),b=g.bossEncounter.boss;g.hero.invulnerable=9999;g.damageEnemy(b,b.maxHp*.8);tick(g,2.2);kill(g,b);kill(g,g.enemies.find(e=>e.summoned));
    const oldXP=g.hero.xp,level=g.hero.level,coins=g.hero.coins,roots=g.healthRoots;g.defeat();assert.equal(g.hero.xp,level===99?oldXP:Math.max(0,oldXP-Math.floor(xpForLevel(level)*.1)));assert.equal(g.arenaScene,null);assert.equal(g.world.bossVictories.includes(region),false);
    tick(g,1.6);assert.equal(g.hero.hp,g.hero.maxHp);assert.equal(g.hero.coins,coins);assert.equal(g.healthRoots,roots);assert.equal(g.hero.x,160);g.hero.x=5840;assert.ok(g.enterBoss());assert.equal(g.bossEncounter.boss.hp,def.hp);assert.equal(g.bossEncounter.boss.phase,1);assert.equal(g.bossEncounter.waves,0);
  });
  test(`${def.name}: walking left retreats during combat, no XP penalty or victory`,()=>{
    const g=fixture(region),b=g.bossEncounter.boss;g.damageEnemy(b,1);g.hero.xp=123;g.hero.x=ARENA.left-1;g.stepEncounter(STEP);
    assert.equal(g.arenaScene,null);assert.equal(g.hero.xp,123);assert.equal(g.hero.coins,300);assert.equal(g.hero.x,5840);assert.equal(g.bossProgress.records[region],undefined);assert.equal(g.canTravel(),false);
    g.enemies=[];tick(g,5.1);assert.ok(g.canTravel());assert.ok(g.enterBoss());assert.equal(g.bossEncounter.boss.hp,def.hp);
  });
  test(`${def.name}: rematch has ten coins, independent victory count, no new chest`,()=>{
    const g=fixture(region);clear(g);const chest=JSON.stringify(g.availableChest());assert.ok(g.claimChest());while(g.inventory.pending.length)g.resolveReward(null,true);
    const claimed=JSON.stringify(g.bossProgress.records[region].chest);g.leaveBoss();g.combatTimer=0;assert.ok(g.enterBoss());const coins=g.hero.coins;clear(g);
    assert.equal(g.hero.coins,coins+10);assert.equal(g.bossProgress.records[region].wins,2);assert.equal(g.availableChest(),null);assert.equal(JSON.stringify(g.bossProgress.records[region].chest),claimed);assert.ok(chest.includes('available'));
  });
  test(`${def.name}: its attacks run through all phases and cannot gain night damage`,()=>{
    const g=fixture(region),b=g.bossEncounter.boss;let now=0;g.now=()=>now;g.world.clockReference=0;
    const damage=g.monsterDamage(b);now=CLOCK.day;assert.equal(g.monsterDamage(b),damage);assert.equal(b.maxHp,def.hp);
    const seen=new Set();g.hero.hp=g.hero.maxHp=1e7;
    for(const phase of [1,2,3]){b.phase=phase;b.state='idle';b.age=0;for(let i=0;i<1800;i++){g.hero.x=b.x-115;g.hero.y=600;g.hero.invulnerable=0;g.step(STEP);if(b.attack)seen.add(b.attack.kind);}}
    for(const kind of new Set(def.patterns.flat()))assert.ok(seen.has(kind),`${kind} was never used`);assert.ok(g.hero.hp<1e7);
  });
}
test('no victory if hero and final helper die on the same step',()=>{const g=fixture();const b=g.bossEncounter.boss;g.damageEnemy(b,b.maxHp*.8);tick(g,2.2);for(const e of g.enemies)kill(g,e);g.defeat();g.stepEncounter(STEP);assert.equal(g.bossProgress.records[1],undefined);assert.equal(g.hero.coins,300);});
test('summoned helpers never respawn, even after a long encounter',()=>{const g=fixture(4);g.hero.invulnerable=9999;g.damageEnemy(g.bossEncounter.boss,g.bossEncounter.boss.maxHp*.8);tick(g,2.2);const e=g.enemies.find(e=>e.summoned);kill(g,e);g.hero.x=1800;tick(g,180);assert.equal(e.state,'dead');assert.equal(e.hp,0);});
test('Flight rolls 50% for regional boss attacks and none for helpers; only Fireball can attack',()=>{
  const g=fixture(3);setPower(g,'flight');g.powers.activate('flight');const b=g.bossEncounter.boss;let hits=0;for(let i=0;i<1000;i++){g.random=()=>(i+.5)/1000;vulnerable(g);hits+=Number(g.hurt(1,0,b));}assert.equal(hits,500);
  vulnerable(g);assert.equal(g.hurt(10,0,{summoned:true}),false);for(const id of ['strength','superKick','roots','whirlwind']){g.powers.data.levels[id]=1;g.powers.data.equipped[1]=id;assert.equal(g.powers.activate(id),false);}g.powers.data.levels.fireball=1;g.powers.data.equipped[1]='fireball';assert.ok(g.powers.activate('fireball'));assert.equal(g.powers.cooldowns.fireball,5);
});
test('Steel Body reduces regional damage and blocks knockback at levels 1, 10, 20',()=>{
  for(const level of [1,10,20]){const g=fixture(7);setPower(g,'steel',level);g.powers.activate('steel');const hp=g.hero.hp;g.hero.vx=12;g.hurt(100,0,g.bossEncounter.boss);assert.equal(g.hero.hp,hp-100*(1-powerStats('steel',level).reduction));assert.equal(g.hero.vx,12);assert.equal(g.hero.stun,0);}
});
test('Agility preserves 75% regular-boss dodge and reserved 50% Legendary dodge',()=>{
  const g=fixture(7);setPower(g,'agility');g.powers.activate('agility');for(const legendary of [false,true]){let hit=0;for(let i=0;i<1000;i++){g.random=()=>(i+.5)/1000;vulnerable(g);hit+=Number(g.hurt(.1,0,{boss:true,legendary}));}assert.equal(hit,legendary?500:250);}
});
test('Ground Roots halve boss movement without disabling attacks, and cannot affect airborne bosses',()=>{
  const normal=fixture(3),rooted=fixture(3);setPower(rooted,'roots');rooted.hero.x=rooted.bossEncounter.boss.x-240;normal.hero.x=normal.bossEncounter.boss.x-240;const a=normal.bossEncounter.boss,b=rooted.bossEncounter.boss,start=b.x;rooted.powers.activate('roots');normal.stepEnemy(a,STEP);rooted.stepEnemy(b,STEP);assert.ok(Math.abs((start-b.x)*2-(start-a.x))<1e-6);tick(rooted,4);assert.ok(b.hp<b.maxHp);assert.ok(rooted.drain().some(e=>e.type==='boss-attack'));
  rooted.powers.end('roots');rooted.powers.cooldowns.roots=0;b.airborne=true;assert.ok(rooted.powers.activate('roots'));assert.equal(rooted.powers.active.roots.targets.includes(b.id),false);
});
test('Whirlwind never lifts bosses; Super Strength uses exact level resistance with zero displacement',()=>{
  for(const level of [1,10,20]){const g=fixture(7);setPower(g,'strength',level);const b=g.bossEncounter.boss;g.hero.x=b.x-80;const x=b.x,hp=b.hp;g.powers.activate('strength');g.powers.melee(g.hero.attack,[b]);assert.equal(b.hp,hp-powerStats('strength',level,{heroLevel:99}).damage*powerStats('strength',level).bossEffectiveness);assert.equal(b.x,x);}
  const g=fixture(7);setPower(g,'whirlwind');const b=g.bossEncounter.boss;g.hero.x=b.x-100;g.powers.activate('whirlwind');tick(g,1.1);assert.ok(b.hp<b.maxHp);assert.equal(b.lifted,false);assert.equal(b.y,600);
});
test('Super Kick hits remain equal against actual bosses; Speed never increases damage',()=>{
  const g=fixture(7);setPower(g,'superKick');const b=g.bossEncounter.boss;g.hero.x=b.x-70;g.powers.activate('superKick');const amounts=[];for(let i=0;i<6;i++){const hp=b.hp;g.powers.melee(g.hero.attack,[b]);amounts.push(hp-b.hp);g.hero.attack=null;g.powers.step(STEP);}assert.equal(new Set(amounts).size,1);assert.equal(amounts.length,6);
  const damage=g.attackDefinition('kick').damage;g.powers.data.levels.speed=20;g.equipment.attackSpeed=.5;assert.equal(g.powers.attackRate,1.5);assert.equal(g.attackDefinition('kick').damage,damage);
});
test('level-20 Fireball hits boss then helper for half damage with no homing or burn',()=>{
  const g=fixture(1);setPower(g,'fireball');const b=g.bossEncounter.boss;g.hero.x=600;b.x=740;b.prevX=740;const e=g.makeEnemy('slime',830,'arena-floor',201);e.summoned=true;e.hp=e.maxHp=1000;e.protection=0;e.h=80;g.enemies.push(e);
  g.powers.projectiles.push({x:700,y:555,vx:520,life:1,damage:100,pierce:2,hits:new Set()});const hp=b.hp;for(let i=0;i<20;i++)g.powers.step(STEP);assert.equal(b.hp,hp-100);assert.equal(e.hp,950);assert.equal(g.powers.projectiles.length,0);assert.equal(b.burning,undefined);
});
test('Health Roots work repeatedly during a boss encounter and persist after defeat',()=>{const g=fixture(5);g.hero.hp=1;for(let i=0;i<3;i++)assert.ok(g.useHealthRoot());assert.equal(g.healthRoots,1);assert.equal(g.hero.hp,1+g.hero.maxHp*.75);g.defeat();tick(g,1.6);assert.equal(g.healthRoots,1);assert.equal(g.hero.hp,g.hero.maxHp);});
test('chest rolls respect rarity restriction, preview content is stable, claims are idempotent',()=>{
  for(let region=1;region<=7;region++)for(const roll of [0,.2,.7,.999]){const c=rollChest(region,()=>roll);assert.ok(c.coins>=20&&c.coins<=40);assert.ok(c.roots>=1&&c.roots<=2);assert.ok(c.items.length>=1&&c.items.length<=2);if(region<4)assert.ok(c.items.every(i=>i.catalogId.includes('-ordinary-')));}
  const g=fixture(4,()=>0);clear(g);const c=JSON.stringify(g.availableChest());assert.equal(JSON.stringify(g.availableChest()),c);const coins=g.hero.coins;assert.ok(g.claimChest());assert.equal(g.hero.coins,coins+20);assert.equal(g.healthRoots,4);assert.equal(g.inventory.pending.length,2);assert.equal(g.claimChest(),false);
});
test('chest equipment is always previewed/pending; free spaces and replacements never exceed seven',()=>{
  const g=fixture(4,()=>0);for(let i=0;i<7;i++)g.inventory.items.push(createEquipment(4,'ordinary',i,i+1));g.inventory.nextId=8;clear(g);assert.ok(g.claimChest());assert.equal(g.inventory.items.length,7);assert.equal(g.acceptReward(),false);assert.equal(g.resolveReward('drop-1',false),false);assert.equal(g.resolveReward('drop-1',true),true);assert.equal(g.inventory.items.length,7);assert.equal(g.inventory.pending.length,1);assert.ok(g.discardItem('drop-2',true));assert.ok(g.acceptReward());assert.equal(g.inventory.items.length,7);assert.equal(g.inventory.pending.length,0);
});
test('first chest remains available after leaving, reloading and rematching; no reroll',()=>{
  const g=fixture(2,()=>.2);clear(g);const c=JSON.stringify(g.availableChest()),saved=decodeSave(g.save());assert.ok(saved);const next=new Game({save:saved});assert.ok(next.arenaScene.cleared);assert.equal(JSON.stringify(next.availableChest()),c);next.leaveBoss();next.combatTimer=0;next.enterBoss();clear(next);assert.equal(JSON.stringify(next.availableChest()),c);assert.equal(next.bossProgress.records[2].wins,2);
});
test('safe entry snapshot restarts whole boss on reload; active battle cannot save',()=>{
  const g=fixture(4),snapshot=g.drain().find(e=>e.type==='boss-entry').snapshot;assert.ok(snapshot);const save=decodeSave(snapshot);assert.equal(save.arena.mode,'restart');g.damageEnemy(g.bossEncounter.boss,6000);g.healthRoots=1;assert.equal(g.save(),null);
  const resumed=new Game({save});assert.equal(resumed.bossEncounter.boss.hp,BOSSES[4].hp);assert.equal(resumed.bossEncounter.boss.phase,1);assert.equal(resumed.bossEncounter.waves,0);assert.equal(resumed.healthRoots,4);assert.equal(resumed.hero.coins,300);
});
test('v1–4 conversion retains prior progression; v5 validates wins, chest claims and arena state',()=>{
  const old=new Game();old.hero.level=35;old.hero.coins=200;old.hero.xp=900;old.powers.data.points=34;let source=JSON.parse(old.save());
  for(const version of [1,2,3,4]){const migrated=decodeSave(JSON.stringify({...source,version}));assert.equal(migrated.level,35);assert.equal(migrated.coins,200);assert.equal(migrated.xp,900);assert.equal(migrated.version,7);assert.deepEqual(migrated.bossProgress.records,{});}
  const g=fixture(4);clear(g);source=JSON.parse(g.save());assert.ok(decodeSave(JSON.stringify(source)));source.bossProgress.records[4].wins=0;assert.equal(decodeSave(JSON.stringify(source)),null);source.bossProgress.records[4].wins=1;source.arena.region=5;assert.equal(decodeSave(JSON.stringify(source)),null);assert.equal(normalizeBossProgress({records:{1:{wins:1,chest:{state:'available',coins:20,roots:1,items:[{uid:'chest-1-0',catalogId:'r4-rare-mask'}]}}}},[1]),null);
});
test('boss wins and chest claims are independent across local hero slots',()=>{
  const m=new Map(),storage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)},store=new LocalHeroStore(storage);const a=fixture(1);clear(a);a.claimChest();assert.ok(store.writeSlot(0,a.save()).ok);const b=new Game();assert.ok(store.writeSlot(1,b.save()).ok);const again=new LocalHeroStore(storage);assert.equal(again.slot(0).snapshot.bossProgress.records[1].chest.state,'claimed');assert.equal(again.slot(1).snapshot.bossProgress.records[1],undefined);assert.ok(m.get(PROFILE_KEY));
});
for(const region of [1,2,3,4,5,6,7])for(const [name,ids] of Object.entries({brawler:['strength','superKick','steel'],ranged:['fireball','flight','agility'],control:['roots','whirlwind','steel']})){
  test(`${BOSSES[region].name}: recommended-level ${name} loadout completes with real attack input`,()=>{
    const g=fixture(region),h=g.hero,b=g.bossEncounter.boss,budget=h.level-1;
    let spent=0;for(let i=0;i<3;i++){const n=Math.min(20,Math.floor(budget*[.45,.3,.2][i]));g.powers.data.levels[ids[i]]=n;spent+=n;}g.powers.data.points=budget-spent;g.powers.data.equipped=ids;
    // Survival is isolated here: deterministic input integration, not a human difficulty rating.
    h.invulnerable=1e6;let frames=0;
    while(g.bossEncounter&&frames++<18000){
      const target=g.enemies.find(e=>e.state!=='dead');if(!target)break;
      const gap=target.x-h.x,desired=name==='ranged'&&g.powers.flying?170:70;
      h.face=gap>=0?1:-1;
      const move=Math.abs(gap)>desired?Math.sign(gap):0;
      g.step(STEP,{move,run:true,kickHeld:name!=='ranged'||!g.powers.flying,powers:[frames%60===1,frames%120===1,frames%180===1],vertical:g.powers.flying?Math.sign(550-h.y)*.3:0});
    }
    assert.equal(h.level>=BOSSES[region].level,true);assert.equal(g.bossEncounter,null,`${name} stalled at ${b.hp} boss HP with ${g.enemies.filter(e=>e.state!=='dead').length} enemies`);assert.equal(g.bossProgress.records[region].wins,1);assert.ok(g.time<300);assert.ok(h.x>=ARENA.left);
  });
}
test('single scorpion stinger warning matches its target and physical reach',()=>{
  const g=fixture(4),b=g.bossEncounter.boss;g.hero.x=420;b.pattern=1;b.age=10;g.stepEnemy(b,STEP);
  assert.equal(b.attack.kind,'sting');assert.ok(Math.abs(b.attack.targetX-b.x)<=200);assert.equal(b.attack.zones.length,1);assert.equal(b.attack.zones[0].x+b.attack.zones[0].w/2,b.attack.targetX);
  const before=g.hero.hp;g.stepEnemy(b,b.attack.warning);assert.equal(g.hero.hp,before);
});
test('a verified victory opens the actual connected passage; arena cannot bypass it',()=>{
  for(let region=1;region<7;region++){const g=fixture(region);assert.equal(g.travel(region+1),false);clear(g);g.leaveBoss();g.combatTimer=0;g.hero.x=6150;assert.ok(g.usePassage());assert.equal(g.regionId,region+1);assert.equal(g.hero.x,160);}
});
test('regional movement uses heavy approach, scuttling and ranged spacing without teleporting',()=>{
  const samples=[];
  for(let region=1;region<=7;region++){
    const g=fixture(region),b=g.bossEncounter.boss;g.hero.x=b.x-90;const x=b.x;
    g.stepEnemy(b,STEP);const delta=b.x-x;samples.push(delta);
    if([4,5,6].includes(region))assert.ok(delta>0,'scuttling/ranged boss should create space');else assert.equal(delta,0);
    assert.ok(Math.abs(delta)<=BOSSES[region].speed*STEP+1e-8,'no movement teleport');
    b.x=x;g.hero.x=x-500;g.stepEnemy(b,STEP);assert.ok(b.x<x,'every boss can approach an out-of-range hero');
  }
  assert.ok(new Set(samples).size>=4);
});
