import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {APPROVED_POSES} from '../v2-sprites/approved-motion.mjs';
import {APPROVED_FX_VERSION,selectApprovedPowerEffect,extractPaintedEffectPixels,ApprovedPaintedPowerFX} from '../v2-sprites/approved-effects.mjs';

const hero={face:1,grounded:true,vx:0,castAge:10,dodgeAge:10,stun:0,dead:false,attack:null};
const base={testPowers:true,paused:false,hero,powers:{active:{},data:{levels:{speed:20}}}};
const choose=(changes={})=>selectApprovedPowerEffect({...base,...changes});
test('approved atlas is used for V2 power artwork, with no poster body rendering',async()=>{
 assert.equal(APPROVED_FX_VERSION,'approved-painted-fx-only-v1');
 const renderer=await readFile(new URL('../renderer.mjs',import.meta.url),'utf8');
 const app=await readFile(new URL('../app.mjs',import.meta.url),'utf8');
 assert.ok(renderer.includes('approvedPaintedPowerFX.draw(c,game,pos,t)'));
 assert.ok(app.includes('void approvedPaintedPowerFX.preload()'));
 assert.ok(renderer.includes('const pose=drawHero(c,pos.x,pos.y'),'one consistent hero body for all actions');
 assert.ok(!renderer.includes('approvedMotionSprites.draw('),'approved costume frames must never replace hero');
});
test('all nine power visuals and merge are selected from the approved collection',()=>{
 const setups=[
  [{hero:{...hero,attack:{power:'strength',age:.2}}},'strength-impact'],
  [{hero:{...hero,attack:{power:'superKick',age:.2}}},'kick-impact'],
  [{hero:{...hero,castAge:.17}},'fireball-release'],
  [{hero:{...hero,flying:true}},'flight'],
  [{powers:{...base.powers,active:{steel:{age:1,duration:8}}}},'steel'],
  [{powers:{...base.powers,active:{roots:{age:1,duration:2}}}},'roots'],
  [{hero:{...hero,agile:true}},'agility'],
  [{hero:{...hero,vx:350}},'speed'],
  [{powers:{...base.powers,active:{whirlwind:{age:1,duration:2}}}},'whirlwind'],
  [{legendary:{active:'venomis'},mergeEffects:[{}]},'merge']
 ];
 for(const [state,name] of setups){
  assert.ok(APPROVED_POSES.includes(name),name);
  assert.equal(choose(state)?.name,name,name);
 }
 assert.equal(choose({hero:{...hero,face:-1,attack:{power:'strength',age:.2}}}).name,'strength-left');
 assert.equal(choose({hero:{...hero,face:-1,attack:{power:'superKick',age:.2}}}).name,'kick-left');
 assert.equal(choose({hero:{...hero,face:-1,castAge:.04}}).name,'fireball-left');
});
test('VFX extraction removes central hero even if color resembles power glow',()=>{
 const size=256,src=new Uint8ClampedArray(size*size*4);
 const set=(x,y,r,g,b,a=255)=>{const n=(y*size+x)*4;src.set([r,g,b,a],n);};
 set(128,120,23,230,200); // central hero costume
 set(215,120,23,230,200); // outer cyan aura
 set(15,135,15,25,40); // dark body material
 set(218,192,246,171,30); // off-body energy arc
 const copy=src.slice();
 const out=extractPaintedEffectPixels(src,'roots');
 const alpha=(x,y)=>out.data[(y*256+x)*4+3];
 assert.deepEqual(src,copy,'color-key must never alter original source texture');
 assert.equal(alpha(128,120),0,'the center body must be fully transparent');
 assert.ok(alpha(215,120)>0,'cyan aura outside the body remains');
 assert.equal(alpha(15,135),0,'dark outfit pixels do not become effects');
 assert.ok(alpha(218,192)>0,'painted impact sparks outside the body remain');
 assert.equal(extractPaintedEffectPixels(src,'speed').data[(120*256+215)*4+3],0,'speed accents must be ground-level');
});
test('approved painted textures are created once, drawn as overlays, and never mutate game',async()=>{
 let created=0;const ops=[];
 const makeCanvas=()=>{created++;const d=new Uint8ClampedArray(256*256*4);
  const n=(120*256+220)*4;d.set([12,210,237,255],n);
  return {width:0,height:0,getContext:()=>({
   clearRect(){},drawImage(){},getImageData(){return {data:d};},putImageData(){},
  })};};
 const art=new ApprovedPaintedPowerFX({loader:async()=>({width:1536,height:1024}),makeCanvas});
 assert.equal(await art.preload(),true);
 assert.ok(created>=14,'installed sprite poses each get extracted');
 const g={...base,powers:{...base.powers,active:{whirlwind:{age:1,duration:2}}}};
 const before=JSON.stringify(g);
 const ctx={save(){ops.push('save');},restore(){ops.push('restore');},
  drawImage(...a){ops.push(a);},translate(...a){ops.push(['translate',...a]);},
  scale(...a){ops.push(['scale',...a]);},
  set globalAlpha(x){},get globalAlpha(){return 1;}};
 assert.equal(art.draw(ctx,g,{x:220,y:600},1),true);
 assert.equal(JSON.stringify(g),before);
 assert.equal(ops[0],'save');
 assert.equal(ops.at(-1),'restore');
 assert.equal(ops.filter(x=>Array.isArray(x)&&x.length===5).length,1,'one picture layer; no second hero');
});
