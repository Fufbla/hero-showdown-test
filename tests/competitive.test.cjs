const test=require('node:test'),assert=require('node:assert/strict');
const Data=require('../assets/competitive/roster.js'),C=require('../assets/competitive/combat.js'),AI=require('../assets/competitive/cpu.js');
const harbor=require('../assets/harbor/harbor-core.js'),tempest=require('../assets/tempest/tempest-core.js');
const ids=Data.roster.map(c=>c.id);
function match(a='summy',b='bushman'){return C.create({ids:[a,b],controls:['human','human'],random:()=>.35});}
function run(w,t,input=[{},{}]){for(let i=0;i<Math.ceil(t/C.STEP);i++)C.step(w,input,C.STEP);}
function close(w,slot=0,dist=125){const f=w.fighters[slot],t=w.fighters[1-slot];f.x=slot?750:450;t.x=f.x+(slot?-1:1)*dist;f.face=slot?-1:1;t.face=-f.face;return [f,t];}

test('roster is complete, immutable, and contains unique character identities',()=>{assert.equal(ids.length,12);assert.equal(new Set(ids).size,12);assert.equal(Data.roster.filter(c=>c.hero!==undefined).length,3);assert.equal(Data.roster.filter(c=>c.villain!==undefined).length,9);assert.ok(Object.isFrozen(Data.moves.bushman.special));});
for(const a of ids)for(const b of ids)test(`${a} vs ${b}: independent 100 HP, controls, and normal damage`,()=>{
  const w=match(a,b),[f,t]=close(w);assert.deepEqual(w.fighters.map(p=>[p.hp,p.max]),[[100,100],[100,100]]);
  C.queue(w,0,'punch');run(w,.35);assert.ok(t.hp<100,`${a} must hurt ${b}`);assert.equal(f.hp,100);assert.ok(w.fighters[0].cooldowns!==w.fighters[1].cooldowns);
});
for(const id of ids)for(const slot of [0,1])test(`${id} slot ${slot}: facing, guard, jump, and projectile`,()=>{
  let w=match(id,id),[f,t]=close(w,slot);const before=t.hp;
  C.begin(w,f,'punch');run(w,.35,slot?[{block:true},{}]:[{}, {block:true}]);assert.equal(t.hp,before);
  w=match(id,id);[f,t]=close(w,slot);f.face=-f.face;C.begin(w,f,'punch');run(w,.35);assert.equal(t.hp,100,'back-facing attack must miss');
  w=match(id,id);[f,t]=close(w,slot,400);C.queue(w,slot,'shoot');run(w,1.3);assert.ok(t.hp<100,'projectile connects from either side');
  w=match(id,id);[f,t]=close(w,slot);C.queue(w,slot,'jump');run(w,.1);assert.ok(f.y<C.GROUND);assert.equal(f.jumps,1);
});
for(const c of Data.roster)test(c.id+' normal damage stays inside requested target ranges',()=>{
  for(const [key,min,max] of [['punch',5,7],['heavyPunch',8,12],['kick',6,9],['heavyKick',10,14]])assert.ok(Data.moves[c.id][key].damage>=min&&Data.moves[c.id][key].damage<=max,key);
  assert.ok(Data.moves[c.id].special.damage>=12&&Data.moves[c.id].special.damage<=25);
});
for(const id of ids)test(id+' special executes with total damage cap, cost and recovery',()=>{
  const w=match(id,'summy'),[f,t]=close(w,0,120);f.power=100;f.charge=4;assert.ok(C.begin(w,f,'special'));assert.equal(C.begin(w,f,'special'),false);run(w,3);
  assert.ok(t.hp<100,'special must land');assert.ok(100-t.hp<=Data.moves[id].special.damage+.001,'special must not exceed listed total');assert.equal(f.charge,id==='bushman'?0:4);assert.ok(f.cooldowns.special>0);
});
test('human fighters do not attack, vanish, auto-dodge, phase-change or damage each other without input',()=>{
  for(const id of ids){const w=match(id,id);close(w);run(w,15);assert.deepEqual(w.fighters.map(f=>f.hp),[100,100]);assert.ok(w.fighters.every(f=>!f.action&&!f.invisible));assert.equal(w.projectiles.length,0);}
});
test('KKPP preserves a bounded sweep/uppercut chain and cannot queue more than four attacks',()=>{
  const w=match('vee','styro');close(w);for(const key of ['kick','kick','punch','punch','punch','kick'])C.queue(w,0,key);run(w,2);
  assert.deepEqual(w.events.filter(e=>e.type==='attack').map(e=>e.key),['kick','sweep','punch','uppercut']);assert.ok(w.fighters[1].hp<100);
});
test('Bushman requires four separate unblocked qualifying hits; burn and repeats never count',()=>{
  const w=match('bushman','summy'),[f,t]=close(w);f.power=100;assert.equal(C.begin(w,f,'special'),false);
  for(let i=0;i<4;i++){t.inv=0;t.hp=100;t.receivedCombo=0;C.hurt(w,t,6,f.x,{owner:0,qualifies:true,attackId:i});C.hurt(w,t,6,f.x,{owner:0,qualifies:true,attackId:i});assert.equal(f.charge,i+1);if(i<3)assert.equal(C.begin(w,f,'special'),false);}
  assert.ok(C.begin(w,f,'special'));assert.equal(f.charge,0);
  f.action=null;f.cooldowns.special=0;t.inv=0;t.block=true;t.face=-1;C.hurt(w,t,6,f.x,{owner:0,qualifies:true,attackId:20});assert.equal(f.charge,0);
  t.block=false;t.inv=0;C.hurt(w,t,4,f.x,{owner:0,qualifies:false,attackId:21});assert.equal(f.charge,0);
});
test('Lightening Spree teleport: explicit action, bounded distance, two-second visibility and eight-second cooldown',()=>{
  const w=match('spree','bushman'),f=w.fighters[0],before=f.x;
  assert.ok(C.begin(w,f,'skill'));run(w,.5);assert.equal(f.x,before+240);assert.ok(f.invisible>1.8);assert.equal(C.begin(w,f,'skill'),false);
  run(w,2.2);assert.equal(f.invisible,0);assert.equal(C.begin(w,f,'skill'),false);run(w,5.5);assert.ok(C.begin(w,f,'skill'));
});
test('projectile cooldown prevents spam, including after recovery; holding a button is one action',()=>{
  const w=match('wastelander','spree');run(w,4,[{shoot:true},{}]);const launches=w.events.filter(e=>e.type==='attack'&&e.key==='shoot');assert.equal(launches.length,1);
  const f=w.fighters[0];f.action=null;f.cooldowns.shoot=.5;assert.equal(C.begin(w,f,'shoot'),false);
});
test('jumping avoids telegraphed ground attacks, while grounded target is hit',()=>{
  const w=match('venomis','summy'),[f,t]=close(w);C.begin(w,f,'skill');run(w,.7);C.queue(w,1,'jump');run(w,.6);assert.equal(t.hp,100);
  const v=match('venomis','summy');close(v);C.begin(v,v.fighters[0],'skill');run(v,1.4);assert.ok(v.fighters[1].hp<100);
});
test('four-hit pressure forces knockdown and escape protection; repeated hits cannot create an infinite',()=>{
  const w=match(),[f,t]=close(w);
  for(let i=0;i<4;i++){t.inv=0;C.hurt(w,t,5,f.x,{owner:0,attackId:i});}
  assert.ok(t.knockdown>0&&t.inv>.7);const hp=t.hp;C.hurt(w,t,5,f.x,{owner:0,attackId:10});assert.equal(t.hp,hp);
  run(w,1);assert.equal(t.knockdown,0);assert.equal(t.receivedCombo,0);
});
test('difficulty changes decisions only; human and CPU share costs, health and damage',()=>{
  for(const difficulty of ['easy','medium','hard']){const w=C.create({ids:['bushman','spree'],difficulty,controls:['cpu','cpu'],random:()=>.3});assert.deepEqual(w.fighters.map(f=>f.hp),[100,100]);run(w,.01);for(let n=0;n<1800&&w.status==='fight';n++)C.step(w,w.fighters.map(f=>AI.input(w,f,C.STEP)),C.STEP);assert.ok(w.fighters.some(f=>f.hp<100));assert.ok(w.fighters.every(f=>f.hp<=100));}
});
test('normalization is independent of render rate at 30, 60, and 120 FPS',()=>{
  const positions=[];for(const fps of [30,60,120]){const w=match();for(let i=0;i<fps;i++)C.advance(w,1/fps,[{right:true},{}]);positions.push(w.fighters[0].x);}
  assert.ok(Math.max(...positions)-Math.min(...positions)<.0001);
});
test('hit at zero HP resolves once, clears effects, and rematch creates pristine fighters',()=>{
  const w=match('styro','styro');const [f,t]=close(w);t.hp=1;C.queue(w,0,'punch');run(w,.4);assert.equal(w.status,'finished');assert.equal(w.winner,0);assert.equal(t.state,'defeat');assert.equal(f.state,'victory');assert.equal(w.projectiles.length,0);const fresh=match('styro','styro');assert.deepEqual(fresh.fighters.map(f=>[f.hp,f.charge,f.action]),[[100,0,null],[100,0,null]]);
});
test('simultaneous venue damage can produce a double KO',()=>{
  const w=match();w.fighters.forEach(f=>{f.hp=1;C.hurt(w,f,18,600,{hazard:true,blockable:false});});C.settle(w);assert.equal(w.status,'finished');assert.equal(w.winner,null);
});
test('Harbor hit region treats either player symmetrically and permits jumping',()=>{
  for(const slot of [0,1]){const w=match(),f=w.fighters[slot];f.x=500;assert.ok(harbor.inSlam(f,{x:500,radius:108},C.GROUND));f.y=C.GROUND-160;assert.equal(harbor.inSlam(f,{x:500,radius:108},C.GROUND),false);}
});
test('Tempest contact uses separate ids in a mirror match and accepts block for either side',()=>{
  const h=new tempest.Hazard(()=>.2);h.begin();const hit=[];h.contactSweep(0,1280,[{id:'p0',x:500,hp:100,block:true},{id:'p1',x:800,hp:100,block:false}],e=>hit.push(e));assert.deepEqual(hit.map(e=>[e.id,e.blocked]),[['p0',true],['p1',false]]);h.contactSweep(0,1280,[{id:'p0',x:500,hp:100}],e=>hit.push(e));assert.equal(hit.length,2);
});

const Guide=require('../assets/competitive/move-guide.js');
for(const c of Data.roster)test(c.id+' guide lists every executable attack, real damage and controls for each player',()=>{
  for(const kind of ['cpu','local'])for(const slot of [0,1]){
    const rows=Guide.rows(c.id,kind,slot);
    assert.equal(rows.length,13);assert.equal(new Set(rows.map(r=>r.key)).size,13);
    for(const [key,m] of Object.entries(Data.moves[c.id])){
      const r=rows.find(r=>r.key===key);assert.ok(r);assert.equal(r.name,m.name);assert.equal(r.damage,m.damage);assert.equal(r.cooldown,m.cooldown);
      for(const input of ['keyboard','controller','touch'])assert.ok(r[input]&&!r[input].includes('undefined'));
    }
    assert.ok(c.strength&&c.weakness&&c.plan&&c.role);
  }
});
test('rushdown trades damage and reach for speed; heavy power carries slower startup/recovery',()=>{
  for(const id of ['vee','atomdust']){assert.ok(Data.byId[id].speed>Data.byId.sadie.speed);assert.ok(Data.moves[id].punch.damage<Data.moves.sadie.punch.damage);assert.ok(Data.moves[id].punch.startup<Data.moves.sadie.punch.startup);assert.ok(Data.moves[id].heavyPunch.recovery<Data.moves.sadie.heavyPunch.recovery);}
  assert.ok(Data.moves.air.punch.range-Data.byId.air.width>Data.moves.vee.punch.range-Data.byId.vee.width);
  assert.ok(Data.moves.wastelander.special.recovery>Data.moves.summy.special.recovery);
});
for(const id of ids)test(id+' CPU can engage a mirror using normals at its own body-aware spacing',()=>{
  const w=C.create({ids:[id,id],controls:['cpu','human'],difficulty:'medium',random:()=>.3});
  for(const f of w.fighters){f.cooldowns={shoot:99,skill:99,special:99};f.power=0;}
  run(w,0);for(let i=0;i<12/C.STEP;i++)C.step(w,w.fighters.map(f=>AI.input(w,f,C.STEP)),C.STEP);
  assert.ok(w.fighters.some(f=>f.hp<100),id+' must not stand outside attack range forever');
});
test('move guide maps local players independently and describes charge/cooldown counterplay',()=>{
 assert.equal(Guide.rows('bushman','local',0).find(r=>r.key==='punch').keyboard,'F');
 assert.equal(Guide.rows('bushman','local',1).find(r=>r.key==='punch').keyboard,'J');
 assert.match(Guide.rows('bushman').find(r=>r.key==='special').note,/four distinct unblocked/);
 assert.match(Guide.rows('spree').find(r=>r.key==='skill').note,/not invulnerability/);
});
