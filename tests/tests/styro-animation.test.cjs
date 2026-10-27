'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../dist'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const core=require('../dist/assets/animation/styro-core.js');
function fn(name){const start=html.indexOf('function '+name+'(');assert.ok(start>=0,name);let open=html.indexOf('{',start),depth=1,i=open+1;for(;depth&&i<html.length;i++){if(html[i]==='{')depth++;if(html[i]==='}')depth--;}return html.slice(start,i);}
const p=(o={})=>({state:'idle',type:'crush',timer:0,time:0,ending:0,victory:false,moving:false,stride:0,react:0,heavy:false,hitstun:0,guard:0,...o});
async function harness({candidate=true,search='',fail=''}={}){
 const calls=[],images=[],math=Object.create(Math);let seed=1;math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 const c={HealthiaStyroCore:core,HealthiaStyroAtlas:require('../dist/assets/animation/styro-atlas.js'),Math:math,location:{search},URLSearchParams,Promise,Map,WeakMap,
 hero:{x:300,y:604,hp:100},boss:{x:800,hp:650,max:650,hitstun:0,cd:.01,state:'idle',timer:0,count:0,dir:-1},opponent:4,selected:0,heroes:[{height:240}],phase:1,t:0,ending:0,GROUND:604,W:1280,
 mode:'fight',paused:false,hitStop:0,FIXED_STEP:1/120,simulationRemainder:1/240,guest:false,sceneLocked:false,
 styroSpikes:[],styroBursts:[],shake:0,clamp:core.clamp,combatSound(){},burst(){},rect(){},foamChunk(){},
 coEach:action=>action(),hitHero:(damage)=>{c.hero.hp-=damage;c.hits.push(damage);},hits:[],specialSceneLocked:()=>c.sceneLocked,coGuest:()=>c.guest,
 styroBody:(...args)=>calls.push({fallback:true,args}),styroMotionSprite:(...args)=>calls.push({legacy:true,args}),styroArt:(...args)=>calls.push({fx:true,args})};
 c.ctx={save(){},restore(){},translate(x,y){calls.push({x,y});},scale(x,y){calls.push({scale:[x,y]});},rotate(){},drawImage(canvas){calls.push({art:canvas.asset});}};
 c.document={createElement(){const canvas={};canvas.getContext=()=>({drawImage(im){canvas.asset=im.src;}});return canvas;}};
 c.Image=class{set src(value){this._src=value;images.push(value);queueMicrotask(()=>{if(fail&&value.includes(fail)){this.onerror();return;}const b=fs.readFileSync(path.join(root,value));this.naturalWidth=b.readUInt32BE(16);this.naturalHeight=b.readUInt32BE(20);this.onload();});}get src(){return this._src;}};
 c.window=c;vm.createContext(c);
 for(const name of ['styroEase','styroFoam','styroBurst','styroHit','updateDrStyroLogic','updateDrStyro','drawDrStyro'])vm.runInContext(fn(name),c);
 if(candidate){vm.runInContext(fs.readFileSync(path.join(root,'assets/animation/styro-motion.js'),'utf8'),c);await c.HealthiaStyroAnimation.whenLoaded;}
 return {c,calls,images};
}
test('walk resolves eight distinct distance-driven poses and stops on idle',()=>{
 assert.equal(new Set(Array.from({length:80},(_,i)=>core.pose(p({moving:true,stride:i/80})).frame)).size,8);
 assert.equal(core.pose(p({moving:true,stride:.3,time:1})).frame,core.pose(p({moving:true,stride:.3,time:99})).frame);
 for(const stride of [0,.2,.5,.9])assert.ok(core.pose(p({stride})).frame>=8);
});
test('idle has a continuous four-pose breathing loop',()=>{
 assert.deepEqual([0,.6,1.2,1.8].map(time=>core.pose(p({time:time+.001})).frame),[8,9,10,11]);
 assert.equal(core.pose(p({time:2.4})).frame,8);
});
for(const [type,contact] of [['crush',.38],['double',.42]])test(type+' full extension matches the damaging contact boundary',()=>{
 assert.notEqual(core.pose(p({state:'attack',type,timer:contact+.00001})).frame,19);
 assert.equal(core.pose(p({state:'attack',type,timer:contact})).frame,19);
 assert.equal(core.pose(p({state:'attack',type,timer:contact-.05})).frame,19);
 assert.equal(core.pose(p({state:'attack',type,timer:.1})).frame,21);
});
test('spike release tracks each of the three actual volleys, never a fourth',()=>{
 for(let shot=1;shot<=3;shot++){
  assert.equal(core.pose(p({state:'attack',type:'spikes',timer:1.4-shot*.34-.0001})).frame,26);
  assert.notEqual(core.pose(p({state:'attack',type:'spikes',timer:1.4-shot*.34+.0001})).frame,26);
 }
 assert.notEqual(core.pose(p({state:'attack',type:'spikes',timer:.01})).frame,26);
});
test('hit reactions distinguish light and heavy hits, then release resumed attacks',()=>{
 assert.equal(core.pose(p({react:.38,reactDuration:.38,hitstun:.14})).frame,12);
 assert.equal(core.pose(p({react:.52,reactDuration:.52,heavy:true,hitstun:.22})).frame,13);
 assert.equal(core.pose(p({react:.30,reactDuration:.52,heavy:true,hitstun:.1})).frame,14);
 for(const type of ['crush','double','spikes'])assert.ok(!core.pose(p({react:.3,hitstun:0,state:'attack',type,timer:.38})).state.includes('hit'));
});
test('split windup, merge, guard and breakout have explicit poses',()=>{
 assert.equal(core.pose(p({state:'warn',type:'double',timer:1.45})).frame,28);
 assert.equal(core.pose(p({state:'warn',type:'double',timer:.7})).frame,30);
 assert.equal(core.pose(p({state:'recover',type:'double',timer:1.3})).frame,31);
 assert.equal(core.pose(p({guard:.2})).frame,16);
 assert.equal(core.pose(p({breakout:{age:.3,charge:.24}})).frame,29);
});
test('defeat keeps the four approved collapse poses and holds the final one',()=>{
 assert.deepEqual([0,.2,.5,.8,10].map(ending=>core.pose(p({victory:true,ending})).frame),[8,9,10,11,11]);
 assert.equal(core.pose(p({victory:true})).legacy,true);
});
test('all 32 whole-body crops fit actual transparent PNGs with grounded anchors',async()=>{
 const {c}=await harness();assert.equal(c.HealthiaStyroAnimation.ready(),true);assert.equal(c.HealthiaStyroAnimation.metrics().errors.length,0);
 assert.equal(c.HealthiaStyroAnimation.metrics().addedDrawings,32);
 for(const s of c.HealthiaStyroAtlas.sheets){const b=fs.readFileSync(path.join(root,'assets/animation',s.file));assert.equal(b[25],6);for(const [x,y,w,h,ax,ay] of s.frames){assert.ok(x>=0&&y>=0&&x+w<=b.readUInt32BE(16)&&y+h<=b.readUInt32BE(20));assert.ok(ax>=x&&ax<=x+w&&ay>=y&&ay<=y+h);}}
});
test('missing any new sheet falls back to the complete original character',async()=>{
 for(const fail of ['styro-presence','styro-attacks']){const {c,calls}=await harness({fail});assert.equal(c.HealthiaStyroAnimation.ready(),false);c.styroBody(800,-1);assert.ok(calls.at(-1).fallback);}
});
test('Original comparison loads no new images',async()=>{
 const {c,calls,images}=await harness({search:'?styro=original'});assert.equal(images.length,0);c.styroBody(800,-1);assert.ok(calls.at(-1).fallback);
});
test('other characters always retain their own renderer',async()=>{
 const {c,calls}=await harness();for(const opponent of [0,1,2,3,5,6,7,8]){c.opponent=opponent;c.styroBody(800,-1);assert.ok(calls.at(-1).fallback);}
});
test('drawing never mutates boss state or projectiles in either facing',async()=>{
 const {c}=await harness();for(const dir of [-1,1])for(const state of ['idle','warn','attack','recover']){Object.assign(c.boss,{dir,state,type:'double',startX:800,target:500,timer:.3});c.updateDrStyro(1/120);const before=JSON.stringify([c.boss,c.styroSpikes]);for(let i=0;i<20;i++)c.drawDrStyro();assert.equal(JSON.stringify([c.boss,c.styroSpikes]),before);}
});
test('pause, hitstop, cutscenes, guests and attacks lock interpolation to simulation',async()=>{
 const {c}=await harness();c.boss.cd=999;c.updateDrStyro(1/120);assert.notEqual(c.HealthiaStyroAnimation.inspect().x,c.boss.x);
 for(const field of ['paused','hitStop','guest','sceneLocked']){c[field]=true;assert.equal(c.HealthiaStyroAnimation.inspect().x,c.boss.x);c[field]=false;}
 c.boss.state='attack';assert.equal(c.HealthiaStyroAnimation.inspect().x,c.boss.x);
});
test('a new round or changed facing cannot inherit old interpolation',async()=>{
 const {c}=await harness();c.updateDrStyro(1/120);c.boss={...c.boss,x:400};assert.equal(c.HealthiaStyroAnimation.inspect().x,400);
 assert.equal(core.renderX({x:100,face:-1},{x:105,face:1},.5,false),105);
});
for(const type of ['crush','spikes','double'])test(type+' gameplay is identical at 30/60/120/144 Hz drawing in every phase',async()=>{
 for(const phase of [1,2,3])for(const hz of [30,60,120,144]){
  const {c:a}=await harness({candidate:false}),{c:b}=await harness();
  for(const c of [a,b]){c.phase=phase;Object.assign(c.boss,{state:'warn',type,timer:type==='double'?1.45:type==='spikes'?1:.85,startX:800,target:300,struck:false,volley:0});}
  let remainder=0;for(let frame=0;frame<Math.ceil(hz*5);frame++){
   remainder+=1/hz;while(remainder+1e-9>=1/120){for(const c of [a,b]){c.t+=1/120;c.updateDrStyro(1/120);}remainder-=1/120;}
   b.simulationRemainder=remainder;b.drawDrStyro();
   const snapshot=c=>JSON.stringify([c.boss,c.hero,c.hits,c.styroSpikes,c.styroBursts]);assert.equal(snapshot(a),snapshot(b));
  }
 }
});
test('hitstun suspends attack clock and prevents premature damage',async()=>{
 const {c}=await harness();Object.assign(c.boss,{state:'attack',type:'double',timer:.43,hitstun:.2});
 for(let i=0;i<20;i++)c.updateDrStyro(1/120);assert.equal(c.boss.timer,.43);assert.equal(c.hits.length,0);
});
test('split draws two complete mirrored figures and merges back to one',async()=>{
 const {c,calls}=await harness();Object.assign(c.boss,{state:'attack',type:'double',timer:.42,startX:800,target:500});c.drawDrStyro();
 assert.equal(calls.filter(x=>x.art).length,2);const scales=calls.filter(x=>x.scale).map(x=>x.scale[0]);assert.ok(scales[0]<0&&scales[1]>0);
 calls.length=0;c.boss.state='recover';c.boss.timer=.5;c.drawDrStyro();assert.equal(calls.filter(x=>x.art).length,1);
});
test('both entry points load the new module after combat without review code',()=>{
 assert.equal(html,fs.readFileSync(path.join(root,'hero-showdown.html'),'utf8'));
 for(const file of ['styro-core.js','styro-atlas.js','styro-motion.js'])assert.ok(html.includes('assets/animation/'+file));
 assert.ok(!html.includes('styro-review.js'));assert.ok(fs.existsSync(path.join(root,'dr-styro-lab.html')));
});
