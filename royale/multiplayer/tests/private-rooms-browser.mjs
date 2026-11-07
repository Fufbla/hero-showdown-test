// Run against `npm run dev`; disposable identities only, never a live save code.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const origin=process.env.REVIEW_URL||'http://localhost:4175',pages=[],errors=[];
await mkdir(new URL('../qa/',import.meta.url),{recursive:true});
try{
  let code;
  for(let i=1;i<=6;i++){
    const context=await browser.newContext({viewport:{width:932,height:430}}),page=await context.newPage();pages.push(page);
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/royale-v3-staging/');
    await page.locator('#enter').click();await page.locator('#input').fill(String(i).repeat(10));await page.locator('#load').click();
    const frame=page.frameLocator('#game-frame');await frame.locator('#hero-slots [data-action="multiplayer"]').first().click({timeout:30000});
    if(i===1){await frame.locator('#mp-create').click();await frame.locator('#mp-code').waitFor({state:'visible',timeout:30000});code=(await frame.locator('#mp-code').textContent()).match(/\d{6}/)[0];console.log('Created room',code);}
    else{await frame.locator('#mp-join-code').fill(code);await frame.locator('#mp-join').click();}
    if(i<=5){await frame.locator('#multiplayer-status').waitFor({state:'visible',timeout:30000});console.log('Joined browser',i);assert.equal(await frame.locator('#mp-close').isEnabled(),false);}
    else{await frame.locator('#mp-status').filter({hasText:'Room capacity reached'}).waitFor({timeout:30000});console.log('Sixth browser rejected');}
  }
  const host=pages[0].frameLocator('#game-frame');
  await host.locator('#mp-players').filter({hasText:'5/5 players'}).waitFor({timeout:10000});
  await pages[0].screenshot({path:new URL('../qa/five-player-room.png',import.meta.url).pathname});
  assert.equal(await host.locator('#mp-start').isEnabled(),true);
  assert.equal(await pages[1].frameLocator('#game-frame').locator('#mp-start').isVisible(),false);
  await host.locator('#mp-start').click();
  for(const page of pages.slice(0,5))await page.frameLocator('#game-frame').locator('#multiplayer-menu').waitFor({state:'hidden'});
  await pages[1].frameLocator('#game-frame').locator('#game').click({position:{x:450,y:150}});
  await pages[1].keyboard.down('ArrowRight');await pages[1].waitForTimeout(600);await pages[1].keyboard.up('ArrowRight');
  await pages[1].waitForTimeout(8500);
  const checkpoints=await(await pages[0].request.get(origin+'/fixture-checkpoints')).json();
  assert.ok(new Set(checkpoints.map(c=>c.profile)).size>=5);
  for(const page of pages.slice(0,5))assert.match(await page.locator('#status').textContent(),/Saved Slot 1/);
  console.log('Eight-second browser checkpoints confirmed for all five players');
  const guest=pages[1].frameLocator('#game-frame');await guest.locator('#multiplayer-status').click();await guest.locator('#mp-roster').click();
  await guest.locator('#hero-slots [data-action="continue"]').first().waitFor({state:'visible',timeout:15000});
  await guest.locator('#hero-slots [data-action="continue"]').first().click();
  await pages[1].waitForTimeout(500);assert.equal(await guest.locator('#multiplayer-menu').isVisible(),false);
  console.log('Returned to the same saved solo hero');
  await pages[0].setViewportSize({width:390,height:844});await host.locator('#multiplayer-status').click();
  await pages[0].screenshot({path:new URL('../qa/private-room-portrait.png',import.meta.url).pathname});
  const box=await host.locator('#multiplayer-menu').boundingBox();assert.ok(box.width<=390&&box.height<=844);
  assert.deepEqual(errors,[]);console.log('Browser checks passed');
}finally{await browser.close();}
