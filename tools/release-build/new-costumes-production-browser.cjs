// Use the ordinary production welcome/code/store flow with a disposable,
// revision-aware cloud fixture. Every cloud request is intercepted; no live
// account is created, read, or written by this browser verification.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.ROYALE_COOP_URL||'http://127.0.0.1:8174/hero-showdown-test/royale/local-coop/';
const url=new URL('../',base).href;
const output=process.env.NEW_COSTUMES_PRODUCTION_REVIEW_DIR||'docs/new-costumes-production';fs.mkdirSync(output,{recursive:true});
const report={url,production:true,mockBackend:true,checks:[],requests:[],errors:[],fixtureErrors:[],assetFailures:[],screenshots:[]};
const clone=value=>structuredClone(value),wallet=async game=>Number((await game.locator('#store-coins').innerText()).replace(/\D/g,''));
async function shot(page,name){const file=path.join(output,name+'.png');await page.screenshot({path:file,fullPage:true});report.screenshots.push(file);}
async function openStore(page,code){
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});
 await page.locator('#intro-skip').click();await page.locator('#royale-intro').waitFor({state:'detached'});
 await page.locator('#play-game').click();await page.locator('#enter').click();await page.locator('#input').fill(code);await page.locator('#load').click();
 const game=page.frameLocator('#game-frame');
 await game.locator('#hero-slots .hero-slot[data-slot="0"]').getByRole('button',{name:'Continue →',exact:true}).click();
 await game.locator('#pause').click();await game.locator('#open-clothing-store').click();
 await game.locator('#costume-carousel [data-outfit="mailman-costume"]').waitFor();return game;
}
async function select(game,outfit){
 await game.getByRole('button',{name:'Preview '+outfit.name,exact:true}).click();
 await game.locator('#store-hero[data-outfit="'+outfit.id+'"][data-animating="true"]').waitFor();
 assert.equal(await game.locator('#store-preview-name').innerText(),outfit.name);
}
async function resumeWorld(page,game){
 await game.locator('#store-back').click();await game.getByRole('button',{name:'‹ Back to Game',exact:true}).click();
 // Return through the normal controls and wait for painted pixels after the
 // desktop header/layout resize. Production exposes no mutable review bridge.
 await page.waitForFunction(()=>{
  const c=document.querySelector('#game-frame')?.contentDocument?.querySelector('#game');if(!c||!c.width||!c.height)return false;
  const pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let samples=0,colored=0;
  for(let i=0;i<pixels.length;i+=4000){samples++;if(pixels[i]+pixels[i+1]+pixels[i+2]>30)colored++;}
  return samples>0&&colored>samples*.1;
 });
 await game.locator('#game').click();
}

(async()=>{
 await import('./register.mjs');
 const [{Game,decodeSave},{styleCDefault},{COLLECTION},{NEW_OUTFITS},{canWearOutfit},{catalogIndex,cosmeticTransaction},{checkCosmeticSave}]=await Promise.all([
  import('../../royale/core.mjs'),import('../../royale/style-c-defaults.mjs'),import('../../royale/fashion/catalog.mjs'),
  import('../../royale/fashion/new-costumes/definitions.mjs'),import('../../royale/cosmetics/eligibility.mjs'),
  import('../../royale/cosmetics/state.mjs'),import('../../royale/four-powers/backend-v3/deploy/cloud/cosmetics/save-guard.mjs')
 ]);
 const index=catalogIndex({sets:COLLECTION}),browser=await chromium.launch({headless:true});
 try{
  for(const presentation of ['male','female']){
   const context=await browser.newContext({viewport:presentation==='male'?{width:1366,height:900}:{width:390,height:844}});
   try{
    const hero=new Game({look:{...styleCDefault(presentation),name:'Costume Cloud QA '+presentation,
     skin:presentation==='male'?'#613a25':'#d5a47f',hair:presentation==='male'?'high-top':'box-braids',hairColor:'#753c26'}});
    hero.hero.coins=4900;
    for(const [type,id]of [['purchase','robot-costume'],['purchase','golden-puppy-costume'],['purchase','vice-costume'],['equip','vice-costume']]){
     const result=cosmeticTransaction({state:hero.cosmetics,look:hero.look,coins:hero.hero.coins,index,
      operation:{type,id,confirmed:true,revision:hero.cosmetics.revision},safe:true,atWardrobe:true});
     assert(result.ok,result.error);hero.cosmetics=result.state;hero.hero.coins=result.coins;
    }
    const initial=JSON.parse(hero.save());assert.equal(initial.coins,3500);
    const other=new Game({look:{...styleCDefault('female'),name:'Untouched Other Slot'}});other.hero.coins=567;
    const account={code:presentation==='male'?'9999999911':'9999999912',token:'costume-production-fixture-'+presentation,
     slots:[{slot_number:1,revision:7,snapshot:initial},{slot_number:2,revision:3,snapshot:JSON.parse(other.save())},{slot_number:3,revision:0,snapshot:null}],saves:[]};
    const otherSlots=clone(account.slots.slice(1)),loadedAssets=new Set();
    const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
    await context.route('**/*.supabase.co/**',async route=>{
     try{
      const request=route.request();assert.equal(new URL(request.url()).pathname,'/functions/v1/royale-v3-staging','Unexpected cloud service');
      if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
      assert.equal(request.method(),'POST');const body=request.postDataJSON();report.requests.push({presentation,action:body.action,slot:body.slot});
      let status=200,result;
      if(body.action==='verify'){
       assert.equal(body.code,account.code);result={access:account.token,refresh:account.token};
      }else{
       assert.equal(request.headers().authorization,'Bearer '+account.token,'Fixture authorization is required');
       if(body.action==='slots')result={slots:clone(account.slots)};
       else if(body.action==='save'){
        assert.equal(body.slot,1,'No other saved hero may be written');
        const row=account.slots[0],guard=checkCosmeticSave(row.snapshot,body.snapshot);
        if(body.revision!==row.revision){status=409;result={error:'Revision conflict'};}
        else if(!decodeSave(JSON.stringify(body.snapshot))||!guard.ok){status=409;result={error:guard.error||'Invalid snapshot'};}
        else{row.snapshot=clone(body.snapshot);row.revision++;row.updated_at=new Date().toISOString();account.saves.push(clone(row));result=clone(row);}
       }else throw Error('Unexpected cloud action '+body.action);
      }
      await route.fulfill({status,contentType:'application/json',headers,body:JSON.stringify(result)});
     }catch(error){
      report.fixtureErrors.push(presentation+': '+error.message);
      await route.fulfill({status:500,contentType:'application/json',headers,body:JSON.stringify({error:'Fixture rejected unexpected cloud request'})});
     }
    });
    const page=await context.newPage();page.setDefaultTimeout(45000);
    page.on('pageerror',error=>report.errors.push(presentation+': '+error.message));
    page.on('response',response=>{
     if(response.url().includes('/new-costumes/')){
      if(response.status()>=400)report.assetFailures.push(response.status()+' '+response.url());
      else loadedAssets.add(new URL(response.url()).pathname);
     }
    });
    let game=await openStore(page,account.code),expected=3500;
    assert.equal(await game.locator('#costume-carousel .costume-card').count(),COLLECTION.filter(outfit=>canWearOutfit(outfit,hero.look)).length);
    assert.equal(await wallet(game),expected,'Production receives no reserved test-wallet grant');
    for(const outfit of NEW_OUTFITS){
     await select(game,outfit);
     for(const [button,direction]of [['#preview-left','-1'],['#preview-right','1']]){
      await game.locator(button).click();await game.locator('#store-hero[data-direction="'+direction+'"]').waitFor();
     }
     const worn=clone(account.slots[0].snapshot.cosmetics.equipped);
     await game.getByRole('button',{name:'Buy '+outfit.name,exact:true}).click();
     assert.equal(await game.locator('#purchase-title').innerText(),'Buy '+outfit.name+' for 700 coins?');
     await game.locator('#purchase-buy').click();await game.locator('#costume-confirm').waitFor({state:'hidden'});expected-=700;
     assert.equal(await wallet(game),expected);assert.equal(account.slots[0].snapshot.coins,expected);
     assert.deepEqual(account.slots[0].snapshot.cosmetics.equipped,worn,'Buying preserves the currently equipped costume');
     assert(account.saves.some(row=>row.snapshot.cosmetics.owned.includes(outfit.id+'.fullbody')&&JSON.stringify(row.snapshot.cosmetics.equipped)===JSON.stringify(worn)),'Purchase must be durably acknowledged before equip');
     await game.locator('#preview-equip').click();await game.getByRole('button',{name:'Remove outfit',exact:true}).waitFor();
     const saved=clone(account.slots[0].snapshot);
     assert.equal(saved.cosmetics.equipped.fullbody,outfit.id+'.fullbody');assert.equal(saved.coins,expected);assert.deepEqual(saved.look,initial.look);
     for(const owned of ['robot-costume.fullbody','golden-puppy-costume.fullbody','vice-costume.fullbody',outfit.id+'.fullbody'])assert(saved.cosmetics.owned.includes(owned),owned);
     assert.deepEqual(account.slots.slice(1),otherSlots);
     await shot(page,presentation+'-'+outfit.id+'-equipped');
     // Reload from the mock server's acknowledged snapshot using the public
     // code login, never a fabricated browser-storage replacement snapshot.
     game=await openStore(page,account.code);await select(game,outfit);await game.getByRole('button',{name:'Remove outfit',exact:true}).waitFor();
     assert.equal(await wallet(game),expected);assert.equal(await game.getByRole('button',{name:'Buy '+outfit.name,exact:true}).count(),0);
     assert.deepEqual(account.slots[0].snapshot.look,initial.look);assert.deepEqual(account.slots[0].snapshot.cosmetics,saved.cosmetics);
     assert.deepEqual(account.slots.slice(1),otherSlots);
     report.checks.push({presentation,id:outfit.id,price:700,walletAfter:expected,
      result:'normal code login, preview both directions, acknowledged purchase, separate equip, server reload, preserved appearance/earlier ownership/other slots'});
    }
    assert.equal(expected,700);
    if(presentation==='female'){
     await page.setViewportSize({width:844,height:390});await game.locator('#store-hero[data-animating="true"]').waitFor();
     for(const selector of ['#preview-left','#preview-right','#preview-equip'])assert(await game.locator(selector).isVisible(),selector);
     assert.equal(await game.locator('html').evaluate(el=>el.scrollWidth>innerWidth+2),false);
     await shot(page,'female-wolf-landscape');report.checks.push('Portrait and landscape production store keeps preview, direction and equip controls available');
    }
    // The sandbox verifies exact animator state; these production screenshots
    // additionally exercise actual keyboard controls through the ordinary UI.
    await resumeWorld(page,game);
    await page.keyboard.down('ArrowRight');await page.waitForTimeout(320);await shot(page,presentation+'-wolf-upright-walk');
    await page.keyboard.down('Shift');await page.waitForTimeout(320);await shot(page,presentation+'-wolf-four-leg-run');
    await page.keyboard.up('Shift');await page.keyboard.up('ArrowRight');
    await game.locator('#pause').click();await game.locator('#open-clothing-store').click();
    const ghost=NEW_OUTFITS.find(outfit=>outfit.id==='ghost-transformation');await select(game,ghost);await game.locator('#preview-equip').click();
    await game.getByRole('button',{name:'Remove outfit',exact:true}).waitFor();await resumeWorld(page,game);await shot(page,presentation+'-ghost-floating');
    report.checks.push(presentation+': real production world captures use keyboard walk/run and the equipped floating ghost');
    for(const outfit of NEW_OUTFITS)for(const file of ['manifest.json','body.webp'])assert([...loadedAssets].some(asset=>asset.endsWith('/royale/fashion/new-costumes/assets/'+outfit.id+'/'+file)),outfit.id+' '+file+' was not loaded from production');
    assert.deepEqual(account.slots.slice(1),otherSlots);
    assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(key=>key.startsWith('royale-four-powers-0000000000-v1:'))),false);
    assert.equal(await game.locator('html').evaluate(()=>typeof globalThis.fourPowerReview),'undefined','Production exposes no reserved review bridge');
   }finally{await context.close();}
  }
  assert.deepEqual(report.fixtureErrors,[]);assert.deepEqual(report.errors,[]);assert.deepEqual(report.assetFailures,[]);report.passed=true;
 }finally{await browser.close();}
})().catch(error=>{report.failure=error.stack;process.exitCode=1;}).finally(()=>{
 fs.writeFileSync(path.join(output,'browser.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
});
