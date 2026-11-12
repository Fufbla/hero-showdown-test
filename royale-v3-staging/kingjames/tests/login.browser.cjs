// Exercise the ordinary cloud-account launch with synthetic responses only.
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const origin=process.env.KINGJAMES_TEST_ORIGIN||'http://127.0.0.1:8174';

(async()=>{
 const {Game}=await import('../../../royale/core.mjs');
 const snapshot=JSON.parse(new Game().save());
 snapshot.look.name='Login Regression';
 for(const type of [chromium,webkit]){
  const browser=await type.launch({headless:true});
  try{
   for(const populated of [false,true]){
    const context=await browser.newContext();
    try{
     const page=await context.newPage(),errors=[],actions=[];
     page.on('pageerror',error=>errors.push(error.message));
     await page.route('https://*.supabase.co/**',async route=>{
      const {action}=route.request().postDataJSON();actions.push(action);
      const data=action==='verify'?{access:'synthetic-access',refresh:'synthetic-refresh'}:
       action==='slots'?{slots:[1,2,3].map(slot_number=>({slot_number,revision:0,snapshot:populated&&slot_number===1?snapshot:null}))}:null;
      assert.ok(data,'Unexpected cloud action: '+action);
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
     });
     await page.goto(origin+'/royale-v3-staging/');
     await page.locator('#enter').click();
     await page.locator('#input').fill('1111111111'); // Synthetic fixture; never sent to a server.
     await page.locator('#load').click();
     await page.waitForFunction(()=>document.querySelector('#status').textContent==='V3 cloud loaded. Choose a hero.');
     assert.equal(await page.locator('#roster').isVisible(),true);
     const frame=page.frameLocator('#game-frame');
     await frame.locator('#roster').waitFor({state:'visible'});
     // The roster shell is visible before its asynchronous module graph finishes.
     if(populated)await frame.getByRole('heading',{name:'Login Regression',exact:true}).waitFor({state:'visible'});
     else await frame.getByRole('button',{name:'Create Hero +',exact:true}).first().waitFor({state:'visible'});
     assert.deepEqual(actions,['verify','slots']);
     assert.deepEqual(errors,[]);
     console.log(type.name()+': ordinary account '+(populated?'saved hero':'empty slots')+' loaded without cloud writes');
    }finally{await context.close();}
   }
  }finally{await browser.close();}
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
