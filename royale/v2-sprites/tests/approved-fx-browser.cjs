// Verifies V2 approved artwork is actually visible in the shipped PNG,
// not just present as an unused file path or a synthetic canvas unit test.
const {chromium}=require('playwright');
const {mkdir}=require('node:fs/promises');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:850}});
  await page.goto('http://127.0.0.1:8174/royale/v2-sprites/approved/README.md');
  const report=await page.evaluate(async()=>{
   const {approvedPaintedPowerFX}=await import('/royale/v2-sprites/approved-effects.mjs');
   if(!await approvedPaintedPowerFX.preload())throw Error('Atlas failed to load: '+approvedPaintedPowerFX.error);
   const names=Array.from(approvedPaintedPowerFX.images.entries());
   const counts=Object.fromEntries(names.map(([key,layer])=>[key,layer.count]));
   const canvas=document.createElement('canvas');canvas.width=1120;canvas.height=760;
   const ctx=canvas.getContext('2d');
   ctx.fillStyle='#122a2d';ctx.fillRect(0,0,1120,760);
   ctx.fillStyle='#ebedd5';ctx.font='15px sans-serif';
   for(let i=0;i<names.length;i++){
    const [name,layer]=names[i],column=i%5,row=Math.floor(i/5);
    const x=15+column*220,y=22+row*236;
    ctx.save();ctx.translate(x,y);
    ctx.fillStyle='#f8ead9';ctx.fillText(name+' '+layer.count,0,14);
    ctx.drawImage(layer.canvas,8,27,185,185);
    ctx.restore();
   }
   document.body.innerHTML='';document.body.style.margin='0';
   document.body.append(canvas);
   return counts;
  });
  console.log('APPROVED SPRITE EXTRACTION COUNTS:',JSON.stringify(report));
  const nonempty=Object.entries(report).filter(([,count])=>count>=30).map(([name])=>name);
  console.log('VISIBLE RESTORED ARTWORK:',nonempty.join(', '));
  assert.ok(nonempty.includes('roots'),'approved roots art absent');
  assert.ok(nonempty.includes('whirlwind'),'approved whirlwind art absent');
  assert.ok(nonempty.includes('steel'),'approved steel art absent');
  assert.ok(nonempty.includes('fireball-release')||nonempty.includes('fireball-charge'),'approved fireball art absent');
  assert.ok(nonempty.length>=9,'too many approved power illustrations became invisible');
  await mkdir('visual-artifacts',{recursive:true});
  await page.screenshot({path:'visual-artifacts/restored-approved-power-fx.png'});
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
