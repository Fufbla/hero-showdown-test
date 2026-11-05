import {prepareStyleCMaterials} from '../style-c-materials.mjs';
import {drawHero} from '../hero-art.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';
import {previewHero} from '../hero-rig.mjs';
const $=id=>document.getElementById(id),frame=$('game');
frame.src='../index.html?qa=1&testSession=corrections-'+Date.now()+'&touch=1';
$('size').onchange=()=>{[frame.width,frame.height]=$('size').value.split('x');};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
$('run').onclick=async()=>{
 const report=['QA revision 2'],check=(ok,label)=>{report.push(`${ok?'PASS':'FAIL'} ${label}`);$('result').textContent=report.join('\n');if(!ok)throw Error(label);};
 $('run').disabled=true;
 for(let i=0;i<300&&!frame.contentDocument?.querySelector('[data-action=create]');i++)await wait(100);
 const w=frame.contentWindow,d=frame.contentDocument;
 const pad={connected:true,mapping:'standard',index:0,id:'QA standard pad',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0,touched:false}))};
 d.addEventListener('click',e=>{report.push('click '+e.target.id+' '+e.target.textContent.slice(0,40));$('result').textContent=report.join('\n');},true);
 w.addEventListener('keydown',e=>{report.push('key '+e.code);$('result').textContent=report.join('\n');});
 let polls=0;const original=w.navigator.getGamepads;
 Object.defineProperty(w.navigator,'getGamepads',{configurable:true,value:()=>{polls++;return [pad];}});
 const press=async(i,ms=20)=>{w.focus();pad.buttons[i].pressed=true;pad.buttons[i].value=1;const start=polls;await wait(ms);for(let n=0;n<40&&polls<start+2;n++)await wait(100);pad.buttons[i].pressed=false;pad.buttons[i].value=0;const released=polls;await wait(250);for(let n=0;n<40&&polls<released+2;n++)await wait(100);};
 const visible=e=>e&&!e.closest('[hidden]')&&e.getClientRects().length;
 const target=async(selector)=>{for(let n=0;n<50;n++){if(d.activeElement.matches(selector))return;await press(13);}throw Error('Could not focus '+selector);};
 try{
  w.focus();for(let i=0;i<100&&!d.activeElement?.classList.contains('controller-focus');i++)await wait(200);
  check(visible(d.activeElement)&&d.activeElement.classList.contains('controller-focus'),'Initial visible controller focus');
  const first=d.activeElement;pad.axes[1]=.2;await wait(450);pad.axes[1]=0;check(d.activeElement===first,'Analog drift ignored');
  await target('#hero-slots [data-action="create"]');await press(0,650);check(visible(d.querySelector('#creator')),'A opens creator once when held');
  check(!d.querySelector('#preview-pose'),'No animation selector');
  await target('#tab-identity');await press(5);check(visible(d.querySelector('#panel-face')),'Shoulder switches creator tab');
  await press(5);check(visible(d.querySelector('#panel-body')),'Shoulder reaches body tab');
  await target('#height');const height=Number(d.querySelector('#height').value);await press(15);check(Number(d.querySelector('#height').value)>height,'Right adjusts slider through input event');
  await target('#begin');await press(0);await wait(500);check(d.body.classList.contains('playing'),'Controller begins adventure');
  await press(9);check(visible(d.querySelector('#pause-menu')),'Start pauses');
  for(const [label,button,panel] of [['Inventory','#open-inventory','#inventory-menu'],['Map','#open-map','#world-menu'],['Settings','#open-controls','#controls-menu']]){
    const b=d.querySelector(button);if(!b){report.push('UNVERIFIED '+label+' selector');continue;}
    await target(button);await press(0);check(visible(d.querySelector(panel)),label+' opens');await press(1);check(visible(d.querySelector('#pause-menu')),label+' returns with B');
  }
  for(const [button,panel] of [['#open-my-hero','#pause-hero']]){await target(button);await press(0);check(visible(d.querySelector(panel)),panel+' controller access');await press(1);}
  await target('#open-loadout');await press(0);check(visible(d.querySelector('[data-eris-panel="powers"]')),'Pause superpowers opens upgrades');await press(1);await press(9);
  await target('#tree-from-pause');await press(0);check(visible(d.querySelector('#tree-menu')),'Tree of Eris controller access');
  await target('[data-eris="powers"]');await press(0);check(visible(d.querySelector('[data-eris-panel="powers"]')),'Superpower upgrade menu access');
  await target('[data-eris="wardrobe"]');await press(0);check(visible(d.querySelector('[data-eris-panel="wardrobe"]')),'Costume wardrobe access');
  await target('#eris-appearance');await press(0);check(visible(d.querySelector('#creator')),'Appearance service access');await press(1);check(visible(d.querySelector('#tree-menu')),'Appearance cancel preserves adventure');
  await target('#close-tree');await press(0);await press(9);await target('#manual-save');await press(0);check(d.querySelector('#toast').textContent.toLowerCase().includes('saved'),'Controller saves hero');
  pad.connected=false;await wait(200);pad.connected=true;await wait(200);check(visible(d.activeElement),'Controller reconnect restores visible focus');
  await press(9);check(!visible(d.querySelector('#pause-menu')),'Start resumes without confirming menu');
  report.push('Completed synthetic Gamepad API checks. Physical Xbox/PlayStation and iPhone remain unverified.');
 }catch(e){report.push('ERROR '+e.message);}finally{Object.defineProperty(w.navigator,'getGamepads',{configurable:true,value:original});$('result').textContent=report.join('\n');$('run').disabled=false;}
};
$('art').onclick=async()=>{
 await prepareStyleCMaterials();$('gallery').replaceChildren();
 for(const sex of ['male','female'])for(const hair of ['buzz','high-top','curly-fade'])for(const view of ['front','back','side','left']){
  const c=document.createElement('canvas');c.width=160;c.height=210;const ctx=c.getContext('2d'),look={...styleCDefault(sex),hair,skin:'#f3d76d'};
  drawHero(ctx,80,180,look,previewHero('idle',0),0,1.5,{view});ctx.fillStyle='white';ctx.font='11px sans-serif';ctx.fillText(`${sex} ${hair} ${view}`,4,200);$('gallery').append(c);
 }
};
