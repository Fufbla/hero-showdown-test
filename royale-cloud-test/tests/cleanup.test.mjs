import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,STEP,decodeSave} from '../core.mjs';
import {regionSpawns,SPAWNS,TYPES} from '../world.mjs';
import {nearbyInteractions} from '../world-loot.mjs';
import {rewardNotice} from '../reward-notice.mjs';
import {EQUIPMENT} from '../equipment.mjs';
import {assertCleanupSimulation,cleanupCurrent,cleanupBefore} from './cleanup-preservation.mjs';
for(let region=1;region<=7;region++)test(`cleanup region ${region}: each individual elevated platform has its population, unique bounded homes and stable IDs`,()=>{
 const g=new Game();g.travel(region);
 assert.equal(g.enemies.length,84);assert.equal(new Set(g.enemies.map(e=>e.id)).size,84);
 for(const s of g.surfaces.filter(s=>[2,3].includes(s.tier))){
  const enemies=g.enemies.filter(e=>e.spawnSurface.id===s.id);assert.equal(enemies.length,s.tier===2?4:8,s.id);
  assert.equal(new Set(enemies.map(e=>e.x)).size,enemies.length);
  for(const e of enemies){assert.ok(e.x-e.w/2>=s.x&&e.x+e.w/2<=s.x+s.w);assert.equal(e.y,s.y-(e.flying?50:0));}
 }
 const saved=decodeSave(g.save());assert.ok(saved);const restored=new Game({save:saved});assert.equal(restored.enemies.length,84);
 g.travel(region===7?1:region+1);g.travel(region);assert.equal(g.enemies.length,84);
 assert.deepEqual(regionSpawns(1).slice(0,24).map(s=>[s[0],s[2]]),SPAWNS.map(s=>[s[0],s[2]]));
});
test('cleanup old 24-monster saves and new defeated additional monsters round-trip',()=>{
 const g=new Game({random:()=>.99}),e=g.enemies[83];e.protection=0;g.damageEnemy(e,e.maxHp);g.combatTimer=0;
 let save=decodeSave(g.save());assert.ok(save);assert.equal(new Game({save}).enemies[83].state,'dead');
 save.world.monsters=save.world.monsters.filter(e=>e.id<24);assert.ok(decodeSave(JSON.stringify(save)));assert.equal(new Game({save}).enemies.length,84);
});
test('cleanup checkpoints activate once without health/invulnerability, root healing and full-health defeat respawn survive',()=>{
 const g=new Game();g.hero.x=g.camps[1].x;g.hero.hp=40;g.hero.invulnerable=0;g.drain();
 assert.equal(g.activateCheckpoint(),true);assert.equal(g.activateCheckpoint(),false);assert.equal(g.hero.hp,40);assert.equal(g.hero.invulnerable,0);assert.equal(g.drain().filter(e=>e.type==='camp').length,1);
 assert.ok(nearbyInteractions(g).every(t=>t.kind!=='camp'&&!/Rest/.test(t.label)));
 g.enterPortal();assert.equal(g.hero.hp,40);g.healthRoots=1;g.useHealthRoot();assert.ok(g.hero.hp>40);
 g.defeat();for(let i=0;i<100;i++)g.step(STEP);assert.equal(g.hero.hp,g.hero.maxHp);assert.equal(g.hero.x,g.camps[1].x);
});
test('cleanup ordinary defeat awards XP/coins exactly once without a routine notification; rare drops still announce',()=>{
 const g=new Game({random:()=>.99}),e=g.enemies[0],xp=g.hero.xp,coins=g.hero.coins;e.protection=0;g.damageEnemy(e,e.hp);const event=g.drain().find(e=>e.type==='reward');assert.ok(event);assert.equal(g.hero.coins,coins+event.coins);assert.equal(g.hero.xp,xp+event.xp);g.reward(e);assert.equal(g.hero.coins,coins+event.coins);assert.equal(rewardNotice(event,g.loot),null);
 const rare=Object.values(EQUIPMENT).find(x=>x.part==='helmet'&&x.rarity==='rare');assert.equal(rewardNotice({...event,item:true},[{kind:'equipment',x:event.x,y:event.y+12,item:{catalogId:rare.id}}]),rare.name+' dropped');
});
test('cleanup original images, rules and simulation outside targeted checkpoint/spawn changes remain exact',assertCleanupSimulation);
test('cleanup game hair uses the forward head view and rear hair shares its tilt',()=>{
 const s=cleanupCurrent('style-c-source.mjs');assert.ok(s.includes("view==='game'?'front':view"));assert.ok(s.includes("if(layer==='rear')c.rotate(p.headTilt||0)"));assert.ok(s.includes('c.scale(size,size)'));assert.ok(s.includes("p.faceWidth=look.presentation==='male'?90:94"));
 assert.doesNotMatch(cleanupCurrent('environment-art.mjs'),/fillText\(`\$\{s.tier\}/);assert.doesNotMatch(cleanupCurrent('renderer.mjs'),/REST · heal/);
});

import {headwearFit} from '../headwear-fit.mjs';
test('cleanup headwear metadata distinguishes shells, open front crests and reversed profile artwork',()=>{
 assert.equal(headwearFit({setId:'steel-rivet'}).hair,'tucked');
 assert.equal(headwearFit({setId:'shore-ordinary'}).hair,'open');
 assert.equal(headwearFit({setId:'flight-glider'},'front').hair,'open');
 assert.equal(headwearFit({setId:'flight-glider'},'back').hair,'tucked');
 assert.equal(headwearFit({setId:'speed-relay'},'side').mirrorProfile,true);
 assert.equal(headwearFit({setId:'steel-rivet'},'side').mirrorProfile,false);
 for(const item of Object.values(EQUIPMENT).filter(x=>x.part==='helmet'))for(const view of ['front','side','back','left']){
  const fit=headwearFit(item,view);assert.ok(['open','tucked'].includes(fit.hair));assert.ok(fit.width>0&&fit.profileWidth>0&&Number.isFinite(fit.bottom));
 }
});

test('cleanup full production renderer keeps every hairstyle visible and attached through all body builds and combat poses',async()=>{
 const {createCanvas,loadImage}=await import('@napi-rs/canvas');
 const {fileURLToPath}=await import('node:url');
 const {configureStyleC}=await import('../style-c-hero.mjs');
 const {prepareStyleCMaterials}=await import('../style-c-materials.mjs');
 const {prepareHeroMaterials}=await import('../hero-materials.mjs');
 const {runStyleCBrowserChecks}=await import('./style-c-browser.mjs');
 const previous=globalThis.document;globalThis.document={createElement:()=>createCanvas(1,1)};
 try{
  configureStyleC({makeCanvas:createCanvas});const options={canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u))};
  assert.ok(await prepareStyleCMaterials(options));await prepareHeroMaterials(options);
  const result=await runStyleCBrowserChecks(createCanvas);assert.equal(result.passed,true);assert.equal(result.hairstyles,49);assert.equal(result.builds,4);assert.equal(result.presentations,2);assert.ok(result.draws>=1568);
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
