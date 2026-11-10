import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {POLISH_VERSION,joinOverlap,jointClipShift,contactGeometry,garmentLight,drawContactShadow} from '../cosmetics/polish.mjs';
import {fabricColorsFromPixels,garmentLining,FABRIC_TONE_VERSION} from '../cosmetics/fabric-tone.mjs';
import {drawClothingPass} from '../cosmetics/renderer.mjs';
import {attachmentPoints,PASSES,VIEWS} from '../cosmetics/template.mjs';

const load=async url=>JSON.parse(await readFile(url,'utf8'));
const catalog=await load(new URL('../cosmetics/catalog.json',import.meta.url));
const pose={
 head:[0,-78],shoulder:[0,-52],hip:[0,-32],headTilt:.12,
 arms:[[[15,-52],[19,-36],[23,-22]],[[-15,-52],[-18,-36],[-23,-22]]],
 legs:[[[8,-32],[10,-18],[14,-3]],[[-8,-32],[-11,-17],[-14,-3]]]
};
function ctxMock(){
 const states=[],values=[],counts={draws:0,shadows:0,gradients:0,filters:0};
 return {counts,values,filter:'none',
  save(){states.push(this.filter);},
  restore(){assert.ok(states.length,'unbalanced canvas restore');this.filter=states.pop();},
  translate(...args){values.push(...args);},scale(...args){values.push(...args);},
  rotate(...args){values.push(...args);},transform(...args){values.push(...args);},
  rect(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){},arc(){},
  ellipse(){},fill(){counts.shadows++;},createRadialGradient(){
   counts.gradients++;return {addColorStop(offset,color){
    assert.ok(offset>=0&&offset<=1);
    assert.match(color,/^rgba\(/);
   }};
  },drawImage(...args){counts.draws++;values.push(...args.slice(1));},
  balance(){assert.equal(states.length,0,'canvas save/restore must always balance');},
 };
}

test('joint seams overlap with equal and opposite clips instead of transparent gaps',()=>{
 assert.equal(POLISH_VERSION,'garment-seam-polish-v1');
 const l={rect:[15,60,70,181]};
 const n=joinOverlap(l);
 assert.ok(n>.8&&n<=1.8);
 assert.equal(jointClipShift(l,'upper'),-jointClipShift(l,'lower'));
 assert.ok(jointClipShift(l,'upper')>0);
});
test('contact shadow and directional light are subtle, only where clothing meets body',()=>{
 const anchors=attachmentPoints(pose);
 const head={part:'headwear',rect:[0,0,120,66]};
 const boot={part:'footNear',rect:[0,0,99,120]};
 const h=contactGeometry(head,anchors,anchors.head,{width:.92},{category:'headwear'});
 const b=contactGeometry(boot,anchors,anchors.ankleNear,{width:.89},{category:'footwear'});
 assert.ok(h&&h.rx>0&&h.ry<5&&h.alpha<.2);
 assert.ok(b&&b.alpha<.2);
 assert.equal(contactGeometry({part:'accessory'},anchors,anchors.head,{width:1}),null);
 assert.ok(garmentLight('back','nearArm',head)<garmentLight('front','nearArm',head));
 assert.ok(garmentLight('front','farArm',head)<garmentLight('front','nearArm',head));
 const c=ctxMock();
 drawContactShadow(c,head,anchors,anchors.head,{width:.92},{category:'headwear'});
 c.balance();assert.equal(c.counts.gradients,1);
 assert.equal(c.counts.shadows,1);
});
test('fabric swatch comes only from opaque approved artwork; transparent fallback is safe',()=>{
 assert.equal(FABRIC_TONE_VERSION,'approved-atlas-contact-lining-v1');
 const data=new Uint8ClampedArray(4*64);
 for(let i=0;i<64;i++){
  const j=i*4;data[j]=90;data[j+1]=40;data[j+2]=120;data[j+3]=255;
 }
 const tone=fabricColorsFromPixels(data);
 assert.match(tone.suit,/^#[\da-f]{6}$/);
 assert.match(tone.trim,/^#[\da-f]{6}$/);
 assert.notEqual(tone.suit,'#292c32');
 assert.equal(fabricColorsFromPixels(new Uint8ClampedArray(4*64)),null);
 const fallback={suit:'#303030'};
 const piece={id:'test.top',image:{},manifest:{layers:[]}};
 assert.equal(garmentLining(piece,'torso',fallback),fallback);
});
test('all 153 pieces render polished across four views without changing saves or atlas data',async()=>{
 assert.equal(catalog.sets.length,36);
 const pieces=catalog.sets.flatMap(s=>s.pieces);
 assert.equal(pieces.length,153);
 const layers=[];
 for(const piece of pieces){
  const manifest=await load(new URL('../cosmetics/'+piece.assetManifest.slice(2),import.meta.url));
  layers.push({id:piece.id,category:piece.category,manifest,image:{}});
 }
 const original=JSON.stringify({pose,layers:layers.map(x=>({id:x.id,manifest:x.manifest}))});
 const ctx=ctxMock();
 for(const view of VIEWS)for(const pass of PASSES)drawClothingPass(ctx,pose,view,pass,layers);
 ctx.balance();
 assert.ok(ctx.counts.draws>300,'all collections should remain drawable');
 assert.ok(ctx.counts.gradients>=15,'clothing must receive local seam shading');
 assert.ok(ctx.counts.shadows>=15,'clothing contact shadows must be rendered');
 assert.ok(ctx.values.every(Number.isFinite),'all canvas transforms must stay finite');
 assert.equal(JSON.stringify({pose,layers:layers.map(x=>({id:x.id,manifest:x.manifest}))}),original);
});
