import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {OutfitEngine,STEEL_ID} from '../outfit-engine.mjs';
import {FullBodyAnimator} from '../animation.mjs';
import {MotionFX} from '../motion-fx.mjs';
import {kingJamesLook} from '../selection.mjs';
import {DEFAULT_LOOK} from '../../../royale/core.mjs';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
const loaders={canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u)),jsonLoader:async u=>JSON.parse(await readFile(u))};
const engine=new OutfitEngine(loaders);await engine.preload();assert.equal(await engine.preload(STEEL_ID),true);engine.enabled=true;
const fx=new MotionFX();assert.equal(await fx.preload(loaders),true);
const m=engine.outfits.get(STEEL_ID).manifest,canvas=createCanvas(500,500),c=canvas.getContext('2d'),look=kingJamesLook(DEFAULT_LOOK);
const hero=()=>({x:200,y:400,grounded:true,vx:0,vy:0,face:1,jumpAge:100,jumps:0,landing:0,respawnAge:100,hurtAge:100,stun:0,steel:true,v2Active:{steel:{age:1}}});
test('64 metal frames are padded whole figures, with one fixed canvas/foot/scale and no head overlay',()=>{
 assert.equal(m.frames.length,64);assert.deepEqual(m.cell,[256,256]);assert.deepEqual(m.foot,[128,230]);assert.equal(m.worldScale,.62);assert.equal(m.head.embedded,true);
 const {atlas}=engine.outfits.get(STEEL_ID),hashes=new Set();
 for(const f of m.frames){c.clearRect(0,0,500,500);c.drawImage(atlas,...f.rect,0,0,256,256);const data=c.getImageData(0,0,256,256).data;let count=0,edge=0;
  for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(data[(y*256+x)*4+3]>64){count++;if(x<6||x>=250||y<6||y>=250)edge++;}
  assert.ok(count>2500);assert.equal(edge,0);hashes.add(Buffer.from(data).toString('base64'));
 }
 assert.equal(hashes.size,64);let heads=0;const draw=engine.head.draw;engine.head.draw=()=>heads++;
 engine.draw(c,200,400,look,hero(),0);engine.head.draw=draw;assert.equal(heads,0);
});
test('dedicated special attacks use the unchanged contact window and combos restart at windup',()=>{
 for(const [power,kind,start]of [['strength','punch',.055],['superKick','kick',.10]]){
  const a=new FullBodyAnimator(m),h={...hero(),attack:{power,kind,age:0,face:-1}};
  assert.equal(a.sample(h,0).state,power);assert.equal(a.sample(h,0).index,0);
  h.attack.age=start;assert.equal(a.sample(h,.1).index,2);assert.equal(a.sample(h,.1).direction,-1);
  h.attack.age=0;assert.equal(a.sample(h,.2).index,0);
 }
});
test('flight has launch, forward flight and hovering with an embedded metal head',()=>{
 const a=new FullBodyAnimator(m),h={...hero(),grounded:false,flying:true,vy:-170,v2Active:{flight:{age:0},steel:{age:2}}};
 assert.equal(a.sample(h,0).state,'flightStart');h.v2Active.flight.age=.6;h.vx=250;assert.equal(a.sample(h,.6).state,'fly');
 h.vx=0;h.vy=0;assert.equal(a.sample(h,.7).state,'hover');
 const seen=new Set();h.vx=-250;h.face=-1;for(let t=1;t<2;t+=.05)seen.add(a.sample(h,t).frameIndex);assert.equal(seen.size,4);
});
test('Steel expiration restores the exact original outfit and saved face without changing gameplay',()=>{
 const h=hero(),copy=structuredClone(h);engine.draw(c,200,400,look,h,1);assert.equal(engine.lastFrame.outfit,STEEL_ID);assert.deepEqual(h,copy);
 h.steel=false;engine.draw(c,200,400,look,h,1.1);assert.equal(engine.lastFrame.outfit,'kingjames-original');assert.deepEqual(engine.lastPaint.look,look);
});
test('speed dust stays at world ground, direction is retained, and all trails expire after stopping',()=>{
 const h={...hero(),steel:false},g={hero:h,powers:{data:{levels:{speed:20}}}},local=new MotionFX();local.ready=true;local.manifest=fx.manifest;local.atlas=fx.atlas;
 local.update(g,h,0,engine);h.vx=504;
 for(let t=.02;t<.3;t+=.02){h.x+=10;local.update(g,h,t,engine);}
 const s=local.state(h,.3),old=s.particles.filter(p=>p.id==='dust');assert.ok(old.length>0);assert.ok(old.every(p=>p.y===400&&p.face===1));
 const fixed=old.map(p=>p.x);h.face=-1;h.vx=-504;h.x-=50;local.update(g,h,.4,engine);assert.deepEqual(old.map(p=>p.x),fixed);
 assert.ok(local.seen.has('streak:1'));assert.ok(local.seen.has('streak:-1'));assert.ok(s.echoes.length<=4);
 h.vx=0;local.update(g,h,1,engine);assert.equal(s.particles.length,0);assert.equal(s.echoes.length,0);
 h.grounded=false;h.jumpAge=0;h.jumps=1;h.y=390;local.update(g,h,1.02,engine);assert.equal(s.particles.at(-1).y,400);
 h.jumpAge=.1;local.update(g,h,1.12,engine);h.jumpAge=0;h.jumps=2;h.y=320;local.update(g,h,1.13,engine);assert.equal(s.particles.at(-1).id,'airJump');
 h.grounded=true;h.y=400;local.update(g,h,1.5,engine);assert.equal(s.particles.at(-1).id,'landing');assert.equal(s.particles.at(-1).y,400);
});
