import test from 'node:test';
import assert from 'node:assert/strict';
import {flightPose} from '../../royale/flight-pose.mjs';
import {engine,createCanvas,hero,examples,factory,imageLoader,jsonLoader} from '../../royale-v3-staging/starter-suit/tests/helpers.mjs';
import {OutfitEngine,STEEL_ID} from '../../royale-v3-staging/kingjames/outfit-engine.mjs';
import {APPROVED_OUTFITS} from '../../royale-v3-staging/kingjames/outfit-catalog.mjs';
import {CostumeEngine} from '../../royale/fashion/engine.mjs';
import {COLLECTION} from '../../royale-v3-staging/costumes/catalog.mjs?fashion-base=1';
import {FASHION_OUTFITS} from '../../royale/fashion/definitions.mjs';
const starter=await engine(),options={canvasFactory:factory,imageLoader,jsonLoader};
const flying=(face=1)=>hero({face,grounded:false,flying:true,jumps:2,vx:face*200});
function bounds(canvas){const {data}=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);let x0=canvas.width,y0=canvas.height,x1=0,y1=0;for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(data[(y*canvas.width+x)*4+3]>64){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}return {x0,y0,x1,y1,w:x1-x0,h:y1-y0};}
test('ordinary flight uses a stable complete forward pose, keeps the head upright and preserves inputs',()=>{
 for(const look of examples)for(const face of [-1,1])for(const vx of [0,face*250]){
  const h=Object.freeze({...flying(face),vx}),before=JSON.stringify([look,h]),c=createCanvas(400,300),ctx=c.getContext('2d');
  const pose=starter.draw(ctx,200,220,look,h,1);assert.equal(pose.clip,'fly');assert.equal(starter.lastFrame.frame,11);
  const b=bounds(c);assert(b.w>b.h,'flight silhouette is horizontal');assert(b.x0>0&&b.y0>0&&b.x1<400&&b.y1<300,'no clipping');
  assert(Math.abs(starter.lastFrame.head[2])<.1,'head looks ahead');assert.deepEqual(pose.head,[35*.62,(starter.lastFrame.head[1]-230)*.62]);
  assert.deepEqual(ctx.getTransform(),createCanvas(1,1).getContext('2d').getTransform());assert.equal(JSON.stringify([look,h]),before);
  starter.drawEcho(ctx,190,220,starter.lastPaint);assert.equal(JSON.stringify([look,h]),before);
 }
 const c=createCanvas(400,300),h=hero({grounded:false,vy:200,jumps:2});assert.equal(starter.draw(c.getContext('2d'),200,220,examples[0],h,1).clip,'fall');
});
test('all fashion and approved outfit bodies share forward flight without replacing customization',async()=>{
 const fashion=new CostumeEngine(options),approved=new OutfitEngine(options);approved.enabled=true;
 for(const [renderer,outfits]of [[fashion,FASHION_OUTFITS],[approved,APPROVED_OUTFITS]])for(const {id}of outfits){
  assert(await renderer.preload(id),id+': '+renderer.error);if(renderer===approved)renderer.selected=()=>id;
  for(const face of [-1,1]){
   const look=Object.freeze({...examples[2]}),h=Object.freeze(flying(face)),before=JSON.stringify([look,h]),c=createCanvas(400,300);
   const pose=renderer.draw(c.getContext('2d'),200,220,look,h,1,{id});assert.equal(pose.clip,'fly',id);
   assert.equal(renderer.lastFrame.outfit,id);assert.equal(renderer.lastFrame.direction,face);assert(Math.abs(renderer.lastFrame.head[2])<.1,id+' head');
   const b=bounds(c);assert(b.w>0&&b.h>0&&b.x0>0&&b.x1<400&&b.y0>0&&b.y1<300,id+' visible and unclipped');assert.equal(JSON.stringify([look,h]),before);
  }
 }
});
test('Steel keeps its original authored flight and ordinary ground poses are never tilted',async()=>{
 const e=new OutfitEngine(options);e.enabled=true;e.selected=()=> 'kingjames-original';assert(await e.preload());assert(await e.preload(STEEL_ID));
 const h={...flying(),steel:true,v2Active:{flight:{age:1},steel:{age:1}}},c=createCanvas(400,300);e.draw(c.getContext('2d'),200,220,examples[0],h,1);
 assert.equal(e.lastFrame.outfit,STEEL_ID);assert.equal(e.lastFrame.state,'fly');assert.equal(e.lastPaint.flight,null);
 const m=starter.manifest,f=m.frames[11];for(const h of [hero(),{...flying(),dead:true},{...flying(),stun:1},{...flying(),steel:true}])assert.equal(flightPose(h,m,f),null);
});

test('original costumes fly forward in both directions and restore their ordinary pose afterward',async()=>{
 const e=new CostumeEngine(options);
 for(const {id,hideHair}of COLLECTION.filter(o=>o.renderer!=='approved')){
  assert(await e.preload(id),id+': '+e.error);
  for(const face of [-1,1]){
   const look=Object.freeze({...examples[0]}),h=Object.freeze(flying(face)),before=JSON.stringify([look,h]);
   const c=createCanvas(400,300),ctx=c.getContext('2d'),pose=e.draw(ctx,200,220,look,h,1,{id});
   assert.equal(pose.clip,'fly');assert.equal(e.lastFrame.outfit,id);assert.equal(e.lastFrame.direction,face);
   const b=bounds(c);assert(b.w>b.h,id+' horizontal silhouette');assert(b.x0>0&&b.y0>0&&b.x1<400&&b.y1<300,id+' unclipped');
   assert.equal(JSON.stringify([look,h]),before);assert.deepEqual(ctx.getTransform(),createCanvas(1,1).getContext('2d').getTransform());
   assert.equal(e.draw(ctx,200,220,look,hero({face}),2,{id}).clip,'idle');
  }
 }
});
