'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../dist'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),core=require('../dist/assets/animation/atomdust-core.js');
function fn(name,source=html){const start=source.indexOf('function '+name+'(');assert.ok(start>=0,name);let i=source.indexOf('{',start)+1,depth=1;for(;depth;i++){if(source[i]==='{')depth++;if(source[i]==='}')depth--;}return source.slice(start,i);}
const rigStart=html.indexOf('const atomRig=')+'const atomRig='.length,rig=JSON.parse(html.slice(rigStart,html.indexOf(';',rigStart)));
const clone=x=>JSON.parse(JSON.stringify(x));
async function harness({candidate=true,search='',invalid=false,bitmap=true,bitmapFails=false}={}){
 const calls=[],prepared=[];
 const c={HealthiaAtomdustCore:core,Math,location:{search},URLSearchParams,Promise,Map,WeakMap,
  hero:{x:300,y:604,hp:100,inv:0,face:1},boss:{x:800,vx:0,hp:650,max:650,hitstun:0,cd:999,state:'idle',timer:0,count:0,dir:-1},opponent:6,selected:0,heroes:[{height:240},{height:210},{height:190}],phase:1,t:0,ending:0,GROUND:604,W:1280,
  mode:'fight',paused:false,hitStop:0,FIXED_STEP:1/120,simulationRemainder:1/240,guest:false,sceneLocked:false,
  effects:[],hits:[],sounds:[],atom:null,atomRig:clone(rig),atomImage:{complete:true,width:512,height:768,asset:'original-art'},clamp:core.clamp,
  combatSound:(...a)=>c.sounds.push(a),atomCapSound:()=>c.sounds.push(['cap']),burst(){},noise(){},
  coActive:()=>false,coEach:action=>action(),hitHero:(damage,origin)=>{if(c.hero.inv>0)return false;c.hero.hp-=damage;c.hero.inv=.5;c.hits.push([damage,origin]);return true;},finish:win=>{c.mode=win?'victory':'defeat';},
  specialSceneLocked:()=>c.sceneLocked,coGuest:()=>c.guest,drawAtom:()=>calls.push({fallback:true})};
 if(invalid)c.atomRig.parts[0].r[0]=-100;
 c.ctx={save(){},restore(){},translate(x,y){assert.ok(Number.isFinite(x)&&Number.isFinite(y));calls.push({position:[x,y]});},rotate(x){assert.ok(Number.isFinite(x));},scale(x,y){assert.ok(Number.isFinite(x)&&Number.isFinite(y));calls.push({scale:[x,y]});},drawImage(texture){calls.push({art:texture.asset});}};
 c.document={createElement(){const canvas={};canvas.getContext=()=>({drawImage(im,...args){canvas.asset=im.asset;prepared.push(args);}});return canvas;}};
 if(bitmap)c.createImageBitmap=async canvas=>{if(bitmapFails)throw Error('Unavailable');return {width:canvas.width,height:canvas.height,asset:canvas.asset,immutable:true};};
 c.window=c;vm.createContext(c);
 for(const name of ['resetAtom','atomTryDodge','atomSmokeContains','atomSlowFactor','atomInhalation','atomLaunchSmoke','atomLaunchCap','atomStartAttack','updateAtomEffects','updateAtom','atomSkeleton','atomHand'])vm.runInContext(fn(name),c);
 c.resetAtom();
 if(candidate){vm.runInContext(fs.readFileSync(path.join(root,'assets/animation/atomdust-motion.js'),'utf8'),c);await c.HealthiaAtomdustAnimation.whenLoaded;}
 return {c,calls,prepared};
}
const p=(extra={})=>({state:'idle',type:'punch',timer:0,time:0,duration:.55,age:0,moving:false,walkWeight:0,stride:0,hitstun:0,hitStrength:.6,disperse:0,...extra});
test('eight gait keys alternate planted and lifted feet and interpolate continuously',()=>{
 const samples=Array.from({length:8},(_,i)=>core.walkSample(i/8));assert.equal(new Set(samples.map(JSON.stringify)).size,8);
 assert.ok(samples[0][0]>samples[4][0]);assert.ok(samples[0][2]<samples[4][2]);
 for(let i=0;i<8;i++){const a=core.walkSample(i/8-1e-8),b=core.walkSample(i/8+1e-8);assert.ok(a.every((v,k)=>Math.abs(v-b[k])<1e-4));}
 assert.deepEqual(core.walkSample(0),core.walkSample(1000));
});
test('visual joint calculations never modify authoritative skeleton inputs',()=>{
 const base=clone(rig.joints),original=clone(base),before=JSON.stringify([base,original]);
 for(const state of ['idle','warn','attack','recover'])for(const type of ['punch','kick','jumpkick','smoke','caps'])core.joints(original,base,p({state,type,walkWeight:1,stride:.4,timer:.3,age:.25}));
 assert.equal(JSON.stringify([base,original]),before);
});
test('breathing keeps foot anchors fixed while walking is driven by distance',()=>{
 for(const time of [0,.7,1.4]){const j=core.joints(rig.joints,rig.joints,p({time}));assert.deepEqual(j.ff,rig.joints.ff);assert.deepEqual(j.bf,rig.joints.bf);}
 const a=core.joints(rig.joints,rig.joints,p({time:0,moving:true,walkWeight:1,stride:.2}));
 assert.deepEqual(a,core.joints(rig.joints,rig.joints,p({time:100,moving:true,walkWeight:1,stride:.2})));
});
test('ten cached body layers replace hundreds of normal per-frame tile draws',async()=>{
 const {c,calls,prepared}=await harness();assert.equal(c.HealthiaAtomdustAnimation.ready(),true);assert.equal(prepared.length,rig.parts.length);
 assert.equal(c.HealthiaAtomdustAnimation.metrics().cachedLayers,10);assert.equal(rig.parts.length,694);
 c.drawAtom();assert.equal(calls.filter(v=>v.art).length,10);assert.equal(prepared.length,694);
});
test('canvas-only browsers and immutable-texture failures retain the enhanced body',async()=>{
 for(const options of [{bitmap:false},{bitmapFails:true}]){const {c,calls}=await harness(options);assert.equal(c.HealthiaAtomdustAnimation.ready(),true);c.drawAtom();assert.equal(calls.filter(v=>v.art).length,10);}
});
test('invalid preparation and Original comparison use the original renderer',async()=>{
 for(const options of [{invalid:true},{search:'?atomdust=original'}]){const {c,calls}=await harness(options);assert.equal(c.HealthiaAtomdustAnimation.active(),false);c.drawAtom();assert.ok(calls.at(-1).fallback);}
});
test('other opponents never use Atomdust layers',async()=>{
 const {c,calls}=await harness();for(const opponent of [0,1,2,3,4,5,7,8]){c.opponent=opponent;c.drawAtom();assert.ok(calls.at(-1).fallback);}
});
test('disperse, counter and defeat use the original complete particle renderer',async()=>{
 const {c,calls}=await harness();for(const state of ['disperse','counter','victory']){
  c.atom.disperse=state==='disperse'?.4:0;c.boss.breakout=state==='counter'?{age:.1}:null;c.mode=state==='victory'?'victory':'fight';c.drawAtom();assert.ok(calls.at(-1).fallback);
 }
});
test('hands and feet remain at authoritative attack positions in both facings',async()=>{
 const {c}=await harness();for(const dir of [-1,1])for(const type of ['punch','kick','jumpkick','smoke','caps'])for(const age of [0,.14,.18,.22,.30,.35,.46,.6]){
  Object.assign(c.boss,{dir,state:'attack',type,duration:type==='jumpkick'?.8:type==='smoke'?.86:type==='caps'?.9:.55,timer:0,volley:3});c.boss.timer=c.boss.duration-age;
  const original=c.atomSkeleton(),rendered=c.HealthiaAtomdustAnimation.inspect().joints;
  for(const key of ['fh','bh','ff','bf'])assert.deepEqual(clone(rendered[key]),clone(original[key]));
  for(const which of ['front','back','foot']){const key=which==='front'?'fh':which==='back'?'bh':'ff',expected={x:c.boss.x+dir*(rendered[key][0]-rig.root[0])*rig.scale,y:604+(rendered[key][1]-rig.root[1])*rig.scale};assert.deepEqual(clone(c.atomHand(which)),expected);}
 }
});
test('pause, hitstop, scene locks and guests do not interpolate moving roots',async()=>{
 const {c}=await harness();c.updateAtom(1/120);assert.notEqual(c.HealthiaAtomdustAnimation.inspect().x,c.boss.x);
 for(const field of ['paused','hitStop','sceneLocked','guest']){c[field]=true;assert.equal(c.HealthiaAtomdustAnimation.inspect().x,c.boss.x);c[field]=false;}
 c.boss.hitstun=.2;assert.equal(c.HealthiaAtomdustAnimation.inspect().x,c.boss.x);
});
test('new rounds, direction changes and teleports discard stale interpolation',async()=>{
 const {c}=await harness();c.updateAtom(1/120);c.boss={...c.boss,x:500,dir:1};assert.equal(c.HealthiaAtomdustAnimation.inspect().x,500);assert.equal(c.HealthiaAtomdustAnimation.inspect().facing,1);
 c.updateAtom(1/120);c.boss.x=950;assert.equal(c.HealthiaAtomdustAnimation.inspect().x,950);
});
test('rendering does not alter the boss, hazards, hit counters or either hand',async()=>{
 const {c}=await harness();for(const type of ['punch','kick','jumpkick','smoke','caps'])for(const state of ['idle','warn','attack','recover']){
  Object.assign(c.boss,{state,type,timer:.3,duration:.8});const before=JSON.stringify([c.boss,c.atom,c.hero,c.atomHand('front'),c.atomHand('back')]);
  for(let i=0;i<8;i++)c.drawAtom();assert.equal(JSON.stringify([c.boss,c.atom,c.hero,c.atomHand('front'),c.atomHand('back')]),before);
 }
});
for(const type of ['punch','kick','jumpkick','smoke','caps'])test(type+' matches original combat at 30/60/120/144 Hz, all phases and difficulty paces',async()=>{
 for(const phase of [1,2,3])for(const pace of [1,1.3,1.65])for(const hz of [30,60,120,144]){
  const {c:a}=await harness({candidate:false}),{c:b}=await harness();
  for(const c of [a,b]){c.phase=phase;c.hero.x=570;c.atomStartAttack(type);}
  let remainder=0;for(let frame=0;frame<Math.ceil(hz*5);frame++){
   remainder+=1/hz;while(remainder+1e-9>=1/120){for(const c of [a,b]){c.t+=1/120;c.hero.inv=Math.max(0,c.hero.inv-1/120);c.updateAtom(pace/120);}remainder-=1/120;}
   b.simulationRemainder=remainder;b.drawAtom();const state=c=>JSON.stringify([c.boss,c.atom,c.hero,c.hits,c.effects,c.sounds,c.mode]);assert.equal(state(a),state(b));
  }
 }
});
test('smoke launches once at .18 seconds from the two original hands',async()=>{
 const {c}=await harness();Object.assign(c.boss,{state:'attack',type:'smoke',duration:.86,timer:.681,struck:false});c.updateAtom(.002);
 assert.equal(c.atom.clouds.length,1);const a=c.atomHand('front'),b=c.atomHand('back');assert.equal(c.atom.clouds[0].origin,(a.x+b.x)/2);assert.equal(c.atom.smokeCd,10);
 for(let i=0;i<30;i++)c.updateAtom(.01);assert.equal(c.atom.clouds.length,1);
});
test('the three sharp caps keep their exact release times and cooldown',async()=>{
 const {c}=await harness();Object.assign(c.boss,{state:'attack',type:'caps',duration:.9,timer:.9,volley:0});
 for(const [i,age] of [.14,.30,.46].entries()){c.boss.timer=.9-age+.001;c.updateAtom(.002);assert.equal(c.atom.caps.length,i+1);assert.equal(c.boss.volley,i+1);const p=c.atom.caps.at(-1),hand=c.atomHand('front');assert.equal(p.x,hand.x);assert.equal(p.y,hand.y);}
 c.boss.timer=.05;c.updateAtom(.01);assert.equal(c.boss.volley,3);assert.ok(c.atom.capCd>4);
});
test('toxic inhalation bypasses block and invulnerability and retains half speed',async()=>{
 const {c}=await harness();c.hero.x=400;c.hero.block=true;c.hero.inv=99;c.atom.clouds=[{x:400,origin:400,dir:1,life:3.5}];c.updateAtomEffects(.5);
 assert.equal(c.hero.hp,99);assert.equal(c.atomSlowFactor(),.5);assert.equal(c.hero.inv,99);assert.equal(c.hero.block,true);
});
test('smoke exposure affects each co-op hero independently',async()=>{
 const {c}=await harness();const team=[{x:400,y:604,hp:100},{x:1000,y:604,hp:100}];c.coActive=()=>true;c.coEach=action=>{const old=c.hero;for(const h of team){c.hero=h;action();}c.hero=old;};
 c.atom.clouds=[{x:400,origin:400,dir:1,life:3.5}];c.updateAtomEffects(.5);assert.deepEqual(team.map(h=>h.hp),[99,100]);
});
test('hitstun freezes attack timing while toxic clouds and sharp caps keep moving',async()=>{
 const {c}=await harness();Object.assign(c.boss,{state:'attack',type:'caps',timer:.7,duration:.9,hitstun:.2});c.atom.caps=[{x:100,oldX:100,y:200,vx:520,life:2,spin:0}];c.atom.clouds=[{x:100,origin:100,dir:1,life:3.5}];
 c.updateAtom(.1);assert.equal(c.boss.timer,.7);assert.equal(c.atom.caps[0].x,152);assert.equal(c.atom.clouds[0].life,3.4);
});
test('the fourth hit still disperses for the original duration and reforms',async()=>{
 const {c}=await harness();assert.deepEqual([1,2,3,4].map(()=>c.atomTryDodge()),[false,false,false,true]);assert.equal(c.atom.hits,0);assert.equal(c.atom.disperse,.6);assert.equal(c.HealthiaAtomdustAnimation.inspect().legacy,true);
 c.t=.61;c.updateAtom(.01);assert.equal(c.atom.disperse,0);assert.equal(c.boss.state,'recover');assert.equal(c.HealthiaAtomdustAnimation.inspect().legacy,false);
});
test('direct move previews initialize all five real attacks before simulation',async()=>{
 const source=fs.readFileSync(path.join(root,'assets/animation/atomdust-review.js'),'utf8');
 for(const move of ['punch-attack','kick-attack','jumpkick','smoke','caps']){const {c}=await harness();c.session=null;c.play=(practice,setup)=>{vm.runInContext(setup,c);return true;};vm.runInContext(fn('demo',source),c);c.demo(move);for(let i=0;i<350;i++){c.t+=1/120;c.updateAtom(1/120);assert.ok(Number.isFinite(c.boss.x));c.drawAtom();}}
});
test('production entries match and retain the original combat and Story Mode',()=>{
 assert.equal(html,fs.readFileSync(path.join(root,'hero-showdown.html'),'utf8'));for(const file of ['atomdust-core.js','atomdust-motion.js'])assert.ok(html.includes('assets/animation/'+file));
 assert.ok(!html.includes('atomdust-review.js'));assert.ok(!html.includes('styro-preview-scope.js'));
});

test('practice protects against smoke and Fight restores real inhalation damage',async()=>{
 const {c}=await harness();const source=fs.readFileSync(path.join(root,'assets/animation/atomdust-review.js'),'utf8');
 Object.assign(c,{available:()=>true,speed(){},reviewHero:0,lastError:'',session:null,HealthiaIntro:{dismiss(){}},HealthiaCave:{close(){}},story:{cleanup(){}},specialSceneReset(){},coLeave(){},showModeSelect(){},start(){c.hero.hp=100;c.hero.inv=0;},preview:{contentWindow:{focus(){}}},run:(source)=>vm.runInContext(source,c)});
 c.document.getElementById=()=>({checked:false});vm.runInContext(fn('play',source),c);
 assert.equal(c.play(true),true);c.atomInhalation(5);assert.equal(c.hero.hp,100);
 assert.equal(c.play(false),true);c.atomInhalation(5);assert.equal(c.hero.hp,95);
});
