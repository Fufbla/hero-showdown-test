const { chromium, webkit } = require('playwright');

async function check(browserType, origin) {
  const browser=await browserType.launch({headless:true});
  let page;
  try {
    const ctx=await browser.newContext({viewport:{width:1200,height:800},ignoreHTTPSErrors:true});
    page=await ctx.newPage();
    const errors=[],failures=[],responses=[];
    page.on('pageerror',e=>errors.push('PAGE '+e.message+'\n'+e.stack));
    page.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE '+m.text());});
    page.on('requestfailed',r=>failures.push(r.url()+' '+(r.failure()?.errorText||'')));
    page.on('response',r=>{if(r.status()>=400)responses.push(r.status()+' '+r.url());});
    const url=origin+'/royale-v3-staging/';
    console.log('\n[BROWSER '+browserType.name()+' '+origin+'] visiting '+url);
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForTimeout(1600);
    console.log('TOP RESPONSE',response?.status(),'title',await page.title());
    console.log('TOP visible texts',JSON.stringify((await page.locator('body').innerText()).slice(0,400)));
    console.log('TOP errors',JSON.stringify(errors.slice(0,10)));
    const input=page.locator('#input'),enter=page.locator('#enter'),load=page.locator('#load');
    if(await enter.count()===1 && await input.count()===1){
      await enter.click();
      await input.fill('0000000000');
      await load.click();
    }
    await page.waitForTimeout(5200);
    const frames=page.frames();
    console.log('FRAME URLs',JSON.stringify(frames.map(f=>f.url())));
    const hud=await page.evaluate(()=>({
      title:document.title,
      roster:document.querySelector('#roster')?.hidden,
      status:document.querySelector('#status')?.textContent,
      frameSrc:document.querySelector('#game-frame')?.getAttribute('src'),
    }));
    console.log('TOP UI',JSON.stringify(hud));
    for(const frame of frames.slice(1)){
      try{
        const state=await frame.evaluate(()=>({
          url:location.href,
          screen:[...document.querySelectorAll('section')].filter(x=>!x.hidden).map(x=>x.id).slice(0,15),
          canvas:!!document.querySelector('#game'),
          canvasWidth:document.querySelector('#game')?.width,
          canvasHeight:document.querySelector('#game')?.height,
          text:(document.body.innerText||'').slice(0,600)
        }));
        console.log('IFRAME UI',JSON.stringify(state));
      }catch(e){console.log('IFRAME READ ERROR',e.message)}
    }
    console.log('JAVASCRIPT ERRORS',JSON.stringify(errors.slice(0,18)));
    console.log('FAILED REQUESTS',JSON.stringify(failures.slice(0,20)));
    console.log('HTTP ERRORS',JSON.stringify(responses.slice(0,20)));
    if(origin.startsWith('http://127.')){
      if(hud.roster!==false)throw Error('V2 test code failed to launch roster; '+JSON.stringify(hud));
      if(!frames.some(f=>f.url().includes('v2TestCharacter=0000000000')))throw Error('V2 test iframe did not open');
      if(errors.length)throw Error('Game Javascript errors: '+errors.join('\n'));
      if(responses.length)throw Error('Game HTTP errors: '+responses.join('\n'));
    }
  }finally{await browser.close();}
}
(async()=>{
 for(const browser of [chromium,webkit]) {
   await check(browser,'http://127.0.0.1:8174');
   try{await check(browser,'https://fufbla.github.io/hero-showdown-test');}
   catch(e){console.log('LIVE DIAGNOSTIC '+browser.name()+': '+e.stack);}
 }
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
