import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {UNIVERSAL_FX_FRAMES,universalPowerStates,drawUniversalPowerFX} from '../v2-sprites/universal-power-fx.mjs';
import {STEEL_SILHOUETTE_CELLS,selectSteelSilhouettePose,drawSteelSilhouette,steelSilhouetteStatus} from '../v2-sprites/steel-silhouette.mjs';

const gradient=()=>({addColorStop(){}});
function canvasContext(){
 const calls=[];
 const ctx=new Proxy({},{
  get(target,key){
   if(key==='createLinearGradient'||key==='createRadialGradient')return gradient;
   if(key==='calls')return calls;
   return (...args)=>{calls.push({method:key,args});};
  },
  set(target,key,value){target[key]=value;return true;}
 });
 return ctx;
}
test('six independent powers have at least twelve polished animation phases',()=>{
 assert.deepEqual(Object.keys(UNIVERSAL_FX_FRAMES).sort(),
  ['strength','superKick','fireball','agility','speed','flight'].sort());
 assert.ok(Object.values(UNIVERSAL_FX_FRAMES).every(n=>n>=12));
 const heroes={
  strength:{attack:{kind:'punch',power:'strength',age:.11}},
  superKick:{attack:{kind:'kick',power:'superKick',age:.20}},
  fireball:{castAge:.15},agility:{agile:true},speed:{vx:330,cycle:2.6},
  flight:{flying:true}
 };
 const ctx=canvasContext();
 for(const [id,hero] of Object.entries(heroes)){
  const game={hero,powers:{active:{},speed:.6},time:1.2};
  const old=JSON.stringify(game);
  const state=universalPowerStates(game);
  assert.ok(state.some(s=>s.id===id),id+' should produce a separate active effect');
  assert.ok(drawUniversalPowerFX(ctx,game,{x:250,y:600},1.2,'back'),id+' back effect');
  assert.ok(drawUniversalPowerFX(ctx,game,{x:250,y:600},1.2,'front'),id+' front effect');
  assert.equal(JSON.stringify(game),old,'VFX cannot modify physics, cooldowns or saves');
 }
 assert.ok(ctx.calls.filter(c=>c.method==='stroke').length>40,'effects animate through strokes');
});
test('Steel Body is a featureless single model with its own motion sprite cels',()=>{
 const required={idle:8,walk:12,run:14,jump:8,doubleJump:10,fall:6,land:6,punch:10,kick:12,hurt:6,flight:8};
 assert.deepEqual(STEEL_SILHOUETTE_CELLS,required);
 const examples={
  idle:{grounded:true,vx:0},walk:{grounded:true,vx:145,cycle:1.5},
  run:{grounded:true,vx:320,cycle:2.7},
  jump:{grounded:false,vy:-250,jumps:1,jumpAge:.1},
  doubleJump:{grounded:false,vy:-250,jumps:2,jumpAge:.1},
  fall:{grounded:false,vy:215,jumps:1,jumpAge:.4},
  land:{grounded:true,landing:.08},
  punch:{grounded:true,attack:{kind:'punch',age:.13}},
  kick:{grounded:true,attack:{kind:'kick',age:.16}},
  hurt:{grounded:true,stun:.1,hurtAge:.11},
  flight:{grounded:false,flying:true}
 };
 for(const [clip,state] of Object.entries(examples)){
  const hero={steel:true,face:-1,...state};
  const p=selectSteelSilhouettePose(hero,1);
  assert.equal(p.clip,clip);assert.equal(p.face,-1);
  assert.ok(p.frame>=0&&p.frame<p.count);
  assert.equal(selectSteelSilhouettePose({...hero,steel:false},1),null);
 }
});
test('Steel Body draws transformed chrome sprite, not original character art',()=>{
 const oldDocument=globalThis.document,ctx=canvasContext();
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
 try{
  const hero={steel:true,face:1,grounded:true,vx:280,cycle:1.25};
  const game={hero,powers:{active:{steel:{age:1,duration:8}}}};
  const before=JSON.stringify(game);
  assert.equal(drawSteelSilhouette(ctx,game,{x:320,y:580},1,hero),true);
  assert.equal(JSON.stringify(game),before);
  assert.ok(ctx.calls.some(c=>c.method==='drawImage'),'cached steel cels drawn');
  assert.ok(steelSilhouetteStatus().cached.includes('run'));
 }finally{
  if(oldDocument===undefined)delete globalThis.document;
  else globalThis.document=oldDocument;
 }
});
test('all power and steel kick frames retain finite drawing coordinates',()=>{
 const invalid=[];
 const g=()=>({addColorStop(){}});
 const ctx=new Proxy({},{
  get(_target,key){
   if(key==='createLinearGradient'||key==='createRadialGradient')return (...args)=>{
    if(args.some(v=>typeof v==='number'&&!Number.isFinite(v)))invalid.push(key);
    return g();
   };
   return (...args)=>{
    if(args.some(v=>typeof v==='number'&&!Number.isFinite(v)))invalid.push(key);
   };
  },
  set(target,key,value){target[key]=value;return true;}
 });
 const previous=globalThis.document;
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
 try{
  for(const amount of [0,.12,.25,.40,.55,.72,.80,.91,.96,.99]){
   for(const [id,hero] of Object.entries({
    fireball:{castAge:Math.min(.249,.249*amount)},
    strength:{attack:{kind:'punch',power:'strength',age:amount*.27}},
    superKick:{attack:{kind:'kick',power:'superKick',age:amount*.39}},
    agility:{agile:true},flight:{flying:true},speed:{vx:340,cycle:amount*4}
   })){
    const game={hero,powers:{active:{},speed:.5},time:amount*3};
    drawUniversalPowerFX(ctx,game,{x:250,y:590},amount*3,'back');
    drawUniversalPowerFX(ctx,game,{x:250,y:590},amount*3,'front');
   }
   const hero={steel:true,grounded:true,attack:{kind:'kick',age:amount*.39},face:1};
   drawSteelSilhouette(ctx,{hero,powers:{active:{steel:{age:1,duration:8}}}},{x:250,y:590},1,hero);
  }
 }finally{
  if(previous===undefined)delete globalThis.document;
  else globalThis.document=previous;
 }
 assert.deepEqual(invalid,[], 'all animation poses must be drawable on mobile Safari');
});
test('only 0000000000 receives current test renderer changes',async()=>{
 const renderer=await readFile(new URL('../renderer.mjs',import.meta.url),'utf8');
 assert.ok(renderer.includes('const steelMode=this.v2SpriteTest&&!!spriteHero.steel'));
 assert.ok(renderer.includes('const universalFX=this.v2SpriteTest&&'));
 assert.ok(renderer.includes('const generated=!steelMode&&('));
 assert.ok(renderer.includes('if(steelMode)drawSteelSilhouette('));
 assert.ok(renderer.includes("drawUniversalPowerFX(c,game,pos,t,'back',spriteHero)"));
 assert.ok(renderer.includes("drawUniversalPowerFX(c,game,pos,t,'front',spriteHero)"));
 assert.ok(renderer.indexOf("drawUniversalPowerFX(c,game,pos,t,'back',spriteHero)")<
  renderer.indexOf('const generated=!steelMode&&('));
 assert.ok(renderer.indexOf("drawUniversalPowerFX(c,game,pos,t,'front',spriteHero)")>
  renderer.indexOf("if(steelMode)drawSteelSilhouette("));
 // Old user-approved blue-cape sprite remains in place for ordinary actions.
 assert.ok(renderer.includes('v2GeneratedSprites.draw('));
 assert.ok(renderer.includes('drawHero(c,pos.x,pos.y'));
});
