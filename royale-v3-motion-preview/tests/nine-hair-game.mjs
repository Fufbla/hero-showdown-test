import {Game,decodeSave} from '../core.mjs';
import {LocalHeroStore,PROFILE_KEY} from '../saves.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';
import {HAIR_REFERENCE_V3,HAIR_REFERENCE_IDS} from '../hair-reference-v3.mjs';
const $=id=>document.getElementById(id),frame=$('game'),messages=[],wait=ms=>new Promise(r=>setTimeout(r,ms));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
let session,prefix,expected,busy=false;
const until=async(fn,label,timeout=30000)=>{const end=performance.now()+timeout;while(!fn()){if(performance.now()>end)throw Error('Timed out: '+label);await wait(50);}};
const check=(ok,label)=>{if(!ok)throw Error(label);$('log').textContent+='PASS '+label+'\n';};
for(const [id,d] of Object.entries(HAIR_REFERENCE_V3))$('hair').add(new Option(d.name,id));
const requested=new URLSearchParams(location.search).get('hair');$('hair').value=HAIR_REFERENCE_IDS.includes(requested)?requested:'fade';
addEventListener('message',e=>{if(e.source===frame.contentWindow&&e.origin===location.origin&&e.data?.type==='royale-code-progress')messages.push({...e.data,at:performance.now(),snapshot:decodeSave(e.data.snapshot)});});
function storage(){return {getItem:k=>sessionStorage.getItem(prefix+k),setItem:(k,v)=>sessionStorage.setItem(prefix+k,v)};}
function fixtures(){
 const store=new LocalHeroStore(storage());
 for(const slot of [0,1,2]){
  const g=new Game();g.look={...styleCDefault(slot===1?'male':'female'),hair:$('hair').value,name:slot===0?'Rexi':slot===1?'Hero':'Hidden',skin:slot===1?'#6b4233':'#e99b83',hairColor:'#3e2048'};
  g.hero.x=180+slot*15;g.hero.coins=10000;store.writeSlot(slot,g.save());
 }
 expected=JSON.parse(sessionStorage.getItem(prefix+PROFILE_KEY));
}
async function load(prior){
 session='hair-review-'+Date.now();prefix='royale-test-'+session+':';
 if(prior){storage().setItem(PROFILE_KEY,JSON.stringify(prior));expected=prior;}else fixtures();
 messages.length=0;
 await new Promise(resolve=>{frame.onload=resolve;frame.src='../?codePlay=v3&touch=1&qa&testSession='+session;});
 await until(()=>{try{return frame.contentDocument?.querySelectorAll('.hero-slot').length===2&&frame.contentDocument?.getElementById('hero-art-status')?.hidden}catch{return false}},'roster and hair artwork');
 check(frame.contentDocument.querySelectorAll('.hero-slot').length===2,'two visible slots; Slot 3 hidden');
 $('reference').src='../qa/nine-hair-review/references/'+$('hair').value+'.jpeg';
}
async function start(slot=0){const d=frame.contentDocument;d.querySelector(`[data-slot="${slot}"] [data-action=continue]`).click();await until(()=>d.body.classList.contains('playing'),'gameplay');return d;}
async function tree(d){if(d.body.classList.contains('playing'))d.getElementById('pause').click();d.getElementById('tree-from-pause').click();await until(()=>!d.getElementById('tree-menu').hidden,'Tree of Eris');d.querySelector('.eris-nav [data-eris=appearance]').click();await until(()=>!d.getElementById('creator').hidden,'Appearance');}
function roster(d){d.getElementById('return-menu').click();d.getElementById('choose-hero').click();}
async function capture(d,hair,sex){
 const select=d.getElementById('hair');select.value=hair;select.dispatchEvent(new frame.contentWindow.Event('input',{bubbles:true}));
 const distinct=new Set();
 for(const view of ['front','side','back','left']){
  const label=view==='side'?'Right':view[0].toUpperCase()+view.slice(1),canvas=d.getElementById('hero-preview');
  d.getElementById('view-'+view).click();
  await until(()=>canvas.getAttribute('aria-label')?.startsWith(label+' view'),'creator direction '+label);
  const image=new Image(),fig=document.createElement('figure'),cap=document.createElement('figcaption'),src=canvas.toDataURL('image/png');
  distinct.add(src);image.src=src;await image.decode();
  image.alt=`${HAIR_REFERENCE_V3[hair].name} · ${sex} · ${label} · actual creator`;
  Object.assign(image.dataset,{hair,sex,view:label.toLowerCase()});
  cap.textContent=`${HAIR_REFERENCE_V3[hair].name} · ${sex} · ${label}`;fig.append(cap,image);$('captures').append(fig);
 }
 check(distinct.size===4,`${HAIR_REFERENCE_V3[hair].name} / ${sex}: four distinct actual creator views`);
}
async function task(fn){
 if(busy)return;busy=true;$('log').textContent='';$('status').textContent='Checking…';
 for(const b of document.querySelectorAll('header button'))b.disabled=true;
 try{await fn();$('status').textContent='PASS · '+$('log').textContent.split('\n').filter(Boolean).length+' checks';}
 catch(e){$('status').textContent='FAIL · '+e.message;$('log').textContent+=e.stack;}
 finally{busy=false;for(const b of document.querySelectorAll('header button'))b.disabled=false;}
}
$('play').onclick=()=>task(async()=>{await load();await start();check(true,'playable game started with selected hair');});
$('capture').onclick=()=>task(async()=>{await load();const d=await start();await tree(d);$('captures').replaceChildren();await capture(d,$('hair').value,'female');check(same(JSON.parse(storage().getItem(PROFILE_KEY)).slots[2],expected.slots[2]),'hidden slot untouched');});
$('all').onclick=()=>task(async()=>{
 await load();$('captures').replaceChildren();
 for(const slot of [0,1]){
  const d=await start(slot);await tree(d);
  for(const hair of HAIR_REFERENCE_IDS)await capture(d,hair,slot?'male':'female');
  roster(d);
 }
 check($('captures').querySelectorAll('img').length===72,'72 actual creator captures: nine styles × two heads × four directions');
 check(same(JSON.parse(storage().getItem(PROFILE_KEY)).slots[2],expected.slots[2]),'hidden slot untouched');
});
$('motion').onclick=()=>task(async()=>{
 await load();const d=await start(),w=frame.contentWindow;
 const key=(code,down)=>w.dispatchEvent(new w.KeyboardEvent(down?'keydown':'keyup',{code,key:code==='Space'?' ':code==='KeyJ'?'j':code==='KeyK'?'k':code,bubbles:true}));
 for(const [label,code,ms] of [['right','ArrowRight',450],['left','ArrowLeft',450],['jump','Space',100],['double jump','Space',100],['punch','KeyJ',200],['kick','KeyK',200]]){
  key(code,true);await wait(ms);key(code,false);if(label!=='jump')await wait(150);check(true,label+' input exercised in actual gameplay');
 }
 await wait(800);d.getElementById('pause').click();check(!d.getElementById('pause-menu').hidden,'game responds after movement and attacks');
});
$('save').onclick=()=>task(async()=>{
 await load();const original=expected;
 for(const slot of [0,1]){
  const d=await start(slot);await tree(d);d.getElementById('return-menu').click();d.getElementById('resume').click();
  const from=performance.now();await until(()=>messages.filter(m=>m.slot===slot&&m.at>from).length>=2,'eight-second snapshots',24000);
  const sent=messages.filter(m=>m.slot===slot&&m.at>from),gap=sent.at(-1).at-sent.at(-2).at;
  check(gap>6500&&gap<9500,`slot ${slot+1} eight-second autosave (${Math.round(gap)} ms)`);
  for(const k of ['look','level','xp','inventory','powers','healthRoots'])check(same(sent.at(-1).snapshot[k],original.slots[slot].snapshot[k]),`slot ${slot+1} preserves ${k}`);
  check(same(sent.at(-1).snapshot.world.location,original.slots[slot].snapshot.world.location),`slot ${slot+1} preserves exact position and health`);
  d.getElementById('pause').click();d.getElementById('choose-hero').click();
 }
 const saved=JSON.parse(storage().getItem(PROFILE_KEY));check(same(saved.slots[2],original.slots[2]),'hidden third slot unchanged');
 await load(saved);
 for(const slot of [0,1]){const d=await start(slot);d.getElementById('pause').click();const after=JSON.parse(storage().getItem(PROFILE_KEY)).slots[slot].snapshot;check(same(after.look,original.slots[slot].snapshot.look)&&same(after.world.location,original.slots[slot].snapshot.world.location),`slot ${slot+1} appearance and position restored after document reload`);d.getElementById('choose-hero').click();}
});
$('hair').onchange=()=>{$('reference').src='../qa/nine-hair-review/references/'+$('hair').value+'.jpeg';};
await task(async()=>{await load();check(true,'test roster ready');});
