import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFileSync} from 'node:fs';
import {poseFor,dimensions,previewHero,PREVIEW_POSES} from '../style-c-rig.mjs';
import {drawHero,configureStyleC,styleCCacheStatus} from '../style-c-hero.mjs';
import {prepareStyleCMaterials,styleCTextureStatus,styleCMaterial} from '../style-c-materials.mjs';
import {STYLE_C_PARTS} from '../assets/hero/style-c-parts.mjs';
import {HAIR_STYLES,LOOK_OPTIONS,LOOK_RANGES,sanitizeLook} from '../appearance.mjs';
import {Game,STEP,ATTACKS,decodeSave} from '../core.mjs';
import {STYLE_C_SAMPLES,styleCOutfit} from './style-c-scenes.mjs';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
configureStyleC({makeCanvas:createCanvas});
await prepareStyleCMaterials({canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u))});
const near=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const BASE='4495e0307e7a8dc9aa8bcdd8fbedb575048e6795';
test('Style C changes only Royale hero presentation and dedicated approval evidence',()=>{
 const git=(...a)=>execFileSync('git',a,{cwd:new URL('../../',import.meta.url),encoding:'utf8'}).trim();
 const changed=git('diff','--name-only',BASE).split('\n').filter(Boolean);
 const allowed=p=>p==='royale/hero-art.mjs'||p==='royale/tests/hero-preservation.mjs'||/^royale\/(?:style-c-[^/]+\.mjs|tests\/style-c-[^/]+\.(?:mjs|html)|tests\/style-c\.test\.mjs|assets\/hero\/style-c-[^/]+|STYLE-C-APPROVAL\.md|qa\/style-c\/.*)$/.test(p);
 assert.deepEqual(changed.filter(p=>!allowed(p)),[]);
 const extra=git('ls-files','--others','--exclude-standard').split('\n').filter(Boolean).filter(p=>!p.startsWith('royale/node_modules/'));
 assert.deepEqual(extra.filter(p=>!allowed(p)),[]);
 assert.equal(git('show',BASE+':royale/hero-art.mjs').replaceAll("from './","from '../")+'\n',readFileSync(new URL('./style-c-before-art.mjs',import.meta.url),'utf8').split('\n').slice(1).join('\n'));
});
test('original modular Style C atlas is transparent, bounded and independently addressable',()=>{
 assert.equal(styleCTextureStatus().ready,true);const png=readFileSync(new URL('../assets/hero/style-c-parts.png',import.meta.url));assert.equal(png[25],6);
 assert.equal(png.readUInt32BE(16),STYLE_C_PARTS.width);assert.equal(png.readUInt32BE(20),STYLE_C_PARTS.height);
 const rects=Object.entries(STYLE_C_PARTS.parts);assert.equal(rects.length,16);
 for(const [name,[x,y,w,h]]of rects){assert.ok([x,y,w,h].every(Number.isInteger));assert.ok(x>=0&&y>=0&&x+w<=STYLE_C_PARTS.width&&y+h<=STYLE_C_PARTS.height,name);
  for(const [other,[a,b,u,v]]of rects)if(name!==other)assert.ok(x+w<=a||a+u<=x||y+h<=b||b+v<=y,name+' overlaps '+other);}
});
for(const state of PREVIEW_POSES)test(`Style C ${state}: fixed connected joints, finite poses, immutable simulation`,()=>{
 for(const build of LOOK_OPTIONS.build)for(const presentation of LOOK_OPTIONS.presentation)for(const extreme of [0,1])for(const t of [.01,.07,.15,.26,.46,.8]){
  const l={build,presentation};for(const [k,range]of Object.entries(LOOK_RANGES))l[k]=range[extreme];
  const h=previewHero(state,t),before=JSON.stringify([l,h]),p=poseFor(l,h,t),d=dimensions(l);
  for(const limb of [...p.arms,...p.legs])for(const point of limb)assert.ok(point.every(Number.isFinite));
  for(const arm of p.arms){near(Math.hypot(arm[1][0]-arm[0][0],arm[1][1]-arm[0][1]),d.arm*.48);near(Math.hypot(arm[2][0]-arm[1][0],arm[2][1]-arm[1][1]),d.arm*.52);}
  for(const leg of p.legs)for(let i=1;i<3;i++)near(Math.hypot(leg[i][0]-leg[i-1][0],leg[i][1]-leg[i-1][1]),d.leg*.5);
  assert.equal(JSON.stringify([l,h]),before);
 }
});
test('Style C walk and run stance cancel actual world motion without sliding feet',()=>{
 for(const speed of [185,315,504])for(let t=.01;t<.5;t+=.008){const d=dimensions({}),run=Math.min(1,Math.max(0,(speed-185)/130)),stride=d.leg*(.28+(.49-.28)*run),phase=t*speed/(stride*4)%1,dt=.00001;
  const h=q=>({...previewHero('walk',q),vx:speed,cycle:q*speed/52});const a=poseFor({},h(t),t),b=poseFor({},h(t+dt),t+dt);
  for(let i=0;i<2;i++)if((phase+i*.5)%1<.48){near(b.legs[i][2][0]-a.legs[i][2][0],-speed*dt,1e-5);near(a.legs[i][2][1],-4);}
 }
});
test('Style C punches and kicks meet original targets throughout active windows',()=>{
 for(const kind of ['punch','kick'])for(const build of LOOK_OPTIONS.build)for(const height of [.88,1.12])for(const limbs of [.85,1.15]){
  const a=ATTACKS[kind];for(let age=a.startup+.001;age<a.startup+a.active;age+=.015){const h={...previewHero('idle',0),attack:{kind,age,face:1,id:2}},p=poseFor({build,height,arms:limbs,legs:limbs},h,0),point=kind==='punch'?p.arms[0][2]:p.legs[0][2];near(point[0],kind==='punch'?54:56,.03);near(point[1],kind==='punch'?-54:-39,.03);}
 }
});
test('all 49 saved hairstyles produce distinct Style C drawings',()=>{
 const hashes=new Set();for(const hair of HAIR_STYLES){const c=createCanvas(280,360),x=c.getContext('2d');drawHero(x,140,330,{...STYLE_C_SAMPLES[0],hair},previewHero('idle',.2),.2,2.5,{view:'front'});const hash=createHash('sha256').update(c.toBuffer('image/png')).digest('hex');assert.ok(!hashes.has(hash),hair+' duplicates another hairstyle');hashes.add(hash);}assert.equal(hashes.size,49);
});
test('all appearance controls affect Style C rendering and stay save compatible',()=>{
 const fingerprint=l=>{const c=createCanvas(360,420);drawHero(c.getContext('2d'),180,390,l,previewHero('idle',.2),.2,2.7,{view:'front'});return createHash('sha256').update(c.toBuffer('image/png')).digest('hex');};
 const base=sanitizeLook({hair:'short-locs'}),original=fingerprint(base);
 for(const [key,values]of Object.entries(LOOK_OPTIONS))for(const value of values){const l={...base,[key]:value};if(value!==base[key])assert.notEqual(fingerprint(l),original,key+':'+value);const g=new Game({look:l});assert.equal(decodeSave(g.save()).look[key],value);}
 for(const [key,range]of Object.entries(LOOK_RANGES))for(const value of range)assert.notEqual(fingerprint({...base,[key]:value}),original,key);
});
test('all fixed suits render on all body builds without modifying inventory or saved colors',()=>{
 for(const outfit of ['starter','ordinary','rare',...['lightning','air','styrodog','sonic','styro','wastelander','venomis','atomdust'].map(id=>'merge:'+id)])for(const build of LOOK_OPTIONS.build)for(const presentation of LOOK_OPTIONS.presentation){
  const l={...STYLE_C_SAMPLES[0],build,presentation},gear=styleCOutfit(outfit),h=previewHero('kick',.15),before=JSON.stringify([l,gear,h]),canvas=createCanvas(480,480),c=canvas.getContext('2d');
  drawHero(c,210,400,l,h,.15,2.2,{outfit:gear});assert.equal(JSON.stringify([l,gear,h]),before);assert.ok(c.getImageData(0,0,480,480).data.some(v=>v>0));
 }
});
test('new drawing cannot alter movement, attack boxes, rewards, inventory or save contents',()=>{
 const g=new Game(),canvas=createCanvas(240,240);g.enemies=[];
 for(let i=0;i<240;i++){g.step(STEP,{move:i<120?1:-1,run:i%60<30,jump:[10,20,135,150].includes(i),punchHeld:i%40<10,kickHeld:i%40>30});const before=JSON.stringify([g.heroBox(),g.attackBox(),g.save(),g.hero]);drawHero(canvas.getContext('2d'),120,220,g.look,g.hero,g.time,1);assert.equal(JSON.stringify([g.heroBox(),g.attackBox(),g.save(),g.hero]),before);}
});
test('Style C face and texture caches remain bounded during customization',()=>{
 const c=createCanvas(240,240).getContext('2d');for(let i=0;i<90;i++){const skin='#'+(0x784020+i*70).toString(16);drawHero(c,120,220,{skin,eyes:'#'+(0x354020+i*50).toString(16)},previewHero('idle',i/60),i/60);styleCMaterial('torsoMale',skin);}
 assert.ok(styleCCacheStatus().faceEntries<=styleCCacheStatus().faceLimit);assert.ok(styleCTextureStatus().entries<=styleCTextureStatus().limit);
});
