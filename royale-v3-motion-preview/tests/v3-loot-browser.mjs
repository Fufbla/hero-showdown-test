import {Game,decodeSave} from '../core.mjs';
import {LocalHeroStore,PROFILE_KEY} from '../saves.mjs';
import {rollHelmetStats} from '../helmet-rolls.mjs';
import {costumeDrop} from '../costume-catalog.mjs';
import {itemDefinition} from '../equipment.mjs';
import {statsText} from '../journey-menu.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';
import {prepareStyleCMaterials} from '../style-c-materials.mjs';
import {drawHero} from '../hero-art.mjs';
import {previewHero} from '../hero-rig.mjs';
const $=id=>document.getElementById(id),frame=$('game'),summary=$('summary'),log=$('log');
const key='v3-loot-browser-check:',storage={getItem:k=>localStorage.getItem(key+k),setItem:(k,v)=>localStorage.setItem(key+k,v)};
const expectedKey=key+'expected',messages=[];let checks=0;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(fn,label,timeout=30000)=>{const end=performance.now()+timeout;while(!fn()){if(performance.now()>end)throw Error('Timed out: '+label);await wait(80);}};
const check=(ok,label)=>{if(!ok)throw Error(label);checks++;log.textContent+='PASS '+label+'\n';summary.textContent=checks+' browser checks passed';};
const compare=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
addEventListener('message',e=>{if(e.source===frame.contentWindow&&e.origin===location.origin&&e.data?.type==='royale-code-progress')messages.push({...e.data,at:performance.now(),snapshot:JSON.parse(e.data.snapshot)});});
function fixture(slot){
 const g=new Game({look:{...styleCDefault(slot===1?'female':'male'),name:'Loot QA '+(slot+1)}});g.healthRoots=10;
 for(let i=0;i<20;i++)g.inventory.items.push(rollHelmetStats(costumeDrop(1,'ordinary',0,g.inventory.nextId++),()=>((i+slot*3)%20)/20));
 g.paused=true;g.equipItem(g.inventory.items[0].uid);g.hero.x=160+slot*8;g.hero.coins=100+slot;g.hero.xp=10+slot;
 return g.save();
}
function freshStore(){
 // Dedicated test key only; no real profiles are read, migrated or replaced.
 storage.setItem(PROFILE_KEY,JSON.stringify({version:2,revision:0,activeSlot:0,legacyImported:true,slots:[null,null,null]}));
 const s=new LocalHeroStore(storage);for(let i=0;i<3;i++)s.writeSlot(i,fixture(i));
 localStorage.setItem(expectedKey,JSON.stringify(s.data.slots));return s;
}
function restored(){
 const expected=JSON.parse(localStorage.getItem(expectedKey)||'null');if(!expected)return null;
 const s=new LocalHeroStore(storage);for(let i=0;i<3;i++)check(compare(s.slot(i),expected[i]),'Browser storage restored slot '+(i+1)+' with exact items, rolls and position');return s;
}
async function openFrame(s){
 const session='v3-loot-'+Date.now(),prefix='royale-test-'+session+':';
 sessionStorage.setItem(prefix+PROFILE_KEY,JSON.stringify(s.data));
 await new Promise(resolve=>{frame.onload=resolve;frame.src='../?codePlay=v3&qa&testSession='+session;});
 await until(()=>frame.contentDocument?.querySelectorAll('.hero-slot').length===2,'two-slot roster');
 await until(()=>frame.contentDocument?.getElementById('hero-art-status')?.hidden,'approved artwork');
 check(frame.contentDocument.querySelectorAll('.hero-slot').length===2,'Only two visible V3 hero slots');
 check(!frame.contentDocument.querySelector('.hero-slot[data-slot="2"]'),'Slot 3 remains hidden');
 return {d:frame.contentDocument,prefix};
}
$('reload').onclick=()=>location.reload();
$('run').onclick=async()=>{
 $('run').disabled=true;log.textContent='';checks=0;messages.length=0;
 try{
  const s=freshStore();restored();const hidden=s.slot(2),{d,prefix}=await openFrame(s);
  for(const slot of [0,1]){
   d.querySelector(`[data-slot="${slot}"] [data-action="continue"]`).click();
   await until(()=>messages.filter(m=>m.slot===slot).length>=3,'eight-second autosaves',26000);
   const sent=messages.filter(m=>m.slot===slot),interval=sent.at(-1).at-sent.at(-2).at;
   check(interval>6500&&interval<9500,'Slot '+(slot+1)+' autosave cadence is eight seconds');
   const snap=sent.at(-1).snapshot,expected=s.slot(slot).snapshot;
   check(compare(snap.inventory,expected.inventory),'Slot '+(slot+1)+' sends all 20 unique items and exact rolls');
   check(compare(snap.world.location,expected.world.location),'Slot '+(slot+1)+' restores exact saved position');
   check(snap.healthRoots===10,'Slot '+(slot+1)+' restores 10 Health Roots');
   d.getElementById('pause').click();d.getElementById('open-inventory').click();
   await until(()=>d.querySelectorAll('.equipment-card').length===20,'20 equipment cards');
   check(d.getElementById('inventory-summary').textContent.includes('20 / 20'),'All 20 slots display in inventory');
   for(const item of expected.inventory.items.slice(0,2))check(d.querySelector(`[data-item="${item.uid}"]`).textContent.includes(statsText(itemDefinition(item))),'Card displays its individual helmet stats '+item.uid);
   d.getElementById('inventory-close').click();d.getElementById('choose-hero').click();
   await until(()=>!d.getElementById('roster').hidden,'return to roster');
  }
  const saved=JSON.parse(sessionStorage.getItem(prefix+PROFILE_KEY));check(compare(saved.slots[2],hidden),'Hidden third-slot record is unchanged');
  const restoredFrame=await openFrame(new LocalHeroStore({getItem:k=>sessionStorage.getItem(prefix+k),setItem:(k,v)=>sessionStorage.setItem(prefix+k,v)}));
  check(restoredFrame.d.querySelector('[data-slot="1"] h2').textContent==='Loot QA 2','Both heroes survive full game document reload');
  restoredFrame.d.querySelector('[data-slot="0"] [data-action="continue"]').click();
  summary.textContent='COMPLETE · '+checks+' browser checks passed. Reload this page to verify persistent storage again.';
 }catch(e){summary.textContent='FAIL · '+e.message;log.textContent+=e.stack;}finally{$('run').disabled=false;}
};
$('movement').onclick=async()=>{
 const d=frame.contentDocument,w=frame.contentWindow;if(!d?.body.classList.contains('playing'))return;
 const key=(code,type)=>w.dispatchEvent(new w.KeyboardEvent(type,{code,bubbles:true}));
 key('KeyD','keydown');await wait(850);key('Space','keydown');await wait(80);key('Space','keyup');await wait(220);key('Space','keydown');await wait(80);key('Space','keyup');await wait(700);key('KeyD','keyup');key('KeyA','keydown');await wait(650);key('KeyA','keyup');
};
try{restored();}catch(e){summary.textContent='FAIL · '+e.message;}
await prepareStyleCMaterials();
const canvas=$('capes'),c=canvas.getContext('2d'),owners=Array.from({length:8},()=>({}));let last=performance.now();
function animate(now){const dt=Math.min(.05,(now-last)/1000);last=now;const t=now/1000;c.clearRect(0,0,880,370);
 for(let row=0;row<2;row++)for(let col=0;col<4;col++){
  const clip=['idle','run','jump','fall'][col],h={...previewHero(clip,t),invulnerable:0,respawnAge:100};
  if(col===1)h.vx=360;if(col===2){h.vx=150;h.vy=-400;h.grounded=false;}if(col===3){h.vx=150;h.vy=400;h.grounded=false;}
  drawHero(c,110+220*col,175+row*185,styleCDefault(row?'female':'male'),h,t,1.15,{cloth:owners[row*4+col],dt});
  c.fillStyle='#153e37';c.font='13px system-ui';c.textAlign='center';c.fillText(clip,110+220*col,18+row*185);
 }
 requestAnimationFrame(animate);
}requestAnimationFrame(animate);
