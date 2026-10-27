'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../dist'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const core=require('../dist/assets/animation/lightening-spree-core.js'),atlas=require('../dist/assets/animation/lightening-spree-atlas.js');
const clone=x=>JSON.parse(JSON.stringify(x));
function fn(name,source=html){const start=source.indexOf('function '+name+'(');assert.ok(start>=0,name);let i=source.indexOf('{',start)+1,depth=1;for(;depth;i++){if(source[i]==='{')depth++;if(source[i]==='}')depth--;}return source.slice(start,i);}
const p=(extra={})=>({state:'idle',type:'beam',timer:0,duration:.85,time:0,hidden:0,hitstun:0,guard:0,liveBeams:0,struck:false,volley:0,phase:1,...extra});
async function harness({candidate=true,search='',fail=false,invalid=false,bitmap=true,bitmapFails=false}={}){
 const calls=[],images=[],profile=clone(atlas);if(invalid)profile.frames[0].crop[2]=100000;
 let seed=13;const math=Object.create(Math);math.random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 const c={HealthiaLighteningSpreeCore:core,HealthiaLighteningSpreeAtlas:profile,Math:math,location:{search},URLSearchParams,Promise,Map,WeakMap,
  hero:{x:300,y:604,hp:100,inv:0,power:35,face:1,block:false},boss:{x:800,vx:0,hp:650,max:650,hitstun:0,cd:999,state:'idle',timer:0,count:0,dir:-1},opponent:7,selected:0,heroes:[{height:240},{height:210},{height:190}],phase:1,t:0,ending:0,GROUND:604,W:1280,
  mode:'fight',paused:false,hitStop:0,spree:null,effects:[],sounds:[],combo:0,comboTime:0,best:0,shake:0,specialScene:{committing:false},
  clamp:core.clamp,combatSound:(...a)=>c.sounds.push(a),duckMusic:()=>c.sounds.push(['duck']),burst(){},noise(){},ellipse(){},line(){},poly(){},text(){},resetHeroCombo(){},syncAnimation(){},directionTaps:{},
  coEach:action=>action(),coHitFlag:b=>b.hit,coMarkHit:b=>b.hit=true,tryOpponentGuard:()=>false,specialSceneTryHit:()=>false,bossMaterial:()=> 'armor',
  finish:win=>{c.mode=win?'victory':'defeat';c.spree.beams=[];c.spree.hidden=0;c.spree.rings=[];},spreeArt:(...args)=>calls.push({fallback:true,args})};
 c.ctx={globalAlpha:1,save(){},restore(){},translate(x,y){assert.ok(Number.isFinite(x)&&Number.isFinite(y));calls.push({position:[x,y]});},rotate(){},scale(x,y){assert.ok(Number.isFinite(x)&&Number.isFinite(y));calls.push({scale:[x,y]});},drawImage(texture,...args){calls.push({art:texture.asset,args});},beginPath(){},ellipse(){},stroke(){},moveTo(){},lineTo(){},setLineDash(){},arc(){},fill(){},createRadialGradient(){return {addColorStop(){}};}};
 c.document={createElement(){const canvas={};canvas.getContext=()=>({drawImage(im){canvas.asset=im.src;}});return canvas;}};
 c.Image=class{set src(value){this._src=value;images.push(value);queueMicrotask(()=>{if(fail){this.onerror();return;}const b=fs.readFileSync(path.join(root,value));this.naturalWidth=b.readUInt32BE(16);this.naturalHeight=b.readUInt32BE(20);this.onload();});}get src(){return this._src;}};
 if(bitmap)c.createImageBitmap=async canvas=>{if(bitmapFails)throw Error('Unavailable');return {width:canvas.width,height:canvas.height,asset:canvas.asset};};
 c.window=c;vm.createContext(c);
 for(const name of ['resetSpree','spreeInvisible','spreeVanish','spreeOrigin','spreeAttack','spreeFire','spreeBeamHit','updateSpree','drawSpree','drawSpreeEffects','hitBoss','hitHero'])vm.runInContext(fn(name),c);
 c.resetSpree();
 if(candidate){vm.runInContext(fs.readFileSync(path.join(root,'assets/animation/lightening-spree-motion.js'),'utf8'),c);await c.HealthiaLighteningSpreeAnimation.whenLoaded;}
 return {c,calls,images};
}
test('the intact transparent sheet registers sixteen complete body crops',async()=>{
 const {c}=await harness(),b=fs.readFileSync(path.join(root,'assets/animation',atlas.file));assert.equal(b[25],6);assert.equal(c.HealthiaLighteningSpreeAnimation.ready(),true);assert.equal(c.HealthiaLighteningSpreeAnimation.metrics().addedDrawings,16);
 for(const {crop:[x,y,w,h,ax,ay]} of atlas.frames){assert.ok(x>0&&y>0&&x+w<b.readUInt32BE(16)&&y+h<b.readUInt32BE(20));assert.ok(ax>=x&&ax<=x+w&&ay>=y&&ay<=y+h);}
});
test('idle breathes in place without inventing a walking state',()=>{
 assert.equal(new Set([0,.7,1.3,1.9].map(time=>core.pose(p({time})).frame)).size,3);
 for(let time=0;time<5;time+=.01){const pose=core.pose(p({time}));assert.equal(pose.state,'idle');assert.ok(pose.breathe>=.996&&pose.breathe<=1.004);}
});
test('the body remains completely hidden throughout the full invisible interval',async()=>{
 const {c,calls}=await harness();c.spreeVanish();const old=c.boss.x;
 for(const time of [0,.1,1,1.99,1.999999]){c.t=time;c.updateSpree(.001);calls.length=0;c.drawSpree();assert.equal(c.HealthiaLighteningSpreeAnimation.inspect().hidden,true);assert.equal(calls.filter(v=>v.art||v.fallback).length,0);assert.equal(c.boss.x,old);}
 c.t=2;c.updateSpree(.001);assert.equal(c.spree.hidden,0);assert.equal(c.boss.x,c.spree.destination);assert.equal(c.boss.state,'warn');assert.equal(c.HealthiaLighteningSpreeAnimation.inspect().state,'reappear');
});
test('arrival uses a brief solid brace then immediately resumes the real warning',()=>{
 assert.equal(core.pose(p({state:'warn',timer:.8,arrivalAge:0})).frame,12);assert.equal(core.pose(p({state:'warn',timer:.8,arrivalAge:.08})).frame,13);
 assert.equal(core.pose(p({state:'warn',timer:.6,arrivalAge:.16})).state,'beam charge');
});
test('charge, ready, release and recovery have distinct poses for both attacks',()=>{
 for(const type of ['beam','spark']){const a=p({type,state:'warn',timer:.8});const b=p({type,state:'warn',timer:.2});const r=p({type,state:'attack',liveBeams:1,struck:true});const f=p({type,state:'recover',timer:1.2});assert.equal(new Set([a,b,r,f].map(x=>core.pose(x).frame)).size,4);}
});
test('no emitting pose appears before an actual beam exists',()=>{
 for(const type of ['beam','spark']){assert.equal(core.pose(p({type,state:'attack',timer:.59})).emitting,undefined);assert.equal(core.pose(p({type,state:'attack',liveBeams:1,struck:true})).emitting,true);}
});
test('the phase-three second volley readies again and uses the live beam release',()=>{
 const a=p({state:'attack',type:'spark',struck:true,phase:3,volley:0});assert.equal(core.pose(a).state,'second spark ready');
 assert.equal(core.pose({...a,volley:1,liveBeams:5}).state,'spark release');assert.equal(core.pose({...a,volley:1}).state,'spark follow-through');
});
test('both release palms register exactly to the original beam origins in either facing',async()=>{
 const {c}=await harness();for(const dir of [-1,1])for(const type of ['beam','spark']){
  Object.assign(c.boss,{dir,type,state:'attack',timer:.5,duration:.6,struck:true});c.spree.beams=[{life:.2}];
  const view=c.HealthiaLighteningSpreeAnimation.inspect(),origin=c.spreeOrigin();assert.ok(Math.abs(view.emitter.x-origin.x)<1e-9);assert.ok(Math.abs(view.emitter.y-origin.y)<1e-9);
  const reg=core.registration(atlas.frames[type==='spark'?10:6],310,true,type);assert.ok(reg.scale>1&&reg.scale<1.2);
 }
});
test('reaction observation distinguishes real light and heavy hits without adding boss fields',async()=>{
 const {c:a}=await harness({candidate:false}),{c:b}=await harness();
 for(const [damage,kind,frame] of [[7,'punch',14],[12,'kick',15],[25,'special',15]]){
  a.hitBoss(damage,1,5,kind);b.hitBoss(damage,1,5,kind);assert.deepEqual(clone(a.boss),clone(b.boss));assert.equal(b.HealthiaLighteningSpreeAnimation.inspect().pose,frame);
 }
});
test('blocked and invisible hits do not create a reaction or damage',async()=>{
 const {c}=await harness();c.tryOpponentGuard=()=>true;const hp=c.boss.hp;c.hitBoss(30,1,5,'kick');assert.equal(c.boss.hp,hp);assert.equal(c.HealthiaLighteningSpreeAnimation.inspect().state,'idle');
 c.tryOpponentGuard=()=>false;c.spreeVanish();c.hitBoss(30,1,5,'kick');assert.equal(c.boss.hp,hp);assert.equal(c.HealthiaLighteningSpreeAnimation.inspect().state,'invisible');
});
test('hit reactions end with authoritative hitstun and do not replace live warnings',async()=>{
 const {c}=await harness();c.spreeAttack('beam');c.hitBoss(7,1,5,'punch');assert.equal(c.HealthiaLighteningSpreeAnimation.inspect().state,'light hit');c.boss.hitstun=0;assert.equal(c.HealthiaLighteningSpreeAnimation.inspect().state,'beam charge');
});
test('generic prism counters and the original shatter keep their original renderer',async()=>{
 const {c,calls}=await harness();for(const mode of ['counter','victory']){c.mode=mode==='victory'?'victory':'fight';c.boss.breakout=mode==='counter'?{age:.1}:null;calls.length=0;c.drawSpree();assert.ok(calls.some(v=>v.fallback));assert.equal(calls.filter(v=>v.art).length,0);}
});
test('canvas-only and failed immutable-texture preparation keep the new animation',async()=>{
 for(const options of [{bitmap:false},{bitmapFails:true}]){const {c,calls}=await harness(options);assert.equal(c.HealthiaLighteningSpreeAnimation.ready(),true);c.drawSpree();assert.ok(calls.some(v=>v.art));}
});
test('missing art or invalid metadata falls back to the complete original character',async()=>{
 for(const options of [{fail:true},{invalid:true}]){const {c,calls}=await harness(options);assert.equal(c.HealthiaLighteningSpreeAnimation.ready(),false);c.drawSpree();assert.ok(calls.some(v=>v.fallback));}
});
test('Original comparison avoids loading new textures and other opponents keep their renderer',async()=>{
 const original=await harness({search:'?spree=original'});assert.equal(original.images.length,0);original.c.drawSpree();assert.ok(original.calls.some(v=>v.fallback));
 const {c,calls}=await harness();for(const i of [0,1,2,3,4,5,6,8]){c.opponent=i;calls.length=0;c.spreeArt(0,800,604,-1);assert.ok(calls[0].fallback);}
});
test('rendering cannot change combat data, timer, beam geometry or random sequence',async()=>{
 const {c}=await harness();for(const type of ['beam','spark'])for(const state of ['idle','warn','attack','recover'])for(const dir of [-1,1]){
  Object.assign(c.boss,{type,state,dir,duration:.85,timer:.2});const before=JSON.stringify([c.boss,c.hero,c.spree,c.effects,c.sounds]);for(let i=0;i<10;i++){c.drawSpree();c.drawSpreeEffects();}assert.equal(JSON.stringify([c.boss,c.hero,c.spree,c.effects,c.sounds]),before);
 }
});
for(const type of ['beam','spark'])test(type+' matches original combat at 30/60/120/144 Hz, all phases and difficulty paces',async()=>{
 for(const phase of [1,2,3])for(const pace of [1,1.3,1.65])for(const hz of [30,60,120,144]){
  const {c:a}=await harness({candidate:false}),{c:b}=await harness();for(const c of [a,b]){c.phase=phase;c.hero.hp=10000;c.spreeAttack(type);}
  let remainder=0;for(let frame=0;frame<Math.ceil(hz*12);frame++){
   remainder+=1/hz;while(remainder+1e-9>=1/120){for(const c of [a,b]){c.t+=1/120;c.hero.inv=Math.max(0,c.hero.inv-1/120);c.updateSpree(pace/120);}remainder-=1/120;}
   b.drawSpree();const state=c=>JSON.stringify([c.boss,c.spree,c.hero,c.effects,c.sounds,c.mode]);assert.equal(state(a),state(b));
  }
 }
});
test('the primary beam releases once at .10 and keeps its original width and damage',async()=>{
 const {c}=await harness();Object.assign(c.boss,{state:'attack',type:'beam',duration:.6,timer:.501,struck:false});c.updateSpree(.002);assert.equal(c.spree.beams.length,1);const b=c.spree.beams[0];assert.equal(b.width,30);assert.equal(b.damage,18);assert.equal(b.life,.34);assert.deepEqual({x:b.x,y:b.y},clone(c.spreeOrigin()));c.updateSpree(.02);assert.equal(c.spree.beams.length,1);
});
test('spark fans retain five rays and phase three adds five more at .43',async()=>{
 for(const phase of [1,2,3]){const {c}=await harness();c.phase=phase;Object.assign(c.boss,{state:'attack',type:'spark',duration:.78,timer:.681,struck:false,volley:0});c.updateSpree(.002);assert.equal(c.spree.beams.length,5);assert.ok(c.spree.beams.every(b=>b.damage===9&&b.width===14));
  c.boss.timer=.78-.429;c.updateSpree(.002);assert.equal(c.spree.beams.length,phase===3?10:5);assert.equal(c.boss.volley,phase===3?1:0);
 }
});
test('live beams keep ageing and damaging during an interrupted attack',async()=>{
 const {c}=await harness();c.spreeAttack('beam');c.spreeFire();c.boss.hitstun=.2;const timer=c.boss.timer;c.updateSpree(.1);assert.equal(c.boss.timer,timer);assert.ok(Math.abs(c.spree.beams[0].life-.24)<1e-9);assert.equal(c.hero.hp,82);
});
test('blocking keeps the original directional damage reduction and invulnerability',async()=>{
 const {c}=await harness();c.hero.block=true;c.hero.face=1;c.spreeAttack('beam');c.spreeFire();c.updateSpree(.01);assert.ok(Math.abs(c.hero.hp-(100-18*.18))<1e-9);const hp=c.hero.hp;c.updateSpree(.01);assert.equal(c.hero.hp,hp);
});
test('beam collision retains slab intersection and correctly misses above and behind',async()=>{
 const {c}=await harness();const beam={x:500,y:400,angle:Math.PI,length:1450,width:30};assert.equal(c.spreeBeamHit(beam),true);c.hero.y=300;assert.equal(c.spreeBeamHit(beam),false);c.hero.y=604;c.hero.x=700;assert.equal(c.spreeBeamHit(beam),false);
});
test('co-op beams mark and damage each hero independently only once',async()=>{
 const {c}=await harness();const team=[c.hero,{...c.hero,x:200}];let index=0;
 c.coEach=action=>{const old=c.hero;for(index=0;index<2;index++){c.hero=team[index];action();}c.hero=old;};c.coHitFlag=b=>!!b['hit'+index];c.coMarkHit=b=>b['hit'+index]=true;
 c.spreeAttack('beam');c.spreeFire();c.updateSpree(.01);assert.deepEqual(team.map(h=>h.hp),[82,82]);for(const h of team)h.inv=0;c.updateSpree(.01);assert.deepEqual(team.map(h=>h.hp),[82,82]);
});
test('new round objects cannot inherit the previous round heavy reaction',async()=>{
 const {c}=await harness();c.hitBoss(10,1,5,'kick');assert.equal(c.HealthiaLighteningSpreeAnimation.inspect().pose,15);c.boss={...c.boss,vx:0,hitstun:.14};assert.equal(c.HealthiaLighteningSpreeAnimation.inspect().pose,14);
});
test('all direct previews initialize actual attacks, invisibility and shatter without invalid state',async()=>{
 const source=fs.readFileSync(path.join(root,'assets/animation/lightening-spree-review.js'),'utf8');
 for(const move of ['idle','vanish','beam','spark','double','defeat']){const {c}=await harness();c.session=null;c.run=source=>vm.runInContext(source,c);c.document.getElementById=()=>({checked:false});c.play=(practice,setup)=>{vm.runInContext(setup,c);return true;};vm.runInContext(fn('releaseHold',source),c);vm.runInContext(fn('demo',source),c);c.demo(move);for(let i=0;i<500;i++){c.t+=1/120;c.hero.inv=999;c.updateSpree(1/120);c.drawSpree();assert.ok(Number.isFinite(c.boss.x));}}
});
test('mirrored review transforms stored aim and teleport destinations with the fighters',async()=>{
 const {c}=await harness();const source=fs.readFileSync(path.join(root,'assets/animation/lightening-spree-review.js'),'utf8');
 Object.assign(c,{available:()=>true,speed(){},reviewHero:0,lastError:'',session:null,HealthiaIntro:{dismiss(){}},HealthiaCave:{close(){}},story:{cleanup(){}},specialSceneReset(){},coLeave(){},showModeSelect(){},start(){c.resetSpree();c.boss.dir=-1;},preview:{contentWindow:{focus(){}}},run:source=>vm.runInContext(source,c)});
 c.document.getElementById=()=>({checked:true});vm.runInContext(fn('releaseHold',source),c);vm.runInContext(fn('play',source),c);const setup='hero.x=300;boss.x=800;spree.destination=1000;spreeAttack("beam");';
 c.play(true,setup);const a=c.spreeOrigin(),target=Math.atan2(c.hero.y-125-a.y,c.hero.x-a.x);assert.ok(Math.abs(Math.sin(c.spree.aim)-Math.sin(target))<1e-9);assert.ok(Math.abs(Math.cos(c.spree.aim)-Math.cos(target))<1e-9);assert.equal(c.spree.destination,280);
});
test('optional release hold freezes only after firing and normal play clears it',async()=>{
 const {c}=await harness();const source=fs.readFileSync(path.join(root,'assets/animation/lightening-spree-review.js'),'utf8');let steps=0;
 c.run=source=>vm.runInContext(source,c);c.updateStep=()=>steps++;c.document.getElementById=()=>({checked:false});
 vm.runInContext(fn('releaseHold',source),c);vm.runInContext(fn('speed',source),c);c.speed();c.releaseHold(true);c.updateStep(.1);assert.equal(steps,1);assert.equal(c.spreeReviewFrozen,false);
 c.spreeAttack('beam');c.spreeFire();assert.equal(c.spree.beams.length,1);assert.equal(c.spreeReviewFrozen,true);c.updateStep(.1);assert.equal(steps,1);
 c.releaseHold(false);c.updateStep(.1);assert.equal(steps,2);c.spreeFire();assert.equal(c.spreeReviewFrozen,false);
});
test('production entries match, retain Story Mode and never load review controls',()=>{
 assert.equal(html,fs.readFileSync(path.join(root,'hero-showdown.html'),'utf8'));for(const part of ['core','atlas','motion'])assert.ok(html.includes('assets/animation/lightening-spree-'+part+'.js'));
 assert.ok(html.includes('assets/js/story-mode.js'));assert.ok(!html.includes('lightening-spree-review.js'));assert.ok(!html.includes('styro-preview-scope.js'));
});
