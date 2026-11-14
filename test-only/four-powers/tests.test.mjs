import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import {execFileSync} from 'node:child_process';
import {Game,decodeSave,ATTACKS,STEP} from '../../royale/core.mjs';
import {POWER_IDS,powerStats,normalizePowers} from './powers.mjs';
import {createTestSnapshot,setReviewLevel,resetTestSkillPoints,arrangeTargets,TEST_PREFIX} from './review.mjs';
import {LocalSession,captureProgress} from '../../royale/local-coop/session.mjs';
import {CloudProfile} from './profile.mjs';
import {samplePad,PAD} from '../../royale/local-coop/input.mjs';
import {encodeRuntime,decodeRuntime} from '../../royale/multiplayer/runtime.mjs';
import {damageToEnemy} from '../../royale/combat-tuning.mjs';
import {LocalHeroStore} from '../../royale/saves.mjs';
import {InstantPowerUpgrades} from '../../royale/power-upgrades.mjs';
const fixture=()=>{const g=new Game({save:createTestSnapshot()});g.started=true;arrangeTargets(g);g.enemies.forEach(e=>{e.w=20;e.h=50;});return g;};
const steps=(g,n)=>{for(let i=0;i<n;i++)g.step(STEP);};
const equip=(g,id,level)=>setReviewLevel(g,id,level,0);
for(const id of ['animalAllies','seismicSmash']){
 for(let level=1;level<=20;level++)test(`${id} level ${level}: six-second cooldown, increasing finite damage`,()=>{const a=powerStats(id,level,{heroLevel:30});assert.equal(a.cooldown,6);assert.ok(Number.isFinite(a.damage)&&a.damage>0);if(level>1)assert.ok(a.damage>powerStats(id,level-1,{heroLevel:30}).damage);});
}
test('Animal tiers and benchmark multipliers match approved sheet',()=>{assert.deepEqual([1,5,10,15,20].map(n=>powerStats('animalAllies',n).animal),['wolf','hawk','bear','panther','spirit-stag']);assert.deepEqual([1,5,10,15,20].map(n=>powerStats('animalAllies',n).multiplier),[1,1.2,1.6,2,2.5]);});
test('Seismic tiers use forty world units per meter',()=>{assert.deepEqual([1,5,10,15,20].map(n=>{const s=powerStats('seismicSmash',n);return [s.radius,s.targets,s.multiplier];}),[[60,1,1],[80,2,1.3],[112,3,1.7],[144,4,2.2],[180,5,2.8]]);});
test('New reach is bounded and basic melee is unchanged',()=>{assert.equal(ATTACKS.punch.reach,59);assert.equal(ATTACKS.kick.reach,76);assert.equal(powerStats('strength',20).reach,86);assert.equal(powerStats('superKick',20).reach,105);assert.equal(powerStats('superKick',1).kicks,2);assert.equal(powerStats('superKick',20).kicks,6);});
for(const face of [1,-1])for(const id of ['strength','superKick'])test(`${id} facing ${face} hits extended front range, excludes rear and out of range`,()=>{const g=fixture();g.hero.face=face;equip(g,id,20);const reach=powerStats(id,20).reach;g.enemies=g.enemies.slice(0,4);for(const [i,e]of g.enemies.entries()){e.x=g.hero.x+face*[reach+2,reach+14,-1,-reach][i];e.prevX=e.x;}const old=g.enemies.map(e=>e.hp);assert.ok(g.powers.activate(id));steps(g,17);assert.ok(g.enemies[0].hp<old[0]);assert.deepEqual(g.enemies.slice(1).map(e=>e.hp),old.slice(1));});
for(const level of [1,5,10,15,20])test(`Seismic level ${level} selects closest ${powerStats('seismicSmash',level).targets} targets once at contact`,()=>{const g=fixture();equip(g,'seismicSmash',level);const old=g.enemies.map(e=>e.hp);assert.ok(g.powers.activate('seismicSmash'));assert.deepEqual(g.enemies.map(e=>e.hp),old);steps(g,13);const s=powerStats('seismicSmash',level,{heroLevel:99}),damaged=g.enemies.filter((e,i)=>e.hp<old[i]);assert.equal(damaged.length,s.targets);const after=g.enemies.map(e=>e.hp);steps(g,70);assert.deepEqual(g.enemies.map(e=>e.hp),after);assert.equal(g.powers.effects.length,0);});
test('Seismic uses Euclidean center distance, no extra enemy-width allowance',()=>{const g=fixture();equip(g,'seismicSmash',20);g.enemies=g.enemies.slice(0,3);const [a,b,c]=g.enemies;a.x=g.hero.x+180;b.x=g.hero.x+180.01;c.x=g.hero.x+150;c.y=g.hero.y-150;const hp=a.hp;g.powers.activate('seismicSmash');steps(g,13);assert.ok(a.hp<hp);assert.equal(b.hp,hp);assert.equal(c.hp,hp);});
test('Ground-only rejects airborne smash without consuming cooldown',()=>{const g=fixture();equip(g,'seismicSmash',20);g.hero.grounded=false;assert.equal(g.powers.activate('seismicSmash'),false);assert.equal(g.powers.cooldowns.seismicSmash,0);});
for(const level of [1,5,10,15,20])test(`Animal level ${level}: one summon, timed contact, correct strikes and cleanup`,()=>{const g=fixture();equip(g,'animalAllies',level);const calls=[],damage=g.damageEnemy;g.damageEnemy=function(e,d,o){calls.push({id:e.id,d});return damage.call(this,e,d,o);};const nearest=g.enemies[0];assert.ok(g.powers.activate('animalAllies'));assert.equal(calls.length,0);assert.equal(g.powers.effects.filter(f=>f.id==='animalAllies').length,1);steps(g,18);assert.equal(calls.length,0);steps(g,22);assert.equal(calls.length,level>=15&&level<20?2:1);assert.ok(calls.every(c=>c.id===nearest.id));const s=powerStats('animalAllies',level,{heroLevel:99});assert.ok(Math.abs(calls.reduce((n,c)=>n+c.d,0)-s.damage)<.0001);steps(g,50);assert.equal(g.powers.effects.length,0);});
test('Animal chooses nearest target behind hero and works in flight',()=>{const g=fixture();equip(g,'animalAllies',20);g.enemies[1].x=g.hero.x-15;const e=g.enemies[1],hp=e.hp;g.hero.grounded=false;g.hero.y-=40;g.powers.active.flight={age:1,duration:20,cooldown:30};assert.ok(g.powers.activate('animalAllies'));steps(g,25);assert.ok(e.hp<hp);assert.ok(e.x<g.hero.x-15);});
test('Summon cannot hit protected, dead or escaped targets and never persists',()=>{const g=fixture();equip(g,'animalAllies',20);g.enemies[0].protection=10;g.enemies[1].state='dead';g.powers.activate('animalAllies');const fx=g.powers.effects[0],target=g.enemies.find(e=>e.id===fx.target),hp=target.hp;target.x+=1000;steps(g,60);assert.equal(target.hp,hp);assert.equal(g.powers.effects.length,0);});
test('Panther strikes are separated by simulation time',()=>{const g=fixture();equip(g,'animalAllies',15);const at=[],damage=g.damageEnemy;g.damageEnemy=function(...a){at.push(this.time);return damage.apply(this,a);};g.powers.activate('animalAllies');steps(g,40);assert.equal(at.length,2);assert.ok(at[1]-at[0]>=.10-1e-8);});
test('Six-kick sequence has six independent contact windows',()=>{const g=fixture();equip(g,'superKick',20);g.enemies=g.enemies.slice(0,1);const calls=[],damage=g.damageEnemy;g.damageEnemy=function(...args){calls.push(g.time);return damage.apply(this,args);};assert.ok(g.powers.activate('superKick'));steps(g,160);assert.equal(calls.length,6);assert.ok(calls.every((t,i)=>i===0||t-calls[i-1]>.25));assert.ok(g.powers.cooldowns.superKick>0);});
for(const id of ['animalAllies','seismicSmash'])test(`${id} cannot recast until exactly six seconds and reload preserves remaining cooldown`,()=>{const g=fixture();equip(g,id,20);g.powers.activate(id);assert.equal(g.powers.cooldowns[id],6);steps(g,359);assert.equal(g.powers.activate(id),false);const raw=captureProgress(g),restored=new Game({save:decodeSave(JSON.stringify(raw))});assert.ok(restored.powers.cooldowns[id]>0);g.step(STEP);assert.ok(g.powers.activate(id));});
test('Older saves missing new fields preserve levels, look, wallet and wardrobe',()=>{const original=createTestSnapshot();original.powers.levels.strength=20;delete original.powers.levels.animalAllies;delete original.powers.levels.seismicSmash;original.powers.equipped=['strength','superKick','fireball'];const before=structuredClone(original),loaded=decodeSave(JSON.stringify(original));assert.ok(loaded);assert.equal(loaded.powers.levels.animalAllies,0);assert.equal(loaded.powers.levels.strength,20);assert.deepEqual(loaded.look,before.look);assert.deepEqual(loaded.cosmetics,before.cosmetics);assert.equal(loaded.coins,before.coins);assert.deepEqual(original,before);});
test('Legal new power checkpoints round trip and invalid ledgers are rejected',()=>{const g=fixture();equip(g,'animalAllies',15);const state=captureProgress(g),loaded=decodeSave(JSON.stringify(state));assert.deepEqual(loaded.powers.levels,state.powers.levels);assert.deepEqual(loaded.powers.equipped,state.powers.equipped);for(const n of [21,-1,1.5]){const bad=structuredClone(state);bad.powers.levels.animalAllies=n;assert.equal(decodeSave(JSON.stringify(bad)),null);}const bad=structuredClone(state);bad.level=1;assert.equal(decodeSave(JSON.stringify(bad)),null);});
test('Runtime serialization retains summon timing without replaying damage',()=>{const g=fixture();equip(g,'animalAllies',15);g.powers.activate('animalAllies');steps(g,21);const resumed=decodeRuntime(encodeRuntime(g));const e=resumed.enemies[0],hp=e.hp;steps(resumed,20);assert.ok(e.hp<hp);assert.equal(resumed.powers.effects.filter(f=>f.id==='animalAllies').length,0);});
test('Reserved test profiles never fetch or touch live storage keys',async()=>{const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>{assert.ok(k.startsWith(TEST_PREFIX));map.set(k,v);}};const a=new CloudProfile({storage});await assert.rejects(a.login('1234567890'));await a.login('0000000000');const snap=structuredClone(a.slots[0].snapshot);snap.powers.levels.animalAllies=1;await a.save(1,snap);const b=new CloudProfile({storage});b.identity=a.identity;await b.load();assert.equal(b.slots[0].snapshot.powers.levels.animalAllies,1);assert.equal(a.fetcher,undefined);});
test('Local co-op: both heroes use new powers against shared enemies with independent cooldowns and saves',async()=>{const selections=[0,1].map(i=>({slot:1,profile:{identity:'test-'+i,slots:[{slot_number:1,snapshot:createTestSnapshot(i)}],save:async(_slot,snapshot)=>{assert.ok(decodeSave(JSON.stringify(snapshot)));}}}));const session=new LocalSession(selections);session.setPaused(false);const [a,b]=session.games;const targets=arrangeTargets(a),w=session.authority.bind(session.heroes[0]);w.enemies=targets;a.enemies=targets;b.enemies=targets;Object.assign(b.hero,{x:a.hero.x,y:a.hero.y,grounded:true});equip(a,'animalAllies',15);equip(b,'seismicSmash',20);for(let i=0;i<55;i++)session.step([{powers:[i===0,false,false]},{powers:[i===0,false,false]}]);assert.ok(a.powers.cooldowns.animalAllies>0);assert.ok(b.powers.cooldowns.seismicSmash>0);assert.equal(a.powers.cooldowns.seismicSmash,0);assert.equal(b.powers.cooldowns.animalAllies,0);assert.equal(a.powers.effects.length,0);assert.equal(a.enemies.filter(e=>e.hp<e.maxHp).length,5);assert.ok((await session.saveAll()).every(r=>r.ok));});
test('Controller shoulder and trigger mapping activates the standard three slots',()=>{for(const name of ['power0','power1','power2']){const pad={connected:true,axes:[0,0],buttons:Array.from({length:17},(_,i)=>({pressed:i===PAD[name]}))};assert.ok(samplePad(pad).edges.has(name));}});
test('Tree upgrades spend exactly one point per level for all four powers and retain the 98-point cap',()=>{
 const g=fixture();g.powers.data=normalizePowers({levels:Object.fromEntries(POWER_IDS.map(id=>[id,0])),equipped:[null,null,null]},99);
 g.treeVisit=true;g.combatTimer=0;g.paused=true;
 for(const id of ['strength','superKick','animalAllies','seismicSmash']){
  for(let level=1;level<=20;level++){const before=g.powers.data.points;assert.ok(g.upgradePower(id).ok);assert.equal(g.powers.data.levels[id],level);assert.equal(g.powers.data.points,before-1);}
  assert.equal(g.upgradePower(id).ok,false);assert.ok(g.equipPower(0,id));
 }
 assert.equal(g.powers.data.points,18);assert.equal(g.powers.data.equipped.length,3);assert.equal(g.equipPower(3,'strength'),false);
 assert.ok(decodeSave(g.save()));
});
test('A saved review-level reduction supports the normal durable upgrade transaction and reload',async()=>{
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 const store=new LocalHeroStore(storage),snapshot=createTestSnapshot();assert.ok(store.writeSlot(0,snapshot).ok);
 const game=new Game({save:snapshot});game.started=true;game.paused=true;game.treeVisit=true;game.combatTimer=0;
 setReviewLevel(game,'animalAllies',1);const heroId=store.slot(0).id;
 assert.ok(store.writeSlot(0,game.save(),{expectedId:heroId,requireDurable:true}).ok);
 const transaction=new InstantPowerUpgrades(()=>({game,store,index:0,heroId}));
 const upgraded=await transaction.spend('animalAllies');assert.ok(upgraded.ok,upgraded.error);assert.equal(game.powers.data.levels.animalAllies,2);
 const loaded=new LocalHeroStore(storage);assert.equal(loaded.slot(0).snapshot.powers.levels.animalAllies,2);
});
test('Fresh test hero has 88 points, can max all four normally, and can refund for another level-by-level pass',()=>{
 const game=fixture(),before=JSON.parse(game.save());
 assert.equal(game.hero.level,99);assert.equal(game.powers.data.points,88);
 assert.ok(POWER_IDS.every(id=>game.powers.data.levels[id]===1));
 game.treeVisit=true;game.paused=true;game.combatTimer=0;
 for(const id of ['strength','superKick','animalAllies','seismicSmash'])for(let level=2;level<=20;level++){
  assert.ok(game.upgradePower(id).ok);assert.equal(game.powers.data.levels[id],level);
 }
 assert.equal(game.powers.data.points,12);
 resetTestSkillPoints(game);assert.equal(game.powers.data.points,88);
 const saved=decodeSave(game.save());assert.ok(saved);
 assert.deepEqual(saved.look,before.look);assert.deepEqual(saved.cosmetics,before.cosmetics);assert.equal(saved.coins,before.coins);
 assert.deepEqual(saved.powers.equipped,before.powers.equipped);
});
for(const id of ['strength','superKick','animalAllies','seismicSmash'])for(const level of [1,20])test(`${id} level ${level} deals the expected damage to a boss without moving it`,()=>{
 const g=fixture();equip(g,id,level);g.enemies=g.enemies.slice(0,1);const boss=g.enemies[0];
 Object.assign(boss,{boss:true,level:99,hp:1000000,maxHp:1000000});const before=boss.hp,x=boss.x;
 const stats=powerStats(id,level,{heroLevel:99,equipment:g.equipment});
 const amount=stats.damage*(id==='strength'?stats.bossEffectiveness:1)*(id==='superKick'?stats.kicks:1);
 assert.ok(g.powers.activate(id));steps(g,160);
 assert.ok(Math.abs((before-boss.hp)-damageToEnemy(amount,99,boss))<1e-6);assert.equal(boss.x,x);
});
test('Production gameplay and appearance sources remain byte-identical to verified live commit',()=>{for(const file of ['royale/app.mjs','royale/core.mjs','royale/powers.mjs','royale/combat-tuning.mjs','royale/power-art.mjs','royale/power-menu.mjs','royale-v3-staging/gameplay/powers.mjs','royale-v3-staging/kingjames/head.mjs','royale/style-c-face.mjs','royale/style-c-hair.mjs'])assert.deepEqual(fs.readFileSync(file),execFileSync('git',['show','d8e0a9a:'+file]),file);});
