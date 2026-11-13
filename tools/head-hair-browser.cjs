// CI-only browser regression. The reserved account is local to each isolated
// browser context; this test never writes to a real player's cloud account.
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const origin=process.env.KINGJAMES_TEST_ORIGIN||'http://127.0.0.1:8174';
const report=[];
(async()=>{
 for(const type of [chromium,webkit]){
  const browser=await type.launch({headless:true}),mobile=type===webkit;
  try{
   const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1});
   const page=await context.newPage(),errors=[],cloud=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('request',r=>{if(r.url().includes('supabase.co/functions/'))cloud.push(r.url());});
   await page.goto(origin+'/royale-v3-staging/costumes/review.html');
   await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('10 of 10'),null,{timeout:90000});
   const checks=await page.evaluate(async()=>{
    const [{costumeSprites:e},{COSTUMES},{OutfitEngine,OUTFITS,STEEL_ID},{styleCDefault},{HAIR_STYLES}]=await Promise.all([
     import('/royale-v3-staging/costumes/engine.mjs'),import('/royale-v3-staging/costumes/catalog.mjs'),
     import('/royale-v3-staging/kingjames/outfit-engine.mjs'),import('/royale/style-c-defaults.mjs'),import('/royale/appearance.mjs')]);
    const canvas=()=>Object.assign(document.createElement('canvas'),{width:256,height:256}),body=canvas(),head=canvas(),bc=body.getContext('2d',{willReadFrequently:true}),hc=head.getContext('2d',{willReadFrequently:true});
    const engine=new OutfitEngine(),results={attachedFrames:0,containedCombinations:0,visibleHair:0};
    for(const id of Object.keys(OUTFITS).filter(id=>id!==STEEL_ID)){
     if(!await engine.preload(id))throw Error(engine.error);const {manifest:m,atlases}=engine.outfits.get(id);
     for(const [index,f]of m.frames.entries()){
      bc.clearRect(0,0,256,256);bc.drawImage(atlases[f.atlas||'default'],...f.rect,0,0,256,256);const b=bc.getImageData(0,0,256,256).data;
      for(const sex of ['male','female']){
       hc.clearRect(0,0,256,256);engine.head.draw(hc,{...styleCDefault(sex),hair:'none',facialHair:'none'},f.head,m.head.scale);const h=hc.getImageData(0,0,256,256).data;let touching=0;
       for(let y=Math.max(0,Math.floor(f.head[1]-8));y<=Math.min(255,Math.ceil(f.head[1]+8));y++)for(let x=Math.max(0,Math.floor(f.head[0]-8));x<=Math.min(255,Math.ceil(f.head[0]+8));x++){
        const i=(y*256+x)*4;if(b[i+3]>=128&&h[i+3]>=128)touching++;
       }
       if(touching<2)throw Error('Detached '+id+' frame '+index+' '+sex);results.attachedFrames++;
      }
     }
     engine.outfits.delete(id);
    }
    const pixels=c=>c.getContext('2d').getImageData(0,0,256,256).data,look={...styleCDefault('female'),facialHair:'none'};
    for(const o of COSTUMES.filter(o=>o.hideHair))for(let frame=0;frame<48;frame++){
     const bare=pixels(e.compose(o.id,frame,{...look,hair:'none'})),mask=pixels(e.masks(o.id,frame).mask);
     const styles=frame===0?HAIR_STYLES:['braids','ponytail','long-straight','bun','short'];
     for(const hair of styles){
      const custom={...look,hair},before=JSON.stringify(custom),drawn=pixels(e.compose(o.id,frame,custom));let changed=0;
      for(let i=0;i<drawn.length;i+=4)if(drawn[i]!==bare[i]||drawn[i+1]!==bare[i+1]||drawn[i+2]!==bare[i+2]||drawn[i+3]!==bare[i+3]){
       if(!mask[i+3])throw Error('Hair escaped '+o.id+' frame '+frame+' '+hair);changed++;
      }
      if(hair==='braids'&&changed<20)throw Error('Braids disappeared from '+o.id+' '+frame);
      if(JSON.stringify(custom)!==before)throw Error('Appearance mutated');results.containedCombinations++;if(changed)results.visibleHair++;
     }
    }
    return results;
   });
   await page.locator('#sex').selectOption('female');await page.locator('#beard').uncheck();
   for(const motion of ['idle','run','jump','doubleJump','punch','kick','strength','superKick','fireball','flight']){
    await page.locator('#motion').selectOption(motion);
    const first=await page.locator('#grid canvas').first().evaluate(c=>c.toDataURL());
    await page.waitForFunction(before=>document.querySelector('#grid canvas').toDataURL()!==before,first);
   }
   await page.locator('#motion').selectOption('idle');
   await page.screenshot({path:'/tmp/head-hair-'+type.name()+'-costumes.png',fullPage:true});
   await page.locator('#direction').click();await page.screenshot({path:'/tmp/head-hair-'+type.name()+'-left.png',fullPage:true});
   async function login(){
    await page.goto(origin+'/royale-v3-staging/?spriteQA=1');
    await page.locator('#enter').click();await page.locator('#input').fill('0000000000');await page.locator('#load').click();
    const frame=await(await page.locator('#game-frame').elementHandle()).contentFrame();
    await frame.waitForFunction(()=>window.kingJamesQA?.status().ready&&document.querySelector('#game')?.dataset.artReady==='true',null,{timeout:90000});
    return frame;
   }
   let frame=await login();await frame.evaluate(()=>{window.kingJamesQA.pause();window.kingJamesQA.save();});
   const namespace='royale-v2-prototype-0000000000:healthia.royale.profiles.v2';
   // Fixture setup exercises the ordinary existing saved-look decoder.
   await page.evaluate(key=>{
    const profile=JSON.parse(localStorage.getItem(key)),slot=profile.slots.find(s=>s?.snapshot.look.name==='KingJames');
    if(!slot)throw Error('Reserved test slot missing');
    Object.assign(slot.snapshot.look,{presentation:'female',hair:'braids',facialHair:'none'});localStorage.setItem(key,JSON.stringify(profile));
   },namespace);
   frame=await login();
   const before=await frame.evaluate(()=>{window.kingJamesQA.pause();window.kingJamesQA.save();return window.kingJamesQA.status().snapshot;});
   assert.equal(before.look.hair,'braids');assert.equal(before.look.presentation,'female');
   await frame.getByRole('button',{name:'Try Outfits · 22',exact:true}).click();
   await frame.getByRole('button',{name:'Wear Dolphin Costume',exact:true}).click();
   await frame.getByRole('button',{name:'Play in this outfit',exact:true}).click();
   await frame.waitForFunction(()=>document.querySelector('#game').dataset.outfit==='dolphin-costume');
   await frame.evaluate(()=>window.kingJamesQA.pause());
   const worn=await frame.evaluate(()=>window.kingJamesQA.status().snapshot);assert.deepEqual(worn.look,before.look);
   await page.screenshot({path:'/tmp/head-hair-'+type.name()+'-test-account.png',fullPage:true});
   frame=await login();const restored=await frame.evaluate(()=>{window.kingJamesQA.pause();return window.kingJamesQA.status().snapshot;});
   assert.deepEqual(restored.look,before.look);assert.deepEqual(restored.inventory,before.inventory);assert.deepEqual(restored.powers,before.powers);
   assert.deepEqual(errors,[]);assert.deepEqual(cloud,[]);
   report.push({engine:type.name(),mobile,...checks,reservedCode:'0000000000',customizedLookReload:true,costumeSwitchPreservesLook:true,cloudWrites:0,errors});
   fs.writeFileSync('/tmp/head-hair-browser-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report.at(-1)));
  }finally{await browser.close();}
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
