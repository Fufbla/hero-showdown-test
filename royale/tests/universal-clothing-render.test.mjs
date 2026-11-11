import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
import {prepareStyleCMaterials} from '../style-c-materials.mjs';
import {drawHero} from '../style-c-hero.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';
import {motionFrameSample,STYLE_C_MOTIONS} from '../style-c-motion.mjs';
import {clothingCoverage} from '../cosmetics/renderer.mjs';
import {ClothingRuntime} from '../cosmetics/runtime.mjs';
import {ClothingAssets} from '../cosmetics/assets.mjs';
import {Game} from '../core.mjs';
import {drawOutfitPreview} from '../cosmetics/preview.mjs';
import {outfitSelection} from '../cosmetics/state.mjs';
const canvas=createCanvas(360,430),c=canvas.getContext('2d');
assert(await prepareStyleCMaterials({canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u))}));
const atlas=await loadImage(fileURLToPath(new URL('../cosmetics/assets/royal-kimono/atlas.png',import.meta.url)));
const layers=['fullbody','footwear'].map(part=>({id:'royal-kimono.'+part,category:part,manifest:JSON.parse(fs.readFileSync(new URL('../cosmetics/assets/royal-kimono/'+part+'.json',import.meta.url))),image:atlas}));
const parts=p=>({head:p.head,shoulder:p.shoulder,hip:p.hip,arms:p.arms,legs:p.legs});
test('clothing preserves each hero presentation and body geometry in every animation key',()=>{
 let frames=0;
 for(const [motion,clip] of Object.entries(STYLE_C_MOTIONS))for(let key=0;key<clip.frames.length;key++)for(const view of ['front','right','back','left']){
  const {hero,time,options}=motionFrameSample(motion,key);
  for(const [sex,shape] of [['male',{}],['female',{}],['male',{build:'full',height:1.12,arms:.85,legs:1.15,shoulders:1.2,torso:.85}],['female',{build:'slender',height:.88,arms:1.15,legs:.85,hips:1.15,chest:1.15,age:'teen'}]]){
   const look={...styleCDefault(sex),...shape,cape:false},before=JSON.stringify({look,hero});
   const baseline=drawHero(c,160,385,look,hero,time,2,{...options,view});
   c.clearRect(0,0,360,430);const p=drawHero(c,160,385,look,hero,time,2,{...options,view,clothing:layers});
   assert.deepEqual(parts(p),parts(baseline),`${motion}/${key}/${view}/${sex}`);
   assert.equal(JSON.stringify({look,hero}),before);assert(c.getImageData(0,0,360,430).data.some((v,i)=>i%4===3&&v>0));frames++;
  }
 }
 console.log(`${frames} real-renderer frames: preserved hero geometry, finite rendering and immutable hero state.`);
});
test('unloaded clothing never hides armor; body and footwear conceal independently',()=>{
 assert.equal(clothingCoverage(layers.map(l=>({...l,image:null}))).size,0);
 assert(clothingCoverage(layers.slice(0,1)).has('torso'));assert(!clothingCoverage(layers.slice(0,1)).has('feet'));
 assert(clothingCoverage(layers.slice(1)).has('feet'));assert(!clothingCoverage(layers.slice(1)).has('torso'));
});
test('lazy selections deduplicate per-frame loads, retain armor on failure and retry explicitly',async()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../cosmetics/catalog.json',import.meta.url)));data.sets[0].availability='released';let reads=0,images=0,fail=true;
 const runtime=new ClothingRuntime({readJSON:async path=>{reads++;return path==='./catalog.json'?data:layers[path.endsWith('/footwear.json')?1:0].manifest;},assets:new ClothingAssets({loadImage:async()=>{images++;if(fail)throw Error('offline');return atlas;}})});
 const state={visible:true,equipped:outfitSelection(data.sets[0])};
 for(let i=0;i<100;i++)assert.deepEqual(runtime.layers(state),[]);
 await assert.rejects(runtime.loadIds(Object.values(state.equipped)),/offline/);
 for(let i=0;i<100;i++)assert.deepEqual(runtime.layers(state),[]);
 assert.equal(images,1);assert.equal(reads,3);fail=false;
 await runtime.loadIds(Object.values(state.equipped),{retry:true});assert.equal(runtime.layers(state).length,2);assert.deepEqual(runtime.layers({...state,visible:false}),[]);
 runtime.limit=2;
 for(const set of data.sets.slice(1,4))await runtime.loadOutfit(set);
 assert(runtime.selections.size<=2,'loaded selections must respect the cache bound');
});
test('visual outfit contains compact cosmetics for each player without changing armor or saving decoded assets',()=>{
 const a=new Game(),b=new Game(),before=structuredClone(a.inventory);
 a.cosmetics={version:1,revision:3,owned:['royal-kimono.fullbody','royal-kimono.footwear'],equipped:{fullbody:'royal-kimono.fullbody',footwear:'royal-kimono.footwear'},visible:true};
 assert.equal(a.visualOutfit().cosmetics.equipped.fullbody,'royal-kimono.fullbody');assert.deepEqual(b.visualOutfit().cosmetics.equipped,{});
 assert(!('owned' in a.visualOutfit().cosmetics));assert.deepEqual(a.inventory,before);
 a.cosmetics={...a.cosmetics,visible:false,revision:4};assert.equal(a.visualOutfit().cosmetics.visible,false);
 assert(!a.save().includes('atlas.png'));
});

test('complete preview replaces a previous cape outfit and never mutates the hero look',async()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../cosmetics/catalog.json',import.meta.url)));
 const runtime=new ClothingRuntime({
  readJSON:async path=>JSON.parse(fs.readFileSync(new URL('../cosmetics/'+path.replace(/^\.\//,''),import.meta.url))),
  assets:new ClothingAssets({loadImage:url=>loadImage(fileURLToPath(url))})
 });
 const vampire=await runtime.loadOutfit(data.sets.find(set=>set.id==='vampire'),{review:true});
 const urban=await runtime.loadOutfit(data.sets.find(set=>set.id==='urban-hero'),{review:true});
 const reused=createCanvas(360,240),fresh=createCanvas(360,240),look={...styleCDefault('male'),cape:true};
 const saved=structuredClone(look);
 drawOutfitPreview(reused,{look,layers:vampire});
 drawOutfitPreview(reused,{look,layers:urban});
 drawOutfitPreview(fresh,{look,layers:urban});
 assert.deepEqual(reused.getContext('2d').getImageData(0,0,360,240).data,fresh.getContext('2d').getImageData(0,0,360,240).data);
 assert.deepEqual(look,saved);
 assert.equal(urban.some(piece=>piece.category==='cape'||piece.category==='headwear'),false);
});
