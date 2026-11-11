import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {useV2RunCycle,V2_RUN_CYCLE_VERSION} from '../v2-sprites/run-motion.mjs';
import {STYLE_C_MOTIONS} from '../style-c-clips.mjs';
import {drawV2PowerPreview,v2PowerEffectFlags} from '../v2-sprites/power-preview.mjs';

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
 assert.equal(useV2RunCycle({...h,vx:185},g,true),true,
   'Speed at regular movement speed never falls through to static poster');
 assert.equal(useV2RunCycle({...h,vx:-185,face:-1},g,true),true,
   'leftward Speed movement also animates');
 assert.equal(useV2RunCycle({...h,vx:185},{...g,powers:{...g.powers,data:{levels:{speed:0}}}},true),false,
   'ordinary walking without Speed stays untouched');
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
 assert.ok(renderer.includes('const v2Running=useV2RunCycle(spriteHero,game,this.v2SpriteTest||!v2GeneratedSprites.ready);'));
 assert.ok(renderer.includes('!v2Running&&this.v2SpriteTest&&approvedMotionSprites.draw('));
 assert.ok(renderer.includes('!v2Running&&this.v2SpriteTest&&v2GeneratedSprites.draw('));
 assert.ok(renderer.includes("...(v2Running?{poseName:'v2-run'}:{})"));
 assert.ok(renderer.includes('const pose=generated?poseFor('),'unchanged attack/jump fallback');
});

test('animated Speed effects travel with time and stay at feet when running left or right',()=>{
 const draw=(face,vx,time)=>{
  const lines=[],dust=[];
  const ctx={save(){},restore(){},beginPath(){},moveTo(x,y){this.start=[x,y];},
   lineTo(x,y){lines.push({start:this.start,end:[x,y]});},stroke(){},
   ellipse(x,y,rx,ry){dust.push({x,y,rx,ry});},fill(){},arc(){}};
  const game={hero:{...h,face,vx},powers:{speed:.6,active:{}}};
  const original=JSON.stringify(game);
  const flags=drawV2PowerPreview(ctx,game,{x:500,y:600},time);
  assert.equal(JSON.stringify(game),original,'Speed rendering cannot change power or character state');
  assert.equal(flags.speed,true);
  return {lines,dust};
 };
 const right0=draw(1,315,0),right1=draw(1,315,.07),left0=draw(-1,-315,0);
 assert.equal(right0.lines.length,7);
 assert.equal(right0.dust.length,3);
 assert.notDeepEqual(right0.lines,right1.lines,'trailing lines must visibly move over time');
 for(const entry of right0.lines){
  assert.ok(entry.start[1]>=560 && entry.start[1]<600,'Speed streaks stay below waist');
  assert.ok(entry.end[0]<entry.start[0],'rightward run trails behind toward left');
 }
 for(const entry of left0.lines)assert.ok(entry.end[0]>entry.start[0],'leftward run trails behind toward right');
 for(const entry of [...right0.dust,...left0.dust])
  assert.ok(entry.y>=590 && entry.y<=600,'dust stays at ground');
 assert.equal(v2PowerEffectFlags({hero:{...h,vx:185},powers:{speed:.6}}).speed,true);
 assert.equal(v2PowerEffectFlags({hero:{...h,vx:0},powers:{speed:.6}}).speed,false);
});

test('Speed visual rendering is restored behind the new eight-frame run only',async()=>{
 const renderer=await readFile(new URL('../renderer.mjs',import.meta.url),'utf8');
 assert.ok(renderer.includes('if(v2Running)drawV2PowerPreview(c,game,pos,t);'));
 assert.ok(renderer.indexOf('if(v2Running)drawV2PowerPreview(c,game,pos,t);')<
           renderer.indexOf("...(v2Running?{poseName:'v2-run'}:{})"),
           'trail paints behind animated body rather than replacing the body');
});
