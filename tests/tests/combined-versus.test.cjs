'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const D=require('../dist/assets/competitive/roster.js'),C=require('../dist/assets/competitive/combat.js'),S=require('../dist/assets/competitive/animation-state.js');
const core=name=>require('../dist/assets/animation/'+name+'-core.js');
const cores={air:core('air-pollution'),styrodog:core('styrodog'),sonic:core('sonic-tusk'),venomis:core('venomis-thornbear'),styro:core('styro'),wastelander:core('wastelander'),atomdust:core('atomdust'),spree:core('lightening-spree'),bushman:core('bushman-animation')};
const B=require('../dist/assets/bushman/bushman-core.js'),H=require('../dist/assets/animation/motion-core.js');
function scene(id,key='punch',progress=.02,phase='active'){
 const world=C.create({ids:[id,id]}),f=world.fighters[0];f.power=100;f.charge=4;C.begin(world,f,key);const a=f.action;
 a.age=phase==='windup'?a.spec.startup*progress:phase==='active'?a.spec.startup+a.spec.active*progress:a.spec.startup+a.spec.active+a.spec.recovery*progress;a.struck=phase==='windup'?0:1;
 return {world,f,v:S.view(f,world.fighters[1],world)};
}
function pose(id,v,f){
 const b=v.boss,p={state:b.state,type:b.type,timer:b.timer,duration:b.duration,time:1,phase:1,struck:b.struck,volley:b.volley,liveStorm:v.air.liveStorm,liveBeams:v.phase==='active'?1:0,action:S.bushmanAction(f,v,B.ATTACKS[v.type]||B.ATTACKS.punch),attack:B.ATTACKS[v.type]||B.ATTACKS.punch};
 return id==='air'?cores.air.pose(v.air):id==='venomis'?cores.venomis.bearPose(p):id==='atomdust'?{state:cores.atomdust.label({...p,age:b.duration-b.timer})}:cores[id].pose(p);
}
for(const c of D.roster)for(const key of ['punch','kick','shoot','skill','special'])test(c.id+' '+key+' presentation keeps combat unchanged and uses finite independent clocks',()=>{
 for(const phase of ['windup','active','recovery'])for(const progress of [0,.5,.99]){
  const {world,f,v}=scene(c.id,key,progress,phase),before=JSON.stringify(world);const other=S.view(world.fighters[1],f,world);
  assert.equal(v.phase,phase);assert.ok(Number.isFinite(v.boss.timer));assert.ok(v.boss.timer>=0);assert.equal(other.phase,'idle');assert.equal(JSON.stringify(world),before);
  if(c.hero!==undefined){assert.equal(!!v.hero.pendingAttack,key==='punch'||key==='kick');assert.equal(v.hero.special,key==='punch'||key==='kick'?0:1);}
 }
});
const contacts={air:{punch:8},styrodog:{punch:19,kick:26,shoot:30},sonic:{punch:19,kick:26,shoot:19},venomis:{punch:19,shoot:24},styro:{punch:19,shoot:26},wastelander:{punch:20,shoot:26,skill:30},spree:{punch:6,shoot:6},bushman:{punch:18,kick:22,shoot:26,special:30}};
for(const [id,moves]of Object.entries(contacts))for(const[key,frame]of Object.entries(moves))test(id+' '+key+' reaches approved contact frame when damage releases',()=>{const {f,v}=scene(id,key);assert.equal(pose(id,v,f).frame,frame);});
test('Air moves through four approved glide frames without invoking native boss AI',()=>{const w=C.create({ids:['air','air']}),f=w.fighters[0];f.state='walk';const frames=[.01,.26,.51,.76].map(walk=>{f.walk=walk;return cores.air.pose(S.view(f,w.fighters[1],w).air).frame;});assert.deepEqual(frames,[3,4,5,6]);});
test('Air storm displays its impact pose only after competitive release',()=>{let {f,v}=scene('air','special',.8,'windup');assert.equal(pose('air',v,f).frame,12);({f,v}=scene('air','special'));assert.equal(pose('air',v,f).frame,13);});
for(const id of ['summy','sadie','vee'])test(id+' projectiles and powers use special art rather than punch art',()=>{for(const key of ['shoot','skill','special']){const {v}=scene(id,key);const pose=H.pose({heroIndex:D.byId[id].hero,state:'special',special:v.hero.specialTick,attack:v.hero.pendingAttack});assert.ok(pose>=128&&pose<=131,String(pose));}});
test('both faces and both slots preserve attack direction in mirror views',()=>{for(const id of D.roster.map(c=>c.id)){const w=C.create({ids:[id,id]});for(const f of w.fighters){f.power=100;f.charge=4;C.begin(w,f,'special');const v=S.view(f,w.fighters[1-f.slot],w);assert.equal(v.boss.face,f.face);assert.equal(v.boss.dir,f.face);assert.equal(v.hero.face,f.face);}}});
function renderer(){
 const vars=['hero','boss','selected','opponent','mode','ending','phase','t','elapsed','effects','atom','spree','bushman','plantShots','vines','wasteShots','wastePools','wasteBursts','styroSpikes','styroBursts','soundWaves'];
 const c={window:null,Image:class{set src(v){}},HealthiaCompetitiveAnimationState:S,HealthiaCompetitiveData:D,HealthiaAirPollutionAtlas:{file:'air.png'},HealthiaAirPollutionCore:cores.air,BushmanCore:B,GROUND:604,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),Map,WeakMap,Promise};
 c.window=c;for(const k of vars)c[k]={original:k};c.ctx={save(){},restore(){},translate(){},scale(){},beginPath(){},ellipse(){},stroke(){}};
 for(const name of ['fighter','drawStyrodog','drawSonic','drawVenomis','drawDrStyro','drawWastelander','drawAtom','drawSpree','drawBushman','sprite','smokeStrand','smokyFist'])c[name]=()=>{};
 vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/../dist/assets/competitive/animation-adapter.js','utf8'),c);return {c,vars};
}
test('rendering every character restores native game globals and cannot advance competitive simulation',()=>{const{c,vars}=renderer(),before=Object.fromEntries(vars.map(k=>[k,c[k]]));for(const id of D.roster.map(c=>c.id)){const{world,f}=scene(id);const snap=JSON.stringify(world);c.HealthiaCompetitiveAnimation.draw(f,world.fighters[1],world);assert.equal(JSON.stringify(world),snap);for(const k of vars)assert.equal(c[k],before[k],k);}});
test('native render failure still restores Story and co-op globals',()=>{const{c,vars}=renderer(),before=Object.fromEntries(vars.map(k=>[k,c[k]]));c.drawBushman=()=>{throw Error('render failure');};const{world,f}=scene('bushman');assert.throws(()=>c.HealthiaCompetitiveAnimation.draw(f,world.fighters[1],world),/render failure/);for(const k of vars)assert.equal(c[k],before[k],k);});
