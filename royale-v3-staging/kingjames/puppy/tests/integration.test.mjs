import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

// Run unchanged under either the production or isolated test module graph.
const [{COLLECTION,costumeForState},{COLLECTION:ORIGINAL},{FASHION_OUTFITS,ROBOT_OUTFIT,PUPPY_OUTFIT,VICE_OUTFIT},{PUPPY_STATES,validatePuppyManifest},{CostumeEngine},{Game,decodeSave,ATTACKS},{catalogIndex,cosmeticTransaction},{styleCDefault},{COLLECTION:COMPATIBILITY}]=await Promise.all([
 import('../../../../royale/fashion/catalog.mjs'),import('../../../costumes/catalog.mjs?fashion-base=1'),import('../../../../royale/fashion/definitions.mjs'),import('../../../../royale/fashion/puppy.mjs'),import('../../../../royale/fashion/engine.mjs'),
 import('../../../../royale/core.mjs'),import('../../../../royale/cosmetics/state.mjs'),import('../../../../royale/style-c-defaults.mjs'),import('../catalog.mjs')
]);
const PUPPY_ID=PUPPY_OUTFIT.id;
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
const options={canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u)),jsonLoader:async u=>JSON.parse(await readFile(u))};
const index=catalogIndex({sets:COLLECTION}),puppy=COLLECTION.find(o=>o.id===PUPPY_ID);
function transact(game,type){
 const r=cosmeticTransaction({state:game.cosmetics,look:game.look,coins:game.hero.coins,index,
  operation:{type,id:PUPPY_ID,confirmed:true,revision:game.cosmetics.revision},safe:true,atWardrobe:true});
 if(r.ok){game.cosmetics=r.state;game.hero.coins=r.coins;}return r;
}
const baseHero=()=>({face:1,grounded:true,vx:0,vy:0,dead:false,respawnAge:100,stun:0,castAge:100,jumpAge:100,jumps:0,landing:0,invulnerable:0});

test('Fancy Costume is shared by production and test alongside Vice without duplicating or changing the previous 29 outfits',()=>{
 assert.equal(puppy.id,'golden-puppy-costume');assert.equal(puppy.name,'Fancy Costume');assert.equal(puppy.coinPrice,700);assert.equal(puppy.unisex,true);assert.equal(puppy.hideHair,true);
 assert.equal(COLLECTION.length,31);assert.equal(new Set(COLLECTION.map(o=>o.id)).size,31);assert.strictEqual(COMPATIBILITY,COLLECTION);
 assert.equal(ORIGINAL.length,22);assert.deepEqual(COLLECTION.slice(0,22),ORIGINAL);
 const previous=COLLECTION.filter(o=>o.id!==PUPPY_ID&&o.id!==VICE_OUTFIT.id);
 assert.deepEqual(previous.map(o=>o.id),[...ORIGINAL,...FASHION_OUTFITS,ROBOT_OUTFIT].map(o=>o.id));
 assert.deepEqual(COLLECTION.slice(29).map(o=>o.id),[PUPPY_ID,VICE_OUTFIT.id]);
 assert.equal(COLLECTION.find(o=>o.id===ROBOT_OUTFIT.id).coinPrice,0);
});

for(const presentation of ['male','female'])test(presentation+' hero buys for 700, keeps existing clothing, equips, reloads and removes without changing appearance or progress',()=>{
 const game=new Game({look:styleCDefault(presentation)});game.hero.coins=10000;
 const old=ORIGINAL.find(o=>o.id==='stuffed-animal-costume');
 game.cosmetics={version:1,revision:7,owned:[old.pieces[0].id],equipped:{fullbody:old.pieces[0].id},visible:true};
 const before=JSON.parse(game.save());
 let result=transact(game,'purchase');assert(result.ok,result.error);assert.equal(game.hero.coins,9300);
 assert.deepEqual(game.cosmetics.equipped,before.cosmetics.equipped,'A purchase must not equip automatically');
 assert.deepEqual(game.cosmetics.owned,[old.pieces[0].id,PUPPY_ID+'.fullbody']);
 result=transact(game,'equip');assert(result.ok,result.error);
 const restored=new Game({save:decodeSave(game.save())});assert.equal(costumeForState(restored.cosmetics,restored.look)?.id,PUPPY_ID);
 const after=JSON.parse(restored.save());
 for(const key of ['look','level','xp','inventory','powers','economy','world'])assert.deepEqual(after[key],before[key],key+' changed');
 const unchanged=restored.save();result=transact(restored,'purchase');assert.equal(result.ok,false);assert.match(result.error,/Already owned/);assert.equal(restored.save(),unchanged);
 result=transact(restored,'unequip');assert(result.ok,result.error);assert.equal(restored.hero.coins,9300);assert.deepEqual(restored.cosmetics.owned,game.cosmetics.owned);assert.deepEqual(restored.cosmetics.equipped,{});
});

test('previous Golden Puppy owners retain Fancy Costume, their selected outfit and their exact balance after promotion',()=>{
 for(const presentation of ['male','female']){
  const game=new Game({look:styleCDefault(presentation)});game.hero.coins=123;
  game.cosmetics={version:1,revision:9,owned:['stuffed-animal-costume.fullbody',PUPPY_ID+'.fullbody'],equipped:{fullbody:PUPPY_ID+'.fullbody'},visible:true};
  const saved=game.save(),restored=new Game({save:decodeSave(saved)});
  assert.equal(restored.save(),saved);assert.equal(costumeForState(restored.cosmetics,restored.look)?.name,'Fancy Costume');
  assert.equal(transact(restored,'purchase').ok,false);assert.equal(restored.hero.coins,123);
  assert(transact(restored,'unequip').ok);assert(transact(restored,'equip').ok);assert.equal(restored.hero.coins,123);
 }
});

test('insufficient funds and stale wardrobe revision never debit or change ownership',()=>{
 const game=new Game({look:styleCDefault('male')});game.hero.coins=699;
 const before=game.save();const result=transact(game,'purchase');assert.equal(result.ok,false);assert.match(result.error,/Not enough coins/);assert.equal(game.save(),before);
 game.hero.coins=10000;const next=game.save();
 const stale=cosmeticTransaction({state:game.cosmetics,look:game.look,coins:game.hero.coins,index,
  operation:{type:'purchase',id:PUPPY_ID,confirmed:true,revision:game.cosmetics.revision+1},safe:true,atWardrobe:true});
 assert.equal(stale.ok,false);assert.equal(game.save(),next);
});

test('all authored frames render inside the shared body cell and remove the magenta placeholder while keeping customized faces',async()=>{
 const engine=new CostumeEngine(options);assert(await engine.preload(PUPPY_ID),engine.error);
 const {manifest:m,atlas}=engine.outfits.get(PUPPY_ID);validatePuppyManifest(m,atlas);
 assert.equal(m.label,'Fancy Costume');assert.equal(m.frames.length,48);
 assert.equal(m.flightPose,'authored-horizontal');assert(new Set(m.animations.run.frames).size>=8);
 const looks=[{...styleCDefault('male'),skin:'#7a4d30',hair:'none'},{...styleCDefault('female'),skin:'#f0bd92',hairColor:'#37251c'}];
 let changedFaces=0;const hashes=[];
 for(let f=0;f<m.frames.length;f++){
  const variants=looks.map(look=>engine.compose(PUPPY_ID,f,look).getContext('2d').getImageData(0,0,256,256).data);
  hashes.push(createHash('sha256').update(variants[0]).digest('hex'));
  for(const pixels of variants){
   let count=0,keyed=0,edge=0;
   for(let p=0;p<256*256;p++){
    const i=p*4,[r,g,b,a]=pixels.subarray(i,i+4);if(a<32)continue;count++;
    if(r>70&&b>70&&r>g*1.5&&b>g*1.5)keyed++;
    if(p%256===0||p%256===255||p<256||p>=255*256)edge++;
   }
   assert(count>500,'Frame '+f+' has no visible costume');assert.equal(keyed,0,'Magenta placeholder remains in frame '+f);assert.equal(edge,0,'Frame '+f+' is clipped at its cell edge');
  }
  const [x,y,w,h]=m.frames[f].face;let difference=0;
  for(let py=Math.ceil(y);py<Math.floor(y+h);py++)for(let px=Math.ceil(x);px<Math.floor(x+w);px++){
   const i=(py*256+px)*4;if(variants[0][i]!==variants[1][i]||variants[0][i+1]!==variants[1][i+1]||variants[0][i+2]!==variants[1][i+2])difference++;
  }
  if(difference>10)changedFaces++;
 }
 assert.equal(changedFaces,m.frames.length,'Every open hood must show the saved appearance');
 assert.equal(new Set(m.animations.run.frames.map(f=>hashes[f])).size,m.animations.run.frames.length,'Running must use distinct authored poses');
 for(const action of ['punch','kick']){
  const frames=m.animations[action].frames;assert.notEqual(hashes[frames[0]],hashes[frames[2]],action+' contact must differ from windup');
 }
});

test('saved hair remains visible only inside the authored hood opening in every pose',async()=>{
 const engine=new CostumeEngine(options);assert(await engine.preload(PUPPY_ID),engine.error);
 const m=engine.outfits.get(PUPPY_ID).manifest,look={...styleCDefault('female'),hairColor:'#663b1e'};let changed=0;
 for(let f=0;f<m.frames.length;f++){
  const bare=engine.compose(PUPPY_ID,f,{...look,hair:'none'}).getContext('2d').getImageData(0,0,256,256).data;
  const haired=engine.compose(PUPPY_ID,f,{...look,hair:'high-ponytail'}).getContext('2d').getImageData(0,0,256,256).data;
  const mask=engine.masks(PUPPY_ID,f).mask.getContext('2d').getImageData(0,0,256,256).data;
  for(let i=0;i<bare.length;i+=4)if(bare[i]!==haired[i]||bare[i+1]!==haired[i+1]||bare[i+2]!==haired[i+2]||bare[i+3]!==haired[i+3]){
   assert(mask[i+3]>0,'Hair escaped the puppy hood in frame '+f);changed++;
  }
 }
 assert(changed>100,'The selected hairstyle is missing from the hood opening');
});

test('every runtime action selects authored puppy frames, preserves hero state and mirrors left/right',async()=>{
 const engine=new CostumeEngine(options);assert(await engine.preload(PUPPY_ID),engine.error);
 const m=engine.outfits.get(PUPPY_ID).manifest,canvas=createCanvas(320,320),c=canvas.getContext('2d');
 const variants={
  idle:{},run:{vx:260},jump:{grounded:false,vy:-350,jumpAge:.12,jumps:1},doubleJump:{grounded:false,vy:-350,jumpAge:.12,jumps:2},fall:{grounded:false,vy:350},land:{landing:.08},
  punch:{attack:{kind:'punch',age:ATTACKS.punch.startup+.01}},kick:{attack:{kind:'kick',age:ATTACKS.kick.startup+.01}},
  strength:{attack:{kind:'punch',power:'strength',age:ATTACKS.punch.startup+.01}},superKick:{attack:{kind:'kick',power:'superKick',age:ATTACKS.kick.startup+.01}},
  fireball:{castAge:.2},fireballAir:{castAge:.2,grounded:false,vy:0},
  flightStart:{grounded:false,flying:true,vx:120,v2Active:{flight:{age:0}}},fly:{grounded:false,flying:true,vx:120,v2Active:{flight:{age:1}}},hover:{grounded:false,flying:true,vx:0,v2Active:{flight:{age:1}}},
  hurt:{stun:.1,hurtAge:.06},defeat:{dead:true,defeatAge:.3},recovery:{respawnAge:.3},seismicSmash:{powerPose:{id:'seismicSmash',age:.25,duration:.58,face:1}}
 };
 for(const direction of [-1,1])for(const [state,extra]of Object.entries(variants)){
  const hero={...baseHero(),...structuredClone(extra),face:direction};if(hero.attack)hero.attack.face=direction;
  const before=structuredClone(hero);c.clearRect(0,0,320,320);
  const result=engine.draw(c,160,285,styleCDefault('female'),hero,.48,{id:PUPPY_ID});
  assert(result,state);assert.equal(engine.lastFrame.state,state);assert.equal(engine.lastFrame.direction,direction);
  assert(m.animations[state].frames.includes(engine.lastFrame.frame));assert.deepEqual(hero,before);assert.equal(engine.lastFrame.hairContained,true);
 }
 const hero=baseHero();engine.draw(c,160,285,styleCDefault('male'),hero,0,{id:PUPPY_ID});hero.vx=240;
 engine.draw(c,160,285,styleCDefault('male'),hero,.01,{id:PUPPY_ID});assert.equal(engine.lastFrame.state,'start');
 engine.draw(c,160,285,styleCDefault('male'),hero,1,{id:PUPPY_ID});assert.equal(engine.lastFrame.state,'run');hero.vx=0;
 engine.draw(c,160,285,styleCDefault('male'),hero,1.01,{id:PUPPY_ID});assert.equal(engine.lastFrame.state,'stop');
 assert.equal(PUPPY_STATES.length,Object.keys(variants).length+2);
});

test('Steel Body temporarily renders its existing transformation and returns to the equipped puppy',async()=>{
 const engine=new CostumeEngine(options);assert(await engine.preload(PUPPY_ID),engine.error);
 const game=new Game({look:styleCDefault('female')});game.hero.coins=10000;
 assert(transact(game,'purchase').ok);assert(transact(game,'equip').ok);const wardrobe=structuredClone(game.cosmetics),look=structuredClone(game.look);
 const c=createCanvas(320,320).getContext('2d'),hero={...baseHero(),steel:true,v2Active:{steel:{age:1}}};
 assert(engine.draw(c,160,285,game.look,hero,1,{id:PUPPY_ID}));assert.equal(engine.lastFrame.outfit,'steel-universal');assert.equal(engine.lastFrame.hairVisible,false);
 hero.steel=false;assert(engine.draw(c,160,285,game.look,hero,1.1,{id:PUPPY_ID}));assert.equal(engine.lastFrame.outfit,PUPPY_ID);assert.equal(engine.lastFrame.hairContained,true);
 assert.deepEqual(game.cosmetics,wardrobe);assert.deepEqual(game.look,look);assert.equal(game.hero.coins,9300);
});

test('a failed puppy asset request can retry without leaving a broken outfit cached',async()=>{
 let offline=true;const engine=new CostumeEngine({...options,jsonLoader:async url=>{
  if(offline&&url.pathname.includes('/puppy/assets/'))throw Error('offline');return options.jsonLoader(url);
 }});
 assert.equal(await engine.preload(PUPPY_ID),false);assert.equal(engine.outfits.has(PUPPY_ID),false);assert.equal(engine.pending.has(PUPPY_ID),false);
 offline=false;assert(await engine.preload(PUPPY_ID),engine.error);
});
