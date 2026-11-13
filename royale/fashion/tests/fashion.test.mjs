import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {engine,createCanvas,look,pixels,FASHION_OUTFITS} from './helpers.mjs';
import {FASHION_CACHE_LIMIT} from '../engine.mjs';
import {COLLECTION} from '../catalog.mjs';
import {COLLECTION as original} from '../../../royale-v3-staging/costumes/catalog.mjs?fashion-base=1';
import {Game,STEP,decodeSave} from '../../core.mjs';
import {catalogIndex,cosmeticTransaction,cosmeticAppearance} from '../../cosmetics/state.mjs';
import {captureProgress} from '../../local-coop/session.mjs';
import {motionHero} from '../../../royale-v3-staging/costumes/preview.mjs';
import {combatHero,measure,reload} from '../../../royale-v3-staging/kingjames/tests/armor-combat-fixture.mjs';
const e=await engine(),index=catalogIndex({sets:COLLECTION});
const hash=c=>createHash('sha256').update(pixels(c)).digest('hex');
const transact=(g,type,id)=>{
 const r=cosmeticTransaction({state:g.cosmetics,coins:g.hero.coins,index,
  operation:{type,id,revision:g.cosmetics.revision,confirmed:true},safe:true,atWardrobe:true});
 assert(r.ok,r.error);g.cosmetics=r.state;g.hero.coins=r.coins;return r;
};

test('production appends six unique IDs while preserving every original collection entry',()=>{
 assert.equal(original.length,22);assert.equal(COLLECTION.length,28);
 assert.deepEqual(COLLECTION.slice(0,22),original);
 assert.equal(new Set(COLLECTION.map(o=>o.id)).size,28);
 assert.deepEqual(COLLECTION.slice(22).map(o=>o.id),FASHION_OUTFITS.map(o=>o.id));
 for(const o of COLLECTION.slice(22)){assert.equal(o.coinPrice,700);assert.equal(o.hideHair,false);assert.equal(o.pieces[0].category,'fullbody');}
});

test('published manifest registers exactly the production catalog and contains no review/backend files',async()=>{
 const release=JSON.parse(await readFile(new URL('../../../_site/royale/release-manifest.json',import.meta.url)));
 assert.deepEqual(release.costumes,{count:28,ids:COLLECTION.map(o=>o.id),price:700});
 assert.equal(release.modes.onlineMultiplayer,false);
 assert(release.sourceHashes['royale/fashion/engine.mjs']);
 assert(release.sourceHashes['royale/fashion/catalog.mjs']);
 assert(!Object.keys(release.sourceHashes).some(p=>p.includes('/fashion/review/')||p.includes('/fashion/backend-v3/')));
});

test('all 696 poses retain original head/foot geometry and all 17 combat/movement clip timings',async()=>{
 const old=JSON.parse(await readFile(new URL('../../../royale-v3-staging/kingjames/outfits/kingjames-original/manifest.json',import.meta.url)));
 for(const o of FASHION_OUTFITS){
  const m=e.outfits.get(o.id).manifest;assert.equal(m.frames.length,116);
  for(const k of ['cell','foot','worldScale','strideDistance','head','directions'])assert.deepEqual(m[k],old[k],o.id+' '+k);
  for(const [name,clip] of Object.entries(old.animations)){const expected={...clip};delete expected.embeddedImpact;assert.deepEqual(m.animations[name],expected,name);}
  for(let i=0;i<116;i++){assert.deepEqual(m.frames[i].head,old.frames[i].head);assert.deepEqual(m.frames[i].hand,old.frames[i].hand);}
 }
});

test('every pose renders attached to the personalized head, with replaceable skin and fixed clothing',()=>{
 for(const o of FASHION_OUTFITS)for(let i=0;i<116;i++){
  const m=e.outfits.get(o.id).manifest,f=m.frames[i],a=e.frame(o.id,i,look),b=e.frame(o.id,i,{...look,skin:'#e8c497'});
  const ap=pixels(a),bp=pixels(b);let changed=0,unchanged=0,magenta=0;
  for(let p=0;p<ap.length;p+=4)if(ap[p+3]>128){
   if(ap[p]!==bp[p]||ap[p+1]!==bp[p+1]||ap[p+2]!==bp[p+2])changed++;else unchanged++;
   if(ap[p]>160&&ap[p+2]>160&&ap[p+1]<ap[p]*.65&&ap[p+1]<ap[p+2]*.65)magenta++;
  }
  assert(changed>150,o.id+' skin '+i);assert(unchanged>150,o.id+' fabric '+i);
  assert(magenta<12,o.id+' exposed marker '+i+': '+magenta);
  const head=createCanvas(256,256);e.approved.head.draw(head.getContext('2d'),{...look,hair:'none'},f.head,m.head.scale);
  const hp=pixels(head);let overlap=0;
  for(let p=0;p<ap.length;p+=4)if(ap[p+3]>96&&hp[p+3]>96)overlap++;
  assert(overlap>3,o.id+' detached head '+i+': '+overlap);
 }
});

test('clothing preserves all customized faces/hairstyles, whole body silhouette, and bounded caches',()=>{
 const before=hash(e.approved.head.plate(look).image);
 for(const o of FASHION_OUTFITS){
  const body=e.frame(o.id,0,look);
  assert.equal(hash(body),hash(e.frame(o.id,0,{...look,presentation:'male',hair:'ponytail',hairColor:'#f4d395',eyes:'#008833',height:1.2,build:'full',muscle:1})));
  const c=createCanvas(320,360).getContext('2d');
  for(const hair of ['none','short','waves','curls','braids','ponytail']){
   const customized={...look,hair},frozen=JSON.stringify(customized);
   assert(e.draw(c,160,320,customized,motionHero('idle'),0,{id:o.id}));
   assert.equal(JSON.stringify(customized),frozen);assert.equal(e.lastFrame.hairVisible,true);
  }
 }
 assert.equal(hash(e.approved.head.plate(look).image),before);
 assert(e.fashionFrames.size<=FASHION_CACHE_LIMIT);
});

test('Summer Chic toes and arms have no pink marker residue in any of its 116 poses',()=>{
 for(let i=0;i<116;i++){
  const p=pixels(e.frame('summer-chic',i,look));
  for(let k=0;k<p.length;k+=4){
   const [r,g,b,a]=p.subarray(k,k+4);
   assert(!(a>128&&r>100&&b>80&&r>g*1.3&&b>g*1.15),'pink residue in pose '+i);
  }
 }
});

test('each new costume preserves measured armor offense/defense through purchase, reload and removal',()=>{
 const bare=measure(combatHero()),expected=measure(combatHero('shore-ordinary'));
 assert(expected.offense.punch.damage>bare.offense.punch.damage);assert(expected.incoming<bare.incoming);
 for(const o of FASHION_OUTFITS){
  const g=combatHero('shore-ordinary');g.hero.coins=5000;
  const original=structuredClone({look:g.look,inventory:g.inventory,levels:g.powers.data.levels});
  transact(g,'purchase',o.id);transact(g,'equip',o.id);
  assert.equal(g.hero.coins,4300);assert.deepEqual(measure(g),expected);assert.deepEqual(measure(reload(g)),expected);
  transact(g,'unequip');assert.deepEqual(measure(g),expected);
  assert.deepEqual({look:g.look,inventory:g.inventory,levels:g.powers.data.levels},original);
  g.powers.cancelEffects();g.combatTimer=0;g.paused=true;assert(g.equipItem('drop-1'));assert.deepEqual(measure(g),bare);
 }
 console.log(JSON.stringify({fashionOutfits:6,punch:{bare:bare.offense.punch.damage,armored:expected.offense.punch.damage},incoming:{bare:bare.incoming,armored:expected.incoming}}));
});

test('rendering movement and attacks changes no gameplay, collision, power or save state',()=>{
 const a=new Game({look}),b=new Game({save:decodeSave(a.save())}),c=createCanvas(360,360).getContext('2d');
 for(let i=0;i<180;i++){
  const action={move:i<100?1:-1,run:true,jump:[15,30].includes(i),punch:i%35===0,kick:i%53===0};
  a.step(STEP,action);b.step(STEP,action);const before=a.save();
  e.draw(c,180,320,a.look,a.hero,a.time,{id:FASHION_OUTFITS[Math.floor(i/30)].id,owner:a.hero});
  assert.equal(a.save(),before);assert.equal(a.save(),b.save());
 }
});

test('two local players retain separate outfits, customization and progression including Steel Body',()=>{
 const a=new Game({look}),b=new Game({look:{...look,skin:'#e8c497',hair:'ponytail'}});
 a.hero.coins=b.hero.coins=1400;transact(a,'purchase','summer-chic');transact(a,'equip','summer-chic');
 transact(b,'purchase','midnight-glamour');transact(b,'equip','midnight-glamour');
 const before=[a.save(),b.save()],c=createCanvas(600,360).getContext('2d');
 for(const [g,id,x,d] of [[a,'summer-chic',150,1],[b,'midnight-glamour',450,-1]]){
  for(const motion of ['idle','walk','run','jump','doubleJump','punch','kick','strength','superKick','fireball','flight','steel']){
   assert(e.draw(c,x,320,g.look,motionHero(motion,.3,d),2,{id,owner:g.hero}),motion);
   assert.equal(e.lastFrame.direction,d);
  }
  assert.deepEqual(captureProgress(g).cosmetics,g.cosmetics);assert.deepEqual(captureProgress(g).look,g.look);
 }
 assert.deepEqual([a.save(),b.save()],before);
 assert.notDeepEqual(cosmeticAppearance(a.cosmetics),cosmeticAppearance(b.cosmetics));
});
