import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {BossArt} from '../art.mjs';
import {BOSS_IDS,REGIONAL_IDS} from '../model.mjs';
import {makeBoss} from '../../../royale/bosses.mjs';
import {makeLegendary} from '../../../royale/legendary-bosses.mjs';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
const manifest=JSON.parse(readFileSync(new URL('../assets/manifest.json',import.meta.url)));
const engine=new BossArt({manifest,loadImages:true,spriteImageLoader:u=>loadImage(fileURLToPath(u)),spriteCanvasFactory:createCanvas});
const hash=data=>createHash('sha256').update(data).digest('hex');
test('all 15 production atlases have complete transparent, distinct frames and valid crops',async()=>{
 assert.deepEqual(Object.keys(manifest.bosses).sort(),[...BOSS_IDS].sort());
 for(const id of BOSS_IDS){
  const p=manifest.bosses[id];assert.equal(p.frames.length,16,id);assert(p.referenceHeight>40,id);assert(await engine.prepare(id),engine.errors.join(';'));
  const im=engine.cache.get(id).image,canvas=createCanvas(p.width,p.height),c=canvas.getContext('2d');c.drawImage(im,0,0);const pixels=c.getImageData(0,0,p.width,p.height).data;
  let transparent=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]===0)transparent++;
  assert(transparent>p.width*p.height*.2,`${id} lacks transparent background`);
  const unique=new Set();
  for(const [n,f]of p.frames.entries()){
   const [x,y,w,h]=f.crop,anchor=f.anchor||p.anchor;assert(x>=0&&y>=0&&w>10&&h>10&&x+w<=p.width&&y+h<=p.height,`${id}:${n} crop`);
   assert(anchor?.every(Number.isFinite),`${id}:${n} anchor`);assert(anchor[0]>=0&&anchor[0]<=w&&anchor[1]>=0&&anchor[1]<=h,`${id}:${n} foot anchor outside crop`);
   const rgba=c.getImageData(x,y,w,h).data;let opaque=0;for(let i=3;i<rgba.length;i+=4)if(rgba[i]>100)opaque++;
   assert(opaque>250,`${id}:${n} empty frame`);unique.add(hash(rgba));
  }
  assert.equal(unique.size,16,`${id} duplicates frames`);assert(engine.cache.size<=3,'Unbounded atlas cache');
 }
});
test('all boss frames render in both directions without changing combat or canvas state',async()=>{
 for(const id of BOSS_IDS){
  const b=id.startsWith('legendary-')?makeLegendary(id.slice(10),{}):makeBoss(REGIONAL_IDS.indexOf(id.slice(9))+1,{});b.x=400;b.prevX=400;b.y=400;b.prevY=400;
  await engine.prepare(id);
  for(const face of [-1,1])for(const state of ['idle','windup','active','recover','dead'])for(const shape of ['melee','projectile','ground']){
   Object.assign(b,{face,state,age:state==='active'?.3:.05,attack:{shape,warning:1,duration:.4,recovery:1,fired:true}});
   const original=structuredClone(b);engine.step(b,10,0,b.x);const c=createCanvas(800,600).getContext('2d');engine.draw(c,b,{time:10,alpha:1});
   assert.deepEqual(b,original);assert.equal(c.globalAlpha,1);assert.deepEqual([c.getTransform().a,c.getTransform().d,c.getTransform().e,c.getTransform().f],[1,1,0,0]);
   assert(c.getImageData(0,0,800,600).data.some((v,i)=>i%4===3&&v>0),`${id} ${state} ${shape} ${face} invisible`);
  }
 }
});
