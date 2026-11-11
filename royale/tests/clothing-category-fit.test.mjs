import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CATEGORY_PROFILES,CATEGORY_FIT_VERSION,categoryFromPiece,collectionFromPiece,tuneClothingCategory} from '../cosmetics/category-fit.mjs';
import {fitClothingLayer} from '../cosmetics/fitting.mjs';
import {attachmentPoints,VIEWS} from '../cosmetics/template.mjs';
import {ClothingRuntime} from '../cosmetics/runtime.mjs';
import {validateAsset} from '../cosmetics/assets.mjs';

const readJSON=async path=>JSON.parse(await readFile(
 new URL('../cosmetics/'+path.replace(/^\.\//,''),import.meta.url),'utf8'));
const catalog=await readJSON('./catalog.json');
const pose={
 head:[0,-78],shoulder:[0,-52],hip:[0,-33],headTilt:0,
 arms:[[[15,-52],[19,-36],[23,-22]],[[-15,-52],[-18,-36],[-23,-22]]],
 legs:[[[8,-33],[10,-18],[14,-3]],[[-8,-33],[-11,-17],[-14,-3]]]
};
const anchors=attachmentPoints(pose);
const size=layer=>{
 const a=anchors[layer.attach],b=layer.end&&anchors[layer.end.attach];
 const distance=(v,w)=>Math.hypot(v[0]-w[0],v[1]-w[1]);
 return b?distance(a,b)/distance(layer.pivot,layer.end.pivot):layer.scale;
};

test('all categories are distinct and do not change reference artwork',()=>{
 assert.equal(CATEGORY_FIT_VERSION,'category-fitted-all-36-v1');
 assert.deepEqual(Object.keys(CATEGORY_PROFILES).sort(),['accessory','bottom','cape','footwear','fullbody','headwear','top']);
 assert.equal(collectionFromPiece({id:'mrs.-claus.headwear'}),'mrs.-claus');
 assert.equal(categoryFromPiece({id:'mrs.-claus.headwear'}),'headwear');
 assert.equal(categoryFromPiece({id:'ninja-warrior.bottom',category:'bottom'}),'bottom');
});

test('category tuning seats headwear and narrows sleeves and boots without shortening leg bones',()=>{
 const base={width:1,height:1,offset:[0,0]};
 const head={view:'front',part:'headwear',attach:'head'};
 const ninja=tuneClothingCategory(head,base,{id:'ninja-warrior.headwear',category:'headwear'});
 const explorer=tuneClothingCategory(head,base,{id:'explorer.headwear',category:'headwear'});
 assert.ok(ninja.width<explorer.width,'Headbands should not be as wide as large-brim hats');
 assert.ok(ninja.height<1&&ninja.offset[1]>0,'Headband should shrink and seat lower on skull');
 assert.ok(explorer.width>.95,'Designed wide-brim hat must retain its distinctive silhouette');
 const sleeve=tuneClothingCategory({part:'upperArmNear',view:'front'},base,{id:'urban-hero.top',category:'top'});
 const boot=tuneClothingCategory({part:'footNear',view:'front'},base,{id:'urban-hero.footwear',category:'footwear'});
 assert.ok(sleeve.width<1&&sleeve.height===1,'Sleeve width may change but not bone length');
 assert.ok(boot.width<1&&boot.height<1,'Footwear must be attached tightly to ankles');
 const robe=tuneClothingCategory({part:'skirt',view:'front'},base,{id:'mystic-robe.fullbody',category:'fullbody'});
 assert.deepEqual(robe,base,'Flowing skirt silhouettes should not be narrowed by trouser rules');
 assert.deepEqual(base,{width:1,height:1,offset:[0,0]},'Category fitting must not mutate original fit');
});

test('all 118 active outfit pieces get safe four-view category transforms',async()=>{
 assert.equal(catalog.sets.length,36);
 const pieces=catalog.sets.flatMap(x=>x.pieces);
 assert.equal(pieces.length,118);
 const stats={};
 for(const piece of pieces){
  const manifest=await readJSON(piece.assetManifest);
  assert.deepEqual(validateAsset(manifest),[],piece.id+' remains valid');
  assert.equal([...new Set(manifest.layers.map(l=>l.view))].length,4,piece.id+' directions');
  assert.equal(categoryFromPiece(piece),piece.category);
  stats[piece.category]=(stats[piece.category]||0)+1;
  const original=JSON.stringify(manifest);
  for(const layer of manifest.layers){
   for(const p of [pose,{...pose,headTilt:.25,arms:[[[15,-50],[27,-35],[36,-22]],[[-15,-52],[-24,-37],[-32,-26]]]}]){
    const fit=fitClothingLayer(layer,p,attachmentPoints(p),size(layer),piece);
    assert.ok(Number.isFinite(fit.width)&&fit.width>=.55&&fit.width<=2,piece.id+' bad width');
    assert.ok(Number.isFinite(fit.height)&&fit.height>=.6&&fit.height<=1.8,piece.id+' bad height');
    assert.equal(fit.offset.length,2,piece.id+' invalid offset');
    assert.ok(fit.offset.every(Number.isFinite),piece.id+' bad offset');
   }
  }
  assert.equal(JSON.stringify(manifest),original,'No changes to approved artwork '+piece.id);
 }
 assert.deepEqual(stats,{fullbody:12,footwear:36,top:24,bottom:24,accessory:20,cape:2});
});

test('live and try-on runtime retain category identity for fitting and keep original catalog safe',async()=>{
 const assets={load:async m=>({width:m.atlas.width,height:m.atlas.height})};
 const runtime=new ClothingRuntime({assets,readJSON});
 for(const set of catalog.sets.slice(0,6)){
  const loaded=await runtime.loadOutfit(set,{review:true});
  assert.equal(loaded.length,set.pieces.length);
  for(const item of loaded){
   const entry=set.pieces.find(x=>x.id===item.id);
   assert.equal(item.category,entry.category);
   assert.equal(item.manifest.layers.length>0,true);
  }
  const reloaded=await runtime.loadOutfit(set,{review:true});
  assert.equal(reloaded,loaded,'repeat views must use cached loaded fit layers');
 }
});
