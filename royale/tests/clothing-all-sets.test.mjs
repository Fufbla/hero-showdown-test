import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateAsset} from '../cosmetics/assets.mjs';
import {attachmentPoints,PASSES,VIEWS} from '../cosmetics/template.mjs';
import {fitClothingLayer,FITTING_VERSION} from '../cosmetics/fitting.mjs';
import {drawClothingPass} from '../cosmetics/renderer.mjs';

const json=async url=>JSON.parse(await readFile(url,'utf8'));
const catalog=await json(new URL('../cosmetics/catalog.json',import.meta.url));
const poses=[
 {head:[0,-78],shoulder:[0,-52],hip:[0,-32],headTilt:0,
  arms:[[[15,-52],[19,-36],[23,-22]],[[-15,-52],[-18,-36],[-23,-22]]],
  legs:[[[8,-32],[10,-18],[14,-3]],[[-8,-32],[-11,-17],[-14,-3]]]},
 {head:[-1,-78],shoulder:[1,-53],hip:[2,-33],headTilt:.21,
  arms:[[[15,-52],[26,-33],[36,-20]],[[-15,-52],[-23,-41],[-33,-24]]],
  legs:[[[9,-33],[24,-20],[30,-4]],[[-8,-33],[-18,-20],[-11,-4]]]},
 {head:[0,-78],shoulder:[1,-52],hip:[2,-32],headTilt:-.13,
  arms:[[[15,-51],[23,-37],[33,-26]],[[-15,-53],[-25,-45],[-39,-44]]],
  legs:[[[9,-32],[22,-26],[41,-22]],[[-8,-32],[-17,-15],[-10,-4]]]}
];

function fakeCanvas(){
 const numbers=[];
 const ctx={save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){},rect(){},ellipse(){},
  translate(...args){numbers.push(...args);},rotate(...args){numbers.push(...args);},
  transform(...args){numbers.push(...args);},scale(...args){numbers.push(...args);},
  drawImage(...args){numbers.push(...args.slice(1));this.draws++},draws:0};
 return {ctx,numbers};
}

test('all 36 wardrobe sets and 153 manifests use the shared four-view fitting engine',async()=>{
 assert.equal(FITTING_VERSION,'all-outfits-body-fit-v1');
 assert.equal(catalog.sets.length,36);
 const pieces=catalog.sets.flatMap(s=>s.pieces);
 assert.equal(pieces.length,153);
 const unique=new Set(pieces.map(x=>x.id));
 assert.equal(unique.size,153,'All pieces must remain individually addressable');
 const manifests=[];
 for(const piece of pieces){
  const location=piece.assetManifest.replace(/^\.\//,'');
  const manifest=await json(new URL('../cosmetics/'+location,import.meta.url));
  assert.deepEqual(validateAsset(manifest),[],piece.id+' has invalid artwork binding');
  assert.deepEqual([...new Set(manifest.layers.map(l=>l.view))].sort(),VIEWS.slice().sort(),piece.id+' directions missing');
  manifests.push({id:piece.id,manifest,image:{}});
 }
 const anchor=attachmentPoints(poses[0]);
 let fittings=0;
 for(const {manifest} of manifests)
  for(const layer of manifest.layers){
    const end=layer.end&&anchor[layer.end.attach];
    const from=anchor[layer.attach];
    const length=end&&from?Math.hypot(end[0]-from[0],end[1]-from[1]):0;
    const source=layer.end?Math.hypot(layer.end.pivot[0]-layer.pivot[0],layer.end.pivot[1]-layer.pivot[1]):0;
    const scale=layer.end&&length&&source?length/source:layer.scale;
    const fit=fitClothingLayer(layer,poses[0],anchor,scale);
    assert.ok(Number.isFinite(fit.width)&&fit.width>=.55&&fit.width<=2,piece.id);
    assert.ok(Number.isFinite(fit.height)&&fit.height>0,piece.id);
    assert.ok(fit.offset.length===2&&fit.offset.every(Number.isFinite),piece.id);
    fittings++;
  }
 assert.ok(fittings>=1400,'Check every painted view and animated segment');
 for(const pose of poses){
  const before=JSON.stringify(pose);
  const {ctx,numbers}=fakeCanvas();
  for(const view of VIEWS)
    for(const pass of PASSES)
      drawClothingPass(ctx,pose,view,pass,manifests);
  assert.ok(ctx.draws>100,'All collections must render, including pose transitions');
  assert.ok(numbers.every(Number.isFinite),'No NaNs or invalid canvas coordinates');
  assert.equal(JSON.stringify(pose),before,'Fitting must never mutate hero pose');
 }
});
