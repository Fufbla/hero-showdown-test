import test from 'node:test';import assert from 'node:assert/strict';
import {Game,decodeSave,STEP} from '../core.mjs';
import {powerStats,POWERS} from '../powers.mjs';
import {COSTUME_SETS,resaleValue} from '../costume-catalog.mjs';
import {expectedDamage,near} from './expected-balance.mjs';
import {assertBalanceScope} from './balance-preservation.mjs';
const ids=['strength','superKick','fireball','roots','whirlwind'];
function shop(){const g=new Game();g.hero.level=30;g.hero.hp=g.hero.maxHp=535;g.powers.data.points=29;g.hero.coins=5000;assert.ok(g.visitTree());const p=g.buyCostume({setId:'beacon-ordinary'},{confirmed:true,revision:g.economy.revision});assert.ok(p.ok);return {g,p};}
test('worn sale is rejected without coins, inventory or equipment mutation; unequip enables exactly one sale',()=>{const {g,p}=shop(),uid=p.items[0].uid;g.equipItem(uid);const before=g.save();assert.equal(g.salePreview(uid).ok,false);assert.equal(g.sellItem(uid,{confirmed:true,revision:g.economy.revision}).ok,false);assert.equal(g.save(),before);g.equipItem(uid);const q=g.salePreview(uid),coins=g.hero.coins;assert.equal(q.value,resaleValue(p.definitions[0]));assert.equal(g.sellItem(uid,{revision:q.revision}).ok,false);assert.ok(g.sellItem(uid,{confirmed:true,revision:q.revision}).ok);assert.equal(g.hero.coins,coins+q.value);assert.equal(g.sellItem(uid,{confirmed:true,revision:q.revision}).ok,false);assert.equal(g.hero.coins,coins+q.value);assert.equal(g.inventory.retired[uid],'sold');});
test('equipping between review and confirmation blocks a stale sale',()=>{const {g,p}=shop(),uid=p.items[0].uid,q=g.salePreview(uid);g.equipItem(uid);const before=g.save();assert.equal(g.sellItem(uid,{confirmed:true,revision:q.revision}).ok,false);assert.equal(g.save(),before);});
test('new sale tombstones and unchanged character data survive reload',()=>{const {g,p}=shop();g.equipItem(p.items[0].uid);const uid=p.items[1].uid,q=g.salePreview(uid);g.sellItem(uid,{confirmed:true,revision:q.revision});const restored=new Game({save:decodeSave(g.save())});assert.deepEqual(restored.inventory,g.inventory);assert.equal(restored.hero.coins,g.hero.coins);assert.deepEqual(restored.powers.data,g.powers.data);assert.deepEqual(restored.look,g.look);assert.equal(restored.hero.x,g.hero.x);assert.equal(restored.hero.y,g.hero.y);});
for(const h of [1,10,20,30,50,99])test(`hero ${h}: legal upgrades grow, basic kick exceeds punch, item additions and cooldowns are exact`,()=>{
 const g=new Game();g.hero.level=h;assert.ok(g.attackDefinition('kick').damage>g.attackDefinition('punch').damage);near(g.attackDefinition('punch').damage,5+.18*(h-1));near(g.attackDefinition('kick').damage,8+.25*(h-1));
 for(const id of ids){let previous=0;for(let p=1;p<=Math.min(20,h-1);p++){const s=powerStats(id,p,{heroLevel:h});near(s.damage,expectedDamage(id,p,h));assert.ok(s.damage>previous);previous=s.damage;assert.equal(s.cooldown,POWERS[id].cooldown);const eq={strength:16,damage:8,fireball:9,roots:3,whirlwind:4};near(powerStats(id,p,{heroLevel:h,equipment:eq}).damage-s.damage,id==='strength'?40:id==='superKick'?16:eq[id]);}
 if(h>1){const s=powerStats(id,1,{heroLevel:h});assert.ok(s.damage*(s.kicks||s.projectiles||s.duration||1)>g.attackDefinition('kick').damage,`${id} level 1 activation beats basic kick`);}
 if(h>=21){const s=powerStats(id,20,{heroLevel:h});assert.ok(s.damage*(s.kicks||s.projectiles||s.duration||1)>g.attackDefinition('kick').damage*20,`${id} mastery rewards twenty points`);}
 }
});
test('level-99 maximum offensive damage endpoints and full-set additions are pinned',()=>{for(const [id,expected] of Object.entries({strength:3654,superKick:706.5,fireball:945,roots:1233.4,whirlwind:1509.6}))near(powerStats(id,20,{heroLevel:99}).damage,expected);const gear=COSTUME_SETS.horizon.stats;near(powerStats('fireball',20,{heroLevel:99,equipment:gear}).damage,978);});
test('attack input timing and all non-damage mechanics, artwork, saves, XP, item stats and boss rules preserved',assertBalanceScope);
