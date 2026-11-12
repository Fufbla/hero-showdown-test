const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const exercise=require('../royale-v3-staging/kingjames/tests/browser-portals.cjs');
(async()=>{const results=[];for(const engine of [chromium,webkit])for(const [mode,width,height] of [['desktop',1280,900],['portrait',390,844],['landscape',844,390]]){
 const browser=await engine.launch({headless:true}),page=await browser.newPage({viewport:{width,height},isMobile:mode!=='desktop',hasTouch:mode!=='desktop'}),errors=[],missing=[],cloud=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/portals/')&&r.status()>=400)missing.push(r.url())});page.on('request',r=>{if(r.url().includes('supabase.co/functions/'))cloud.push(r.url())});
 await page.goto('http://127.0.0.1:8174/royale-v3-staging/?spriteQA=1');await page.locator('#enter').click();await page.locator('#input').fill('0000000000');await page.locator('#load').click();
 const frame=await (await page.locator('#game-frame').elementHandle()).contentFrame();await frame.waitForFunction(()=>document.querySelector('#game')?.dataset.artReady==='true',null,{timeout:90000});
 const result=await exercise(frame);assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);assert.deepEqual(cloud,[]);
 await page.screenshot({path:`/tmp/portal-${engine.name()}-${mode}.png`,fullPage:true});results.push({engine:engine.name(),mode,...result,errors,missing,cloud});await browser.close();
 }fs.writeFileSync('/tmp/portal-browser-report.json',JSON.stringify(results,null,2));})().catch(e=>{console.error(e);process.exitCode=1});
