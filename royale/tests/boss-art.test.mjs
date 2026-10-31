import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {BossArt,BOSS_ART,BOSS_ART_DEPENDENCIES,bossArtPose,scorpionPoseModel} from '../boss-art.mjs';

const require=createRequire(import.meta.url);
const Bush=require('../../assets/animation/bushman-animation-atlas.js');
const Waste=require('../../assets/animation/wastelander-atlas.js');
const Venom=require('../../assets/animation/venomis-thornbear-atlas.js');
const Fighter=require('../../assets/villain-motion/fighter-atlas.js');
const Shore=require('../../assets/shore/boss-core.js');
const frameMap=(profile,min=0)=>new Map(profile.sheets.flatMap(s=>s.frames.flatMap((f,i)=>{
  const id=f.id??s.first+i;if(id<min)return [];
  const crop=Array.isArray(f)?f:f.crop;
  return [[id,{file:`assets/animation/${s.file}`,crop:crop.slice(0,4),referenceHeight:f.referenceHeight||s.referenceHeight,anchor:crop.slice(4),mask:s.masks?.[i]}]];
})));
const fighterMap=id=>new Map(Fighter[id].frames.map((f,i)=>[i,{...f,file:`assets/villain-motion/${Fighter[id].file}`,referenceHeight:Fighter[id].referenceHeight}]));
const sources={bushman:frameMap(Bush),wastelander:frameMap(Waste),'wastelander-combat':fighterMap('wastelander'),venomis:frameMap(Venom,32),atomdust:fighterMap('atomdust'),atomdust_punch:fighterMap('atomdust_punch'),atomdust_walk:fighterMap('atomdust_walk')};
const kinds={1:['swipe','throw','slam'],2:['vine','thorns','branch','roots'],3:['punch','toxic','shockwave','hazard'],4:['claw','sting','clawCombo','stingPattern'],5:['thorns','vine','poison','vineCombo','roots'],6:['blast','expansion','debris','atomic'],7:['pollution','slam','environment','cataclysm']};
const boss=(region=4)=>({region,id:100,type:`boss-${region}`,x:1180,y:600,prevX:1180,prevY:600,w:region===4?240:140,h:region===4?165:180,face:-1,phase:1,hp:11000,maxHp:11000,state:'idle',age:0,attack:null});
const near=(a,b,tolerance=1e-6,message='values differ')=>assert.ok(Math.abs(a-b)<=tolerance,`${message}: ${a} vs ${b}`);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,(a.z||0)-(b.z||0));

test('all regional attack states select existing approved frames; Venomis never selects Thornbear',()=>{
  for(let region=1;region<=7;region++)for(const kind of kinds[region])for(const state of ['idle','windup','active','recover','dead'])for(const q of [0,.25,.5,.75,1]){
    const b={...boss(region),state,age:q,attack:{kind,warning:1,duration:1,recovery:1,targetX:420}};
    for(const walking of [false,true]){
      b.prevX=b.x-(walking?1:0);const p=bossArtPose(b,q*13.7);
      assert.equal(p.region,region);
      if([1,7].includes(region)){assert.equal(p.temporary,true);continue;}
      if(region===4){assert.equal(p.rig,true);continue;}
      assert.ok(sources[p.sheet]?.has(p.frame),`${region}/${kind}/${state}/${q}: missing ${p.sheet}:${p.frame}`);
      if(region===5)assert.ok(p.frame>=32&&p.frame<=47,'solo Venomis must retain her approved scientist design');
    }
  }
  assert.deepEqual(Object.keys(BOSS_ART).filter(k=>BOSS_ART[k].temporary),['1','7']);
});

test('approved crops, anchors, isolation clips and runtime dependencies are available',()=>{
  const dimensions=new Map();
  for(const path of BOSS_ART_DEPENDENCIES){
    const data=readFileSync(new URL(`../../${path}`,import.meta.url));assert.ok(data.length>0,path);
    if(path.endsWith('.png')){assert.equal(data.subarray(1,4).toString(),'PNG');dimensions.set(path,[data.readUInt32BE(16),data.readUInt32BE(20)]);}
  }
  for(const map of Object.values(sources))for(const [id,f] of map){
    const [iw,ih]=dimensions.get(f.file),[x,y,w,h]=f.crop;
    assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=iw&&y+h<=ih,`${f.file}:${id} crop out of bounds`);
    assert.ok(f.referenceHeight>0&&f.anchor.every(Number.isFinite),`${f.file}:${id} needs valid scale and foot anchor`);
    if(f.file.includes('venomis-'))assert.ok(f.mask.length>10,`${f.file}:${id} must isolate the painted background`);
    if(f.file.includes('villain-motion/'))assert.ok(f.clipRuns.length>3,`${f.file}:${id} must preserve its authored pixel isolation`);
  }
});

test('art adaptation is presentation-only and does not mutate combat state',()=>{
  const art=new BossArt({loadImages:false});
  for(let region=1;region<=7;region++){
    const b=boss(region);b.state='windup';b.attack={kind:kinds[region][0],warning:1,duration:.4,recovery:1,targetX:420};
    Object.freeze(b.attack);Object.freeze(b);const before=JSON.stringify(b);
    for(let i=0;i<120;i++)art.step(b,i/120,1/120,420);
    assert.equal(JSON.stringify(b),before);
    assert.equal(art.inspect(b).name,BOSS_ART[region].name);
  }
});

test('scorpion native poses follow authoritative attack timing and frozen target',()=>{
  for(const kind of kinds[4])for(const [state,native] of Object.entries(kind.startsWith('sting')?{windup:'stingerWindup',active:'stingerPlunge',recover:'stingerRecover'}:{windup:'clawWindup',active:'clawSweep',recover:'clawRecover'})){
    const b={...boss(),state,age:.2,attack:{kind,warning:.8,duration:.4,recovery:1.6,targetX:1130}};
    const model=scorpionPoseModel(b,10,400);
    assert.equal(model.state,native);near(model.age,Shore.DURATIONS[native]*(state==='windup'?.25:state==='active'?.5:.125));
    near(model.targetX,640+(1130-b.x)/(b.h/393));assert.equal(model.time,10);
    assert.equal(model.side,1);assert.equal(model.hp,b.hp);
  }
});

test('scorpion locomotion and strikes preserve eight connected legs, two claws and ten fixed tail links',()=>{
  const art=new BossArt({loadImages:false}),b=boss();let previous,plantedComparisons=0;
  for(let i=0;i<2400;i++){
    const time=i/120;b.prevX=b.x;if(i<1200)b.x-=.4;b.age+=1/120;
    if(i===1200){b.state='windup';b.attack={kind:'sting',warning:1.3,duration:.35,recovery:1.45,targetX:b.x-170};b.age=0;}
    if(i===1356){b.state='active';b.age=0;}if(i===1398){b.state='recover';b.age=0;}if(i===1572){b.state='idle';b.age=0;b.attack=null;}
    if(i===1800){b.state='windup';b.attack={kind:'clawCombo',warning:.95,duration:.5,recovery:1.2,targetX:b.x-130};b.age=0;}
    if(i===1914){b.state='active';b.age=0;}if(i===1974){b.state='recover';b.age=0;}if(i===2118){b.state='idle';b.age=0;b.attack=null;}
    const p=art.step(b,time,1/120,420).pose;
    assert.equal(p.legs.length,8);assert.equal(new Set(p.legs.map(l=>l.id)).size,8);
    assert.equal(p.claws.length,2);assert.equal(p.tail.length,11);
    assert.ok(p.legs.filter(l=>!l.planted).length<=4,'at least four feet support the body');
    for(const [j,l] of p.legs.entries()){
      assert.equal(l.joints.length,4);
      for(let k=0;k<3;k++)near(distance(l.joints[k],l.joints[k+1]),l.lengths[k],1e-6,`${l.id} joint ${k} disconnected`);
      near(distance(l.joints[3],l.position),0,1e-5,`${l.id} foot does not reach its ground plant`);
      if(previous&&l.planted&&previous.legs[j].planted&&l.serial===previous.legs[j].serial){
        near(b.x+(l.position.x-640)*b.h/393,b.prevX+(previous.legs[j].position.x-640)*b.h/393,1e-5,'planted foot slides in world space');plantedComparisons++;
      }
    }
    for(const a of p.claws){const points=[a.shoulder,a.elbow,a.wrist,a.palm];for(let k=0;k<3;k++)near(distance(points[k],points[k+1]),a.lengths[k],1e-5,'claw joint disconnected');}
    for(let k=0;k<10;k++)near(distance(p.tail[k],p.tail[k+1]),65,1e-5,'tail link stretches');
    near(distance(p.tail[0],p.root),0,1e-5,'tail detaches from abdomen');near(distance(p.tail[10],p.stingerSocket),0,1e-5,'tail detaches from stinger');
    previous=p;
  }
  assert.ok(plantedComparisons>6000,'foot-plant check covered locomotion and combat braces');
});

test('pausing the scorpion visual clock does not advance its pose or create attacks',()=>{
  const art=new BossArt({loadImages:false}),b=boss();
  art.step(b,3,1/120,420);const pose=JSON.stringify(art.inspect(b).pose);
  for(let i=0;i<10;i++)art.step(b,3,0,900);
  assert.equal(JSON.stringify(art.inspect(b).pose),pose);assert.equal(b.attack,null);
});

test('aggressive scorpion speed and direction changes retain planted feet within IK reach',()=>{
  for(const direction of [-1,1]){
    const art=new BossArt({loadImages:false}),b={...boss(),phase:3};
    for(let i=0;i<1200;i++){
      b.prevX=b.x;b.x+=direction*64.8/120*(i<600?1:-1);
      const pose=art.step(b,i/120,1/120,420).pose;
      for(const leg of pose.legs)near(distance(leg.joints[3],leg.position),0,1e-5,'fast locomotion exceeds leg reach');
      assert.ok(pose.legs.filter(l=>!l.planted).length<=4);
    }
  }
});

test('twin-claw combination articulates both claws while ordinary claw strike moves one',()=>{
  const b={...boss(),state:'active',age:.25,attack:{kind:'clawCombo',warning:1,duration:.5,recovery:1}};
  const idle=scorpionPoseModel(boss()),pair=scorpionPoseModel(b);
  for(const side of [-1,1])assert.ok(Math.abs(pair.clawPose(side).angle-idle.clawPose(side).angle)>.1);
  b.attack.kind='claw';const single=scorpionPoseModel(b);
  near(single.clawPose(-single.side).angle,idle.clawPose(-single.side).angle);
});


test('stinger contact projects into the same physical target as its warning and hit zone',()=>{
  for(const offset of [-200,-100,0,100,200]){
    const b={...boss(),state:'active',age:.35*.65,attack:{kind:'sting',warning:1.3,duration:.35,recovery:1.45}};b.attack.targetX=b.x+offset;
    const art=new BossArt({loadImages:false}),pose=art.step(b,2,1/60,b.attack.targetX).pose,scale=b.h/393;
    near(b.x+(pose.stinger.x-640)*scale,b.attack.targetX,1e-5,'stinger misses the marked target');
    const y=b.y+(pose.stinger.y-573)*scale;assert.ok(y>=b.y-52&&y<=b.y,'stinger is outside its damage zone');
  }
});
