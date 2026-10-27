'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../dist'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const core=require('../dist/assets/animation/venomis-thornbear-core.js');
function fn(name,htmlSource=html){const html=htmlSource;const start=html.indexOf('function '+name+'(');assert.ok(start>=0,name);let open=html.indexOf('{',start),depth=1,i=open+1;for(;depth&&i<html.length;i++){if(html[i]==='{')depth++;if(html[i]==='}')depth--;}return html.slice(start,i);}
const p=(extra={})=>({state:'idle',type:'swipe',timer:0,time:0,ending:0,victory:false,moving:false,stride:0,trainerMoving:false,trainerStride:0,heavy:false,hitstun:0,guard:0,volley:0,...extra});
async function harness({candidate=true,search='',fail='',invalid=false,bitmap=false,bitmapFails=false}={}){
 const calls=[],images=[],profile=JSON.parse(JSON.stringify(require('../dist/assets/animation/venomis-thornbear-atlas.js')));
 if(invalid)profile.sheets[0].frames[0][2]=100000;
 const c={HealthiaVenomisThornbearCore:core,HealthiaVenomisThornbearAtlas:profile,Math,location:{search},URLSearchParams,Promise,Map,WeakMap,
  hero:{x:300,y:604,hp:100},boss:{x:800,hp:650,max:650,hitstun:0,cd:.01,state:'idle',timer:0,count:0,dir:-1},opponent:3,selected:0,heroes:[{height:240},{height:210},{height:190}],phase:1,t:0,ending:0,GROUND:604,W:1280,
  mode:'fight',paused:false,hitStop:0,FIXED_STEP:1/120,simulationRemainder:1/240,guest:false,sceneLocked:false,
  plantShots:[],vines:[],clamp:core.clamp,combatSound(){},noise(){},burst(){},ellipse(){},line(){},venomPart(){},
  coEach:action=>action(),hitHero:damage=>{c.hero.hp-=damage;c.hits.push(damage);},hits:[],coHitFlag:v=>v.hit,coMarkHit:v=>v.hit=true,
  bearMotionSheet:{name:'bear'},trainerMotionSheet:{name:'trainer'},bearMotionFrames:{},trainerMotionFrames:{},
  specialSceneLocked:()=>c.sceneLocked,coGuest:()=>c.guest,venomMotionSprite:(...args)=>calls.push({fallback:true,args})};
 c.ctx={save(){},restore(){},beginPath(){},ellipse(){},stroke(){},translate(x,y){calls.push({position:[x,y]});},scale(x,y){calls.push({scale:[x,y]});},drawImage(canvas){calls.push({art:canvas.asset});}};
 c.document={createElement(){const canvas={};canvas.getContext=()=>({drawImage(im){canvas.asset=im.src;},beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){}});return canvas;}};
 c.Image=class{set src(value){this._src=value;images.push(value);queueMicrotask(()=>{if(fail&&value.includes(fail)){this.onerror();return;}const b=fs.readFileSync(path.join(root,value));this.naturalWidth=b.readUInt32BE(16);this.naturalHeight=b.readUInt32BE(20);this.onload();});}get src(){return this._src;}};
 if(bitmap)c.createImageBitmap=async canvas=>{if(bitmapFails)throw Error('Unavailable');return {width:canvas.width,height:canvas.height,asset:canvas.asset,immutable:true};};
 c.window=c;vm.createContext(c);
 for(const name of ['bearMotionPose','trainerMotionPose','updateVenomisLogic','updateVenomis','drawVenomis'])vm.runInContext(fn(name),c);
 if(candidate){vm.runInContext(fs.readFileSync(path.join(root,'assets/animation/venomis-thornbear-motion.js'),'utf8'),c);await c.HealthiaVenomisThornbearAnimation.whenLoaded;}
 return {c,calls,images};
}
test('each actor walks through eight distance-driven drawings and settles to its own idle',()=>{
 assert.equal(new Set(Array.from({length:8},(_,i)=>core.bearPose(p({moving:true,stride:(i+.1)/8})).frame)).size,8);
 assert.equal(new Set(Array.from({length:8},(_,i)=>core.trainerPose(p({trainerMoving:true,trainerStride:(i+.1)/8})).frame)).size,8);
 for(const time of [0,1,10]){assert.equal(core.bearPose(p({moving:true,stride:.3,time})).frame,2);assert.equal(core.trainerPose(p({trainerMoving:true,trainerStride:.3,time})).frame,34);}
 assert.equal(core.bearPose(p({stride:.4})).state,'idle');assert.equal(core.trainerPose(p({trainerStride:.4})).state,'idle');
 assert.equal(new Set([0,.6,1.2,1.8].map(time=>core.bearPose(p({time:time+.001})).frame)).size,4);
 assert.equal(new Set([0,1.2].map(time=>core.trainerPose(p({time:time+.001})).frame)).size,2);
});
test('the claw contacts only at the original timer threshold',()=>{
 for(const timer of [.7,.55,.400001])assert.equal(core.bearPose(p({state:'attack',timer})).state,'claw approach');
 assert.equal(core.bearPose(p({state:'attack',timer:.4})).state,'claw contact');
});
test('flytrap releases follow the three actual volleys with recovery between them',()=>{
 assert.equal(core.bearPose(p({state:'attack',type:'seeds',timer:1.2})).state,'flytrap ready');
 for(const volley of [1,2,3]){
  const timer=1.35-volley*.35;
  assert.equal(core.bearPose(p({state:'attack',type:'seeds',timer,volley})).state,'flytrap release');
  assert.equal(core.bearPose(p({state:'attack',type:'seeds',timer:timer-.15,volley})).state,'flytrap recoil');
 }
 assert.equal(core.bearPose(p({state:'attack',type:'seeds',timer:0,volley:3})).state,'flytrap ready');
});
test('ground vines use their live age after an interrupted attack',()=>{
 const attack=p({state:'attack',type:'vines',timer:1.1});
 assert.equal(core.bearPose({...attack,vineAge:.69}).state,'vine marking');
 assert.equal(core.bearPose({...attack,vineAge:.7}).state,'vine growth');
 assert.equal(core.bearPose({...attack,vineAge:.96}).state,'vine hold');
 assert.equal(core.bearPose({...attack,vineAge:1.26}).state,'vine release');
});
test('Venomis keeps walking through commands and the bear reaction, then gestures when stationary',()=>{
 for(const state of ['warn','attack','recover'])for(const type of ['swipe','seeds','vines'])assert.equal(core.trainerPose(p({state,type,trainerMoving:true,hitstun:.2})).state,'walk');
 assert.equal(core.trainerPose(p({hitstun:.2})).state,'braced reaction');
 assert.equal(core.trainerPose(p({state:'attack',type:'vines',timer:1})).state,'vine command');
});
test('light and heavy reactions are distinct and give way immediately when hitstun ends',()=>{
 assert.notEqual(core.bearPose(p({hitstun:.14,hitDuration:.14})).frame,core.bearPose(p({hitstun:.22,hitDuration:.22,heavy:true})).frame);
 for(const type of ['swipe','seeds','vines'])assert.ok(!core.bearPose(p({state:'attack',type,timer:.35,heavy:true})).state.includes('hit'));
});
test('counter overrides stale walking and both actors retain original defeat sequences',()=>{
 const breakout={age:.24,charge:.24};
 assert.equal(core.bearPose(p({breakout,moving:true})).state,'claw counter');
 assert.equal(core.trainerPose(p({breakout,trainerMoving:true})).state,'braced for counter');
 assert.deepEqual([0,.2,.4,.7].map(ending=>core.bearPose(p({victory:true,ending})).frame),[6,7,8,9]);
 assert.deepEqual([0,.2,.4,.7].map(ending=>core.trainerPose(p({victory:true,ending})).frame),[4,4,7,7]);
 assert.ok(core.bearPose(p({victory:true})).legacy&&core.trainerPose(p({victory:true})).legacy);
});
test('interpolation handles stride wrap without blending turns, teleports or state changes',()=>{
 const a={x:800,face:-1,stride:999.99,state:'idle'},b={x:799,face:-1,stride:.01,state:'idle'};
 assert.equal(core.interpolate(a,b,.5,false).x,799.5);assert.ok(Math.abs(core.interpolate(a,b,.5,false).stride-1000)<1e-8);
 for(const changed of [{...b,face:1},{...b,x:400},{...b,state:'warn'}])assert.deepEqual(core.interpolate(a,changed,.5,false),changed);
 assert.deepEqual(core.interpolate(a,b,.5,true),b);
});
test('all four transparent atlases register 48 complete crops and anchors',async()=>{
 const {c}=await harness();assert.equal(c.HealthiaVenomisThornbearAnimation.ready(),true);assert.equal(c.HealthiaVenomisThornbearAnimation.metrics().addedDrawings,48);assert.equal(c.HealthiaVenomisThornbearAnimation.metrics().errors.length,0);
 for(const sheet of c.HealthiaVenomisThornbearAtlas.sheets){const b=fs.readFileSync(path.join(root,'assets/animation',sheet.file));assert.equal(b[25],6);for(const [x,y,w,h,ax,ay] of sheet.frames){assert.ok(x>=0&&y>=0&&x+w<=b.readUInt32BE(16)&&y+h<=b.readUInt32BE(20));assert.ok(ax>=x&&ax<=x+w&&ay>=y&&ay<=y+h);}}
});
test('any missing atlas or invalid crop falls back to both original actors',async()=>{
 for(const options of [{fail:'thornbear-presence'},{fail:'thornbear-attacks'},{fail:'venomis-presence'},{fail:'venomis-reaction'},{invalid:true}]){const {c,calls}=await harness(options);assert.equal(c.HealthiaVenomisThornbearAnimation.ready(),false);c.drawVenomis();assert.equal(calls.filter(x=>x.fallback).length,2);}
});
test('Original comparison loads no additional textures',async()=>{
 const {c,calls,images}=await harness({search:'?venomis=original'});assert.equal(images.length,0);c.drawVenomis();assert.equal(calls.filter(x=>x.fallback).length,2);
});
test('other villains and unrelated sprite sheets retain their original renderer',async()=>{
 const {c,calls}=await harness();for(const id of [0,1,2,4,5,6,7,8]){c.opponent=id;c.venomMotionSprite(c.bearMotionSheet,{},4,800,604,310,-1);assert.ok(calls.at(-1).fallback);}
 c.opponent=3;c.venomMotionSprite({}, {},4,800,604,310,-1);assert.ok(calls.at(-1).fallback);
});
test('two actor positions interpolate independently while the follower catches up',async()=>{
 const {c}=await harness();Object.assign(c.boss,{cd:999,trainerX:1100,trainerDir:-1});c.updateVenomis(1/120);
 const v=c.HealthiaVenomisThornbearAnimation.inspect();assert.ok(v.bear.x>c.boss.x&&v.bear.x<800);assert.ok(v.trainer.x>c.boss.trainerX&&v.trainer.x<1100);
 Object.assign(c.boss,{hitstun:.2,venomHitDuration:.2,state:'attack',timer:.5});c.updateVenomis(1/120);
 const hit=c.HealthiaVenomisThornbearAnimation.inspect();assert.equal(hit.bear.x,c.boss.x);assert.notEqual(hit.trainer.x,c.boss.trainerX);assert.equal(hit.trainer.state,'walk');
});
test('pause, hitstop, cutscenes, guests and counters lock both interpolated positions',async()=>{
 const {c}=await harness();Object.assign(c.boss,{cd:999,trainerX:1100,trainerDir:-1});c.updateVenomis(1/120);
 for(const field of ['paused','hitStop','sceneLocked','guest']){c[field]=true;const v=c.HealthiaVenomisThornbearAnimation.inspect();assert.equal(v.bear.x,c.boss.x);assert.equal(v.trainer.x,c.boss.trainerX);c[field]=false;}
 c.boss.breakout={age:0,charge:.24,dir:-1};const v=c.HealthiaVenomisThornbearAnimation.inspect();assert.equal(v.bear.x,c.boss.x);assert.equal(v.trainer.x,c.boss.trainerX);
});
test('new rounds and mirrored facing never inherit another round position',async()=>{
 const {c}=await harness();c.boss.cd=999;c.updateVenomis(1/120);c.boss={...c.boss,x:450,trainerX:205,dir:1,trainerDir:1};
 const v=c.HealthiaVenomisThornbearAnimation.inspect();assert.equal(v.bear.x,450);assert.equal(v.trainer.x,205);assert.equal(v.bear.facing,1);assert.equal(v.trainer.facing,1);
});
test('drawing never changes combat, follower or hazard data in either direction',async()=>{
 const {c}=await harness();for(const dir of [-1,1])for(const type of ['swipe','seeds','vines'])for(const state of ['idle','warn','attack','recover']){
  Object.assign(c.boss,{dir,trainerDir:dir,state,type,timer:.35});c.hero.x=800+dir*400;c.vines=[{x:300,age:.75,hit:false}];c.plantShots=[{x:300,y:200,dir,vx:20,vy:10,life:2}];
  const before=JSON.stringify([c.boss,c.hero,c.plantShots,c.vines]);for(let i=0;i<20;i++)c.drawVenomis();assert.equal(JSON.stringify([c.boss,c.hero,c.plantShots,c.vines]),before);
 }
});
for(const type of ['swipe','seeds','vines'])test(type+' matches original simulation at 30/60/120/144 Hz, every phase and difficulty pace',async()=>{
 for(const phase of [1,2,3])for(const pace of [1,1.3,1.65])for(const hz of [30,60,120,144]){
  const {c:a}=await harness({candidate:false}),{c:b}=await harness();
  for(const c of [a,b]){c.phase=phase;Object.assign(c.boss,{state:'warn',type,timer:type==='vines'?1.1:.9,struck:false,startX:800,target:520});}
  let remainder=0;for(let frame=0;frame<Math.ceil(hz*5);frame++){
   remainder+=1/hz;while(remainder+1e-9>=1/120){for(const c of [a,b]){c.t+=1/120;c.updateVenomis(pace/120);}remainder-=1/120;}
   b.simulationRemainder=remainder;b.drawVenomis();assert.ok(Number.isFinite(b.boss.x)&&(b.t===0?b.boss.trainerX===undefined:Number.isFinite(b.boss.trainerX)));assert.ok(Number.isFinite(b.HealthiaVenomisThornbearAnimation.inspect().trainer.x));
   const state=c=>JSON.stringify([c.boss,c.hero,c.hits,c.plantShots,c.vines]);assert.equal(state(a),state(b));
  }
 }
});
test('hitstun freezes the bear attack but follower, shots and vines continue',async()=>{
 const {c}=await harness();Object.assign(c.boss,{state:'attack',type:'vines',timer:1.1,hitstun:.2,venomHitDuration:.2,trainerX:1100});
 c.plantShots=[{x:100,y:200,vx:100,vy:0,dir:1,life:3}];c.vines=[{x:100,age:.68,hit:false}];c.updateVenomis(.1);
 assert.equal(c.boss.timer,1.1);assert.equal(c.plantShots[0].x,110);assert.equal(c.boss.trainerX,1081);assert.ok(c.vines[0].age>.7);
 c.boss.hitstun=0;assert.equal(c.HealthiaVenomisThornbearAnimation.inspect().bear.state,'vine growth');
});
test('the actual swipe hit and all three projectile spawns show contact and emission',async()=>{
 const {c}=await harness();c.hero.x=620;Object.assign(c.boss,{state:'attack',type:'swipe',timer:.401,startX:800,target:620,struck:false});c.updateVenomis(.002);
 assert.equal(c.hits.length,1);assert.equal(c.HealthiaVenomisThornbearAnimation.inspect().bear.state,'claw contact');
 c.hero.x=100;for(const volley of [1,2,3]){Object.assign(c.boss,{state:'attack',type:'seeds',timer:1.35-volley*.35+.001,volley:volley-1});const before=c.plantShots.length;c.updateVenomis(.002);assert.equal(c.plantShots.length,before+1);assert.equal(c.HealthiaVenomisThornbearAnimation.inspect().bear.state,'flytrap release');}
});
test('ground-vine damage and separate co-op hit flags preserve both heroes',async()=>{
 const {c}=await harness();const team=[{x:300,y:604,hp:100,slot:0},{x:310,y:604,hp:100,slot:1}];
 c.coEach=action=>{const old=c.hero;for(const h of team){c.hero=h;action();}c.hero=old;};
 c.coHitFlag=v=>!!v.hitSlots?.[c.hero.slot];c.coMarkHit=v=>{(v.hitSlots??={})[c.hero.slot]=true;};
 Object.assign(c.boss,{state:'attack',type:'vines',timer:1,struck:true});c.vines=[{x:300,age:.879,hit:false}];c.updateVenomis(.002);
 assert.deepEqual(team.map(h=>h.hp),[85,85]);assert.equal(c.HealthiaVenomisThornbearAnimation.inspect().bear.state,'vine growth');
 c.updateVenomis(.02);assert.deepEqual(team.map(h=>h.hp),[85,85]);
});
test('jump clearance, hero heights and facing preserve original projectile collision',async()=>{
 for(const dir of [-1,1])for(const selected of [0,1,2])for(const high of [false,true]){
  const {c:a}=await harness({candidate:false}),{c:b}=await harness();for(const c of [a,b]){c.selected=selected;c.hero.x=650;c.hero.y=high?300:604;c.boss.cd=999;c.plantShots=[{x:650-dir,y:500,vx:dir*100,vy:0,dir,life:3}];c.updateVenomis(.01);c.drawVenomis();}
  assert.equal(a.hero.hp,b.hero.hp);assert.equal(b.hero.hp,high?100:91);
 }
});
test('defeat draws the complete original bear and scientist in either direction',async()=>{
 const {c,calls}=await harness();c.mode='victory';for(const dir of [-1,1]){c.boss.venomDeathFacing=dir;for(const ending of [0,.2,.4,.7]){c.ending=ending;calls.length=0;c.drawVenomis();assert.equal(calls.filter(x=>x.fallback).length,2);assert.ok(calls.every(x=>x.args[6]===dir));}}
});
test('production entries match and contain no review controls or story restriction',()=>{
 assert.equal(html,fs.readFileSync(path.join(root,'hero-showdown.html'),'utf8'));
 for(const file of ['venomis-thornbear-core.js','venomis-thornbear-atlas.js','venomis-thornbear-motion.js'])assert.ok(html.includes('assets/animation/'+file));
 assert.ok(!html.includes('venomis-thornbear-review.js'));assert.ok(!html.includes('styro-preview-scope.js'));
});

test('move-preview controls initialize real attack origins before advancing the fight',async()=>{
 const source=fs.readFileSync(path.join(root,'assets/animation/venomis-thornbear-review.js'),'utf8');
 for(const move of ['swipe','seeds','vines']){
  const {c}=await harness();c.session=null;c.play=(practice,setup)=>{vm.runInContext(setup,c);return true;};
  vm.runInContext(fn('demo',source),c);c.demo(move);
  for(let i=0;i<400;i++){c.updateVenomis(1/120);assert.ok(Number.isFinite(c.boss.x)&&Number.isFinite(c.boss.trainerX));}
 }
});

test('immutable texture preparation completes before both actors use the new renderer',async()=>{
 const {c,calls}=await harness({bitmap:true});c.drawVenomis();assert.equal(c.HealthiaVenomisThornbearAnimation.metrics().addedDrawings,48);
 assert.equal(calls.filter(x=>x.art).length,2);assert.equal(calls.filter(x=>x.fallback).length,0);
});
test('browsers unable to create immutable textures still draw both prepared actors',async()=>{
 const {c,calls}=await harness({bitmap:true,bitmapFails:true});c.drawVenomis();assert.equal(c.HealthiaVenomisThornbearAnimation.ready(),true);assert.equal(calls.filter(x=>x.art).length,2);assert.equal(calls.filter(x=>x.fallback).length,0);
});
