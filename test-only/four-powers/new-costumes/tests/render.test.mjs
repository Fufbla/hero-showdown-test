import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {VICE_ACTIONS as ACTIONS,baseHero,actionHero} from '../../vice/tests/actions.mjs';

globalThis.location={pathname:'/hero-showdown-test/four-powers-test/gameplay/',search:'?testAccount=0000000000'};
const [{CostumeEngine,validateNewCostumeManifest},{NEW_OUTFITS},{CostumeAnimator,NEW_COSTUME_STATES,WOLF_WALK_MAX_SPEED},
 {styleCDefault},{ATTACKS}]=await Promise.all([
 import('../engine.mjs'),import('../definitions.mjs'),import('../animation.mjs'),
 import('../../../../royale/style-c-defaults.mjs'),import('../../../../royale/core.mjs')
]);
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
const options={canvasFactory:createCanvas,imageLoader:url=>loadImage(fileURLToPath(url)),jsonLoader:async url=>JSON.parse(await readFile(url))};
const engine=new CostumeEngine(options);
for(const outfit of NEW_OUTFITS)assert(await engine.preload(outfit.id),outfit.id+': '+engine.error);
const pixels=canvas=>canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
const digest=canvas=>createHash('sha256').update(pixels(canvas)).digest('hex');
const lookFor=presentation=>({...styleCDefault(presentation),skin:presentation==='male'?'#613a25':'#d5a47f',
 hair:presentation==='male'?'high-top':'box-braids',hairColor:'#9b4827',eyes:'#5343be',cape:true});
function bounds(canvas){
 const data=pixels(canvas),w=canvas.width,h=canvas.height;let x0=w,y0=h,x1=-1,y1=-1,count=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>32){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);count++;}
 return {x0,y0,x1,y1,count};
}
function renderAction(outfit,state,{direction=1,presentation='male',owner={}}={}){
 const canvas=createCanvas(320,320),c=canvas.getContext('2d'),look=lookFor(presentation),hero=actionHero(state,direction,ATTACKS);
 const opts={id:outfit.id,owner};
 if(state==='start')engine.draw(c,160,285,look,{...baseHero(),face:direction},0,opts);
 if(state==='stop')engine.draw(c,160,285,look,{...baseHero(),face:direction,vx:260},0,opts);
 c.clearRect(0,0,320,320);
 const before={hero:structuredClone(hero),look:structuredClone(look)};
 const time=(state==='start'||state==='stop')?0.01:0.48;
 const pose=engine.draw(c,160,285,look,hero,time,opts);
 return {canvas,pose,frame:{...engine.lastFrame},hero,look,before};
}

test('Every authored pose is visible, registered inside its cell, and the movement and attack art are distinct',()=>{
 for(const outfit of NEW_OUTFITS){
  const loaded=engine.outfits.get(outfit.id),m=loaded.manifest;
  assert.equal(validateNewCostumeManifest(m,loaded.atlas),m);
  assert.deepEqual(m.cell,[256,256]);assert.deepEqual(m.foot,[128,230]);
  const hashes=[];
  for(let index=0;index<m.frames.length;index++){
   for(const presentation of ['male','female']){
    const look=lookFor(presentation),original=structuredClone(look),canvas=engine.compose(outfit.id,index,look);
    const box=bounds(canvas),label=outfit.id+' frame '+index+' '+presentation;
    assert.equal(canvas.width,256);assert.equal(canvas.height,256);assert(box.count>600,label+' is empty');
    assert(box.x0>=1&&box.y0>=1&&box.x1<255&&box.y1<255,label+' clips at its cell boundary: '+JSON.stringify(box));
    assert.deepEqual(look,original,'Composition changed saved appearance');
    if(presentation==='male')hashes.push(digest(canvas));
   }
  }
  for(const action of ['run','punch','kick','doubleJump','fly']){
   const frames=m.animations[action].frames;
   assert(new Set(frames.map(i=>hashes[i])).size>=2,outfit.id+' '+action+' has no distinct action art');
  }
  assert.equal(new Set(m.animations.run.frames.map(i=>hashes[i])).size,new Set(m.animations.run.frames).size,outfit.id+' repeats run artwork');
 }
});

test('All 21 actions use the new costume in both directions and presentations without changing simulation state',()=>{
 assert.deepEqual(NEW_COSTUME_STATES,ACTIONS);let checked=0;
 for(const outfit of NEW_OUTFITS)for(const presentation of ['male','female'])for(const direction of [-1,1])for(const state of ACTIONS){
  const result=renderAction(outfit,state,{presentation,direction}),expected=outfit.id==='wolf-transformation'&&state==='start'?'runStart':state;
  const label=outfit.id+' '+presentation+' '+state+' '+direction;
  assert(result.pose,label);assert.equal(result.pose.artSource,'full-body-costume',label);
  assert.equal(result.frame.outfit,outfit.id,label);assert.equal(result.frame.state,expected,label);assert.equal(result.frame.direction,direction,label);
  assert(engine.outfits.get(outfit.id).manifest.animations[expected].frames.includes(result.frame.frame),label);
  assert.equal(result.frame.fullTransform,outfit.fullTransform,label);assert.equal(result.frame.hairVisible,!outfit.fullTransform,label);
  assert.deepEqual(result.hero,result.before.hero,label);assert.deepEqual(result.look,result.before.look,label);
  assert(bounds(result.canvas).count>300,label+' failed to paint');checked++;
 }
 assert.equal(checked,336);
});

test('Ghost and wolf replace the complete human appearance while clothing preserves customized heads and skin',()=>{
 for(const outfit of NEW_OUTFITS){
  const m=engine.outfits.get(outfit.id).manifest;
  for(const index of new Set([m.animations.idle.frames[0],m.animations.run.frames[2],m.animations.punch.frames[2],m.animations.fly.frames[0]])){
   const a=engine.compose(outfit.id,index,lookFor('male')),b=engine.compose(outfit.id,index,lookFor('female'));
   if(outfit.fullTransform)assert.equal(digest(a),digest(b),outfit.id+' leaked human appearance');
   else assert.notEqual(digest(a),digest(b),outfit.id+' lost the customized face/hair/skin');
  }
 }
 const ghost=NEW_OUTFITS.find(o=>o.id==='ghost-transformation');
 const result=renderAction(ghost,'idle');assert(Number.isFinite(result.frame.floatOffset));
 assert.notEqual(result.frame.floatOffset,0,'A grounded ghost must have a visible floating offset');
});

test('Skin customization recolors cyan hands and neck without tinting the blue uniform or brown gear',()=>{
 let blueCloth=0,brownGear=0,recoloredSkin=0;
 for(const outfit of NEW_OUTFITS.filter(row=>!row.fullTransform)){
  const m=engine.outfits.get(outfit.id).manifest;
  for(let index=0;index<m.frames.length;index++){
   const raw=engine.newCostumeTemplate(outfit.id,index).pixels.data;
   const dark=pixels(engine.newCostumeBody(outfit.id,index,{...lookFor('male'),skin:'#482a1d'}));
   const light=pixels(engine.newCostumeBody(outfit.id,index,{...lookFor('female'),skin:'#edcba1'}));
   for(let i=0;i<raw.length;i+=4){
    const [r,g,b,a]=raw.subarray(i,i+4);assert.equal(dark[i+3],light[i+3]);if(a<=128)continue;
    const blue=b>g*1.15&&r>g*.5,brown=r>g*1.15&&g>b*1.05;
    if(blue||brown){
     for(let channel=0;channel<4;channel++){
      assert.equal(dark[i+channel],raw[i+channel],outfit.id+' frame '+index+' recolored authored gear');
      assert.equal(light[i+channel],raw[i+channel],outfit.id+' frame '+index+' recolored authored gear');
     }
     if(blue)blueCloth++;if(brown)brownGear++;
    }
    // Strong cyan is the actual source-art skin key, so it must follow the
    // saved complexion. Blue cloth is deliberately excluded from this probe.
    if(r<Math.min(g,b)*.3&&Math.min(g,b)>90&&Math.abs(g-b)<Math.max(g,b)*.12){
     assert(dark[i]!==light[i]||dark[i+1]!==light[i+1]||dark[i+2]!==light[i+2],outfit.id+' left cyan skin unchanged');recoloredSkin++;
    }
   }
  }
 }
 assert(blueCloth>10000,'Blue cloth preservation probe did not cover the uniform');
 assert(brownGear>10000,'Brown gear preservation probe did not cover the bag/turnout gear');
 assert(recoloredSkin>1000,'Skin probe did not cover exposed hands and neck');
});

test('Wolf walks upright at low speed, lowers to the separately authored four-legged run, and rises before walking again',()=>{
 const m=engine.outfits.get('wolf-transformation').manifest,animator=new CostumeAnimator(m),hero=baseHero();
 assert.equal(animator.sample(hero,0).state,'idle');
 hero.vx=WOLF_WALK_MAX_SPEED*.6;assert.equal(animator.sample(hero,.01).state,'walkStart');
 let time=.01+m.animations.walkStart.duration+.01;assert.equal(animator.sample(hero,time).state,'walk');
 const walk=new Set(m.animations.walk.frames),run=new Set(m.animations.run.frames);
 assert([...walk].every(i=>!run.has(i)),'Biped and quadruped gait must have separate authored poses');
 hero.vx=WOLF_WALK_MAX_SPEED+50;assert.equal(animator.sample(hero,time+=.01).state,'runStart');
 assert.equal(animator.sample(hero,time+=m.animations.runStart.duration+.01).state,'run');
 hero.vx=WOLF_WALK_MAX_SPEED*.6;assert.equal(animator.sample(hero,time+=.01).state,'rise');
 assert.equal(animator.sample(hero,time+=m.animations.rise.duration+.01).state,'walk');
 hero.vx=0;assert.equal(animator.sample(hero,time+=.01).state,'walkStop');
 assert.equal(animator.sample(hero,time+=m.animations.walkStop.duration+.01).state,'idle');
 // A transition cannot delay attacks or the actual jump response.
 hero.vx=WOLF_WALK_MAX_SPEED+50;assert.equal(animator.sample(hero,time+=.01).state,'runStart');
 hero.attack={kind:'punch',age:ATTACKS.punch.startup+.01};assert.equal(animator.sample(hero,time+=.01).state,'punch');
 delete hero.attack;Object.assign(hero,{grounded:false,vy:-350,jumps:2,jumpAge:.12});
 assert.equal(animator.sample(hero,time+=.01).state,'doubleJump');
});

test('Metallic ghost and wolf keep their body silhouette and restore normal artwork when Steel Body expires',()=>{
 for(const outfit of NEW_OUTFITS.filter(o=>o.fullTransform)){
  const m=engine.outfits.get(outfit.id).manifest,index=m.animations.punch.frames[2],look=lookFor('female');
  const normal=engine.compose(outfit.id,index,look),steel=engine.compose(outfit.id,index,look,false,1,{steel:true});
  const a=pixels(normal),b=pixels(steel);let changed=0;
  assert.notEqual(digest(normal),digest(steel),outfit.id+' has no Steel Body appearance');
  for(let i=0;i<a.length;i+=4){assert.equal(a[i+3],b[i+3],'Steel Body changed the transformation silhouette');if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])changed++;}
  assert(changed>500);assert.equal(digest(engine.compose(outfit.id,index,look)),digest(normal));
  const canvas=createCanvas(320,320),hero={...baseHero(),steel:true},saved=structuredClone(hero);
  assert(engine.draw(canvas.getContext('2d'),160,285,look,hero,.48,{id:outfit.id}));
  assert.equal(engine.lastFrame.outfit,outfit.id);assert.equal(engine.lastFrame.steel,true);assert.equal(engine.lastFrame.hairVisible,false);
  assert.deepEqual(hero,saved);
 }
});

test('Independent solo and local co-op owners render the same costume without sharing animation state',()=>{
 for(const outfit of NEW_OUTFITS){
  const solo={},first={},second={};
  const a=renderAction(outfit,'run',{presentation:'female',direction:-1,owner:solo});
  const b=renderAction(outfit,'run',{presentation:'female',direction:-1,owner:first});
  renderAction(outfit,'hurt',{owner:second});
  assert.deepEqual(a.frame,b.frame,outfit.id);assert.equal(digest(a.canvas),digest(b.canvas),outfit.id);
  assert.notStrictEqual(engine.states.get(first),engine.states.get(second));
 }
});

test('A failed asset load cannot draw a partial transformation and a later retry succeeds',async()=>{
 for(const outfit of NEW_OUTFITS){
  let missing=true;
  const retry=new CostumeEngine({...options,imageLoader:url=>{
   if(missing&&url.pathname.endsWith('/'+outfit.id+'/body.webp'))throw Error('Missing test body fixture');
   return options.imageLoader(url);
  }});
  assert.equal(await retry.preload(outfit.id),false,outfit.id);assert.equal(retry.outfits.has(outfit.id),false);assert.equal(retry.pending.has(outfit.id),false);
  const canvas=createCanvas(320,320),hero=baseHero(),before=structuredClone(hero);
  assert.equal(retry.draw(canvas.getContext('2d'),160,285,lookFor('male'),hero,1,{id:outfit.id}),false);
  assert.equal(bounds(canvas).count,0);assert.deepEqual(hero,before);
  missing=false;assert(await retry.preload(outfit.id),retry.error);assert(retry.outfits.has(outfit.id));
 }
});

test('Malformed full-body identity, missing action clips and off-atlas poses are rejected before rendering',()=>{
 for(const outfit of NEW_OUTFITS){
  const loaded=engine.outfits.get(outfit.id),m=loaded.manifest;
  const changes=[copy=>{copy.id='unrelated-costume';},copy=>{delete copy.animations.fly;},
   copy=>{copy.frames[0].rect[0]=loaded.atlas.width;},copy=>{copy.frames[0].hand=[257,20];}];
  if(outfit.fullTransform)changes.push(copy=>{copy.fullTransform=false;},copy=>{copy.head.mode='costume-hat';});
  else changes.push(copy=>{delete copy.headgear.hat;});
  if(outfit.id==='wolf-transformation')changes.push(copy=>{delete copy.animations.walk;});
  for(const change of changes){const copy=structuredClone(m);change(copy);assert.throws(()=>validateNewCostumeManifest(copy,loaded.atlas),outfit.id);}
 }
});
