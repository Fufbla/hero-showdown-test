import test,{afterEach} from 'node:test';
import {setImmediate} from 'node:timers/promises';
// The native raster stress suite creates thousands of temporary bitmaps.
// --expose-gc lets CI release their native buffers between exhaustive groups.
afterEach(()=>global.gc?.());
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
import {prepareStyleCHead,paintHeadLayer,drawStyleCHead,HEAD_LAYERS,headRegistration,styleCHeadStatus} from '../style-c-head.mjs';
import {prepareStyleCMaterials} from '../style-c-materials.mjs';
import {drawHero} from '../style-c-hero.mjs';
import {styleCHairStatus} from '../style-c-hair.mjs';
import {previewHero} from '../hero-rig.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';
import {LOOK_OPTIONS} from '../appearance.mjs';
import {Game,decodeSave} from '../core.mjs';
import {LocalHeroStore,PROFILE_KEY} from '../saves.mjs';
import {styleCOutfit} from './style-c-scenes.mjs';
import {combatFixture} from './combat-benchmark.mjs';
const BASE='5defeb33c626d19755b26f030b5e7b840f6b4b77';
const hash=b=>createHash('sha256').update(b).digest('hex');
const pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
const digest=c=>hash(pixels(c));
const setup={canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u))};
await prepareStyleCHead(setup);
await prepareStyleCMaterials(setup);
function layer(look,view,name){const c=createCanvas(320,360),ctx=c.getContext('2d');ctx.translate(160,230);ctx.scale(5,5);paintHeadLayer(ctx,look,view,name);return c;}
function head(look,view='front'){const c=createCanvas(320,360),ctx=c.getContext('2d');ctx.translate(160,230);ctx.scale(5,5);drawStyleCHead(ctx,look,{view});return c;}
test('skin and ears have no baked warm pixels, including eyelids and the full scalp',()=>{
 for(const sex of ['male','female'])for(const view of ['front','side','back'])for(const skin of ['#eeeeee','#777777','#222222'])for(const name of ['skin','ears']){
  const p=pixels(layer({...styleCDefault(sex),skin},view,name));let opaque=0;
  for(let i=0;i<p.length;i+=4)if(p[i+3]>250){opaque++;assert.ok(Math.abs(p[i]-p[i+1])<=2&&Math.abs(p[i]-p[i+2])<=7,`${sex}/${view}/${name}: no orange default skin`);}
  assert.ok(opaque>150);
 }
});
test('each facial selection replaces its own layer and cannot change the underlying skin',()=>{
 for(const sex of ['male','female'])for(const view of ['front','side']){
  const base=styleCDefault(sex),skin=digest(layer(base,view,'skin'));
  for(const [field,name]of [['eyeShape','eyes'],['brows','eyebrows'],['nose','nose'],['mouth','mouth'],['facialHair','facialHair']]){
   const variants=LOOK_OPTIONS[field].map(value=>({...base,[field]:value}));
   assert.equal(new Set(variants.map(l=>digest(layer(l,view,name)))).size,variants.length,`${sex}/${view}/${field}: distinct replacement layers`);
   for(const l of variants){assert.equal(digest(layer(l,view,'skin')),skin);head(l,view);}
   assert.equal(digest(head(base,view)),digest(head({...base},view)),'returning to a selection is identical to a fresh draw');
  }
 }
});
test('back view has no facial features or facial hair for any saved selection',()=>{
 const blank=digest(createCanvas(320,360));
 for(const sex of ['male','female'])for(const name of ['eyes','eyebrows','nose','mouth','facialHair'])for(const eyeShape of LOOK_OPTIONS.eyeShape){
  const l={...styleCDefault(sex),eyeShape,mouth:'smile',facialHair:'beard',age:'older'};
  assert.equal(digest(layer(l,'back',name)),blank,`${sex}: no ${name} behind head`);
 }
});
test('jaw changes only the lower contour; scalp, eyes and hair attachment stay fixed',()=>{
 for(const sex of ['male','female'])for(const view of ['front','side']){
  const narrow={...styleCDefault(sex),jaw:.85},wide={...narrow,jaw:1.15},a=pixels(layer(narrow,view,'skin')),b=pixels(layer(wide,view,'skin'));
  assert.notEqual(hash(a),hash(b));
  // Above the eye line the skull/hairline is identical, including its outline.
  assert.equal(hash(a.slice(0,229*320*4)),hash(b.slice(0,229*320*4)));
  assert.equal(digest(layer(narrow,view,'eyes')),digest(layer(wide,view,'eyes')));
  const one=headRegistration(narrow,view),two=headRegistration(wide,view);delete one.jaw;delete two.jaw;assert.deepEqual(one,two);
 }
});
test('skin, iris and hair palettes are independent and input appearances remain unchanged',()=>{
 const l=Object.freeze({...styleCDefault('female'),skin:'#3652cb',eyes:'#56c27e',hairColor:'#a45527'}),copy=JSON.stringify(l);
 for(const view of ['front','side','back']){head(l,view);for(const name of HEAD_LAYERS)layer(l,view,name);}
 assert.equal(JSON.stringify(l),copy);
 const changed={...l,skin:'#2c211d'};assert.notEqual(digest(layer(l,'front','skin')),digest(layer(changed,'front','skin')));
 assert.equal(digest(layer(l,'front','eyebrows')),digest(layer(changed,'front','eyebrows')));
});
function hero(look,view,pose='idle',time=.2,outfit='starter',canvas=null){
 const c=canvas||createCanvas(240,270),ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);
 const result=drawHero(ctx,120,248,look,previewHero(pose,time),time,1.7,{view,poseName:pose,outfit:styleCOutfit(outfit)});
 assert.ok(result.head.every(Number.isFinite));return c;
}
test('right uses the actual profile, and left mirrors the complete head/hair/body together',()=>{
 for(const sex of ['male','female'])for(const hair of ['buzz','short-locs','curly-ponytail','side-part','braided-ponytail']){
  const l={...styleCDefault(sex),hair};const a=hero(l,'side'),b=hero(l,'right'),left=hero(l,'left');
  assert.equal(digest(a),digest(b));assert.notEqual(digest(a),digest(hero(l,'front')));
  const flipped=createCanvas(240,270),c=flipped.getContext('2d');c.translate(240,0);c.scale(-1,1);c.drawImage(left,0,0);
  const x=pixels(a),y=pixels(flipped);let large=0;for(let i=0;i<x.length;i++)if(Math.abs(x[i]-y[i])>6)large++;
  assert.ok(large/x.length<.015,`${sex}/${hair} complete profile reflection`);
 }
});
test('all 48 hairstyles: both characters, all directions, three skin/jaw/face combinations',async()=>{
 let frames=0;const reuse=createCanvas(240,270);
 for(const sex of ['male','female'])for(const hair of LOOK_OPTIONS.hair)for(const [skin,jaw,face]of [['#f0d5bc',.85,'angular'],['#ad7047',1,'oval'],['#2f201d',1.15,'round']])for(const view of ['front','right','back','left']){
  const l={...styleCDefault(sex),hair,skin,jaw,face},before=JSON.stringify(l),c=hero(l,view,'idle',.2,'starter',reuse);
  assert.ok(pixels(c).some((v,i)=>i%4===3&&v>0));assert.equal(JSON.stringify(l),before);frames++;if(frames%96===0)global.gc?.();if(frames%48===0){await setImmediate();global.gc?.();}
 }
 console.log('Hair/skin/jaw/direction renders:',frames);global.gc?.();
});
test('hair stays on the same head transform through every animation and all directions',async()=>{
 let count=0;const canvas=createCanvas(160,180),ctx=canvas.getContext('2d'),transforms=[];
 const original=ctx.drawImage.bind(ctx);ctx.drawImage=(image,...args)=>{if(image.width===325&&image.height===350){const m=ctx.getTransform();transforms.push([m.a,m.b,m.c,m.d,m.e,m.f]);}original(image,...args);};
 for(const sex of ['male','female'])for(const hair of LOOK_OPTIONS.hair)for(const view of ['front','right','back','left'])for(const pose of ['idle','walk','run','jump','double-jump','fall','punch','kick','strength','superKick','fireball','flight']){
  const l={...styleCDefault(sex),hair};transforms.length=0;ctx.clearRect(0,0,160,180);
  drawHero(ctx,80,168,l,previewHero(pose,.19),.19,1.1,{view,poseName:pose});
  assert.equal(transforms.length,2,'head and accessories drawn once each');assert.deepEqual(transforms[0],transforms[1],'facial layers share one animated head attachment');count++;if(count%96===0){await setImmediate();global.gc?.();}
 }
 console.log('Animated hairstyle/direction frames:',count);global.gc?.();
});
test('headwear and retained costumes draw with every view and jaw size',()=>{
 global.gc?.();
 for(const sex of ['male','female'])for(const jaw of [.85,1,1.15])for(const view of ['front','right','back','left'])for(const outfit of ['ordinary','rare','merge:venomis']){
  const l={...styleCDefault(sex),jaw};assert.ok(pixels(hero(l,view,'punch',.2,outfit)).some(v=>v));
 }
});
test('both existing hero slots retain all appearance, gear, powers and exact position after rendering and reload',()=>{
 const memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)},store=new LocalHeroStore(storage);
 for(const slot of [0,1,2]){const g=combatFixture([14,90,30][slot]);g.look={...styleCDefault(slot===0?'female':'male'),skin:['#eee1d4','#412b22','#338ab0'][slot],hair:slot===0?'buzz':'short-locs',jaw:.85,eyeShape:'round',mouth:'full',brows:'straight',facialHair:slot?'beard':'none'};g.hero.x=163+slot*8;g.hero.hp-=19;store.writeSlot(slot,g.save());}
 const before=storage.getItem(PROFILE_KEY);
 for(const slot of [0,1]){const snapshot=store.slot(slot).snapshot,g=new Game({save:snapshot});for(const view of ['front','right','back','left'])hero(g.look,view,'run');assert.deepEqual(decodeSave(g.save()).look,snapshot.look);}
 const reloaded=new LocalHeroStore(storage);for(const slot of [0,1,2])assert.deepEqual(reloaded.slot(slot),store.slot(slot));assert.equal(storage.getItem(PROFILE_KEY),before);
});
test('bounded caches and warm-frame rendering do not allocate a new head bitmap per tick',()=>{
 const l=styleCDefault('female');head(l);const before=styleCHeadStatus().entries;for(let i=0;i<100;i++)head(l);assert.equal(styleCHeadStatus().entries,before);
 assert.ok(styleCHeadStatus().entries<=styleCHeadStatus().limit);assert.ok(styleCHairStatus().materials<=styleCHairStatus().limit);
 const reuse=createCanvas(240,270);const start=performance.now();for(let i=0;i<240;i++)hero(l,'front','run',i/60,'starter',reuse);const ms=(performance.now()-start)/240;console.log('Native canvas warm hero frame, ms:',ms.toFixed(3));assert.ok(ms<16,'render stays under one 60Hz frame on the test runtime');
});
test('approved assets, account/save systems, combat, loot and unrelated modes are byte-identical to release',()=>{
 const cwd=fileURLToPath(new URL('../../',import.meta.url));
 const paths=['royale/assets','assets','royale/backend','royale/multiplayer','royale/core.mjs','royale/app.mjs','royale/saves.mjs','royale/appearance.mjs','royale/cape.mjs','royale/combat-tuning.mjs','royale/powers.mjs','royale/equipment.mjs','royale/progression.mjs','royale/helmet-rolls.mjs','royale/loot.mjs','royale-v3-staging','index.html','story','versus'];
 assert.equal(execFileSync('git',['diff','--name-only',BASE,'--',...paths],{cwd,encoding:'utf8'}).trim(),'');
 const app=readFileSync(new URL('../app.mjs',import.meta.url),'utf8');assert.ok(app.includes('setInterval(sendCodeProgress,8000)'));
});
