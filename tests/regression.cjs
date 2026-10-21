// npm install playwright; TEST_BROWSER=/path/to/chromium node tests/regression.cjs
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('path');
const root=path.resolve(__dirname,'..');
const server=require('child_process').spawn('python',['-m','http.server','8766','--bind','127.0.0.1','--directory',root]);
let browser,checks=0;const ok=(v,msg)=>{assert.ok(v,msg);checks++};
(async()=>{await new Promise(r=>setTimeout(r,500));browser=await chromium.launch({headless:true,executablePath:process.env.TEST_BROWSER||undefined,args:['--no-sandbox','--disable-gpu']});
for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
 const page=await browser.newPage({viewport,hasTouch:true}),errors=[],failed=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url())});
 await page.addInitScript(()=>{window.testPad={index:0,connected:true,mapping:'standard',axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};navigator.getGamepads=()=>[window.testPad];});
 await page.goto('http://127.0.0.1:8766/hero-showdown-test-github-upload/');await page.waitForFunction(()=>loaded);
 const press=async(i)=>{await page.evaluate(i=>{testPad.buttons[i]={pressed:true,value:1};pollPad()},i);await page.evaluate(i=>{testPad.buttons[i]={pressed:false,value:0};pollPad()},i)};
 await press(0);ok(await page.evaluate(()=>mode==='select'),'A opens hero selection');
 await press(15);ok(await page.evaluate(()=>menuFocusElement.dataset.hero==='1'),'D-pad moves right');
 ok(await page.evaluate(()=>getComputedStyle(menuFocusElement).outlineStyle==='solid'),'controller highlight visible');
 await press(0);ok(await page.evaluate(()=>selected===1),'A selects hero');
 await page.locator('[data-hero="2"]').tap();await press(14);ok(await page.evaluate(()=>menuFocusElement.dataset.hero==='1'),'controller resumes after touch');
 await page.locator('[data-hero="0"]').click();await press(15);ok(await page.evaluate(()=>menuFocusElement.dataset.hero==='1'),'controller resumes after mouse');
 await page.evaluate(()=>{testPad.axes=[1,0];pollPad()});await page.waitForTimeout(520);await page.evaluate(()=>{testPad.axes=[0,0];pollPad()});ok(await page.evaluate(()=>menuFocusElement!==null),'held analog navigation');
 // Every button must be reachable by directional navigation in each layout.
 for(const screen of ['showTitle','showSelect','showOpponent','showVenue']){
  await page.evaluate(s=>window[s](),screen);await page.waitForTimeout(30);
  const unreachable=await page.evaluate(()=>{const all=padMenuButtons(),seen=new Set(),queue=[all.find(b=>overlay.contains(b))];while(queue.length){const el=queue.shift();if(seen.has(el))continue;seen.add(el);for(const dir of ['left','right','up','down']){menuHighlight(el);menuNavigate(dir);if(!seen.has(menuFocusElement))queue.push(menuFocusElement)}}return all.filter(b=>!seen.has(b)).map(b=>b.id||b.textContent.slice(0,30))});ok(unreachable.length===0,screen+' unreachable: '+unreachable.join(','));
 }
 await page.evaluate(()=>showOpponent());await page.waitForTimeout(20);await press(15);await press(0);ok(await page.evaluate(()=>opponent===1),'opponent confirm');
 await page.evaluate(()=>menuHighlight(document.getElementById('sound')));const mutedBefore=await page.evaluate(()=>muted);await press(0);ok(await page.evaluate(()=>muted)!==mutedBefore,'sound setting');
 await page.evaluate(()=>menuHighlight(document.getElementById('help')));await press(0);ok(await page.locator('#closehelp').count()===1,'help opens');await press(8);ok(await page.locator('#closehelp').count()===0,'help closes');
 await page.evaluate(()=>{showVenue();menuHighlight(document.getElementById('startvenue'))});await press(0);ok(await page.evaluate(()=>mode==='fight'),'venue begins fight');await press(9);ok(await page.evaluate(()=>paused),'Start pauses');await page.evaluate(()=>menuHighlight(document.getElementById('resume')));await press(0);ok(await page.evaluate(()=>!paused),'A resumes');
 // Record controller actions without changing combat mapping.
 const mapping=await page.evaluate(()=>{const old=action,events=[];action=k=>events.push(k);for(const i of [0,2,3,5,1]){testPad.buttons[i].pressed=true;pollPad();testPad.buttons[i].pressed=false;pollPad()}action=old;return events});ok(JSON.stringify(mapping)===JSON.stringify(['jump','punch','kick','special','special']),'combat mapping');
 await page.evaluate(()=>{testPad.buttons[4].pressed=true;pollPad()});ok(await page.evaluate(()=>padHeld.block),'LB block');await page.evaluate(()=>{testPad.buttons[4].pressed=false;pollPad();navigator.getGamepads=()=>[];pollPad()});ok(await page.evaluate(()=>!padHeld.block),'disconnect clears input');
 ok(errors.length===0,'browser errors: '+errors.join(';'));ok(failed.length===0,'asset failures');await page.close();
}
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8766/hero-showdown-test-github-upload/');await page.waitForFunction(()=>loaded);await page.evaluate(()=>{muted=true});
for(let o=0;o<8;o++)for(let v=0;v<3;v++){
 const state=await page.evaluate(({o,v})=>{opponent=o;venue=v;start();for(let i=0;i<720;i++){hero.inv=10;update(1/60);if(i%12===0)draw()}return {hp:hero.hp,x:boss.x,count:villainNames.length,venues:venueNames.length}}, {o,v});ok(Number.isFinite(state.x)&&state.hp>0&&state.hp<=100&&state.count===8&&state.venues===3,`fight ${o} venue ${v}: ${JSON.stringify(state)}`);
}
for(const type of ['crush','spikes','double']){
 const s=await page.evaluate(type=>{opponent=4;start();phase=2;boss.type=type;boss.state='warn';boss.dir=-1;boss.startX=boss.x;boss.target=600;boss.timer=type==='double'?1.45:type==='spikes'?1:.85;boss.struck=false;boss.volley=0;hero.x=600;let maxFoam=0;for(let i=0;i<340;i++){hero.inv=10;updateDrStyro(1/60);maxFoam=Math.max(maxFoam,boss.styroVisual.foam.length);drawDrStyro()}return {state:boss.state,finite:Number.isFinite(boss.x),maxFoam}},type);ok(s.finite&&s.maxFoam<=90&&s.maxFoam>0,type+' cycle and bounded particles');
}
const recoil=await page.evaluate(()=>{opponent=4;start();updateDrStyro(1/60);hitBoss(20,1,5,'kick');const before=boss.x;for(let i=0;i<8;i++)update(1/60);return boss.styroRecoil>0&&boss.x>before});ok(recoil,'Styro hit recoil and knockback');
await page.evaluate(()=>{opponent=4;start();updateDrStyro(1/60);paused=true;draw()});await page.screenshot({path:process.env.TEST_SCREENSHOT||'/tmp/showdown-styro.png'});
ok(errors.length===0,'fight errors '+errors.join(';'));console.log(`${checks} browser regression checks passed`);
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();server.kill()});
