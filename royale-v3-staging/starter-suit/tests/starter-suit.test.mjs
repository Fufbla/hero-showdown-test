import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {engine,createCanvas,hero,examples,factory,imageLoader,jsonLoader} from './helpers.mjs';
import {EMBLEMS} from '../../../royale/appearance.mjs';
import {STARTER_CACHE_LIMIT} from '../engine.mjs';
import {OutfitEngine,STEEL_ID} from '../../kingjames/outfit-engine.mjs';
const e=await engine(),look=examples[0];
const pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
const hash=c=>createHash('sha256').update(pixels(c)).digest('hex');
function changes(a,b){const aa=pixels(a),bb=pixels(b);let changed=0;for(let i=0;i<aa.length;i+=4)if(aa[i]!==bb[i]||aa[i+1]!==bb[i+1]||aa[i+2]!==bb[i+2]||aa[i+3]!==bb[i+3])changed++;return changed;}

test('all existing movement and combat clips retain their frame indices and timings',async()=>{
 const old=JSON.parse(await readFile(new URL('../../kingjames/outfits/kingjames-original/manifest.json',import.meta.url),'utf8'));
 assert.equal(e.manifest.frames.length,116);
 for(const [name,clip] of Object.entries(old.animations)){
  const expected={...clip};delete expected.embeddedImpact;assert.deepEqual(e.manifest.animations[name],expected,name);
 }
 assert.deepEqual(e.manifest.foot,old.foot);assert.deepEqual(e.manifest.head,old.head);assert.equal(e.manifest.worldScale,old.worldScale);
 for(let i=0;i<116;i++){assert.deepEqual(e.manifest.frames[i].head,old.frames[i].head);assert.deepEqual(e.manifest.frames[i].hand,old.frames[i].hand);}
});
test('all 116 complete poses render both color regions and preserve head contact',()=>{
 for(let i=0;i<116;i++){
  const a=e.frame(i,{...look,cape:false}),b=e.frame(i,{...look,cape:false,suit:'#e82392'}),d=e.frame(i,{...look,cape:false,trim:'#23ddbb'});
  assert(changes(a,b)>150,'primary region '+i);assert(changes(a,d)>100,'secondary region '+i);
  const head=createCanvas(256,256),f=e.manifest.frames[i];e.head.draw(head.getContext('2d'),{...look,hair:'none'},f.head,e.manifest.head.scale);
  const bodyPixels=pixels(a),headPixels=pixels(head);let overlap=0;
  for(let p=0;p<bodyPixels.length;p+=4)if(bodyPixels[p+3]>96&&headPixels[p+3]>96)overlap++;
  assert(overlap>3,'attached head in frame '+i+'; overlap '+overlap);
 }
});
test('each requested setting changes the rendered artwork independently',()=>{
 const base=e.frame(0,look);
 for(const [key,value] of Object.entries({suit:'#f51671',trim:'#1ae6bf',emblemColor:'#17dafa',capeColor:'#8157ef',cape:false}))assert(changes(base,e.frame(0,{...look,[key]:value}))>60,key);
 assert.equal(new Set(EMBLEMS.map(emblem=>hash(e.frame(0,{...look,emblem})))).size,EMBLEMS.length);
 const noCape={...look,cape:false};assert.equal(hash(e.frame(0,noCape)),hash(e.frame(0,{...noCape,capeColor:'#010101'})));
});
test('suit colors and demo names do not change face, hair, skin or universal body dimensions',()=>{
 const original=e.head.plate(look),before=hash(original.image);
 assert.equal(hash(e.head.plate({...look,suit:'#ffffff',trim:'#000000',emblemColor:'#f000ff',cape:false,capeColor:'#000000'}).image),before);
 const plain={...look,cape:false},a=pixels(e.frame(0,plain));
 const b=pixels(e.frame(0,{...plain,name:'Another unnamed demo',presentation:'female',build:'full',height:1.12,shoulders:1.2,muscle:1}));
 assert.deepEqual(a,b);
});
test('drawing either player and speed echoes leaves input appearances and hero state unchanged',()=>{
 const c=createCanvas(600,400).getContext('2d'),a=Object.freeze({...look}),h=Object.freeze(hero({vx:300})),before=JSON.stringify([a,h]);
 for(const direction of [-1,1]){const actor=Object.freeze({...h,face:direction});for(let t=0;t<1;t+=.05)e.draw(c,300,300,a,actor,t,{owner:actor});assert.equal(e.lastFrame.direction,direction);e.drawEcho(c,280,300,e.lastPaint);}
 assert.equal(JSON.stringify([a,h]),before);
});
test('back preview uses a different head/cape view and textures have bounded memory',()=>{
 const a=createCanvas(300,300),b=createCanvas(300,300);
 e.paint(a.getContext('2d'),150,260,{frame:0,direction:1,look,view:'front'});
 e.paint(b.getContext('2d'),150,260,{frame:0,direction:1,look,view:'back'});
 assert(changes(a,b)>2000);
 for(let i=0;i<150;i++)e.frame(i%116,{...look,suit:'#'+(0x301020+i*100).toString(16)});
 assert(e.status().cacheEntries<=STARTER_CACHE_LIMIT);
});
test('the shared renderer uses the starter for both players and keeps Steel Body separate',async()=>{
 const shared=new OutfitEngine({canvasFactory:factory,imageLoader,jsonLoader});
 assert(await shared.preload());assert(await shared.preload(STEEL_ID));
 shared.enabled=true;shared.selected=()=> 'kingjames-original';shared.starter=e;
 const c=createCanvas(600,400).getContext('2d');
 for(const [i,look] of examples.entries()){
  const h=hero({face:i%2?-1:1});assert(shared.draw(c,300,300,look,h,0));
  assert.equal(shared.lastFrame.outfit,'starter-superhero');
  assert.equal(shared.lastPaint.look.suit,look.suit);
 }
 const steel=hero({steel:true,v2Active:{steel:{age:.1}}});
 assert(shared.draw(c,300,300,look,steel,.1));
 assert.equal(shared.lastFrame.outfit,STEEL_ID);
 assert.equal(shared.lastPaint.id,STEEL_ID);
});
