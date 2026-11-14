// Exercise the shipped page with two isolated accounts. All cloud traffic is
// intercepted: no real player accounts, credentials, or saves are used.
const {chromium}=require('playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const url=process.env.ROYALE_COOP_URL||'https://fufbla.github.io/hero-showdown-test/royale/local-coop/';
const report={url,errors:[],rejections:[],requests:[],checks:[],physicalControllers:false};
const dir='docs/local-coop-startup-20261113';fs.mkdirSync(dir,{recursive:true});
(async()=>{
 await import('./register.mjs'); // Fixtures and saved snapshots use the production decoder.
 const {Game}=await import('../../royale/core.mjs');
 const {styleCDefault}=await import('../../royale/style-c-defaults.mjs');
 const accounts=[0,1].map(i=>{
  const g=new Game({look:{...styleCDefault(i?'female':'male'),name:i?'Coop QA Nova':'Coop QA Atlas'}});
  g.hero.level=14+i;g.hero.xp=20+i;g.hero.coins=1234+i*100;g.powers.data.points=7+i;
  for(const id of ['fireball','roots','whirlwind'])g.powers.data.levels[id]=2;
  g.powers.data.equipped=['fireball','roots','whirlwind'];
  return {code:i?'2222222222':'1111111111',token:'isolated-fixture-'+i,slots:[1,2,3].map(n=>({slot_number:n,revision:1,snapshot:n===i+1?JSON.parse(g.save()):null})),saves:[]};
 });
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1366,height:900}});
  await context.addInitScript(()=>{
   window.__testPads=[0,1].map(index=>({index,id:'Isolated standard controller '+index,mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0})),timestamp:1}));
   navigator.getGamepads=()=>window.__testPads;
   window.__rejections=[];addEventListener('unhandledrejection',e=>window.__rejections.push(String(e.reason?.stack||e.reason)));
   window.__observed={frames:0,loopMax:0,timers:0};
   const raf=requestAnimationFrame,queued=new Map();
   window.requestAnimationFrame=callback=>{
    if(callback.name!=='frame')return raf(callback);
    const count=(queued.get(callback)||0)+1;queued.set(callback,count);window.__observed.loopMax=Math.max(window.__observed.loopMax,count);
    return raf(time=>{queued.set(callback,queued.get(callback)-1);callback(time);});
   };
   const interval=setInterval,clear=clearInterval,timers=new Set();
   window.setInterval=(callback,ms,...args)=>{const id=interval(callback,ms,...args);if(ms===8000){timers.add(id);window.__observed.timers=timers.size;}return id;};
   window.clearInterval=id=>{timers.delete(id);window.__observed.timers=timers.size;clear(id);};
   const text=CanvasRenderingContext2D.prototype.fillText;
   CanvasRenderingContext2D.prototype.fillText=function(label,x,y,...rest){
    if(this.canvas.id==='world'&&String(label).startsWith('P2 ·')){
     if(window.__failFrame){window.__failFrame=false;throw Error('Injected recoverable render failure');}
     const t=this.getTransform();window.__observed.frames++;window.__observed.follower={x,y:y+112,cameraX:-t.e/t.a,cameraY:-t.f/t.d,width:this.canvas.width/t.a,height:this.canvas.height/t.d};
    }
    return text.call(this,label,x,y,...rest);
   };
  });
  await context.route('**/*.supabase.co/**',async route=>{
   const req=route.request(),b=req.postDataJSON()||{};
   const a=b.action==='verify'?accounts.find(a=>a.code===b.code):accounts.find(a=>'Bearer '+a.token===req.headers().authorization);
   assert(a,'Unexpected account or request');
   report.requests.push({action:b.action,player:accounts.indexOf(a)});
   let result,status=200;
   if(b.action==='verify')result={access:a.token,refresh:a.token};
   else if(b.action==='slots')result={slots:a.slots};
   else if(b.action==='save'){
    const row=a.slots.find(r=>r.slot_number===b.slot);
    if(row.revision!==b.revision){status=409;result={error:'Revision conflict'};}
    else{Object.assign(row,{snapshot:structuredClone(b.snapshot),revision:row.revision+1,updated_at:new Date().toISOString()});a.saves.push(structuredClone(row));result=row;}
   }else throw Error('Unexpected cloud action '+b.action);
   await route.fulfill({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(result)});
  });
  const page=await context.newPage();
  page.on('pageerror',e=>{report.errors.push(e.stack);console.log('BROWSER ERROR:',e.stack);});
  const manifest=await (await page.request.get(new URL('../release-manifest.json?v='+(process.env.ROYALE_EXPECTED_COMMIT||Date.now()),url).href)).json();
  report.sourceCommit=manifest.sourceCommit;
  if(process.env.ROYALE_EXPECTED_COMMIT)assert.equal(manifest.sourceCommit,process.env.ROYALE_EXPECTED_COMMIT,'The deployed commit matches the tested release');
  await page.goto(url+'?verify='+manifest.sourceCommit,{waitUntil:'networkidle',timeout:120000});
  async function login(){for(let i=0;i<2;i++){
   const card=page.locator('.player-card').nth(i);
   await page.locator('#code-'+i).fill(accounts[i].code);
   await card.getByRole('button',{name:'Load Heroes',exact:true}).click();
   await card.locator('.hero-choice').filter({hasText:i?'Coop QA Nova':'Coop QA Atlas'}).click({timeout:60000});
   await card.getByRole('button',{name:'Ready',exact:true}).click();
  }}
  await login();
  await page.locator('#start').click();
  await page.waitForTimeout(4000);
  report.text=await page.locator('body').innerText();
  report.rejections=await page.evaluate(()=>window.__rejections);
  await page.screenshot({path:dir+'/browser.png',fullPage:true});
  assert.deepEqual(report.errors,[],'No exception in the first gameplay frames');
  assert.deepEqual(report.rejections,[],'No rejected initialization promises');
  assert(await page.locator('#play').isVisible(),'Both heroes entered gameplay');
  report.checks.push('Two separate accounts and saved slots entered gameplay');
  const until=async(fn,timeout=12000)=>{const end=Date.now()+timeout;while(!fn()){assert(Date.now()<end,'Timed out waiting for independent saves');await page.waitForTimeout(100);}};
  const latest=i=>accounts[i].slots[i].snapshot;
  const observe=()=>page.evaluate(()=>window.__observed);
  const pulse=async(i,button)=>{await page.evaluate(([i,b])=>window.__testPads[i].buttons[b].pressed=true,[i,button]);await page.waitForTimeout(90);await page.evaluate(([i,b])=>window.__testPads[i].buttons[b].pressed=false,[i,button]);await page.waitForTimeout(100);};
  const move=async(i,axis,ms)=>{await page.evaluate(([i,x])=>window.__testPads[i].axes[0]=x,[i,axis]);await page.waitForTimeout(ms);await page.evaluate(i=>window.__testPads[i].axes[0]=0,i);await page.waitForTimeout(150);};
  async function pauseSave(){
   if(!await page.locator('#menu').isVisible())await page.locator('#pause').click();
   for(let i=0;i<2;i++)await page.locator('#panel-'+i).getByRole('button',{name:'Save My Hero',exact:true}).click();
   await page.waitForTimeout(400);
  }
  async function resume(){for(let i=0;i<2;i++)await page.locator('#panel-'+i).getByRole('button',{name:'Ready / Resume',exact:true}).click();assert(!await page.locator('#menu').isVisible());await page.waitForTimeout(150);}
  assert((await observe()).frames>5,'Both heroes continuously render');
  // An unchanged checkpoint is intentionally not sent again. Move each hero
  // before waiting for the autosave so both accounts have new progress.
  await move(0,.25,150);await move(1,.25,150);
  await until(()=>accounts.every(a=>a.saves.length));
  for(let i=0;i<2;i++){
   assert.equal(latest(i).level,14+i);assert.equal(latest(i).xp,20+i);assert.equal(latest(i).coins,1234+i*100);
   assert.equal(latest(i).look.name,i?'Coop QA Nova':'Coop QA Atlas');assert.equal(latest(i).powers.levels.fireball,2);
   assert(accounts[i].slots.filter((_,j)=>j!==i).every(r=>r.snapshot===null));
  }
  report.checks.push('Both eight-second autosaves retain independent progress, appearance, power levels and other slots');
  const before=accounts.map((_,i)=>latest(i).world.location.x);
  await move(0,.5,300);await pauseSave();
  assert(latest(0).world.location.x>before[0]+5);assert(Math.abs(latest(1).world.location.x-before[1])<2);
  await resume();await move(1,.5,300);await pauseSave();assert(latest(1).world.location.x>before[1]+5);await resume();
  report.checks.push('Separate controllers move only their own heroes; pause/resume retains the world');
  await pulse(0,4);await pulse(1,4);
  for(let i=0;i<2;i++)assert.match(await page.locator('#powers-'+i+' .cooldown-icon').first().getAttribute('aria-label'),/\ds|Active/);
  await pulse(0,2);await pulse(1,1);
  report.checks.push('Both controllers cast equipped powers and accept punch/kick input');
  await pulse(1,9);assert(await page.locator('#menu').isVisible(),'Player 2 controller can pause');
  const paused=await observe();await move(0,1,250);assert.equal((await observe()).follower.cameraX,paused.follower.cameraX);await resume();
  await move(0,1,3300);const camera=await observe();
  assert(camera.follower.cameraX>10,'Shared camera follows Player 1');
  assert(camera.follower.x>=camera.follower.cameraX-32&&camera.follower.x<=camera.follower.cameraX+camera.follower.width+32,'Player 2 stays inside the shared viewport');
  report.checks.push('Player 1 moves the shared camera and Player 2 remains inside its viewport');
  // Force the follower to walk out of the viewport while the leader is still.
  await move(1,-1,4500);const teleported=await observe();
  assert(teleported.follower.x>=teleported.follower.cameraX-32,'Off-screen Player 2 returns near Player 1');
  report.checks.push('Off-screen follower teleport remains active');
  await pauseSave();
  for(let i=0;i<2;i++){assert(latest(i).xp>20+i,'Both heroes receive fight XP');assert(latest(i).coins>1234+i*100,'Both heroes receive their own coin reward');}
  report.checks.push('Combat defeats an enemy and awards independent coins and shared XP to both saved heroes');
  await page.locator('#panel-0').getByRole('button',{name:'Leave Local Co-op',exact:true}).click();
  await page.waitForTimeout(350);await page.locator('#pause').click();await page.locator('#panel-1').getByRole('button',{name:'Leave Local Co-op',exact:true}).click();
  await page.locator('#setup').waitFor({state:'visible'});assert.equal((await observe()).timers,0);
  await login();
  // The first frame failure must leave the account selections usable and must
  // not start autosaving an initialization that never finished.
  await page.evaluate(()=>window.__failFrame=true);await page.locator('#start').click();
  await page.waitForFunction(()=>document.querySelector('#setup-status').textContent.includes('Injected recoverable render failure'));
  assert(await page.locator('#setup').isVisible());assert.equal((await observe()).timers,0);assert(await page.locator('#start').isEnabled());
  await page.locator('#start').click();await page.locator('#play').waitFor({state:'visible'});await page.waitForTimeout(1200);
  assert.equal((await observe()).timers,1);assert.equal((await observe()).loopMax,1);
  report.checks.push('Returning to setup, reloading saved heroes and restarting co-op use one loop and one autosave timer');
  report.checks.push('First-frame exception displays a recoverable error; retry succeeds without reload');
  await page.evaluate(()=>window.__failFrame=true);
  await page.waitForFunction(()=>!document.querySelector('#setup').hidden&&!document.querySelector('#start').disabled);
  assert.match(await page.locator('#setup-status').innerText(),/Both heroes saved/);
  await page.locator('#start').click();await page.locator('#play').waitFor({state:'visible'});await page.waitForTimeout(400);
  report.checks.push('A later frame exception saves both checkpoints and keeps the setup loop usable');
  assert.deepEqual(report.errors,[]);assert.deepEqual(await page.evaluate(()=>window.__rejections),[]);
  report.observed=await observe();
  await page.screenshot({path:dir+'/browser.png',fullPage:true});
  // Independently open the unchanged single-player route with a browser-local
  // fixture; the separate context has no existing player saves.
  const soloContext=await browser.newContext({viewport:{width:1366,height:900}});
  const {LocalHeroStore,PROFILE_KEY}=await import('../../royale/saves.mjs');
  const memory=new Map(),store=new LocalHeroStore({getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)});
  store.writeSlot(0,JSON.stringify(accounts[0].slots[0].snapshot));
  await soloContext.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:PROFILE_KEY,value:memory.get(PROFILE_KEY)});
  const solo=await soloContext.newPage(),soloErrors=[];solo.on('pageerror',e=>soloErrors.push(e.message));
  await solo.goto(new URL('../gameplay/?verify='+manifest.sourceCommit,url).href,{waitUntil:'networkidle'});
  await solo.getByRole('button',{name:'Continue →',exact:true}).click();await solo.waitForTimeout(600);
  const first=await solo.locator('#game').evaluate(c=>c.toDataURL());
  await solo.keyboard.down('d');await solo.waitForTimeout(300);await solo.keyboard.up('d');
  assert.notEqual(await solo.locator('#game').evaluate(c=>c.toDataURL()),first,'Single player continues drawing after input');
  await solo.locator('#pause').click();assert(await solo.locator('#pause-menu').isVisible());
  await solo.locator('#resume').click();assert(!await solo.locator('#pause-menu').isVisible());
  // Resuming can resize/clear the canvas before the next animation frame.
  // Wait for actual world pixels, so a blank canvas cannot pass this check.
  await solo.waitForFunction(()=>{
   const c=document.querySelector('#game'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   let samples=0,colored=0;for(let i=0;i<d.length;i+=4000){samples++;if(d[i]+d[i+1]+d[i+2]>30)colored++;}
   return samples>0&&colored>samples*.1;
  });
  assert.deepEqual(soloErrors,[]);await solo.screenshot({path:dir+'/single-player.png',fullPage:true});
  report.checks.push('Single-player saved hero loads, responds to input, pauses and resumes without exceptions');
  await soloContext.close();
  report.passed=true;
 }finally{await browser.close();}
})().catch(e=>{report.failure=e.stack;process.exitCode=1;}).finally(()=>{fs.writeFileSync(dir+'/browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));});
