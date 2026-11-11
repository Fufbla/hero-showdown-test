import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {HEADWEAR_2D,HEADWEAR_2D_VERSION,fitGameplayHeadwear} from '../cosmetics/headwear-2d.mjs';
import {fitClothingLayer} from '../cosmetics/fitting.mjs';
import {drawClothingPass} from '../cosmetics/renderer.mjs';
import {attachmentPoints} from '../cosmetics/template.mjs';
import {RETIRED_COSMETIC_IDS,historicalPiece} from '../cosmetics/outfit-policy.mjs';

const json=async url=>JSON.parse(await readFile(url,'utf8'));
const catalog=await json(new URL('../cosmetics/catalog.json',import.meta.url));
const headPieces=RETIRED_COSMETIC_IDS.filter(id=>id.endsWith('.headwear')).map(id=>{
 const piece=historicalPiece(id);return {...piece,assetManifest:'./assets/'+piece.setId.replace('mrs.-claus','mrs-claus')+'/headwear.json'};
});
const neutral={
 faceWidth:90,unitScale:.35,head:[0,-72],faceCenter:[1,-71],headTilt:.18,
 shoulder:[0,-52],hip:[0,-32],
 arms:[[[15,-52],[19,-36],[23,-22]],[[-15,-52],[-18,-36],[-23,-22]]],
 legs:[[[8,-32],[10,-18],[14,-3]],[[-8,-32],[-11,-17],[-14,-3]]]
};
const load=async part=>json(new URL('../cosmetics/'+part.assetManifest.slice(2),import.meta.url));

test('archived fitting metadata stays intact while all thirty hats leave the active catalog',async()=>{
 assert.equal(HEADWEAR_2D_VERSION,'phase-e-gameplay-headwear-v1');
 assert.equal(headPieces.length,30);
 assert.equal(catalog.sets.flatMap(set=>set.pieces).filter(piece=>piece.category==='headwear').length,0);
 assert.deepEqual(Object.keys(HEADWEAR_2D).sort(),headPieces.map(x=>x.id).sort());
 let adjusted=0;
 for(const piece of headPieces){
  const manifest=await load(piece);
  const layer=manifest.layers.find(l=>l.view==='front'&&l.part==='headwear');
  assert.ok(layer,piece.id+' missing live gameplay sprite');
  const before=JSON.stringify({piece,manifest});
  const base=fitClothingLayer(layer,neutral,attachmentPoints(neutral),layer.scale,piece);
  const profile=HEADWEAR_2D[piece.id];
  for(const facing of [-1,1]){
   const result=fitGameplayHeadwear(layer,base,piece,neutral,facing);
   const width=layer.rect[2]*layer.scale*result.width;
   assert.ok(width<=neutral.faceWidth*neutral.unitScale*profile.ratio+.05,piece.id+' exceeds 2D skull width limit');
   assert.ok(width>0,piece.id+' missing visible hat');
   const bottom=(layer.offset?.[1]||0)+result.offset[1]+(layer.rect[3]-layer.pivot[1])*layer.scale*result.height;
   assert.ok(Math.abs(bottom-profile.bottom)<.1,piece.id+' floats above or beneath the head');
   assert.ok(Number.isFinite(result.offset[0])&&Number.isFinite(result.offset[1]));
   assert.ok(result.height>0&&result.width>0);
   adjusted++;
  }
  assert.equal(fitGameplayHeadwear(manifest.layers.find(l=>l.view==='back'),base,piece,neutral,1),base,
    'unused back art must not be altered for '+piece.id);
  assert.equal(JSON.stringify({piece,manifest}),before,'No approved headwear artwork changes allowed');
 }
 assert.equal(adjusted,60);
});

test('matching left/right headwear is mirrored by the game once, never doubled',async()=>{
 const item=headPieces.find(x=>x.id==='ninja-warrior.headwear');
 const layer=(await load(item)).layers.find(x=>x.view==='front');
 const fit=fitClothingLayer(layer,neutral,attachmentPoints(neutral),layer.scale,item);
 const right=fitGameplayHeadwear(layer,fit,item,neutral,1);
 const left=fitGameplayHeadwear(layer,fit,item,neutral,-1);
 assert.equal(right.width,left.width);
 assert.equal(right.height,left.height);
 assert.equal(right.offset[1],left.offset[1]);
 assert.ok(right.width<=fit.width*1.35,'Only fitted headwrap fabric may expand to the temples');
 assert.equal(fitGameplayHeadwear(layer,fit,item,neutral,0),fit,'Only live horizontal facings should be tailored');
});

test('running and turning never draw a retired hat supplied by an older cached preview',async()=>{
 const item=headPieces.find(x=>x.id==='urban-hero.headwear');
 const m=await load(item);
 const layers=[{id:item.id,category:item.category,manifest:m,image:{}}];
 const samples=[neutral,{...neutral,head:[1,-75],faceCenter:[3,-74],headTilt:-.21,
  arms:[[[15,-52],[26,-34],[36,-23]],[[-15,-52],[-24,-37],[-31,-24]]]}];
 for(const pose of samples)for(const facing of [-1,1]){
  const calls=[];
  const ctx={save(){},restore(){},beginPath(){},clip(){},moveTo(){},lineTo(){},closePath(){},
   translate(...xs){calls.push(['translate',...xs]);},rotate(v){calls.push(['rotate',v]);},
   scale(...xs){calls.push(['scale',...xs]);},drawImage(){calls.push(['image']);}};
  const before=JSON.stringify(pose);
  drawClothingPass(ctx,pose,'front','headwear',layers,{gameFacing:facing});
  assert.deepEqual(calls,[],'Retired headwear must never enter live rendering');
  assert.equal(JSON.stringify(pose),before,'No changes to physics or hero data');
 }
});
test('fitting room previews the real two-direction walking sprite',async()=>{
 const text=await readFile(new URL('../clothing-tryon.mjs',import.meta.url),'utf8');
 assert.ok(text.includes("view:'game'"));
 assert.ok(text.includes("['walk','Walking']"));
 assert.ok(text.includes("[-1,'Moving left']"));
 assert.ok(text.includes("[1,'Moving right']"));
 assert.ok(!text.includes("['front','right','back','left']"));
});
