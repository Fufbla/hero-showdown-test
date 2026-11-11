'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1560,height:1180}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:8174/royale/tests/approved-motion-visual-review.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__reviewDone,{timeout:30000});
  const result=await page.evaluate(()=>({review:window.__review,error:window.__reviewError}));
  assert.equal(result.error,null,'SVG atlas load must succeed');
  assert.equal(result.review.poses,24);
  assert.deepEqual(result.review.dimensions,[1536,1024]);
  assert.deepEqual(errors,[]);
  fs.mkdirSync('visual-artifacts',{recursive:true});
  await page.locator('#atlas').screenshot({path:'visual-artifacts/approved-motion-svg-actual.png'});
  console.log('SVG decoded in real Chromium; all 24 sprite cells are accessible',result.review);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
