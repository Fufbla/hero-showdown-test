const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const origin=process.env.GAMEPLAY_TEST_ORIGIN||'http://127.0.0.1:8174';
const out=process.env.GAMEPLAY_REPORT_DIR||'docs/gameplay-20261113';
const namespace='royale-v2-prototype-0000000000:healthia.royale.profiles.v2';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[],report={origin,checks:[]};
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(origin))errors.push(r.status()+' '+r.url());});
 try{
  const launch=async()=>{
   await page.goto(origin+'/royale-v3-staging/?spriteQA=1');
   await page.locator('#enter').click();await page.locator('#input').fill('0000000000');await page.locator('#load').click();
   const frame=await (await page.locator('#game-frame').elementHandle()).contentFrame();
   await frame.waitForFunction(()=>window.kingJamesQA?.status().ready===true,null,{timeout:90000});
   await frame.waitForFunction(()=>document.querySelector('#game')?.dataset.artReady==='true',null,{timeout:90000});
   return frame;
  };
  let frame=await launch();
  await frame.evaluate(()=>window.kingJamesQA.pause());
  const initial=await frame.evaluate(()=>window.kingJamesQA.status());assert.equal(initial.name,'KingJames');
  await frame.evaluate(()=>window.kingJamesQA.save());
  await page.evaluate(key=>{const p=JSON.parse(localStorage.getItem(key));const s=p.slots.find(s=>s?.snapshot?.look.name==='KingJames').snapshot;s.coins=20000;localStorage.setItem(key,JSON.stringify(p));},namespace);
  frame=await launch();await frame.evaluate(()=>window.kingJamesQA.pause());
  const before=await frame.evaluate(()=>window.kingJamesQA.status().snapshot);
  await frame.locator('#open-map').click();
  assert.match(await frame.locator('#map-note').innerText(),/every trip/);
  const prices=await frame.locator('[data-travel][data-board="0"]').allTextContents();
  for(const price of ['200','300','800','1,200','2,500','3,500'])assert(prices.some(p=>p.includes(price+' Coins')),price);
  await frame.locator('[data-travel="7"][data-board="1"]').click();
  assert.match(await frame.locator('#fast-travel-dialog').innerText(),/3,500 Coins/);
  await page.screenshot({path:out+'/paid-travel-confirmation.png',fullPage:true});
  await frame.locator('#confirm-fast-travel').click();
  await frame.waitForFunction(()=>window.kingJamesQA.status().snapshot?.world.region===7);
  await frame.evaluate(()=>window.kingJamesQA.pause());
  const travelled=await frame.evaluate(()=>window.kingJamesQA.status().snapshot);
  assert.equal(travelled.coins,16500);assert.equal(travelled.world.checkpoint.index,1);
  for(const key of ['look','cosmetics','inventory','level','xp'])assert.deepEqual(travelled[key],before[key]);
  report.checks.push('Test 0000000000: quoted 3500, paid once, exact region/board preserved, identity/inventory/XP unchanged');
  await frame.evaluate(()=>window.kingJamesQA.save());frame=await launch();await frame.evaluate(()=>window.kingJamesQA.pause());
  const restored=await frame.evaluate(()=>window.kingJamesQA.status().snapshot);assert.equal(restored.coins,16500);assert.equal(restored.world.region,7);assert.equal(restored.world.checkpoint.index,1);assert.equal(restored.world.location.x,travelled.world.location.x);
  report.checks.push('Actual test-code local save/reload retains debit and destination');
  // A second isolated test balance checks the rendered disabled confirmation.
  await page.evaluate(key=>{const p=JSON.parse(localStorage.getItem(key));p.slots.find(s=>s?.snapshot?.look.name==='KingJames').snapshot.coins=99;localStorage.setItem(key,JSON.stringify(p));},namespace);
  frame=await launch();await frame.evaluate(()=>window.kingJamesQA.pause());await frame.locator('#open-map').click();await frame.locator('[data-travel="1"][data-board="0"]').click();assert(await frame.locator('#confirm-fast-travel').isDisabled());assert.match(await frame.locator('#fast-travel-dialog').innerText(),/100 coins/);await frame.locator('#cancel-fast-travel').click();assert.equal((await frame.evaluate(()=>window.kingJamesQA.status().snapshot)).coins,99);report.checks.push('Insufficient funds disables travel; cancel does not charge');
  assert.deepEqual(errors,[]);report.errors=errors;report.passed=true;fs.writeFileSync(out+'/browser.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }catch(error){await page.screenshot({path:out+'/browser-failure.png',fullPage:true}).catch(()=>{});fs.writeFileSync(out+'/browser-failure.json',JSON.stringify({error:String(error),errors,url:page.url()},null,2));throw error;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
