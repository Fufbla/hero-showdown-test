// Exercise the normal production code-login, Clothing Store and cloud-save
// bridge. Every account and cloud response lives in this disposable process.
const {chromium}=require('playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const base=process.env.ROYALE_COOP_URL||'http://127.0.0.1:8174/hero-showdown-test/royale/local-coop/';
const url=new URL('../',base).href;
const output='docs/vice-costume-production';fs.mkdirSync(output,{recursive:true});
const report={url,production:true,mockBackend:true,checks:[],requests:[],errors:[],fixtureErrors:[]};
const clone=value=>structuredClone(value),id='vice-costume',piece=id+'.fullbody';
const wallet=async game=>Number((await game.locator('#store-coins').innerText()).replace(/\D/g,''));

async function openStore(page,code){
 // This is the public welcome page, which owns the real intro. Its embedded
 // cloud gameplay opens the roster directly and must not skip a second intro.
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});
 await page.locator('#intro-skip').click();
 await page.locator('#royale-intro').waitFor({state:'detached'});
 await page.locator('#play-game').click();await page.locator('#enter').click();
 await page.locator('#input').fill(code);await page.locator('#load').click();
 const game=page.frameLocator('#game-frame');
 await game.locator('#hero-slots .hero-slot[data-slot="0"]').getByRole('button',{name:'Continue →',exact:true}).click();
 await game.locator('#pause').click();await game.locator('#open-clothing-store').click();
 await game.locator('#costume-carousel [data-outfit="'+id+'"]').waitFor();
 return game;
}

(async()=>{
 await import('./register.mjs');
 const [{Game,decodeSave},{styleCDefault},{COLLECTION},{catalogIndex,cosmeticTransaction},{checkCosmeticSave}]=await Promise.all([
  import('../../royale/core.mjs'),import('../../royale/style-c-defaults.mjs'),import('../../royale/fashion/catalog.mjs'),
  import('../../royale/cosmetics/state.mjs'),import('../../royale/four-powers/backend-v3/deploy/cloud/cosmetics/save-guard.mjs')
 ]);
 const index=catalogIndex({sets:COLLECTION});
 const browser=await chromium.launch({headless:true});
 try{
  for(const presentation of ['male','female']){
   const context=await browser.newContext({viewport:presentation==='male'?{width:1366,height:900}:{width:390,height:844}});
   try{
    const hero=new Game({look:{...styleCDefault(presentation),name:'Vice Cloud QA '+presentation,
     hair:presentation==='female'?'box-braids':'high-top',hairColor:presentation==='female'?'#753c26':'#24212a'}});
    hero.hero.coins=2800;
    for(const [type,outfit]of [['purchase','robot-costume'],['purchase','golden-puppy-costume'],['equip','golden-puppy-costume']]){
     const result=cosmeticTransaction({state:hero.cosmetics,look:hero.look,coins:hero.hero.coins,index,
      operation:{type,id:outfit,confirmed:true,revision:hero.cosmetics.revision},safe:true,atWardrobe:true});
     assert(result.ok,result.error);hero.cosmetics=result.state;hero.hero.coins=result.coins;
    }
    const initial=JSON.parse(hero.save());assert.equal(initial.coins,2100);
    const other=new Game({look:{...styleCDefault('female'),name:'Untouched Other Slot'}});other.hero.coins=567;
    const account={code:presentation==='male'?'9999999901':'9999999902',token:'vice-production-fixture-'+presentation,
     slots:[{slot_number:1,revision:7,snapshot:initial},{slot_number:2,revision:3,snapshot:JSON.parse(other.save())},{slot_number:3,revision:0,snapshot:null}],saves:[]};
    const otherSlots=clone(account.slots.slice(1));
    const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
    await context.route('**/*.supabase.co/**',async route=>{
     try{
      const request=route.request();
      assert.equal(new URL(request.url()).pathname,'/functions/v1/royale-v3-staging','Unexpected cloud service');
      if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
      assert.equal(request.method(),'POST');
      const body=request.postDataJSON();report.requests.push({presentation,action:body.action,slot:body.slot});
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
        else{
         row.snapshot=clone(body.snapshot);row.revision++;row.updated_at=new Date().toISOString();
         account.saves.push(clone(row));result=clone(row);
        }
       }else throw Error('Unexpected cloud action '+body.action);
      }
      await route.fulfill({status,contentType:'application/json',headers,body:JSON.stringify(result)});
     }catch(error){
      report.fixtureErrors.push(presentation+': '+error.message);
      await route.fulfill({status:500,contentType:'application/json',headers,body:JSON.stringify({error:'Fixture rejected unexpected cloud request'})});
     }
    });
    const page=await context.newPage();page.on('pageerror',error=>report.errors.push(presentation+': '+error.message));
    let game=await openStore(page,account.code);
    assert.equal(await game.locator('#costume-carousel .costume-card').count(),presentation==='male'?24:35);
    assert.equal(await wallet(game),2100,'Production receives no reserved test-wallet grant');
    await game.getByRole('button',{name:'Preview Vice Costume',exact:true}).click();
    await game.locator('#store-hero[data-outfit="vice-costume"][data-animating="true"]').waitFor();
    assert.equal(await game.locator('#store-preview-name').innerText(),'Vice Costume');
    for(const [button,direction]of [['#preview-left','-1'],['#preview-right','1']]){
     await game.locator(button).click();await game.locator('#store-hero[data-direction="'+direction+'"]').waitFor();
    }
    await game.getByRole('button',{name:'Buy Vice Costume',exact:true}).click();
    assert.equal(await game.locator('#purchase-title').innerText(),'Buy Vice Costume for 700 coins?');
    await game.locator('#purchase-buy').click();await game.locator('#costume-confirm').waitFor({state:'hidden'});
    assert.equal(await wallet(game),1400);
    assert.equal(account.slots[0].snapshot.coins,1400,'The purchase is acknowledged by the fixture cloud slot');
    assert.equal(account.slots[0].snapshot.cosmetics.equipped.fullbody,'golden-puppy-costume.fullbody','Buying preserves the currently equipped costume');
    await game.locator('#preview-equip').click();
    await game.getByRole('button',{name:'Remove outfit',exact:true}).waitFor();
    const saved=clone(account.slots[0]);
    assert.equal(saved.snapshot.cosmetics.equipped.fullbody,piece);
    assert.equal(saved.snapshot.coins,1400);assert.deepEqual(saved.snapshot.look,initial.look);
    for(const owned of ['robot-costume.fullbody','golden-puppy-costume.fullbody',piece])assert(saved.snapshot.cosmetics.owned.includes(owned),owned);
    assert.deepEqual(account.slots.slice(1),otherSlots);
    assert(account.saves.some(row=>row.snapshot.cosmetics.owned.includes(piece)&&row.snapshot.cosmetics.equipped.fullbody==='golden-puppy-costume.fullbody'),'Purchase and equip use separate durable saves');
    await page.screenshot({path:output+'/'+presentation+'-equipped.png',fullPage:true});
    // A fresh navigation and normal code login restore the server's snapshot.
    // No browser-storage snapshot is used to fabricate a successful reload.
    game=await openStore(page,account.code);
    await game.getByRole('button',{name:'Preview Vice Costume',exact:true}).click();
    await game.getByRole('button',{name:'Remove outfit',exact:true}).waitFor();
    await game.locator('#store-hero[data-outfit="vice-costume"][data-animating="true"]').waitFor();
    assert.equal(await wallet(game),1400,'Reload never refills or charges the wallet');
    assert.equal(await game.getByRole('button',{name:'Buy Vice Costume',exact:true}).count(),0);
    assert.deepEqual(account.slots[0].snapshot.look,initial.look);
    assert.deepEqual(account.slots[0].snapshot.cosmetics,saved.snapshot.cosmetics);
    assert.deepEqual(account.slots.slice(1),otherSlots);
    assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(key=>key.startsWith('royale-four-powers-0000000000-v1:'))),false,'Production never creates reserved test storage');
    report.checks.push({presentation,price:700,walletBefore:2100,walletAfter:1400,
     result:'normal code login, preview both directions, acknowledged purchase, separate equip, server reload, retained appearance/ownership/other slots, no duplicate purchase or test-wallet grant'});
   }finally{await context.close();}
  }
  assert.deepEqual(report.fixtureErrors,[]);assert.deepEqual(report.errors,[]);
 }finally{await browser.close();}
})().catch(error=>{report.failure=error.stack;process.exitCode=1;}).finally(()=>{
 fs.writeFileSync(output+'/browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
});
