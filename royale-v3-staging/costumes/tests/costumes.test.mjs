import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {CostumeEngine} from '../engine.mjs';import {COSTUMES,costumeForState} from '../catalog.mjs';import {CostumeOwners} from '../owners.mjs';import {motionHero} from '../preview.mjs';
import {FullBodyAnimator,REQUIRED_STATES} from '../../kingjames/animation.mjs';import {HAIR_STYLES} from '../../../royale/appearance.mjs';import {styleCDefault} from '../../../royale/style-c-defaults.mjs';
import {Game,STEP,decodeSave,ATTACKS} from '../../../royale/core.mjs';import {catalogIndex,cosmeticTransaction,emptyCosmetics,normalizeCosmetics,cosmeticAppearance} from '../../../royale/cosmetics/state.mjs';
import {checkCosmeticSave} from '../../cloud/cosmetics/save-guard.mjs';import {LocalHeroStore} from '../../../royale/saves.mjs';import {captureProgress} from '../../../royale/local-coop/session.mjs';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
const e=new CostumeEngine({canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u)),jsonLoader:async u=>JSON.parse(await readFile(u))});
for(const outfit of COSTUMES)assert.equal(await e.preload(outfit.id),true,e.error);
const look={...styleCDefault('male'),hair:'braids',skin:'#a96943',facialHair:'beard'},digest=image=>createHash('sha256').update(image.getContext('2d').getImageData(0,0,image.width,image.height).data).digest('hex');
const index=catalogIndex({sets:COSTUMES});
function transact(state,coins,type,id){return cosmeticTransaction({state,coins,index,operation:{type,id,confirmed:true,revision:state.revision},safe:true,atWardrobe:true});}
function costumeState(id){const purchase=transact(emptyCosmetics(),10000,'purchase',id);return transact(purchase.state,purchase.coins,'equip',id).state;}
const render=(id,h,who=look,owner={})=>{const c=createCanvas(400,400);assert(e.draw(c.getContext('2d'),200,360,who,h,1,{id,owner,scale:2}));return digest(c);};
test('all ten complete costumes have 480 distinct padded poses and all renderer states',()=>{
 let frames=0;for(const o of COSTUMES){const m=e.outfits.get(o.id).manifest;assert.equal(m.frames.length,48);assert.deepEqual(m.cell,[256,256]);assert.deepEqual(m.foot,[128,230]);
 const hashes=new Set();for(let n=0;n<48;n++){const canvas=e.compose(o.id,n,look);hashes.add(digest(canvas));const d=canvas.getContext('2d').getImageData(0,0,256,256).data;let pixels=0,edge=0;for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(d[(y*256+x)*4+3]>96){pixels++;if(x===0||y===0||x===255||y===255)edge++;}assert(pixels>4000,o.id+' empty '+n);assert.equal(edge,0,o.id+' clipped '+n);frames++;}
 assert.equal(hashes.size,48,o.id);for(const state of [...REQUIRED_STATES,'strength','superKick','fireball','flightStart','hover','fly'])assert(m.animations[state]?.frames.length>=2);}
 console.log(frames+' composed poses verified');
});
test('every hood hides all 49 hairstyle choices across every pose without altering appearance',()=>{
 let combinations=0;for(const o of COSTUMES.filter(o=>o.hideHair))for(let frame=0;frame<48;frame++){
 const bare=e.compose(o.id,frame,{...look,hair:'none'});for(const hair of HAIR_STYLES){const l={...look,hair},before=JSON.stringify(l);assert.strictEqual(e.compose(o.id,frame,l),bare);assert.equal(JSON.stringify(l),before);combinations++;}
 }console.log(combinations+' hood/pose/hairstyle combinations match bald-face composition');
});
test('uncovered costumes retain hair; all costumes retain skin, eyes, face and facial hair',()=>{
 for(const o of COSTUMES){const baseline=digest(e.compose(o.id,0,look));for(const changed of [{skin:'#e5c5a0'},{eyes:'#3399dd',eyeShape:'round'},{nose:'wide',mouth:'smile'},{facialHair:'none'},{presentation:'female'}])assert.notEqual(digest(e.compose(o.id,0,{...look,...changed})),baseline,o.id+' '+JSON.stringify(changed));
 if(!o.hideHair)assert.notEqual(digest(e.compose(o.id,0,{...look,hair:'none'})),baseline,o.id+' lost hair');}
});
test('skin recoloring removes cyan hand markers without tinting the dolphin tail',()=>{
 for(let frame=0;frame<48;frame++){
  const canvas=e.compose('black-business-suit',frame,look),d=canvas.getContext('2d').getImageData(0,0,256,256).data;
  let cyan=0;for(let i=0;i<d.length;i+=4)if(d[i+3]>128&&d[i+1]>100&&d[i+2]>100&&d[i]<Math.min(d[i+1],d[i+2])*.65)cyan++;
  assert(cyan<12,'cyan hand pixels remain in black suit frame '+frame+': '+cyan);
 }
 const loaded=e.outfits.get('dolphin-costume'),f=loaded.manifest.frames[8],source=createCanvas(256,256),c=source.getContext('2d');c.drawImage(loaded.atlas,...f.rect,0,0,256,256);
 const a=c.getImageData(0,0,256,256).data,b=e.compose('dolphin-costume',8,look).getContext('2d').getImageData(0,0,256,256).data;let checked=0;
 for(let y=165;y<220;y++)for(let x=15;x<60;x++){const i=(y*256+x)*4;if(a[i+3]>128&&a[i+2]>a[i]*1.5&&a[i+2]>60){assert.deepEqual([...b.slice(i,i+3)],[...a.slice(i,i+3)],'blue tail changed at '+x+','+y);checked++;}}
 assert(checked>30,'tail check must cover visible blue fabric');
});
test('actual attack timing, both directions, running strides, jump and power states are sampled',()=>{
 for(const o of COSTUMES)for(const direction of [-1,1]){const m=e.outfits.get(o.id).manifest,a=new FullBodyAnimator(m),seen=new Set();for(let t=0;t<1;t+=STEP){const s=a.sample(motionHero('run',t,direction),t);seen.add(s.frameIndex);assert.equal(s.direction,direction);}assert.equal(seen.size,8);
 for(const kind of ['punch','kick','strength','superKick']){const h=motionHero(kind,0,direction),d=ATTACKS[h.attack.kind];h.attack.age=d.startup+.001;const s=a.sample(h,2);assert.equal(s.index,2);assert.equal(s.state,kind);}
 for(const kind of ['jump','doubleJump','fireball','flight','hurt'])assert(e.draw(createCanvas(300,300).getContext('2d'),150,275,look,motionHero(kind,.2,direction),3,{id:o.id,owner:{}}));
 }
});
test('Steel Body completely suppresses all costume, face and hair and restores selection',()=>{
 let metal;for(const o of COSTUMES){const state=costumeState(o.id),before=JSON.stringify(state),h=motionHero('steel',.4);const image=render(o.id,h,{...look,hair:'braids'});if(metal)assert.equal(image,metal);else metal=image;assert.equal(render(o.id,h,{...look,hair:'none',skin:'#fff1dc'}),image);assert.equal(e.lastFrame.outfit,'steel-universal');render(o.id,motionHero('idle',0));assert.equal(e.lastFrame.outfit,o.id);assert.equal(JSON.stringify(state),before);}
});
test('700-coin ownership, duplicate protection, equip and remove survive saved hero reloads',()=>{
 for(const o of COSTUMES){const g=new Game({look});g.hero.coins=10000;const original=structuredClone({look:g.look,inventory:g.inventory,powers:decodeSave(g.save()).powers,hp:g.hero.maxHp});
 const purchase=transact(g.cosmetics,g.hero.coins,'purchase',o.id);assert.equal(purchase.debit,700);assert.equal(purchase.coins,9300);assert.equal(transact(purchase.state,purchase.coins,'purchase',o.id).ok,false);
 const worn=transact(purchase.state,purchase.coins,'equip',o.id);g.cosmetics=worn.state;g.hero.coins=worn.coins;const saved=g.save(),parsed=decodeSave(saved);assert(parsed);assert.deepEqual(parsed.look,original.look);assert.equal(costumeForState(parsed.cosmetics).id,o.id);assert.deepEqual(parsed.inventory,original.inventory);assert.deepEqual(parsed.powers,original.powers);
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};const store=new LocalHeroStore(storage);assert(store.writeSlot(0,JSON.parse(saved),{expectedId:null}).ok);const reload=new LocalHeroStore(storage);assert.equal(costumeForState(reload.slot(0).snapshot.cosmetics).id,o.id);
 const removed=transact(parsed.cosmetics,parsed.coins,'unequip');assert(removed.ok);assert.equal(costumeForState(removed.state),null);assert.equal(parsed.look.hair,look.hair);assert(removed.state.owned.includes(o.id+'.fullbody'));
 const stale=cosmeticTransaction({state:worn.state,coins:9300,index,operation:{type:'unequip',revision:0},safe:true});assert.equal(stale.ok,false);
 }
});
test('cloud policy accepts ownership and rejects incomplete or stale clothing records',()=>{
 for(const o of COSTUMES){const game=new Game({look}),previous=JSON.parse(game.save());previous.coins=1000;const bought=transact(previous.cosmetics,previous.coins,'purchase',o.id),next=structuredClone(previous);next.cosmetics=bought.state;next.coins=bought.coins;
 assert.equal(checkCosmeticSave(previous,next).ok,true,o.id);next.cosmetics.revision=0;assert.equal(checkCosmeticSave(previous,next).ok,false,o.id+' stale revision');}
});
test('independent owners, compact network appearances and co-op snapshots never exchange looks',()=>{
 const owners=new CostumeOwners(),a=owners.get('a'),b=owners.get('b');assert.notStrictEqual(a,b);assert.strictEqual(a,owners.get('a'));owners.retain(['b']);assert.notStrictEqual(a,owners.get('a'));
 const first=new Game({look}),second=new Game({look:{...look,skin:'#e8c497',hair:'ponytail'}});first.cosmetics=costumeState('dolphin-costume');second.cosmetics=costumeState('white-business-suit');
 assert.equal(costumeForState(cosmeticAppearance(first.cosmetics)).id,'dolphin-costume');assert.equal(costumeForState(cosmeticAppearance(second.cosmetics)).id,'white-business-suit');
 assert.notEqual(render('dolphin-costume',motionHero('idle'),first.look,a),render('white-business-suit',motionHero('idle'),second.look,b));assert.deepEqual(captureProgress(first).look,first.look);assert.deepEqual(captureProgress(second).cosmetics,second.cosmetics);
});
test('cosmetic rendering leaves movement, damage, armor, power levels and save data unchanged',()=>{
 const a=new Game({look,random:()=>.4,now:()=>1000}),b=new Game({look,random:()=>.4,now:()=>1000});a.started=b.started=true;const c=createCanvas(300,300).getContext('2d');
 for(let i=0;i<180;i++){const action={move:i<100?1:-1,run:true,jump:[15,30].includes(i),punch:i%35===0,kick:i%53===0};a.step(STEP,action);b.step(STEP,action);const before=a.save();e.draw(c,150,270,a.look,a.hero,a.time,{id:COSTUMES[Math.floor(i/18)].id,owner:a.hero});assert.equal(a.save(),before);assert.equal(a.save(),b.save());}
});
