// Exercise all approved outfits through the reserved-code wardrobe UI.
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const origin=process.env.KINGJAMES_TEST_ORIGIN||'http://127.0.0.1:8174';
const report=[];
(async()=>{
 const {APPROVED_OUTFITS,OUTFIT_STORAGE_KEY}=await import('../outfit-catalog.mjs');
 for(const [type,viewport]of [[chromium,{width:1280,height:900}],[webkit,{width:390,height:844}]]){
  const browser=await type.launch({headless:true});
  try{
   const context=await browser.newContext({viewport,isMobile:type===webkit,hasTouch:type===webkit});
   const page=await context.newPage(),errors=[],cloud=[],failed=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('request',r=>{if(r.url().includes('supabase.co/functions/'))cloud.push(r.url());});
   page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
   async function login(){
    await page.goto(origin+'/royale-v3-staging/?spriteQA=1');
    await page.locator('#enter').click();await page.locator('#input').fill('0000000000');await page.locator('#load').click();
    const frame=await(await page.locator('#game-frame').elementHandle()).contentFrame();
    await frame.waitForFunction(()=>window.kingJamesQA?.status().ready&&document.querySelector('#game').dataset.outfit,null,{timeout:90000});
    return frame;
   }
   let frame=await login();
   for(const outfit of APPROVED_OUTFITS){
    await frame.evaluate(()=>window.kingJamesQA.pause());
    const before=await frame.evaluate(()=>window.kingJamesQA.status().snapshot);
    await frame.getByRole('button',{name:'Try Outfits · 12',exact:true}).click();
    assert.equal(await frame.locator('.outfit-card').count(),13);
    await frame.getByRole('button',{name:'Wear '+outfit.label,exact:true}).click();
    await frame.waitForFunction(id=>document.querySelector('[data-outfit="'+id+'"]').getAttribute('aria-pressed')==='true',outfit.id);
    assert.equal(await frame.locator('[data-play]').isEnabled(),true);
    const after=await frame.evaluate(()=>window.kingJamesQA.status().snapshot);
    assert.deepEqual(after,before,'Choosing '+outfit.id+' changed gameplay or saves');
    for(const motion of ['run','punch','kick','fireball']){
     await frame.locator('[data-motion]').selectOption(motion);
     const first=await frame.locator('.outfit-stage canvas').evaluate(c=>c.toDataURL());
     await frame.waitForFunction(image=>document.querySelector('.outfit-stage canvas').toDataURL()!==image,first);
    }
    await frame.getByRole('button',{name:'Face left',exact:true}).click();
    await frame.locator('[data-motion]').selectOption('run');
    const left=await frame.locator('.outfit-stage canvas').evaluate(c=>c.toDataURL());
    await frame.waitForFunction(image=>document.querySelector('.outfit-stage canvas').toDataURL()!==image,left);
    await frame.getByRole('button',{name:'Face right',exact:true}).click();
    await frame.getByRole('button',{name:'Play in this outfit',exact:true}).click();
    await frame.waitForFunction(id=>document.querySelector('#game').dataset.outfit===id,outfit.id);
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),OUTFIT_STORAGE_KEY),outfit.id);
    await page.screenshot({path:'/tmp/kingjames-outfit-'+type.name()+'-'+outfit.id+'.png'});
    report.push({engine:type.name(),outfit:outfit.id,equipped:true,animated:true,leftAndRight:true,saveUnchanged:true});
   }
   await frame.evaluate(()=>{window.kingJamesQA.pause();window.kingJamesQA.save();});
   const final=await frame.evaluate(()=>window.kingJamesQA.status().snapshot);
   frame=await login();
   await frame.waitForFunction(()=>document.querySelector('#game').dataset.outfit==='sapphire-starlight');
   const restored=await frame.evaluate(()=>window.kingJamesQA.status().snapshot);
   for(const key of ['level','xp','coins','inventory','powers','look','cosmetics'])assert.deepEqual(restored[key],final[key]);
   assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.deepEqual(cloud,[]);
   console.log(type.name()+': all 12 outfits equip, animate in both directions, preserve snapshots and reload');
  }finally{await browser.close();}
 }
 fs.writeFileSync('/tmp/kingjames-outfit-browser-results.json',JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
