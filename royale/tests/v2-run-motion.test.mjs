import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {useV2RunCycle,V2_RUN_CYCLE_VERSION} from '../v2-sprites/run-motion.mjs';
import {STYLE_C_MOTIONS} from '../style-c-clips.mjs';

const h={face:1,grounded:true,vx:340,dead:false,stun:0,attack:null,
 castAge:10,dodgeAge:10,respawnAge:10,steel:false,agile:false,flying:false};
const g={testPowers:true,powers:{active:{},data:{levels:{speed:20}}}};
test('V2 run has eight hand-authored, meaningfully distinct grounded frames',()=>{
 assert.equal(V2_RUN_CYCLE_VERSION,'v2-run-eight-keyframes-v1');
 const frames=STYLE_C_MOTIONS['v2-run'].frames;
 assert.equal(frames.length,8);
 assert.equal(STYLE_C_MOTIONS.run.frames.length,6,'original run clip is untouched');
 assert.equal(new Set(frames.map(f=>JSON.stringify([f.body,f.hands,f.feet]))).size,8);
 assert.ok(frames.some(f=>f.body[1]>=5),'weight-acceptance pose compresses visibly');
 assert.ok(frames.some(f=>f.body[1]<=-3),'push-off pose rises visibly');
 for(let i=0;i<frames.length;i++){
  const a=frames[i],b=frames[(i+1)%frames.length];
  assert.notDeepEqual(a.hands,b.hands,'each successive frame has a distinct arm swing');
  assert.ok(a.feet.some(foot=>foot[1]>=-10),'at least one near-ground contact in each frame');
 }
});
test('only normal, grounded, moving V2 sprite hero gets this run animation',()=>{
 assert.equal(useV2RunCycle(h,g,true),true);
 assert.equal(useV2RunCycle({...h,face:-1,vx:-340},g,true),true);
 assert.equal(useV2RunCycle(h,g,false),false,'normal live renderer selection is unchanged');
 assert.equal(useV2RunCycle(h,{...g,testPowers:false},true),false,'production heroes are unchanged');
 for(const variant of [
  {grounded:false,jumps:1},{grounded:false,jumps:2},
  {vx:0},{vx:160},{attack:{kind:'punch'}},{castAge:.10},
  {agile:true},{steel:true},{flying:true},{dead:true},{stun:.2},
  {dodgeAge:.10},{respawnAge:.10}
 ])assert.equal(useV2RunCycle({...h,...variant},g,true),false,JSON.stringify(variant));
 for(const id of ['roots','whirlwind','steel','agility','flight','superKick'])
  assert.equal(useV2RunCycle(h,{...g,powers:{...g.powers,active:{[id]:{age:.2}}}},true),false,id+' art unchanged');
});
test('renderer chooses V2 run before static speed poster and only while moving',async()=>{
 const renderer=await readFile(new URL('../renderer.mjs',import.meta.url),'utf8');
 assert.ok(renderer.includes('const v2Running=useV2RunCycle(spriteHero,game,this.v2SpriteTest);'));
 assert.ok(renderer.includes('!v2Running&&this.v2SpriteTest&&approvedMotionSprites.draw('));
 assert.ok(renderer.includes('!v2Running&&this.v2SpriteTest&&v2GeneratedSprites.draw('));
 assert.ok(renderer.includes("...(v2Running?{poseName:'v2-run'}:{})"));
 assert.ok(renderer.includes('const pose=generated?poseFor('),'unchanged attack/jump fallback');
});
