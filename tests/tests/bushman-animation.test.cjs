'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../dist'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const native= require('../dist/assets/bushman/bushman-core.js');
const core=require('../dist/assets/animation/bushman-animation-core.js'),atlas=require('../dist/assets/animation/bushman-animation-atlas.js');
const fighter=fs.readFileSync(path.join(root,'assets/bushman/bushman-fighter.js'),'utf8'),renderer=fs.readFileSync(path.join(root,'assets/bushman/bushman-renderer.js'),'utf8');
const review=fs.readFileSync(path.join(root,'assets/animation/bushman-animation-review.js'),'utf8');
const clone=x=>JSON.parse(JSON.stringify(x));
function fn(name,source){const start=source.indexOf('function '+name+'(');assert.ok(start>=0,name);let i=source.indexOf('{',start)+1,depth=1;for(;depth;i++){if(source[i]==='{')depth++;if(source[i]==='}')depth--;}return source.slice(start,i);}
const p=(extra={})=>({victory:false,breakout:null,hitstun:0,recoil:0,guard:0,guarding:false,moving:false,stride:0,time:0,action:null,...extra});
const action=(kind,age,released=false)=>p({action:{kind,age,released},attack:native.ATTACKS[kind]});
async function harness({candidate=true,search='',fail=false,invalid=false,bitmap=true,bitmapFails=false}={}){
 const calls=[],images=[],profile=clone(atlas);if(invalid)profile.sheets[0].frames[0].crop[2]=100000;
 let seed=17;const math=Object.create(Math);math.random=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
 const c={HealthiaBushmanMotionCore:core,HealthiaBushmanAtlas:profile,BushmanCore:native,Math:math,location:{search},URLSearchParams,Promise,Map,WeakMap,
  hero:{x:650,y:604,hp:100,inv:0,power:35,face:1,block:false},boss:{x:800,vx:0,hp:650,max:650,hitstun:0,cd:999,state:'idle',timer:0,count:0,dir:-1},opponent:8,selected:0,phase:1,t:0,ending:0,GROUND:604,W:1280,FIXED_STEP:1/120,simulationRemainder:0,
  mode:'fight',paused:false,hitStop:0,bushman:native.create(),effects:[],sounds:[],combo:0,comboTime:0,best:0,shake:0,specialScene:{committing:false},
  clamp:core.clamp,combatSound:(...a)=>c.sounds.push(a),burst(){},noise(){},ellipse(){},line(){},poly(){},text(){},resetHeroCombo(){},syncAnimation(){},directionTaps:{},
  coEach:cb=>cb(),coGuest:()=>false,specialSceneLocked:()=>false,spreeInvisible:()=>false,tryOpponentGuard:()=>false,specialSceneTryHit:()=>false,bossMaterial:()=> 'vine',
  finish:win=>{c.mode=win?'victory':'defeat';native.cancel(c.bushman);c.bushman.projectiles=[];c.bushman.zones=[];c.bushman.flares=[];},
  bushmanSprite:(...args)=>calls.push({fallback:true,args}),bushmanImages:{fx:{naturalWidth:1536,asset:'native-fire-fx'}}};
 c.ctx={globalAlpha:1,save(){},restore(){},translate(x,y){assert.ok(Number.isFinite(x)&&Number.isFinite(y));calls.push({position:[x,y]});},scale(x,y){assert.ok(Number.isFinite(x)&&Number.isFinite(y));calls.push({scale:[x,y]});},drawImage(texture,...args){calls.push({art:texture.asset,args});},beginPath(){},ellipse(){},stroke(){},moveTo(){},lineTo(){},setLineDash(){},arc(){},fill(){},fillRect(){},createRadialGradient(){return {addColorStop(){}};}};
 c.document={createElement(){const canvas={};canvas.getContext=()=>({drawImage(im){canvas.asset=im.src;}});return canvas;}};
 c.Image=class{set src(value){this._src=value;images.push(value);queueMicrotask(()=>{if(fail&&value.includes('walk')){this.onerror();return;}const b=fs.readFileSync(path.join(root,value));this.naturalWidth=b.readUInt32BE(16);this.naturalHeight=b.readUInt32BE(20);this.onload();});}get src(){return this._src;}};
 if(bitmap)c.createImageBitmap=async canvas=>{if(bitmapFails)throw Error('Unavailable');return {width:canvas.width,height:canvas.height,asset:canvas.asset};};
 c.window=c;vm.createContext(c);
 for(const name of ['bushmanBegin','bushmanDamage','bushmanFlare','bushmanRelease','updateBushman','advanceBushmanEffects'])vm.runInContext(fn(name,fighter),c);
 for(const name of ['bushmanPose','bushmanFX','drawBushmanGround','drawBushman','drawBushmanEffects'])vm.runInContext(fn(name,renderer),c);
 for(const name of ['hitBoss','hitHero'])vm.runInContext(fn(name,html),c);
 vm.runInContext('(function(){'+fighter.slice(fighter.indexOf('const oldHit=hitBoss;'),fighter.indexOf(' const oldStep=updateStep;'))+'})();',c);
 if(candidate){vm.runInContext(fs.readFileSync(path.join(root,'assets/animation/bushman-animation-motion.js'),'utf8'),c);await c.HealthiaBushmanAnimation.whenLoaded;}
 return {c,calls,images};
}
test('Bushman registers thirty-two distinct complete crops from four intact transparent sources',async()=>{
 const {c}=await harness();assert.equal(c.HealthiaBushmanAnimation.ready(),true);assert.equal(c.HealthiaBushmanAnimation.metrics().addedDrawings,32);
 const ids=[];for(const sheet of atlas.sheets){const b=fs.readFileSync(path.join(root,'assets/animation',sheet.file));assert.equal(b[25],6);for(const f of sheet.frames){ids.push(f.id);const [x,y,w,h,ax,ay]=f.crop;assert.ok(x>=0&&y>=0&&x+w<=b.readUInt32BE(16)&&y+h<=b.readUInt32BE(20));assert.ok(ax>=x&&ax<=x+w&&ay>=y&&ay<=y+h);}}
 assert.deepEqual(ids.sort((a,b)=>a-b),Array.from({length:32},(_,i)=>i));
});
test('eight walking phases follow distance and remain independent of idle time',()=>{
 const frames=Array.from({length:8},(_,i)=>core.pose(p({moving:true,stride:i/8+.001,time:99})).frame);assert.deepEqual(frames,[0,1,2,3,4,5,6,7]);
 assert.equal(core.pose(p({moving:true,stride:2.51,time:0})).frame,core.pose(p({moving:true,stride:2.51,time:100})).frame);
 assert.equal(new Set([0,.61,1.21,1.81].map(time=>core.pose(p({time})).frame)).size,4);
});
test('every ordinary pose has a planted ground anchor and finite body scale',()=>{
 for(const sheet of atlas.sheets)for(const frame of sheet.frames){const r=core.registration(frame,frame.referenceHeight||sheet.referenceHeight,{});assert.equal(r.anchor[1],frame.crop[5]-frame.crop[1]);assert.ok(r.scale>.3&&r.scale<1);}
});
test('all five attacks wait for the authoritative release flag before showing contact',()=>{
 for(const kind of Object.keys(native.ATTACKS)){const timing=native.ATTACKS[kind];const before=core.pose(action(kind,timing.windup+timing.contact,false)),after=core.pose(action(kind,timing.windup+timing.contact,true));assert.notEqual(before.frame,after.frame);assert.ok(!before.contact&&!before.emitting);assert.match(before.state,/ready/);}
 assert.equal(core.pose(action('blast',1.3,true)).frame,30);assert.equal(core.pose(action('blast',1.7,true)).frame,30);
});
test('punch, kick and projectile launch points match native reach and height in both facings',async()=>{
 const {c}=await harness();for(const dir of [-1,1])for(const [kind,reach,height] of [['punch',132,145],['kick',165,118],['fireball',102,146],['scorch',102,146]]){
  const s=native.ATTACKS[kind];c.bushman.action={kind,face:dir,age:s.windup+s.contact,released:true};const v=c.HealthiaBushmanAnimation.inspect();assert.ok(Math.abs(v.contact.x-(c.boss.x+dir*reach))<1e-9);assert.ok(Math.abs(v.contact.y-(604-height))<1e-9);
 }
});
test('actual damage selects light or heavy recoil without adding authoritative boss fields',async()=>{
 const {c:a}=await harness({candidate:false}),{c:b}=await harness();for(const [damage,kind,frame] of [[7,'punch',12],[12,'kick',13],[25,'special',13]]){a.hitBoss(damage,1,5,kind);b.hitBoss(damage,1,5,kind);assert.deepEqual(clone(a.boss),clone(b.boss));assert.deepEqual(clone(a.bushman),clone(b.bushman));assert.equal(b.HealthiaBushmanAnimation.inspect().pose,frame);}
 b.bushman.recoil=.11;assert.equal(b.HealthiaBushmanAnimation.inspect().pose,14);b.bushman.recoil=.04;assert.equal(b.HealthiaBushmanAnimation.inspect().pose,15);
});
test('guarded hits do not invent a reaction or cancel an attack',async()=>{
 const {c}=await harness();c.bushmanBegin('punch');c.tryOpponentGuard=()=>true;const before=JSON.stringify([c.boss,c.bushman]);c.hitBoss(30,1,5,'kick');assert.equal(JSON.stringify([c.boss,c.bushman]),before);assert.equal(c.HealthiaBushmanAnimation.inspect().state,'punch windup');
});
test('interrupting the charged blast cancels it without spending the four earned hits',async()=>{
 const {c}=await harness();c.bushman.charge=4;c.bushmanBegin('blast');c.updateBushman(.4);c.hitBoss(7,1,5,'punch');assert.equal(c.bushman.action,null);assert.equal(c.bushman.charge,4);assert.equal(c.bushman.recoil,.27);assert.equal(c.HealthiaBushmanAnimation.inspect().state,'light hit');
});
test('original counter and kneeling defeat renderers remain active',async()=>{
 const {c,calls}=await harness();for(const mode of ['counter','victory']){c.mode=mode==='victory'?'victory':'fight';c.boss.breakout=mode==='counter'?{age:.1}:null;calls.length=0;c.drawBushman();assert.ok(calls.some(v=>v.fallback));assert.equal(calls.filter(v=>String(v.art).includes('animation')).length,0);}
});
test('a missing sheet or invalid crop leaves the entire original body active',async()=>{
 for(const options of [{fail:true},{invalid:true}]){const {c,calls}=await harness(options);assert.equal(c.HealthiaBushmanAnimation.ready(),false);assert.ok(c.HealthiaBushmanAnimation.metrics().errors.length);c.drawBushman();assert.ok(calls.some(v=>v.fallback));}
});
test('canvas preparation works without immutable bitmaps and when bitmap creation fails',async()=>{
 for(const options of [{bitmap:false},{bitmapFails:true}]){const {c,calls}=await harness(options);assert.equal(c.HealthiaBushmanAnimation.ready(),true);c.drawBushman();assert.ok(calls.some(v=>String(v.art).includes('animation')));}
});
test('the original comparison loads no extra textures and other opponents use their original body',async()=>{
 const original=await harness({search:'?bushman=original'});assert.equal(original.images.length,0);original.c.drawBushman();assert.ok(original.calls.some(v=>v.fallback));
 const {c,calls}=await harness();for(let i=0;i<8;i++){c.opponent=i;calls.length=0;c.bushmanSprite('motion',0,800,604,-1);assert.ok(calls[0].fallback);}
});
test('walking interpolation is visual only and locks during pauses, hit stop, cinematics and guest playback',async()=>{
 const {c}=await harness();c.hero.x=150;c.updateBushman(1/120);c.simulationRemainder=1/240;const x=c.boss.x;assert.ok(c.HealthiaBushmanAnimation.inspect().x>x);
 for(const key of ['paused','hitStop']){c[key]=1;assert.equal(c.HealthiaBushmanAnimation.inspect().x,x);c[key]=0;}
 for(const key of ['coGuest','specialSceneLocked']){c[key]=()=>true;assert.equal(c.HealthiaBushmanAnimation.inspect().x,x);c[key]=()=>false;}
 assert.equal(c.boss.x,x);
});
test('facing changes, teleports and new rounds discard stale position or reaction history',async()=>{
 const a={x:500,face:-1,state:'idle',stride:2},b={x:499,face:-1,state:'idle',stride:2.01};assert.equal(core.interpolate(a,b,.5,false).x,499.5);
 for(const changed of [{...b,face:1},{...b,x:800},{...b,state:'warn'}])assert.deepEqual(core.interpolate(a,changed,.5,false),changed);
 const {c}=await harness();c.hitBoss(10,1,5,'kick');assert.equal(c.HealthiaBushmanAnimation.inspect().pose,13);c.boss={...c.boss,vx:0};assert.equal(c.HealthiaBushmanAnimation.inspect().pose,12);
});
test('repeated rendering never mutates combat data, hazards, charge, or effects',async()=>{
 const {c}=await harness();for(const kind of Object.keys(native.ATTACKS))for(const face of [-1,1]){
  c.bushman.action=null;c.bushman.charge=4;c.bushmanBegin(kind);c.bushman.action.face=face;c.updateBushman(.3);
  const before=JSON.stringify([c.boss,c.bushman,c.hero,c.effects,c.sounds]);for(let i=0;i<10;i++){c.drawBushman();c.drawBushmanEffects();}assert.equal(JSON.stringify([c.boss,c.bushman,c.hero,c.effects,c.sounds]),before);
 }
});
for(const kind of Object.keys(native.ATTACKS))test(kind+' preserves original combat at 30/60/120/144 Hz and three difficulty paces',async()=>{
 for(const pace of [1,1.3,1.65])for(const hz of [30,60,120,144]){
  const {c:a}=await harness({candidate:false}),{c:b}=await harness();for(const c of [a,b]){c.hero.hp=10000;c.bushman.charge=4;c.bushmanBegin(kind);}
  let remainder=0;for(let frame=0;frame<Math.ceil(hz*6);frame++){
   remainder+=1/hz;while(remainder+1e-9>=1/120){for(const c of [a,b]){c.t+=1/120;c.hero.inv=Math.max(0,c.hero.inv-1/120);c.updateBushman(pace/120);c.advanceBushmanEffects(1/120);}remainder-=1/120;}
   b.simulationRemainder=remainder;b.drawBushman();b.drawBushmanEffects();const state=c=>JSON.stringify([c.boss,c.bushman,c.hero,c.effects,c.sounds,c.mode]);assert.equal(state(a),state(b));
  }
 }
});
test('only landed unblocked unique attacks earn one charge, including co-op contact',async()=>{
 const {c}=await harness();const team=[c.hero,{...c.hero,x:640}];c.coEach=cb=>{const old=c.hero;for(const h of team){c.hero=h;cb();}c.hero=old;};
 c.bushmanBegin('punch');c.updateBushman(.38);assert.deepEqual(team.map(h=>h.hp),[86,86]);assert.equal(c.bushman.charge,1);
 for(const h of team){h.inv=0;h.block=true;}c.bushmanDamage(14,800,'kick',2);assert.equal(c.bushman.charge,1);
 c.hero.block=false;c.hero.inv=0;c.bushmanDamage(4,650,'burn',3,true);assert.equal(c.bushman.charge,1);
 for(let id=4;id<8;id++){c.hero.inv=0;c.bushmanDamage(14,800,'fireball',id);}assert.equal(c.bushman.charge,4);
});
test('the blast consumes charge only on release and retains double damage and original fire effect',async()=>{
 const {c}=await harness();c.bushman.charge=4;c.bushmanBegin('blast');c.updateBushman(1.19);assert.equal(c.bushman.charge,4);assert.equal(c.bushman.flares.length,0);c.updateBushman(.01);assert.equal(c.bushman.charge,0);assert.equal(c.hero.hp,72);assert.equal(c.bushman.flares[0].kind,'blast');assert.equal(c.bushman.flares[0].x,772);assert.equal(c.HealthiaBushmanAnimation.inspect().pose,30);
});
test('fireballs retain their swept collision and advance during an interrupted attack',async()=>{
 const {c}=await harness();c.hero.x=400;c.bushmanBegin('fireball');c.updateBushman(.61);const start=c.bushman.projectiles[0].x;c.hitBoss(7,1,5,'punch');c.advanceBushmanEffects(.1);assert.equal(c.bushman.projectiles[0].x,start-44);c.advanceBushmanEffects(.6);assert.equal(c.hero.hp,86);assert.equal(c.bushman.projectiles.length,0);assert.equal(c.bushman.charge,1);
});
test('burning ground keeps its target, seven-second cooldown and uncharged damage',async()=>{
 const {c}=await harness();c.hero.x=400;c.bushmanBegin('scorch');assert.equal(c.bushman.scorchCooldown,7);c.updateBushman(.88);assert.equal(c.bushman.projectiles[0].kind,'seed');c.advanceBushmanEffects(.69);assert.equal(c.bushman.zones.length,0);c.advanceBushmanEffects(.01);assert.equal(c.bushman.zones.length,1);assert.equal(c.bushman.zones[0].x,400);assert.equal(c.bushman.zones[0].radius,76);assert.equal(c.hero.hp,96);assert.equal(c.bushman.charge,0);assert.ok(Math.abs(c.bushman.zones[0].life-5.49)<1e-9);
});
test('all direct move previews initialize valid native combat and defeat state',async()=>{
 for(const move of ['walk','punch-attack','kick-attack','fireball','scorch','blast','defeat']){const {c}=await harness();c.session=null;c.run=s=>vm.runInContext(s,c);c.document.getElementById=()=>({checked:false});c.play=(practice,setup)=>{vm.runInContext(setup,c);return true;};vm.runInContext(fn('releaseHold',review),c);vm.runInContext(fn('demo',review),c);c.demo(move);if(move==='punch-attack')assert.ok(native.meleeHit(c.boss.x,-1,132,145,c.hero));for(let i=0;i<240;i++){c.hero.inv=999;c.updateBushman(1/120);c.advanceBushmanEffects(1/120);c.drawBushman();assert.ok(native.valid(c.bushman));}}
});
test('mirrored review moves stored attack targets, seeds, ground zones and flares with the fighters',async()=>{
 const {c}=await harness();Object.assign(c,{available:()=>true,speed(){},reviewHero:0,lastError:'',session:null,HealthiaIntro:{dismiss(){}},HealthiaCave:{close(){}},story:{cleanup(){}},specialSceneReset(){},coLeave(){},showModeSelect(){},start(){c.bushman=native.create();},preview:{contentWindow:{focus(){}}},run:s=>vm.runInContext(s,c)});
 c.document.getElementById=()=>({checked:true});vm.runInContext(fn('releaseHold',review),c);vm.runInContext(fn('play',review),c);
 c.play(true,'hero.x=300;boss.x=800;bushmanBegin("scorch");updateBushman(.88);bushman.zones=[{x:300}];');assert.equal(c.hero.x,980);assert.equal(c.boss.x,480);assert.equal(c.bushman.action.face,1);assert.equal(c.bushman.action.target,980);assert.equal(c.bushman.projectiles[0].sx,582);assert.equal(c.bushman.projectiles[0].target,980);assert.equal(c.bushman.zones[0].x,980);assert.equal(c.bushman.flares[0].face,1);
});
test('contact hold freezes only after a real release and clearing it resumes normal simulation',async()=>{
 const {c}=await harness();let steps=0;c.run=s=>vm.runInContext(s,c);c.updateStep=()=>steps++;c.document.getElementById=()=>({checked:false});vm.runInContext(fn('releaseHold',review),c);vm.runInContext(fn('speed',review),c);c.speed();c.releaseHold(true);c.updateStep(.1);assert.equal(steps,1);assert.equal(c.bushmanReviewFrozen,false);
 c.bushmanBegin('fireball');c.updateBushman(.61);assert.equal(c.bushman.projectiles.length,1);assert.equal(c.bushmanReviewFrozen,true);c.updateStep(.1);assert.equal(steps,1);c.releaseHold(false);c.updateStep(.1);assert.equal(steps,2);
});
test('production entries match, retain Story Mode and do not load optional review controls',()=>{
 assert.equal(html,fs.readFileSync(path.join(root,'hero-showdown.html'),'utf8'));for(const part of ['core','atlas','motion'])assert.ok(html.includes('assets/animation/bushman-animation-'+part+'.js'));assert.ok(html.includes('assets/js/story-mode.js'));assert.ok(!html.includes('bushman-animation-review.js'));
});
