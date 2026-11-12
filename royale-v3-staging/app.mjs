import {CHARACTER_TEST_CODE,isCharacterTestCode} from './character-test/reset.mjs';
import {migratePowerSnapshot} from './power-policy.mjs';
const $=id=>document.getElementById(id),url='https://adakwbhxiuatjvphutgo.supabase.co/functions/v1/royale-v3-staging',prefix='royale-v3-play:';
const storage={getItem:k=>localStorage.getItem(prefix+k),setItem:(k,v)=>localStorage.setItem(prefix+k,v)};
let access='',refresh='',code='',slots=[],last=[null,null,null],busy=false,blocked=false,queue=Promise.resolve();
let characterTestSession=false;
const clothingSavesPending=new Set(); // Pause ordinary autosaves while a purchase awaits durable cloud acknowledgement.
function status(s){$('status').textContent=s;}
function showCloudNote(visible){const note=$('roster').querySelector('p');if(note)note.hidden=!visible;}
async function api(action,body={},auth=true){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+access}:{})},body:JSON.stringify({action,...body}),cache:'no-store'});const d=await r.json();if(!r.ok){const e=Error((d.error||'Cloud error')+' (HTTP '+r.status+', '+action+')');e.status=r.status;e.retryAfter=r.headers.get('Retry-After');throw e;}return d;}
async function renew(){const r=await api('renew',{refresh},false);access=r.access;refresh=r.refresh;}
async function call(action,body){try{return await api(action,body);}catch(e){if(e.status!==401||!refresh)throw e;await renew();return api(action,body);}}
async function run(fn){if(busy)return;busy=true;try{await fn();}catch(e){status(e.message);}finally{busy=false;}}
async function launch(){
 characterTestSession=false;
 document.body?.classList?.remove('kingjames-session');
 showCloudNote(true);
 $('refresh').textContent='Reload Cloud Heroes';
 // Always resolve each slot by its server-assigned number, never by array order.
 const response=await call('slots');
 const incoming=response.slots?.map(row=>({...row,snapshot:row.snapshot?migratePowerSnapshot(row.snapshot):null}));
 if(!Array.isArray(incoming))throw Error('Cloud slot response missing; existing heroes were not changed.');
 const byNumber=new Map(incoming.map(entry=>[entry.slot_number,entry]));
 if([1,2,3].some(number=>!byNumber.has(number)))throw Error('Cloud returned an incomplete slot list. No local heroes were replaced.');
 slots=[1,2,3].map(number=>byNumber.get(number));

const {LocalHeroStore}=await import('../royale/saves.mjs');
const store=new LocalHeroStore(storage),next=structuredClone(store.data);
console.info('[V3 cloud slot inventory]',slots.map(entry=>({slot:entry.slot_number,populated:!!entry.snapshot,revision:entry.revision})));
for(let i=0;i<3;i++){let snap=slots[i]?.snapshot||null;const journal=localStorage.getItem(prefix+'journal:'+i);if(journal){let j;try{j=JSON.parse(journal);}catch{}if(j?.snapshot&&snap===null&&j.revision===slots[i].revision){const saved=await call('save',{slot:i+1,revision:j.revision,snapshot:j.snapshot});slots[i].revision=saved.revision;snap=j.snapshot;localStorage.removeItem(prefix+'journal:'+i);}else if(j?.snapshot&&JSON.stringify(snap)!==JSON.stringify(j.snapshot)){const backup=prefix+'conflict:'+crypto.randomUUID();localStorage.setItem(backup,journal);if(localStorage.getItem(backup)!==journal)throw Error('Recovery backup failed');localStorage.removeItem(prefix+'journal:'+i);}}
next.slots[i]=snap?{id:'v3-slot-'+i,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),lastRegion:'Cloud',snapshot:snap}:null;}
const original=storage.getItem('healthia.royale.profiles.v2');if(original){const backup=prefix+'backup:'+crypto.randomUUID();localStorage.setItem(backup,original);if(localStorage.getItem(backup)!==original)throw Error('Local backup failed');}
const saved=store.flush(next,{atomic:true});if(!saved.ok)throw Error(saved.error||'Local restore failed');
last=slots.map(x=>x.snapshot?JSON.stringify(x.snapshot):null);console.info('[V3 cloud restored]',slots.map(x=>({slot:x.slot_number,revision:x.revision,x:x.snapshot?.world?.location?.x,y:x.snapshot?.world?.location?.y,xp:x.snapshot?.xp,coins:x.snapshot?.coins})));$('welcome').hidden=true;$('new-code').hidden=true;$('roster').hidden=false;$('game-frame').src='./gameplay/?codePlay=v3&v=steel-speed-1&cloudLoad='+Date.now();status('V3 cloud loaded. Choose a hero.');
}
// Fixed code 0000000000 is a public, isolated test mode, not a real Supabase
// 10-digit account. Never verify, write, or renew the production cloud here.
function launchCharacterTest(){
 characterTestSession=true;access='';refresh='';code=CHARACTER_TEST_CODE;
 document.body?.classList?.add('kingjames-session');
 blocked=false;slots=[];last=[null,null,null];
 showCloudNote(false);
 $('welcome').hidden=true;$('new-code').hidden=true;$('roster').hidden=false;
 $('refresh').textContent='Reload Character Test';
 const qa=new URLSearchParams(location.search).get('spriteQA')==='1'?'&spriteQA=1':'';
 $('game-frame').src='./kingjames/index.html?v2TestCharacter='+CHARACTER_TEST_CODE+'&v=steel-speed-1'+qa;
 status('KINGJAMES PROTOTYPE · 0000000000 · Progress saves on this browser every eight seconds.');
}
async function save(slot,snapshot,{clothingAction=false}={}){if(blocked||!access||![0,1,2].includes(slot)||!snapshot)return {ok:false,error:'Cloud saving is paused. Re-enter your code to reconcile progress.'};
 if(clothingSavesPending.has(slot)&&!clothingAction)return {ok:false,skipped:true,error:'Clothing purchase is being saved.'};snapshot=migratePowerSnapshot(snapshot);const raw=JSON.stringify(snapshot);if(raw===last[slot])return {ok:true};const key=prefix+'journal:'+slot;const journal=JSON.stringify({snapshot,revision:slots[slot].revision});localStorage.setItem(key,journal);
queue=queue.then(async()=>{if(characterTestSession||!access)return {ok:false,skipped:true,error:'Character test is separate from cloud saves.'};if(blocked)return {ok:false,error:'Cloud saving is paused. Re-enter your code.'};if(raw===last[slot])return {ok:true};
 const savedCosmeticRevision=slots[slot].snapshot?.cosmetics?.revision||0;
 const incomingCosmeticRevision=snapshot.cosmetics?.revision||0;
 if(incomingCosmeticRevision<savedCosmeticRevision){
   if(localStorage.getItem(key)===journal)localStorage.removeItem(key);
   return {ok:false,skipped:true,error:'Stale clothing snapshot ignored; reload your hero.'};
 }
 try{const result=await call('save',{slot:slot+1,revision:slots[slot].revision,snapshot});slots[slot].revision=result.revision;slots[slot].snapshot=snapshot;last[slot]=raw;console.info('[V3 cloud confirmed]',{slot:slot+1,revision:result.revision,x:snapshot.world.location.x,y:snapshot.world.location.y,xp:snapshot.xp,coins:snapshot.coins});if(localStorage.getItem(key)===journal)localStorage.removeItem(key);status('Saved Slot '+(slot+1)+' · '+new Date().toLocaleTimeString());return {ok:true};}catch(e){blocked=true;status('Cloud saving paused: '+e.message+' Local recovery preserved. Re-enter your code to retry safely.');console.error('[V3 save rejected]',{slot:slot+1,revision:slots[slot].revision,status:e.status,reason:e.message});return {ok:false,error:e.message};}});return queue;}
// Confirm cloud-session status explicitly for the child Clothing Store.
// Never reveal access tokens or allow standalone preview pages to authorize purchases.
window.addEventListener('message',e=>{
 if(e.origin!==location.origin||e.source!==$('game-frame').contentWindow||e.data?.type!=='royale-clothing-session-check')return;
 const slot=Number(e.data.slot);
 const verified=Number.isInteger(slot)&&slot>=0&&slot<3&&!!access&&!blocked&&!!slots[slot]?.snapshot;
 e.source.postMessage({type:'royale-clothing-session-status',slot,verified,
  reason:verified?'Cloud hero verified':!access?'V3 cloud login required':blocked?'Cloud saving paused':!slots[slot]?.snapshot?'Cloud hero slot not loaded':'Cloud session unavailable'},e.origin);
});
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==$('game-frame').contentWindow||e.data?.type!=='royale-code-progress')return;try{
 const snapshot=typeof e.data.snapshot==='string'?JSON.parse(e.data.snapshot):e.data.snapshot;
 if(!snapshot||typeof snapshot!=='object'||!snapshot.world?.location){status('Gameplay snapshot missing location; cloud save not attempted.');return;}
 console.info('[V3 save outgoing]',{slot:e.data.slot,region:snapshot.world.region,x:snapshot.world.location.x,y:snapshot.world.location.y,level:snapshot.level,xp:snapshot.xp,coins:snapshot.coins});
 void save(e.data.slot,snapshot);
 }catch(error){status('Could not decode live gameplay snapshot.');}});
// A purchase/Equip only becomes confirmed after the correct V3 slot acknowledges its revision.
window.addEventListener('message',async e=>{
 if(e.origin!==location.origin||e.source!==$('game-frame').contentWindow||e.data?.type!=='royale-clothing-save'||typeof e.data.requestId!=='string')return;
 const requestId=e.data.requestId,slot=e.data.slot;
 let result;
 try{
   if(!Number.isInteger(slot)||slot<0||slot>2||clothingSavesPending.has(slot))throw Error('Clothing save already in progress.');
   const snapshot=typeof e.data.snapshot==='string'?JSON.parse(e.data.snapshot):e.data.snapshot;
   const previous=slots[slot]?.snapshot;
   if(!previous||!snapshot?.world?.location||!snapshot.cosmetics||!Number.isSafeInteger(snapshot.coins)||snapshot.coins<0)throw Error('Invalid clothing save.');
   const oldRevision=previous.cosmetics?.revision||0;
   if(snapshot.cosmetics.revision!==oldRevision+1)throw Error('Clothing was modified by another game tab. Reload your hero.');
   // Coins may have increased legitimately since the last eight-second autosave.
   // The child applies the catalog quote before sending this authenticated save.
   clothingSavesPending.add(slot);
   result=await save(slot,snapshot,{clothingAction:true});
 }catch(error){result={ok:false,error:error.message};}
 finally{clothingSavesPending.delete(slot);}
 e.source.postMessage({type:'royale-clothing-saved',requestId,result},e.origin);
});
$('new').onclick=()=>void run(async()=>{const r=await api('create',{},false);access=r.access;refresh=r.refresh;code=r.code;$('code').textContent=code;$('welcome').hidden=true;$('new-code').hidden=false;});
$('enter').onclick=()=>$('input-area').hidden=false;
$('copy').onclick=()=>void navigator.clipboard.writeText(code).then(()=>status('Code copied. Keep it safe.'),()=>status('Copy the code displayed above.'));
$('load').onclick=()=>void run(async()=>{code=$('input').value.trim();if(!/^\d{10}$/.test(code))throw Error('Enter 10 digits');if(isCharacterTestCode(code)){launchCharacterTest();return;}const r=await api('verify',{code},false);access=r.access;refresh=r.refresh;await launch();});
$('continue').onclick=()=>void run(launch);
$('refresh').onclick=()=>void run(async()=>{if(characterTestSession){launchCharacterTest();return;}await launch();});
setInterval(()=>{if(refresh&&!blocked)void renew().catch(e=>status('Session renewal failed: '+e.message));},12*60000);

window.addEventListener('message',async e=>{
 if(e.origin!==location.origin||e.source!==$('game-frame').contentWindow||e.data?.type!=='royale-travel-save'||typeof e.data.requestId!=='string')return;
 let result;try{const snapshot=typeof e.data.snapshot==='string'?JSON.parse(e.data.snapshot):e.data.snapshot;result=snapshot?.world?.location?await save(e.data.slot,snapshot):{ok:false,error:'Missing travel snapshot.'};}catch(error){result={ok:false,error:error.message};}
 e.source.postMessage({type:'royale-travel-saved',requestId:e.data.requestId,result},e.origin);
});
