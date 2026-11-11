import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {Game,decodeSave} from '../core.mjs';
import {emptyCosmetics,normalizeCosmetics,catalogIndex,cosmeticTransaction,cosmeticAppearance,outfitSelection} from '../cosmetics/state.mjs';
import {applyClothingAction} from '../cosmetics/game-adapter.mjs';
import {universalRenderLook} from '../cosmetics/template.mjs';
import {ClothingAssets,validateAsset} from '../cosmetics/assets.mjs';
import {encodeRuntime,decodeRuntime} from '../multiplayer/runtime.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../cosmetics/catalog.json',import.meta.url)));
const index=catalogIndex(catalog),op=(type,rest={})=>({type,revision:0,...rest});
const tx=(state,operation,rest={})=>cosmeticTransaction({state,coins:2000,index,operation,safe:true,atWardrobe:true,...rest});
const buy=(id='royal-kimono')=>tx(emptyCosmetics(),op('purchase',{id,confirmed:true}));

test('all 36 outfits are released; unfinished entries still cannot be purchased',()=>{
 assert.equal(catalog.sets.length,36);assert.equal(new Set(catalog.sets.map(s=>s.id)).size,36);
 for(const s of catalog.sets)assert.equal(tx(emptyCosmetics(),op('purchase',{id:s.id,confirmed:true})).ok,true);
 const unfinished=structuredClone(catalog);unfinished.sets[0].availability='fitting';
 assert.equal(tx(emptyCosmetics(),op('purchase',{id:'royal-kimono',confirmed:true}),{index:catalogIndex(unfinished)}).ok,false);
});
test('legacy save gains empty clothing without changing progression',()=>{
 const g=new Game();g.hero.hp=37;g.hero.coins=517;const old=JSON.parse(g.save());delete old.cosmetics;
 const restored=new Game({save:decodeSave(JSON.stringify(old))});
 assert.deepEqual(restored.cosmetics,emptyCosmetics());assert.equal(restored.hero.hp,37);assert.equal(restored.hero.coins,517);
 assert.deepEqual(restored.inventory,g.inventory);assert.deepEqual(restored.look,g.look);
});
test('set purchase charges once, revision rejects double confirmation',()=>{
 const r=buy();assert(r.ok);assert.equal(r.coins,1300);assert.equal(r.state.owned.length,2);
 assert.equal(tx(r.state,op('purchase',{id:'royal-kimono',confirmed:true})).ok,false);
 assert.equal(tx(r.state,op('purchase',{id:'royal-kimono',confirmed:true,revision:1})).ok,false);
});
test('hide retains selections and purchases; Wear makes the complete outfit visible again',()=>{
 let r=buy();r=tx(r.state,op('equip',{id:'royal-kimono',revision:1}));const before=structuredClone(r.state);
 r=tx(r.state,op('visible',{value:false,revision:2}));assert.equal(r.state.visible,false);
 assert.deepEqual(r.state.equipped,before.equipped);assert.deepEqual(r.state.owned,before.owned);
 r=tx(r.state,op('equip',{id:'royal-kimono',revision:3}));assert.equal(r.state.visible,true);
});
test('unknown and retired IDs survive save as inactive ownership; invalid data stays invalid',()=>{
 const s={...emptyCosmetics(),owned:['future-summer.top','royal-kimono.headwear'],equipped:{top:'future-summer.top',headwear:'royal-kimono.headwear'}};
 const canonical={...s,equipped:{}};assert.deepEqual(normalizeCosmetics(s),canonical);
 const g=new Game();g.cosmetics=s;assert.deepEqual(decodeSave(g.save()).cosmetics,canonical);
 assert.equal(normalizeCosmetics({...s,version:2}),null);
 assert.equal(decodeSave(JSON.stringify({...JSON.parse(g.save()),cosmetics:{...s,version:2}})),null);
});
test('cosmetic actions preserve actual Game armor, HP, hitbox, powers and inventory',()=>{
 const g=new Game({equipment:{defense:15,strength:10,hp:20}});g.hero.coins=2000;
 g.inventory.items=[{uid:'drop-1',catalogId:'eris-shore-ordinary-chest'},{uid:'drop-2',catalogId:'eris-shore-ordinary-boots'}];
 g.inventory.equipped={chest:'drop-1',boots:'drop-2'};g.inventory.nextId=3;g.refreshEquipment();g.hero.hp=41;g.paused=true;g.visitTree();
 const before={inventory:structuredClone(g.inventory),equipment:structuredClone(g.equipment),base:structuredClone(g.baseEquipment),hp:g.hero.hp,maxHp:g.hero.maxHp,w:g.hero.w,h:g.hero.h,powers:g.powers.snapshot()};
 assert(applyClothingAction(g,index,op('purchase',{id:'royal-kimono',confirmed:true})).ok);
 assert(applyClothingAction(g,index,op('equip',{id:'royal-kimono',revision:1})).ok);g.refreshEquipment();
 assert.deepEqual({inventory:g.inventory,equipment:g.equipment,base:g.baseEquipment,hp:g.hero.hp,maxHp:g.hero.maxHp,w:g.hero.w,h:g.hero.h,powers:g.powers.snapshot()},before);
 const restored=new Game({save:decodeSave(g.save())});assert.deepEqual(restored.cosmetics,g.cosmetics);
});
test('individual Game instances and authoritative runtime keep their own outfits',()=>{
 const a=new Game(),b=new Game();a.cosmetics=buy().state;a.cosmetics.equipped=outfitSelection(index.get('royal-kimono'));
 const restored=decodeRuntime(encodeRuntime([a,b]));assert.deepEqual(restored[0].cosmetics,a.cosmetics);
 assert.deepEqual(restored[1].cosmetics,emptyCosmetics());assert.deepEqual(cosmeticAppearance(a.cosmetics).equipped,a.cosmetics.equipped);
});
test('universal render contract ignores all body variations without mutating saved choices',()=>{const a={presentation:'male',height:.88,build:'slender',hair:'short',skin:'#123456'},b={...a,presentation:'female',height:1.12,build:'full'};const x=universalRenderLook(a),y=universalRenderLook(b);assert.equal(x.height,y.height);assert.equal(x.build,y.build);assert.equal(a.height,.88);assert.equal(x.presentation,'male');assert.equal(y.presentation,'female');assert.equal(x.skin,a.skin);});
function manifest(){return {template:'universal-style-c-v1',atlas:{url:'./assets/fixture.png',width:64,height:64},layers:['front','right','back','left'].map((view,i)=>({view,part:'torso',pass:'torso',rect:[i*16,0,16,16],pivot:[8,0],attach:'neck',scale:1}))};}
test('asset validation rejects missing directions, mirrors and bad attachment metadata',()=>{const m=manifest();assert.deepEqual(validateAsset(m),[]);m.layers[0].mirror=true;assert(validateAsset(m).some(e=>e.includes('Mirrored')));delete m.layers[0].mirror;m.layers.pop();assert(validateAsset(m).some(e=>e.includes('Missing direction')));});
test('lazy assets deduplicate concurrent requests, bound cache and allow retry',async()=>{let calls=0;const assets=new ClothingAssets({limit:1,loadImage:async()=>{calls++;return {width:64,height:64};}});await Promise.all([assets.load(manifest()),assets.load(manifest())]);assert.equal(calls,1);const next=manifest();next.atlas.url='./assets/second.png';await assets.load(next);assert.equal(assets.cache.size,1);await assets.load(manifest());assert.equal(calls,3);});
test('combat autosave checkpoints retain cosmetic ownership and selections',async()=>{const {captureProgress}=await import('../local-coop/session.mjs');const g=new Game();g.cosmetics=buy().state;g.combatTimer=5;const saved=captureProgress(g);assert.equal(saved.version,9);assert.deepEqual(saved.cosmetics,g.cosmetics);assert.notEqual(saved.cosmetics,g.cosmetics);assert.deepEqual(new Game({save:decodeSave(JSON.stringify(saved))}).cosmetics,g.cosmetics);});
test('approved kimono retains its body and footwear manifests in four views without headwear',()=>{const set=catalog.sets.find(s=>s.id==='royal-kimono');assert.equal(set.review.referenceFidelity,true);assert.equal(set.availability,'released');for(const piece of set.pieces){const m=JSON.parse(fs.readFileSync(new URL('../cosmetics/'+piece.assetManifest,import.meta.url)));assert.deepEqual(validateAsset(m),[]);}});
test('sleeve halves bind shoulder/elbow/wrist while painting without mutating pose',async()=>{const {drawClothingPass}=await import('../cosmetics/renderer.mjs');const pose={head:[0,-90],shoulder:[0,-60],hip:[0,-40],arms:[[[10,-60],[20,-45],[30,-40]],[[-10,-60],[-20,-45],[-30,-40]]],legs:[[[5,-40],[10,-20],[10,0]],[[-5,-40],[-10,-20],[-10,0]]]};const before=structuredClone(pose),calls=[];const c=Object.fromEntries(['save','restore','translate','rotate','scale','beginPath','moveTo','lineTo','closePath','clip','drawImage'].map(k=>[k,(...args)=>calls.push([k,...args])]));const m=JSON.parse(fs.readFileSync(new URL('../cosmetics/assets/royal-kimono/fullbody.json',import.meta.url)));drawClothingPass(c,pose,'front','nearArm',[{manifest:m,image:{width:1024,height:1536}}]);assert.equal(calls.filter(c=>c[0]==='drawImage').length,2);assert(calls.some(c=>c[0]==='translate'&&c[1]===20&&c[2]===-45));assert.deepEqual(pose,before);});
