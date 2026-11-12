import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {APPROVED_OUTFITS} from '../outfit-catalog.mjs';
import {OutfitEngine,STEEL_ID} from '../outfit-engine.mjs';
import {OUTFIT_ID,kingJamesLook} from '../selection.mjs';
import {FullBodyAnimator,validateManifest} from '../animation.mjs';
import {Game,STEP,ATTACKS,DEFAULT_LOOK} from '../../../royale/core.mjs';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
const make=()=>new OutfitEngine({canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u)),jsonLoader:async u=>JSON.parse(await readFile(u))});
const look=kingJamesLook(DEFAULT_LOOK),idle={grounded:true,vx:0,vy:0,face:1,dead:false,respawnAge:100,hurtAge:100,jumpAge:100,jumps:0,stun:0,landing:0,castAge:100};
test('all twelve approved outfits have complete distinct artwork for movement and powers',async()=>{
 assert.equal(APPROVED_OUTFITS.length,12);assert.equal(new Set(APPROVED_OUTFITS.map(o=>o.id)).size,12);
 const engine=make();engine.enabled=true;const canvas=createCanvas(288,288),c=canvas.getContext('2d');
 for(const outfit of APPROVED_OUTFITS){
  assert.equal(await engine.choose(outfit.id),true,engine.error);const {manifest:m,atlases}=engine.outfits.get(outfit.id);validateManifest(m);assert.equal(m.frames.length,116);
  const hashes=new Set();
  for(let i=0;i<m.frames.length;i++){
   const f=m.frames[i];c.clearRect(0,0,288,288);c.save();c.translate(16,16);c.drawImage(atlases[f.atlas||'default'],...f.rect,0,0,...m.cell);engine.head.draw(c,look,f.head,m.head.scale);c.restore();
   const d=c.getImageData(0,0,288,288).data;let filled=0,edge=0;
   for(let y=0;y<288;y++)for(let x=0;x<288;x++)if(d[(y*288+x)*4+3]>32){filled++;if(x<16||x>=272||y<16||y>=272)edge++;}
   assert.ok(filled>4000,outfit.id+' frame '+i+' is empty');assert.equal(edge,0,outfit.id+' frame '+i+' clips');hashes.add(createHash('sha256').update(d).digest('hex'));
   for(let y=16;y<24;y++)for(let x=16;x<24;x++)assert.ok(d[(y*288+x)*4+3]<=5,outfit.id+' frame '+i+' has a background matte');
  }
  assert.equal(hashes.size,116,outfit.id+' has duplicated frozen frames');
  for(const name of ['punch','kick']){assert.equal(m.animations[name].frames.length,8);assert.equal(m.animations[name].embeddedImpact,true);assert.ok(m.animations[name].frames.every(i=>m.frames[i].atlas==='basic'));}
  for(const name of ['strength','superKick','fireball','fireballAir'])assert.ok(m.animations[name].frames.every(i=>m.frames[i].atlas==='attacks'),outfit.id+' missing '+name);
  assert.equal(m.animations.run.frames.length,8);assert.equal(engine.selected(look),outfit.id);assert.equal(engine.selected({name:'Other Hero'}),null);
  assert.ok(engine.outfits.size<=3,'Trial atlas cache grows unbounded');
 }
});
test('outfit changes preserve gameplay, saved appearance, equipment, coins and powers',async()=>{
 const engine=make();engine.enabled=true;const game=new Game({look,testPowers:true,random:()=>.4,now:()=>1000});game.started=true;const c=createCanvas(400,400).getContext('2d');
 for(const outfit of APPROVED_OUTFITS){
  const saved=game.save();assert.equal(await engine.choose(outfit.id),true,engine.error);
  for(const face of [-1,1])for(const kind of ['punch','kick']){
   const hero={...game.hero,...idle,attack:{kind,face,age:ATTACKS[kind].startup,power:kind==='punch'?'strength':'superKick',comboIndex:3}};
   assert.ok(engine.draw(c,190,260,game.look,hero,game.time));assert.equal(engine.lastFrame.outfit,outfit.id);assert.equal(engine.lastFrame.direction,face);
  }
  assert.equal(game.save(),saved);
 }
});
test('Steel Body restores the selected outfit and failed selection keeps the previous outfit',async()=>{
 const engine=make();engine.enabled=true;await engine.preload(STEEL_ID);await engine.choose('santa-street');const c=createCanvas(400,400).getContext('2d'),h={...idle,steel:true,v2Active:{steel:{age:.1}}};
 const echoes=[],echo=engine.drawEcho.bind(engine);engine.drawEcho=(...args)=>{echoes.push(args[3].id);return echo(...args);};
 engine.draw(c,190,260,look,h,1);assert.equal(engine.lastFrame.outfit,STEEL_ID);assert.deepEqual(echoes,['santa-street']);
 h.steel=false;engine.draw(c,190,260,look,h,1.1);assert.equal(engine.lastFrame.outfit,'santa-street');
 assert.equal(await engine.choose('not-an-outfit'),false);assert.equal(await engine.choose(STEEL_ID),false);
 engine.imageLoader=async()=>{throw Error('offline');};assert.equal(await engine.choose('emerald-gala'),false);assert.equal(engine.selected(look),'santa-street');
});
test('each selected outfit retains contact timing, run strides and all six kick stages',async()=>{
 for(const outfit of APPROVED_OUTFITS){const m=JSON.parse(await readFile(new URL('../outfits/'+outfit.id+'/manifest.json',import.meta.url)));const a=new FullBodyAnimator(m);
  const seen=new Set();for(let n=0;n<60;n++)seen.add(a.sample({...idle,vx:300},n*STEP).frameIndex);assert.ok(m.animations.run.frames.every(i=>seen.has(i)));
  for(let comboIndex=0;comboIndex<6;comboIndex++){const h={...idle,attack:{kind:'kick',power:'superKick',age:ATTACKS.kick.startup,comboIndex,face:-1}},s=a.sample(h,2+comboIndex);assert.equal(s.index,comboIndex*4+2);assert.equal(s.direction,-1);}
 }
});
