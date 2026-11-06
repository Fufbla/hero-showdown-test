import {LocalHeroStore} from '../royale/saves.mjs';
const $=id=>document.getElementById(id);
const ENDPOINT='https://adakwbhxiuatjvphutgo.supabase.co/functions/v1/royale-code-saves';
const CODE_KEY='healthia.royale.code-saves.v1', PREFIX='royale-code-play-v1:', JOURNAL='healthia.royale.code-journal.v2:';
const storage={getItem:k=>localStorage.getItem(PREFIX+k),setItem:(k,v)=>localStorage.setItem(PREFIX+k,v)};
let code=null,revision=0,slots=[null,null,null],last=[null,null,null],queue=Promise.resolve(),blocked=false,loading=false;
const status=(message)=>{$('status').textContent=message;};
const view=(name)=>{for(const id of ['welcome','new-code','enter-code','playing'])$(id).hidden=id!==name;};
const journalKey=()=>JOURNAL+code;
async function api(body){const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(20000)});let data;try{data=await response.json();}catch{throw Error('Cloud connection interrupted. Your local progress is retained.');}if(!response.ok)throw Error(response.status===404?'Code not found or unavailable.':data.error||'Cloud service unavailable.');return data;}
function renderCode(){ $('code').textContent=code||'';$('playing-code').textContent=code||'';}
function journalRead(){try{return JSON.parse(localStorage.getItem(journalKey())||'null');}catch{throw Error('Recovery journal cannot be read. Local data was not changed.');}}
function journalWrite(value){const raw=JSON.stringify(value);localStorage.setItem(journalKey(),raw);if(localStorage.getItem(journalKey())!==raw)throw Error('Recovery journal could not be verified.');}
function saveLocal(remote){
 const store=new LocalHeroStore(storage),next=structuredClone(store.data);
 // Preserve existing isolated code-play heroes before restoring a different
 // cloud snapshot. Never touch the regular royale browser save namespace.
 const existing=storage.getItem('healthia.royale.profiles.v2');
 if(existing&&store.data.slots.some((hero,i)=>hero&&JSON.stringify(hero.snapshot)!==JSON.stringify(remote.slots[i]))){
  const backupKey=PREFIX+'code-switch-backup:'+crypto.randomUUID();
  localStorage.setItem(backupKey,existing);
  if(localStorage.getItem(backupKey)!==existing)throw Error('Could not verify local hero backup. Cloud restore cancelled.');
 }
 for(let i=0;i<3;i++){const snap=remote.slots[i];next.slots[i]=snap?{id:'code-slot-'+i,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),lastRegion:'Cloud hero',snapshot:snap}:null;}
 const result=store.flush(next,{atomic:true});if(!result.ok)throw Error('Could not restore game slots: '+result.error);
}
async function reconcile(remote){
 const pending=journalRead();if(!pending)return remote;
 if(![0,1,2].includes(pending.slot)||!pending.snapshot||!Number.isSafeInteger(pending.revision))throw Error('Recovery journal needs attention; no data was overwritten.');
 const original=JSON.stringify(pending.snapshot);
 if(JSON.stringify(remote.slots[pending.slot])===original){localStorage.removeItem(journalKey());return remote;}
 if(remote.revision!==pending.revision){
  const backupKey=PREFIX+'conflict-backup:'+crypto.randomUUID();
  const backup=JSON.stringify({code,slot:pending.slot,snapshot:pending.snapshot,localRevision:pending.revision,cloudRevision:remote.revision,savedAt:Date.now()});
  localStorage.setItem(backupKey,backup);
  if(localStorage.getItem(backupKey)!==backup)throw Error('Unable to preserve local recovery. No cloud data was changed.');
  localStorage.removeItem(journalKey());
  status('Cloud heroes loaded. Conflicting local save safely backed up; newer cloud progress was not overwritten.');
  return remote;
 }
 const result=await api({action:'save',code,slot:pending.slot,revision:remote.revision,snapshot:pending.snapshot});
 const confirmed=await api({action:'recover',code});
 if(result.revision!==confirmed.revision||JSON.stringify(confirmed.slots[pending.slot])!==original)throw Error('Save not confirmed. Local recovery journal retained.');
 localStorage.removeItem(journalKey());return confirmed;
}
async function loadCode(value){
 if(!/^\d{10}$/.test(value))throw Error('Enter exactly 10 digits.');
 if(loading)return;loading=true;blocked=true;
 try{
  await queue;
  const remote=await api({action:'recover',code:value});
  code=value;
  const resolved=await reconcile(remote);
  saveLocal(resolved);
  revision=resolved.revision;slots=resolved.slots;last=slots.map(s=>s?JSON.stringify(s):null);
  localStorage.setItem(CODE_KEY,code);blocked=false;renderCode();view('playing');
  const frame=$('game-frame');frame.src='../royale/?codePlay=1&build=5006253f';
  status('Cloud ready · saving every 8 seconds');
 }finally{loading=false;}
}
async function saveProgress(slot,snapshot){
 if(!code||blocked||![0,1,2].includes(slot)||!snapshot||typeof snapshot!=='object')return;
 const raw=JSON.stringify(snapshot);if(raw===last[slot])return;
 queue=queue.then(async()=>{
  if(blocked||raw===last[slot])return;
  try{
   journalWrite({slot,revision,snapshot,createdAt:Date.now()});
   const result=await api({action:'save',code,slot,revision,snapshot});
   if(result.revision!==revision+1)throw Error('Unexpected cloud revision. Local recovery journal retained.');
   revision=result.revision;slots[slot]=snapshot;last[slot]=raw;localStorage.removeItem(journalKey());
   status('Cloud saved · '+new Date().toLocaleTimeString());
  }catch(error){blocked=true;status('Cloud sync paused · '+error.message+' Local recovery retained.');}
 });
 return queue;
}
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==$('game-frame').contentWindow||event.data?.type!=='royale-code-progress')return;
 try{const snap=typeof event.data.snapshot==='string'?JSON.parse(event.data.snapshot):event.data.snapshot;void saveProgress(event.data.slot,snap);}catch{status('Could not read hero progress.');}
});
$('get-code').onclick=async()=>{try{$('get-code').disabled=true;const result=await api({action:'create'});code=result.code;renderCode();view('new-code');status('Keep this code to recover your heroes.');}catch(e){status(e.message);}finally{$('get-code').disabled=false;}};
$('enter').onclick=()=>view('enter-code');
$('back').onclick=()=>view('welcome');
$('continue').onclick=()=>void loadCode(code).catch(e=>status(e.message));
$('load-code').onclick=()=>void loadCode($('input-code').value.trim()).catch(e=>status(e.message));
$('input-code').addEventListener('keydown',e=>{if(e.key==='Enter')$('load-code').click();});
$('copy').onclick=()=>void navigator.clipboard.writeText(code).then(()=>status('Code copied.'),()=>status('Copy the displayed code to keep it safe.'));
$('switch').onclick=()=>{if(journalRead()){status('Unconfirmed progress is retained on this device. Wait for cloud recovery before switching codes.');return;}blocked=true;$('game-frame').removeAttribute('src');code=null;localStorage.removeItem(CODE_KEY);view('welcome');};
const previous=localStorage.getItem(CODE_KEY);
if(previous&&/^\d{10}$/.test(previous))$('input-code').value=previous;
window.addEventListener('online',()=>{if(code&&blocked)void loadCode(code).catch(e=>status('Cloud recovery waiting: '+e.message));});
setInterval(()=>{if(code&&blocked&&navigator.onLine&&!loading)void loadCode(code).catch(e=>status('Cloud recovery waiting: '+e.message));},15000);
