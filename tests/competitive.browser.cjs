const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const serve=require('./competitive-server.cjs'),Data=require('../assets/competitive/roster.js');
const output=process.env.COMPETITIVE_QA_DIR||path.join(__dirname,'../competitive-qa');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const server=await serve(path.resolve(__dirname,'..'));
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const page=await browser.newPage({viewport:{width:1440,height:1000},hasTouch:true});const checks=[],errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.stack));page.on('response',r=>{if(r.status()>=400)requests.push(r.status()+' '+r.url());});
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;window.testPads=[];Object.defineProperty(navigator,'getGamepads',{value:()=>testPads});});
 await page.goto(server.url+'playable-villains-test.html');await page.waitForFunction(()=>loaded&&HealthiaCompetitive.ready());await page.evaluate(()=>{HealthiaIntro.dismiss();pollPad();showModeSelect();});await page.waitForTimeout(250);
 async function check(name,fn){try{await fn();checks.push({name,pass:true});console.log('PASS',name);}catch(e){checks.push({name,pass:false,error:e.stack});console.log('FAIL',name,e.message);}}
 const start=async(ids=['wastelander','bushman'],venue=0,kind='local')=>{await page.evaluate(o=>{HealthiaCompetitive.beginMatch(o);draw();},{ids,venue,kind});};
 const advance=async(seconds)=>page.evaluate(seconds=>{for(let i=0;i<Math.ceil(seconds*120);i++)update(1/120);draw();},seconds);
 const read=()=>page.evaluate(()=>HealthiaCompetitive.session.world.fighters.map(f=>({id:f.id,hp:f.hp,x:f.x,y:f.y,state:f.state,charge:f.charge,power:f.power})));
 await check('Versus menu provides competitive CPU, local PvP and original co-op',async()=>{await page.locator('#versus-mode').click();for(const id of ['competitive-cpu','competitive-local','competitive-boss'])assert.equal(await page.locator('#'+id).count(),1);});
 await check('all 12 portraits load and each side can select all 12 fighters',async()=>{
   await page.locator('#competitive-local').click();assert.equal(await page.locator('[data-fighter]').count(),12);
   for(const side of [0,1]){for(const c of Data.roster){await page.locator('[data-fighter="'+c.id+'"]').click();assert.equal(await page.locator('[data-fighter="'+c.id+'"]').getAttribute('aria-pressed'),'true');}assert.equal(await page.evaluate(()=>Array.from(document.querySelectorAll('[data-fighter] img')).every(i=>i.complete&&i.naturalWidth>0)),true);if(!side)await page.locator('#competitive-next').click();}
   await page.screenshot({path:path.join(output,'roster-desktop.png')});
 });
 await check('all existing venues appear and selection starts a 100 HP mirror match',async()=>{await page.locator('#competitive-next').click();assert.equal(await page.locator('[data-competitive-venue]').count(),5);await page.locator('[data-competitive-venue="0"]').click();await page.locator('#competitive-start').click();assert.deepEqual((await read()).map(f=>[f.id,f.hp]),[['bushman',100],['bushman',100]]);});
 for(const c of Data.roster)await check(c.name+' renders independent mirror states, every attack and both facing directions',async()=>{
   await start([c.id,c.id]);await page.evaluate(()=>{const w=HealthiaCompetitive.session.world;w.fighters[0].x=400;w.fighters[1].x=850;});
   for(const key of ['punch','heavyPunch','kick','heavyKick','sweep','uppercut','shoot','skill','special']){
     await start([c.id,c.id]);
     await page.evaluate(key=>{const w=HealthiaCompetitive.session.world;for(const f of w.fighters){f.action=null;f.stun=0;f.guardStun=0;f.knockdown=0;f.hp=100;f.power=100;f.charge=4;f.cooldowns={};HealthiaCompetitive.Combat.begin(w,f,key);}draw();},key);
     await advance(.13);await advance(.30);await advance(.4);await advance(.7);
   }
   await start([c.id,c.id]);await advance(.05);
   await page.screenshot({path:path.join(output,c.id+'-mirror.png')});
 });
 await check('keyboard movement, both players, double jump, heavy attacks and tap edges',async()=>{
   await start();await page.keyboard.down('d');await page.keyboard.down('ArrowLeft');await advance(.3);await page.keyboard.up('d');await page.keyboard.up('ArrowLeft');let f=await read();assert.ok(f[0].x>340&&f[1].x<940);
   await page.keyboard.press('w');await advance(.02);assert.equal(await page.evaluate(()=>HealthiaCompetitive.session.world.fighters[0].jumps),1);await page.keyboard.press('w');await advance(.02);assert.equal(await page.evaluate(()=>HealthiaCompetitive.session.world.fighters[0].jumps),2);
   await start();await page.keyboard.down('ShiftLeft');await page.keyboard.press('f');await page.keyboard.up('ShiftLeft');await advance(.01);assert.equal(await page.evaluate(()=>HealthiaCompetitive.session.world.fighters[0].action.key),'heavyPunch');
   await page.keyboard.press('u');await advance(.3);assert.ok(await page.evaluate(()=>HealthiaCompetitive.session.world.projectiles.some(p=>p.owner===1)));
 });
 await check('double-tap dash is directional and has recovery cooldown',async()=>{await start(['atomdust','bushman']);await page.keyboard.press('d');await advance(.05);await page.keyboard.down('d');await advance(.06);await page.keyboard.up('d');const r=await page.evaluate(()=>{const f=HealthiaCompetitive.session.world.fighters[0];return [f.dashCd,f.evade,f.x];});assert.ok(r[0]>1&&r[1]>0&&r[2]>370);});
 await check('two controllers have separate fighters, action edges and pause',async()=>{
   await start(['spree','wastelander']);await page.evaluate(()=>{testPads=[0,1].map(index=>({index,connected:true,axes:[0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))}));testPads[0].axes[0]=1;testPads[1].axes[0]=-1;pollPad();});await advance(.2);let f=await read();assert.ok(f[0].x>340&&f[1].x<940,JSON.stringify({f,inputs:await page.evaluate(()=>({pads:HealthiaCompetitive.session.pads,slots:HealthiaCompetitive.session.padSlots,mode,paused}))}));
   await page.evaluate(()=>{testPads.forEach(p=>p.axes[0]=0);testPads[0].buttons[6].pressed=true;testPads[1].buttons[1].pressed=true;pollPad();});await advance(.5);assert.ok(await page.evaluate(()=>HealthiaCompetitive.session.world.fighters[0].invisible>0));assert.ok(await page.evaluate(()=>HealthiaCompetitive.session.world.projectiles.some(p=>p.owner===1)));
   await page.evaluate(()=>{testPads[0].buttons[9].pressed=true;pollPad();});assert.equal(await page.evaluate(()=>paused),true);await page.locator('#competitive-resume').click();await page.evaluate(()=>{testPads=[];pollPad();});
 });
 await check('CPU Easy, Medium and Hard all start at 100 HP and attack through competitive rules',async()=>{
   for(const level of ['easy','medium','hard']){await page.evaluate(level=>{HealthiaCompetitive.beginMatch({ids:['bushman','wastelander'],kind:'cpu',difficulty:level});const w=HealthiaCompetitive.session.world;w.random=()=>.3;w.fighters[0].x=540;w.fighters[1].x=690;},level);assert.deepEqual((await read()).map(f=>f.hp),[100,100]);await advance(8);assert.ok((await read())[0].hp<100);}
 });
 await check('Harbor and Tempest render and damage both fighters symmetrically',async()=>{
   await start(['styro','styro'],3);await page.evaluate(()=>{const w=HealthiaCompetitive.session.world;w.fighters.forEach(f=>f.x=640);Object.assign(harborHazard.state,{phase:'strike',age:HealthiaHarborCore.timing.strike-.005,x:640});});await advance(.01);assert.deepEqual((await read()).map(f=>f.hp),[82,82]);
   await page.screenshot({path:path.join(output,'harbor-hazard.png')});
   await start(['sonic','sonic'],4);await page.evaluate(()=>{const w=HealthiaCompetitive.session.world;w.fighters[0].x=500;w.fighters[1].x=650;Object.assign(tempestHazard.state,{phase:'sweep',age:1.2,x:tempestHazard.sweepX(1.2),direction:1});HealthiaCompetitive.session.keyboard[1].block=true;});await advance(1.1);assert.deepEqual((await read()).map(f=>f.hp),[82,100]);await page.screenshot({path:path.join(output,'tempest-hazard.png')});
 });
 await check('victory, defeat, rematch and fighter reselection are stable',async()=>{
   for(const winner of [0,1]){await start(['air','vee']);await page.evaluate(winner=>{const w=HealthiaCompetitive.session.world;w.fighters[1-winner].hp=0;HealthiaCompetitive.Combat.settle(w);},winner);await advance(1.2);assert.equal(await page.locator('#competitive-rematch').count(),1);await page.locator('#competitive-rematch').click();assert.deepEqual((await read()).map(f=>f.hp),[100,100]);}
   await page.evaluate(()=>{const w=HealthiaCompetitive.session.world;w.fighters[1].hp=0;HealthiaCompetitive.Combat.settle(w);});await advance(1.2);await page.locator('#competitive-reselect').click();assert.equal(await page.locator('[data-fighter]').count(),12);
 });
 await check('touch buttons and analog operate in a phone viewport, including short taps',async()=>{
   await page.setViewportSize({width:844,height:390});await start(['bushman','spree'],0,'cpu');await page.evaluate(()=>{HealthiaCompetitive.session.world.fighters[1].control='human';showBattleTouch();layoutBattleControls();draw();});
   await page.locator('[data-key="jump"]').tap();await advance(.02);assert.equal(await page.evaluate(()=>HealthiaCompetitive.session.world.fighters[0].jumps),1);
   await start(['bushman','spree'],0,'cpu');await page.evaluate(()=>{HealthiaCompetitive.session.world.fighters[1].control='human';showBattleTouch();layoutBattleControls();draw();});await page.locator('[data-key="shoot"]').tap();await advance(.3);assert.ok(await page.evaluate(()=>HealthiaCompetitive.session.world.projectiles.some(p=>p.owner===0)));
   await advance(.5);await page.locator('[data-key="heavy"]').tap();await page.locator('[data-key="punch"]').tap();await advance(.01);assert.equal(await page.evaluate(()=>HealthiaCompetitive.session.world.fighters[0].action.key),'heavyPunch');
   await page.screenshot({path:path.join(output,'mobile-landscape.png')});
   const analog=await page.locator('#analog').boundingBox();await page.dispatchEvent('#analog','pointerdown',{pointerId:77,pointerType:'touch',clientX:analog.x+analog.width*.9,clientY:analog.y+analog.height*.5,bubbles:true});await advance(.8);await page.dispatchEvent('#analog','pointerup',{pointerId:77,pointerType:'touch',bubbles:true});assert.equal(await page.evaluate(()=>!!touchHeld.right),false);
 });
 await check('portrait roster remains scrollable with reachable navigation',async()=>{await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{HealthiaCompetitive.session.world=null;HealthiaCompetitive.choose(0);draw();});await page.locator('[data-fighter="bushman"]').tap();await page.locator('#competitive-next').tap();assert.equal(await page.evaluate(()=>HealthiaCompetitive.session.selectionSide),1);await page.screenshot({path:path.join(output,'mobile-roster.png')});});
 await check('returning to original Story retains 650 HP bosses and all chapter modules',async()=>{
   await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>{showModeSelect();showStorySelect();story.battle=1;startStoryFight();});assert.equal(await page.evaluate(()=>HealthiaCompetitive.session.active),false);assert.equal(await page.evaluate(()=>boss.max),650);assert.equal(await page.evaluate(()=>hero.hp),100);assert.ok(await page.evaluate(()=>typeof HealthiaCave==='object'&&typeof HealthiaShoreCore==='object'));
 });
 await check('co-op boss mode still initializes original two heroes and boss health',async()=>{
   await page.evaluate(()=>{showModeSelect();coChooseMode();});await page.locator('#competitive-boss').click();await page.locator('#co-local').click();await page.evaluate(()=>{coop.kind='local';coop.choices=[0,1];selected=0;opponent=5;start();});assert.equal(await page.evaluate(()=>HealthiaCompetitive.session.active),false);assert.equal(await page.evaluate(()=>coop.players.length),2);assert.equal(await page.evaluate(()=>boss.max),1000);
 });
 await check('base production entries never load the competitive feature',async()=>{for(const file of ['index.html','hero-showdown.html']){const content=fs.readFileSync(path.join(__dirname,'..',file),'utf8');assert.equal(content.includes('assets/competitive/'),false);}});
 await browser.close();await server.close();fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify({checks,errors,requests},null,2));console.log(JSON.stringify({total:checks.length,failed:checks.filter(c=>!c.pass),errors,requests},null,2));if(checks.some(c=>!c.pass)||errors.length||requests.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1);});
