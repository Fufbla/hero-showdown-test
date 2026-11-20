import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Game,decodeSave} from '../../core.mjs';
import {LocalSession,captureProgress} from '../../local-coop/session.mjs';
import {canWearOutfit,FEMALE_OUTFIT_IDS,OUTFIT_RESTRICTION} from '../../cosmetics/eligibility.mjs';
import {emptyCosmetics,catalogIndex,cosmeticTransaction} from '../../cosmetics/state.mjs';
import {applyClothingAction} from '../../cosmetics/game-adapter.mjs';
import {checkCosmeticSave} from '../../four-powers/backend-v3/deploy/cloud/cosmetics/save-guard.mjs';
import {COLLECTION,costumeForState} from '../catalog.mjs';
import {ClothingRuntime,clothingRuntime} from '../../../royale-v3-staging/costumes/runtime.mjs';
import {initializeTryOn,openTryOn} from '../../../royale-v3-staging/costumes/tryon.mjs';
import {storeControls} from '../../../royale-v3-staging/costumes/purchase-ui.mjs';

const index=catalogIndex({sets:COLLECTION}),female={presentation:'female'},male={presentation:'male'};
const outfit=COLLECTION.find(o=>o.id==='little-black-dress');
const hero=look=>{const g=new Game({look});g.hero.coins=30000;return g;};
function worn(id='little-black-dress'){
 return {...emptyCosmetics(),revision:4,owned:[id+'.fullbody'],equipped:{fullbody:id+'.fullbody'}};
}
function transact(g,type,id){
 return cosmeticTransaction({state:g.cosmetics,look:g.look,coins:g.hero.coins,index,operation:{type,id,confirmed:true,revision:g.cosmetics.revision},safe:true,atWardrobe:true});
}

test('all 30 outfits have the requested eligibility: 19 male/unisex and 11 female-only',()=>{
 assert.equal(COLLECTION.length,30);assert.equal(FEMALE_OUTFIT_IDS.length,11);
 assert(FEMALE_OUTFIT_IDS.every(id=>index.has(id)));
 assert.equal(COLLECTION.filter(o=>canWearOutfit(o,male)).length,19);
 assert.equal(COLLECTION.filter(o=>canWearOutfit(o,female)).length,30);
 for(const id of ['black-business-suit','white-business-suit','pink-shark-costume','snowflake-knit'])assert(canWearOutfit(id,male));
 for(const id of FEMALE_OUTFIT_IDS)for(const look of [male,{},undefined,{presentation:'invalid'}])assert.equal(canWearOutfit(id,look),false);
});

test('male heroes cannot purchase or equip any female-only outfit; failed actions never debit coins or alter ownership',()=>{
 for(const id of FEMALE_OUTFIT_IDS){
  const g=hero(male),before=g.save();
  assert.deepEqual(transact(g,'purchase',id),{ok:false,error:OUTFIT_RESTRICTION});assert.equal(g.save(),before);
  g.cosmetics=worn(id);g.cosmetics.equipped={};const owned=structuredClone(g.cosmetics);
  assert.deepEqual(transact(g,'equip',id),{ok:false,error:OUTFIT_RESTRICTION});assert.deepEqual(g.cosmetics,owned);
  const hidden=worn(id);hidden.visible=false;
  assert.equal(cosmeticTransaction({state:hidden,look:male,coins:30000,index,safe:true,operation:{type:'visible',value:true,revision:4}}).ok,false);
 }
});

for(const [name,look,expected] of [['male',male,19],['female',female,30]])test(name+' heroes can purchase, wear, save and reload every eligible outfit',()=>{
 let count=0;
 for(const o of COLLECTION.filter(o=>canWearOutfit(o,look))){
  const g=hero(look),before=captureProgress(g);
  for(const type of ['purchase','equip']){const r=transact(g,type,o.id);assert(r.ok,r.error);g.cosmetics=r.state;g.hero.coins=r.coins;}
  assert.equal(g.hero.coins,o.id==='robot-costume'?30000:29300);const after=JSON.parse(g.save());assert(checkCosmeticSave(before,after).ok,o.id);
  const reloaded=new Game({save:decodeSave(JSON.stringify(after))});assert.equal(costumeForState(reloaded.cosmetics,reloaded.look)?.id,o.id);count++;
 }
 assert.equal(count,expected);
});

test('old male saves remove only the ineligible selection and remain cloud-saveable at the original revision',()=>{
 for(const id of FEMALE_OUTFIT_IDS){
  const raw=captureProgress(hero(male));raw.cosmetics=worn(id);const original=structuredClone(raw);
  const decoded=decodeSave(JSON.stringify(raw)),baseline=decodeSave(JSON.stringify({...raw,cosmetics:emptyCosmetics()}));assert(decoded,id);assert.deepEqual(raw,original);
  assert.deepEqual(decoded.cosmetics,{...raw.cosmetics,equipped:{}});
  for(const key of ['look','coins','level','xp','inventory','powers','economy','world'])assert.deepEqual(decoded[key],baseline[key],key);
  const restored=new Game({save:raw});assert.deepEqual(restored.cosmetics,decoded.cosmetics);
  for(const next of [JSON.parse(restored.save()),captureProgress(restored)])assert(checkCosmeticSave(raw,next).ok,id);
  assert.deepEqual(new Game({save:decodeSave(restored.save())}).cosmetics,restored.cosmetics);
 }
});

test('makeover to male removes a female-only selection, preserving ownership and charging only the existing appearance price',()=>{
 const g=hero(female);g.cosmetics=worn();g.paused=true;g.treeVisit=true;
 const before=captureProgress(g),quote=g.makeoverPreview({...g.look,presentation:'male'});assert(quote.ok,quote.error);
 const result=g.applyMakeover(quote.next,{confirmed:true,revision:quote.revision});assert(result.ok,result.error);
 assert.deepEqual(g.cosmetics,{...before.cosmetics,equipped:{}});assert.equal(g.hero.coins,before.coins-quote.cost);
 assert(checkCosmeticSave(before,captureProgress(g)).ok);
});

test('cloud guard rejects forged male equips and purchases even with a newer wardrobe revision, but retains previous purchases',()=>{
 const before=captureProgress(hero(male));
 for(const id of FEMALE_OUTFIT_IDS){
  const equip=structuredClone(before);equip.cosmetics=worn(id);
  assert.equal(checkCosmeticSave(before,equip).ok,false);
  const purchase=structuredClone(equip);purchase.cosmetics.equipped={};assert.equal(checkCosmeticSave(before,purchase).ok,false);
  const older=structuredClone(equip),clean=structuredClone(purchase);assert(checkCosmeticSave(older,clean).ok);
  clean.cosmetics.revision=3;assert.equal(checkCosmeticSave(older,clean).ok,false);
  clean.cosmetics.revision=5;clean.cosmetics.owned=[];assert.equal(checkCosmeticSave(older,clean).ok,false);
 }
});

test('transaction adapter uses the actual hero, and runtime layers reject stale selections without loading their artwork',()=>{
 const g=hero(male);g.paused=true;g.treeVisit=true;g.cosmetics=worn();g.cosmetics.equipped={};
 const before=captureProgress(g);assert.equal(applyClothingAction(g,index,{type:'equip',id:outfit.id,look:female,revision:4}).ok,false);assert.deepEqual(captureProgress(g),before);
 const runtime=new ClothingRuntime({readJSON:()=>{throw Error('Restricted art should not load');}});
 assert.deepEqual(runtime.layers(worn(),male),[]);assert.equal(costumeForState(worn(),male),null);assert.equal(costumeForState(worn(),female)?.id,outfit.id);
});

for(const malePlayer of [0,1])test('local co-op saves apply eligibility independently with the male hero in player '+(malePlayer+1),async()=>{
 const snapshots=[0,1].map(i=>{const raw=captureProgress(hero(i===malePlayer?male:female));raw.cosmetics=worn();return raw;});
 const saves=[[],[]],profiles=snapshots.map((snapshot,i)=>({identity:'wardrobe-'+i,slots:[{slot_number:1,snapshot}],async save(slot,snapshot){saves[i].push(snapshot);}}));
 const session=new LocalSession(profiles.map(profile=>({profile,slot:1})));
 await session.saveAll('wardrobe-check');
 for(let i=0;i<2;i++){
  const g=session.heroes[i].game,after=captureProgress(g);assert.deepEqual(after.cosmetics.owned,snapshots[i].cosmetics.owned);
  assert.equal(Object.keys(after.cosmetics.equipped).length,i===malePlayer?0:1);assert(checkCosmeticSave(snapshots[i],after).ok);
  assert(saves[i].length>0);assert.deepEqual(saves[i].at(-1).cosmetics,after.cosmetics);
 }
});

test('the deployed wardrobe rule is identical to the client rule',async()=>{
 assert.equal(await readFile(new URL('../../cosmetics/eligibility.mjs',import.meta.url),'utf8'),await readFile(new URL('../../four-powers/backend-v3/deploy/cloud/cosmetics/eligibility.mjs',import.meta.url),'utf8'));
});

// Minimal DOM exercises the real controls and fitting-room async checks.
function dom(t){
 const previous={window:globalThis.window,document:globalThis.document};let look=male,cosmetics=emptyCosmetics();
 class Element{
  constructor(tag){this.tag=tag;this.children=[];this.isConnected=true;this.textContent='';}
  append(...nodes){this.children.push(...nodes);} prepend(...nodes){this.children.unshift(...nodes);}
  setAttribute(){} scrollIntoView(){} querySelectorAll(){return [];} getContext(){return {clearRect(){}};}
 }
 globalThis.document={createElement:tag=>new Element(tag)};globalThis.window=new EventTarget();
 window.addEventListener('royale-clothing-preview-request',e=>e.detail.receive({look}));
 window.addEventListener('royale-clothing-snapshot-request',e=>e.detail.receive({look,cosmetics,ready:true,coins:30000}));
 t.after(()=>Object.assign(globalThis,previous));
 return {holder:new Element('div'),setLook:value=>look=value,setCosmetics:value=>cosmetics=value};
}
test('shop controls disable buying and wearing female outfits for male heroes and enable both for female heroes',t=>{
 const ui=dom(t),button=wrap=>wrap.children.find(c=>c.tag==='button');
 assert.equal(button(storeControls(outfit)).disabled,true);ui.setCosmetics({...worn(),equipped:{}});assert.equal(button(storeControls(outfit)).disabled,true);
 ui.setLook(female);assert.equal(button(storeControls(outfit)).disabled,false);ui.setCosmetics(emptyCosmetics());assert.equal(button(storeControls(outfit)).disabled,false);
});
test('fitting room blocks restricted try-on and rechecks eligibility after asynchronous artwork loads',async t=>{
 const ui=dom(t);initializeTryOn(ui.holder);let loads=0,finish;
 const original=clothingRuntime.loadOutfit;clothingRuntime.loadOutfit=()=>{loads++;return new Promise(resolve=>finish=resolve);};t.after(()=>clothingRuntime.loadOutfit=original);
 assert.equal(await openTryOn(outfit),false);assert.equal(loads,0);
 ui.setLook(female);const pending=openTryOn(outfit);assert.equal(loads,1);ui.setLook(male);finish([{costumeId:outfit.id}]);assert.equal(await pending,false);
});
