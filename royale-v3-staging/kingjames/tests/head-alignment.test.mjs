import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {OutfitEngine,OUTFITS,STEEL_ID} from '../outfit-engine.mjs';
import {styleCDefault} from '../../../royale/style-c-defaults.mjs';
import {HAIR_STYLES} from '../../../royale/appearance.mjs';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
const engine=new OutfitEngine({canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u)),jsonLoader:async u=>JSON.parse(await readFile(u))});
await engine.head.preload();
const looks=['male','female'].flatMap(presentation=>['oval','round','angular'].map(face=>({...styleCDefault(presentation),face,hair:'none',facialHair:'none'})));
test('all complete-frame outfits attach the opaque chin to the neck in every animation',async()=>{
 let checked=0;const body=createCanvas(256,256),head=createCanvas(256,256),bc=body.getContext('2d'),hc=head.getContext('2d');
 for(const id of Object.keys(OUTFITS).filter(id=>id!==STEEL_ID)){
  assert(await engine.preload(id),engine.error);const {manifest:m,atlases}=engine.outfits.get(id);
  for(const [index,f]of m.frames.entries()){
   bc.clearRect(0,0,256,256);bc.drawImage(atlases[f.atlas||'default'],...f.rect,0,0,...m.cell);const b=bc.getImageData(0,0,256,256).data;
   for(const look of looks){
    hc.clearRect(0,0,256,256);engine.head.draw(hc,look,f.head,m.head.scale);const h=hc.getImageData(0,0,256,256).data;let touching=0;
    for(let y=Math.max(0,Math.floor(f.head[1]-8));y<=Math.min(255,Math.ceil(f.head[1]+8));y++)for(let x=Math.max(0,Math.floor(f.head[0]-8));x<=Math.min(255,Math.ceil(f.head[0]+8));x++){
     const i=(y*256+x)*4;if(b[i+3]>=128&&h[i+3]>=128)touching++;
    }
    assert(touching>=2,`${id} frame ${index}: detached ${look.presentation} ${look.face} chin (${touching} pixels touching)`);checked++;
   }
  }
 }
 console.log(checked+' frame/face combinations have actual opaque head-to-body contact');
});
test('hair, beards and expressions do not move or resize the head attachment',()=>{
 for(const base of looks){const original=engine.head.plate(base),before=JSON.stringify(base);
  for(const hair of HAIR_STYLES)for(const facialHair of ['none','beard']){
   const plate=engine.head.plate({...base,hair,facialHair},true);
   assert.deepEqual(plate.origin,original.origin);assert.equal(plate.image.width,256);assert.equal(plate.image.height,256);
  }
  assert.equal(JSON.stringify(base),before);
 }
});
