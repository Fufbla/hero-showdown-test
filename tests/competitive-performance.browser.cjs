const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),serve=require('./competitive-server.cjs');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
(async()=>{
 const out=process.env.COMPETITIVE_QA_DIR||path.join(__dirname,'../competitive-qa');fs.mkdirSync(out,{recursive:true});
 const server=await serve(path.resolve(__dirname,'..')),browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(server.url+'playable-villains-test.html');await page.waitForFunction(()=>HealthiaCompetitive.ready());await page.evaluate(()=>HealthiaIntro.dismiss());await page.waitForTimeout(250);
 const scenarios=[{ids:['summy','wastelander'],venue:0},{ids:['venomis','venomis'],venue:1},{ids:['atomdust','spree'],venue:2},{ids:['air','styrodog'],venue:3},{ids:['bushman','sonic'],venue:4}];const results=[];
 for(const scenario of scenarios){
  const result=await page.evaluate(async scenario=>{
   HealthiaCompetitive.beginMatch({...scenario,kind:'local'});const w=HealthiaCompetitive.session.world;w.fighters.forEach(f=>{f.control='cpu';f.power=100;f.charge=4;});w.fighters[0].x=450;w.fighters[1].x=750;
   const original=draw,costs=[],intervals=[];draw=function(){const start=performance.now();try{return original();}finally{costs.push(performance.now()-start);}};
   await new Promise(resolve=>{let last=0,n=0;function measure(ms){if(last)intervals.push(ms-last);last=ms;if(++n>=151)resolve();else requestAnimationFrame(measure);}requestAnimationFrame(measure);});draw=original;
   const stats=a=>{a=a.slice(30).sort((x,y)=>x-y);return {mean:a.reduce((x,y)=>x+y,0)/a.length,median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],samples:a.length};};
   return {scenario,drawMs:stats(costs),frameMs:stats(intervals),fighters:w.fighters.map(f=>({id:f.id,hp:f.hp,x:f.x})),status:w.status};
  },scenario);
  results.push(result);console.log(JSON.stringify(result));assert.ok(result.fighters.every(f=>Number.isFinite(f.hp)&&Number.isFinite(f.x)));assert.equal(result.drawMs.samples>0,true);
 }
 await browser.close();await server.close();const report={environment:'Headless Chromium; Linux; 1280×800; GPU disabled. Timing is not a physical-device FPS certification.',results,errors};fs.writeFileSync(path.join(out,'performance-results.json'),JSON.stringify(report,null,2));assert.deepEqual(errors,[]);
})().catch(e=>{console.error(e);process.exit(1);});
