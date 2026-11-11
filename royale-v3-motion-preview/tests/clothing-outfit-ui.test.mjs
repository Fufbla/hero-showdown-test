import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ClothingRuntime} from '../cosmetics/runtime.mjs';
import {ClothingMenu} from '../cosmetics/menu.mjs';
import {initializeStoreActions,storeControls,myClothingPanel} from '../clothing-purchase-ui.mjs';
import {catalogIndex,emptyCosmetics,outfitSelection,cosmeticTransaction} from '../cosmetics/state.mjs';
import {clothingCoverage,clothingAppearance} from '../cosmetics/visibility.mjs';
import {clothingHair,drawClothingPass} from '../cosmetics/renderer.mjs';

const readJSON=async path=>JSON.parse(await readFile(new URL('../cosmetics/'+path.replace(/^\.\//,''),import.meta.url),'utf8'));
const catalog=await readJSON('./catalog.json');
const setFor=id=>catalog.sets.find(set=>set.id===id);
const own=(...sets)=>({...emptyCosmetics(),owned:sets.flatMap(set=>set.pieces.map(piece=>piece.id))});
const assets={load:async manifest=>({width:manifest.atlas.width,height:manifest.atlas.height})};

test('legacy headwear and mixed selections load only the complete owned body outfit',async()=>{
 const reads=[],runtime=new ClothingRuntime({assets,readJSON:async path=>{reads.push(path);return readJSON(path);}});
 const kimono=setFor('royal-kimono'),urban=setFor('urban-hero');
 const state={...own(kimono,urban),owned:[...own(kimono,urban).owned,'royal-kimono.headwear','vampire.cape'],
  equipped:{fullbody:'royal-kimono.fullbody',footwear:'urban-hero.footwear',headwear:'royal-kimono.headwear',cape:'vampire.cape'}};
 const before=structuredClone(state);
 assert.deepEqual(runtime.layers(state),[]);
 const loaded=await runtime.loadIds([...Object.values(outfitSelection(kimono)),'royal-kimono.headwear']);
 assert.deepEqual(runtime.layers(state).map(piece=>piece.id),kimono.pieces.map(piece=>piece.id));
 assert.equal(loaded.length,2);
 assert.deepEqual(reads.sort(),['./assets/royal-kimono/footwear.json','./assets/royal-kimono/fullbody.json','./catalog.json']);
 assert.deepEqual(state,before,'Visual migration cannot mutate ownership or selection');
 assert.equal(runtime.layers({visible:true,equipped:outfitSelection(kimono)}).length,2,'Compact remote appearances use the same complete selection');
});

test('partial or mixed preview requests never fetch artwork, and retired-only requests are empty',async()=>{
 let reads=0;
 const runtime=new ClothingRuntime({assets,readJSON:async()=>{reads++;throw Error('Unexpected request');}});
 await assert.rejects(runtime.loadIds(['royal-kimono.fullbody']),/complete matching outfit/);
 await assert.rejects(runtime.loadIds([...Object.values(outfitSelection(setFor('royal-kimono'))),'vampire.cape']),/complete matching outfit/);
 await assert.rejects(runtime.loadIds(['unknown.top']),/complete matching outfit/);
 assert.deepEqual(await runtime.loadIds(['ninja-warrior.headwear','ninja-warrior.accessory']),[]);
 assert.equal(reads,0);
});

test('five simultaneous player outfits stay cached between frames',async()=>{
 let reads=0;
 const runtime=new ClothingRuntime({assets,readJSON:async path=>{reads++;return readJSON(path);}});
 const sets=catalog.sets.slice(0,5);
 for(const set of sets)await runtime.loadOutfit(set);
 const loadedReads=reads;
 for(let frame=0;frame<20;frame++)for(const set of sets)
  assert.equal(runtime.layers({visible:true,equipped:outfitSelection(set)}).length,set.pieces.length);
 assert.equal(reads,loadedReads);
});

test('cached head-only accessories cannot draw, cover armor, or hide hair',async()=>{
 const manifest=await readJSON('./assets/ninja-warrior/accessory.json');
 const piece={id:'ninja-warrior.accessory',category:'accessory',manifest:{...manifest,hair:'hidden',covers:['mask','helmet']},image:{}};
 const pose={head:[0,-70],shoulder:[0,-50],hip:[0,-30],arms:[[[0,0],[1,1],[2,2]],[[0,0],[1,1],[2,2]]],legs:[[[0,0],[1,1],[2,2]],[[0,0],[1,1],[2,2]]]};
 drawClothingPass({drawImage(){assert.fail('Retired face artwork was drawn');}},pose,'front','accessory',[piece]);
 assert.equal(clothingCoverage([piece]).size,0);
 assert.equal(clothingHair([piece]),null);
 const look={cape:true},outfit={pieces:{}};
 assert.equal(clothingAppearance(outfit,look,[piece]).look,look);
});

class Element{
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.className='';this.disabled=false;this.isConnected=true;}
 set textContent(value){this.children=[String(value)];}
 get textContent(){return this.children.map(child=>typeof child==='string'?child:child.textContent).join('');}
 append(...children){this.children.push(...children);}
 prepend(...children){this.children.unshift(...children);}
 replaceChildren(...children){this.children=[...children];}
 setAttribute(name,value){this.attributes[name]=String(value);}
 querySelectorAll(selector){const result=[];for(const child of this.children)if(typeof child!=='string'){if(selector.startsWith('.')?child.className.split(' ').includes(selector.slice(1)):child.tagName===selector.toUpperCase())result.push(child);result.push(...child.querySelectorAll(selector));}return result;}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}

test('production controls buy, wear, and remove one complete outfit, with legacy credit',async()=>{
 const previous={document:globalThis.document,window:globalThis.window};
 const target=new EventTarget();target.confirm=()=>true;
 globalThis.window=target;globalThis.document={createElement:tag=>new Element(tag)};
 try{
  const ninja=setFor('ninja-warrior'),index=catalogIndex(catalog),operations=[];
  let state={ready:true,coins:1000,cosmetics:emptyCosmetics()};
  target.addEventListener('royale-clothing-snapshot-request',event=>event.detail.receive(state));
  target.addEventListener('royale-clothing-operation',event=>{
   const operation={...event.detail.operation,revision:state.cosmetics.revision};operations.push(operation);
   const result=cosmeticTransaction({state:state.cosmetics,coins:state.coins,index,operation,safe:true,atWardrobe:true});
   if(result.ok)state={...state,coins:result.coins,cosmetics:result.state};
   event.detail.receive({...result,cloudConfirmed:result.ok});
  });
  let rendered=null;
  const holder=new Element('section');initializeStoreActions(catalog.sets,()=>{rendered=storeControls(ninja);},holder);
  let controls=storeControls(ninja),buttons=controls.querySelectorAll('button');
  assert.deepEqual(buttons.map(button=>button.textContent),['Buy outfit · 700 coins']);
  buttons[0].onclick();await new Promise(setImmediate);
  assert.equal(rendered.querySelectorAll('button')[0].disabled,false,'The saved outfit remains actionable after rerender');
  controls=storeControls(ninja);buttons=controls.querySelectorAll('button');
  assert.deepEqual(buttons.map(button=>button.textContent),['Wear complete outfit']);
  buttons[0].onclick();await new Promise(setImmediate);
  controls=storeControls(ninja);buttons=controls.querySelectorAll('button');
  assert.deepEqual(buttons.map(button=>button.textContent),['Remove outfit']);
  buttons[0].onclick();await new Promise(setImmediate);
  assert.deepEqual(state.cosmetics.equipped,{});
  assert.equal(state.coins,300);
  assert.deepEqual(operations.map(operation=>[operation.type,operation.id]),[['purchase','ninja-warrior'],['equip','ninja-warrior'],['unequip',undefined]]);
  assert.equal(operations.some(operation=>'slot' in operation),false);
  myClothingPanel(holder);assert.match(holder.textContent,/1 complete outfits/);
  state={ready:true,coins:1000,cosmetics:{...emptyCosmetics(),owned:['ninja-warrior.headwear','ninja-warrior.accessory']}};
  controls=storeControls(ninja);
  assert.equal(controls.querySelectorAll('button')[0].textContent,'Buy outfit · 500 coins');
  assert.match(controls.textContent,/Previous purchases credited · 200 coins/);
  assert.doesNotMatch(controls.textContent,/headwear|individual|Wear piece|Remove piece/i);
 }finally{
  for(const key of ['document','window'])if(previous[key]===undefined)delete globalThis[key];else globalThis[key]=previous[key];
 }
});

test('review menu lists owned outfits and previews a replacement without old cape pieces',async()=>{
 const previous=globalThis.document;globalThis.document={createElement:tag=>new Element(tag)};
 try{
  const vampire=setFor('vampire'),urban=setFor('urban-hero'),cosmetics={...own(vampire,urban),equipped:outfitSelection(vampire)};
  const requested=[],menu=Object.create(ClothingMenu.prototype);
  Object.assign(menu,{catalog,index:catalogIndex(catalog),mode:'owned',collection:'all',serial:0,busy:false,
   getGame:()=>({cosmetics,hero:{coins:1000}}),detail:new Element('section'),draw(){},
   runtime:{async loadOutfit(set){requested.push(set.id);return set.pieces.map(piece=>({id:piece.id}));}}});
  assert.deepEqual(menu.entries().map(set=>set.id),['urban-hero','vampire']);
  await menu.preview(urban);
  assert.deepEqual(requested,['urban-hero']);
  assert.deepEqual(menu.layers.map(piece=>piece.id),urban.pieces.map(piece=>piece.id));
  assert.equal(menu.layers.some(piece=>piece.id==='vampire.cape'),false);
  assert.deepEqual(menu.detail.querySelectorAll('button').map(button=>button.textContent),['Wear complete outfit']);
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
