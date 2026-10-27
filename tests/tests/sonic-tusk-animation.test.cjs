'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../dist'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const core=require('../dist/assets/animation/sonic-tusk-core.js');
function fn(name){const start=html.indexOf('function '+name+'(');assert.ok(start>=0,name);let open=html.indexOf('{',start),depth=1,i=open+1;for(;depth&&i<html.length;i++){if(html[i]==='{')depth++;if(html[i]==='}')depth--;}return html.slice(start,i);}
const p=(extra={})=>({state:'idle',type:'pulse',timer:0,time:0,ending:0,victory:false,moving:false,stride:0,heavy:false,hitstun:0,guard:0,...extra});
async function harness({candidate=true,search='',fail='',invalid=false}={}){
 const calls=[],images=[],profile=JSON.parse(JSON.stringify(require('../dist/assets/animation/sonic-tusk-atlas.js')));
 if(invalid)profile.sheets[0].frames[0][2]=100000;
 const c={HealthiaSonicTuskCore:core,HealthiaSonicTuskAtlas:profile,Math,location:{search},URLSearchParams,Promise,Map,WeakMap,
  hero:{x:300,y:604,hp:100},boss:{x:800,hp:650,max:650,hitstun:0,cd:.01,state:'idle',timer:0,count:0,dir:-1,sonicFacing:-1},opponent:2,selected:0,heroes:[{height:240},{height:210},{height:190}],phase:1,t:0,ending:0,GROUND:604,W:1280,
  mode:'fight',paused:false,hitStop:0,FIXED_STEP:1/120,simulationRemainder:1/240,guest:false,sceneLocked:false,
  soundWaves:[],shake:0,clamp:core.clamp,combatSound(){},noise(){},tone(){},burst(){},ellipse(){},soundCone(){},resonantRing(){},
  coEach:action=>action(),hitHero:damage=>{c.hero.hp-=damage;c.hits.push(damage);},hits:[],coHitFlag:w=>w.hit,coMarkHit:w=>w.hit=true,
  specialSceneLocked:()=>c.sceneLocked,coGuest:()=>c.guest,sonicMotionSprite:(...args)=>calls.push({fallback:true,args})};
 c.ctx={save(){},restore(){},translate(x,y){calls.push({position:[x,y]});},scale(x,y){calls.push({scale:[x,y]});},drawImage(canvas){calls.push({art:canvas.asset});}};
 c.document={createElement(){const canvas={};canvas.getContext=()=>({drawImage(im){canvas.asset=im.src;},beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){}});return canvas;}};
 c.Image=class{set src(value){this._src=value;images.push(value);queueMicrotask(()=>{if(fail&&value.includes(fail)){this.onerror();return;}const b=fs.readFileSync(path.join(root,value));this.naturalWidth=b.readUInt32BE(16);this.naturalHeight=b.readUInt32BE(20);this.onload();});}get src(){return this._src;}};
 c.window=c;vm.createContext(c);
 for(const name of ['sonicOrigin','sonicMotionPose','updateSonicLogic','updateSonic','drawSonic'])vm.runInContext(fn(name),c);
 if(candidate){vm.runInContext(fs.readFileSync(path.join(root,'assets/animation/sonic-tusk-motion.js'),'utf8'),c);await c.HealthiaSonicTuskAnimation.whenLoaded;}
 return {c,calls,images};
}
test('walking advances through eight drawings with distance and stops at idle',()=>{
 const frames=Array.from({length:8},(_,i)=>core.pose(p({moving:true,stride:(i+.1)/8})).frame);assert.equal(new Set(frames).size,8);
 assert.equal(core.pose(p({moving:true,stride:.3,time:0})).frame,core.pose(p({moving:true,stride:.3,time:100})).frame);
 for(const stride of [0,.3,.8])assert.equal(core.pose(p({stride})).state,'idle');
 assert.equal(new Set([0,.6,1.2,1.8].map(time=>core.pose(p({time:time+.001})).frame)).size,4);
});
test('pulse cannot show release before its projectile threshold',()=>{
 for(const timer of [.75,.6,.560001])assert.notEqual(core.pose(p({state:'attack',timer})).state,'pulse release');
 assert.equal(core.pose(p({state:'attack',timer:.56})).state,'pulse release');
});
test('stomp contact is held until the low waves spawn',()=>{
 for(const timer of [.85,.65,.500001])assert.equal(core.pose(p({state:'attack',type:'stomp',timer})).state,'stomp descend');
 assert.equal(core.pose(p({state:'attack',type:'stomp',timer:.5})).state,'stomp impact');
});
test('horn blast shows emission throughout the growing and sustained active cone',()=>{
 for(const timer of [1.3,1.299,1.2,1,.6,.1,.001])assert.equal(core.pose(p({state:'attack',type:'blast',timer})).state,'horn blast');
 assert.notEqual(core.pose(p({state:'warn',type:'blast',timer:.1})).state,'horn blast');
 assert.notEqual(core.pose(p({state:'recover',type:'blast',timer:1.5})).state,'horn blast');
});
test('hit reactions distinguish force and never cover resumed attacks',()=>{
 const light=core.pose(p({hitstun:.14,hitDuration:.14})),heavy=core.pose(p({hitstun:.22,hitDuration:.22,heavy:true}));assert.notEqual(light.frame,heavy.frame);
 for(const type of ['pulse','stomp','blast'])assert.ok(!core.pose(p({state:'attack',type,timer:.35,hitstun:0,heavy:true})).state.includes('hit'));
});
test('guard, counter and original defeat keep deliberate presentation',()=>{
 assert.equal(core.pose(p({guard:.2})).state,'guard');
 const before=core.pose(p({breakout:{age:.239,charge:.24}})),contact=core.pose(p({breakout:{age:.24,charge:.24}}));assert.notEqual(before.frame,contact.frame);
 assert.deepEqual([0,.2,.4,.7,10].map(ending=>core.pose(p({victory:true,ending})).frame),[6,7,8,9,9]);
 assert.ok(core.pose(p({victory:true})).legacy);
});
test('interpolation handles stride wrap without blending turns, teleports or state changes',()=>{
 const a={x:800,face:-1,stride:999.99,state:'idle'},b={x:799,face:-1,stride:.01,state:'idle'};
 assert.equal(core.interpolate(a,b,.5,false).x,799.5);assert.ok(Math.abs(core.interpolate(a,b,.5,false).stride-1000)<1e-8);
 for(const changed of [{...b,face:1},{...b,x:400},{...b,state:'warn'}])assert.deepEqual(core.interpolate(a,changed,.5,false),changed);
 assert.deepEqual(core.interpolate(a,b,.5,true),b);
});
test('all transparent atlases register complete valid crops and anchors',async()=>{
 const {c}=await harness();assert.equal(c.HealthiaSonicTuskAnimation.ready(),true);assert.equal(c.HealthiaSonicTuskAnimation.metrics().addedDrawings,32);assert.equal(c.HealthiaSonicTuskAnimation.metrics().errors.length,0);
 for(const sheet of c.HealthiaSonicTuskAtlas.sheets){const b=fs.readFileSync(path.join(root,'assets/animation',sheet.file));assert.equal(b[25],6);for(const [x,y,w,h,ax,ay] of sheet.frames){assert.ok(x>=0&&y>=0&&x+w<=b.readUInt32BE(16)&&y+h<=b.readUInt32BE(20));assert.ok(ax>=x&&ax<=x+w&&ay>=y&&ay<=y+h);}}
});
test('missing any atlas or an invalid crop retains the complete original renderer',async()=>{
 for(const options of [{fail:'sonic-tusk-presence'},{fail:'sonic-tusk-attacks'},{fail:'sonic-tusk-walk'},{invalid:true}]){const {c,calls}=await harness(options);assert.equal(c.HealthiaSonicTuskAnimation.ready(),false);c.drawSonic();assert.ok(calls.some(x=>x.fallback));}
});
test('Original comparison loads no additional textures',async()=>{
 const {c,calls,images}=await harness({search:'?sonictusk=original'});assert.equal(images.length,0);c.drawSonic();assert.ok(calls.some(x=>x.fallback));
});
test('other villains are unaffected by the Sonic Tusk renderer',async()=>{
 const {c,calls}=await harness();for(const id of [0,1,3,4,5,6,7,8]){c.opponent=id;c.sonicMotionSprite(4,800,604,-1);assert.ok(calls.at(-1).fallback);}
});
test('pause, hitstop, cutscenes, guests and nonwalking states lock interpolation',async()=>{
 const {c}=await harness();c.boss.cd=999;c.updateSonic(1/120);assert.notEqual(c.HealthiaSonicTuskAnimation.inspect().x,c.boss.x);
 for(const field of ['paused','hitStop','sceneLocked','guest']){c[field]=true;assert.equal(c.HealthiaSonicTuskAnimation.inspect().x,c.boss.x);c[field]=false;}
 for(const state of ['warn','attack','recover']){c.boss.state=state;assert.equal(c.HealthiaSonicTuskAnimation.inspect().x,c.boss.x);}
});
test('new round state and crossing the opponent reset visual facing without a slide',async()=>{
 const {c}=await harness();c.boss.cd=999;c.updateSonic(1/120);c.boss={...c.boss,x:400,state:'idle'};c.hero.x=600;
 assert.equal(c.HealthiaSonicTuskAnimation.inspect().x,400);assert.equal(c.HealthiaSonicTuskAnimation.inspect().facing,1);
 c.hero.x=200;assert.equal(c.HealthiaSonicTuskAnimation.inspect().facing,-1);
});
test('drawing leaves gameplay and wave data untouched in both directions',async()=>{
 const {c}=await harness();for(const dir of [-1,1])for(const type of ['pulse','stomp','blast'])for(const state of ['idle','warn','attack','recover']){
  Object.assign(c.boss,{dir,sonicFacing:dir,state,type,timer:.35});c.hero.x=800+dir*400;
  const before=JSON.stringify([c.boss,c.hero,c.soundWaves]);for(let i=0;i<20;i++)c.drawSonic();assert.equal(JSON.stringify([c.boss,c.hero,c.soundWaves]),before);
 }
});
for(const type of ['pulse','stomp','blast'])test(type+' matches original simulation at 30/60/120/144 Hz, every phase and difficulty pace',async()=>{
 for(const phase of [1,2,3])for(const pace of [1,1.3,1.65])for(const hz of [30,60,120,144]){
  const {c:a}=await harness({candidate:false}),{c:b}=await harness();
  for(const c of [a,b]){c.phase=phase;Object.assign(c.boss,{state:'warn',type,timer:type==='pulse'?.9:type==='stomp'?1:1.35,struck:false});}
  let remainder=0;for(let frame=0;frame<Math.ceil(hz*5);frame++){
   remainder+=1/hz;while(remainder+1e-9>=1/120){for(const c of [a,b]){c.t+=1/120;c.updateSonic(pace/120);}remainder-=1/120;}
   b.simulationRemainder=remainder;b.drawSonic();
   const state=c=>JSON.stringify([c.boss,c.hero,c.hits,c.soundWaves,c.shake]);assert.equal(state(a),state(b));
  }
 }
});
test('hitstun freezes attack timing while existing sound waves keep travelling',async()=>{
 const {c}=await harness();Object.assign(c.boss,{state:'attack',type:'pulse',timer:.57,hitstun:.2,sonicHitDuration:.2});
 c.soundWaves.push({kind:'pulse',x:100,y:400,dir:-1,life:3,hit:false});c.updateSonic(.1);
 assert.equal(c.boss.timer,.57);assert.equal(c.soundWaves[0].x,63);assert.equal(c.hits.length,0);
 c.boss.hitstun=0;c.updateSonic(.011);assert.equal(c.HealthiaSonicTuskAnimation.inspect().state,'pulse release');
});
test('actual projectile and bass-wave spawn steps match their contact drawings',async()=>{
 const {c}=await harness();Object.assign(c.boss,{state:'attack',type:'pulse',timer:.57,struck:false});c.updateSonic(.011);
 assert.equal(c.soundWaves.length,1);assert.equal(c.HealthiaSonicTuskAnimation.inspect().state,'pulse release');
 c.soundWaves=[];Object.assign(c.boss,{state:'attack',type:'stomp',timer:.51,struck:false});c.updateSonic(.011);
 assert.equal(c.soundWaves.length,2);assert.equal(c.HealthiaSonicTuskAnimation.inspect().state,'stomp impact');
 assert.deepEqual(Array.from(c.soundWaves,w=>w.dir),[-1,1]);
});
test('the growing horn cone can hurt both co-op heroes while its firing pose is shown',async()=>{
 const {c}=await harness();const team=[{x:668,y:604,hp:100},{x:660,y:604,hp:100}];
 c.coEach=action=>{const old=c.hero;for(const h of team){c.hero=h;action();}c.hero=old;};
 Object.assign(c.boss,{state:'attack',type:'blast',timer:1.3,x:800,dir:-1,struck:false});c.updateSonic(.02);c.drawSonic();
 assert.deepEqual(team.map(h=>h.hp),[90,90]);assert.equal(c.HealthiaSonicTuskAnimation.inspect().state,'horn blast');
});
test('jump clearance and facing preserve the original horn damage region',async()=>{
 for(const dir of [-1,1])for(const selected of [0,1,2])for(const high of [false,true]){
  const {c:a}=await harness({candidate:false}),{c:b}=await harness();for(const c of [a,b]){c.selected=selected;c.hero.x=650+dir*200;c.hero.y=high?300:604;Object.assign(c.boss,{state:'attack',type:'blast',timer:1.1,x:650,dir,struck:true});c.updateSonic(.01);c.drawSonic();}
  assert.equal(a.hero.hp,b.hero.hp);assert.equal(b.hero.hp,high?100:90);
 }
});
test('production entries match and contain no review controls or story restriction',()=>{
 assert.equal(html,fs.readFileSync(path.join(root,'hero-showdown.html'),'utf8'));
 for(const file of ['sonic-tusk-core.js','sonic-tusk-atlas.js','sonic-tusk-motion.js'])assert.ok(html.includes('assets/animation/'+file));
 assert.ok(!html.includes('sonic-tusk-review.js'));assert.ok(!html.includes('styro-preview-scope.js'));
});
