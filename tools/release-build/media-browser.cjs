// Media integration checks use isolated browser storage and never write live accounts.
const {chromium,webkit,devices}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.ROYALE_MEDIA_URL||'http://127.0.0.1:8174/hero-showdown-test/royale/';
const report={url:base,checks:[],engines:[],physicalDevices:false};
const out=process.env.ROYALE_MEDIA_REPORT||'/tmp/royale-media-report.json';
const waitTrack=page=>page.waitForFunction(()=>!!window.royaleSoundtrack?.source,{},{timeout:45000});
async function skip(page){await page.locator('#intro-skip').click();await page.locator('#royale-intro').waitFor({state:'detached'});await waitTrack(page);}
(async()=>{
 if(!process.env.ROYALE_MEDIA_WEBKIT_ONLY){
 const browser=await chromium.launch({headless:true,args:['--autoplay-policy=user-gesture-required']});
 try{
  const context=await browser.newContext({viewport:{width:1366,height:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.locator('#royale-intro').waitFor();
  assert.equal(await page.evaluate(()=>royaleSoundtrack.ready),false);
  assert.equal(await page.evaluate(()=>royaleSoundtrack.source),null);
  assert.equal(await page.locator('#royale-intro video').evaluate(v=>v.muted),false);
  if(await page.locator('#intro-start').isVisible())await page.locator('#intro-start').click();
  await page.waitForFunction(()=>document.querySelector('#royale-intro video').currentTime>1);
  // The currently uploaded MP4 is 602x1080; the retained WebM is 512x918.
  // Both must preserve their authored portrait aspect, with contain-fit display.
  const shape=await page.locator('#royale-intro video').evaluate(v=>({width:v.videoWidth,height:v.videoHeight,duration:v.duration,fit:getComputedStyle(v).objectFit}));
  assert([[602,1080],[512,918]].some(([w,h])=>shape.width===w&&shape.height===h));
  assert(shape.duration>29&&shape.duration<31);assert.equal(shape.fit,'contain');
  await page.locator('#royale-intro video').evaluate(v=>{window.royaleIntroObservedEnded=false;v.addEventListener('ended',()=>{window.royaleIntroObservedEnded=true;},{once:true});});
  await page.screenshot({path:'/tmp/royale-intro-desktop.png'});
  await page.locator('#royale-intro').waitFor({state:'detached',timeout:45000});
  assert(await page.evaluate(()=>window.royaleIntroObservedEnded),'Intro must end naturally, not exit through its watchdog');await waitTrack(page);
  report.checks.push('Complete 30-second video plays with audio, correct aspect ratio, and no concurrent music; ended releases the video and starts music');
  const start=await page.evaluate(()=>{window.firstSource=royaleSoundtrack.source;return royaleSoundtrack.startedAt;});
  await page.locator('.royale-music-controls summary').click();
  assert.equal(await page.locator('[data-music-volume]').inputValue(),'20');
  await page.locator('[data-music-toggle]').click();
  assert.equal(await page.evaluate(()=>royaleSoundtrack.settings.muted),true);
  await page.waitForTimeout(500);
  assert(await page.evaluate(()=>royaleSoundtrack.gain.gain.value<.0001));
  await page.locator('[data-music-toggle]').click();
  await page.locator('[data-music-volume]').fill('48');
  assert.equal(await page.evaluate(()=>royaleSoundtrack.settings.volume),.48);
  assert.equal(await page.evaluate(()=>royaleSoundtrack.startedAt),start);
  assert(await page.evaluate(()=>royaleSoundtrack.source===firstSource));
  report.checks.push('Default 20%, mute/unmute and 0–100% volume use the same source and persist preferences');
  await page.locator('#browser-heroes').click();
  const game=page.frameLocator('#game-frame');await game.locator('#hero-slots').waitFor();
  assert.equal(await game.locator('#royale-intro').count(),0);
  assert(await page.evaluate(()=>royaleSoundtrack.source===firstSource));
  assert(await page.locator('#game-frame').evaluate(f=>f.contentWindow.royaleSoundtrack===undefined));
  await page.screenshot({path:'/tmp/royale-media-menu.png'});
  report.checks.push('Browser hero menu is embedded in the persistent launch page, shares one soundtrack, and never replays the intro');
  await game.locator('#hero-slots').getByRole('button',{name:'Create Hero +',exact:true}).first().click();
  await game.getByRole('button',{name:'‹ Back to My Heroes',exact:true}).click();
  await game.getByRole('button',{name:'‹ Back to Welcome',exact:true}).click();
  await page.locator('#main-actions').waitFor({state:'visible'});
  assert.equal(await page.locator('#royale-intro').count(),0);
  assert(await page.evaluate(()=>royaleSoundtrack.source===firstSource));
  // Cancel before a fake create response arrives, then cancel a completed code.
  let finishCreate;
  await page.route('**/*.supabase.co/**',async route=>{
   assert.equal(route.request().postDataJSON().action,'create');
   await new Promise(resolve=>finishCreate=resolve);
   await route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({access:'navigation-fixture',refresh:'navigation-fixture',code:'1234567891'})});
  });
  await page.locator('#play-game').click();await page.locator('#new').click();
  await page.getByText('Generating…',{exact:true}).waitFor();
  await page.locator('#code-back').click();
  while(!finishCreate)await page.waitForTimeout(20);finishCreate();await page.waitForTimeout(150);
  assert.equal(await page.locator('#new-code').isVisible(),false);assert(await page.locator('#play-options').isVisible());
  finishCreate=null;await page.locator('#new').click();while(!finishCreate)await page.waitForTimeout(20);finishCreate();
  await page.getByText('1234567891',{exact:true}).waitFor();await page.locator('#code-back').click();
  await page.locator('#enter').click();await page.locator('#play-back').click();assert.equal(await page.locator('#input-area').isVisible(),false);
  await page.locator('#play-back').click();await page.locator('#local-coop').click();
  await page.frameLocator('#game-frame').locator('#players .player-card').nth(1).waitFor({timeout:60000});
  await page.frameLocator('#game-frame').getByRole('button',{name:'‹ Back',exact:true}).click();
  await page.locator('#main-actions').waitFor({state:'visible'});assert(await page.evaluate(()=>royaleSoundtrack.source===firstSource));
  report.checks.push('Creator, roster, co-op, code entry, pending code generation and completed codes all return safely without reloading or restarting music');
  assert.deepEqual(errors,[]);
  // Observe the real three-minute loop while other contexts exercise failure/mobile paths.
  const loopCheck=(async()=>{
   const elapsed=await page.evaluate(()=>royaleSoundtrack.context.currentTime-royaleSoundtrack.startedAt);
   if(!process.env.ROYALE_MEDIA_QUICK)await page.waitForTimeout(Math.max(0,(182-elapsed)*1000));
   const state=await page.evaluate(()=>({same:royaleSoundtrack.source===firstSource,loop:royaleSoundtrack.source.loop,duration:royaleSoundtrack.source.buffer.duration,elapsed:royaleSoundtrack.context.currentTime-royaleSoundtrack.startedAt,state:royaleSoundtrack.context.state}));
   assert(state.same&&state.loop);assert(state.duration>179&&state.duration<181);assert.equal(state.state,'running');
   if(!process.env.ROYALE_MEDIA_QUICK)assert(state.elapsed>state.duration);
   report.loop=state;report.checks.push(process.env.ROYALE_MEDIA_QUICK?'Persistent native loop configured':'Actual three-minute boundary crossed on the original audio source without a new player');
  })();
  const mobile=await browser.newContext({...devices['Pixel 7']}),m=await mobile.newPage();await m.goto(base);await skip(m);
  await m.locator('#local-coop').click();const coop=m.frameLocator('#game-frame');await coop.locator('#setup').waitFor();
  assert.equal(await coop.locator('#royale-intro').count(),0);assert(await m.evaluate(()=>!!royaleSoundtrack.source));
  await coop.locator('#players .player-card').nth(1).waitFor({timeout:60000});
  const layout=await coop.locator('body').evaluate(el=>({width:innerWidth,content:el.scrollWidth,back:document.getElementById('setup-back').getBoundingClientRect().top}));
  assert(layout.content<=layout.width+1,'Mobile co-op has no sideways overflow');assert(layout.back>=0&&layout.back<100,'Back is visible without scrolling');
  await m.screenshot({path:'/tmp/royale-media-android.png'});
  await coop.getByRole('button',{name:'‹ Back',exact:true}).click();await m.locator('#main-actions').waitFor({state:'visible'});
  report.engines.push({engine:'Chromium',device:'Android Chrome emulation',passed:true});
  await mobile.close();
  const failure=await browser.newContext(),f=await failure.newPage();await failure.route('**/intro.{mp4,webm}*',r=>r.abort());await f.goto(base);
  await f.locator('#royale-intro').waitFor({state:'detached',timeout:20000});await f.locator('#play-game').click();await f.locator('#enter').click();assert(await f.locator('#input').isVisible());
  report.checks.push('Missing video falls through to a working main menu');await failure.close();
  const musicFailure=await browser.newContext(),mf=await musicFailure.newPage();await musicFailure.route('**/soundtrack.mp3',r=>r.abort());await mf.goto(base);await mf.locator('#intro-skip').click();await mf.locator('#play-game').click();await mf.locator('#enter').click();assert(await mf.locator('#input').isVisible());
  await mf.waitForFunction(()=>royaleSoundtrack.failed);report.checks.push('Missing soundtrack leaves menu navigation and sound-effects context available');await musicFailure.close();
  const blocked=await browser.newContext();await blocked.addInitScript(()=>{HTMLMediaElement.prototype.play=()=>Promise.reject(new DOMException('Autoplay blocked','NotAllowedError'));});
  const b=await blocked.newPage();await b.goto(base);await b.locator('#intro-start').waitFor();assert.match(await b.locator('.intro-status').innerText(),/Tap/);await skip(b);report.checks.push('Autoplay rejection offers Tap to Start and Skip always remains usable');await blocked.close();
  await loopCheck;
  // Fresh reload replays intro; saved music preferences remain, heroes are untouched.
  await page.reload();await page.locator('#intro-skip').waitFor();assert.equal(await page.evaluate(()=>royaleSoundtrack.settings.volume),.48);await skip(page);
  report.checks.push('Fresh launch replays intro once and restores local music preferences');await context.close();
 }finally{await browser.close();}
 }
 if(!process.env.ROYALE_MEDIA_CHROMIUM_ONLY){
  const wk=await webkit.launch({headless:true});try{for(const name of ['iPhone 13','iPad (gen 7)']){
   const c=await wk.newContext({...devices[name]}),p=await c.newPage();await p.goto(base);await p.locator('#intro-start').click();
   await p.waitForFunction(()=>document.querySelector('#royale-intro video')?.currentTime>0,{},{timeout:20000});
   assert.equal(await p.locator('video').evaluate(v=>v.playsInline&&getComputedStyle(v).objectFit==='contain'),true);
   await p.screenshot({path:'/tmp/royale-intro-'+name.split(' ')[0]+'.png'});await skip(p);
   await p.locator('.royale-music-controls summary').click();await p.locator('[data-music-volume]').fill('0');await p.waitForTimeout(500);assert(await p.evaluate(()=>royaleSoundtrack.gain.gain.value<.0001));
   await p.locator('[data-music-volume]').fill('100');await p.locator('#browser-heroes').click();await p.frameLocator('#game-frame').locator('#hero-slots').waitFor();
   assert.equal(await p.frameLocator('#game-frame').locator('#royale-intro').count(),0);report.engines.push({engine:'WebKit',device:name+' emulation',passed:true});await c.close();
  }}finally{await wk.close();}
 }
 report.passed=true;
})().catch(e=>{report.failure=e.stack;process.exitCode=1;}).finally(()=>{fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));});
