'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../dist'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const core=require('../dist/assets/animation/styrodog-core.js');
function fn(name){const start=html.indexOf('function '+name+'(');assert.ok(start>=0,name);let open=html.indexOf('{',start),depth=1,i=open+1;for(;depth&&i<html.length;i++){if(html[i]==='{')depth++;if(html[i]==='}')depth--;}return html.slice(start,i);}
const p=(o={})=>({state:'idle',type:'claw',timer:0,time:0,ending:0,victory:false,moving:false,stride:0,heavy:false,hitstun:0,guard:0,...o});
async function harness({candidate=true,search='',fail='',invalid=false}={}){
 const calls=[],images=[],profile=JSON.parse(JSON.stringify(require('../dist/assets/animation/styrodog-atlas.js')));
 if(invalid)profile.sheets[0].frames[0][2]=100000;
 const c={HealthiaStyrodogCore:core,HealthiaStyrodogAtlas:profile,Math,location:{search},URLSearchParams,Promise,Map,WeakMap,
  hero:{x:300,y:604,hp:100},boss:{x:800,hp:650,max:650,hitstun:0,cd:.01,state:'idle',timer:0,count:0,dir:-1,dogFacing:-1},opponent:1,selected:0,heroes:[{height:240}],phase:1,t:0,ending:0,GROUND:604,W:1280,
  mode:'fight',paused:false,hitStop:0,FIXED_STEP:1/120,simulationRemainder:1/240,guest:false,sceneLocked:false,
  foamShots:[],shockwaves:[],shake:0,clamp:core.clamp,combatSound(){},noise(){},burst(){},foamChunk(){},
  coEach:action=>action(),hitHero:(damage)=>{c.hero.hp-=damage;c.hits.push(damage);},hits:[],coHitFlag:q=>q.hit,coMarkHit:q=>q.hit=true,
  specialSceneLocked:()=>c.sceneLocked,coGuest:()=>c.guest,dogMotionSprite:(...args)=>calls.push({fallback:true,args})};
 c.ctx={save(){},restore(){},translate(x,y){calls.push({position:[x,y]});},scale(x,y){calls.push({scale:[x,y]});},drawImage(canvas){calls.push({art:canvas.asset});},beginPath(){},arc(){},stroke(){}};
 c.document={createElement(){const canvas={};canvas.getContext=()=>({drawImage(im){canvas.asset=im.src;},beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){}});return canvas;}};
 c.Image=class{set src(value){this._src=value;images.push(value);queueMicrotask(()=>{if(fail&&value.includes(fail)){this.onerror();return;}const b=fs.readFileSync(path.join(root,value));this.naturalWidth=b.readUInt32BE(16);this.naturalHeight=b.readUInt32BE(20);this.onload();});}get src(){return this._src;}};
 c.window=c;vm.createContext(c);
 for(const name of ['dogMotionPose','updateStyrodogLogic','updateStyrodog','drawStyrodog','updateFoam'])vm.runInContext(fn(name),c);
 if(candidate){vm.runInContext(fs.readFileSync(path.join(root,'assets/animation/styrodog-motion.js'),'utf8'),c);await c.HealthiaStyrodogAnimation.whenLoaded;}
 return {c,calls,images};
}
test('eight walk drawings advance with distance and stop at idle',()=>{
 assert.deepEqual(Array.from({length:8},(_,i)=>core.pose(p({moving:true,stride:(i+.1)/8})).frame),[0,1,2,3,4,5,6,7]);
 assert.equal(core.pose(p({moving:true,stride:.3,time:0})).frame,core.pose(p({moving:true,stride:.3,time:100})).frame);
 for(const stride of [0,.3,.8])assert.equal(core.pose(p({stride})).frame,8);
});
test('four idle drawings form a repeating loop',()=>{
 assert.deepEqual([0,.6,1.2,1.8].map(time=>core.pose(p({time:time+.001})).frame),[8,9,10,11]);
 assert.equal(core.pose(p({time:2.4})).frame,8);
});
test('claw reaches full extension at damage contact, never early',()=>{
 for(const timer of [.68,.55,.380001])assert.notEqual(core.pose(p({state:'attack',timer})).frame,19);
 assert.equal(core.pose(p({state:'attack',timer:.38})).frame,19);
 assert.equal(core.pose(p({state:'attack',timer:.29})).frame,19);
 assert.equal(core.pose(p({state:'attack',timer:.27})).frame,20);
 assert.equal(core.pose(p({state:'attack',timer:.1})).frame,21);
});
test('slam lands exactly at the shockwave and stays grounded through recovery',()=>{
 for(const timer of [.9,.75,.530001]){const pose=core.pose(p({state:'attack',type:'slam',timer}));assert.notEqual(pose.frame,26);assert.ok(pose.lift<0);}
 const impact=core.pose(p({state:'attack',type:'slam',timer:.53}));assert.equal(impact.frame,26);assert.equal(impact.lift,0);
 for(const timer of [1.35,1,.5,.01])assert.equal(core.pose(p({state:'recover',type:'slam',timer})).lift,0);
});
test('roar release uses the same three-volley clock as projectiles',()=>{
 for(let shot=1;shot<=3;shot++){
  const timer=1.5-shot*.4;
  assert.notEqual(core.pose(p({state:'attack',type:'roar',timer:timer+.00001})).frame,30);
  assert.equal(core.pose(p({state:'attack',type:'roar',timer:timer-.00001})).frame,30);
 }
 assert.notEqual(core.pose(p({state:'attack',type:'roar',timer:.01})).frame,30);
});
test('recoils distinguish light and heavy hits without hiding resumed attacks',()=>{
 assert.equal(core.pose(p({hitstun:.14,hitDuration:.14})).frame,12);
 assert.equal(core.pose(p({hitstun:.22,hitDuration:.22,heavy:true})).frame,13);
 assert.equal(core.pose(p({hitstun:.12,hitDuration:.22,heavy:true})).frame,14);
 assert.equal(core.pose(p({hitstun:.03,hitDuration:.22,heavy:true})).frame,15);
 for(const type of ['claw','slam','roar'])assert.ok(!core.pose(p({state:'attack',type,timer:.35,hitstun:0,heavy:true})).state.includes('hit'));
});
test('guard and breakout have deliberate poses',()=>{
 assert.equal(core.pose(p({guard:.2})).frame,16);
 assert.equal(core.pose(p({breakout:{age:.1,charge:.24}})).frame,16);
 assert.equal(core.pose(p({breakout:{age:.24,charge:.24}})).frame,19);
});
test('original defeat stages remain intact and hold the collapsed pose',()=>{
 assert.deepEqual([0,.2,.4,.7,10].map(ending=>core.pose(p({victory:true,ending})).frame),[6,7,8,9,9]);
 assert.ok(core.pose(p({victory:true})).legacy);
});
test('walk interpolation handles stride wrap and never crosses a turn or teleport',()=>{
 const a={x:800,face:-1,stride:999.99,state:'idle'},b={x:799,face:-1,stride:.01,state:'idle'};
 assert.equal(core.interpolate(a,b,.5,false).x,799.5);
 assert.ok(Math.abs(core.interpolate(a,b,.5,false).stride-1000)<1e-8);
 for(const changed of [{...b,face:1},{...b,x:400},{...b,state:'warn'}])assert.deepEqual(core.interpolate(a,changed,.5,false),changed);
 assert.deepEqual(core.interpolate(a,b,.5,true),b);
});
test('all 32 sprites have valid transparent PNG crops and foot anchors',async()=>{
 const {c}=await harness();assert.equal(c.HealthiaStyrodogAnimation.ready(),true);assert.equal(c.HealthiaStyrodogAnimation.metrics().addedDrawings,32);
 assert.equal(c.HealthiaStyrodogAnimation.metrics().errors.length,0);
 for(const sheet of c.HealthiaStyrodogAtlas.sheets){const b=fs.readFileSync(path.join(root,'assets/animation',sheet.file));assert.equal(b[25],6);for(const [x,y,w,h,ax,ay] of sheet.frames){assert.ok(x>=0&&y>=0&&x+w<=b.readUInt32BE(16)&&y+h<=b.readUInt32BE(20));assert.ok(ax>=x&&ax<=x+w&&ay>=y&&ay<=y+h);}}
});
test('either missing sheet or invalid crop preserves the complete original renderer',async()=>{
 for(const options of [{fail:'styrodog-presence'},{fail:'styrodog-attacks'},{invalid:true}]){
  const {c,calls}=await harness(options);assert.equal(c.HealthiaStyrodogAnimation.ready(),false);c.drawStyrodog();assert.ok(calls.some(x=>x.fallback));
 }
});
test('Original comparison loads no new sheets',async()=>{
 const {c,calls,images}=await harness({search:'?styrodog=original'});assert.equal(images.length,0);c.drawStyrodog();assert.ok(calls.some(x=>x.fallback));
});
test('all other villains retain their own renderer',async()=>{
 const {c,calls}=await harness();for(const id of [0,2,3,4,5,6,7,8]){c.opponent=id;c.dogMotionSprite(4,800,604,-1);assert.ok(calls.at(-1).fallback);}
});
test('pause, hitstop, special cutscenes, guests and nonidle states lock position',async()=>{
 const {c}=await harness();c.boss.cd=999;c.updateStyrodog(1/120);assert.notEqual(c.HealthiaStyrodogAnimation.inspect().x,c.boss.x);
 for(const field of ['paused','hitStop','sceneLocked','guest']){c[field]=true;assert.equal(c.HealthiaStyrodogAnimation.inspect().x,c.boss.x);c[field]=false;}
 for(const state of ['warn','attack','recover']){c.boss.state=state;assert.equal(c.HealthiaStyrodogAnimation.inspect().x,c.boss.x);}
});
test('a new round cannot inherit previous interpolation or facing',async()=>{
 const {c}=await harness();c.updateStyrodog(1/120);c.boss={...c.boss,x:400,dogFacing:1,state:'idle'};
 assert.equal(c.HealthiaStyrodogAnimation.inspect().x,400);assert.equal(c.HealthiaStyrodogAnimation.inspect().facing,1);
});
test('drawing does not mutate combat state or projectiles in either facing',async()=>{
 const {c}=await harness();for(const dir of [-1,1])for(const type of ['claw','slam','roar'])for(const state of ['idle','warn','attack','recover']){
  Object.assign(c.boss,{dir,dogFacing:dir,state,type,timer:.35,startX:800,target:300});
  const before=JSON.stringify([c.boss,c.hero,c.foamShots,c.shockwaves]);for(let i=0;i<20;i++)c.drawStyrodog();assert.equal(JSON.stringify([c.boss,c.hero,c.foamShots,c.shockwaves]),before);
 }
});
for(const type of ['claw','slam','roar'])test(type+' keeps identical gameplay at 30/60/120/144 Hz rendering in every phase',async()=>{
 for(const phase of [1,2,3])for(const hz of [30,60,120,144]){
  const {c:a}=await harness({candidate:false}),{c:b}=await harness();
  for(const c of [a,b]){c.phase=phase;Object.assign(c.boss,{state:'warn',type,timer:type==='claw'?.85:type==='slam'?1.05:1.2,startX:800,target:300,struck:false,volley:0});}
  let remainder=0;for(let frame=0;frame<Math.ceil(hz*5);frame++){
   remainder+=1/hz;while(remainder+1e-9>=1/120){for(const c of [a,b]){c.t+=1/120;c.updateStyrodog(1/120);c.updateFoam(1/120);}remainder-=1/120;}
   b.simulationRemainder=remainder;b.drawStyrodog();
   const state=c=>JSON.stringify([c.boss,c.hero,c.hits,c.foamShots,c.shockwaves]);assert.equal(state(a),state(b));
  }
 }
});
test('hitstun freezes the attack clock and prevents premature damage',async()=>{
 const {c}=await harness();Object.assign(c.boss,{state:'attack',type:'claw',timer:.39,hitstun:.2,dogHitDuration:.2});
 for(let i=0;i<20;i++)c.updateStyrodog(1/120);assert.equal(c.boss.timer,.39);assert.equal(c.hits.length,0);
 c.boss.hitstun=0;c.updateStyrodog(.011);assert.equal(c.HealthiaStyrodogAnimation.inspect().pose,19);
});
test('rendered landing and roar release match emitted hazards on the actual step',async()=>{
 const {c}=await harness();Object.assign(c.boss,{state:'attack',type:'slam',timer:.54,struck:false});
 c.updateStyrodog(.011);assert.equal(c.shockwaves.length,2);assert.equal(c.HealthiaStyrodogAnimation.inspect().pose,26);assert.equal(c.HealthiaStyrodogAnimation.inspect().lift,0);
 Object.assign(c.boss,{state:'attack',type:'roar',timer:1.5,volley:0,target:300});
 let releases=0;for(let i=0;i<175;i++){const count=c.foamShots.length;c.updateStyrodog(1/120);if(c.foamShots.length>count){releases++;assert.equal(c.HealthiaStyrodogAnimation.inspect().pose,30);}}
 assert.equal(releases,3);assert.equal(c.foamShots.length,9);
});
test('two co-op heroes receive the same contact evaluation, unaffected by rendering',async()=>{
 const {c}=await harness();const team=[{x:590,y:604,hp:100},{x:630,y:604,hp:100}];c.coEach=action=>{const old=c.hero;for(const h of team){c.hero=h;action();}c.hero=old;};
 Object.assign(c.boss,{state:'attack',type:'slam',timer:.54,x:600,struck:false});c.updateStyrodog(.011);c.drawStyrodog();
 assert.deepEqual(team.map(h=>h.hp),[80,80]);assert.equal(c.shockwaves.length,2);
});
test('both production entries load matching modules without review controls',()=>{
 assert.equal(html,fs.readFileSync(path.join(root,'hero-showdown.html'),'utf8'));
 for(const file of ['styrodog-core.js','styrodog-atlas.js','styrodog-motion.js'])assert.ok(html.includes('assets/animation/'+file));
 assert.ok(!html.includes('styrodog-review.js'));assert.ok(!html.includes('styro-preview-scope.js'));
});
