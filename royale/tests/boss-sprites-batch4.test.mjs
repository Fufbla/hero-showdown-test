import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {BossArt,legendaryArtPose} from '../boss-art.mjs';
import {LegendarySprites,legendarySpritePose,usesLegendarySprites} from '../legendary-sprites.mjs';
import {LEGENDARY,LEGENDARY_ATTACKS} from '../legendary-data.mjs';
import {makeLegendary} from '../legendary-bosses.mjs';
import {arenaSurfaces} from '../bosses.mjs';
import {BATCH4_SPRITE_ATLASES as D} from '../assets/boss-sprites/batch4-atlas-data.mjs';
const make=id=>makeLegendary(id,arenaSurfaces()[0]);
function pixels(bytes){
 assert.equal(bytes.readUInt8(24),8);assert.equal(bytes.readUInt8(25),6,'RGBA transparency required');
 const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20),parts=[];let pos=8;
 while(pos<bytes.length){const size=bytes.readUInt32BE(pos),type=bytes.toString('ascii',pos+4,pos+8);if(type==='IDAT')parts.push(bytes.subarray(pos+8,pos+8+size));pos+=size+12;}
 const raw=inflateSync(Buffer.concat(parts)),out=Buffer.alloc(w*h*4),stride=w*4;
 const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let y=0;y<h;y++){const filter=raw[y*(stride+1)];for(let x=0;x<stride;x++){const i=y*stride+x,a=x>=4?out[i-4]:0,b=y?out[i-stride]:0,c=y&&x>=4?out[i-stride-4]:0;out[i]=(raw[y*(stride+1)+1+x]+[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter])&255;}}
 return {w,h,out};
}

for(const id of Object.keys(D.bosses)){
 test(`${id}: distinct transparent aligned poses and full collapse`,()=>{
  const p=D.bosses[id],bytes=readFileSync(new URL('../../'+p.file,import.meta.url)),{w,h,out}=pixels(bytes),hashes=new Set();
  assert.equal(createHash('sha256').update(bytes).digest('hex'),p.sha256);assert.equal(w,2048);assert.equal(h,512*p.states.length);assert.equal(p.name,LEGENDARY[id].name);
  for(const f of p.frames){const [sx,sy,cell]=f.crop,frame=Buffer.alloc(cell*cell*4);let ink=0,feet=0;
   for(let y=0;y<cell;y++){out.copy(frame,y*cell*4,((sy+y)*w+sx)*4,((sy+y)*w+sx+cell)*4);for(let x=0;x<cell;x++){const a=frame[(y*cell+x)*4+3];if(a){ink++;assert.ok(x>=2&&x<cell-2&&y>=2&&y<cell-2);}if(a>100&&Math.abs(y-p.anchor[1])<4)feet++;}}
   assert.ok(ink>4000);assert.ok(feet>5);hashes.add(createHash('sha256').update(frame).digest('hex'));
  }
  assert.equal(hashes.size,p.frames.length);const death=p.frames.slice(-4);assert.ok(death[3].bounds[3]-death[3].bounds[1]<(death[0].bounds[3]-death[0].bounds[1])*.8);
 });
 test(`${id}: all phase attack contacts follow combat timing`,()=>{
  for(const phase of [1,2,3])for(const kind of new Set(LEGENDARY[id].patterns[phase-1])){
   const b=make(id);b.phase=phase;b.attack={...LEGENDARY_ATTACKS[kind],kind};
   for(const q of [0,.47,.49,.999]){b.state='windup';b.age=b.attack.warning*q;assert.ok(legendarySpritePose(b).frame%4<2);}
   b.state='active';b.age=0;assert.equal(legendarySpritePose(b).frame%4,2);
   b.state='recover';b.age=.01;assert.equal(legendarySpritePose(b).frame%4,kind==='leap'?2:3);
  }
 });
 test(`${id}: immutable simulation and paused playback`,()=>{
  const art=new BossArt({loadImages:false});for(const phase of [1,2,3])for(const state of ['idle','windup','active','recover','dead'])for(const y of [360,600])for(const face of [-1,1]){
   const b=make(id);Object.assign(b,{phase,state,y,prevY:y,face,age:.1,attack:Object.freeze({...LEGENDARY_ATTACKS[LEGENDARY[id].patterns[phase-1][0]],kind:LEGENDARY[id].patterns[phase-1][0]})});Object.freeze(b);const before=JSON.stringify(b);art.step(b,3,0);const pose=JSON.stringify(art.inspect(b));art.step(b,3,0);assert.equal(JSON.stringify(art.inspect(b)),pose);assert.equal(JSON.stringify(b),before);
  }
 });
 test(`${id}: hit, walking, death and helper routing`,()=>{
  const b=make(id);b.flash=.12;assert.equal(legendarySpritePose(b).state,'hit');b.flash=0;b.prevX=b.x-1;assert.equal(legendarySpritePose(b).state,'walk');b.state='dead';const frames=new Set();for(const age of [0,.24,.48,.72]){b.age=age;frames.add(legendarySpritePose(b).frame);}assert.equal(frames.size,4);
  for(const flags of [{legendaryHelper:true},{helperTheme:'venomis'}]){assert.equal(usesLegendarySprites({...b,...flags}),false);assert.notEqual(legendaryArtPose({...b,...flags}).sheet,`legendary-sprites-${id}`);}
 });
}
test('Styrodog impact starts at its existing 98% landing tick',()=>{const b=make('styrodog');b.attack={...LEGENDARY_ATTACKS.leap,kind:'leap'};b.state='active';b.age=b.attack.duration*.979;assert.equal(legendarySpritePose(b).state,'leap');b.age=b.attack.duration*.98;assert.equal(legendarySpritePose(b).state,'impact');assert.equal(legendarySpritePose(b).frame%4,1);});
test('Legendary atlases validate dimensions and bound decoded cache',async()=>{const s=new LegendarySprites({imageLoader:async u=>{const p=Object.values(D.bosses).find(p=>u.pathname.endsWith(p.file));return {width:2048,height:512*p.rows};},loadImages:true});for(const id of Object.keys(D.bosses))assert.equal(await s.prepare(id),true);assert.equal(s.cache.size,2);const wrong=new LegendarySprites({loadImages:true,imageLoader:async()=>({width:512,height:512})});assert.equal(await wrong.prepare('lightning'),false);});
test('Batch 4 preserves all tracked files except presentation router and documentation',t=>{
 const root=new URL('../../',import.meta.url),git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim(),base='7316438e5c1eb21a07f862b6adc24615d0d6d6a5';try{git('cat-file','-e',base);}catch{t.skip('Requires verified Batch 3 history');return;}
 const allowed=new Set(['royale/boss-art.mjs','royale/BOSS-SPRITES.md','royale/legendary-sprites.mjs','royale/tests/boss-sprites.test.mjs','royale/tests/boss-sprites-batch4.test.mjs','royale/tests/boss-sprites-batch4-review.mjs','royale/tools/review-boss-sprites-batch4.mjs']);assert.deepEqual(git('diff','--name-only','--diff-filter=MD',base).split('\n').filter(p=>p&&!allowed.has(p)),[]);
 assert.equal(git('diff','--name-only','--diff-filter=MD',base,'--','royale/assets/boss-sprites'),'');
});
