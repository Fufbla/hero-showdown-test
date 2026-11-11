import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {clothingCoverage,clothingAppearance} from '../cosmetics/visibility.mjs';

const catalog=JSON.parse(await readFile(new URL('../cosmetics/catalog.json',import.meta.url),'utf8'));
const manifestOf=async piece=>JSON.parse(await readFile(new URL('../cosmetics/'+piece.assetManifest.slice(2),import.meta.url),'utf8'));
const worn=(entry)=>({id:entry.id,manifest:entry.manifest,image:{}});
const armor={suit:{id:'armor-suit'},chest:{id:'armor-chest'},boots:{id:'armor-boots'},helmet:{id:'armor-helmet'},gloves:{id:'armor-gloves'},belt:{id:'armor-belt'},emblem:{id:'armor-emblem'},mask:{id:'armor-mask'},cape:{id:'armor-cape'}};
const hero={skin:'#a56c40',hair:'braids',cape:true};

test('every released clothing collection preserves armor data while concealing corresponding visual layers',async()=>{
 assert.equal(catalog.sets.length,36);
 let checked=0;
 for(const set of catalog.sets){
  const entries=[];
  for(const piece of set.pieces)entries.push({id:piece.id,manifest:await manifestOf(piece),image:{}});
  const before=JSON.stringify({armor,hero,entries});
  const visual=clothingAppearance({origin:'equipment',pieces:armor},hero,entries);
  assert.equal(visual.coverage.size>0,true,set.id+' should cover at least one armor zone');
  assert.ok(visual.regionBase&&typeof visual.regionBase==='object');
  if(visual.coverage.has('torso')){
   assert.equal(visual.outfit.pieces.chest,undefined,set.id+' leaves chest armor visible');
   assert.equal(visual.outfit.pieces.emblem,undefined,set.id+' leaves emblem visible');
   assert.ok(visual.regionBase.torso,set.id+' has no visual backing');
  }
  if(visual.coverage.has('arms'))assert.equal(visual.outfit.pieces.gloves,undefined,set.id+' has armored gloves');
  if(visual.coverage.has('legs')||visual.coverage.has('feet'))assert.equal(visual.outfit.pieces.boots,undefined,set.id+' has armored boots');
  if(visual.coverage.has('helmet'))assert.equal(visual.outfit.pieces.helmet,undefined,set.id+' has armored helmet');
  if(visual.coverage.has('mask'))assert.equal(visual.outfit.pieces.mask,undefined,set.id+' has armored face gear');
  assert.equal(visual.look.cape,false,set.id+' has original cape through outfit');
  assert.equal(visual.outfit.pieces.cape,undefined,set.id+' has unrelated armor cape');
  assert.equal(JSON.stringify({armor,hero,entries}),before,'No live armor or save mutation allowed');
  checked+=entries.length;
 }
 assert.equal(checked,118);
});

test('matching armor without a cape suppresses the starter cape without cosmetic layers',()=>{
 const outfit={origin:'equipment',hideBaseCape:true,pieces:{chest:armor.chest}};
 const result=clothingAppearance(outfit,hero,[]);
 assert.equal(result.look.cape,false);
 assert.equal(result.outfit,outfit);
 assert.equal(hero.cape,true,'saved appearance must remain unchanged');
});

test('removing clothing restores armor and missing artwork never conceals it',async()=>{
 const set=catalog.sets.find(x=>x.id==='ninja-warrior');
 const top={id:set.pieces.find(x=>x.category==='top').id,manifest:await manifestOf(set.pieces.find(x=>x.category==='top')),image:{}};
 const original={origin:'equipment',pieces:armor};
 const covered=clothingAppearance(original,hero,[top]);
 assert.equal(covered.outfit.pieces.suit,undefined);
 assert.equal(original.pieces.suit.id,'armor-suit');
 const removed=clothingAppearance(original,hero,[]);
 assert.equal(removed.outfit,original);
 assert.equal(removed.look,hero);
 assert.equal(removed.outfit.pieces.suit.id,'armor-suit');
 assert.equal(clothingCoverage([{...top,image:null}]).size,0);
 assert.equal(clothingAppearance(original,hero,[{...top,image:null}]).outfit.pieces.helmet.id,'armor-helmet');
});
