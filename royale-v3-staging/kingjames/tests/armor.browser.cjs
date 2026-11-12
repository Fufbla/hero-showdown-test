// An isolated browser-local 0000000000 fixture, never an existing player's save.
const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const origin=process.env.KINGJAMES_TEST_ORIGIN||'http://127.0.0.1:8174';
const fixture=JSON.parse(execFileSync(process.execPath,['--import','./royale-v3-staging/kingjames/tests/register-staging.mjs','--input-type=module','-e',"import {makeHero} from './royale-v3-staging/kingjames/tests/armor-fixture.mjs';console.log(makeHero().save());"],{encoding:'utf8'}));
(async()=>{
 const {OUTFIT_STORAGE_KEY}=await import('../outfit-catalog.mjs');
 const results=[];
 for(const type of [chromium,webkit]){
  const browser=await type.launch({headless:true});
  try{
   const context=await browser.newContext({viewport:type===webkit?{width:844,height:390}:{width:1280,height:900},isMobile:type===webkit,hasTouch:type===webkit});
   await context.addInitScript(({fixture,key})=>{
    if(localStorage.getItem('armor-test-seeded'))return;
    localStorage.setItem('royale-v2-prototype-0000000000:healthia.royale.profiles.v2',JSON.stringify({version:2,revision:1,activeSlot:0,legacyImported:true,slots:[{id:'armor-local-fixture',snapshot:fixture},null,null]}));
    localStorage.setItem(key,'santa-street');localStorage.setItem('armor-test-seeded','1');
   },{fixture,key:OUTFIT_STORAGE_KEY});
   const page=await context.newPage(),errors=[],failed=[],cloud=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url()+': '+r.status());});
   page.on('request',r=>{if(r.url().includes('supabase.co/functions/'))cloud.push(r.url());});
   async function login(){
    await page.goto(origin+'/royale-v3-staging/?spriteQA=1');
    await page.locator('#enter').click();await page.locator('#input').fill('0000000000');await page.locator('#load').click();
    const f=await(await page.locator('#game-frame').elementHandle()).contentFrame();
    await f.waitForFunction(()=>window.kingJamesQA?.status().ready&&document.querySelector('#game').dataset.outfit==='santa-street',null,{timeout:90000});return f;
   }
   let frame=await login();
   const state=()=>frame.evaluate(()=>window.kingJamesQA.status().snapshot);
   const stats=()=>frame.evaluate(async()=>{const {Game,decodeSave}=await import('../../royale/core.mjs');return new Game({save:decodeSave(JSON.stringify(window.kingJamesQA.status().snapshot))}).equipment;});
   await frame.evaluate(()=>window.kingJamesQA.pause());
   const original=await state(),baseStats=await stats();
   await frame.locator('#tree-from-pause').click();await frame.locator('[data-eris="wardrobe"]').click();await frame.locator('[data-wardrobe="owned"]').click();
   assert.match(await frame.locator('#wardrobe-note').innerText(),/stat bonuses only/);
   const preview=()=>frame.locator('#gear-preview').evaluate(c=>c.toDataURL());
   const initialImage=await preview();
   await frame.locator('[data-catalog="drop-1"]').click();await frame.locator('#equip-piece').click();
   assert.deepEqual((await state()).inventory.equipped,{chest:'drop-1',boots:'drop-2'});
   assert.equal((await stats()).fireballLevels,4);assert.equal((await stats()).fireball,4);
   assert.equal(await preview(),initialImage,'Equipping armor changed selected full-body costume');
   assert.match(await frame.locator('#equipped-bonuses').innerText(),/Fireball/);
   await frame.locator('[data-catalog="drop-3"]').click();await frame.locator('#equip-piece').click();
   assert.equal((await stats()).steelLevels,1);assert.equal((await stats()).fireballLevels||0,0);
   assert.equal(await preview(),initialImage,'Replacing armor changed selected full-body costume');
   const equippedStats=await stats();
   await frame.locator('#return-menu').click();
   await frame.getByRole('button',{name:'Try Outfits · 12',exact:true}).click();
   await frame.getByRole('button',{name:'Wear Blossom Kimono',exact:true}).click();
   await frame.waitForFunction(()=>document.querySelector('[data-outfit="blossom-kimono"]').getAttribute('aria-pressed')==='true');
   await frame.getByRole('button',{name:'Play in this outfit',exact:true}).click();
   await frame.waitForFunction(()=>document.querySelector('#game').dataset.outfit==='blossom-kimono');
   assert.deepEqual(await stats(),equippedStats);
   await frame.evaluate(()=>window.kingJamesQA.pause());
   await frame.locator('#tree-from-pause').click();await frame.locator('[data-eris="wardrobe"]').click();await frame.locator('[data-wardrobe="owned"]').click();await frame.locator('[data-catalog="drop-3"]').click();
   const kimono=await preview();assert.notEqual(kimono,initialImage);
   await frame.locator('#equip-piece').click();assert.deepEqual((await state()).inventory.equipped,{});assert.deepEqual(await stats(),baseStats);assert.equal(await preview(),kimono);
   await frame.locator('#equip-piece').click();assert.deepEqual(await stats(),equippedStats);
   await page.screenshot({path:'/tmp/kingjames-armor-'+type.name()+'.png'});
   await frame.locator('#close-tree').click();
   await frame.evaluate(()=>{window.kingJamesQA.resume();window.kingJamesQA.sample({powers:[true,false,false]},1);window.kingJamesQA.pause();});
   await frame.waitForFunction(()=>document.querySelector('#game').dataset.outfit==='steel-universal');
   await frame.evaluate(()=>{window.kingJamesQA.resume();window.kingJamesQA.sample({},620);window.kingJamesQA.pause();});
   await frame.waitForFunction(()=>document.querySelector('#game').dataset.outfit==='blossom-kimono');
   for(const move of [{move:1},{move:-1},{jump:true},{jump:true},{punch:true},{kick:true}])await frame.evaluate(action=>{window.kingJamesQA.resume();window.kingJamesQA.sample(action,1);window.kingJamesQA.sample({},50);window.kingJamesQA.pause();},move);
   await frame.evaluate(()=>{window.kingJamesQA.pause();window.kingJamesQA.save();});
   const saved=await state();assert.deepEqual(saved.inventory.items,original.inventory.items);assert.deepEqual(saved.look,original.look);
   assert.deepEqual(saved.powers.levels,original.powers.levels);assert.deepEqual(saved.cosmetics,original.cosmetics);
   await page.goto(origin+'/royale-v3-staging/?spriteQA=1');await page.locator('#enter').click();await page.locator('#input').fill('0000000000');await page.locator('#load').click();
   frame=await(await page.locator('#game-frame').elementHandle()).contentFrame();
   await frame.waitForFunction(()=>window.kingJamesQA?.status().ready&&document.querySelector('#game').dataset.outfit==='blossom-kimono',null,{timeout:90000});
   for(const key of ['inventory','cosmetics','look'])assert.deepEqual((await state())[key],saved[key]);assert.deepEqual(await stats(),equippedStats);
   assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.deepEqual(cloud,[]);
   results.push({engine:type.name(),equipReplaceUnequip:true,unchangedCostumePixels:true,outfitSwitchPreservesStats:true,steelRestoresCostume:true,localReload:true});
   console.log(type.name()+': armor equip/replace/remove, costume independence, Steel and reload passed');
  }finally{await browser.close();}
 }
 fs.writeFileSync('/tmp/kingjames-armor-browser-results.json',JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
