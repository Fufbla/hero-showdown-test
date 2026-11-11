'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');

(async()=>{
 const output='visual-artifacts';
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1600,height:1000},deviceScaleFactor:1});
 const errors=[];
 try{
  const visual=await context.newPage();
  visual.on('pageerror',error=>errors.push('preview: '+error.message));
  await visual.goto('http://127.0.0.1:8174/royale/tests/v2-superpower-visual-review.html',{waitUntil:'load',timeout:45000});
  await visual.waitForFunction(()=>window.__v2VisualReady||window.__v2VisualError,{timeout:45000});
  const report=await visual.evaluate(()=>window.__v2VisualReport);
  assert.ok(report?.ready,'sprite sheet did not load');
  assert.equal(report.total,24);
  assert.ok(report.rendered>0,'no generated sprites were renderable');
  assert.equal(report.samples.filter(x=>x.label.includes('strength')).length,3);
  await visual.locator('#sheet').screenshot({path:path.join(output,'power-motion-contact-sheet.png')});
  fs.writeFileSync(path.join(output,'power-motion-report.json'),JSON.stringify(report,null,2));
  console.log('Visual contact sheet:',report.rendered,'/',report.total,'rendered; unsafe source frames:',report.unsafeFrames.length);
  console.log('Fallbacks:',report.samples.filter(x=>!x.generated).map(x=>x.label).join(', ')||'none');

  const game=await context.newPage();
  const approvedRequests=[];
  game.on('response',response=>{
   if(response.url().includes('approved-action-atlas-clean.png'))
    approvedRequests.push({url:response.url(),status:response.status()});
  });
  game.on('pageerror',error=>errors.push('game: '+error.message));
  await game.goto('http://127.0.0.1:8174/royale-v3-staging/',{waitUntil:'domcontentloaded',timeout:45000});
  await game.locator('#enter').click();
  await game.locator('#input').fill('0000000000');
  await game.locator('#load').click();
  const iframe=game.frameLocator('#game-frame');
  await iframe.locator('#v2-sprite-toggle').waitFor({state:'attached',timeout:55000});
  await iframe.locator('#game').waitFor({state:'visible',timeout:55000});
  await game.waitForTimeout(2000);
  assert.ok(approvedRequests.some(x=>x.status===200),'The test hero never downloaded the approved clean PNG');
  const spriteButton=await iframe.locator('#v2-sprite-toggle').textContent();
  const phase=await iframe.locator('.phase-label').textContent();
  assert.ok(phase.includes('0000000000'),'wrong or non-isolated hero context');
  assert.ok(spriteButton.includes('ON'),'generated sprite preview not enabled: '+spriteButton);
  await game.screenshot({path:path.join(output,'sandbox-game-idle.png')});
  // Exercise the regular game's keyboard and physics-driven animation path.
  await iframe.locator('#game').click({force:true});
  await game.keyboard.down('ArrowRight');
  await game.waitForTimeout(500);
  await game.keyboard.up('ArrowRight');
  await game.screenshot({path:path.join(output,'sandbox-game-run.png')});
  await game.keyboard.press('Space');
  await game.waitForTimeout(180);
  await game.screenshot({path:path.join(output,'sandbox-game-jump.png')});
  console.log('Live sandbox browser smoke passed:',phase.trim(),'toggle:',spriteButton.trim());
  // The standalone preview is visually representative, but not an assertion
  // that every power is unlocked in the level-1 gameplay sandbox.
  fs.writeFileSync(path.join(output,'browser-smoke.json'),JSON.stringify({phase,spriteButton,approvedRequests,errors},null,2));
  assert.deepEqual(errors,[],'browser JS exceptions detected');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});