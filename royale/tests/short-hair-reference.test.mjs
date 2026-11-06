import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
import {prepareStyleCMaterials} from '../style-c-materials.mjs';
import {drawHero} from '../style-c-hero.mjs';
import {drawStyleCFace} from '../style-c-face.mjs';
import {drawStyleCHair,styleCHairStatus} from '../style-c-hair.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';
import {previewHero} from '../hero-rig.mjs';
import {styleCOutfit} from './style-c-scenes.mjs';
import {originalFaceBaseline} from './original-face-baseline.mjs';
let allocations=0;
const setup={canvasFactory:(w,h)=>{allocations++;return createCanvas(w,h);},imageLoader:u=>loadImage(fileURLToPath(u))};
await prepareStyleCMaterials(setup);
const before=await originalFaceBaseline({...setup,canvasFactory:createCanvas},'2a435a65444935e8b3524b008932a4ff8f4dc744');after(()=>before.close());
const data=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
const hash=p=>createHash('sha256').update(p).digest('hex');
function localHair(renderer,look,view='front',time=0){const c=createCanvas(400,400),ctx=c.getContext('2d');ctx.translate(200,220);ctx.scale(4,4);renderer(ctx,look,{wind:2,bounce:1},time,'front',view);return c;}
test('short cut changes all authored directions while retaining distinct profiles and back',()=>{
 for(const sex of ['male','female']){
  const look={...styleCDefault(sex),hair:'buzz'},hashes=[];
  for(const view of ['front','right','back']){const now=hash(data(localHair(drawStyleCHair,look,view)));hashes.push(now);assert.notEqual(now,hash(data(localHair(before.drawStyleCHair,look,view))));}
  assert.equal(new Set(hashes).size,3);
  assert.equal(hash(data(localHair(drawStyleCHair,look,'right'))),hash(data(localHair(drawStyleCHair,look,'left'))),'left uses the same registered profile before whole-character mirroring');
 }
});
test('far temple touches the original face instead of hanging outside the skull',()=>{
 for(const sex of ['male','female'])for(const jaw of [.85,1,1.15]){
  const look={...styleCDefault(sex),hair:'buzz',jaw},hair=data(localHair(drawStyleCHair,look));
  const c=createCanvas(400,400),ctx=c.getContext('2d');ctx.translate(200,220);ctx.scale(4,4);drawStyleCFace(ctx,look,{center:[0,0],scale:1/(sex==='male'?2.55:2.5),mode:'head'});const face=data(c);
  for(const y of [-15,-12,-9]){let overlap=0;for(let x=220;x<300;x++){const i=((220+y*4)*400+x)*4+3;if(hair[i]>80&&face[i]>80)overlap++;}assert.ok(overlap>=2,`${sex}/jaw${jaw}/y${y}: far temple must meet the face`);}
 }
});
test('the illustrated forehead opening has a curve and a shallow central dip',()=>{
 const look={...styleCDefault('female'),hair:'buzz'},pixels=data(localHair(drawStyleCHair,look));
 const edge=x=>{let last=-55;for(let y=20;y<200;y++)if(pixels[(y*400+200+x*4)*4+3]>160)last=(y-220)/4;return last;};
 assert.ok(edge(-15)>edge(-5)+3,'hairline rises from the near temple');
 assert.ok(edge(5)>edge(0)+.5,'shallow central dip remains visible');
});
test('head anchors, bodies, equipment and appearance records remain unchanged through animation',()=>{
 const poses=['idle','walk','run','jump','double-jump','fall','punch','kick','fireball','strength','superKick','flight'];let frames=0;
 const a=createCanvas(300,300),b=createCanvas(300,300);
 for(const sex of ['male','female'])for(const view of ['front','right','back','left','game'])for(const pose of poses)for(const gear of ['starter','rare']){
  const look=Object.freeze({...styleCDefault(sex),hair:'buzz',skin:sex==='male'?'#35251f':'#e99b83'}),saved=JSON.stringify(look),h=previewHero(pose,.18),opt={view,poseName:pose,outfit:styleCOutfit(gear)};
  a.getContext('2d').clearRect(0,0,300,300);b.getContext('2d').clearRect(0,0,300,300);
  const current=drawHero(a.getContext('2d'),150,280,look,h,.18,1.7,opt),old=before.drawHero(b.getContext('2d'),150,280,look,h,.18,1.7,opt);
  assert.deepEqual(current.head,old.head);assert.deepEqual(current.shoulder,old.shoulder);assert.equal(JSON.stringify(look),saved);
  assert.equal(hash(a.getContext('2d').getImageData(0,205,300,95).data),hash(b.getContext('2d').getImageData(0,205,300,95).data),`${sex}/${view}/${pose}/${gear}: lower body and equipment`);frames++;
 }
 console.log('Short-hair animation/equipment frames:',frames);
});
test('warm animated hair frames reuse their tint cache, and changing hair color preserves the alpha',()=>{
 const look={...styleCDefault('female'),hair:'buzz'},c=createCanvas(300,300),ctx=c.getContext('2d');
 for(const view of ['front','side','back'])drawStyleCHair(ctx,look,{},0,'front',view);
 const warm=allocations;
 for(let i=0;i<120;i++)for(const view of ['front','side','back'])drawStyleCHair(ctx,look,{wind:i%3,bounce:i%2},i/60,'front',view);
 assert.equal(allocations,warm,'no per-frame hair raster allocation');
 const original=data(localHair(drawStyleCHair,look));
 for(const hairColor of ['#111111','#f5d49c','#ff124b','#2c45bf']){const next=data(localHair(drawStyleCHair,{...look,hairColor}));assert.notEqual(hash(next),hash(original));for(let i=3;i<next.length;i+=4)assert.equal(next[i],original[i]);}
 assert.ok(styleCHairStatus().materials<=styleCHairStatus().limit);
});
