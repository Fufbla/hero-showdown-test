import {combatFixture} from './combat-benchmark.mjs';
import {decodeSave} from '../core.mjs';
import {LocalHeroStore,PROFILE_KEY} from '../saves.mjs';
import {rollHelmetStats} from '../helmet-rolls.mjs';
import {costumeDrop} from '../costume-catalog.mjs';
const $=id=>document.getElementById(id),frame=$('game'),messages=[];
let checks=0;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(fn,label,timeout=30000)=>{const end=performance.now()+timeout;while(!fn()){if(performance.now()>end)throw Error('Timed out: '+label);await wait(40);}};
const check=(ok,label)=>{if(!ok)throw Error(label);checks++;$('log').textContent+='PASS '+label+'\n';$('summary').textContent=checks+' browser checks passed';};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const visible=e=>!!e?.getClientRects().length;
const inside=(r,w,h)=>r.width>0&&r.height>0&&r.left>=0&&r.top>=0&&r.right<=w+1&&r.bottom<=h+1;
const separate=(a,b)=>a.right<=b.left+.5||b.right<=a.left+.5||a.bottom<=b.top+.5||b.bottom<=a.top+.5;
addEventListener('message',e=>{if(e.source===frame.contentWindow&&e.origin===location.origin&&e.data?.type==='royale-code-progress')messages.push({...e.data,at:performance.now(),snapshot:decodeSave(e.data.snapshot)});});
function fixture(slot,encounter=false){
 const g=combatFixture(slot===1?90:14);g.look.name='Menu QA '+(slot+1);g.healthRoots=10;
 while(g.inventory.items.length<20)g.inventory.items.push(rollHelmetStats(costumeDrop(1,'ordinary',0,g.inventory.nextId++),()=>.3+slot*.2));
 g.hero.x=160+slot*8;g.hero.coins=468+slot;g.hero.xp=57+slot;g.hero.hp-=20;
 if(encounter){g.loadRegion(7);const target=g.enemies.find(e=>e.type==='guardian'&&e.surface.id==='sand-b');Object.assign(g.hero,{x:target.x-45,y:target.y,face:1,hp:g.hero.maxHp});for(const e of g.enemies)if(e!==target){e.hp=0;e.state='dead';e.respawn=180;}}
 return g.save();
}
async function load(width,height,prior=null,encounter=false){
 frame.width=width;frame.height=height;const session='v3-menu-'+Date.now(),prefix='royale-test-'+session+':';
 const storage={getItem:k=>sessionStorage.getItem(prefix+k),setItem:(k,v)=>sessionStorage.setItem(prefix+k,v)};
 const store=new LocalHeroStore(storage);if(prior)storage.setItem(PROFILE_KEY,JSON.stringify(prior));else for(let slot=0;slot<3;slot++)store.writeSlot(slot,fixture(slot,encounter));
 await new Promise(resolve=>{frame.onload=resolve;frame.src='../?codePlay=v3&touch=1&qa&testSession='+session;});
 const d=frame.contentDocument,w=frame.contentWindow;
 await until(()=>d.querySelectorAll('.hero-slot').length===2&&d.getElementById('hero-art-status').hidden,'two-slot roster and artwork');
 return {d,w,prefix,expected:JSON.parse(storage.getItem(PROFILE_KEY))};
}
async function start(d,slot=0){d.querySelector(`[data-slot="${slot}"] [data-action=continue]`).click();await until(()=>d.body.classList.contains('playing'),'gameplay');}
async function tree(d){if(d.body.classList.contains('playing'))d.getElementById('pause').click();d.getElementById('tree-from-pause').click();await until(()=>!d.getElementById('tree-menu').hidden,'Tree of Eris');}
async function controller(w){
 let polls=0;const pad={connected:true,mapping:'standard',index:0,id:'QA standard controller',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};
 Object.defineProperty(w.navigator,'getGamepads',{configurable:true,value:()=>{polls++;return[pad];}});w.focus();await until(()=>polls>=2,'controller polling');
 const next=()=>new Promise(r=>w.requestAnimationFrame(r));
 return async i=>{pad.buttons[i].pressed=true;await next();pad.buttons[i].pressed=false;await next();await next();};
}
async function task(run){checks=0;$('log').textContent='';messages.length=0;try{await run();$('summary').textContent='COMPLETE · '+checks+' browser checks passed';}catch(e){$('summary').textContent='FAIL · '+e.message;$('log').textContent+=e.stack;}}
$('preview').onclick=()=>task(async()=>{const [width,height]=$('size').value.split('x').map(Number),{d}=await load(width,height);await start(d);await tree(d);});
$('run').onclick=()=>task(async()=>{
 for(const [width,height]of [[844,390],[568,320],[390,844]]){
  const {d,w,prefix,expected}=await load(width,height);await start(d);
  const viewport=d.querySelector('canvas').getBoundingClientRect();
  check(!visible(d.getElementById('return-menu'))&&!d.querySelector('.top-actions #return-menu'),'No extra gameplay Menu '+width+'x'+height);
  check(visible(d.getElementById('pause')),'Pause/Play remains available');await tree(d);
  let initial;
  for(const panel of ['home','powers','wardrobe','appearance','roots','merge']){
   d.querySelector('.eris-nav [data-eris="'+panel+'"]').click();
   await until(()=>visible(d.querySelector('[data-eris-panel="'+panel+'"]')),'Tab '+panel);
   const button=d.getElementById('return-menu'),rect=button.getBoundingClientRect();initial||=rect;
   check(inside(rect,width,height)&&rect.width>=44&&rect.height>=44,'Accessible Menu on '+panel+' '+width+'x'+height);
   check(rect.x===initial.x&&rect.y===initial.y,'Header position stays fixed on '+panel);
   check([...d.querySelector('.eris-heading').children].filter(e=>e!==button&&visible(e)).every(e=>separate(rect,e.getBoundingClientRect())),'No header overlap on '+panel);
   const scroll=d.querySelector('.eris-scroll');scroll.scrollTop=scroll.scrollHeight;
   check(inside(button.getBoundingClientRect(),width,height),'Menu remains visible after scrolling '+panel);
   button.click();await until(()=>!d.getElementById('pause-menu').hidden,'Return to Pause Menu');
   check(!d.getElementById('pause-primary').hidden,'Main Pause Menu from '+panel);
   d.getElementById('resume').click();await until(()=>d.body.classList.contains('playing'),'Resume Game');
   const resumed=d.querySelector('canvas').getBoundingClientRect();check(resumed.width===viewport.width&&resumed.height===viewport.height,'Viewport preserved after '+panel);
   d.getElementById('pause').click();
   const saved=JSON.parse(sessionStorage.getItem(prefix+PROFILE_KEY)).slots[0].snapshot,original=expected.slots[0].snapshot;
   for(const key of ['level','xp','inventory','powers','healthRoots','look'])check(same(saved[key],original[key]),panel+' preserves '+key);
   check(same(saved.world.location,original.world.location),panel+' preserves exact position and health');
   await tree(d);
  }
  check(d.documentElement.scrollWidth===width,'No horizontal page overflow');
  // Real keyboard routing and Gamepad API polling, without game-state hooks.
  w.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}));
  await until(()=>!d.getElementById('pause-menu').hidden,'Escape returns to Pause');check(true,'Keyboard Escape returns to Pause');
  w.dispatchEvent(new w.KeyboardEvent('keyup',{key:'Escape',code:'Escape',bubbles:true}));await tree(d);
  const press=await controller(w);d.getElementById('return-menu').focus();await press(0);
  check(!d.getElementById('pause-menu').hidden,'Controller Confirm activates Menu');await tree(d);
  d.querySelector('.eris-nav [data-eris=wardrobe]').focus();await press(5);
  check(visible(d.getElementById('creator')),'Controller shoulder reaches Appearance tab');
  d.getElementById('return-menu').focus();await press(0);check(!d.getElementById('pause-menu').hidden,'Controller Menu works inside Appearance');
  check(same(JSON.parse(sessionStorage.getItem(prefix+PROFILE_KEY)).slots[2],expected.slots[2]),'Stored Slot 3 unchanged');
 }
});
$('saves').onclick=()=>task(async()=>{
 const {d,prefix,expected}=await load(844,390);
 for(const slot of [0,1]){
  await start(d,slot);await tree(d);d.querySelector('.eris-nav [data-eris=appearance]').click();d.getElementById('return-menu').click();d.getElementById('resume').click();
  const from=performance.now();await until(()=>messages.filter(m=>m.slot===slot&&m.at>from).length>=2,'two periodic cloud snapshots',22000);
  const sent=messages.filter(m=>m.slot===slot&&m.at>from);const cadence=sent.at(-1).at-sent.at(-2).at;
  check(cadence>6500&&cadence<9500,'Slot '+(slot+1)+' eight-second autosave after Tree/Appearance');
  for(const key of ['level','xp','inventory','powers','healthRoots','look']){const actual=sent.at(-1).snapshot[key],original=expected.slots[slot].snapshot[key];if(!same(actual,original))$('log').textContent+='Mismatch '+key+' '+JSON.stringify({actual,original})+'\n';check(same(actual,original),'Cloud snapshot preserves '+key+' slot '+(slot+1));}
  check(same(sent.at(-1).snapshot.world.location,expected.slots[slot].snapshot.world.location),'Cloud snapshot preserves exact position/health slot '+(slot+1));
  d.getElementById('pause').click();d.getElementById('choose-hero').click();
 }
 const saved=JSON.parse(sessionStorage.getItem(prefix+PROFILE_KEY));check(same(saved.slots[2],expected.slots[2]),'Hidden third slot untouched');
 const reloaded=await load(844,390,saved);check(reloaded.d.querySelectorAll('.hero-slot').length===2,'Two visible slots after browser document reload');
 for(const slot of [0,1]){await start(reloaded.d,slot);reloaded.d.getElementById('pause').click();check(same(JSON.parse(sessionStorage.getItem(reloaded.prefix+PROFILE_KEY)).slots[slot].snapshot.inventory,expected.slots[slot].snapshot.inventory),'All 20 equipment records restored in slot '+(slot+1));reloaded.d.getElementById('choose-hero').click();}
});

for(const [id,slot]of [['combat14',0],['combat90',1]])$(id).onclick=()=>task(async()=>{const {d}=await load(844,390,null,true);await start(d,slot);d.getElementById('pause').click();$('log').textContent='Isolated Guardian encounter. Resume, then use 1/2/3, J/K, arrows, Space and H. Enemy AI, collision and damage run normally.';});
