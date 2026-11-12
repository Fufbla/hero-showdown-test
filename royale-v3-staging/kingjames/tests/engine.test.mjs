import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {Game,STEP,ATTACKS,DEFAULT_LOOK,decodeSave} from '../../../royale/core.mjs';
import {LocalHeroStore,PROFILE_KEY} from '../../../royale/saves.mjs';
import {maxV2TestPowers} from '../../../royale/v2-test-hero.mjs';
import {FullBodyAnimator,validateManifest,REQUIRED_STATES} from '../animation.mjs';
import {OutfitEngine} from '../outfit-engine.mjs';
import {isPrototypeContext,selectedOutfit,kingJamesLook,prototypeSlot,TEST_PREFIX} from '../selection.mjs';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
const manifest=JSON.parse(await readFile(new URL('../outfits/kingjames-original/manifest.json',import.meta.url)));
const look=kingJamesLook(DEFAULT_LOOK);
const idle=()=>({grounded:true,vx:0,vy:0,face:1,dead:false,respawnAge:100,hurtAge:100,jumpAge:100,jumps:0,stun:0,landing:0});
const engine=new OutfitEngine({canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u)),jsonLoader:async u=>JSON.parse(await readFile(u))});
assert.equal(await engine.preload(),true,engine.error);engine.enabled=true;
test('only the reserved code inside the staging parent enables the prototype',()=>{
 const valid={pathname:'/hero-showdown-test/royale-v3-staging/kingjames/index.html',search:'?v2TestCharacter=0000000000',parentPath:'/hero-showdown-test/royale-v3-staging/'};
 assert.equal(isPrototypeContext(valid),true);
 for(const change of [{search:'?v2TestCharacter=1234567890'},{pathname:'/hero-showdown-test/royale/'},{parentPath:'/hero-showdown-test/royale/'},{sameOrigin:false}])assert.equal(isPrototypeContext({...valid,...change}),false);
 assert.equal(selectedOutfit(true,look),'kingjames-original');assert.equal(selectedOutfit(false,look),null);assert.equal(selectedOutfit(true,{name:'Another Hero'}),null);
});
test('the complete outfit contract rejects missing anchors, frames and animation states',()=>{
 assert.equal(validateManifest(manifest),manifest);
 for(const state of REQUIRED_STATES){const m=structuredClone(manifest);delete m.animations[state];assert.throws(()=>validateManifest(m));}
 const m=structuredClone(manifest);delete m.frames[2].head;assert.throws(()=>validateManifest(m));
 assert.equal(manifest.frames.length,48);assert.deepEqual(manifest.cell,[256,256]);
});
test('running uses alternating authored strides, advances with speed and freezes at paused game time',()=>{
 const a=new FullBodyAnimator(manifest),h=idle();a.sample(h,0);h.vx=315;
 assert.equal(a.sample(h,.01).state,'start');a.sample(h,.15);
 const seen=new Set();for(let t=.16;t<1;t+=STEP)seen.add(a.sample(h,t).frameIndex);
 assert.equal(seen.size,8);assert.ok(seen.has(8)&&seen.has(12));
 const before=a.sample(h,1);assert.deepEqual(a.sample(h,1),before);
 const slow=new FullBodyAnimator(manifest),fast=new FullBodyAnimator(manifest);slow.sample({...h,vx:185},0);fast.sample({...h,vx:504},0);
 for(let i=1;i<=10;i++){slow.sample({...h,vx:185},i*STEP);fast.sample({...h,vx:504},i*STEP);}
 assert.ok(fast.phase>slow.phase);
 h.vx=0;assert.equal(a.sample(h,1.1).state,'stop');assert.equal(a.sample(h,1.4).state,'idle');
});
test('jump, double jump, apex, fall and land follow existing physics timers',()=>{
 const a=new FullBodyAnimator(manifest),h={...idle(),grounded:false,jumps:1,jumpAge:.01,vy:-565};
 assert.equal(a.sample(h,0).frameIndex,16);h.jumpAge=.06;assert.equal(a.sample(h,.05).frameIndex,17);
 h.jumpAge=.2;h.vy=-300;assert.equal(a.sample(h,.2).frameIndex,18);h.vy=-120;assert.equal(a.sample(h,.3).frameIndex,19);
 h.jumps=2;h.jumpAge=0;h.vy=-520;assert.equal(a.sample(h,.31).state,'doubleJump');
 h.jumpAge=.3;h.vy=0;assert.equal(a.sample(h,.6).frameIndex,24);h.vy=500;assert.equal(a.sample(h,.9).frameIndex,27);
 h.grounded=true;h.landing=.13;assert.equal(a.sample(h,1).frameIndex,28);h.landing=.01;assert.equal(a.sample(h,1.12).frameIndex,31);
});
test('punch and kick contact frames match active hit windows in either direction',()=>{
 for(const kind of ['punch','kick'])for(const face of [-1,1]){
  const a=new FullBodyAnimator(manifest),h={...idle(),face,attack:{kind,face,age:0}},d=ATTACKS[kind];
  assert.equal(a.sample(h,0).index,0);h.attack.age=d.startup*.75;assert.equal(a.sample(h,.01).index,1);
  h.attack.age=d.startup;assert.equal(a.sample(h,.02).index,2);assert.equal(a.sample(h,.02).direction,face);
  h.attack.age=d.startup+d.active+.001;assert.equal(a.sample(h,.03).index,3);
 }
});
test('hurt, defeat and recovery preserve the gameplay priority',()=>{
 const a=new FullBodyAnimator(manifest),h={...idle(),stun:.16,hurtAge:0};assert.equal(a.sample(h,0).state,'hurt');
 h.dead=true;h.defeatAge=.6;assert.equal(a.sample(h,.1).frameIndex,44);
 h.dead=false;h.stun=0;h.respawnAge=0;assert.equal(a.sample(h,.2).state,'recovery');
 h.respawnAge=.59;assert.equal(a.sample(h,.79).frameIndex,47);
});
test('every body/head composition is padded, opaque where expected and never changes head scale',()=>{
 const {atlas}=engine.outfits.get('kingjames-original'),canvas=createCanvas(288,288),c=canvas.getContext('2d');
 const hashes=new Set();
 for(const [i,f]of manifest.frames.entries()){
  c.clearRect(0,0,288,288);c.save();c.translate(16,16);c.drawImage(atlas,...f.rect,0,0,...manifest.cell);engine.head.draw(c,look,f.head,manifest.head.scale);c.restore();
  const d=c.getImageData(0,0,288,288).data;let count=0,edge=0;
  for(let y=0;y<288;y++)for(let x=0;x<288;x++){if(d[(y*288+x)*4+3]>32){count++;if(x<16||x>=272||y<16||y>=272)edge++;}}
  assert.ok(count>5000,'Missing full frame '+i);assert.equal(edge,0,'Clipped body/head '+i);
  hashes.add(createRequire(import.meta.url)('crypto').createHash('sha256').update(d).digest('hex'));
 }
 assert.equal(hashes.size,48,'Each cell is distinct authored artwork');
});
test('render sampling is read-only and leaves deterministic movement, combat, saves and equipment equal',()=>{
 const a=new Game({look,random:()=>.4,now:()=>1000,testPowers:true}),b=new Game({look,random:()=>.4,now:()=>1000,testPowers:true});a.started=b.started=true;
 const c=createCanvas(400,400).getContext('2d');
 for(let i=0;i<300;i++){
  const input={move:i<170?1:-1,run:true,jump:[15,30,190].includes(i),punch:i%35===0,kick:i%53===0};
  a.step(STEP,input);b.step(STEP,input);
  const before=JSON.stringify({hero:a.hero,look:a.look,inventory:a.inventory,powers:a.powers.data});
  engine.draw(c,180,240,a.look,a.hero,a.time,{owner:a.hero});
  assert.equal(JSON.stringify({hero:a.hero,look:a.look,inventory:a.inventory,powers:a.powers.data}),before);
  assert.equal(a.save(),b.save(),'Gameplay diverged at tick '+i);
 }
});
test('saved test progress survives load/render/save and initialization never replaces a populated slot',()=>{
 const seed=new Game({look,testPowers:true});let snapshot=maxV2TestPowers(JSON.parse(seed.save()),{starterLoadout:true});snapshot.coins=1280;snapshot.xp=12;
 const values=new Map(),storage={getItem:k=>values.get(TEST_PREFIX+k)??null,setItem:(k,v)=>values.set(TEST_PREFIX+k,v)};
 const store=new LocalHeroStore(storage,{allowOverBudgetPowers:true});assert.equal(store.writeSlot(1,snapshot,{expectedId:null}).ok,true);
 const original=values.get(TEST_PREFIX+PROFILE_KEY),restored=new LocalHeroStore(storage,{allowOverBudgetPowers:true});
 assert.deepEqual(prototypeSlot(restored.data.slots),{index:1,create:false});assert.equal(values.get(TEST_PREFIX+PROFILE_KEY),original);
 const saved=restored.slot(1).snapshot;assert.equal(saved.coins,1280);assert.equal(saved.xp,12);assert.deepEqual(saved.powers,snapshot.powers);
 assert.ok(decodeSave(JSON.stringify(saved),{allowOverBudgetPowers:true}));
 assert.deepEqual(prototypeSlot([{snapshot:{look:{name:'Other'}}},null,null]),{index:1,create:true});
 assert.equal(prototypeSlot(Array(3).fill({snapshot:{look:{name:'Other'}}})).index,-1);
});
test('failed assets safely retain the old renderer and other heroes have no new draw calls',async()=>{
 const broken=new OutfitEngine({imageLoader:async()=>{throw Error('offline');},jsonLoader:async()=>manifest,canvasFactory:createCanvas});broken.enabled=true;
 assert.equal(await broken.preload(),false);assert.equal(broken.draw({},0,0,look,idle(),0),false);
 assert.equal(engine.draw({},0,0,{name:'Other Hero'},idle(),0),false);
});
