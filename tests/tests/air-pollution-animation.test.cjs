'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../dist'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const core=require('../dist/assets/animation/air-pollution-core.js'),atlas=require('../dist/assets/animation/air-pollution-atlas.js');
const review=fs.readFileSync(path.join(root,'assets/animation/air-pollution-review.js'),'utf8');
const clone=x=>JSON.parse(JSON.stringify(x));
function fn(name,source=html){const start=source.indexOf('function '+name+'(');assert.ok(start>=0,name);let i=source.indexOf('{',start)+1,depth=1;for(;depth;i++){if(source[i]==='{')depth++;if(source[i]==='}')depth--;}return source.slice(start,i);}
const p=(extra={})=>({state:'idle',type:'punch',timer:0,phase:1,time:0,struck:false,liveStorm:false,victory:false,breakout:null,hitstun:0,heavy:false,guard:0,moving:false,stride:0,...extra});
async function harness({candidate=true,search='',fail=false,invalid=false,bitmap=true,bitmapFails=false}={}){
 const calls=[],fx=[],images=[],profile=clone(atlas);if(invalid)profile.frames[0].crop[2]=100000;
 let seed=17;const math=Object.create(Math);math.random=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
 const c={HealthiaAirPollutionCore:core,HealthiaAirPollutionAtlas:profile,Math:math,location:{search},URLSearchParams,Promise,Map,WeakMap,
  hero:{x:400,y:604,hp:100,inv:0,power:35,face:1,block:false,vx:0},boss:{x:800,vx:0,hp:650,max:650,hitstun:0,hitFlash:0,pulse:0,cd:999,state:'idle',timer:0,target:400,count:0,dir:-1},opponent:0,selected:0,phase:1,t:0,elapsed:0,ending:0,GROUND:604,W:1280,FIXED_STEP:1/120,simulationRemainder:0,
  mode:'fight',paused:false,loaded:true,hitStop:0,effects:[],particles:[],shots:[],hazards:[],sounds:[],combo:0,comboTime:0,best:0,shake:0,specialScene:{committing:false},fallSoundPlayed:false,bannerTime:0,banner:'',versusDifficulty:'easy',
  clamp:core.clamp,rand:(a,b)=>a+math.random()*(b-a),combatSound:(...a)=>c.sounds.push(a),noise(){},line(){},ellipse(){},resetHeroCombo(){},syncAnimation(){},directionTaps:{},
  music(){},stepSpecial(){},stepHero(dt){c.hero.inv=Math.max(0,c.hero.inv-dt);},result(){},coEach:cb=>cb(),coGuest:()=>false,specialSceneLocked:()=>false,spreeInvisible:()=>false,tryOpponentGuard:()=>false,specialSceneTryHit:()=>false,bossMaterial:()=> 'smoke',
  finish:win=>{c.mode=win?'victory':'defeat';c.boss.state='idle';c.hazards=[];c.shots=[];c.ending=0;},
  sprite:(...args)=>calls.push({fallback:true,args}),smokeStrand:(...a)=>fx.push(['strand',...a]),smokyFist:(...a)=>fx.push(['fist',...a]),smokePuff:(...a)=>fx.push(['puff',...a])};
 c.ctx={globalAlpha:1,save(){},restore(){},translate(x,y){assert.ok(Number.isFinite(x)&&Number.isFinite(y));calls.push({position:[x,y]});},rotate(a){assert.ok(Number.isFinite(a));},scale(x,y){assert.ok(Number.isFinite(x)&&Number.isFinite(y));calls.push({scale:[x,y]});},drawImage(texture,...args){calls.push({art:texture.asset,args});},fillRect(){},createRadialGradient(){return {addColorStop(){}};}};
 c.document={createElement(){const canvas={};canvas.getContext=()=>({drawImage(im){canvas.asset=im.src;}});return canvas;}};
 c.Image=class{set src(value){this._src=value;images.push(value);queueMicrotask(()=>{if(fail){this.onerror();return;}const b=fs.readFileSync(path.join(root,value));this.naturalWidth=b.readUInt32BE(16);this.naturalHeight=b.readUInt32BE(20);this.onload();});}get src(){return this._src;}};
 if(bitmap)c.createImageBitmap=async canvas=>{if(bitmapFails)throw Error('Unavailable');return {width:canvas.width,height:canvas.height,asset:canvas.asset};};
 c.window=c;vm.createContext(c);
 vm.runInContext(html.slice(html.indexOf('const versusDifficulties={'),html.indexOf("let versusDifficulty='medium';")),c);
 for(const line of html.split('\n').filter(s=>s.startsWith('Object.assign(versusDifficulties.')))vm.runInContext(line,c);
 for(const name of ['hitBoss','hitHero','update','updateStep','advanceEffects','updateParticles','burst','stepVersusDifficulty','bossAnchors','bossMotion'])vm.runInContext(fn(name),c);
 if(candidate){vm.runInContext(fs.readFileSync(path.join(root,'assets/animation/air-pollution-motion.js'),'utf8'),c);await c.HealthiaAirPollutionAnimation.whenLoaded;}
 const render=()=>{const a=c.bossAnchors();c.sprite(3,a.x,a.y,405,-a.dir,c.boss.pulse>0?.025:0,c.mode==='victory'?Math.max(0,1-c.ending/1.5):1);c.bossMotion();};
 return {c,calls,images,fx,render};
}
function begin(c,type,phase=1){c.phase=phase;c.boss.hp=c.boss.max*(phase===3?.25:phase===2?.5:1);Object.assign(c.boss,{state:'warn',type,timer:type==='storm'?1.25:type==='cloud'?1.1:phase===1?1.05:.78,target:c.hero.x,struck:false,stormTick:.52});}
const state=c=>JSON.stringify([c.boss,c.hero,c.hazards,c.effects,c.particles,c.shots,c.sounds,c.mode,c.t,c.elapsed,c.hitStop,c.phase]);
test('sixteen complete transparent smoke bodies register within the intact source image',async()=>{
 const {c}=await harness(),b=fs.readFileSync(path.join(root,'assets/animation',atlas.file));assert.equal(b[25],6);assert.equal(c.HealthiaAirPollutionAnimation.metrics().addedDrawings,16);assert.equal(c.HealthiaAirPollutionAnimation.ready(),true);
 for(const {crop:[x,y,w,h,ax,ay]} of atlas.frames){assert.ok(x>0&&y>0&&x+w<b.readUInt32BE(16)&&y+h<b.readUInt32BE(20));assert.ok(ax>=x&&ax<=x+w&&ay>=y&&ay<=y+h);}
});
test('three hover poses and four glide phases animate a floating body without inventing footfalls',()=>{
 assert.deepEqual([0,.81,1.61].map(time=>core.pose(p({time})).frame),[0,1,2]);assert.deepEqual([0,.251,.501,.751].map(stride=>core.pose(p({moving:true,stride})).frame),[3,4,5,6]);
 assert.equal(core.pose(p({moving:true,stride:.4,time:0})).frame,core.pose(p({moving:true,stride:.4,time:100})).frame);
});
test('punch contact appears only after the native strike; clouds channel before their damaging ground release',()=>{
 assert.equal(core.pose(p({state:'attack',timer:.33})).frame,7);assert.equal(core.pose(p({state:'attack',timer:.32,struck:true})).frame,8);assert.equal(core.pose(p({state:'attack',timer:.1,struck:true})).frame,9);
 assert.equal(core.pose(p({state:'attack',type:'cloud',timer:.7})).state,'cloud channel');assert.equal(core.pose(p({state:'attack',type:'cloud',timer:.2,struck:true})).state,'cloud release');
});
test('storm impact poses follow actual pulses and return to raised claws between strikes',()=>{
 assert.equal(core.pose(p({state:'warn',type:'storm'})).frame,12);assert.equal(core.pose(p({state:'attack',type:'storm',liveStorm:false})).frame,12);assert.equal(core.pose(p({state:'attack',type:'storm',liveStorm:true})).frame,13);
});
test('cloud mouth registration exactly matches the original smoke origin in both facings and every charge pose',async()=>{
 const {c}=await harness();for(const side of [-1,1])for(const [state,timer] of [['warn',1.09],['warn',.4],['attack',.5]]){
  c.hero.x=c.boss.x+side*300;Object.assign(c.boss,{state,timer,type:'cloud'});const v=c.HealthiaAirPollutionAnimation.inspect(),a=c.bossAnchors();assert.ok(Math.abs(v.mouth.x-a.mouthX)<1e-9);assert.ok(Math.abs(v.mouth.y-a.mouthY)<1e-9);
 }
});
test('successful light and heavy hits remain private observations and leave native damage fields unchanged',async()=>{
 const {c:a}=await harness({candidate:false}),{c:b}=await harness();for(const [damage,kind,frame] of [[7,'punch',14],[12,'kick',15],[25,'special',15]]){a.hitBoss(damage,1,5,kind);b.hitBoss(damage,1,5,kind);assert.equal(state(a),state(b));assert.equal(b.HealthiaAirPollutionAnimation.inspect().pose,frame);}
});
test('blocked hits create no false recoil, and ending hitstun resumes the existing warning',async()=>{
 const {c}=await harness();begin(c,'cloud');c.tryOpponentGuard=()=>true;const hp=c.boss.hp;c.hitBoss(30,1,5,'kick');assert.equal(c.boss.hp,hp);assert.equal(c.HealthiaAirPollutionAnimation.inspect().state,'cloud charge');
 c.tryOpponentGuard=()=>false;c.hitBoss(7,1,5,'punch');assert.equal(c.HealthiaAirPollutionAnimation.inspect().state,'light hit');c.boss.hitstun=0;assert.equal(c.HealthiaAirPollutionAnimation.inspect().state,'cloud charge');
});
test('the original smoke counter and fading defeat keep their original body renderer',async()=>{
 const {c,calls,render}=await harness();for(const mode of ['counter','victory']){c.mode=mode==='victory'?'victory':'fight';c.boss.breakout=mode==='counter'?{age:.1}:null;calls.length=0;render();assert.ok(calls.some(x=>x.fallback));assert.ok(!calls.some(x=>x.art));}
});
test('missing or invalid artwork falls back atomically to the complete original body',async()=>{
 for(const options of [{fail:true},{invalid:true}]){const {c,calls,render}=await harness(options);assert.equal(c.HealthiaAirPollutionAnimation.ready(),false);render();assert.ok(calls.some(x=>x.fallback));}
});
test('canvas-only preparation and failed bitmap creation still draw the complete new poses',async()=>{
 for(const options of [{bitmap:false},{bitmapFails:true}]){const {c,calls,render}=await harness(options);assert.equal(c.HealthiaAirPollutionAnimation.ready(),true);render();assert.ok(calls.some(x=>x.art));}
});
test('Original comparison avoids loading the new PNG and all other sprites retain their original renderer',async()=>{
 const old=await harness({search:'?air=original'});assert.equal(old.images.length,0);old.render();assert.ok(old.calls.some(x=>x.fallback));
 const {c,calls}=await harness();for(const index of [0,1,2]){calls.length=0;c.sprite(index,300,604,240);assert.ok(calls[0].fallback);}for(let i=1;i<=8;i++){c.opponent=i;calls.length=0;c.sprite(3,800,604,405);assert.ok(calls[0].fallback);}
});
test('movement interpolation is visual only and is locked by pause, hit stop, cinematics and guest playback',async()=>{
 const {c}=await harness();c.updateStep(1/120);c.simulationRemainder=1/240;const x=c.boss.x;assert.ok(c.HealthiaAirPollutionAnimation.inspect().x>x);
 for(const key of ['paused','hitStop']){c[key]=1;assert.equal(c.HealthiaAirPollutionAnimation.inspect().x,x);c[key]=0;}
 for(const key of ['coGuest','specialSceneLocked']){c[key]=()=>true;assert.equal(c.HealthiaAirPollutionAnimation.inspect().x,x);c[key]=()=>false;}assert.equal(c.boss.x,x);
});
test('teleports, changes of facing and new rounds cannot inherit stale movement or heavy reactions',async()=>{
 const a={x:500,face:-1,state:'idle',stride:2},b={x:499,face:-1,state:'idle',stride:2.01};assert.equal(core.interpolate(a,b,.5,false).x,499.5);for(const changed of [{...b,x:800},{...b,face:1},{...b,state:'warn'}])assert.deepEqual(core.interpolate(a,changed,.5,false),changed);
 const {c}=await harness();c.hitBoss(10,1,5,'kick');assert.equal(c.HealthiaAirPollutionAnimation.inspect().pose,15);c.boss={...c.boss,vx:0};assert.equal(c.HealthiaAirPollutionAnimation.inspect().pose,14);
});
test('rendering preserves native combat data, random sequence and smoke-effect geometry',async()=>{
 const old=await harness({candidate:false}),updated=await harness();
 for(const type of ['punch','cloud','storm'])for(const stateName of ['warn','attack','recover'])for(const side of [-1,1]){
  for(const {c,fx} of [old,updated]){c.hero.x=c.boss.x+side*250;Object.assign(c.boss,{type,state:stateName,timer:.2,target:c.hero.x,struck:true,stormTick:.2});fx.length=0;}
  const before=state(updated.c);old.render();updated.render();assert.equal(state(updated.c),before);assert.deepEqual(updated.fx,old.fx);assert.equal(updated.c.Math.random(),old.c.Math.random());
 }
});
for(const kind of ['punch','cloud','storm'])test(kind+' matches original native simulation for every phase, difficulty and 30/60/120/144 Hz rendering',async()=>{
 for(const phase of [1,2,3])for(const difficulty of ['easy','medium','hard'])for(const hz of [30,60,120,144]){
  const a=await harness({candidate:false}),b=await harness();for(const {c} of [a,b]){c.versusDifficulty=difficulty;c.hero.hp=10000;begin(c,kind,phase);}
  for(let frame=0;frame<hz*8;frame++){a.c.update(1/hz);b.c.update(1/hz);b.render();assert.equal(state(a.c),state(b.c));}
 }
});
test('punch retains its original .28-second active contact and phase-dependent damage',async()=>{
 for(const [phase,damage] of [[1,14],[2,18],[3,18]]){const {c}=await harness();begin(c,'punch',phase);Object.assign(c.boss,{state:'attack',timer:.331});c.updateStep(.01);assert.equal(c.hero.hp,100);assert.equal(c.HealthiaAirPollutionAnimation.inspect().releaseSerial,0);c.updateStep(.002);assert.equal(c.hero.hp,100-damage);assert.equal(c.HealthiaAirPollutionAnimation.inspect().releaseSerial,1);assert.equal(c.HealthiaAirPollutionAnimation.inspect().pose,8);}
});
test('cloud release keeps its marked target, radius, lifetime and bypass-block ground damage',async()=>{
 const {c}=await harness();begin(c,'cloud',2);Object.assign(c.boss,{state:'attack',timer:.201});c.hero.block=true;c.updateStep(.002);assert.equal(c.hazards.length,1);assert.equal(c.hazards[0].x,400);assert.equal(c.hazards[0].r,110);assert.ok(Math.abs(c.hazards[0].life-4.798)<1e-9);assert.equal(c.hero.hp,96);assert.equal(c.HealthiaAirPollutionAnimation.inspect().releaseSerial,1);
});
test('storm keeps all three original impact lanes and exactly three pulse releases',async()=>{
 const {c}=await harness();begin(c,'storm',3);Object.assign(c.boss,{state:'attack',timer:1.65,stormTick:.52});c.hero.inv=999;for(let i=0;i<63;i++)c.updateStep(1/120);assert.deepEqual(c.effects.filter(e=>e.type==='fist').map(e=>e.x),[170,400,630]);assert.equal(c.HealthiaAirPollutionAnimation.inspect().pose,13);assert.equal(c.HealthiaAirPollutionAnimation.inspect().releaseSerial,1);
 for(let i=0;i<90;i++)c.updateStep(1/120);assert.equal(c.HealthiaAirPollutionAnimation.inspect().releaseSerial,2);
 for(let i=0;i<110;i++)c.updateStep(1/120);assert.equal(c.HealthiaAirPollutionAnimation.inspect().releaseSerial,3);
});
test('native invulnerability and directional blocking retain their damage reduction',async()=>{
 const {c}=await harness();begin(c,'punch');Object.assign(c.boss,{state:'attack',timer:.321});c.hero.block=true;c.updateStep(.002);assert.ok(Math.abs(c.hero.hp-(100-14*.18))<1e-9);assert.equal(c.hero.inv,.6);const hp=c.hero.hp;c.hitHero(14,800);assert.equal(c.hero.hp,hp);
});
test('interrupted warnings pause while existing toxic hazards continue ageing and hurting',async()=>{
 const {c}=await harness();begin(c,'punch');c.boss.hitstun=.2;c.hazards=[{x:400,r:110,life:4.8}];const timer=c.boss.timer;c.updateStep(.01);assert.equal(c.boss.timer,timer);assert.ok(Math.abs(c.hazards[0].life-4.79)<1e-9);assert.equal(c.hero.hp,96);
});
test('pause, hit stop and cinematic locks freeze the actual simulation and release observation',async()=>{
 for(const lock of ['paused','hitStop','scene']){const {c}=await harness();begin(c,'punch');if(lock==='scene')c.specialSceneLocked=()=>true;else c[lock]=1;const timer=c.boss.timer,time=c.elapsed;c.updateStep(.01);assert.equal(c.elapsed,time);assert.equal(c.boss.timer,timer);assert.equal(c.HealthiaAirPollutionAnimation.inspect().releaseSerial,0);}
});
test('native co-op contact checks damage both heroes independently',async()=>{
 const {c}=await harness();const team=[c.hero,{...c.hero,x:420}];c.coEach=cb=>{const old=c.hero;for(const h of team){c.hero=h;cb();}c.hero=old;};begin(c,'punch');Object.assign(c.boss,{state:'attack',timer:.321});c.updateStep(.002);assert.deepEqual(team.map(h=>h.hp),[86,86]);
});
test('all direct move previews use real native warning and attack states',async()=>{
 for(const move of ['glide','punch-attack','cloud','storm','defeat']){const {c,render}=await harness();c.session=null;c.run=s=>vm.runInContext(s,c);c.document.getElementById=()=>({checked:false});c.play=(practice,setup)=>{vm.runInContext(setup,c);return true;};vm.runInContext(fn('releaseHold',review),c);vm.runInContext(fn('demo',review),c);c.demo(move);for(let i=0;i<480;i++){c.hero.inv=999;c.updateStep(1/120);render();assert.ok(Number.isFinite(c.boss.x));}}
});
test('mirrored preview keeps stored strike and ground-cloud targets on the mirrored hero',async()=>{
 const {c}=await harness();Object.assign(c,{available:()=>true,speed(){},reviewHero:0,lastError:'',session:null,HealthiaIntro:{dismiss(){}},HealthiaCave:{close(){}},story:{cleanup(){}},specialSceneReset(){},coLeave(){},showModeSelect(){},start(){},preview:{contentWindow:{focus(){}}},run:s=>vm.runInContext(s,c)});c.document.getElementById=()=>({checked:true});vm.runInContext(fn('releaseHold',review),c);vm.runInContext(fn('play',review),c);
 c.play(true,'hero.x=300;boss.x=800;boss.target=300;hazards=[{x:300,r:110,life:4.8}];');assert.equal(c.hero.x,980);assert.equal(c.boss.x,480);assert.equal(c.boss.target,980);assert.equal(c.hazards[0].x,980);
});
test('impact hold observes the actual release then freezes, and clearing it resumes normal play',async()=>{
 const {c}=await harness();c.run=s=>vm.runInContext(s,c);c.document.getElementById=()=>({checked:false});vm.runInContext(fn('releaseHold',review),c);vm.runInContext(fn('speed',review),c);c.speed();c.releaseHold(true);begin(c,'punch');Object.assign(c.boss,{state:'attack',timer:.321});c.updateStep(.002);assert.equal(c.hero.hp,86);assert.equal(c.airReviewFrozen,true);const before=c.elapsed;c.updateStep(.1);assert.equal(c.elapsed,before);c.releaseHold(false);c.hitStop=0;c.updateStep(.01);assert.ok(c.elapsed>before);
});
test('production entries match, keep Story Mode and never load optional preview controls',()=>{
 assert.equal(html,fs.readFileSync(path.join(root,'hero-showdown.html'),'utf8'));for(const part of ['core','atlas','motion'])assert.ok(html.includes('assets/animation/air-pollution-'+part+'.js'));assert.ok(html.includes('assets/js/story-mode.js'));assert.ok(!html.includes('air-pollution-review.js'));
});
