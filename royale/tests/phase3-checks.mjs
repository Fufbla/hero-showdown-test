import {advanceUI} from './ui-clock.mjs';
import {SAVE_KEY} from '../core.mjs';
import {PROFILE_KEY} from '../saves.mjs';
import {POWER_IDS,POWERS} from '../powers.mjs';
import {CONTROL_KEY} from '../controls.mjs';
const frame=document.getElementById('phone'),report=document.getElementById('report'),button=document.getElementById('test-powers');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
button.onclick=async()=>{
  for(const id of ['test','test-creator','test-powers'])document.getElementById(id).disabled=true;
  report.textContent='Running Phase 3 UI, save and control checks…\n';let count=0;
  const session=`powers-${Date.now()}`,prefix=`royale-test-${session}:`;
  const legacy=JSON.stringify({version:2,look:{name:'Eris Test Hero',cape:true},level:99,xp:0,coins:87,checkpoint:0,kills:12,species:['bottle','slime','crawler']});sessionStorage.setItem(prefix+SAVE_KEY,legacy);
  let d,w,el,originalPad,padInstalled=false;
  const check=(name,ok)=>{report.textContent+=`${ok?'PASS':'FAIL'} · ${name}\n`;if(!ok)throw Error(name);count++;};
  const until=async fn=>{const end=Date.now()+120000;while(!fn()){if(Date.now()>end)throw Error('Timed out waiting for UI');await wait(30);}};
  const attach=async()=>{d=frame.contentDocument;w=frame.contentWindow;el=id=>d.getElementById(id);await until(()=>d.querySelector('.hero-slot'));frame.focus();};
  const time=()=>Number(el('diagnostics').textContent.match(/ · t ([\d.]+)/)?.[1]);
  const advance=seconds=>advanceUI(frame,seconds);
  const key=(code,down=true)=>d.body.dispatchEvent(new w.KeyboardEvent(down?'keydown':'keyup',{code,key:code,bubbles:true,cancelable:true}));
  const tap=code=>{key(code);key(code,false);};
  const data=()=>JSON.parse(sessionStorage.getItem(prefix+PROFILE_KEY)).slots[0].snapshot;
  const inside=n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0&&r.left>=-1&&r.right<=w.innerWidth+1&&r.top>=-1&&r.bottom<=w.innerHeight+1;};
  const select=(n,value)=>{n.value=value;n.dispatchEvent(new w.Event('change',{bubbles:true}));};
  const spend=async id=>{const arrow=d.querySelector(`[data-upgrade="${id}"]`);arrow.scrollIntoView({block:'nearest'});arrow.click();await until(()=>el('power-list').getAttribute('aria-busy')==='false');};
  try{
    await new Promise(resolve=>{frame.onload=resolve;frame.src=`../?qa=1&touch=1&testSession=${session}`;});await attach();d.querySelector('[data-slot="0"] [data-action="continue"]').click();await advance(.2);
    check('legacy hero retains appearance, level and coins',data().look.name==='Eris Test Hero'&&data().level===99&&data().coins===87);
    check('health uses Phase 3 level growth',el('hp-text').textContent==='1570 / 1570');
    key('KeyD');await advance(.65);key('KeyD',false);await advance(.2);el('pause').click();
    check('98 earned points imported',el('power-points').textContent==='98');check('Tree reachable at Shore camp',!el('tree-from-pause').disabled);el('tree-from-pause').click();d.querySelector('.eris-nav [data-eris="powers"]').click();
    check('Tree interface and vitals remain visible',!el('tree-menu').hidden&&inside(el('hp-text'))&&inside(el('xp-text'))&&inside(el('close-tree')));
    for(const id of POWER_IDS){
      const choice=d.querySelector(`[data-power="${id}"]`);choice.scrollIntoView({block:'nearest',inline:'nearest'});choice.click();
      check(`${POWERS[id].name} preview and choice fit`,inside(d.querySelector(`[data-power="${id}"]`))&&el('power-detail').textContent.includes(POWERS[id].name)&&el('upgrade-preview').querySelectorAll('tbody tr').length>0);
      const arrow=d.querySelector(`[data-upgrade="${id}"]`);arrow.scrollIntoView({block:'nearest'});check(`${id} arrow reachable`,inside(arrow)&&!arrow.disabled);
      await spend(id);check(`${id} one click persists one level`,data().powers.levels[id]===1);
    }
    check('no upgrade quantity, confirmation, Save or Apply controls',!el('upgrade-quantity')&&!el('upgrade-confirm')&&!el('confirm-upgrade')&&![...el('power-detail').querySelectorAll('button')].some(b=>/save|apply|confirm|undo|respec/i.test(b.textContent)));
    check('all nine upgrades cost one point',el('tree-points').textContent==='89');
    for(let i=0;i<19;i++)await spend('strength');
    check('one-point clicks reach cap and deduct 19 points',data().powers.levels.strength===20&&el('tree-points').textContent==='70'&&d.querySelector('[data-upgrade="strength"]').disabled);
    el('loadout-slots').closest('details').open=true;select(el('slot-0'),'strength');select(el('slot-1'),'fireball');select(el('slot-2'),'flight');
    el('close-tree').click();el('pause').click();el('manual-save').click();check('three slots save and omit passive Speed',[...el('slot-0').options].every(o=>o.value!=='speed')&&data().powers.equipped.join(',')==='strength,fireball,flight');
    el('open-loadout').click();select(el('slot-1'),'strength');el('close-tree').click();el('pause').click();el('manual-save').click();check('equipped choices swap without duplicates',data().powers.equipped.join(',')==='fireball,strength,flight');el('open-loadout').click();select(el('slot-0'),'strength');el('close-tree').click();el('pause').click();
    el('open-controls').click();check('control settings open with visible vitals',!el('controls-menu').hidden&&inside(el('hp-text'))&&inside(el('close-controls')));
    el('mapping-list').closest('details').querySelector('summary').click();
    d.querySelector('[data-map="power0"]').click();tap('KeyQ');check('keyboard remap persisted',JSON.parse(sessionStorage.getItem(prefix+CONTROL_KEY)).keys.power0[0]==='KeyQ');
    el('touch-settings').closest('details').querySelector('summary').click();
    for(const id of ['size','left','right','rise']){const slider=el(`touch-${id}`);slider.scrollIntoView({block:'nearest'});check(`${id} layout adjustment reachable`,inside(slider));slider.value=slider.max;slider.dispatchEvent(new w.Event('input',{bubbles:true}));}
    el('touch-rise').focus();tap('Escape');check('Escape closes settings even with a field focused',!el('pause-menu').hidden&&el('controls-menu').hidden);el('resume').click();await advance(.2);
    check('maximum touch layout stays on screen',[el('stick'),...d.querySelectorAll('.action-buttons button,.power-button:not([hidden])')].every(inside));
    tap('KeyQ');await advance(.12);check('remapped ability darkens on cooldown',d.querySelector('[data-control="power0"]').classList.contains('cooldown'));
    check('no numerical cooldown countdown',d.querySelector('[data-control="power0"] span').textContent==='Super Strength');
    el('pause').click();check('combat blocks swapping and Tree spending',el('slot-0').disabled&&el('tree-from-pause').disabled);el('resume').click();await advance(5.3);el('pause').click();check('loadout unlocks outside combat',!el('slot-0').disabled);
    el('manual-save').click();el('choose-hero').click();await new Promise(resolve=>{frame.onload=resolve;frame.contentWindow.location.reload();});await attach();d.querySelector('[data-slot="0"] [data-action="continue"]').click();await advance(.2);
    check('reload keeps levels, three powers and controls',data().powers.levels.strength===20&&data().powers.equipped.join(',')==='strength,fireball,flight'&&d.querySelector('[data-control="power0"] kbd').textContent==='Q');
    const power=d.querySelector('[data-control="power2"]'),capture=power.setPointerCapture;power.setPointerCapture=()=>{};
    for(const type of ['pointerdown','pointerup'])power.dispatchEvent(new w.PointerEvent(type,{pointerId:42,pointerType:'touch',bubbles:true,cancelable:true}));await advance(.2);check('touch activates Flight',power.classList.contains('active'));
    for(const type of ['pointerdown','pointercancel'])power.dispatchEvent(new w.PointerEvent(type,{pointerId:43,pointerType:'touch',bubbles:true,cancelable:true}));await advance(.2);check('touch cancellation ends Flight with full recovery',!power.classList.contains('active')&&power.classList.contains('cooldown'));power.setPointerCapture=capture;
    originalPad=Object.getOwnPropertyDescriptor(w.navigator,'getGamepads');const pad={connected:true,mapping:'standard',axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false}))};padInstalled=true;Object.defineProperty(w.navigator,'getGamepads',{configurable:true,value:()=>[pad]});
    await advance(.8);pad.buttons[0].pressed=true;await advance(.15);pad.buttons[0].pressed=false;check('simulated standard controller jumps',el('diagnostics').textContent.includes('jumps 1'));
    pad.buttons[9].pressed=true;await until(()=>!el('pause-menu').hidden);check('controller pauses',!el('pause-menu').hidden);pad.buttons[9].pressed=false;await new Promise(resolve=>w.requestAnimationFrame(()=>w.requestAnimationFrame(resolve)));pad.buttons[9].pressed=true;await until(()=>el('pause-menu').hidden);check('controller resumes from pause',el('pause-menu').hidden);pad.buttons[9].pressed=false;
    el('pause').click();el('open-loadout').click();const up=d.querySelector('[data-upgrade="fireball"]');up.focus();const prior=data().powers.levels.fireball,points=data().powers.points;
    pad.buttons[0].pressed=true;await until(()=>data().powers.levels.fireball===prior+1);await new Promise(resolve=>w.requestAnimationFrame(()=>w.requestAnimationFrame(resolve)));
    check('controller A spends once while held',data().powers.levels.fireball===prior+1&&data().powers.points===points-1);pad.buttons[0].pressed=false;
    const arrow=d.querySelector('[data-upgrade="flight"]'),level=data().powers.levels.flight;
    for(const type of ['pointerdown','pointerup'])arrow.dispatchEvent(new w.PointerEvent(type,{pointerId:57,pointerType:'touch',bubbles:true,cancelable:true}));
    check('touch pointer sequence does not duplicate the click',data().powers.levels.flight===level);arrow.click();await until(()=>data().powers.levels.flight===level+1);
    check('one touch click spends exactly once',data().powers.levels.flight===level+1);el('close-tree').click();
    if(originalPad)Object.defineProperty(w.navigator,'getGamepads',originalPad);else delete w.navigator.getGamepads;originalPad=undefined;padInstalled=false;
    el('pause').click();report.textContent+=`COMPLETE · ${count} Phase 3 checks passed at ${w.innerWidth} × ${w.innerHeight}.\nSynthetic pointer/controller inputs; physical devices not tested.\n`;
  }catch(error){report.textContent+=`STOPPED · ${error.message}\n${el?.('diagnostics')?.textContent||''}`;}
  finally{if(w&&padInstalled){if(originalPad)Object.defineProperty(w.navigator,'getGamepads',originalPad);else delete w.navigator.getGamepads;}for(const id of ['test','test-creator','test-powers'])document.getElementById(id).disabled=false;}
};
