import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,STEP,decodeSave,xpForLevel} from '../core.mjs';
import {POWERS,POWER_IDS,powerStats,tier,normalizePowers,attackRate,segmentHit,BALANCE,FUTURE_MERGE_SLOT,resolveAbilitySlots} from '../powers.mjs';
import {poseFor} from '../hero-rig.mjs';
import {normalizeControls} from '../controls.mjs';
const near=(a,b,epsilon=1e-6)=>assert.ok(Math.abs(a-b)<=epsilon,`${a} ≈ ${b}`);
const tick=(g,seconds,input={})=>{for(let i=0;i<Math.round(seconds/STEP);i++)g.step(STEP,input);};
function setup(id,level=1,extra={}){
  const g=new Game(extra);g.enemies=[];Object.assign(g.hero,{x:1000,prevX:1000,y:600,prevY:600,level:99,hp:1570,maxHp:1570,invulnerable:0});
  g.powers.data.levels[id]=level;g.powers.data.equipped=[id==='speed'?null:id,null,null];g.powers.data.points=98-level;return g;
}
function enemy(g,x=1040,extra={}){
  const e=g.makeEnemy('crawler',x,'sand-a',g.enemies.length);Object.assign(e,{hp:10000,maxHp:10000,protection:0,stagger:10000},extra);g.enemies.push(e);return e;
}
function cast(g,id){assert.equal(g.powers.activate(id),true,`activate ${id}`);}
for(const level of [1,4,5,9,10,14,15,19,20]){
  test(`Super Strength L${level}: forward cap, calculated damage, boss resistance and cooldown`,()=>{
    const g=setup('strength',level,{equipment:{strength:4,damage:3}}),front=Array.from({length:6},(_,i)=>enemy(g,1025+i*4)),behind=enemy(g,960),s=g.powers.stats('strength');
    cast(g,'strength');near(g.powers.cooldowns.strength,8);tick(g,.3);
    assert.equal(front.filter(e=>e.hp<10000).length,tier(level));near(behind.hp,10000);for(const e of front.filter(e=>e.hp<10000))near(10000-e.hp,s.damage);
    const b=setup('strength',level),boss=enemy(b,1040,{boss:true});cast(b,'strength');tick(b,.3);near(10000-boss.hp,b.powers.stats('strength').damage*(.25+.75*(level-1)/19));
  });
  test(`Super Kick L${level}: one target, equal kicks, no teleport, cooldown after combination`,()=>{
    const g=setup('superKick',level),e=enemy(g),other=enemy(g,1042),s=g.powers.stats('superKick');cast(g,'superKick');
    let hits=0,previous=e.hp,guard=0;
    while(g.powers.active.superKick&&guard++<500){g.step();if(e.hp!==previous){near(previous-e.hp,s.damage);hits++;previous=e.hp;}if(g.powers.active.superKick)near(g.powers.cooldowns.superKick,0);}
    assert.equal(hits,s.kicks);near(other.hp,10000);near(g.hero.x,1000);near(g.powers.cooldowns.superKick,6);assert.equal(g.powers.activate('superKick'),false);
  });
  test(`Fireball L${level}: straight burst count, piercing and no ongoing burn`,()=>{
    const g=setup('fireball',level),a=enemy(g,1100,{h:60}),b=enemy(g,1190,{h:60}),c=enemy(g,1280,{h:60}),s=g.powers.stats('fireball');
    cast(g,'fireball');near(g.powers.cooldowns.fireball,5);tick(g,1);
    near(10000-a.hp,s.projectiles*s.damage);near(10000-b.hp,level===20?s.projectiles*s.damage*.5:0);near(c.hp,10000);const hp=a.hp;tick(g,1);near(a.hp,hp);
  });
  test(`Flight L${level}: grounded launch, exact duration, full cancellation cooldown`,()=>{
    const g=setup('flight',level);g.hero.grounded=false;assert.equal(g.powers.activate('flight'),false);g.hero.grounded=true;cast(g,'flight');const duration=level+2;
    tick(g,duration-STEP);assert.ok(g.powers.flying);g.step();assert.equal(g.powers.flying,false);near(g.powers.cooldowns.flight,30);assert.ok(g.hero.vy>0);
    const c=setup('flight',level);cast(c,'flight');tick(c,.5);cast(c,'flight');near(c.powers.cooldowns.flight,30);assert.equal(c.powers.flying,false);
  });
  test(`Steel Body L${level}: reduction, movement, knockback immunity and delayed cooldown`,()=>{
    const g=setup('steel',level),s=g.powers.stats('steel');cast(g,'steel');g.hero.vx=180;g.startAttack('punch');const attack=g.hero.attack;
    assert.ok(g.hurt(100,900));near(g.hero.hp,1570-100*(1-s.reduction));near(g.hero.vx,180);near(g.hero.stun,0);assert.equal(g.hero.attack,attack);
    tick(g,1,{move:1,run:true});assert.ok(g.hero.x>1200);assert.ok(g.powers.active.steel);near(g.powers.cooldowns.steel,0);
    tick(g,s.duration-1);assert.equal(g.powers.active.steel,undefined);near(g.powers.cooldowns.steel,15,STEP);
  });
  test(`Ground Roots L${level}: tier, once-per-second squeezing, grounded targets, cooldown`,()=>{
    const g=setup('roots',level),targets=Array.from({length:6},(_,i)=>enemy(g,1030+i*25)),air=enemy(g,1010,{airborne:true,y:550}),flying=enemy(g,1015,{flying:true}),s=g.powers.stats('roots');
    cast(g,'roots');assert.equal(targets.filter(e=>e.rooted).length,tier(level));assert.ok(!air.rooted&&!flying.rooted);tick(g,.9);near(targets[0].hp,10000);tick(g,.1);near(10000-targets[0].hp,s.damage);
    tick(g,s.duration-1);near(10000-targets[0].hp,s.damage*s.duration);assert.ok(!targets[0].rooted);near(g.powers.cooldowns.roots,10);near(air.hp,10000);near(flying.hp,10000);
  });
  test(`Agility L${level}: duration scales and cooldown starts at expiry`,()=>{
    const g=setup('agility',level),duration=5+10*(level-1)/19;cast(g,'agility');near(g.powers.active.agility.duration,duration);
    tick(g,Math.floor((duration-STEP)/STEP)*STEP);assert.ok(g.powers.active.agility);near(g.powers.cooldowns.agility,0);
    while(g.powers.active.agility)g.step();near(g.powers.cooldowns.agility,10);
  });
  test(`Speed L${level}: passive running and attack rate, no damage bonus or active slot`,()=>{
    const g=setup('speed',level),s=powerStats('speed',level);tick(g,.4,{move:1,run:true});near(g.hero.vx,315*(1+s.runBonus));assert.equal(g.powers.activate('speed'),false);near(g.powers.attackRate,1+s.attackBonus);
    const d=setup('speed',level),e=enemy(d);d.step(STEP,{punch:true});tick(d,.2);near(10000-e.hp,13);
  });
  test(`Whirlwind L${level}: tier, lift, ticks, falling gravity, cooldown`,()=>{
    const g=setup('whirlwind',level),targets=Array.from({length:6},(_,i)=>enemy(g,1020+i*25)),s=g.powers.stats('whirlwind');cast(g,'whirlwind');
    assert.equal(targets.filter(e=>e.lifted).length,tier(level));tick(g,.5);assert.ok(targets[0].y<550);tick(g,s.duration-.5);near(10000-targets[0].hp,s.damage*s.duration);
    assert.equal(targets[0].lifted,false);assert.equal(targets[0].airborne,true);assert.ok(targets[0].vy>0);near(g.powers.cooldowns.whirlwind,12);const y=targets[0].y;g.step();assert.ok(targets[0].y>y);tick(g,1);assert.equal(targets[0].airborne,false);assert.equal(targets[0].y,targets[0].surface.y);
  });
}
test('level-1 and level-20 endpoints, anchor values and maximum attack speed cap',()=>{
  for(const [level,reduction,duration] of [[1,.2,3],[5,.3,4],[10,.45,5],[15,.6,6],[20,.75,8]]){const s=powerStats('steel',level);near(s.reduction,reduction);near(s.duration,duration);}
  near(powerStats('speed',1).runBonus,.05);near(powerStats('speed',20).runBonus,.6);near(attackRate(20,{attackSpeed:.5}),1.5);near(attackRate(1,{attackSpeed:.49}),1.5);
  assert.equal(FUTURE_MERGE_SLOT.index,3);assert.equal(FUTURE_MERGE_SLOT.cooldownMultiplier,.5);
});
test('Super Kick only changes target after defeat or departure from reach; never hits twice per kick',()=>{
  const g=setup('superKick',5),a=enemy(g,1030),b=enemy(g,1040),c=enemy(g,1350),damage=g.powers.stats('superKick').damage;a.hp=damage;
  cast(g,'superKick');tick(g,1.4);assert.equal(a.state,'dead');near(10000-b.hp,damage*2);near(c.hp,10000);near(g.hero.x,1000);
});
test('ground and aerial specials retain steering, fixed reach and collision geometry',()=>{
  for(const build of ['slender','full'])for(const height of [.88,1.12]){
    const g=setup('strength',20);g.look={...g.look,build,height,arms:.85,legs:1.15};g.hero.grounded=false;g.hero.y=500;g.hero.vy=-100;const before=g.hero.x;cast(g,'strength');tick(g,.12,{move:-1});assert.ok(g.hero.x<before);assert.equal(g.attackBox().w,59);assert.equal(g.heroBox().w,34);
    const pose=poseFor(g.look,g.hero,g.time);for(const limb of [...pose.arms,...pose.legs])for(const point of limb)assert.ok(point.every(Number.isFinite));
  }
});
test('Flight forbids basic and other offensive attacks while Fireball keeps its independent cooldown',()=>{
  const g=setup('flight',20);g.powers.data.levels.fireball=20;g.powers.data.levels.strength=20;g.powers.data.equipped=['flight','fireball','strength'];cast(g,'flight');
  tick(g,.4,{punch:true,kickHeld:true,vertical:-1,move:1});assert.equal(g.hero.attack,null);assert.ok(g.hero.x>1000&&g.hero.y<520);assert.equal(g.powers.activate('strength'),false);cast(g,'fireball');near(g.powers.cooldowns.fireball,5);assert.equal(g.powers.activate('fireball'),false);tick(g,5);assert.ok(g.powers.ready('fireball'));
});
test('Flight ordinary immunity and independent 50% boss hit rolls; invalid hits do not roll',()=>{
  let rolls=0;const g=setup('flight',1,{random:()=>{rolls++;return rolls%2? .25:.75;}});cast(g,'flight');
  for(let i=0;i<100;i++)assert.equal(g.hurt(10,0,{boss:false}),false);assert.equal(rolls,0);
  let hit=0;for(let i=0;i<1000;i++){g.hero.hp=1570;g.hero.invulnerable=0;if(g.hurt(1,0,{boss:true}))hit++;}assert.equal(hit,500);assert.equal(rolls,1000);
  g.hero.invulnerable=1;g.hurt(1,0,{boss:true});assert.equal(rolls,1000);
});
test('Agility each valid hit independently dodges 75% regular and 50% Legendary on a stratified random sample',()=>{
  for(const [source,expected] of [[{},250],[{legendary:true},500]]){
    let i=0;const g=setup('agility',1,{random:()=>((i++%1000)+.5)/1000});cast(g,'agility');let hits=0;
    for(let j=0;j<1000;j++){g.hero.invulnerable=0;g.hero.hp=1570;if(g.hurt(1,0,source))hits++;}assert.equal(hits,expected);assert.equal(i,1000);
  }
});
test('Steel preserves double jumps and other powers; expired protection restores knockback',()=>{
  const g=setup('steel',1);g.powers.data.levels.fireball=1;g.powers.data.equipped[1]='fireball';cast(g,'steel');g.step(STEP,{jump:true});tick(g,.15);g.step(STEP,{jump:true});assert.equal(g.hero.jumps,2);assert.ok(g.hero.vy<0);cast(g,'fireball');tick(g,3);g.hero.invulnerable=0;assert.ok(g.hurt(1,g.hero.x-1));assert.equal(g.hero.vx,210);
});
test('roots completely immobilize regular enemies; bosses move at 50% and can attack',()=>{
  const g=setup('roots',20),normal=enemy(g,1100,{stagger:0}),boss=enemy(g,1120,{boss:true,stagger:0});cast(g,'roots');const x=normal.x,bx=boss.x;g.step();near(normal.x,x);near(Math.abs(boss.x-bx),54*.5*STEP);
  Object.assign(boss,{x:g.hero.x+30,state:'strike',age:.05,face:-1,hit:false});g.hero.invulnerable=0;g.step();assert.ok(g.hero.hp<1570);near(normal.x,x);
});
test('Whirlwind damages a boss without lifting or disabling its attack',()=>{
  const g=setup('whirlwind',1),boss=enemy(g,1040,{boss:true,stagger:0});cast(g,'whirlwind');assert.ok(!boss.lifted);tick(g,1);near(10000-boss.hp,g.powers.stats('whirlwind').damage);near(boss.y,600);assert.ok(g.hero.hp<1570);
});
test('Fireball sweep collides with solid walls before enemies, ignores one-way platforms and does not home',()=>{
  const g=setup('fireball',20),e=enemy(g,1110,{h:60});g.surfaces=[...g.surfaces,{x:1060,y:500,w:8,h:100}];cast(g,'fireball');tick(g,1);near(e.hp,10000);
  const c=setup('fireball',1),far=enemy(c,1100,{y:450,h:30});cast(c,'fireball');tick(c,.5);near(far.hp,10000);assert.ok(c.powers.projectiles.every(p=>p.y===555));
  near(segmentHit(0,0,100,0,{x:40,y:-2,w:2,h:4}),.4);
});
test('independent cooldowns pause, persist, survive respawn and cannot reset through unequipping',()=>{
  const g=setup('flight',1);cast(g,'flight');tick(g,1);const save=decodeSave(g.save()),restored=new Game({save});assert.equal(restored.powers.flying,false);near(restored.powers.cooldowns.flight,32);assert.deepEqual(restored.powers.data.levels,g.powers.data.levels);
  restored.paused=true;const before=restored.save();tick(restored,5);assert.equal(restored.save(),before);restored.respawn();near(restored.powers.cooldowns.flight,32);assert.ok(restored.equipPower(0,null));near(restored.powers.cooldowns.flight,32);
  restored.paused=false;tick(restored,32);assert.ok(restored.powers.ready('flight'));
});
test('legacy saves credit earned points without changing look, XP, coins or checkpoints',()=>{
  for(const version of [1,2]){
    const save=decodeSave(JSON.stringify({version,look:{name:'Old Coast',suit:'#ff9900'},level:10,xp:24,coins:77,checkpoint:1})),g=new Game({save});
    assert.equal(save.version,3);assert.equal(g.powers.data.points,9);assert.equal(g.hero.maxHp,235);assert.equal(g.hero.xp,24);assert.equal(g.hero.coins,77);assert.equal(g.checkpoint,1);assert.equal(g.look.suit,'#ff9900');
  }
});
test('level ups award points in combat, refill to 100+15/level, stop at 99',()=>{
  const g=new Game();g.hero.xp=49;g.hero.hp=1;g.markCombat();g.reward({type:'bottle',x:1,y:600});assert.equal(g.hero.level,2);assert.equal(g.hero.hp,115);assert.equal(g.powers.data.points,1);assert.ok(g.inCombat());
  g.hero.level=98;g.hero.hp=1;g.hero.xp=xpForLevel(98)-1;g.reward({type:'bottle',x:1,y:600});assert.equal(g.hero.level,99);assert.equal(g.hero.hp,1570);assert.equal(g.hero.xp,0);const p=g.powers.data.points;g.reward({type:'bottle',x:1,y:600});assert.equal(g.powers.data.points,p);
});
test('Tree upgrades: location, combat, balance, one/multiple levels, cap, no redistribution',()=>{
  const g=setup('speed',1);g.powers.data.levels.speed=0;g.powers.data.points=98;assert.equal(g.upgradePower('strength',3).ok,false);
  g.hero.x=BALANCE.tree.x;g.paused=true;g.markCombat();assert.equal(g.upgradePower('strength',1).ok,false);g.combatTimer=0;
  const before=g.save(),preview=g.upgradePreview('strength',3);assert.ok(preview.ok);assert.equal(g.save(),before);assert.ok(g.upgradePower('strength',3).ok);assert.equal(g.powers.data.points,95);assert.equal(g.powers.data.levels.strength,3);
  assert.equal(g.upgradePower('strength',-1).ok,false);assert.equal(g.upgradePower('strength',18).ok,false);assert.ok(g.upgradePower('strength',17).ok);assert.equal(g.upgradePower('strength',1).ok,false);assert.equal(g.powers.data.points,78);
  assert.ok(g.equipPower(0,'strength'));assert.equal(g.equipPower(1,'speed'),false);assert.equal(g.equipPower(3,'strength'),false);g.paused=false;assert.equal(g.equipPower(0,null),false);
});
test('save ledger rejects overspent, malformed and future data without redistributing points',()=>{
  const g=setup('strength',20);g.hero.level=2;assert.equal(decodeSave(g.save()),null);assert.equal(normalizePowers({levels:{strength:20}},1),null);
  const save=JSON.parse(setup('strength',20).save());save.powers.levels.strength=21;assert.equal(decodeSave(JSON.stringify(save)),null);save.version=99;assert.equal(decodeSave(JSON.stringify(save)),null);
});
test('controls settings sanitize, persist every mapping and clamp touch layout',()=>{
  const c=normalizeControls({keys:{power0:['KeyQ']},pad:{power0:8},touch:{size:999,left:-100,right:20,rise:12}});assert.deepEqual(c.keys.power0,['KeyQ']);assert.equal(c.pad.power0,8);assert.equal(c.touch.size,64);assert.equal(c.touch.left,0);assert.deepEqual(normalizeControls(JSON.parse(JSON.stringify(c))),c);
});

test('reserved fourth slot only resolves for a complete future suit, with half cooldown',()=>{
  const g=setup('strength',1);assert.equal(resolveAbilitySlots(g.powers.data).length,3);
  assert.equal(resolveAbilitySlots(g.powers.data,{ability:'fireball',level:10,completePieces:2}).length,3);
  g.powers.mergeEntitlement={ability:'fireball',level:10,completePieces:3};assert.equal(resolveAbilitySlots(g.powers.data,g.powers.mergeEntitlement).length,4);
  assert.ok(g.powers.activateSlot(3));near(g.powers.cooldowns.fireball,2.5);assert.equal(g.powers.data.levels.fireball,0);
});
test('rooted regular enemies cannot be lifted until roots release',()=>{
  const g=setup('roots',1);g.powers.data.levels.whirlwind=1;g.powers.data.equipped[1]='whirlwind';const e=enemy(g);cast(g,'roots');cast(g,'whirlwind');assert.ok(e.rooted);assert.ok(!e.lifted);
});

test('Flight ends other offensive fields and starts their recovery',()=>{
  const g=setup('roots',20);g.powers.data.levels.flight=20;g.powers.data.equipped[1]='flight';const e=enemy(g);cast(g,'roots');assert.ok(e.rooted);cast(g,'flight');assert.ok(!e.rooted);assert.equal(g.powers.active.roots,undefined);near(g.powers.cooldowns.roots,10);
});
test('lifted enemies sweep solid walls and ceilings; respawn restores original surface',()=>{
  const g=setup('whirlwind',20),e=enemy(g,1040);g.surfaces=[...g.surfaces,{x:1065,y:420,w:30,h:180},{x:1000,y:490,w:60,h:20}];
  g.moveEnemyAir(e,1100,600);near(e.x,1065-e.w/2);e.x=1040;g.moveEnemyAir(e,1040,520);assert.ok(e.y-e.h>=510);
  const original=e.surface;cast(g,'whirlwind');g.damageEnemy(e,20000);e.surface=g.surfaces[1];e.respawn=0;g.hero.x=200;g.step();assert.equal(e.surface,original);assert.equal(e.y,original.y);
});

test('unequipping an active defensive power ends it with full recovery; swapping keeps it active',()=>{
  const g=setup('flight',20);g.enemies=[];cast(g,'flight');tick(g,.5);g.paused=true;
  assert.ok(g.equipPower(1,'flight'));assert.ok(g.powers.flying);assert.ok(g.equipPower(1,null));assert.equal(g.powers.flying,false);near(g.powers.cooldowns.flight,30);
});

test('unknown and prototype-property ability IDs cannot become slots or purchases',()=>{
  const g=setup('strength',1);g.hero.x=BALANCE.tree.x;g.paused=true;
  for(const id of ['constructor','__proto__','toString','unknown']){
    assert.equal(g.upgradePower(id).ok,false);assert.equal(g.equipPower(0,id),false);assert.equal(g.powers.ready(id),false);assert.equal(g.powers.activate(id),false);
    assert.deepEqual(normalizePowers({equipped:[id]},99).equipped,[null,null,null]);
  }
});
