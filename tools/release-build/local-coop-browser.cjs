// Exercise the shipped page with two isolated accounts. All cloud traffic is
// intercepted: no real player accounts, credentials, or saves are used.
const {chromium}=require('playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const url=process.env.ROYALE_COOP_URL||'https://fufbla.github.io/hero-showdown-test/royale/local-coop/';
const report={url,errors:[],rejections:[],requests:[],checks:[],physicalControllers:false};
const dir='docs/local-coop-startup-20261113';fs.mkdirSync(dir,{recursive:true});
(async()=>{
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
  await page.goto(url,{waitUntil:'networkidle',timeout:120000});
  for(let i=0;i<2;i++){
   const card=page.locator('.player-card').nth(i);
   await page.locator('#code-'+i).fill(accounts[i].code);
   await card.getByRole('button',{name:'Load Heroes',exact:true}).click();
   await card.locator('.hero-choice').filter({hasText:i?'Coop QA Nova':'Coop QA Atlas'}).click({timeout:60000});
   await card.getByRole('button',{name:'Ready',exact:true}).click();
  }
  await page.locator('#start').click();
  await page.waitForTimeout(4000);
  report.text=await page.locator('body').innerText();
  report.rejections=await page.evaluate(()=>window.__rejections);
  await page.screenshot({path:dir+'/browser.png',fullPage:true});
  assert.deepEqual(report.errors,[],'No exception in the first gameplay frames');
  assert.deepEqual(report.rejections,[],'No rejected initialization promises');
  assert(await page.locator('#play').isVisible(),'Both heroes entered gameplay');
  report.checks.push('Two separate accounts and saved slots entered gameplay');
 }finally{await browser.close();}
})().catch(e=>{report.failure=e.stack;process.exitCode=1;}).finally(()=>{fs.writeFileSync(dir+'/browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));});
