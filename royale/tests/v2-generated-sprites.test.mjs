import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {V2GeneratedSprites,V2_SPRITE_VERSION,V2_SPRITE_ATLASES,V2_SPRITE_SCENES,GROUNDED_RUN_FRAMES,chooseV2Frame} from '../v2-sprites/runtime.mjs';
import {V2_TEST_CODE,isV2TestCode} from '../v2-test-hero.mjs';
import {v2PowerEffectFlags,drawV2PowerPreview,V2_POWER_PREVIEW_VERSION} from '../v2-sprites/power-preview.mjs';
const root=new URL('../v2-sprites/',import.meta.url);

test('all three actual generated WebP atlases have transparent WebP metadata and registered cell grids',async()=>{
 assert.equal(V2_SPRITE_VERSION,'power-motion-preview-v5');
 for(const [name,meta] of Object.entries(V2_SPRITE_ATLASES)){
  const b=await readFile(new URL(meta.file,root));
  assert.ok(b.byteLength>20000,name+' source file is missing or empty');
  assert.equal(b.toString('ascii',0,4),'RIFF',name+' RIFF signature');
  assert.equal(b.toString('ascii',8,12),'WEBP',name+' WebP signature');
  // Lossless WebP (VP8L) preserves cape-edge alpha more faithfully than
  // the original VP8X files. Both are valid browser-decoded transparent WebP.
  const kind=b.toString('ascii',12,16);
  let width,height,alpha;
  if(kind==='VP8X'){
   width=b.readUIntLE(24,3)+1;height=b.readUIntLE(27,3)+1;
   alpha=(b[20]&0x10)!==0;
  }else if(kind==='VP8L'){
   assert.equal(b[20],0x2f,'lossless WebP header signature');
   const bits=b.readUInt32LE(21);
   width=(bits&0x3fff)+1;height=((bits>>>14)&0x3fff)+1;
   alpha=((bits>>>28)&1)===1;
  }else assert.fail(name+' unsupported WebP chunk '+kind);
  assert.equal(width,meta.cols*meta.cell,name+' width not aligned');
  assert.equal(height,meta.rows*meta.cell,name+' height not aligned');
  assert.ok(alpha,'Alpha channel required: '+name);
 }
 assert.equal(Object.keys(V2_SPRITE_SCENES).length,8);
 assert.equal(V2_SPRITE_ATLASES.jump.cell,192);
 assert.equal(V2_SPRITE_ATLASES.double_jump.cell,192);
 assert.ok(V2_SPRITE_ATLASES.jump.file.includes('fixed'));
 assert.ok(V2_SPRITE_ATLASES.double_jump.file.includes('fixed'));
});
test('hero state selects idle, run, jump, double jump in both horizontal directions',()=>{
 const base={face:1,grounded:true,vx:0,vy:0,cycle:0,jumps:0,jumpAge:0};
 assert.equal(chooseV2Frame(base,0).scene,'idleRight');
 assert.equal(chooseV2Frame({...base,face:-1},0).scene,'idleLeft');
 assert.equal(chooseV2Frame({...base,vx:220},.5).scene,'runRight');
 assert.equal(chooseV2Frame({...base,face:-1,vx:-300},.5).scene,'runLeft');
 assert.deepEqual(GROUNDED_RUN_FRAMES,[0,4,5,6,7]);
 // No frames 1–3: those frames visibly put both feet in the air.
 for(let cycle=0;cycle<30;cycle+=.12){
  const right=chooseV2Frame({...base,vx:315,cycle},cycle);
  const left=chooseV2Frame({...base,vx:-315,face:-1,cycle},cycle);
  assert.ok(GROUNDED_RUN_FRAMES.includes(right.index));
  assert.equal(right.index,left.index,'both facings have the same planted-foot phase');
  assert.equal(chooseV2Frame({...base,vx:315,cycle},cycle+10).index,right.index,
    'running phase must follow world distance, not wall-clock time');
 }
 assert.equal(chooseV2Frame({...base,vx:315,cycle:0},.2).index,0);
 assert.equal(chooseV2Frame({...base,vx:315,cycle:1},.2).index,4);

 assert.equal(chooseV2Frame({...base,grounded:false,vy:-100,jumps:1,jumpAge:.15},.5).scene,'jumpRight');
 assert.equal(chooseV2Frame({...base,grounded:false,vy:-100,jumps:2,jumpAge:.15},.5).scene,'doubleRight');
 assert.equal(chooseV2Frame({...base,grounded:false,face:-1,vy:240,jumps:2,jumpAge:.35},.5).scene,'doubleLeft');
 assert.equal(chooseV2Frame({...base,flying:true},0).scene,'jumpRight');
 assert.equal(chooseV2Frame({...base,attack:{kind:'punch',age:0.07}},0),null,'existing combat animation remains available');
 assert.equal(chooseV2Frame({...base,castAge:.06},0).scene,'idleRight','generated body remains during power casting');
 assert.equal(chooseV2Frame({...base,attack:{kind:'punch',power:'strength'}},0).scene,'runRight','power punch can show the V2 hero');
 assert.equal(chooseV2Frame({...base,attack:{kind:'kick',power:'superKick'}},0).scene,'jumpRight','super kick can show the V2 hero');
});
test('V2-only powers advance through distinct cast and combo poses without altering hero state',()=>{
 const base={face:1,grounded:true,vx:0,cycle:0,castAge:1,dodgeAge:1};
 const immutable={...base,attack:{kind:'punch',power:'strength',age:.16}};
 const original=JSON.stringify(immutable);
 assert.equal(chooseV2Frame(immutable,0).scene,'runRight');
 assert.equal(JSON.stringify(immutable),original,'pose selection must not mutate gameplay state');
 const strength=[0,.09,.16,.24,.36].map(age=>
  chooseV2Frame({...base,attack:{kind:'punch',power:'strength',age}},0).index);
 assert.deepEqual(strength,[0,4,5,6,7],'strength winds up and follows through across five planted poses');
 const kicks=[0,.09,.17,.25].map(age=>
  chooseV2Frame({...base,attack:{kind:'kick',power:'superKick',age,comboIndex:0}},0).index);
 assert.deepEqual(kicks,[0,1,2,3],'super kick uses sequential frames');
 assert.equal(chooseV2Frame({...base,attack:{kind:'kick',power:'superKick',age:0,comboIndex:1}},0).index,1,
  'consecutive combo kicks begin at alternating frames');
 const casting=[.01,.08,.13,.2].map(castAge=>
  chooseV2Frame({...base,castAge},0).index);
 assert.deepEqual(casting,[0,2,3,4],'fireball advances through wind-up, charge, release and recovery poses');
 assert.equal(chooseV2Frame({...base,face:-1,v2Active:{roots:{}}},0).scene,'idleLeft');
 assert.equal(chooseV2Frame({...base,v2Active:{roots:{}}},0).index,2);
 assert.equal(chooseV2Frame({...base,v2Active:{whirlwind:{}}},0).index,4);
 assert.equal(chooseV2Frame({...base,v2Active:{roots:{}},vx:220},0).scene,'runRight',
  'active powers must not freeze running');
 assert.deepEqual(chooseV2Frame({...base,agile:true,dodgeAge:.05},0),
  {scene:'idleRight',index:4},'stationary agility dodge must keep its hero silhouette');
 assert.deepEqual(chooseV2Frame({...base,face:-1,vx:-280,agile:true,dodgeAge:.05},0),
  {scene:'runLeft',index:4},'moving agility dodge must use planted frames');
 assert.equal(chooseV2Frame({...base,attack:{kind:'punch',power:'unknown'}},0),null,
  'unknown attacks preserve original renderer fallback');
});

test('loader verifies every asset before drawing and falls back safely if decoding fails',async()=>{
 const loaded=[];
 const atlas=new V2GeneratedSprites({loader:async file=>{
  const pair=Object.entries(V2_SPRITE_ATLASES).find(([,meta])=>meta.file===file);
  loaded.push(file);
  return {width:pair[1].cols*pair[1].cell,height:pair[1].rows*pair[1].cell};
 }});
 assert.equal(atlas.draw({},0,0,{},0),false);
 assert.equal(await atlas.preload(),true);
 assert.equal(loaded.length,3);
 const ops=[],ctx={save(){ops.push('save')},restore(){ops.push('restore')},drawImage(...args){ops.push(args)},set imageSmoothingEnabled(v){},set imageSmoothingQuality(v){}};
 assert.equal(atlas.draw(ctx,300,550,{face:-1,grounded:true,vx:-185},.3),true);
 const drawn=ops.find(x=>Array.isArray(x));
 assert.ok(drawn&&drawn.length===9,'must use cropped atlas frame not show an entire storyboard poster');
 assert.equal(drawn[3],160);
 assert.equal(drawn[4],160);
 // Jump uses the new 192px transparent safety cells, with no change to
 // the in-world hero size, collision, health, or physics.
 ops.length=0;
 assert.equal(atlas.draw(ctx,300,550,{face:1,grounded:false,vy:-180,jumps:1,jumpAge:.18},.3),true);
 const jumpDraw=ops.find(x=>Array.isArray(x));
 assert.equal(jumpDraw[3],192);assert.equal(jumpDraw[4],192);
 assert.equal(jumpDraw[7],156);assert.equal(jumpDraw[8],156);
 assert.equal(ops[0],'save');assert.equal(ops.at(-1),'restore');
 const broken=new V2GeneratedSprites({loader:async()=>{throw Error('broken atlas')}});
 assert.equal(await broken.preload(),false);
 assert.equal(broken.draw(ctx,0,0,{},0),false);
});
test('V2-only ability overlays cover all nine powers plus villain merge without affecting simulation',()=>{
 assert.equal(V2_POWER_PREVIEW_VERSION,'v2-power-vfx-prototype-v2');
 const hero={face:1,castAge:.01,steel:true,agile:true,flying:true,vx:350,attack:{kind:'punch',power:'strength'}};
 const game={hero,powers:{active:{roots:{},whirlwind:{}},speed:.5},legendary:{active:'venomis'},mergeEffects:[{id:'venomis'}]};
 const before=JSON.stringify(game);
 const flags=v2PowerEffectFlags(game);
 for(const k of ['fireball','strength','steel','roots','whirlwind','agility','flight','speed','villainMerge'])assert.equal(flags[k],true,k);
 assert.equal(flags.superKick,false);
 const ops=[];
 const ctx={save(){ops.push('save')},restore(){ops.push('restore')},beginPath(){},moveTo(){},lineTo(){},stroke(){ops.push('stroke')},ellipse(){ops.push('ellipse')},arc(){ops.push('arc')},fill(){ops.push('fill')}};
 const result=drawV2PowerPreview(ctx,game,{x:100,y:170},2);
 assert.equal(result.fireball,true);
 assert.ok(ops.length>15,'V2-specific ability effects must be drawn');
 assert.equal(ops[0],'save');assert.equal(ops.at(-1),'restore');
 assert.equal(JSON.stringify(game),before,'Effects never change health, powers or saves');
 const kick=v2PowerEffectFlags({hero:{attack:{power:'superKick'}}});
 assert.equal(kick.superKick,true);
});
test('sprite test route is limited to the isolated public 0000000000 code',async()=>{
 assert.equal(V2_TEST_CODE,'0000000000');
 assert.ok(isV2TestCode('0000000000'));
 assert.ok(!isV2TestCode('1234567890'));
 const app=await readFile(new URL('../app.mjs',import.meta.url),'utf8');
 const renderer=await readFile(new URL('../renderer.mjs',import.meta.url),'utf8');
 assert.ok(app.includes('if(v2TestHero){\n renderer.v2SpriteTest=true;'));
 assert.ok(app.includes("button.id='v2-sprite-toggle'"),'compare button available only to test hero');
 assert.ok(renderer.includes('this.v2SpriteTest&&v2GeneratedSprites.draw('));
 assert.ok(renderer.includes("drawHero(c,pos.x,pos.y"),'existing game renderer remains as fallback');
});
