// Exercise Vice through the isolated test UI. Fresh browser contexts only;
// every cloud endpoint is blocked, and ordinary live storage is a sentinel.
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const base=process.env.ROYALE_COOP_URL||'http://127.0.0.1:8174/hero-showdown-test/royale/local-coop/';
const url=new URL('../../four-powers-test/gameplay/?testAccount=0000000000',base).href;
const output='docs/vice-costume-test';fs.mkdirSync(output,{recursive:true});
const report={url,production:false,checks:[],cloudRequests:[],errors:[]};
const prefix='royale-four-powers-0000000000-v1:';
async function enter(page){
 // The reserved test entry prepares art and opens the roster directly. It
 // deliberately has no production intro overlay or Skip Intro button.
 await page.getByRole('button',{name:'Continue →',exact:true}).click();
 await page.locator('#pause').click();
 await page.locator('#open-clothing-store').click();
}
(async()=>{
 globalThis.location={pathname:new URL(url).pathname,search:'?testAccount=0000000000'};
 const [{Game},{LocalHeroStore,PROFILE_KEY},{createTestSnapshot},{COLLECTION},{canWearOutfit}]=await Promise.all([
  import('../../royale/core.mjs'),import('../../royale/saves.mjs'),import('../../test-only/four-powers/review.mjs'),
  import('../../test-only/four-powers/new-costumes/catalog.mjs'),import('../../royale/cosmetics/eligibility.mjs')
 ]);
 const browser=await chromium.launch({headless:true});
 try{
  for(const presentation of ['male','female']){
   const context=await browser.newContext({viewport:presentation==='male'?{width:1366,height:900}:{width:390,height:844}});
   try{
    await context.route('**/*.supabase.co/**',route=>{report.cloudRequests.push(route.request().url());return route.abort();});
    const snapshot=createTestSnapshot(presentation==='female'?1:0);
    snapshot.look.hair=presentation==='female'?'box-braids':'high-top';
    snapshot.look.hairColor=presentation==='female'?'#753c26':'#24212a';
    const hero=new Game({save:snapshot});
    hero.hero.coins=2100;
    const memory=new Map(),store=new LocalHeroStore({getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)});
    const stored=store.writeSlot(0,hero.save());assert(stored.ok,stored.error);
    await context.addInitScript(({key,value,liveKey})=>{
     if(!localStorage.getItem(key))localStorage.setItem(key,value);
     if(!localStorage.getItem(liveKey))localStorage.setItem(liveKey,'vice-live-storage-sentinel');
    },{key:prefix+PROFILE_KEY,value:memory.get(PROFILE_KEY),liveKey:PROFILE_KEY});
    const page=await context.newPage();page.on('pageerror',error=>report.errors.push(presentation+': '+error.message));
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});
    await enter(page);
    await page.waitForFunction(count=>document.querySelectorAll('#costume-carousel .costume-card').length===count,COLLECTION.filter(outfit=>canWearOutfit(outfit,hero.look)).length);
    assert.equal(Number((await page.locator('#store-coins').innerText()).replace(/\D/g,'')),10000,'The existing one-time test grant funds the fresh fixture');
    await page.getByRole('button',{name:'Preview Vice Costume',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#store-hero').dataset.outfit==='vice-costume'&&document.querySelector('#store-hero').dataset.animating==='true');
    assert.equal(await page.locator('#store-preview-name').innerText(),'Vice Costume');
    await page.locator('#preview-left').click();
    await page.waitForFunction(()=>document.querySelector('#store-hero').dataset.direction==='-1');
    await page.screenshot({path:output+'/'+presentation+'-left.png',fullPage:true});
    await page.locator('#preview-right').click();
    await page.waitForFunction(()=>document.querySelector('#store-hero').dataset.direction==='1');
    await page.getByRole('button',{name:'Buy Vice Costume',exact:true}).click();
    assert.equal(await page.locator('#purchase-title').innerText(),'Buy Vice Costume for 700 coins?');
    await page.locator('#purchase-buy').click();await page.locator('#costume-confirm').waitFor({state:'hidden'});
    assert.equal(Number((await page.locator('#store-coins').innerText()).replace(/\D/g,'')),9300);
    await page.locator('#preview-equip').click();
    await page.waitForFunction(()=>document.querySelector('#preview-equip').textContent==='Remove outfit');
    await page.screenshot({path:output+'/'+presentation+'-equipped.png',fullPage:true});
    const read=()=>page.evaluate(({key,liveKey})=>({profile:JSON.parse(localStorage.getItem(key)),live:localStorage.getItem(liveKey)}),{key:prefix+PROFILE_KEY,liveKey:PROFILE_KEY});
    const before=await read(),owned=before.profile.slots.find(row=>row?.snapshot?.cosmetics?.equipped?.fullbody==='vice-costume.fullbody');
    assert(owned,'The normal UI persisted Vice ownership and equipped state');
    assert.equal(owned.snapshot.coins,9300);assert.deepEqual(owned.snapshot.look,hero.look);
    assert.equal(before.live,'vice-live-storage-sentinel');
    await page.reload({waitUntil:'domcontentloaded'});await enter(page);
    await page.getByRole('button',{name:'Preview Vice Costume',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#preview-equip').textContent==='Remove outfit'&&document.querySelector('#store-hero').dataset.animating==='true');
    assert.equal(Number((await page.locator('#store-coins').innerText()).replace(/\D/g,'')),9300,'Reload does not replenish the test wallet');
    const after=await read();assert.equal(after.live,before.live);assert.deepEqual(after.profile.puppyCoinGrant,before.profile.puppyCoinGrant);
    assert.equal(await page.getByRole('button',{name:'Buy Vice Costume',exact:true}).count(),0,'An owned costume is not offered for repurchase');
    report.checks.push(presentation+': preview both directions, buy for 700, equip, preserve appearance, reload ownership and 9300 balance, keep live storage untouched');
   }finally{await context.close();}
  }
  assert.deepEqual(report.cloudRequests,[],'The reserved test never contacts cloud accounts');
  assert.deepEqual(report.errors,[],'No browser exceptions while rendering the test costume');
 }finally{await browser.close();}
})().catch(error=>{report.failure=error.stack;process.exitCode=1;}).finally(()=>{
 fs.writeFileSync(output+'/browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
});
