// Called by the six real-browser profiles after ordinary input checks.
const assert=require('node:assert/strict');
module.exports=async function exercisePowers(frame,page,advance,tag,original){
 const canvas=frame.locator('#game');
 const settle=async steps=>{await frame.evaluate(n=>window.kingJamesQA.sample({},n),steps);await advance(.05);};
 const loadout=async ids=>{
  await frame.getByRole('button',{name:'Change equipped powers',exact:true}).click();
  const text=await frame.locator('#power-list').innerText();assert.ok(!text.includes('Agility'));assert.ok(text.includes('PASSIVE'));
  for(let i=0;i<3;i++){
   const select=frame.getByLabel('Power slot '+(i+1),{exact:true});
   const options=await select.locator('option').allTextContents();assert.ok(!options.some(x=>/Agility|Speed/.test(x)));
   await select.selectOption(ids[i]||'');
  }
  await frame.getByRole('button',{name:'Return to Pause Menu',exact:true}).click();
  await frame.getByRole('button',{name:'Resume Game',exact:true}).click();await canvas.click();await advance(.1);
 };
 const activate=async name=>{await frame.getByRole('button',{name:name+' · ready',exact:true}).click();await advance(.04);};
 const seen=async()=>JSON.parse(await canvas.getAttribute('data-steel-seen')||'[]');
 await settle(360);await loadout(['steel','strength','superKick']);await activate('Steel Body');await advance(.3);
 assert.equal(await canvas.getAttribute('data-outfit'),'steel-universal');
 await page.screenshot({path:'/tmp/kingjames-steel-'+tag+'.png',fullPage:true});
 for(const key of ['ArrowRight','ArrowLeft']){await page.keyboard.down('Shift');await page.keyboard.down(key);await advance(.45);await page.keyboard.up(key);await page.keyboard.up('Shift');await advance(.2);}
 await page.keyboard.press('Space');await advance(.12);await page.keyboard.press('Space');await advance(1.1);
 await page.keyboard.press('j');await advance(.28);await page.keyboard.press('k');await advance(.4);
 await activate('Super Strength');await advance(.3);await activate('Super Kick');await advance(1.8);
 const metallic=await seen();
 for(const action of ['idle','run','jump','doubleJump','fall','land','punch','kick','strength','superKick'])assert.ok(metallic.some(s=>s.startsWith(action+':')),tag+' missing metal '+action);
 for(const dir of [-1,1])assert.ok(metallic.filter(s=>s.startsWith('run:')&&s.endsWith(':'+dir)).length>=3,'Metal strides '+dir);
 const fx=JSON.parse(await canvas.getAttribute('data-motion-fx'));for(const id of ['streak:1','streak:-1','takeoff:','airJump:','landing:','steel-strength','steel-superKick'])assert.ok(fx.seen.some(s=>s.startsWith(id)),tag+' missing '+id);
 await settle(1500);assert.equal(await canvas.getAttribute('data-outfit'),'kingjames-original');
 await loadout(['steel','flight','superKick']);await activate('Steel Body');await activate('Flight');
 await page.keyboard.down('ArrowRight');await advance(.6);
 await page.screenshot({path:'/tmp/kingjames-steel-flight-'+tag+'.png',fullPage:true});
 await page.keyboard.up('ArrowRight');await page.keyboard.down('ArrowLeft');await advance(.6);await page.keyboard.up('ArrowLeft');await advance(.5);
 assert.equal(await canvas.getAttribute('data-outfit'),'steel-universal');
 const flying=await seen();for(const id of ['flightStart','fly','hover'])assert.ok(flying.some(s=>s.startsWith(id+':')),tag+' missing '+id);
 await frame.getByRole('button',{name:'Flight · flying, press to cancel',exact:true}).click();await advance(1.1);
 await settle(2400);assert.equal(await canvas.getAttribute('data-outfit'),'kingjames-original');
 await loadout(original.powers.equipped);await settle(360);
 return {steel:await seen(),fx:JSON.parse(await canvas.getAttribute('data-motion-fx')),verified:['steel-transform','metal-strides-both-directions','metal-jump-double-fall-land','metal-punch-kick','strength','six-kick-combo','flight-launch-fly-hover-both-directions','steel-expiry','passive-speed-grounded-effects','no-agility-or-speed-active-slot']};
};
