import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ATTACKS,Game} from '../core.mjs';
import {V2GeneratedSprites,V2_SPRITE_ATLASES} from '../v2-sprites/runtime.mjs';
import {V2BasicCombatSprites,selectBasicCombatFrame,BASIC_COMBAT_ART,BASIC_COMBAT_SCALE} from '../v2-sprites/basic-combat.mjs';

const hero=(kind,age=0,face=1)=>({face,grounded:true,stun:0,attack:{kind,age,face}});
const baseLoader=async file=>{
 const meta=Object.values(V2_SPRITE_ATLASES).find(x=>x.file===file);
 return {file,width:meta.cols*meta.cell,height:meta.rows*meta.cell};
};
const combatLoader=async file=>({file,width:1254,height:1254});
function drawingContext(){
 const calls=[];
 return {calls,save(){},restore(){},drawImage(...args){calls.push(args);}};
}

test('approved combat files are transparent lossless WebP with complete source cells',async()=>{
 for(const [kind,art] of Object.entries(BASIC_COMBAT_ART)){
  const bytes=await readFile(new URL('../v2-sprites/'+art.file,import.meta.url));
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
  assert.equal(bytes.toString('ascii',12,16),'VP8L','preserve approved character pixels');
  const bits=bytes.readUInt32LE(21);
  assert.equal((bits&0x3fff)+1,art.width);
  assert.equal(((bits>>>14)&0x3fff)+1,art.height);
  assert.equal((bits>>>28)&1,1,'sprites require alpha transparency');
  for(const direction of ['right','left']){
   assert.equal(art[direction].length,8);
   for(const f of art[direction]){
    assert.ok(Number.isInteger(f.x)&&Number.isInteger(f.y));
    assert.ok(Number.isInteger(f.width)&&Number.isInteger(f.height));
    assert.ok(f.x>=0&&f.y>=0&&f.x+f.width<=art.width&&f.y+f.height<=art.height,kind+' source cell escaped atlas');
    assert.ok(f.anchorX>0&&f.anchorX<f.width&&f.anchorY>0&&f.anchorY<f.height);
   }
  }
  assert.equal(art.right[0].y,0);
  assert.equal(art.right[4].y,314,'pose 4 advances to second source row');
  assert.equal(art.left[0].y,627);
  assert.equal(art.left[4].y,941,'left recovery advances to fourth row');
 }
});

test('visible impact and recovery follow actual basic attack hit windows',()=>{
 for(const kind of ['punch','kick']){
  const {startup,active,duration}=ATTACKS[kind];
  const contact=kind==='punch'?3:4;
  for(const face of [1,-1]){
   assert.equal(selectBasicCombatFrame(hero(kind,0,face)).index,0);
   assert.ok(selectBasicCombatFrame(hero(kind,startup-1e-6,face)).index<contact);
   assert.equal(selectBasicCombatFrame(hero(kind,startup,face)).index,contact);
   assert.equal(selectBasicCombatFrame(hero(kind,startup+active-1e-6,face)).index,4);
   assert.equal(selectBasicCombatFrame(hero(kind,startup+active,face)).index,5);
   assert.equal(selectBasicCombatFrame(hero(kind,duration-1e-6,face)).index,7);
   assert.equal(selectBasicCombatFrame(hero(kind,duration,face)),null);
   const seen=new Set();
   for(let age=0;age<duration;age+=.001)seen.add(selectBasicCombatFrame(hero(kind,age,face)).index);
   assert.deepEqual([...seen],[0,1,2,3,4,5,6,7]);
  }
 }
});

test('facing, airborne strikes and cancellation preserve gameplay ownership',()=>{
 const h=hero('punch',.08,-1);h.face=1;h.grounded=false;h.vx=300;h.vy=-250;
 const before=structuredClone(h);
 assert.equal(selectBasicCombatFrame(h).direction,'left','strike keeps its captured hitbox direction');
 assert.equal(selectBasicCombatFrame({...h,attack:{...h.attack,age:0}}).index,0,'held next strike restarts');
 for(const interrupted of [{...h,dead:true},{...h,stun:.1},{...h,attack:null},
  {...h,attack:{...h.attack,power:'other'}},{...h,attack:{kind:'unknown',age:0}}])
   assert.equal(selectBasicCombatFrame(interrupted),null);
 assert.equal(selectBasicCombatFrame({...h,attack:{...h.attack,power:'strength'}}).kind,'punch',
   'Super Strength uses the same polished animated blue-cape punch under the golden VFX');
 assert.equal(selectBasicCombatFrame({...h,attack:{kind:'kick',face:-1,age:.08,power:'superKick'}}).kind,'kick',
   'Super Kick uses the same polished animated blue-cape kick under the golden VFX');
 assert.deepEqual(h,before,'render selection must never change position, physics, or attacks');
});

test('Speed is applied once by simulation, with eight source poses available to both attacks',()=>{
 for(const kind of ['punch','kick']){
  const game=new Game();game.enemies=[];game.powers.data.levels.speed=20;
  assert.equal(game.powers.attackRate,1.5);
  game.startAttack(kind);game.step(1/60);
  assert.ok(Math.abs(game.hero.attack.age-.025)<1e-9);
  const f=selectBasicCombatFrame(game.hero);
  assert.equal(f.index,1,'do not apply the 1.5 attack rate again in visual selection');
 }
});

test('combat draw uses one cropped pose and a fixed scale with registered feet',async()=>{
 const sprites=new V2BasicCombatSprites({loader:combatLoader});
 assert.equal(await sprites.preload(),true);
 const ctx=drawingContext();
 for(const kind of ['punch','kick'])for(const face of [1,-1]){
  const h=hero(kind,ATTACKS[kind].startup,face),f=selectBasicCombatFrame(h);
  assert.equal(sprites.draw(ctx,400,600,h,1.5),true);
  const call=ctx.calls.at(-1),s=BASIC_COMBAT_SCALE*1.5;
  assert.equal(call.length,9,'whole sprite boards must never enter gameplay');
  assert.deepEqual(call.slice(1,5),[f.x,f.y,f.width,f.height]);
  assert.deepEqual(call.slice(5),[400-f.anchorX*s,600-f.anchorY*s,f.width*s,f.height*s]);
  assert.ok(call[3]<400&&call[4]<400,'source rectangle contains exactly one pose');
  assert.ok(Math.abs(call[6]+f.anchorY*s-600)<1e-9,'feet stay at the physics-controlled baseline');
 }
});

test('optional combat loading cannot hold movement hostage or disable another attack',async()=>{
 let finish;
 const waiting=new Promise(resolve=>{finish=resolve;});
 const sprites=new V2GeneratedSprites({loader:baseLoader,combatLoader:()=>waiting});
 assert.equal(await sprites.preload(),true,'movement resolves while attack images are still pending');
 assert.equal(sprites.ready,true);
 assert.equal(sprites.basicCombat.images.size,0);
 const ctx=drawingContext();
 assert.equal(sprites.draw(ctx,200,550,{face:1,grounded:true,vx:0},0),true);
 assert.ok(ctx.calls.at(-1)[0].file.includes('idle_run'));
 finish({width:1254,height:1254});
 assert.equal(await sprites.basicCombat.preload(),true);
 assert.equal(sprites.draw(ctx,200,550,hero('punch',.08),0),true);
 assert.ok(ctx.calls.at(-1)[0].width===1254);

 const partial=new V2GeneratedSprites({loader:baseLoader,combatLoader:async file=>{
  if(file.includes('kick'))throw Error('missing kick artwork');
  return combatLoader(file);
 }});
 assert.equal(await partial.preload(),true);
 assert.equal(await partial.basicCombat.preload(),false);
 assert.equal(partial.draw(ctx,200,550,hero('punch',.08),0),true);
 assert.equal(partial.draw(ctx,200,550,hero('kick',.15),0),false,'missing art retains original combat fallback');
 assert.equal(partial.draw(ctx,200,550,{face:-1,grounded:true,vx:-185},0),true,'running stays available');
 assert.ok(ctx.calls.at(-1)[0].file.includes('idle_run'));
});
