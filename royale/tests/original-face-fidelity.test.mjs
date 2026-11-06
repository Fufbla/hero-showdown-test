import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
import {prepareStyleCMaterials} from '../style-c-materials.mjs';
import {drawHero} from '../style-c-hero.mjs';
import {drawStyleCFace,STYLE_C_FACE_ANCHORS,styleCFaceStatus} from '../style-c-face.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';
import {LOOK_OPTIONS} from '../appearance.mjs';
import {previewHero} from '../hero-rig.mjs';
import {Game} from '../core.mjs';
import {LocalHeroStore,PROFILE_KEY} from '../saves.mjs';
import {originalFaceBaseline,ORIGINAL_FACE_BASE} from './original-face-baseline.mjs';
import {REVIEW_LOOKS} from './original-face-fixtures.mjs';
const setup={canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u))};
await prepareStyleCMaterials(setup);const baseline=await originalFaceBaseline(setup);after(()=>baseline.close());
const pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
const hash=c=>createHash('sha256').update(pixels(c)).digest('hex');
function face(renderer,look,mode='head',blink=0){
 const {size,origin}=STYLE_C_FACE_ANCHORS[look.presentation],c=createCanvas(size[0]*2,size[1]*2),ctx=c.getContext('2d');ctx.scale(2,2);ctx.translate(-origin[0],-origin[1]);renderer(ctx,look,{mode,blink});return c;
}
function hero(renderer,canvas,look,view,pose='idle',time=.19){
 const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);const result=renderer(c,120,248,look,previewHero(pose,time),time,1.7,{view,poseName:pose});assert.ok(result.head.every(Number.isFinite));return canvas;
}
test('original default faces are pixel-identical, including native hair, ears, eyes and shading',()=>{
 for(const sex of ['male','female'])for(const mode of ['head','native-head','features'])assert.equal(hash(face(drawStyleCFace,styleCDefault(sex),mode)),hash(face(baseline.drawStyleCFace,styleCDefault(sex),mode)),`${sex}/${mode}`);
});
test('all unchanged hairstyles and movement poses retain the original face and body pixels',async()=>{
 const a=createCanvas(240,270),b=createCanvas(240,270);let frames=0;
 for(const sex of ['male','female'])for(const hair of LOOK_OPTIONS.hair.filter(h=>h!=='buzz'))for(const view of ['front','side','back','left'])for(const pose of ['idle','walk','run','jump','fall','punch','kick']){
  const look={...styleCDefault(sex),hair};hero(drawHero,a,look,view,pose);hero(baseline.drawHero,b,look,view,pose);
  assert.equal(hash(a),hash(b),`${sex}/${hair}/${view}/${pose}: original appearance`);frames++;
  if(frames%64===0){await setImmediate();global.gc?.();}
 }
 console.log('Pixel-identical original-art frames:',frames);
});
test('skin correction changes color without changing the head silhouette or original eye placement',()=>{
 for(const sex of ['male','female'])for(const skin of ['#f4e4d4','#ad7047','#2e211c','#328ba9']){
  const look={...styleCDefault(sex),skin},a=pixels(face(drawStyleCFace,look)),b=pixels(face(baseline.drawStyleCFace,look));
  for(let i=3;i<a.length;i+=4)assert.equal(a[i],b[i],'original alpha silhouette');
 }
});
test('erased eyebrows become selected skin instead of retaining orange default-color ghosts',async()=>{
 for(const sex of ['male','female']){
  const im=await loadImage(new URL('../assets/hero/style-c-accurate/face/'+sex+'.png',import.meta.url).pathname),ac=createCanvas(im.width,im.height),ctx=ac.getContext('2d');ctx.drawImage(im,0,0);
  const w=im.width/3,h=im.height/3,material=ctx.getImageData(w*2,0,w,h).data;
  for(const brows of ['soft','straight']){
   const look={...styleCDefault(sex),skin:'#eeeeee',hairColor:'#202020',eyes:'#404040',brows},old=pixels(face(baseline.drawStyleCFace,look)),now=pixels(face(drawStyleCFace,look));let oldWarm=0,newWarm=0;
   for(let i=0;i<now.length;i+=4)if(material[i+2]>127){
    const warm=p=>p[i+3]>100&&p[i]>70&&p[i]-p[i+1]>12&&p[i+1]-p[i+2]>8;
    if(warm(old))oldWarm++;if(warm(now))newWarm++;
   }
   assert.ok(oldWarm>20,'fixture reproduces the original orange eyebrow ghost');assert.equal(newWarm,0,`${sex}/${brows}: no default skin after replacement`);
  }
 }
});
test('facial selections update immediately and returning to the original selection restores identical pixels',()=>{
 for(const sex of ['male','female']){
  const original={...styleCDefault(sex),skin:'#e9ddd0'},snapshot=hash(face(drawStyleCFace,original));
  for(const field of ['eyeShape','brows','nose','mouth','face','jaw','facialHair'])for(const value of field==='jaw'?[.85,1.15]:LOOK_OPTIONS[field]){
   const look=Object.freeze({...original,[field]:value}),saved=JSON.stringify(look);face(drawStyleCFace,look);assert.equal(JSON.stringify(look),saved);assert.equal(hash(face(drawStyleCFace,original)),snapshot);
  }
 }
});
test('explicit right direction selects the existing profile for every hairstyle',()=>{
 const a=createCanvas(240,270),b=createCanvas(240,270);
 for(const sex of ['male','female'])for(const hair of LOOK_OPTIONS.hair){const look={...styleCDefault(sex),hair};assert.equal(hash(hero(drawHero,a,look,'right')),hash(hero(drawHero,b,look,'side')));assert.notEqual(hash(a),hash(hero(drawHero,b,look,'front')));}
});
test('existing saved appearance records and both visible slots are unchanged by rendering; third record remains untouched',()=>{
 const memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)},store=new LocalHeroStore(storage);
 for(const slot of [0,1,2]){const g=new Game();g.look=REVIEW_LOOKS[slot];g.hero.x=145+slot*21;g.hero.hp-=slot*7;store.writeSlot(slot,g.save());}
 const before=storage.getItem(PROFILE_KEY),canvas=createCanvas(240,270);
 for(const slot of [0,1]){const g=new Game({save:store.slot(slot).snapshot});for(const view of ['front','right','back','left'])hero(drawHero,canvas,g.look,view);}
 const reload=new LocalHeroStore(storage);for(const slot of [0,1,2])assert.deepEqual(reload.slot(slot),store.slot(slot));assert.equal(storage.getItem(PROFILE_KEY),before);
 assert.ok(styleCFaceStatus().entries<=styleCFaceStatus().limit);
});
test('approved assets, body/cape art, appearance schema, login, saves, combat and other modes remain untouched',()=>{
 const cwd=fileURLToPath(new URL('../../',import.meta.url));
 const paths=['royale/assets',':(exclude)royale/assets/hero/style-c-accurate/hair/buzz-reference-v2.png','assets','royale/style-c-body.mjs','royale/style-c-source.mjs','royale/style-c-motion.mjs','royale/core.mjs','royale/app.mjs','royale/saves.mjs','royale/appearance.mjs','royale/cape.mjs','royale/equipment.mjs','royale/backend','royale/multiplayer','royale-v3-staging','royale-cloud-test','index.html','story','versus'];
 assert.equal(execFileSync('git',['diff','--name-only',ORIGINAL_FACE_BASE,'--',...paths],{cwd,encoding:'utf8'}).trim(),'');
});
