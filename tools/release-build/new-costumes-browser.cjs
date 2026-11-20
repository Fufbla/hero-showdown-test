// Browser-local fixtures exercise the actual published sandbox UI. Never sign
// in, contact cloud accounts, or overwrite a normal Hero Royale save.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const base=process.env.ROYALE_COOP_URL||'http://127.0.0.1:8174/hero-showdown-test/royale/local-coop/';
const url=new URL('../../four-powers-test/gameplay/?testAccount=0000000000',base).href;
const output=process.env.NEW_COSTUMES_REVIEW_DIR||'docs/new-costumes-test';fs.mkdirSync(output,{recursive:true});
const report={url,production:false,checks:[],cloudRequests:[],assetFailures:[],errors:[],screenshots:[]};
const prefix='royale-four-powers-0000000000-v1:',sentinel='new-costumes-live-storage-sentinel';
const saveScreenshot=async(page,name)=>{const file=path.join(output,name+'.png');await page.screenshot({path:file,fullPage:true});report.screenshots.push(file);};
async function enterStore(page){
 await page.getByRole('button',{name:'Continue →',exact:true}).click();
 await page.locator('#pause').click();await page.locator('#open-clothing-store').click();
}
async function select(page,outfit){
 await page.getByRole('button',{name:'Preview '+outfit.name,exact:true}).click();
 await page.waitForFunction(id=>document.querySelector('#store-hero').dataset.outfit===id&&document.querySelector('#store-hero').dataset.animating==='true',outfit.id);
 assert.equal(await page.locator('#store-preview-name').innerText(),outfit.name);
}
async function gameplayPose(page,{id,vx,state}){
 const result=await page.evaluate(async({id,vx})=>{
  const api=globalThis.fourPowerReview,g=api.getGame(),renderer=api.getRenderer();
  api.setScreen('play');g.paused=true;
  // Leaving the store restores the desktop header and resizes the opaque
  // game canvas. Let layout and ResizeObserver settle before drawing evidence.
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  renderer.resize();
  // Fix the test hero on its current platform, and sample movement through the
  // same renderer used during normal gameplay. No changes are persisted.
  Object.assign(g.hero,{dead:false,stun:0,attack:null,powerPose:null,steel:false,flying:false,grounded:true,
   vx,vy:0,respawnAge:100,jumpAge:100,castAge:100,landing:0,invulnerable:0,jumps:0});
  g.time+=.05;renderer.draw(g,1,0);g.time+=.65;renderer.draw(g,1,0);
  // Production presentation strips its old canvas diagnostics. The sandbox's
  // read-only review getter observes the actual shared costume engine instead.
  const frame=api.getCostumeFrame();return {id:frame.outfit,state:frame.state,frame:frame.frame};
 },{id,vx});
 assert.equal(result.id,id);assert.equal(result.state,state);
 return result;
}

(async()=>{
 globalThis.location={pathname:new URL(url).pathname,search:'?testAccount=0000000000'};
 const [{Game},{LocalHeroStore,PROFILE_KEY},{createTestSnapshot},{COLLECTION},{canWearOutfit},{NEW_OUTFITS}]=await Promise.all([
  import('../../royale/core.mjs'),import('../../royale/saves.mjs'),import('../../test-only/four-powers/review.mjs'),
  import('../../test-only/four-powers/new-costumes/catalog.mjs'),import('../../royale/cosmetics/eligibility.mjs'),
  import('../../test-only/four-powers/new-costumes/definitions.mjs')
 ]);
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
 try{
  for(const presentation of ['male','female']){
   const viewport=presentation==='male'?{width:1366,height:900}:{width:390,height:844};
   const context=await browser.newContext({viewport});
   try{
    await context.route('**/*.supabase.co/**',route=>{report.cloudRequests.push(route.request().url());return route.abort();});
    const snapshot=createTestSnapshot(presentation==='female'?1:0);
    Object.assign(snapshot.look,{hair:presentation==='female'?'box-braids':'high-top',hairColor:'#753c26',skin:presentation==='female'?'#d5a47f':'#613a25'});
    const hero=new Game({save:snapshot});hero.hero.coins=2100;
    const memory=new Map(),store=new LocalHeroStore({getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)});
    const written=store.writeSlot(0,hero.save());assert(written.ok,written.error);
    await context.addInitScript(({key,value,liveKey,sentinel})=>{
     if(!localStorage.getItem(key))localStorage.setItem(key,value);
     if(!localStorage.getItem(liveKey))localStorage.setItem(liveKey,sentinel);
    },{key:prefix+PROFILE_KEY,value:memory.get(PROFILE_KEY),liveKey:PROFILE_KEY,sentinel});
    const page=await context.newPage();page.setDefaultTimeout(45000);
    page.on('pageerror',error=>report.errors.push(presentation+': '+error.message));
    page.on('response',response=>{if(response.status()>=400&&response.url().includes('/new-costumes/'))report.assetFailures.push(response.status()+' '+response.url());});
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});await enterStore(page);
    await page.waitForFunction(count=>document.querySelectorAll('#costume-carousel .costume-card').length===count,COLLECTION.filter(outfit=>canWearOutfit(outfit,hero.look)).length);
    const balance=async()=>Number((await page.locator('#store-coins').innerText()).replace(/\D/g,''));
    assert.equal(await balance(),10000);
    const read=()=>page.evaluate(({key,liveKey})=>({profile:JSON.parse(localStorage.getItem(key)),live:localStorage.getItem(liveKey)}),{key:prefix+PROFILE_KEY,liveKey:PROFILE_KEY});
    const initial=await read();let expected=10000;
    for(const outfit of NEW_OUTFITS){
     await select(page,outfit);
     for(const [button,direction]of [['#preview-left','-1'],['#preview-right','1']]){
      await page.locator(button).click();await page.waitForFunction(direction=>document.querySelector('#store-hero').dataset.direction===direction,direction);
     }
     await page.getByRole('button',{name:'Buy '+outfit.name,exact:true}).click();
     assert.equal(await page.locator('#purchase-title').innerText(),'Buy '+outfit.name+' for 700 coins?');
     await page.locator('#purchase-buy').click();await page.locator('#costume-confirm').waitFor({state:'hidden'});
     expected-=700;assert.equal(await balance(),expected);await page.locator('#preview-equip').click();
     await page.waitForFunction(()=>document.querySelector('#preview-equip').textContent==='Remove outfit');
     await saveScreenshot(page,presentation+'-'+outfit.id+'-equipped');
     const stored=await read(),row=stored.profile.slots.find(row=>row?.snapshot?.cosmetics?.equipped?.fullbody===outfit.id+'.fullbody');
     assert(row,outfit.id+' did not persist');assert.equal(row.snapshot.coins,expected);assert.deepEqual(row.snapshot.look,hero.look);
     assert.equal(stored.live,sentinel);assert.deepEqual(stored.profile.puppyCoinGrant,initial.profile.puppyCoinGrant);
     await page.reload({waitUntil:'domcontentloaded'});await enterStore(page);await select(page,outfit);
     await page.waitForFunction(()=>document.querySelector('#preview-equip').textContent==='Remove outfit');
     assert.equal(await balance(),expected,'Reload replenished the test wallet');
     assert.equal(await page.getByRole('button',{name:'Buy '+outfit.name,exact:true}).count(),0);
     report.checks.push(presentation+' '+outfit.id+': animated preview both directions; buy for 700; equip; preserve appearance, wallet receipt and live save; reload ownership');
    }
    assert.equal(expected,7200);
    // Check the mobile page after rotating the same browser session.
    if(presentation==='female'){
     await page.setViewportSize({width:844,height:390});
     await page.waitForFunction(()=>document.querySelector('#store-hero').dataset.animating==='true');
     for(const selector of ['#preview-equip','#preview-left','#preview-right'])assert(await page.locator(selector).isVisible(),selector+' is unavailable in landscape');
     const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
     assert.equal(overflow,false,'The landscape store overflows horizontally');
     await saveScreenshot(page,'female-wolf-landscape');report.checks.push('Mobile portrait and landscape retain the store preview and controls');
    }
    report.checks.push({...await gameplayPose(page,{id:'wolf-transformation',vx:120,state:'walk'}),mode:presentation+' wolf upright walk'});
    await saveScreenshot(page,presentation+'-wolf-upright-walk');
    report.checks.push({...await gameplayPose(page,{id:'wolf-transformation',vx:300,state:'run'}),mode:presentation+' wolf four-leg run'});
    await saveScreenshot(page,presentation+'-wolf-four-leg-run');
    // Reopen through normal controls, equip the ghost, and inspect its floating
    // body in the actual world renderer after restoring the gameplay screen.
    await page.locator('#pause').click();await page.locator('#open-clothing-store').click();
    const ghost=NEW_OUTFITS.find(outfit=>outfit.id==='ghost-transformation');await select(page,ghost);await page.locator('#preview-equip').click();
    await page.waitForFunction(()=>document.querySelector('#preview-equip').textContent==='Remove outfit');
    report.checks.push({...await gameplayPose(page,{id:ghost.id,vx:0,state:'idle'}),mode:presentation+' ghost float'});
    await saveScreenshot(page,presentation+'-ghost-floating');
    assert.equal((await read()).live,sentinel);
   }finally{await context.close();}
  }
  // A wrong code must return to the test entry without starting a game.
  const blocked=await browser.newContext();
  try{
   const page=await blocked.newPage();await page.goto(url.replace('0000000000','0000000001'),{waitUntil:'domcontentloaded'});
   await page.waitForURL(value=>value.pathname.endsWith('/four-powers-test/')&&value.searchParams.get('blocked')==='1');
   assert.equal(await page.evaluate(()=>!!globalThis.fourPowerReview),false);report.checks.push('An incorrect test code cannot start the new-costume game');
  }finally{await blocked.close();}
  assert.deepEqual(report.cloudRequests,[]);assert.deepEqual(report.assetFailures,[]);assert.deepEqual(report.errors,[]);
 }finally{await browser.close();}
})().catch(error=>{report.failure=error.stack;process.exitCode=1;}).finally(()=>{
 fs.writeFileSync(path.join(output,'browser.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
});
