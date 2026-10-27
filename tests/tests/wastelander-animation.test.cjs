'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../dist'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const core=require('../dist/assets/animation/wastelander-core.js'),atlas=require('../dist/assets/animation/wastelander-atlas.js');
function fn(name){const start=html.indexOf('function '+name+'(');assert.ok(start>=0,name);let open=html.indexOf('{',start),depth=1,i=open+1;for(;depth&&i<html.length;i++){if(html[i]==='{')depth++;if(html[i]==='}')depth--;}return html.slice(start,i);}
const p=(overrides={})=>({state:'idle',type:'mallet',timer:0,phase:1,time:0,ending:0,victory:false,moving:false,stride:0,react:0,heavy:false,hitstun:0,guard:0,...overrides});
async function harness({candidate=true,search='',fail=''}={}){
 const calls=[],images=[],c={HealthiaWastelanderCore:core,HealthiaWastelanderAtlas:atlas,location:{search},URLSearchParams,Promise,Map,WeakMap,
  hero:{x:300,y:604,hp:100},boss:{x:800,hp:650,max:650,hitstun:0,cd:.01,state:'idle',timer:0,count:0,dir:-1},opponent:5,selected:0,heroes:[{height:240}],phase:1,t:0,ending:0,GROUND:604,W:1280,
  mode:'fight',paused:false,hitStop:0,FIXED_STEP:1/120,simulationRemainder:1/240,guest:false,
  wasteShots:[],wastePools:[],wasteBursts:[],shake:0,clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),combatSound(){},burst(){},
  coEach:action=>action(),hitHero:(damage)=>{c.hero.hp-=damage;c.hits.push(damage);},hits:[],specialSceneLocked:()=>false,coGuest:()=>c.guest,
  wasteBody:()=>calls.push({fallback:true}),drawWastelander:()=>c.wasteBody()};
 c.ctx={save(){},restore(){},translate(x,y){calls.push({x,y});},scale(){},drawImage(canvas){calls.push({art:canvas.asset});},beginPath(){},moveTo(){},bezierCurveTo(){},stroke(){},ellipse(){},fill(){}};
 c.document={createElement(){const canvas={};canvas.getContext=()=>({drawImage(im){canvas.asset=im.src;},beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){}});return canvas;}};
 c.Image=class{set src(value){this._src=value;images.push(value);queueMicrotask(()=>{if(fail&&value.includes(fail)){this.onerror();return;}const bytes=fs.readFileSync(path.join(root,value));this.naturalWidth=bytes.readUInt32BE(16);this.naturalHeight=bytes.readUInt32BE(20);this.onload();});}get src(){return this._src;}};
 c.window=c;vm.createContext(c);
 for(const name of ['wasteImpact','updateWastelanderLogic','updateWastelander'])vm.runInContext(fn(name),c);
 if(candidate){vm.runInContext(fs.readFileSync(path.join(root,'assets/animation/wastelander-motion.js'),'utf8'),c);await c.HealthiaWastelanderAnimation.whenLoaded;}
 return {c,calls,images};
}
test('walk uses eight poses by distance and remains still when the fighter stops',()=>{
 assert.equal(new Set(Array.from({length:80},(_,i)=>core.pose(p({moving:true,stride:i/80})).frame)).size,8);
 const a=core.pose(p({moving:true,stride:.35})).frame;assert.equal(a,core.pose(p({moving:true,stride:.35,time:100})).frame);
 for(const stride of [0,.24,.6,.99])assert.ok(core.pose(p({stride,moving:false})).frame>=8);
});
test('mallet contact pose starts exactly at the original damaging timer',()=>{
 for(const timer of [.85,.7,.6,.5,.400001])assert.ok(![19,20,21,22].includes(core.pose(p({state:'attack',timer})).frame));
 assert.equal(core.pose(p({state:'attack',timer:.4})).frame,20);
 assert.equal(core.pose(p({state:'attack',timer:.27})).frame,19);
});
test('throw release drawings follow the real two- and three-shot cadence',()=>{
 for(const phase of [1,2,3])for(let shot=1;shot<=(phase===3?3:2);shot++){
  assert.equal(core.pose(p({type:'trash',state:'attack',phase,timer:1.45-shot*.36-.001})).frame,26);
  assert.notEqual(core.pose(p({type:'trash',state:'attack',phase,timer:1.45-shot*.36+.001})).frame,26);
 }
 assert.notEqual(core.pose(p({type:'trash',state:'attack',phase:1,timer:1.45-1.08})).frame,26);
});
test('acid stream starts with the existing pool spawn and stops before return to guard',()=>{
 for(const timer of [1.05,.9,.650001,.16,0])assert.equal(core.pose(p({type:'acid',state:'attack',timer})).pour,false);
 for(const timer of [.65,.4,.160001])assert.equal(core.pose(p({type:'acid',state:'attack',timer})).pour,true);
});
test('hit recovery cannot conceal an active resumed attack',()=>{
 assert.equal(core.pose(p({react:.4,reactDuration:.4,hitstun:.14})).state,'light hit');
 assert.equal(core.pose(p({react:.56,reactDuration:.56,heavy:true,hitstun:.2})).frame,13);
 assert.equal(core.pose(p({state:'attack',timer:.39,react:.3,hitstun:0})).state,'mallet impact');
});
test('guard and counterattack have explicit body poses while defeat retains original collapse',()=>{
 assert.equal(core.pose(p({guard:.2})).frame,12);
 assert.equal(core.pose(p({breakout:{age:.1,charge:.24}})).frame,14);
 assert.equal(core.pose(p({breakout:{age:.3,charge:.24}})).frame,26);
 for(const ending of [0,.2,.5,.8])assert.equal(core.pose(p({victory:true,ending})).legacy,true);
});
test('all new drawings register within the real transparent PNG bounds',async()=>{
 const {c}=await harness();assert.equal(c.HealthiaWastelanderAnimation.ready(),true);
 assert.equal(c.HealthiaWastelanderAnimation.metrics().errors.length,0);
 assert.equal(c.HealthiaWastelanderAnimation.metrics().addedDrawings,34);
 for(const sheet of atlas.sheets){const png=fs.readFileSync(path.join(root,'assets/animation',sheet.file));assert.equal(png[25],6);for(const [x,y,w,h,ax,ay] of sheet.frames){assert.ok(x>=0&&y>=0&&x+w<=png.readUInt32BE(16)&&y+h<=png.readUInt32BE(20));assert.ok(ax>=x&&ax<=x+w&&ay>=y&&ay<=y+h);}}
});
test('missing attack sheet uses the original full renderer, without partial figures',async()=>{
 const {c,calls}=await harness({fail:'wastelander-attacks'});assert.equal(c.HealthiaWastelanderAnimation.ready(),false);c.wasteBody();assert.equal(calls.at(-1).fallback,true);assert.equal(c.HealthiaWastelanderAnimation.metrics().errors.length,1);
});
test('original comparison skips every new image and retains the original renderer',async()=>{
 const {c,calls,images}=await harness({search:'?wastelander=original'});assert.equal(images.length,0);c.wasteBody();assert.equal(calls.at(-1).fallback,true);
});
test('new renderer is restricted to Wastelander',async()=>{
 const {c,calls}=await harness();for(const opponent of [0,1,2,3,4,6,7,8]){c.opponent=opponent;c.wasteBody();assert.equal(calls.at(-1).fallback,true);}
});
test('presentation never mutates authoritative coordinates, including reversed facing',async()=>{
 const {c}=await harness();for(const dir of [-1,1]){c.boss.dir=dir;c.updateWastelander(1/120);const before=JSON.stringify(c.boss);for(let i=0;i<100;i++)c.wasteBody();assert.equal(JSON.stringify(c.boss),before);}
});
test('pause, hitstop, attacks and network guests bypass the extra interpolation',async()=>{
 const {c}=await harness();c.updateWastelander(1/120);assert.notEqual(c.HealthiaWastelanderAnimation.inspect().x,c.boss.x);
 for(const field of ['paused','hitStop','guest']){c[field]=true;assert.equal(c.HealthiaWastelanderAnimation.inspect().x,c.boss.x);c[field]=false;}
 c.boss.state='attack';c.boss.timer=.5;assert.equal(c.HealthiaWastelanderAnimation.inspect().x,c.boss.x);
});
test('a fresh round never inherits the previous boss interpolation history',async()=>{
 const {c}=await harness();c.updateWastelander(1/120);c.boss={...c.boss,x:400};assert.equal(c.HealthiaWastelanderAnimation.inspect().x,400);
});
for(const type of ['mallet','trash','acid'])test(type+' retains identical gameplay at every drawing rate',async()=>{
 for(const phase of [1,2,3])for(const hz of [30,60,120,144]){
  const {c:a}=await harness({candidate:false}),{c:b}=await harness();
  for(const c of [a,b]){c.phase=phase;Object.assign(c.boss,{state:'warn',type,timer:type==='mallet'?1.15:1,startX:800,target:type==='acid'?705:300,struck:false,volley:0});}
  let remainder=0;for(let frame=0;frame<Math.ceil(hz*6);frame++){
   remainder+=1/hz;while(remainder+1e-9>=1/120){for(const c of [a,b]){c.t+=1/120;c.updateWastelander(1/120);}remainder-=1/120;}
   b.simulationRemainder=remainder;b.wasteBody();
   const snapshot=c=>JSON.stringify([c.boss,c.hero,c.hits,c.wasteShots,c.wastePools,c.wasteBursts]);assert.equal(snapshot(a),snapshot(b));
  }
 }
});
test('paused hitstun never advances a windup or releases a delayed mallet',async()=>{
 const {c}=await harness();Object.assign(c.boss,{state:'warn',type:'mallet',timer:.3,hitstun:.2});
 for(let i=0;i<30;i++)c.updateWastelander(1/120);assert.equal(c.boss.timer,.3);assert.equal(c.hits.length,0);
});
test('both game entry points load the same complete Wastelander assets',()=>{
 assert.equal(html,fs.readFileSync(path.join(root,'hero-showdown.html'),'utf8'));
 for(const f of ['wastelander-core.js','wastelander-atlas.js','wastelander-motion.js'])assert.ok(html.includes('assets/animation/'+f));
 for(const sheet of atlas.sheets)assert.ok(fs.existsSync(path.join(root,'assets/animation',sheet.file)));
});
