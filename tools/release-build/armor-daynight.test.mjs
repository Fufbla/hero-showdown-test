import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,decodeSave} from '../../royale/core.mjs';
import {EQUIPMENT,armorOutfitPrice,activeArmorShopDefinitions,equipmentBonuses} from '../../royale/equipment.mjs';
import {CLOCK,worldClock} from '../../royale/progression.mjs';
import {WORLD_CLOCK_REFERENCE} from '../../royale/world-state.mjs';
import {LocalSession,captureProgress} from '../../royale/local-coop/session.mjs';
import {COLLECTION} from '../../royale/fashion/catalog.mjs';
import {TYPES} from '../../royale/world.mjs';

const expected={10:100,20:300,30:700,40:1300,50:2200,60:3500,70:5200,80:7300,90:10000};
const sets=[...new Set(Object.values(EQUIPMENT).filter(d=>d.shop&&expected[d.level]).map(d=>d.setId))];
function ready(level=99){const g=new Game();g.hero.level=level;g.powers.data.points=level-1;g.hero.coins=50000;assert(g.visitTree());return g;}
for(const [level,price] of Object.entries(expected))test(`level ${level}: every shop family quotes and deducts ${price}; ownership and bonuses survive reload`,()=>{
 const ids=sets.filter(id=>activeArmorShopDefinitions(id)[0].level===Number(level));
 assert(ids.length>=8);
 for(const id of ids){
  const g=ready(Number(level)),q=g.costumePreview(id),before=g.hero.coins;
  assert(q.ok,id);assert.equal(q.cost,price,id);assert.equal(armorOutfitPrice(id),price,id);
  const result=g.buyCostume(id,{confirmed:true,revision:q.revision});assert(result.ok,id);
  assert.equal(g.hero.coins,before-price);assert.equal(g.economy.coinsSpent,price);
  assert.equal(g.inventory.items.length,2);assert(g.equipItem(result.items[0].uid));
  const inventory=structuredClone(g.inventory),stats=equipmentBonuses(inventory,Number(level));
  const saved=decodeSave(g.save());assert(saved,id);const restored=new Game({save:saved});
  assert.deepEqual(restored.inventory,inventory);assert.deepEqual(equipmentBonuses(restored.inventory,Number(level)),stats);
  assert.equal(restored.hero.coins,before-price);
  const low=ready(Number(level)-1);assert.equal(low.costumePreview(id).ok,false);
  const poor=ready(Number(level));poor.hero.coins=price-1;assert.equal(poor.costumePreview(id).ok,false);assert.equal(poor.hero.coins,price-1);
 }
});
test('all current cosmetic outfits remain 700 coins',()=>{assert.equal(COLLECTION.length,28);for(const c of COLLECTION)assert.equal(c.coinPrice,700,c.id);});
for(let region=1;region<=7;region++)test(`region ${region}: existing 30/10 clock boundaries apply to every hero`,()=>{
 const ref=WORLD_CLOCK_REFERENCE,total=CLOCK.day+CLOCK.night;
 assert.equal(CLOCK.day,1800000);assert.equal(CLOCK.night,600000);
 for(const cycle of [0,1,1000])for(const [offset,night,remaining] of [[0,false,1800],[CLOCK.day-1,false,1],[CLOCK.day,true,600],[total-1,true,1],[total,false,1800]]){
  const c=worldClock(ref,ref+cycle*total+offset,region);assert.equal(c.night,night);assert.equal(c.remaining,remaining);
 }
});
test('new heroes, old snapshots, account/hero switching and reload share one epoch without appearance or progression edits',()=>{
 let now=WORLD_CLOCK_REFERENCE+CLOCK.day+123000;
 const saves=[1,2,5].map((region,i)=>{const g=new Game({now:()=>now});g.look.name='Saved hero '+i;g.loadRegion(region);g.hero.coins=51+i;return JSON.parse(g.save());});
 const originals=structuredClone(saves);
 for(const i of [0,1,2,0,2,1]){
  const g=new Game({save:decodeSave(JSON.stringify(saves[i])),now:()=>now});assert.equal(g.clock().night,true);
  assert.equal(new Game({now:()=>now}).clock().night,true);
  for(const field of ['look','level','xp','coins','inventory','cosmetics','powers','economy'])assert.deepEqual(JSON.parse(g.save())[field],saves[i][field]);
  now+=1000;const restored=new Game({save:decodeSave(g.save()),now:()=>now});assert.deepEqual(restored.clock(),g.clock());
 }
 assert.deepEqual(saves,originals);
});
test('both local co-op players share the cycle and pay independently; saves preserve both accounts',async()=>{
 let now=WORLD_CLOCK_REFERENCE+CLOCK.day+1000;
 const profiles=[0,1].map(i=>{const g=ready();g.leaveTree();return {identity:'armor-clock-fixture-'+i,slots:[{slot_number:1,snapshot:JSON.parse(g.save())}],saved:[],async save(slot,snapshot){this.saved.push(structuredClone(snapshot));}};});
 const s=new LocalSession(profiles.map(profile=>({profile,slot:1})),{now:()=>now});
 assert.deepEqual(s.games[0].clock(),s.games[1].clock());assert(s.games.every(g=>g.clock().night));
 for(const i of [0,1]){
  assert(s.command(i,'visitTree'));const q=s.games[i].costumePreview('fireball-ember');assert.equal(q.cost,100);
  assert(s.command(i,'buyCostume',['fireball-ember',{confirmed:true,revision:q.revision}]).ok);
 }
 assert.deepEqual(s.games.map(g=>g.hero.coins),[49900,49900]);
 assert((await s.saveAll()).every(r=>r.ok));
 for(let i=0;i<2;i++){assert(decodeSave(JSON.stringify(profiles[i].saved[0])));assert.equal(profiles[i].saved[0].coins,49900);}
 now=WORLD_CLOCK_REFERENCE+CLOCK.day+CLOCK.night;assert(s.games.every(g=>!g.clock().night));
 assert.deepEqual(s.games.map(captureProgress).map(x=>x.look),profiles.map(p=>p.saved[0].look));
});
test('universal lighting preserves existing region-specific monster difficulty',()=>{
 for(let region=1;region<=7;region++){
  const g=new Game({now:()=>WORLD_CLOCK_REFERENCE+CLOCK.day});g.loadRegion(region);const e=g.enemies.find(e=>!e.boss);
  assert.equal(g.monsterDamage(e),TYPES[e.type].damage*(region>2?2:1));
 }
});
