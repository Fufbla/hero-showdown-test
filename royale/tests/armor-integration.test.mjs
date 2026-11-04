import {POLISH_FILES} from './polish-preservation.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {ARMOR_COLLECTIONS,reviewInventory,reviewProfile,reviewSessionId} from '../armor-review-data.mjs';
import {Game,decodeSave} from '../core.mjs';
import {validateSnapshot} from '../cloud-validation.mjs';
import {COSTUME_PARTS,resaleValue} from '../costume-catalog.mjs';
import {WARDROBE_CATALOG} from '../flight-armor.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';
const prices=[500,1250,2500,4500,7500,12000,18000,27000,40000];
const buy=(g,s)=>g.buyCostume(s,{confirmed:true,revision:g.economy.revision});
function shop(){const g=new Game();g.hero.level=99;g.hero.hp=g.hero.maxHp=1570;g.hero.coins=99999;g.visitTree();return g;}
test('integrated catalog has 81 distinct sets and 243 persistent identities',()=>{
 assert.equal(Object.keys(ARMOR_COLLECTIONS).length,9);const all=[];
 for(const [power,c] of Object.entries(ARMOR_COLLECTIONS)){
 assert.equal(c.suits.length,9);assert.equal(Object.keys(c.catalog).length,27);
 c.suits.forEach((s,i)=>{assert.equal(s.level,(i+1)*10);assert.equal(s.price,prices[i]);assert.equal(s[power+'Levels'],i+1);
 for(const part of COSTUME_PARTS){const d=c.catalog[s.setId+'-'+part];assert.deepEqual(d,WARDROBE_CATALOG[d.id]);assert.equal(d.part,part);assert.equal(d.level,s.level);all.push(d.id);}});
 }
 assert.equal(new Set(all).size,243);
});
for(const [power,c] of Object.entries(ARMOR_COLLECTIONS))test(power+': every tier, individual and whole purchases, mixed sets, cooldowns and save parity',()=>{
 for(const [i,s] of c.suits.entries()){
 const g=shop();g.powers.data.levels[power]=20;g.powers.data.points=78;
 const low=shop();low.hero.level=s.level-1;assert.equal(buy(low,{setId:s.setId}).ok,false);
 const before=g.hero.coins,result=buy(g,{setId:s.setId});assert.ok(result.ok);assert.equal(before-g.hero.coins,s.price);
 for(const it of result.items)assert.ok(g.equipItem(it.uid));
 const permanent=JSON.stringify(g.powers.data.levels);g.powers.cooldowns[power]=7;
 assert.equal(g.powers.stats(power).level,21+i);
 const saved=validateSnapshot(JSON.parse(g.save()));const restored=new Game({save:decodeSave(JSON.stringify(saved))});assert.deepEqual(restored.inventory,g.inventory);assert.deepEqual(restored.powers.data.levels,g.powers.data.levels);assert.equal(restored.powers.data.points,78);assert.equal(restored.powers.cooldowns[power],7);assert.equal(restored.powers.stats(power).level,21+i);
 assert.ok(g.equipItem(result.items[1].uid));assert.equal(g.powers.stats(power).level,20);assert.equal(g.powers.cooldowns[power],7);assert.equal(JSON.stringify(g.powers.data.levels),permanent);
 const next=c.suits[(i+1)%9],mixed=buy(g,{catalogId:next.setId+'-chest'});assert.ok(mixed.ok);g.equipItem(mixed.items[0].uid);assert.equal(g.powers.stats(power).level,20);
 const sale=g.sellItem(result.items[0].uid,{confirmed:true,revision:g.economy.revision});assert.ok(sale.ok);assert.equal(sale.value,resaleValue(c.catalog[s.setId+'-helmet']));
 const individual=shop();for(const part of COSTUME_PARTS)assert.ok(buy(individual,{catalogId:s.setId+'-'+part}).ok);assert.equal(99999-individual.hero.coins,s.price);
 }
});
test('review sessions validate, isolate storage, and never grant an actual save slot',()=>{
 for(const [power,c] of Object.entries(ARMOR_COLLECTIONS))for(const [i,s] of c.suits.entries())for(const sex of ['male','female'])for(const owned of [false,true]){
 const r=reviewProfile(power,i,styleCDefault(sex),owned,'armor-review-test');assert.ok(r.key.startsWith('royale-test-armor-review-test:'));assert.equal(r.url,'index.html?qa=1&testSession=armor-review-test');
 const snap=validateSnapshot(r.profile.slots[0].snapshot);assert.equal(snap.inventory.items.length,owned?3:0);const g=new Game({save:snap});assert.equal(g.powers.stats(power).level,owned?21+i:20);assert.equal(g.hero.coins,s.price);
 }
 assert.throws(()=>reviewProfile('flight',0,null,true,'real-slot'));
 const js=readFileSync(new URL('../armor-review.mjs',import.meta.url),'utf8');assert.ok(js.includes('sessionStorage.setItem'));assert.ok(!js.includes('localStorage'));
 const app=readFileSync(new URL('../app.mjs',import.meta.url),'utf8');assert.ok(app.includes("storagePrefix?storagePrefix+'permanent'"));
});
test('integration and authorized landscape presentation leave protected gameplay, art and saves unchanged',()=>{
 const files=execFileSync('git',['diff','--name-only','b331004c1b90f30cc5e5be4235219fa7e57420fc'],{cwd:new URL('../../',import.meta.url),encoding:'utf8'}).trim().split('\n').filter(Boolean);
 const allowed=['royale/tests/whirlwind-armor.test.mjs','royale/tests/agility-armor.test.mjs','royale/tests/super-kick-armor.test.mjs','royale/tests/hero-preservation.mjs','royale/tests/creature-integration-preservation.mjs','royale/tests/world-ui-preservation.mjs','royale/tests/speed-armor.test.mjs','royale/tests/roots-armor.test.mjs','royale/tests/strength-armor.test.mjs','royale/app.mjs','royale/index.html','royale/renderer.mjs','royale/boss-ui.mjs','royale/landscape-layout.mjs','royale/landscape.css','royale/tests/landscape-layout.test.mjs','royale/tests/landscape-review.html','royale/tests/landscape-review.mjs','royale/tests/flight-armor.test.mjs','royale/LANDSCAPE-REVIEW.md','royale/armor-review.html','royale/armor-review.mjs','royale/armor-review-data.mjs','royale/tests/armor-integration.test.mjs','royale/tests/power-armor-preservation.mjs','royale/ARMOR-INTEGRATION.md'];
 assert.deepEqual(files.filter(p=>!allowed.includes(p)&&!POLISH_FILES.has(p)),[]);
});

test('trial ID works in HTTP previews without crypto.randomUUID',()=>{const session=reviewSessionId({getRandomValues:a=>a.fill(123)});assert.match(session,/^armor-review-[a-f0-9-]+$/);assert.ok(reviewProfile('flight',8,null,true,session).key.includes(session));});
