import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {NEW_HAIR,NEW_FEATURES,EYE_COLORS} from '../../royale/customization/catalog.mjs';
import {checkAppearanceSave} from '../../royale/customization/migration.mjs';
import {UniversalHead,HEAD_BOUNDS,HEAD_ORIGIN} from '../../royale/customization/head.mjs';
import {HAIR_CATALOG} from '../../royale/hair-catalog.mjs';
import {DEFAULT_LOOK,sanitizeLook} from '../../royale/appearance.mjs';
import {Game,decodeSave} from '../../royale/core.mjs';
import {LocalHeroStore,PROFILE_KEY} from '../../royale/saves.mjs';
import {appearanceQuote} from '../../royale/eris.mjs';
import {CostumeEngine} from '../../royale-v3-staging/costumes/engine.mjs';
const options={canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u)),jsonLoader:async u=>JSON.parse(await readFile(u,'utf8'))};
const head=new UniversalHead(options);await head.preload();
const pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
const hash=c=>createHash('sha256').update(pixels(c)).digest('hex');
const oldLook={...DEFAULT_LOOK,version:2,name:'Saved Coast Hero',hair:'long-locs',eyeShape:'almond',brows:'bold',nose:'broad',mouth:'smile',facialHair:'beard',skin:'#67412f',hairColor:'#241a18',eyes:'#30b4c7',suit:'#b92737',cape:false};
test('forty fresh hairstyles and every required feature have distinct visible artwork',()=>{
 for(const sex of ['male','female']){const styles=NEW_HAIR.filter(h=>h.presentation===sex);assert.equal(styles.length,20);assert.equal(new Set(styles.map(h=>hash(head.plate({...DEFAULT_LOOK,hair:h.id}).image))).size,20);}
 const counts={brows:12,eyeShape:16,nose:12,mouth:16,facialHair:16};
 for(const [key,n] of Object.entries(counts)){assert.equal(NEW_FEATURES[key].length,n);assert.equal(new Set(NEW_FEATURES[key].map(c=>hash(head.facePlate({...DEFAULT_LOOK,[key]:c.id}).image))).size,n,key);}
 assert.equal(EYE_COLORS.length,16);assert.equal(new Set(EYE_COLORS.map(c=>c.color)).size,16);
});
test('male and female heads have identical pixels, dimensions and anchors with every face shape',()=>{
 for(const face of ['oval','round','angular'])for(const jaw of [.85,1,1.15]){
  const a=head.facePlate({...DEFAULT_LOOK,hair:'none',face,jaw,presentation:'male'}),b=head.facePlate({...DEFAULT_LOOK,hair:'none',face,jaw,presentation:'female'});
  assert.deepEqual(a.bounds,[...HEAD_BOUNDS]);assert.deepEqual(a.origin,[...HEAD_ORIGIN]);assert.deepEqual(a.bounds,b.bounds);assert.deepEqual(a.origin,b.origin);assert.equal(hash(a.image),hash(b.image));
 }
 assert.equal(new Set(['oval','round','angular'].map(face=>hash(head.facePlate({...DEFAULT_LOOK,face}).image))).size,3);
});
test('all eye shapes accept all sixteen iris colors without moving or recoloring the sclera',()=>{
 for(const shape of NEW_FEATURES.eyeShape){
  const results=EYE_COLORS.map(color=>head.facePlate({...DEFAULT_LOOK,eyeShape:shape.id,eyes:color.color}).image);
  assert.equal(new Set(results.map(hash)).size,16,shape.name);
  const a=pixels(results[0]);for(const result of results.slice(1)){const b=pixels(result);let n=0;
   for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2]){n++;const x=i/4%512,y=Math.floor(i/4/512);assert(x>=208&&x<=344&&y>=210&&y<=254);assert.equal(a[i+3],b[i+3]);}
   assert(n>50,shape.name+' visible iris');
  }
 }
});
test('mixed facial choices keep their neck anchor, stay inside the plate and preserve their input',()=>{
 for(let i=0;i<64;i++){
  const look={...DEFAULT_LOOK,hair:NEW_HAIR[i%40].id,skin:['#eac5a5','#a96943','#38231c'][i%3],hairColor:['#211613','#a34e27','#d8c09a'][i%3]};for(const [key,choices]of Object.entries(NEW_FEATURES))look[key]=choices[i%choices.length].id;
  const before=JSON.stringify(look),p=head.plate(look),d=pixels(p.image);assert.deepEqual(p.origin,[...HEAD_ORIGIN]);assert.equal(JSON.stringify(look),before);
  for(let x=0;x<512;x++)assert.equal(d[x*4+3]+d[((511*512)+x)*4+3],0,'vertical padding');
  for(let y=0;y<512;y++)assert.equal(d[(y*512)*4+3]+d[(y*512+511)*4+3],0,'horizontal padding');
  const c=createCanvas(512,512),ctx=c.getContext('2d');ctx.translate(512,0);ctx.scale(-1,1);ctx.drawImage(p.image,0,0);assert.notEqual(hash(c),hash(p.image),'left/right views');
 }
 assert(head.cache.size<=12);assert(head.faces.size<=12);assert(head.parts.size<=64);
});
test('every legacy hairstyle maps without losing the original appearance or chosen colors',()=>{
 for(const presentation of ['male','female'])for(const hair of ['curls','locs','short','waves','ponytail','braids','none',...HAIR_CATALOG.map(h=>h.id)]){
  const raw={...oldLook,presentation,hair},original=JSON.stringify(raw),next=sanitizeLook(raw);
  assert.equal(JSON.stringify(raw),original);assert.equal(next.version,3);assert(next.hair==='none'||NEW_HAIR.some(h=>h.id===next.hair),hair);assert.deepEqual(next.legacyAppearance,raw);
  for(const key of ['name','skin','hairColor','eyes','suit','trim','cape','capeColor','emblem','emblemColor'])assert.equal(next[key],raw[key]);assert.deepEqual(sanitizeLook(next),next);
 }
});
test('migration preserves every non-appearance field and survives editing, save and reload',()=>{
 const g=new Game();g.hero.level=25;g.hero.xp=81;g.hero.coins=5678;g.powers.data.points=24;const before=JSON.parse(g.save()),baseline=decodeSave(JSON.stringify(before));before.look=oldLook;
 const after=decodeSave(JSON.stringify(before));assert(after);for(const key of Object.keys(baseline).filter(k=>k!=='look'))assert.deepEqual(after[key],baseline[key],key);
 assert.deepEqual(after.look.legacyAppearance,oldLook);const quote=appearanceQuote(after.look,{...after.look,hair:NEW_HAIR[38].id,legacyAppearance:undefined});assert.deepEqual(quote.next.legacyAppearance,oldLook);
 const save=JSON.parse(new Game({save:{...after,look:quote.next}}).save());assert.deepEqual(save.look.legacyAppearance,oldLook);assert.deepEqual(decodeSave(JSON.stringify(save)).look,save.look);
 assert.equal(appearanceQuote(save.look,save.look).changed,false);
});
test('cloud guard rejects stale appearances, lost backups and altered recovery copies',()=>{
 const old={look:oldLook},next={look:sanitizeLook(oldLook)};assert(checkAppearanceSave(old,next).ok);assert(checkAppearanceSave(next,structuredClone(next)).ok);
 for(const look of [oldLook,{...next.look,version:2},{...next.look,legacyAppearance:undefined},{...next.look,legacyAppearance:{...oldLook,hair:'none'}}])assert.equal(checkAppearanceSave(next,{look}).ok,false);
 assert.equal(checkAppearanceSave(next,{}).ok,false);assert.equal(checkAppearanceSave(old,{look:{...next.look,legacyAppearance:undefined}}).ok,false);
 assert(checkAppearanceSave(old,old).ok);assert(checkAppearanceSave(null,{look:DEFAULT_LOOK}).ok);
});
test('two accounts keep separate upgraded looks, backups, progress and purchased clothing on reload',()=>{
 const storages=[0,1].map(()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v))};});
 for(let i=0;i<2;i++){
  const g=new Game(),raw=JSON.parse(g.save());raw.look={...oldLook,name:'Saved Hero '+i,presentation:i?'female':'male',hair:i?'curly-ponytail':'short-locs'};raw.coins=1200+i*700;
  const store=new LocalHeroStore(storages[i]);assert(store.writeSlot(i,raw).ok);const reloaded=new LocalHeroStore(storages[i]),snapshot=reloaded.slot(i).snapshot;
  assert.equal(snapshot.coins,raw.coins);assert.deepEqual(snapshot.look.legacyAppearance,raw.look);assert.deepEqual(snapshot.cosmetics,raw.cosmetics);assert.deepEqual(snapshot.inventory,raw.inventory);assert.equal(snapshot.look.name,raw.look.name);
  const unchanged=storages[i].getItem(PROFILE_KEY);assert.equal(reloaded.writeSlot(i,{...snapshot,look:{...snapshot.look,legacyAppearance:undefined}}).ok,false);assert.equal(storages[i].getItem(PROFILE_KEY),unchanged);
 }
 assert.notEqual(new LocalHeroStore(storages[0]).slot(0).snapshot.look.hair,new LocalHeroStore(storages[1]).slot(1).snapshot.look.hair);
});
test('all repaired costume poses remove magenta markers and keep complete body pixels outside the head',async()=>{
 const engine=new CostumeEngine(options);let checked=0;
 for(const id of ['zombie-costume','black-business-suit','white-business-suit']){
  assert(await engine.preload(id),engine.error);const m=engine.outfits.get(id).manifest;assert.equal(m.frames.length,48);
  for(let i=0;i<48;i++){
   const d=pixels(engine.masks(id,i).body);let body=0,magenta=0;
   for(let p=0;p<d.length;p+=4)if(d[p+3]>96){body++;if(d[p]>70&&d[p+2]>70&&d[p]>d[p+1]*1.5&&d[p+2]>d[p+1]*1.5)magenta++;}
   assert(body>3000,id+' body '+i);assert.equal(magenta,0,id+' marker '+i);assert(m.frames[i].faceAnchor.every(Number.isFinite));checked++;
  }
 }
 assert.equal(checked,144);
});
