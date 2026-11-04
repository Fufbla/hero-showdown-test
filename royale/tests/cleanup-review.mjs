const frame=document.querySelector('iframe'),out=document.querySelector('pre'),button=document.querySelector('button');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<400;i++){if(fn())return;await wait(50)}throw Error('Timed out loading practice hero')}
button.onclick=async()=>{button.disabled=true;out.textContent='';let passed=0;try{
 const d=frame.contentDocument;
 for(let region=1;region<=7;region++)for(const tier of [2,3]){
  d.querySelector('#practice-region').value=region;d.querySelector('#practice-place').value='tier'+tier;d.querySelector('#reset-world').click();
  await wait(100);const game=d.querySelector('iframe');
  await until(()=>game.contentDocument.querySelector('#diagnostics')?.textContent.includes('platforms ')&&game.contentDocument.querySelector('#diagnostics').textContent.includes('region '+region+' ·'));
  const text=game.contentDocument.querySelector('#diagnostics').textContent;
  const counts=[...text.matchAll(/(?:climb|branch)-\d-([23]):(\d+)/g)];
  if(counts.length!==12||counts.some(m=>+m[2]!==(+m[1]===2?4:8)))throw Error('Population mismatch: '+text);
  passed+=12;out.textContent+=`PASS Region ${region}, start on tier ${tier}: all 12 platforms have 4/8 monsters.\n`;
 }
 out.textContent+=`COMPLETE ${passed} live platform-count checks.\nPhysical iPhone behavior is not covered by this browser replay.`;
}catch(e){out.textContent+='FAIL '+e.message}finally{button.disabled=false}};

import {Game} from '../core.mjs';
import {PROFILE_KEY} from '../saves.mjs';
import {advanceUI} from './ui-clock.mjs';
const combatButton=document.createElement('button');combatButton.textContent='Replay ordinary combat rewards';document.body.append(combatButton);
const combatResult=document.createElement('pre');combatResult.id='combat-result';document.body.append(combatResult);
const combatFrame=document.createElement('iframe');combatFrame.title='Combat reward replay';combatFrame.style.width='844px';combatFrame.style.height='390px';document.body.append(combatFrame);
combatButton.onclick=async()=>{combatButton.disabled=true;combatResult.textContent='Loading a disposable level-one hero…';try{
 const session='input-'+Date.now()+'-cleanup',g=new Game({look:{name:'Cleanup Test',hair:'buzz'},random:()=>.99});g.hero.x=g.hero.prevX=580;
 const snapshot=JSON.parse(g.save());sessionStorage.setItem(`royale-test-${session}:`+PROFILE_KEY,JSON.stringify({version:2,revision:0,activeSlot:0,legacyImported:true,slots:[{id:'cleanup-only',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),lastRegion:'Coastal Beginnings',snapshot},null,null]}));
 await new Promise(r=>{combatFrame.onload=r;combatFrame.src=`../?qa=1&touch=1&testSession=${session}`});
 const d=combatFrame.contentDocument,v=combatFrame.contentWindow;
 await until(()=>d.querySelector('[data-action=continue]'));d.querySelector('[data-action=continue]').click();combatFrame.focus();
 await until(()=>d.body.classList.contains('playing'));const coins=+d.querySelector('#coins').textContent,xp=parseInt(d.querySelector('#xp-text').textContent);
 const messages=[];const observer=new MutationObserver(()=>messages.push(d.querySelector('#toast').textContent));observer.observe(d.querySelector('#toast'),{childList:true,subtree:true,characterData:true});
 const key=(type,code)=>v.dispatchEvent(new v.KeyboardEvent(type,{code,bubbles:true,cancelable:true}));
 key('keydown','KeyJ');for(let i=0;i<20&&+d.querySelector('#coins').textContent===coins;i++)await advanceUI(combatFrame,.25);key('keyup','KeyJ');observer.disconnect();
 const nextCoins=+d.querySelector('#coins').textContent,nextXP=parseInt(d.querySelector('#xp-text').textContent);
 if(nextCoins<=coins||nextXP<=xp)throw Error(`Rewards did not increase: ${coins}/${xp} → ${nextCoins}/${nextXP}`);
 if(messages.some(s=>/\+\d+ XP|coin.*Bottle|Bottle.*coin/.test(s)))throw Error('Routine reward toast appeared');
 combatResult.textContent=`PASS Ordinary enemy defeated through the real Punch input.\nPASS Coins ${coins} → ${nextCoins}; XP ${xp} → ${nextXP}.\nPASS No routine XP/coin toast.\n`;
 for(const control of ['jump','kick','power0','power1','power2']){
  const b=d.querySelector(`[data-control=${control}]`);if(!b)throw Error('Missing '+control);
  // Context/callout events are replayed; this does not emulate Safari's native menu.
  for(const type of ['contextmenu','dblclick','selectstart'])if(b.dispatchEvent(new v.Event(type,{bubbles:true,cancelable:true})))throw Error(control+' allowed '+type);
 }
 await advanceUI(combatFrame,4);
 combatResult.textContent+='PASS Gameplay controls reject selection/callout events.\nCOMPLETE';
}catch(e){combatResult.textContent+='\nFAIL '+e.message}finally{combatButton.disabled=false}};
