import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,decodeSave,STEP} from '../core.mjs';
import {POWER_IDS,normalizePowers,powerStats} from '../powers.mjs';
import {damageToEnemy} from '../combat-tuning.mjs';
import {TYPES} from '../world.mjs';
import {LocalSession,captureProgress} from '../local-coop/session.mjs';

// Exercise the production import graph via tools/release-build/register.mjs.
const IDS=['animalAllies','seismicSmash'];
const now=()=>Date.UTC(2026,10,14,12);
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-6,`${actual} != ${expected}`);
function game(id,rank=20,heroLevel=99){
  const g=new Game({now,random:()=>.99});
  Object.assign(g.hero,{level:heroLevel,x:1000,prevX:1000,y:600,prevY:600,grounded:true,invulnerable:60});
  g.powers.data=normalizePowers({levels:Object.fromEntries(POWER_IDS.map(key=>[key,key===id?rank:0])),equipped:[id,null,null]},heroLevel);
  assert.ok(g.powers.data,'fixture uses an earned, valid skill ledger');
  g.started=true;return g;
}
function enemies(g,type='titan',offsets=[50],durable=false){
  const surface=g.surfaces.find(s=>s.y===600&&s.x<=1000&&s.x+s.w>1300);
  assert.ok(surface);
  return g.enemies=offsets.map((dx,i)=>{
    const e=g.makeEnemy(type,g.hero.x+dx,surface.id,9000+i);
    Object.assign(e,{x:g.hero.x+dx,prevX:g.hero.x+dx,y:g.hero.y,prevY:g.hero.y,protection:0});
    if(durable)Object.assign(e,{hp:100000,maxHp:100000});
    return e;
  });
}
function cast(g,id){
  assert.ok(g.powers.activate(id));
  for(let i=0;i<45;i++)g.powers.step(STEP);
}
for(const id of IDS){
  test(`${id}: every skill point increases damage and retains the six-second cooldown`,()=>{
    for(const heroLevel of [21,30,50,99]){
      for(let rank=1;rank<=20;rank++){
        const stats=powerStats(id,rank,{heroLevel});
        if(rank>1)assert.ok(stats.damage>powerStats(id,rank-1,{heroLevel}).damage);
        assert.equal(stats.cooldown,6);
        assert.equal('multiplier' in stats,false,'the old evolution multipliers no longer describe damage');
      }
    }
  });
  test(`${id}: one use equals a full Whirlwind at all 20 skill ranks and every eligible hero level`,()=>{
    for(let rank=1;rank<=20;rank++)for(let heroLevel=rank+1;heroLevel<=99;heroLevel++){
      const reference=powerStats('whirlwind',rank,{heroLevel});
      close(powerStats(id,rank,{heroLevel}).damage,reference.damage*reference.duration);
    }
  });
  test(`${id}: actual HP loss equals every Whirlwind tick at every rank, including both Panther contacts`,()=>{
    for(let rank=1;rank<=20;rank++)for(const heroLevel of [rank+1,99]){
      const burst=game(id,rank,heroLevel),wind=game('whirlwind',rank,heroLevel);
      const [burstTarget]=enemies(burst,'titan',[50],true),[windTarget]=enemies(wind,'titan',[50],true);
      cast(burst,id);assert.ok(wind.powers.activate('whirlwind'));
      const frames=Math.ceil((powerStats('whirlwind',rank,{heroLevel}).duration+.25)/STEP);
      for(let i=0;i<frames;i++)wind.powers.step(STEP);
      close(burstTarget.hp,windTarget.hp);
      assert.ok(burstTarget.hp<burstTarget.maxHp);
      assert.equal(burst.powers.effects.length,0);
    }
  });
  test(`${id}: max rank defeats actual early-region monsters in one contact`,()=>{
    for(const type of ['bottle','slime','crawler','sprout','mushroom','bark','scrap']){
      const g=game(id,20,21),[e]=enemies(g,type);
      assert.equal(e.hp,TYPES[type].hp);
      cast(g,id);assert.equal(e.hp,0,type);assert.equal(e.state,'dead',type);
    }
  });
  test(`${id}: actual hits respect late monster armor and boss level scaling`,()=>{
    for(const heroLevel of [21,50,99])for(const boss of [false,true]){
      const g=game(id,20,heroLevel),[e]=enemies(g,'titan',[50],true);e.boss=boss;
      const before=e.hp,expected=damageToEnemy(powerStats(id,20,{heroLevel}).damage,heroLevel,e);
      cast(g,id);close(before-e.hp,expected);
      const after=e.hp;for(let i=0;i<100;i++)g.powers.step(STEP);
      assert.equal(e.hp,after,'a completed effect cannot replay its damage');
      assert.equal(g.powers.effects.length,0);
    }
  });
  test(`${id}: each evolution delivers full damage to its distinct target limit`,()=>{
    for(const rank of [1,5,10,15,20])for(const face of [-1,1]){
      const g=game(id,rank);g.hero.face=face;
      const targets=enemies(g,'titan',[15,-25,35,-45,55,-60].map(x=>x*face),true);
      const before=targets.map(e=>e.hp),s=powerStats(id,rank,{heroLevel:99});
      const cap=id==='animalAllies'?(rank>=15?5:rank>=10?3:rank>=5?2:1):[1,5,10,15,20].indexOf(rank)+1;
      assert.equal(s.targets,cap);cast(g,id);
      for(const [i,e] of targets.entries())close(before[i]-e.hp,i<cap?damageToEnemy(s.damage,99,e):0);
      assert.equal(g.powers.effects.length,0);
    }
  });
  test(`${id}: equipment damage applies once and existing max-rank saves gain the fix without a reset`,()=>{
    const g=game(id),before=captureProgress(g),restored=new Game({save:decodeSave(JSON.stringify(before)),now});
    assert.deepEqual(captureProgress(restored),before);
    close(restored.powers.stats(id).damage,9057.6);
    const base=powerStats(id,20,{heroLevel:99}).damage;
    close(powerStats(id,20,{heroLevel:99,equipment:{damage:100}}).damage,base+100);
    close(powerStats(id,20,{heroLevel:99,equipment:{damage:100,whirlwind:20,whirlwindLevels:9}}).damage,base+100);
  });
}

for(const player of [0,1])for(const id of IDS)test(`local co-op player ${player+1}: ${id} matches solo damage, target caps and cooldown`,async()=>{
  const saved=[[],[]];
  const profiles=[0,1].map(i=>({identity:`balance-${i}`,slots:[{slot_number:1,snapshot:captureProgress(game(id))}],async save(_slot,snapshot){saved[i].push(snapshot);}}));
  const session=new LocalSession(profiles.map(profile=>({profile,slot:1})),{now});
  const g=session.games[player],other=session.games[1-player];
  for(const member of session.games){member.now=now;Object.assign(member.hero,{x:1000,prevX:1000,y:600,prevY:600,grounded:true,invulnerable:60});}
  const targets=enemies(g,'titan',[20,-30,40,-50,60,230],true);
  // Hold synthetic targets still and exclude them from persisted world monsters.
  // Normal-monster armor is covered above; these use the shared summon/boss path.
  targets.forEach(e=>{e.rooted=true;e.summoned=true;});
  session.authority.bind(session.heroes[player]).enemies=targets;
  session.games.forEach(member=>{member.enemies=targets;});
  session.setPaused(false);
  const before=targets.map(e=>e.hp),stats=g.powers.stats(id);
  for(let frame=0;frame<45;frame++)session.step([0,1].map(i=>({powers:[i===player&&frame===0,false,false]})));
  for(const [i,e]of targets.entries())close(before[i]-e.hp,i<5?damageToEnemy(stats.damage,99,e):0);
  assert.ok(g.powers.cooldowns[id]>5);assert.equal(other.powers.cooldowns[id]||0,0);
  assert.ok((await session.saveAll()).every(result=>result.ok));
  for(const snapshots of saved)assert.ok(decodeSave(JSON.stringify(snapshots[0])));
});
