import {Game} from '../core.mjs';
import {LocalHeroStore,PROFILE_KEY} from '../saves.mjs';
const frame=document.querySelector('#game'),log=document.querySelector('#log'),summary=document.querySelector('#summary');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label){for(let i=0;i<500;i++){if(fn())return;await wait(60);}throw Error(label);}
const separate=(a,b)=>a.right<=b.left+.5||b.right<=a.left+.5||a.bottom<=b.top+.5||b.bottom<=a.top+.5;
const inside=(r,w,h)=>r.width>0&&r.height>0&&r.left>=-1&&r.top>=-1&&r.right<=w+1&&r.bottom<=h+1;
async function load(width,height,seed=false){
 frame.width=width;frame.height=height;const session='interface-'+Date.now()+'-'+width,key='royale-test-'+session+':';
 if(seed){const storage={getItem:k=>sessionStorage.getItem(key+k),setItem:(k,v)=>sessionStorage.setItem(key+k,v)};const store=new LocalHeroStore(storage);const game=new Game({look:{name:'Coast Guardian',skin:'#7d513a'}});game.hero.level=4;game.hero.maxHp=145;game.hero.hp=145;for(const id of ['fireball','steel','flight'])game.powers.data.levels[id]=1;game.powers.data.equipped=['fireball','steel','flight'];store.writeSlot(0,game.save(),{expectedId:null});}
 await new Promise(r=>{frame.onload=r;frame.src='../?touch=1&qa=1&testSession='+session;});const d=frame.contentDocument,w=frame.contentWindow;
 await until(()=>d.querySelector('[data-action]')&&d.querySelector('#hero-art-status').hidden,'Game artwork/roster load');
 if(seed){d.querySelector('[data-action=continue]').click();await until(()=>d.body.classList.contains('playing'),'Continue hero');}
 return {d,w,key};
}
async function controller(w){let polls=0;const pad={connected:true,mapping:'standard',index:0,id:'Synthetic Xbox-compatible standard pad',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};Object.defineProperty(w.navigator,'getGamepads',{configurable:true,value:()=>{polls++;return[pad];}});w.focus();await until(()=>polls>=2,'Neutral Gamepad polling');
 // One rendered frame per press: wall-clock sleeps can become long holds on slow devices.
 const nextFrame=()=>new Promise(resolve=>w.requestAnimationFrame(resolve));
 const press=async i=>{w.focus();const start=polls;pad.buttons[i].pressed=true;await nextFrame();pad.buttons[i].pressed=false;await nextFrame();await nextFrame();if(polls<=start)throw Error('Gamepad was not polled');};return {pad,press};
}
function byText(root,text){return [...root.querySelectorAll('button')].find(el=>el.textContent===text);}
document.querySelector('#preview').onclick=async()=>{const [w,h]=document.querySelector('#size').value.split('x').map(Number);await load(w,h,true);summary.textContent='Gameplay preview · '+w+' × '+h;};
document.querySelector('#creator').onclick=async()=>{const [w,h]=document.querySelector('#size').value.split('x').map(Number),f=await load(w,h);f.d.querySelector('[data-action=create]').click();summary.textContent='Creator preview · '+w+' × '+h;};
document.querySelector('#run').onclick=async()=>{
 const button=document.querySelector('#run');button.disabled=true;log.textContent='';let checks=0;
 const check=(ok,name)=>{log.textContent+=(ok?'PASS ':'FAIL ')+name+'\n';summary.textContent=checks+' passed · '+name;if(!ok)throw Error(name);checks++;};
 try{
  for(const [width,height]of [[568,320],[667,375],[844,390],[932,430],[390,844]]){
   let {d,w,key}=await load(width,height);const el=id=>d.getElementById(id);d.querySelector('[data-action=create]').click();
   check(d.documentElement.scrollWidth===width,'Creator fits '+width+'x'+height);
   check(d.querySelectorAll('[data-skin]').length===48,'48 natural tones');
   const name=el('name'),skin=el('skin');
   if(!document.querySelector('#layout-only').checked){
   const {pad,press}=await controller(w);
   name.value='';name.focus();await press(0);
   check(!!d.querySelector('.entry-keyboard[open]'),'Controller opens name keyboard');
   await press(15);await press(0);check(d.querySelector('.entry-keyboard input').value==='w','D-pad letter navigation and Confirm');
   byText(d.querySelector('.entry-keyboard'),'Shift').focus();await press(0);byText(d.querySelector('.entry-keyboard'),'E').focus();await press(0);
   byText(d.querySelector('.entry-keyboard'),'Space').focus();await press(0);byText(d.querySelector('.entry-keyboard'),'Backspace').focus();await press(0);
   byText(d.querySelector('.entry-keyboard'),'Done').focus();await press(0);
   check(name.value==='wE'&&d.activeElement===name,'Shift, Space, Backspace, Done and focus restoration');
   await press(0);await press(1);check(name.value==='wE'&&!d.querySelector('.entry-keyboard'),'Keyboard cancel preserves text');
   skin.focus();await press(0);check(!!d.querySelector('.entry-color[open]'),'Controller opens color picker');
   const picker=d.querySelector('.entry-color'),swatches=picker.querySelectorAll('[data-color]');swatches[0].focus();await press(13);
   check(d.activeElement===swatches[6],'Down reaches next swatch row');await press(12);check(d.activeElement===swatches[0],'Up reaches previous swatch row');await press(15);check(d.activeElement===swatches[1],'Right reaches adjacent swatch');await press(14);check(d.activeElement===swatches[0],'Left reaches adjacent swatch');
   const previous=skin.value;await press(0);check(skin.value===swatches[0].dataset.color,'Swatch selection previews skin');await press(1);check(skin.value===previous,'Color cancel restores original');
   el('custom-skin-color').click();const hue=d.querySelector('.entry-color input[aria-label=Hue]');hue.focus();await press(0);const before=Number(hue.value);await press(15);check(Number(hue.value)===Math.min(359,before+1),'Controller adjusts hue');await press(1);check(Number(hue.value)===before,'Back cancels range adjustment');
   const hex=d.querySelector('.entry-color input[aria-label="Hex color"]');hex.value='#34a66b';hex.dispatchEvent(new w.Event('input',{bubbles:true}));byText(d.querySelector('.entry-color'),'Use color').click();check(skin.value==='#34a66b','Hex custom fantasy skin confirmed');
   el('tab-face').click();const hair=d.querySelectorAll('#hair-thumbnails button');hair[0].focus();await press(13);const ra=hair[0].getBoundingClientRect(),rb=d.activeElement.getBoundingClientRect();check(rb.top>ra.top+10,'Hair Down moves physically below');await press(12);check(d.activeElement===hair[0],'Hair Up returns same column');
   el('hairColor').focus();await press(0);check(!!d.querySelector('.entry-color'),'Hair color uses same controller picker');await press(1);
   el('tab-suit').click();el('suit').focus();await press(0);check(!!d.querySelector('.entry-color'),'Suit color uses same controller picker');await press(1);
   el('tab-body').click();el('build').focus();await press(0);check(!!d.querySelector('.entry-select'),'Controller opens select choices');await press(1);
   const focus=d.activeElement;pad.axes=[.2,.15,0,0];await wait(500);check(d.activeElement===focus,'Analog drift does not navigate');pad.axes=[0,0,0,0];
   pad.id='Synthetic PlayStation-compatible standard pad';el('tab-identity').click();name.focus();await press(0);check(!!d.querySelector('.entry-keyboard'),'PlayStation standard Cross confirms');await press(1);check(!d.querySelector('.entry-keyboard'),'PlayStation standard Circle cancels');
   }
   skin.value='#34a66b';skin.dispatchEvent(new w.Event('input',{bubbles:true}));
   name.value='Interface '+width;name.dispatchEvent(new w.Event('input',{bubbles:true}));el('begin').click();await until(()=>d.body.classList.contains('playing'),'Begin patrol');await wait(200);
   const powers=[...d.querySelectorAll('.power-button')].slice(0,3),rects=powers.map(b=>b.getBoundingClientRect()),jump=d.querySelector('[data-control=jump]').getBoundingClientRect();
   check(rects.every(r=>r.width>=44&&r.width<=48&&r.height>=44&&r.height<=48),'Compact accessible square power targets');
   check(rects.every(r=>Math.abs(r.left-rects[0].left)<1)&&rects[0].bottom<=rects[1].top&&rects[1].bottom<=rects[2].top,'Three power slots in vertical order');
   if(width>height)check(rects[2].bottom<=jump.top&&Math.abs((rects[2].left+rects[2].right)-(jump.left+jump.right))<2,'Power column directly above Jump');
   const controls=[...d.querySelectorAll('.power-button:not([hidden]),.action-buttons button'),el('stick'),el('sound'),el('pause'),el('edit-hud-powers')].filter(n=>n.getBoundingClientRect().width).map(n=>n.getBoundingClientRect());
   check(controls.every(r=>inside(r,width,height)),'All controls inside viewport');check(controls.every((r,i)=>controls.slice(i+1).every(s=>separate(r,s))),'No control overlap');
   check(powers.every(b=>b.querySelector('b').textContent==='+'),'Empty slots show plus');powers[1].click();await until(()=>el('slot-picker').open,'Empty + opens picker');check(el('slot-picker').open,'Empty-slot direct equip');el('picker-close').click();
   el('pause').click();el('manual-save').click();await wait(150);const envelope=JSON.parse(sessionStorage.getItem(key+PROFILE_KEY));check(envelope.slots[0].snapshot.look.skin==='#34a66b','Custom skin saved in compatible profile');
   const url=frame.src;await new Promise(r=>{frame.onload=r;frame.src=url;});d=frame.contentDocument;w=frame.contentWindow;await until(()=>d.querySelector('[data-action=continue]'),'Saved hero reload');check(d.querySelector('#hero-slots').textContent.includes('Interface '+width),'Existing hero reload');
   // Exercise actual equipped power activation and visual cooldown in a separate local fixture.
   ({d,w}=await load(width,height,true));await wait(150);const fire=d.querySelector('[data-control=power0]');check(fire.querySelector('b').textContent==='◉','Equipped power icon');fire.click();await until(()=>fire.classList.contains('cooldown'),'Power activation');const fraction=Number(fire.style.getPropertyValue('--cooldown-remaining'));check(fraction>0&&fraction<=1,'Cooldown overlay follows active power');await until(()=>Number(fire.style.getPropertyValue('--cooldown-remaining'))<fraction,'Cooldown progression');check(Number(fire.style.getPropertyValue('--cooldown-remaining'))<fraction,'Cooldown visibly progresses');
   d.querySelector('#pause').click();for(const [open,close]of [['open-map','map-close'],['open-inventory','inventory-close'],['open-controls','close-controls']]){d.getElementById(open).click();check(d.getElementById(close).getClientRects().length>0,'Menu opens '+open);d.getElementById(close).click();}
  }
  summary.textContent='COMPLETE · '+checks+' browser checks passed across five viewports. Synthetic Gamepad API; no physical hardware verification.';
 }catch(error){summary.textContent='FAIL · '+error.message+' · '+checks+' passed';log.textContent+='ERROR '+error.stack+'\n';}finally{button.disabled=false;}
};
