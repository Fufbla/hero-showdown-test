import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {headContourMode,contourRowWidth,fitHeadAccessory,drawContouredHead,HEAD_CONTOUR_VERSION} from '../cosmetics/head-contour.mjs';
import {fitGameplayHeadwear} from '../cosmetics/headwear-2d.mjs';
import {fitClothingLayer} from '../cosmetics/fitting.mjs';
import {drawClothingPass} from '../cosmetics/renderer.mjs';
import {attachmentPoints} from '../cosmetics/template.mjs';
import {RETIRED_COSMETIC_IDS,historicalPiece} from '../cosmetics/outfit-policy.mjs';

const json=async file=>JSON.parse(await readFile(file,'utf8'));
const catalog=await json(new URL('../cosmetics/catalog.json',import.meta.url));
const retiredPieces=RETIRED_COSMETIC_IDS.map(id=>{
 const piece=historicalPiece(id);return {...piece,assetManifest:'./assets/'+piece.setId.replace('mrs.-claus','mrs-claus')+'/'+piece.category+'.json'};
});
const headPieces=retiredPieces.filter(piece=>piece.category==='headwear');
const facePieces=retiredPieces.filter(piece=>piece.category==='accessory');
const manifest=async piece=>json(new URL('../cosmetics/'+piece.assetManifest.slice(2),import.meta.url));
const pose={
 faceWidth:90,unitScale:.35,head:[0,-72],faceCenter:[5,-71],headTilt:.12,
 shoulder:[0,-52],hip:[0,-32],
 arms:[[[15,-52],[19,-36],[23,-22]],[[-15,-52],[-18,-36],[-23,-22]]],
 legs:[[[8,-32],[10,-18],[14,-3]],[[-8,-32],[-11,-17],[-14,-3]]]
};
function canvas(){
 const stack=[],numbers=[],calls=[];
 const ctx={numbers,calls,
  save(){stack.push(1)},restore(){assert.ok(stack.pop(),'unbalanced drawing stack')},
  translate(...v){numbers.push(...v)},rotate(v){numbers.push(v)},scale(...v){numbers.push(...v)},
  beginPath(){},rect(){},ellipse(){},clip(){},arc(){},moveTo(){},lineTo(){},closePath(){},
  drawImage(...args){calls.push(args);numbers.push(...args.slice(1))},
  balance(){assert.equal(stack.length,0,'all canvas transforms restored')}
 };
 return ctx;
}
test('archived hat and face-accessory contour data remains intact outside the active catalog',async()=>{
 assert.equal(HEAD_CONTOUR_VERSION,'2d-skull-jaw-wrapping-v1');
 assert.equal(headPieces.length,30);
 assert.equal(facePieces.length,5);
 assert.equal(catalog.sets.flatMap(set=>set.pieces).some(piece=>RETIRED_COSMETIC_IDS.includes(piece.id)),false);
 for(const piece of [...headPieces,...facePieces]){
  const m=await manifest(piece);
  const layer=m.layers.find(l=>l.view==='front');
  const mode=headContourMode(piece,layer);
  assert.ok(mode,piece.id+' is still a pasted-on rectangle');
  assert.equal(headContourMode(piece,m.layers.find(l=>l.view==='back')),null,'Do not add irrelevant side/back work');
  const before=JSON.stringify(m);
  for(const facing of [1,-1]){
   const base=fitClothingLayer(layer,pose,attachmentPoints(pose),layer.scale,piece);
   const hatFit=fitGameplayHeadwear(layer,base,piece,pose,facing);
   const fit=fitHeadAccessory(layer,hatFit,piece,pose,facing);
   const at=attachmentPoints(pose)[layer.attach].map((v,i)=>v+(layer.offset?.[i]||0)+(fit.offset?.[i]||0));
   const ctx=canvas();
   assert.equal(drawContouredHead(ctx,{},layer,at,fit,piece,pose),true);
   assert.ok(ctx.calls.length>=14,piece.id+' has not been contoured into strips');
   assert.ok(ctx.calls.every(call=>call.length===9&&call[7]>0&&call[8]>0));
   assert.ok(ctx.numbers.every(Number.isFinite),piece.id+' yielded nonfinite geometry');
   ctx.balance();
  }
  assert.equal(JSON.stringify(m),before,'Artwork must remain unchanged');
 }
});
test('ninja fabric wrap extends around skull and jaw scarf tapers below cheeks',async()=>{
 const hat=headPieces.find(p=>p.id==='ninja-warrior.headwear');
 const scarf=facePieces.find(p=>p.id==='ninja-warrior.accessory');
 const hatLayer=(await manifest(hat)).layers.find(l=>l.view==='front');
 const maskLayer=(await manifest(scarf)).layers.find(l=>l.view==='front');
 const baseHat=fitClothingLayer(hatLayer,pose,attachmentPoints(pose),hatLayer.scale,hat);
 const hatFit=fitGameplayHeadwear(hatLayer,baseHat,hat,pose,1);
 const hatWidth=hatLayer.rect[2]*hatLayer.scale*hatFit.width;
 assert.ok(hatWidth>pose.faceWidth*pose.unitScale*.95,'Old narrow forehead sticker is not acceptable');
 const baseMask=fitClothingLayer(maskLayer,pose,attachmentPoints(pose),maskLayer.scale,scarf);
 const maskFit=fitHeadAccessory(maskLayer,baseMask,scarf,pose,1);
 const maskWidth=maskLayer.rect[2]*maskLayer.scale*maskFit.width;
 const maskHeight=maskLayer.rect[3]*maskLayer.scale*maskFit.height;
 const maskTop=pose.faceCenter[1]+8-maskHeight/2;
 assert.ok(maskWidth>pose.faceWidth*pose.unitScale*.86,'Mask must span the cheeks');
 assert.ok(maskTop>=pose.faceCenter[1],'Eye area must remain uncovered by scarf');
 assert.ok(contourRowWidth('mask',.10)>contourRowWidth('mask',.9),'Lower scarf must taper at jaw');
 assert.ok(contourRowWidth('wrap',.5)>contourRowWidth('wrap',0),'Forehead wrap follows skull bulge');
 assert.equal(fitHeadAccessory(maskLayer,baseMask,scarf,pose,0),baseMask,'Only live 2D character affected');
});
test('animated left/right gameplay suppresses archived masks and hats without altering the hero',async()=>{
 const ids=['ninja-warrior.headwear','ninja-warrior.accessory','mystic-robe.headwear'];
 const pieces=ids.map(id=>retiredPieces.find(p=>p.id===id));
 const loaded=[];
 for(const p of pieces)loaded.push({id:p.id,category:p.category,manifest:await manifest(p),image:{}});
 for(const facing of [1,-1]){
  const moving={...pose,head:[2,-77],faceCenter:[7,-76],headTilt:facing*.25};
  const before=JSON.stringify(moving),ctx=canvas();
  for(const pass of ['behindHead','headwear','accessory'])
    drawClothingPass(ctx,moving,'front',pass,loaded,{gameFacing:facing});
  assert.equal(ctx.calls.length,0,'Archived headwraps and masks cannot be drawn');
  assert.equal(JSON.stringify(moving),before,'No physics or save mutation');
  ctx.balance();
 }
});
