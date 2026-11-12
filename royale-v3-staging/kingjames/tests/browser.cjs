// Browser regression for the actual staging entry; uses the reserved local test only.
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const origin=process.env.KINGJAMES_TEST_ORIGIN||'http://127.0.0.1:8174';
const exercisePowers=require('./browser-powers.cjs');
const namespace='royale-v2-prototype-0000000000:healthia.royale.profiles.v2';
const report=[];
async function check(type,mode){
 const mobile=mode!=='desktop',viewport=mode==='portrait'?{width:390,height:844}:mode==='landscape'?{width:844,height:390}:{width:1280,height:900};
 const browser=await type.launch({headless:true});
 const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1});
 const page=await context.newPage(),errors=[],cloudRequests=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(r.url().includes('supabase.co/functions/'))cloudRequests.push(r.url());});
 try{
  await page.goto(origin+'/royale-v3-staging/?spriteQA=1',{waitUntil:'domcontentloaded'});
  await page.locator('#enter').click();await page.locator('#input').fill('0000000000');await page.locator('#load').click();
  const element=await page.locator('#game-frame').elementHandle();const frame=await element.contentFrame();
  await frame.waitForFunction(()=>{const d=document.querySelector('#game')?.dataset;return d?.outfit==='kingjames-original'&&d.artReady==='true'&&d.inputEnabled==='true';},null,{timeout:90000});
  const initial=await frame.evaluate(()=>window.kingJamesQA.status());
  assert.equal(initial.name,'KingJames');assert.equal(initial.ready,true);
  if(mobile){const box=await page.locator('#game-frame').boundingBox();assert.ok(box.y>=0&&box.y+box.height<=viewport.height+1,'Mobile game extends outside viewport');}
  const advance=async seconds=>{
   const until=Number(await frame.locator('#game').getAttribute('data-simulation-time'))+seconds;
   await frame.waitForFunction(t=>Number(document.querySelector('#game').dataset.simulationTime)>=t,until,{timeout:30000});
  };
  await frame.locator('#game').click();
  await page.keyboard.down('Shift');await page.keyboard.down('ArrowRight');await advance(.8);await page.keyboard.up('ArrowRight');await page.keyboard.up('Shift');
  await advance(.2);
  await page.keyboard.down('Shift');await page.keyboard.down('ArrowLeft');await advance(.8);await page.keyboard.up('ArrowLeft');await page.keyboard.up('Shift');
  await advance(.25);
  await page.keyboard.press('Space');await advance(.1);await page.keyboard.press('Space');await advance(1.05);
  await page.keyboard.press('j');await advance(.33);await page.keyboard.press('k');await advance(.45);
  if(mobile){
   await frame.getByRole('button',{name:'Jump',exact:true}).tap();await advance(.9);
   await frame.getByRole('button',{name:'Punch',exact:true}).tap();await advance(.32);
   await frame.getByRole('button',{name:'Kick',exact:true}).tap();await advance(.43);
  }
  const seen=(await frame.locator('#game').getAttribute('data-sprite-seen')).split(',');
  for(const action of ['idle','run','jump','doubleJump','fall','land','punch','kick'])assert.ok(seen.some(s=>s.startsWith(action+':')),type.name()+'/'+mobile+' did not render '+action);
  for(const dir of [-1,1])assert.ok(seen.filter(s=>s.startsWith('run:')&&s.endsWith(':'+dir)).length>=5,'Insufficient alternating run frames '+dir);
  const powers=await exercisePowers(frame,page,advance,type.name()+'-'+mode,initial.snapshot);
  // The released game prevents saves until five seconds after combat.
  // Let that normal cooldown elapse before pausing the simulation.
  await frame.waitForFunction(()=>window.kingJamesQA.status().snapshot!==null,null,{timeout:30000});
  const after=await frame.evaluate(()=>{window.kingJamesQA.pause();window.kingJamesQA.save();return window.kingJamesQA.status();});
  for(const key of ['level','xp','coins','inventory','powers','look','cosmetics'])assert.deepEqual(after.snapshot[key],initial.snapshot[key],'Unexpected progress/appearance change '+key);
  const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),namespace);assert.ok(saved.slots.some(s=>s?.snapshot.look.name==='KingJames'));
  await page.reload();await page.locator('#enter').click();await page.locator('#input').fill('0000000000');await page.locator('#load').click();
  const fresh=await page.locator('#game-frame').elementHandle();const restored=await fresh.contentFrame();
  await restored.waitForFunction(()=>document.querySelector('#game')?.dataset.outfit==='kingjames-original');
  const recovered=await restored.evaluate(()=>window.kingJamesQA.status().snapshot);
  for(const key of ['level','xp','coins','inventory','powers','look','cosmetics'])assert.deepEqual(recovered[key],after.snapshot[key]);
  assert.equal(cloudRequests.length,0,'Reserved test contacted cloud account endpoints');assert.deepEqual(errors,[]);
  const file='kingjames-'+type.name()+'-'+mode+'.png';
  await page.screenshot({path:'/tmp/'+file,fullPage:true});
  report.push({engine:type.name(),mode,viewport,powers,verified:['reserved-code-load','idle','both-run-directions','jump','doubleJump','fall','land','punch','kick','progress-reload','no-cloud-write'],seen,errors});
  console.log(JSON.stringify(report.at(-1)));
 }catch(error){
  const tag=type.name()+'-'+mode;
  const diagnostics=await page.frames().at(-1).evaluate(()=>({data:{...document.querySelector('#game')?.dataset},status:window.kingJamesQA?.status()})).catch(()=>null);
  fs.writeFileSync('/tmp/kingjames-failure-'+tag+'.json',JSON.stringify({error:error.message,diagnostics,errors},null,2));
  await page.screenshot({path:'/tmp/kingjames-failure-'+tag+'.png',fullPage:true}).catch(()=>{});throw error;
 }finally{await browser.close();}
}
(async()=>{for(const type of [chromium,webkit])for(const mode of ['desktop','portrait','landscape'])await check(type,mode);fs.writeFileSync('/tmp/kingjames-browser-report.json',JSON.stringify(report,null,2));})().catch(e=>{console.error(e);process.exitCode=1;});
