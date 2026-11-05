import {assertApprovedIntegration} from './creature-integration-preservation.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {BossArt,bossArtPose,legendaryArtPose} from '../boss-art.mjs';
import {BossSprites,BOSS_SPRITE_DATA as D,bossSpritePose,usesBossSprites} from '../boss-sprites.mjs';
import {BOSSES,attackFor} from '../boss-data.mjs';
import {makeBoss,arenaSurfaces} from '../bosses.mjs';
const base='f140ba3083090a6959f3d8951d2bcc063fa5385d';
const make=region=>makeBoss(region,arenaSurfaces()[0]);
const frozen=b=>{if(b.attack)Object.freeze(b.attack);return Object.freeze(b);};
function pixels(bytes){
 assert.equal(bytes.readUInt8(24),8);assert.equal(bytes.readUInt8(25),6,'RGBA transparency required');
 const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20),parts=[];let pos=8;
 while(pos<bytes.length){const size=bytes.readUInt32BE(pos),type=bytes.toString('ascii',pos+4,pos+8);if(type==='IDAT')parts.push(bytes.subarray(pos+8,pos+8+size));pos+=size+12;}
 const raw=inflateSync(Buffer.concat(parts)),out=Buffer.alloc(w*h*4),stride=w*4;
 const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let y=0;y<h;y++){const filter=raw[y*(stride+1)];for(let x=0;x<stride;x++){const i=y*stride+x,a=x>=4?out[i-4]:0,b=y?out[i-stride]:0,c=y&&x>=4?out[i-stride-4]:0;out[i]=(raw[y*(stride+1)+1+x]+[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter])&255;}}
 return {w,h,out};
}
for(const region of [5,6]){
 test(`redesigned regional ${region}: 32 distinct transparent frames with padded bounds and shared feet`,()=>{
  const profile=D.bosses[region],cell=profile.cell,anchor=profile.anchor,bytes=readFileSync(new URL(`../../${profile.file}`,import.meta.url)),{w,h,out}=pixels(bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),profile.sha256);assert.equal(w,cell*4);assert.equal(h,cell*8);
  assert.equal(profile.name,BOSSES[region].name);assert.equal(profile.frames.length,32);const hashes=new Set();
  for(const f of profile.frames){const [sx,sy]=f.crop,frame=Buffer.alloc(cell*cell*4);let opaque=0,foot=0;
   for(let y=0;y<cell;y++){out.copy(frame,y*cell*4,((sy+y)*w+sx)*4,((sy+y)*w+sx+cell)*4);for(let x=0;x<cell;x++){const a=frame[(y*cell+x)*4+3];if(a){opaque++;assert.ok(x>=2&&y>=2&&x<cell-2&&y<cell-2,'opaque border implies clipping');}if(a>100&&y>=anchor[1]-3&&y<=anchor[1]+3)foot++;}}
   assert.ok(opaque>4000,'frame must contain a full character');assert.ok(foot>5,'a grounded frame must reach its shared foot origin');hashes.add(createHash('sha256').update(frame).digest('hex'));
  }
  assert.equal(hashes.size,32,'states must not reuse one static image');
  const death=profile.frames.slice(profile.states.indexOf('defeat')*4,profile.states.indexOf('defeat')*4+4);assert.ok(death[3].bounds[3]-death[3].bounds[1]<(death[0].bounds[3]-death[0].bounds[1])*.8,'defeat must actually collapse');
 });
 test(`regional ${region}: all phase attacks show windup before contact at the authoritative damage tick`,()=>{
  for(const phase of [1,2,3])for(const kind of new Set(BOSSES[region].patterns[phase-1])){
   const b=make(region);b.phase=phase;b.attack=attackFor(b,kind);const before=JSON.stringify(b.attack);
   for(const q of [0,.1,.47,.49,.9,.999]){b.state='windup';b.age=b.attack.warning*q;assert.ok(bossSpritePose(b).frame%4<2,`${kind}: contact shown before warning finishes`);}
   b.state='active';b.age=0;assert.equal(bossSpritePose(b).frame%4,2,`${kind}: missing first damage tick`);
   b.age=b.attack.duration*.99;assert.equal(bossSpritePose(b).frame%4,2);b.state='recover';b.age=.01;assert.equal(bossSpritePose(b).frame%4,3);
   assert.equal(JSON.stringify(b.attack),before);
  }
 });
 test(`regional ${region}: rendering never mutates HP, phase, damage, cooldown, hit zones, or save fields`,()=>{
  const art=new BossArt({loadImages:false});
  for(const state of ['idle','windup','active','recover','dead'])for(const phase of [1,2,3]){
   const b=make(region);b.phase=phase;b.state=state;b.age=.1;b.attack=attackFor(b,BOSSES[region].patterns[phase-1][0]);b.attack.zones=Object.freeze([{x:300,y:548,w:160,h:52}]);frozen(b);const before=JSON.stringify(b);
   for(let i=0;i<120;i++){art.step(b,i/60,1/60);bossArtPose(b,i/60);}
   assert.equal(JSON.stringify(b),before);
  }
 });
 test(`regional ${region}: hit, walk, death and pause preserve state ordering`,()=>{
  const b=make(region);b.flash=.12;assert.equal(bossSpritePose(b).state,'hit');b.state='windup';b.attack=attackFor(b,'swipe');assert.notEqual(bossSpritePose(b).state,'hit');
  b.state='idle';b.flash=0;b.attack=null;b.prevX=b.x-1;assert.equal(bossSpritePose(b,1).state,'walk');
  const art=new BossArt({loadImages:false});art.step(b,3,0);const before=JSON.stringify(art.inspect(b));for(let i=0;i<20;i++)art.step(b,3,0);assert.equal(JSON.stringify(art.inspect(b)),before);
  b.state='dead';b.flash=.12;const frames=[];for(const age of [0,.24,.48,.72,1.2]){b.age=age;const p=bossSpritePose(b);assert.equal(p.state,'defeat');frames.push(p.frame);}assert.equal(new Set(frames).size,4);
 });
}

test('Batch 2 new regional artwork cannot intercept Legendary identities or helpers',()=>{
 for(const [region,id] of [[5,'venomis'],[6,'atomdust']])for(const extra of [{legendary:true,legendaryId:id},{legendaryHelper:true,helperTheme:id}]){
  const b={...make(region),...extra};assert.equal(usesBossSprites(b),false);const pose=bossArtPose(b,3);assert.equal(pose.region,id);assert.equal(pose.redesigned,extra.legendaryHelper?undefined:true);assert.equal(pose.sheet,extra.legendaryHelper?id:`legendary-sprites-${id}`);
 }
});
test('old and new atlas sizes decode through the same bounded image cache',async()=>{
 let loads=0;const sprites=new BossSprites({loadImages:true,imageLoader:async url=>{loads++;const p=Object.values(D.bosses).find(p=>url.pathname.endsWith(p.file));return {width:(p.cell||D.cell)*4,height:(p.cell||D.cell)*8};}});
 for(const r of [1,5,6])assert.equal(await sprites.prepare(r),true);assert.equal(sprites.cache.size,2);assert.equal(loads,3);assert.equal(await sprites.prepare(6),true);assert.equal(loads,3);
});
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,(a.z||0)-(b.z||0));
const near=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-5,`${message}: ${a} vs ${b}`);
test('scorpion collapse preserves eight planted feet, connected limbs and ten fixed tail segments',()=>{
 const art=new BossArt({loadImages:false}),b=make(4);for(let i=0;i<120;i++)art.step(b,i/60,1/60);
 b.state='dead';b.age=0;const initial=art.step(b,2,1/60).pose;let last;
 for(let i=0;i<60;i++){
  b.age=i/60;const before=JSON.stringify(b),p=art.step(b,2+b.age,1/60).pose;assert.equal(JSON.stringify(b),before);assert.equal(p.legs.length,8);assert.equal(p.claws.length,2);assert.equal(p.tail.length,11);
  for(const [j,l] of p.legs.entries()){assert.ok(l.planted);near(dist(l.position,initial.legs[j].position),0,'collapse foot must stay planted');near(dist(l.joints.at(-1),l.position),0,'foot/joint attachment');for(let k=0;k<3;k++)near(dist(l.joints[k],l.joints[k+1]),l.lengths[k],'leg segment length');}
  for(const a of p.claws){const ps=[a.shoulder,a.elbow,a.wrist,a.palm];for(let j=0;j<3;j++)near(dist(ps[j],ps[j+1]),a.lengths[j],'claw joints');}
  for(let j=0;j<10;j++)near(dist(p.tail[j],p.tail[j+1]),65,'tail segment');near(dist(p.tail[0],p.root),0,'tail root');near(dist(p.tail.at(-1),p.stingerSocket),0,'stinger connection');last=p;
 }
 assert.ok(last.body.y>initial.body.y+30,'abdomen must settle');assert.ok(last.stinger.y>initial.stinger.y+100,'tail must collapse');
});
test('scorpion transparent pose atlas contains full bodies, changing poses and a visible collapse',()=>{
 const data=JSON.parse(readFileSync(new URL('../assets/boss-sprites/scorpion-atlas-manifest.json',import.meta.url))),bytes=readFileSync(new URL(`../../${data.file}`,import.meta.url)),{w,h,out}=pixels(bytes);
 assert.equal(w,2048);assert.equal(h,4096);assert.equal(createHash('sha256').update(bytes).digest('hex'),data.sha256);assert.equal(data.frames.length,32);
 for(const f of data.frames){let solid=0;for(let y=0;y<512;y++)for(let x=0;x<512;x++){const a=out[((f.crop[1]+y)*w+f.crop[0]+x)*4+3];if(a>100)solid++;if(a>16)assert.ok(x>1&&x<510&&y>1&&y<510,'scorpion pose clips cell edge');}assert.ok(solid>10000,'complete body required, not only a floating stinger');}
 for(const state of data.states)assert.ok(new Set(data.frames.filter(f=>f.state===state).map(f=>f.pixelHash)).size>1,`${state} must animate`);
 const a=data.frames[28].bounds,b=data.frames[31].bounds;assert.ok(b[3]-b[1]<(a[3]-a[1])*.8,'collapse reduces silhouette height');
});
test('Batch 2 preserves historical boss artwork and the exact approved creature integration',()=>{
 // Preserve the historical boss-art invariant and the exact approved two-source union.
 assertApprovedIntegration('f140ba3083090a6959f3d8951d2bcc063fa5385d');
});
