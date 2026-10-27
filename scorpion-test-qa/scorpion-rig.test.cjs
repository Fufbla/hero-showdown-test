'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const path=require('node:path'),gameRoot=['..','../dist'].map(p=>path.resolve(__dirname,p)).find(p=>fs.existsSync(p+'/assets/shore/boss-core.js'));
if(!gameRoot)throw Error('Copy this test with the update into the existing game folder, or run it in the source repository.');
const Boss=require(gameRoot+'/assets/shore/boss-core.js'),Rig=require(gameRoot+'/assets/scorpion-rig/rig-core.js');
const near=(a,b,tol=1e-6)=>assert.ok(Math.abs(a-b)<=tol,`${a} != ${b}`),distance3=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y,(b.z||0)-(a.z||0));
const run=(m,seconds,player={x:110,y:604,dash:true})=>{for(let i=0;i<Math.ceil(seconds*120);i++)m.step(1/120,player);};
const attack=(m,key,box=m.stingerBox())=>({key,box,origin:box.x+box.w/2,face:0,targets:new Set()});
test('authoritative boss gameplay source is byte-identical to pinned GitHub main',()=>{const b=fs.readFileSync(gameRoot+'/assets/shore/boss-core.js');const sha=crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');assert.equal(sha,'fa65e31b59d891785d566059974b133513f6208e');});
test('original HP and every phase duration are preserved',()=>{assert.equal(new Boss.Encounter().maxHp,650);assert.deepEqual(Boss.DURATIONS,{intro:1.2,clawWindup:.9,clawSweep:.82,clawRecover:.65,stingerWindup:1.15,stingerPlunge:.32,stingerExposed:1.75,stingerRecover:.7,reflect:.72,stunned:1.2});});
test('exactly four alternating claw swings precede the next stinger',()=>{const m=new Boss.Encounter(),sides=[];let last=m.state;for(let i=0;i<2400&&m.stingers<1;i++){m.step(1/120,{x:110,y:604,dash:true});if(m.state==='clawSweep'&&last!==m.state)sides.push(m.side);last=m.state;}assert.deepEqual(sides,[1,-1,1,-1]);assert.equal(m.clawCount,4);assert.equal(m.stingers,1);});
test('early claw counters still count once in the four-swing sequence and deal 18',()=>{const m=new Boss.Encounter();for(let i=0;i<4;i++){m.enter('clawWindup');m.age=.5;const a=attack(m,'punch',m.clawBox());assert.equal(m.strike(a)[0].damage,18);assert.equal(m.strike(a).length,0);assert.equal(m.totalSwings,i+1);assert.equal(m.clawCount,i+1);}m.nextAttack();assert.equal(m.state,'stingerWindup');assert.equal(m.hp,578);});
test('target locks at 0.6 seconds and poison is checked once at 0.22 seconds',()=>{const m=new Boss.Encounter();m.player={x:380,y:604};m.enter('stingerWindup');run(m,.5,{x:940,y:604});assert.equal(m.targetX,940);run(m,.1,{x:940,y:604});assert.ok(m.locked);run(m,.55,{x:110,y:604});assert.equal(m.targetX,940);assert.equal(m.state,'stingerPlunge');m.drain();run(m,.21,{x:940,y:604});assert.equal(m.drain().filter(e=>e.type==='attack').length,0);run(m,.11,{x:940,y:604});assert.deepEqual(m.drain().filter(e=>e.type==='attack').map(e=>e.damage),[18]);assert.equal(m.dodged,false);});
test('a dodged sting is reflected only by punch/uppercut and deals exactly 150 after return',()=>{for(const key of ['punch','uppercut']){const m=new Boss.Encounter();m.enter('stingerExposed');m.dodged=true;assert.equal(m.strike(attack(m,'kick')).length,0);assert.ok(m.strike(attack(m,key))[0].reflected);assert.equal(m.hp,650);run(m,.71);assert.equal(m.hp,650);run(m,.01);assert.equal(m.hp,500);assert.equal(m.state,'stunned');assert.equal(m.reflections,1);}});
test('failed dodge and normal phases cannot trigger a reflected sting',()=>{for(const state of ['stingerExposed','stingerWindup','clawRecover']){const m=new Boss.Encounter();m.enter(state);m.dodged=false;assert.ok(!m.strike(attack(m,'punch')).some(h=>h.reflected));assert.equal(m.reflections,0);}});
test('body damage and specials retain their original values',()=>{for(const[key,damage]of [['punch',10],['kick',12],['sweep',12.96],['uppercut',10.8]]){const m=new Boss.Encounter();m.enter('stunned');near(m.strike(attack(m,key,m.bodyBox()))[0].damage,damage);}const m=new Boss.Encounter();m.clearVenue();assert.equal(m.hp,580);});
test('a lethal self-sting retains dissolve and single completion event',()=>{const m=new Boss.Encounter();m.hp=150;m.enter('stingerExposed');m.dodged=true;m.strike(attack(m,'punch'));run(m,.72);assert.equal(m.hp,0);assert.equal(m.state,'dissolve');assert.equal(m.drain().filter(e=>e.type==='complete').length,1);run(m,3.2);assert.ok(m.deathAge>=3.19);assert.equal(m.drain().filter(e=>e.type==='complete').length,0);});
for(const x of [110,220,380,640,790,940,1060,1170])test('connected geometry, reach and joint limits over full attack cycles at x='+x,()=>{
 const m=new Boss.Encounter(),r=new Rig.Rig(m);for(let n=0;n<3000;n++){m.step(1/120,{x,y:604,dash:true});const p=r.advance(m);assert.equal(p.legs.length,8);assert.equal(p.claws.length,2);assert.equal(p.tail.length,11);
  for(const l of p.legs){near(Rig.dist(l.position,l.joints[3]),0);for(let i=0;i<3;i++)near(Rig.dist(l.joints[i],l.joints[i+1]),l.lengths[i]);assert.ok(l.side===1?l.joints[1].x<l.joints[0].x:l.joints[1].x>l.joints[0].x);}
  for(const a of p.claws){near(Rig.dist(a.shoulder,a.elbow),a.lengths[0]);near(Rig.dist(a.elbow,a.wrist),a.lengths[1]);near(Rig.dist(a.wrist,a.palm),a.lengths[2]);const native=m.clawPose(a.weapon.side);near(a.weapon.x,native.x);near(a.weapon.y,native.y);near(a.weapon.angle,native.angle);near(Rig.dist(a.palm,Rig.clawPalm(native)),0);}
  near(Rig.dist(p.tail[0],p.root),0);near(Rig.dist(p.tail[10],p.stingerSocket),0,.001);for(let i=0;i<10;i++){near(distance3(p.tail[i],p.tail[i+1]),65);if(i){const a=p.tail[i-1],b=p.tail[i],c=p.tail[i+1],u=[b.x-a.x,b.y-a.y,b.z-a.z],v=[c.x-b.x,c.y-b.y,c.z-b.z];const turn=Math.acos(Math.max(-1,Math.min(1,u.reduce((s,z,j)=>s+z*v[j],0)/(65*65))));assert.ok(turn<.9,'tail joint turned '+turn);}}
  if(['stingerWindup','stingerPlunge','stingerExposed','reflect','stunned'].includes(m.state))near(Rig.dist(p.stinger,m.stingerPose()),0);
  for(const j of [...p.tail,...p.legs.flatMap(l=>l.joints)])assert.ok(Number.isFinite(j.x)&&Number.isFinite(j.y));
 }
});
test('stance feet stay fixed in world space while the body and hips move',()=>{
 const m=new Boss.Encounter(),r=new Rig.Rig(m),previous=new Map();let plants=0,lifts=0,hipTravel=0;
 for(let n=0;n<1800;n++){m.step(1/120,{x:380,y:604,dash:true});const p=r.advance(m);for(const l of p.legs){const old=previous.get(l.id);if(old&&old.planted&&l.planted&&old.serial===l.serial){near(Rig.dist(old.position,l.position),0);hipTravel+=Rig.dist(old.joints[0],l.joints[0]);plants++;}if(!l.planted)lifts++;previous.set(l.id,l);}}
 assert.ok(plants>8000);assert.ok(lifts>1000);assert.ok(hipTravel>10);
});
test('stinger aiming raises the tail arch above the carapace before striking',()=>{
 for(const x of [380,640,790]){const m=new Boss.Encounter(),r=new Rig.Rig(m);m.player={x,y:604};m.enter('stingerWindup');for(let i=0;i<180;i++){m.step(1/120,{x,y:604,dash:true});r.advance(m);}assert.ok(Math.min(...r.pose.tail.map(p=>p.y))<r.pose.root.y-65,'arch should stay visibly above the body at '+x);}
});
test('both alternating gait groups move and every foot lifts independently',()=>{for(const def of Rig.legs){let moved=false;for(let n=0;n<1000;n++){const f=Rig.footAt(def,n/120);if(f.lift>5)moved=true;}assert.ok(moved,def.id);}assert.equal(Rig.legs.filter(l=>l.group===0).length,4);assert.equal(Rig.legs.filter(l=>l.group===1).length,4);});
test('presentation sampling neither mutates a frozen combat model nor consumes events',()=>{const m=new Boss.Encounter();m.enter('clawWindup');m.age=.5;m.time=.5;Object.freeze(m.events);Object.freeze(m);const before=JSON.stringify(m),r=new Rig.Rig(m);for(let n=0;n<20;n++)r.advance(m);assert.equal(JSON.stringify(m),before);});
test('two presentation passes reuse one snapshot and do not advance time',()=>{const m=new Boss.Encounter(),r=new Rig.Rig(m);m.step(1/120);const a=r.advance(m),b=r.advance(m);assert.equal(a,b);assert.equal(m.time,1/120);});
test('render frequency cannot alter combat or the final articulated pose',()=>{
 const snapshots=[];for(const fps of [30,60,120,144]){const m=new Boss.Encounter(),r=new Rig.Rig(m);let pending=0;for(let frame=0;frame<fps*12;frame++){pending+=1/fps;while(pending+1e-9>=1/120){pending-=1/120;m.step(1/120,{x:790,y:604,dash:true});r.advance(m);}r.advance(m);}snapshots.push({model:JSON.stringify(m),pose:JSON.stringify(r.pose)});}for(const s of snapshots.slice(1))assert.deepEqual(s,snapshots[0]);
});
test('native and rigged encounters have identical traces including counters and self-stings',()=>{
 const a=new Boss.Encounter(),b=new Boss.Encounter(),r=new Rig.Rig(b);for(let n=0;n<6000;n++){
  const player={x:640+Math.sin(n*.007)*450,y:604,dash:true};a.step(1/120,player);b.step(1/120,{...player});
  if(a.state==='clawWindup'&&a.age>.5&&a.totalSwings%3===0){for(const m of [a,b])m.strike(attack(m,'kick',m.clawBox()));}
  if(a.state==='stingerExposed'&&a.dodged){for(const m of [a,b])m.strike(attack(m,'punch'));}
  r.advance(b);assert.equal(JSON.stringify(a),JSON.stringify(b));if(a.hp===0)break;
 }
});
test('inactive post-sting recovery settles without moving any active attack anchor',()=>{
 const m=new Boss.Encounter();m.state='stunned';m.age=1.19;m.time=3;const r=new Rig.Rig(m);const old=r.pose.stinger.y;m.step(1/120);r.advance(m);m.step(1/120);const p=r.advance(m);assert.equal(m.state,'clawWindup');assert.ok(p.stinger.y<old&&p.stinger.y>195);assert.equal(p.claws[0].weapon.x,m.clawPose(1).x);
});
test('all eight support feet finish planting before each fast sweep and stay fixed through it',()=>{
 const m=new Boss.Encounter(),r=new Rig.Rig(m);let previous=null,samples=0;
 for(let n=0;n<5000;n++){m.step(1/120,{x:110,y:604,dash:true});const p=r.advance(m);if(m.state==='clawSweep'){assert.ok(p.legs.every(l=>l.planted));if(previous?.state==='clawSweep')p.legs.forEach((l,i)=>near(Rig.dist(l.position,previous.legs[i].position),0));samples++;}previous=p;}
 assert.ok(samples>1000);
});
test('claw elbows flex through the sweep with bounded joint angles and without frame jumps',()=>{
 const m=new Boss.Encounter(),r=new Rig.Rig(m),ranges=[[Infinity,-Infinity],[Infinity,-Infinity]];let previous=null;
 for(let n=0;n<2500;n++){m.step(1/120,{x:110,y:604,dash:true});const p=r.advance(m);p.claws.forEach((a,i)=>{
  const u={x:a.shoulder.x-a.elbow.x,y:a.shoulder.y-a.elbow.y},v={x:a.wrist.x-a.elbow.x,y:a.wrist.y-a.elbow.y};
  const degrees=Math.acos(Math.max(-1,Math.min(1,(u.x*v.x+u.y*v.y)/(a.lengths[0]*a.lengths[1]))))*180/Math.PI;
  assert.ok(degrees>30&&degrees<150);ranges[i][0]=Math.min(ranges[i][0],degrees);ranges[i][1]=Math.max(ranges[i][1],degrees);
  if(previous){assert.ok(Rig.dist(a.elbow,previous.claws[i].elbow)<4);assert.ok(Rig.dist(a.wrist,previous.claws[i].wrist)<4);}
 });previous=p;}
 for(const [min,max] of ranges)assert.ok(max-min>20,'elbow should flex rather than remain a rigid rotating shape');
});
test('moving forearm artwork meets the wrist while palm and fingers retain the combat transform',()=>{
 const m=new Boss.Encounter(),r=new Rig.Rig(m);
 for(let n=0;n<2200;n++){m.step(1/120,{x:940,y:604,dash:true});const p=r.advance(m);for(const a of p.claws){
  const native=m.clawPose(a.weapon.side),rotated=Rig.rot({x:native.wrist.x-a.palm.x,y:native.wrist.y-a.palm.y},a.forearmRoll);
  near(a.palm.x+rotated.x,a.wrist.x);near(a.palm.y+rotated.y,a.wrist.y);near(a.weapon.angle,native.angle);near(a.weapon.x,native.x);near(a.weapon.y,native.y);
 }}
});
test('pincers open during anticipation then close through the active sweep without snapping',()=>{
 const m=new Boss.Encounter(),r=new Rig.Rig(m);let windup=0,contact=0,previous=null;
 for(let n=0;n<450;n++){m.step(1/120,{x:110,y:604,dash:true});const p=r.advance(m),a=p.claws[m.side===1?0:1];if(m.state==='clawWindup'&&m.age>.85)windup=Math.max(windup,a.opening);if(m.state==='clawSweep'&&m.age>.65)contact=a.opening;if(previous)p.claws.forEach((c,i)=>assert.ok(Math.abs(c.opening-previous.claws[i].opening)<.008));previous=p;}
 assert.ok(windup>.11);assert.ok(contact<.07);assert.ok(windup-contact>.05);
});
test('early counters preserve connected recovery for either claw and never create an extra hit',()=>{
 for(const side of [1,-1])for(const state of ['clawWindup','clawSweep']){
  const m=new Boss.Encounter();m.totalSwings=side===1?0:1;m.enter('clawWindup');const r=new Rig.Rig(m);
  while(m.state!==state||m.age<(state==='clawWindup'?.5:.3)){m.step(1/120,{x:110,y:604,dash:true});r.advance(m);}
  const before=r.pose.claws[side===1?0:1];m.strike(attack(m,'punch',m.clawBox()));const after=r.advance(m).claws[side===1?0:1];near(Rig.dist(before.weapon,after.weapon),0);assert.equal(m.hp,632);assert.equal(m.clawCount,1);
  m.drain();for(let n=0;n<60;n++){m.step(1/120,{x:110,y:604,dash:true});const p=r.advance(m);for(const a of p.claws){near(Rig.dist(a.wrist,a.palm),a.lengths[2]);near(Rig.dist(a.elbow,a.wrist),a.lengths[1]);}}
  assert.equal(m.drain().filter(e=>e.type==='attack').length,0);
 }
});
