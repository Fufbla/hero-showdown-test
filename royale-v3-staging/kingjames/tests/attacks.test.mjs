import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {Game,STEP,ATTACKS,DEFAULT_LOOK} from '../../../royale/core.mjs';
import {FullBodyAnimator} from '../animation.mjs';
import {OutfitEngine} from '../outfit-engine.mjs';
import {AttackFX} from '../attack-fx.mjs';
import {kingJamesLook} from '../selection.mjs';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
const loaders={canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u)),jsonLoader:async u=>JSON.parse(await readFile(u))};
const engine=new OutfitEngine(loaders);assert.equal(await engine.preload(),true);engine.enabled=true;
const fx=new AttackFX();assert.equal(await fx.preload(loaders),true);
const m=engine.outfits.get('kingjames-original').manifest,look=kingJamesLook(DEFAULT_LOOK),c=createCanvas(500,500).getContext('2d');
const hero=()=>({x:200,y:400,grounded:true,vx:0,vy:0,face:1,jumpAge:100,jumps:0,respawnAge:100,hurtAge:100,stun:0,castAge:100});
test('12 strength frames follow windup, contact and recovery in both directions',()=>{
 for(const face of [-1,1]){const a=new FullBodyAnimator(m),h={...hero(),attack:{power:'strength',kind:'punch',age:0,face}},seen=new Set();
  for(let t=0;t<.27;t+=.001){h.attack.age=t;const sample=a.sample(h,t);seen.add(sample.frameIndex);assert.equal(sample.direction,face);
   assert.equal(sample.state,'strength');if(t>=.055&&t<.16)assert.ok(sample.index>=5&&sample.index<=7);
  }assert.equal(seen.size,12);
 }
});
test('every kick selects its authored four-frame segment without repeating the first kick',()=>{
 const a=new FullBodyAnimator(m),seen=new Set();
 for(let comboIndex=0;comboIndex<6;comboIndex++)for(const face of [-1,1])for(const age of [0,.06,.13,.3]){
  const sample=a.sample({...hero(),attack:{power:'superKick',kind:'kick',age,face,comboIndex}},comboIndex+age);
  assert.equal(Math.floor(sample.index/4),comboIndex);assert.equal(sample.direction,face);seen.add(sample.frameIndex);
 }assert.equal(seen.size,24);
});
test('ground and airborne casting use distinct complete frames and recover on the cast timer',()=>{
 for(const grounded of [true,false]){const a=new FullBodyAnimator(m),h={...hero(),grounded,flying:!grounded},seen=new Set();
  for(let i=0;i<8;i++){h.castAge=i*.075;const sample=a.sample(h,i*.075);assert.equal(sample.state,grounded?'fireball':'fireballAir');seen.add(sample.frameIndex);}
  assert.equal(seen.size,8);h.castAge=.61;assert.ok(!a.sample(h,.61).state.startsWith('fireball'));
 }
});
test('rendering all three powers preserves simulation, 1/2/3 projectile counts, six kicks, cooldowns and saves',()=>{
 for(const power of ['strength','superKick','fireball'])for(const level of [1,10,20])for(const face of [-1,1]){
  const make=()=>{const g=new Game({look,random:()=>.4,now:()=>1000,testPowers:true});g.started=true;g.hero.face=face;g.powers.data.levels[power]=level;g.powers.data.equipped=[power,null,null];return g;};
  const a=make(),b=make();assert.equal(a.powers.activate(power),true);assert.equal(b.powers.activate(power),true);
  let maxProjectiles=0;const combo=new Set();
  for(let i=0;i<170;i++){
   a.step(STEP,{});b.step(STEP,{});maxProjectiles=Math.max(maxProjectiles,a.powers.projectiles.length);if(a.hero.attack?.power==='superKick')combo.add(a.hero.attack.comboIndex);
   const before=a.save(),state=JSON.stringify({hero:a.hero,projectiles:a.powers.projectiles,active:a.powers.active});
   engine.draw(c,200,400,look,a.hero,a.time);fx.world(c,a);fx.hero(c,a,{x:200,y:400},a.hero);
   assert.equal(a.save(),before);assert.equal(JSON.stringify({hero:a.hero,projectiles:a.powers.projectiles,active:a.powers.active}),state);assert.equal(a.save(),b.save());
  }
  if(power==='fireball')assert.equal(maxProjectiles,level===20?3:level>=10?2:1);
  if(power==='superKick'&&level===20)assert.equal(combo.size,6);
 }
});
test('effect rendering reads projectile positions directly and keeps body customization untouched',()=>{
 const calls=[],context={save(){},restore(){},translate(...v){calls.push(v);},scale(){},drawImage(){},globalAlpha:1};
 const game={powers:{projectiles:[{x:210,y:370,vx:-520,life:1.5}]}};fx.world(context,game);assert.deepEqual(calls,[[225,370]]);
 const custom={...look,skin:'#8c563b',eyes:'#33aa77',hair:'none'};engine.draw(c,200,400,custom,{...hero(),castAge:.2},1);assert.deepEqual(engine.lastPaint.look,custom);
});
