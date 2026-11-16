import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {CostumeEngine} from '../engine.mjs';
import {COLLECTION,costumeHairVisible,costumeForState} from '../catalog.mjs';
import {ROBOT_OUTFIT} from '../definitions.mjs';
import {motionHero} from '../../../royale-v3-staging/costumes/preview.mjs';
import {Game,decodeSave} from '../../core.mjs';
import {catalogIndex,cosmeticTransaction} from '../../cosmetics/state.mjs';
import {checkCosmeticSave} from '../../four-powers/backend-v3/deploy/cloud/cosmetics/save-guard.mjs';
import {LocalSession,captureProgress} from '../../local-coop/session.mjs';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
const options={canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u)),jsonLoader:async u=>JSON.parse(await readFile(u))};
const id=ROBOT_OUTFIT.id,index=catalogIndex({sets:COLLECTION}),costume=COLLECTION.find(o=>o.id===id);
const engine=new CostumeEngine(options);assert(await engine.preload(id),engine.error);
function act(g,type){const r=cosmeticTransaction({state:g.cosmetics,look:g.look,coins:g.hero.coins,index,operation:{type,id,confirmed:true,revision:g.cosmetics.revision},safe:true,atWardrobe:true});assert(r.ok,r.error);g.cosmetics=r.state;g.hero.coins=r.coins;return r;}

test('both presentations claim Flex Bot once with zero coins, retain their appearance and reload ownership',()=>{
 assert.equal(costume.unisex,true);assert.equal(costume.name,'Flex Bot');assert.equal(costume.coinPrice,0);assert.equal(costumeHairVisible(costume),false);
 for(const presentation of ['male','female']){
  const g=new Game({look:{presentation}});g.hero.coins=0;const before=captureProgress(g),look=structuredClone(g.look);
  act(g,'purchase');act(g,'equip');assert.equal(g.hero.coins,0);assert.deepEqual(g.look,look);
  const after=captureProgress(g);assert(checkCosmeticSave(before,after).ok);
  const restored=new Game({save:decodeSave(g.save())});assert.equal(costumeForState(restored.cosmetics,restored.look).id,id);
  act(restored,'unequip');assert.deepEqual(restored.look,look);assert.deepEqual(restored.cosmetics.owned,[id+'.fullbody']);
 }
});

test('previous Robot owners retain Flex Bot without paying again or changing their balance',()=>{
 const g=new Game({look:{presentation:'female'}});g.hero.coins=300;
 g.cosmetics={version:1,revision:2,owned:[id+'.fullbody'],equipped:{fullbody:id+'.fullbody'},visible:true};
 const saved=g.save(),restored=new Game({save:decodeSave(saved)});
 assert.equal(costumeForState(restored.cosmetics,restored.look).name,'Flex Bot');
 const duplicate=cosmeticTransaction({state:restored.cosmetics,look:restored.look,coins:restored.hero.coins,index,operation:{type:'purchase',id,confirmed:true,revision:restored.cosmetics.revision},safe:true,atWardrobe:true});
 assert.equal(duplicate.ok,false);assert.match(duplicate.error,/Already owned/);
 act(restored,'unequip');act(restored,'equip');assert.equal(restored.hero.coins,300);
 assert.deepEqual(restored.cosmetics.owned,[id+'.fullbody']);assert.deepEqual(restored.look,g.look);
});

test('the same complete robot renders identically for both presentations, with distinct authored attacks and horizontal flight',()=>{
 const canvases=[createCanvas(320,320),createCanvas(320,320)],m=engine.outfits.get(id).manifest;
 assert.equal(m.frames.length,24);assert.deepEqual(m.animations.fly.frames,[18,19]);
 for(const f of m.frames){const [x,y,w,h]=f.paintRect;assert(x>=0&&y>=0&&x+w<=256&&y+h<=256,'Pose fits its complete canvas');}
 for(const direction of [-1,1])for(const motion of ['idle','run','jump','doubleJump','punch','kick','strength','superKick','fireball','flight','land','hurt','defeat','steel']){
  for(let n=0;n<2;n++){
   const c=canvases[n].getContext('2d'),hero=motionHero(motion,.48,direction);c.clearRect(0,0,320,320);
   const before=structuredClone(hero),pose=engine.draw(c,160,285,{presentation:n?'female':'male',skin:n?'#ffccaa':'#683f22',hair:n?'long':'none'},hero,.48,{id});
   assert(pose,motion);assert.deepEqual(hero,before);assert.equal(engine.lastFrame.direction,direction);
   assert(c.getImageData(0,0,320,320).data.some((v,i)=>i%4===3&&v>128),motion+' contains art');
  }
  assert.deepEqual(canvases[0].getContext('2d').getImageData(0,0,320,320).data,canvases[1].getContext('2d').getImageData(0,0,320,320).data,motion+' changes by presentation');
 }
 const a=m.frames[m.animations.punch.frames[2]],b=m.frames[m.animations.kick.frames[2]];assert.notDeepEqual(a.sourceRect,b.sourceRect);
 for(const i of m.animations.fly.frames){const r=m.frames[i].sourceRect;assert(r[2]>r[3]*1.4,'Authored horizontal flight');}
});

test('co-op keeps each robot purchase, coin balance and save independent',async()=>{
 const originals=['male','female'].map(presentation=>{const g=new Game({look:{presentation}});g.hero.coins=1000;return captureProgress(g);});
 const saves=[[],[]],profiles=originals.map((snapshot,i)=>({identity:'robot-qa-'+i,slots:[{slot_number:1,snapshot}],async save(slot,snapshot){saves[i].push(snapshot);}}));
 const session=new LocalSession(profiles.map(profile=>({profile,slot:1})));
 act(session.heroes[0].game,'purchase');act(session.heroes[0].game,'equip');
 assert.equal(session.heroes[1].game.hero.coins,1000);assert.deepEqual(session.heroes[1].game.cosmetics.owned,[]);
 act(session.heroes[1].game,'purchase');act(session.heroes[1].game,'equip');await session.saveAll('robot-purchase');
 for(let i=0;i<2;i++){const saved=saves[i].at(-1);assert.equal(saved.coins,1000);assert.equal(saved.cosmetics.equipped.fullbody,id+'.fullbody');assert(checkCosmeticSave(originals[i],saved).ok);}
});

test('failed robot loads report failure and can retry without caching a broken outfit',async()=>{
 let fail=true;const e=new CostumeEngine({...options,jsonLoader:async u=>{if(fail&&u.pathname.includes('robot-costume'))throw Error('offline');return options.jsonLoader(u);}});
 assert.equal(await e.preload(id),false);assert.equal(e.outfits.has(id),false);assert.equal(e.pending.has(id),false);
 fail=false;assert(await e.preload(id),e.error);
});
