import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,decodeSave,STEP} from '../core.mjs';
import {monsterArmor,levelDamageFactor,damageToEnemy,damageToHero} from '../combat-tuning.mjs';
import {powerStats} from '../powers.mjs';
import {TYPES} from '../world.mjs';
import {benchmark,combatFixture,activeEncounter} from './combat-benchmark.mjs';
import {makeBoss} from '../bosses.mjs';
import {makeLegendary} from '../legendary-bosses.mjs';
import {WORLD_CLOCK_REFERENCE} from '../world-state.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);

test('smooth level disadvantage, no immunity, and early health/defense retained',()=>{
 for(let level=1;level<=20;level++)assert.equal(monsterArmor(level),1);
 for(let level=1;level<=99;level++){
  assert.equal(levelDamageFactor(level,level),1);
  assert.ok(levelDamageFactor(level,99)>0);
  assert.ok(monsterArmor(level)>=monsterArmor(level-1));
 }
 near(monsterArmor(90),3);near(damageToEnemy(300,90,{level:90}),100);
 assert.ok(damageToEnemy(300,14,{level:90})<7);
 assert.equal(damageToEnemy(10,99,{level:1}),10);
 assert.equal(damageToHero(5,1,{level:1}),5);
});
test('all damage paths share defenses, including bosses and Legendary barriers',()=>{
 for(const level of [1,14,30,60,80,90,99])for(const kind of ['punch','kick','fireball','roots','whirlwind','merge:atomdust']){
  const g=combatFixture(level),e=g.makeEnemy('guardian',700,'sand-a',0);e.protection=0;
  g.damageEnemy(e,300,{kind,stagger:false});near(e.maxHp-e.hp,damageToEnemy(300,level,e));
  for(const boss of [makeBoss(7,e.surface),makeLegendary('styro',e.surface)]){
   if(boss.legendary){boss.state='active';boss.attack={shape:'barrier'};}
   g.damageEnemy(boss,300,{kind});near(boss.maxHp-boss.hp,damageToEnemy(300,level,boss)*(boss.legendary?.5:1));
  }
 }
});
test('late regular fight times with legal max powers: 90 challenging, 99 manageable',()=>{
 for(const gear of ['ordinary','rare']){
  const a=benchmark(90,{gear}),b=benchmark(99,{gear});
  assert.ok(a.seconds>=10&&a.seconds<=20,JSON.stringify(a));
  assert.ok(b.seconds>=8&&b.seconds<=a.seconds,JSON.stringify(b));
 }
 assert.ok(benchmark(90,{gear:'none'}).seconds>benchmark(90).seconds);
 assert.ok(benchmark(80).seconds>benchmark(90).seconds);
 assert.ok(benchmark(60).seconds>90);
 for(const level of [1,14,30]){const r=benchmark(level);assert.equal(r.seconds,null);assert.ok(r.remaining>4000);}
});
test('early encounters retain their existing ideal-contact timing',()=>{
 near(benchmark(1,{type:'bottle'}).seconds,.92);
 near(benchmark(14,{type:'sprout'}).seconds,.07);
});
test('equipment remains additive and all earned power upgrades stay intact',()=>{
 for(const heroLevel of [1,14,30,60,80,90,99]){
  const a=combatFixture(heroLevel,{gear:'none'}),b=combatFixture(heroLevel,{gear:'ordinary'});
  for(const kind of ['punch','kick'])near(b.attackDefinition(kind).damage-a.attackDefinition(kind).damage,b.equipment.damage+b.equipment.strength*.5);
  for(const [id,extra]of [['strength',2*b.equipment.strength+b.equipment.damage],['superKick',.5*b.equipment.strength+b.equipment.damage],['fireball',b.equipment.fireball]]){
   near(powerStats(id,20,{heroLevel,equipment:b.equipment}).damage-powerStats(id,20,{heroLevel}).damage,extra);
  }
  assert.ok(Object.values(a.powers.data.levels).reduce((x,y)=>x+y,0)<=heroLevel-1);
 }
});
test('melee hits once per target; a max Fireball burst is three shots, not repeated frame damage',()=>{
 for(const attack of ['punch','kick','strength','superKick','fireball']){
  const g=combatFixture(90);g.loadRegion(7,{x:700,y:600});g.hero.invulnerable=100;
  const e=g.makeEnemy('guardian',740,'sand-a',0);e.protection=0;e.hp=e.maxHp=1e6;g.enemies=[e];g.stepEnemy=()=>{};
  let hits=0;
  for(let i=0;i<180;i++){
   e.x=g.hero.x+40;e.y=g.hero.y;
   g.step(STEP,i===0?{punch:attack==='punch',kick:attack==='kick',powers:['strength','superKick','fireball'].map(id=>id===attack)}:{});
   hits+=g.drain().filter(e=>e.type==='hit').length;
  }
  assert.equal(hits,attack==='fireball'?3:attack==='superKick'?6:1,attack);
 }
});
test('Fireball piercing and crowd attacks retain their distinct target limits',()=>{
 const g=combatFixture(90);g.loadRegion(7,{x:700,y:600});g.hero.invulnerable=100;
 const enemies=[740,800,860].map((x,id)=>{const e=g.makeEnemy('guardian',x,'sand-a',id);e.protection=0;return e;});g.enemies=enemies;g.stepEnemy=()=>{};
 g.step(STEP,{powers:[false,false,true]});for(let i=0;i<60;i++)g.step(STEP,{});
 const losses=enemies.map(e=>e.maxHp-e.hp);near(losses[1],losses[0]*.5);assert.equal(losses[2],0);
});
test('a high-level monster can attack and quickly defeat an underlevel hero',()=>{
 const g=combatFixture(14);g.loadRegion(7,{x:700,y:600});g.hero.invulnerable=0;
 const e=g.makeEnemy('guardian',740,'sand-a',0);e.protection=0;g.enemies=[e];let strikes=0;
 for(let i=0;i<180&&!g.hero.dead;i++){
  g.step(STEP,{kickHeld:true,powers:[true,true,true]});strikes+=g.drain().filter(e=>e.type==='hurt').length;
 }
 assert.ok(g.hero.dead);assert.ok(strikes>0);assert.ok(e.hp/e.maxHp>.99);
});
test('separate attackers still hurt; the same attack event cannot be applied twice',()=>{
 const g=combatFixture(90);g.hero.x=700;g.hero.invulnerable=0;
 const attackers=[0,1,2].map(id=>({type:'guardian',level:90,id,damageEvent:{}}));
 const before=g.hero.hp;
 for(const e of attackers){assert.ok(g.hurt(185,740,e));assert.equal(g.hurt(185,740,e),false);}
 near(before-g.hero.hp,3*185*(1-g.equipment.defense));
});
test('bosses and Legendary bosses stay longer than regular encounters',()=>{
 for(const level of [90,99]){
  const regular=benchmark(level),boss=benchmark(level,{type:'boss'}),legendary=benchmark(level,{type:'legendary'});
  assert.ok(boss.seconds>regular.seconds*2);assert.ok(legendary.seconds>boss.seconds*2);
 }
});
test('Level 90 active combat permits repeated enemy attacks and rewards healing',()=>{
 const withoutHealing=activeEncounter(90),withHealing=activeEncounter(90,{roots:2});
 assert.equal(withoutHealing.heroHP,0);assert.ok(withoutHealing.enemyHP>0);
 assert.equal(withHealing.enemyHP,0);assert.ok(withHealing.seconds>=10&&withHealing.seconds<=20);
 assert.ok(withHealing.hits.length>=5);assert.equal(withHealing.rootsUsed,2);
 const crowd=activeEncounter(90,{roots:2,count:3});assert.equal(crowd.heroHP,0);assert.ok(crowd.hits.length>withHealing.hits.length);
});
test('representative levels exercise each basic attack and offensive power separately',()=>{
 for(const level of [1,14,30,60,80,90,99])for(const attack of ['punch','kick','strength','superKick','fireball']){
  const result=benchmark(level,{attack,limit:20});
  assert.ok(Number.isFinite(result.remaining));
  if(level>1||['punch','kick'].includes(attack))assert.ok(result.remaining<result.hp);
  if(level<60)assert.equal(result.seconds,null);
 }
});
test('boss phase thresholds still transition at half and one-fifth health',()=>{
 const g=combatFixture(99),surface=g.surfaces[0];
 for(const b of [makeBoss(7,surface),makeLegendary('lightning',surface)]){
  g.enemies=[b];g.damageEnemy(b,b.maxHp*.5,{stagger:false});assert.equal(b.phase,2);
  g.damageEnemy(b,b.maxHp*.301,{stagger:false});assert.equal(b.phase,3);assert.notEqual(b.state,'dead');
 }
});
test('existing wounded monster HP and all hero progress survive saves unchanged',()=>{
 const g=combatFixture(90);g.now=()=>WORLD_CLOCK_REFERENCE;g.loadRegion(7,{x:720,y:600});g.hero.hp=1234;g.hero.xp=123;g.healthRoots=10;
 g.enemies[0].hp=123;g.enemies[1].hp=0;g.enemies[1].state='dead';g.enemies[1].respawn=17;
 const before=JSON.parse(g.save()),loaded=new Game({save:decodeSave(JSON.stringify(before)),now:g.now});
 const after=JSON.parse(loaded.save());
 for(const key of ['level','xp','inventory','powers','healthRoots','look','legendary','bossProgress','economy'])assert.deepEqual(after[key],before[key],key);
 assert.deepEqual(after.world.location,before.world.location);assert.deepEqual(after.world.monsters,before.world.monsters);
 assert.equal(loaded.enemies[0].maxHp,TYPES[loaded.enemies[0].type].hp);
});
test('Tree of Eris and all seven regions preserve progress and open access',()=>{
 const g=combatFixture(14);g.healthRoots=10;
 for(let region=1;region<=7;region++)assert.ok(g.travel(region));
 Object.assign(g.hero,{x:721,y:600,face:-1,hp:217});const before=JSON.parse(g.save());
 assert.ok(g.visitTree());assert.ok(g.leaveTree());const after=JSON.parse(g.save());
 for(const key of ['level','xp','inventory','powers','healthRoots','look'])assert.deepEqual(after[key],before[key]);
 assert.deepEqual(after.world.location,before.world.location);
});
