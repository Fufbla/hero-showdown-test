import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LOOK,LOOK_OPTIONS,LOOK_RANGES,COLOR_FIELDS,sanitizeLook,validateName,STARTER_OUTFIT,costumePalette } from '../appearance.mjs';
import { Game,STEP,SAVE_KEY,decodeSave,ATTACKS } from '../core.mjs';
import { LocalHeroStore,PROFILE_KEY,parseProfiles } from '../saves.mjs';
import { dimensions,poseFor,previewHero,PREVIEW_POSES,CAPE_LENGTH,animationState } from '../hero-rig.mjs';
const memory=()=>{const values=new Map();return{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),values};};
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const close=(a,b,tolerance=.001)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
const variants=[];
for(const build of LOOK_OPTIONS.build)for(const height of LOOK_RANGES.height)for(const torso of LOOK_RANGES.torso)for(const legs of LOOK_RANGES.legs)for(const arms of LOOK_RANGES.arms)for(const shoulders of LOOK_RANGES.shoulders)variants.push(sanitizeLook({build,height,torso,legs,arms,shoulders,muscle:height<1?0:1}));

test('all appearance enums, colors, proportion extremes and cape survive serialization',()=>{
  for(const [key,values] of Object.entries(LOOK_OPTIONS))for(const value of values)assert.equal(decodeSave(new Game({look:{[key]:value}}).save()).look[key],value);
  for(const [key,values] of Object.entries(LOOK_RANGES))for(const value of values)assert.equal(decodeSave(new Game({look:{[key]:value}}).save()).look[key],value);
  for(const key of COLOR_FIELDS)assert.equal(decodeSave(new Game({look:{[key]:'#d12fc3'}}).save()).look[key],'#d12fc3');
  assert.equal(decodeSave(new Game({look:{cape:false}}).save()).look.cape,false);
});
test('invalid appearance values never become canvas colors or nonfinite geometry',()=>{
  const look=sanitizeLook({height:Infinity,arms:-500,muscle:700,hair:'upload',skin:'url(evil)',eyes:'red',cape:'false',name:'<script>'});
  assert.equal(look.height,1);assert.equal(look.arms,.85);assert.equal(look.muscle,1);assert.equal(look.skin,DEFAULT_LOOK.skin);assert.equal(look.name,DEFAULT_LOOK.name);assert.equal(look.hair,'curls');
});
test('hero names validate Unicode and reject empty, control, markup, numeric-only and overlong names',()=>{
  for(const name of['Aster','Étoile 7',"O’Nova",'海の英雄','  Silver   Wave  '])assert.equal(validateName(name).ok,true,name);
  for(const name of['','  ','a','12345','Nova\nGuard','<img>','Hero/One','A'.repeat(23),'Hero\u202eName','Hero🙂'])assert.equal(validateName(name).ok,false,name);
  assert.equal(validateName('  Silver   Wave  ').name,'Silver Wave');
});
test('starter recolors are isolated from fixed-color future equipment',()=>{
  const look=sanitizeLook({suit:'#ff0000'});assert.equal(costumePalette(look,STARTER_OUTFIT).suit,'#ff0000');
  for(const origin of['purchased','earned','rare','legendary']){
    const outfit={id:'future-item',origin,palette:{suit:'#123456',trim:'#234567',emblemColor:'#345678',capeColor:'#456789'}};
    const game=new Game({save:decodeSave(JSON.stringify({version:2,look,outfit}))});assert.deepEqual(costumePalette({...look,suit:'#ffffff'},game.outfit),outfit.palette);
  }
});
test('128 extreme proportion combinations share identical combat and collision outcomes',()=>{
  const trace=look=>{const g=new Game({look});const frames=[];for(let i=0;i<360;i++){g.step(STEP,{move:i<180?1:-1,run:i%80<40,jump:[20,32,180,195].includes(i),punchHeld:i%70<20,kickHeld:i%70>40});if(i%10===0)frames.push([g.heroBox(),g.attackBox(),g.hero.hp,g.hero.x,g.hero.y,g.hero.xp,g.hero.coins,g.enemies.map(e=>[e.x,e.y,e.hp,e.state])]);}return frames;};
  const baseline=trace(DEFAULT_LOOK);for(const look of variants)assert.deepEqual(trace(look),baseline);
});
test('all poses maintain connected, constant-length limbs over all proportion extremes',()=>{
  for(const look of variants)for(const state of PREVIEW_POSES)for(const time of[.03,.12,.27,.55,1.1]){
    const pose=poseFor(look,previewHero(state,time),time),d=dimensions(look);
    for(const arm of pose.arms){close(distance(arm[0],arm[1]),d.arm*.48);close(distance(arm[1],arm[2]),d.arm*.52);}
    for(const leg of pose.legs){close(distance(leg[0],leg[1]),d.leg*.5);close(distance(leg[1],leg[2]),d.leg*.5);}
    for(const part of[...pose.arms.flat(),...pose.legs.flat(),...pose.cape,pose.head])assert.ok(part.every(Number.isFinite));
  }
});
test('standing soles stay on the floor for every body build',()=>{
  for(const look of variants)for(const time of[0,.25,1.1])for(const leg of poseFor(look,previewHero('idle',time),time).legs)close(leg[2][1],-5);
});
test('walk and run stance feet stay planted without limb stretch at every proportion',()=>{
  for(const look of variants)for(const state of['walk','run'])for(let t=0;t<1;t+=.05){
    const h=previewHero(state,t),p=poseFor(look,h,t),d=dimensions(look),stride=d.leg*(state==='run'?.46:.26),phase=(h.cycle*52/(stride*4))%1;
    for(let i=0;i<2;i++)if((phase+i*.5)%1<.5)close(p.legs[i][2][1],-5);
  }
});
test('active punch and kick visual endpoints do not scale with body height',()=>{
  for(const look of variants)for(const kind of['punch','kick']){
    const h=previewHero(kind,ATTACKS[kind].startup+.02),p=poseFor(look,h,0);
    const contact=kind==='punch'?p.arms[0][2]:p.legs[0][2];close(contact[0],kind==='punch'?54:56);close(contact[1],kind==='punch'?-54:-39);
  }
});
test('capes use the same cloth length for every pose, height and front/back view',()=>{
  for(const look of variants)for(const state of PREVIEW_POSES)for(const view of['front','back','game']){
    const h=previewHero(state,.4),p=poseFor(look,h,.4,view);let length=0;for(let i=1;i<p.cape.length;i++)length+=distance(p.cape[i-1],p.cape[i]);close(length,CAPE_LENGTH);
    if(h.grounded)for(const point of p.cape)assert.ok(point[1]<=-3.999);
  }
});
test('jump, double-jump, land, hurt, defeat and respawn have explicit animation states',()=>{
  const g=new Game();g.enemies=[];g.step(STEP,{jump:true});assert.equal(animationState(g.hero),'jump');g.step(STEP,{jump:true});assert.equal(animationState(g.hero),'double-jump');
  for(let i=0;i<100&& !g.hero.grounded;i++)g.step(STEP);assert.equal(animationState(g.hero),'land');
  g.hero.invulnerable=0;g.hurt(10,0);assert.equal(animationState(g.hero),'hurt');g.defeat();assert.equal(animationState(g.hero),'defeat');g.step(STEP);assert.ok(g.hero.defeatAge>0);g.respawn();assert.equal(animationState(g.hero),'respawn');
});
test('customization survives checkpoint changes, defeat, respawn and reload',()=>{
  const look=sanitizeLook({...variants.at(-1),name:'Golden Current',hair:'braids',emblem:'sun',eyes:'#60ccff',cape:false}),g=new Game({look});g.hero.coins=37;g.hero.xp=42;g.checkpoint=2;g.respawn();g.defeat();g.respawn();
  const restored=new Game({save:decodeSave(g.save())});assert.deepEqual(restored.look,look);assert.equal(restored.hero.coins,37);assert.equal(restored.hero.xp,37);assert.equal(restored.checkpoint,2);
});
test('legacy Phase 1 migration retains progress, colors and untouched backup',()=>{
  const storage=memory(),legacy=JSON.stringify({version:1,look:{name:'Old Hero',build:'full',skin:'#f0c290',trim:'#12ff34',hair:'locs',height:1.1,legs:.9,cape:false},level:6,xp:75,coins:201,checkpoint:2,kills:12,species:['bottle','slime'],reachedEnd:true});
  storage.setItem(SAVE_KEY,legacy);const store=new LocalHeroStore(storage),slot=store.slot(0);assert.equal(storage.getItem(SAVE_KEY),legacy);assert.equal(slot.snapshot.look.emblemColor,'#12ff34');assert.equal(slot.snapshot.look.cape,false);assert.equal(slot.snapshot.level,6);assert.equal(slot.snapshot.coins,201);assert.equal(slot.snapshot.checkpoint,2);assert.equal(slot.snapshot.reachedEnd,true);assert.equal(store.slot(1),null);assert.deepEqual(new LocalHeroStore(storage).slot(0),slot);
});
test('three independent slots preserve names, IDs, regions, timestamps and progress',()=>{
  const storage=memory();let serial=0;const store=new LocalHeroStore(storage,{id:()=>`hero-${++serial}`,now:()=> '2026-10-30T12:30:00.000Z'});
  for(let i=0;i<3;i++){const game=new Game({look:{name:`Guardian ${i}`}});game.hero.coins=i*21;assert.equal(store.writeSlot(i,game.save(),{region:`Board ${i}`,expectedId:null}).ok,true);}
  const restored=new LocalHeroStore(storage);for(let i=0;i<3;i++){const slot=restored.slot(i);assert.equal(slot.snapshot.look.name,`Guardian ${i}`);assert.equal(slot.snapshot.coins,i*21);assert.equal(slot.id,`hero-${i+1}`);assert.equal(slot.lastRegion,`Board ${i}`);assert.equal(slot.updatedAt,'2026-10-30T12:30:00.000Z');}
});
test('confirmed deletion only removes its slot and never reimports the legacy hero',()=>{
  const storage=memory();storage.setItem(SAVE_KEY,JSON.stringify({version:1,look:DEFAULT_LOOK,coins:9}));const store=new LocalHeroStore(storage);store.writeSlot(1,new Game().save());const other=store.slot(1);assert.equal(store.deleteSlot(0,'wrong-id').ok,false);assert.equal(store.deleteSlot(0,store.slot(0).id).ok,true);const reloaded=new LocalHeroStore(storage);assert.equal(reloaded.slot(0),null);assert.deepEqual(reloaded.slot(1),other);assert.ok(storage.getItem(SAVE_KEY));
});
test('malformed and future profiles are preserved without writes',()=>{
  for(const raw of['{broken',JSON.stringify({version:99,slots:[null,null,null]}),JSON.stringify({version:2,slots:[{},null,null]})]){const storage=memory();storage.setItem(PROFILE_KEY,raw);const store=new LocalHeroStore(storage);assert.equal(store.writable,false);assert.equal(store.writeSlot(0,new Game().save()).ok,false);assert.equal(storage.getItem(PROFILE_KEY),raw);assert.equal(parseProfiles(raw),null);}
});
test('quota or privacy failures retain the current session and report no durable save',()=>{
  const storage={getItem:()=>null,setItem:()=>{throw Error('QuotaExceeded');}},store=new LocalHeroStore(storage);const result=store.writeSlot(0,new Game({look:{name:'Session Hero'}}).save());assert.equal(result.ok,false);assert.equal(result.retained,true);assert.equal(store.durable,false);assert.equal(store.slot(0).snapshot.look.name,'Session Hero');
});
test('a second tab cannot overwrite another tab’s new hero or resurrect a deleted hero',()=>{
  const storage=memory(),first=new LocalHeroStore(storage),second=new LocalHeroStore(storage);first.writeSlot(0,new Game({look:{name:'First Hero'}}).save());assert.equal(second.writeSlot(0,new Game({look:{name:'Other Hero'}}).save()).ok,false);assert.equal(new LocalHeroStore(storage).slot(0).snapshot.look.name,'First Hero');
  const third=new LocalHeroStore(storage),id=third.slot(0).id;first.deleteSlot(0,id);assert.equal(third.writeSlot(0,new Game().save(),{expectedId:id}).ok,false);assert.equal(new LocalHeroStore(storage).slot(0),null);
});
