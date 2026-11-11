import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateAsset} from '../cosmetics/assets.mjs';
import {clothingCoverage,drawClothingPass} from '../cosmetics/renderer.mjs';

const parts=['headwear','top','bottom','footwear','accessory'];
const load=async part=>JSON.parse(await readFile(new URL('../cosmetics/assets/ninja-warrior/'+part+'.json',import.meta.url),'utf8'));

test('Ninja Warrior fitting profiles are valid and complete in all four views',async()=>{
 for(const part of parts){
  const manifest=await load(part);
  assert.deepEqual(validateAsset(manifest),[],part+' has invalid painted-bone anchors');
  assert.deepEqual([...new Set(manifest.layers.map(x=>x.view))].sort(),['back','front','left','right'],part+' missing a side');
  assert.ok(manifest.layers.every(l=>l.fit&&Number.isFinite(l.fit.width)),part+' missing measured fit');
 }
 const top=await load('top'),boot=await load('footwear'),hat=await load('headwear');
 assert.ok(top.layers.filter(l=>l.part==='torso').every(l=>l.fit.width>1.25),'torso must follow hero shoulders');
 assert.ok(top.layers.filter(l=>l.part!=='torso').every(l=>l.fit.width>1),'sleeves must follow animated arms');
 assert.ok(boot.layers.every(l=>l.fit.width<1),'boots must not dwarf ankles');
 assert.ok(hat.layers.every(l=>l.fit.width<1),'headwear must fit the character skull');
});

test('only fully loaded garments hide armor, never saved armor or gear',async()=>{
 const top=await load('top');
 const loaded=[{manifest:top,image:{}}];
 assert.equal(clothingCoverage([{manifest:top,image:null}]).size,0);
 const before=JSON.stringify(loaded);
 const covered=clothingCoverage(loaded);
 for(const region of ['torso','arms','gloves','belt','emblem'])assert.ok(covered.has(region),region);
 assert.equal(JSON.stringify(loaded),before,'coverage must be render-only');
});

test('fitted Ninja artwork follows animated bone anchors on all four sides',async()=>{
 const manifests=await Promise.all(parts.map(load));
 const layers=manifests.map((manifest,i)=>({id:'ninja-warrior.'+parts[i],manifest,image:{}}));
 const counts={draw:0,scale:0,clip:0};
 const context={
  save(){},restore(){},translate(){},rotate(){},transform(){},
  scale(x,y){assert.ok(Number.isFinite(x)&&Number.isFinite(y));counts.scale++;},
  beginPath(){},rect(){},moveTo(){},lineTo(){},closePath(){},ellipse(){},
  clip(){counts.clip++;},drawImage(){counts.draw++;}
 };
 const pose={
  head:[0,-75],shoulder:[0,-52],hip:[0,-35],
  arms:[[[15,-52],[18,-36],[25,-23]],[[-15,-52],[-19,-34],[-24,-22]]],
  legs:[[[8,-35],[14,-20],[16,-4]],[[-8,-35],[-14,-19],[-17,-4]]]
 };
 const poseBefore=JSON.stringify(pose);
 for(const view of ['front','right','back','left'])
  for(const pass of ['behindBody','farLeg','nearLeg','torso','farArm','nearArm','overBody','behindHead','headwear','accessory'])
   drawClothingPass(context,pose,view,pass,layers);
 assert.ok(counts.draw>30,'must draw the body garment segments across all four views');
 assert.ok(counts.scale>30,'must apply body garment fit transforms');
 assert.ok(counts.clip>0,'must joint-split sleeves and pants');
 assert.equal(JSON.stringify(pose),poseBefore,'rendering must never mutate the hero pose');
});
