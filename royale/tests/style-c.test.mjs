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
test('Style C and instant upgrades change only authorized Royale files',()=>{
 const git=(...a)=>execFileSync('git',a,{cwd:new URL('../../',import.meta.url),encoding:'utf8'}).trim();
 const changed=git('diff','--name-only',BASE).split('\n').filter(Boolean);
 const upgraded=new Set(['royale/app.mjs','royale/creator.mjs','royale/index.html','royale/power-menu.mjs','royale/powers.css','royale/power-upgrades.mjs','royale/tests/power-upgrades.test.mjs','royale/tests/phase3-checks.mjs','royale/STYLE-C-SYSTEM.md','royale/hero-rig.mjs','royale/eris-ui.mjs','royale/journey.mjs','royale/world-ui.css','royale/equipment.mjs','royale/tests/world-ui-preservation.mjs']);
 const allowed=p=>upgraded.has(p)||p.startsWith('royale/assets/hero/style-c-accurate/')||p==='royale/hero-art.mjs'||p==='royale/tests/hero-preservation.mjs'||/^royale\/(?:style-c-[^/]+\.mjs|tests\/style-c-[^/]+\.(?:mjs|html)|tests\/style-c\.test\.mjs|assets\/hero\/style-c-[^/]+|STYLE-C-APPROVAL\.md|qa\/style-c\/.*)$/.test(p);
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

test('default idle uses uploaded RGB at native reference proportions, including both faces and costumes',async()=>{
 const {styleCDefault}=await import('../style-c-defaults.mjs');
 const ref=await loadImage(fileURLToPath(new URL('../assets/hero/style-c-accurate/reference.jpeg',import.meta.url))),original=createCanvas(1536,864);original.getContext('2d').drawImage(ref,0,0);const source=original.getContext('2d').getImageData(0,0,1536,864).data;
 for(const [sex,x]of [['male',632],['female',940]]){
  const canvas=createCanvas(1536,864),c=canvas.getContext('2d');drawHero(c,x,590,styleCDefault(sex),previewHero('idle',.2),.2,1/.35,{view:'front'});const pixels=c.getImageData(0,0,1536,864).data;let checked=0,error=0,face=0,costume=0;
  for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]===255){checked++;for(let k=0;k<3;k++)error=Math.max(error,Math.abs(pixels[i+k]-source[i+k]));const y=Math.floor(i/4/1536);if(y>350&&y<420)face++;if(y>440&&y<580)costume++;}
  assert.ok(checked>30000,sex+' opaque source pixels');assert.ok(face>4000&&costume>6000);assert.ok(error<=1,sex+' RGB error '+error);
 }
});
test('source rig retains fixed limb lengths, facial scale and actual default attack contact positions',async()=>{
 const {sourcePose}=await import('../style-c-source.mjs');const {styleCDefault}=await import('../style-c-defaults.mjs');
 for(const sex of ['male','female'])for(const state of PREVIEW_POSES)for(const t of [.01,.09,.15,.29,.6]){
  const l=styleCDefault(sex),h=previewHero(state,t),before=JSON.stringify([l,h]),p=sourcePose(l,h,t);
  for(const kind of ['arms','legs'])for(let i=0;i<2;i++)for(let j=0;j<2;j++)near(Math.hypot(p[kind][i][j+1][0]-p[kind][i][j][0],p[kind][i][j+1][1]-p[kind][i][j][1]),Math.hypot(p.m[kind][i][j+1][0]-p.m[kind][i][j][0],p.m[kind][i][j+1][1]-p.m[kind][i][j][1]));
  assert.equal(JSON.stringify([l,h]),before);assert.equal(p.unitScale,.35);
 }
 for(const sex of ['male','female'])for(const kind of ['punch','kick'])for(let age=ATTACKS[kind].startup+.001;age<ATTACKS[kind].startup+ATTACKS[kind].active;age+=.015){const p=sourcePose(styleCDefault(sex),{...previewHero('idle',0),attack:{kind,age,face:1}},0),point=p[kind==='punch'?'arms':'legs'][0][2];near((point[0]-p.m.origin[0])*.35,kind==='punch'?54:56,.03);near((point[1]-p.m.origin[1])*.35,kind==='punch'?-54:-39,.03);}
});


test('source renderer returns hero-local arm anchors for existing Strength effects',()=>{
 const c=createCanvas(400,400).getContext('2d');for(const look of STYLE_C_SAMPLES){const h=previewHero('strength',.09),p=drawHero(c,150,300,look,h,.09);near(p.arms[0][2][0],54,.03);near(p.arms[0][2][1],-54,.03);assert.ok(p.arms.flat(2).every(v=>Math.abs(v)<150));}
});

test('idle eye and facial edits preserve the source body, hands, legs and cape',async()=>{
 const {styleCDefault}=await import('../style-c-defaults.mjs');
 for(const sex of ['male','female']){
  const look=styleCDefault(sex),x=sex==='male'?632:940;
  const raster=l=>{const canvas=createCanvas(1536,864);drawHero(canvas.getContext('2d'),x,590,l,previewHero('idle',.2),.2,1/.35,{view:'front'});return canvas.getContext('2d').getImageData(0,0,1536,864).data;};
  const before=raster(look);
  for(const patch of [{eyes:'#298cbe'},{nose:'broad'},{mouth:'smile'},{brows:'soft'}]){
   const after=raster({...look,...patch});let faceChanged=0;
   for(let y=250;y<595;y++)for(let xx=sex==='male'?435:778;xx<(sex==='male'?724:1024);xx++){
    const i=(y*1536+xx)*4;
    if(y>=440)for(let k=0;k<4;k++)assert.equal(after[i+k],before[i+k],sex+' body shifted for '+Object.keys(patch)[0]);
    else if(after[i]!==before[i]||after[i+1]!==before[i+1]||after[i+2]!==before[i+2])faceChanged++;
   }
   assert.ok(faceChanged>0,'requested facial selection remains visible');
  }
 }
});

test('both disposable Style C patrols use the normal save rules with eight active choices, one passive and an empty third slot', async () => {
  const {styleCPracticeSnapshot} = await import('./style-c-scenes.mjs');
  for (const presentation of ['male','female']) {
    const save = decodeSave(styleCPracticeSnapshot(presentation));
    assert.equal(save.look.presentation, presentation);
    assert.equal(save.level, 15);
    assert.equal(save.powers.points, 5);
    assert.equal(Object.values(save.powers.levels).filter(n => n === 1).length, 9);
    assert.deepEqual(save.powers.equipped, ['fireball','superKick',null]);
    const game = new Game({save});
    assert.ok(game.canSave());
    assert.equal(game.hero.hp, game.hero.maxHp);
  }
});


test('the normal play renderer reads the packed illustrated keys and composites edited appearances',async()=>{
 const {styleCDefault}=await import('../style-c-defaults.mjs'), c=createCanvas(320,360).getContext('2d');
 for(const sex of ['male','female']){
  const look=styleCDefault(sex), hero=previewHero('run',.18);
  const stock=drawHero(c,125,245,look,hero,.18,1,{view:'game'});
  const custom=drawHero(c,125,245,{...look,hair:'bantu-knots'},hero,.18,1,{view:'game'});
  assert.equal(stock.artSource,'atlas');assert.equal(custom.artSource,'layers');
  assert.equal(stock.clip,'run');assert.equal(custom.frame,stock.frame);
  assert.deepEqual(stock.arms,custom.arms);assert.deepEqual(stock.legs,custom.legs);
  assert.equal(drawHero(c,125,245,look,previewHero('idle',.2),.2,1,{view:'game'}).artSource,'reference');
 }
});
test('an independently equipped emblem takes precedence over a chest’s cosmetic fallback',async()=>{
 const {inventoryFor}=await import('./style-c-final-fixtures.mjs');
 const {EQUIPMENT,equipmentOutfit}=await import('../equipment.mjs');
 const badge=Object.values(EQUIPMENT).find(item=>item.part==='emblem');
 const chest=Object.values(EQUIPMENT).find(item=>item.part==='chest' && item.rarity==='rare');
 const mixed=inventoryFor([badge.id,chest.id]);
 assert.equal(equipmentOutfit(mixed).pieces.emblem.id,badge.id);
 const plain=inventoryFor([chest.id]);assert.equal(equipmentOutfit(plain).pieces.emblem.color,chest.accent);
});
