import {LocalHeroStore} from '../royale/saves.mjs';
const $=id=>document.getElementById(id);
const ENDPOINT='https://adakwbhxiuatjvphutgo.supabase.co/functions/v1/royale-code-saves';
const CODE_KEY='healthia.royale.code-saves.v1', PREFIX='royale-code-play-v1:', JOURNAL='healthia.royale.code-journal.v2:';
const storage={getItem:k=>localStorage.getItem(PREFIX+k),setItem:(k,v)=>localStorage.setItem(PREFIX+k,v)};
let code=null,revision=0,slots=[null,null,null],last=[null,null,null],queue=Promise.resolve(),blocked=false,loading=false;
const status=(message)=>{$('status').textContent=message;};
const view=(name)=>{for(const id of ['welcome','new-code','enter-code','playing'])$(id).hidden=id!==name;};
const journalKey=()=>JOURNAL+code;
const slotJournalKey=slot=>JOURNAL+code+':slot:'+slot;
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
function backupJournal(pending,reason,remote){
 const key=PREFIX+'recovery-backup:'+crypto.randomUUID();
 const raw=JSON.stringify({reason,code,local:pending,cloudRevision:remote.revision,cloudSlot:remote.slots?.[pending?.slot]??null,backedUpAt:Date.now()});
 localStorage.setItem(key,raw);
 if(localStorage.getItem(key)!==raw)throw Error('Local backup verification failed; cloud heroes were not modified.');
 return key;
}
async function reconcile(remote){
 // A recovery journal is not a login credential and must never block
 // access to a valid code. Archive it first, then load the cloud roster.
 const raw=localStorage.getItem(journalKey());
 if(raw===null)return remote;
 let pending;try{pending=JSON.parse(raw);}catch{pending={unreadableJournal:raw};}
 const same=Number.isInteger(pending?.slot)&&pending.slot>=0&&pending.slot<3&&
 pending.snapshot&&JSON.stringify(remote.slots[pending.slot])===JSON.stringify(pending.snapshot);
 if(same){localStorage.removeItem(journalKey());return remote;}
 backupJournal(pending,'Unconfirmed or divergent local journal; cloud preferred for login',remote);
 // Retain the original journal until a cloud restoration has completed.
 // It will be archived under the recovery-backup key as well.
 return remote;
}
async function loadCode(value){
 if(!/^\d{10}$/.test(value))throw Error('Enter exactly 10 digits.');
 if(loading)return;loading=true;blocked=true;
 try{
  await queue;
  const remote=await api({action:'recover',code:value});
  code=value;
  const resolved=await reconcile(remote);
  // Preserve unsent slot-specific journals independently. Do not overwrite
  // their local browser heroes with older cloud snapshots on reload.
  for(let i=0;i<3;i++){
   const pending=localStorage.getItem(slotJournalKey(i));if(!pending)continue;
   let local;try{local=JSON.parse(pending);}catch{continue;}
   if(!local?.snapshot)continue;
   if(JSON.stringify(resolved.slots[i])===JSON.stringify(local.snapshot)){localStorage.removeItem(slotJournalKey(i));continue;}
   if(resolved.slots[i]===null&&Number.isInteger(local.revision)&&local.revision===resolved.revision){
    // Only publish to a genuinely empty cloud slot at the expected revision.
    const saved=await api({action:'save',code:value,slot:i,revision:resolved.revision,snapshot:local.snapshot});
    resolved.revision=saved.revision;resolved.slots[i]=local.snapshot;localStorage.removeItem(slotJournalKey(i));
   }else{
    const backupKey=PREFIX+'slot-conflict-backup:'+crypto.randomUUID();
    localStorage.setItem(backupKey,pending);
    if(localStorage.getItem(backupKey)!==pending)throw Error('Could not preserve conflicting local hero.');
    localStorage.removeItem(slotJournalKey(i));
   }
  }
  saveLocal(resolved);
  // Remove the original pending journal only after local restoration succeeds
  // and its separate backup is durable.
  if(localStorage.getItem(journalKey())!==null){
   const backups=Object.keys(localStorage).filter(k=>k.startsWith(PREFIX+'recovery-backup:'));
   if(backups.length) localStorage.removeItem(journalKey());
  }
  revision=resolved.revision;slots=resolved.slots;last=slots.map(s=>s?JSON.stringify(s):null);
  localStorage.setItem(CODE_KEY,code);blocked=false;renderCode();view('playing');
  const frame=$('game-frame');frame.src='../royale/?codePlay=1&build=5006253f';
  status('Cloud ready · saving every 8 seconds. Any conflicting local progress was preserved as a backup.');
 }finally{loading=false;}
}
async function saveProgress(slot,snapshot){
 if(!code||blocked||![0,1,2].includes(slot)||!snapshot||typeof snapshot!=='object')return;
 const raw=JSON.stringify(snapshot);if(raw===last[slot])return;
 // Record the correct slot synchronously before queuing network work, so
 // closing immediately after creation cannot lose an unsent hero.
 const localKey=slotJournalKey(slot);
 const entry=JSON.stringify({slot,snapshot,createdAt:Date.now(),revision});
 try{localStorage.setItem(localKey,entry);if(localStorage.getItem(localKey)!==entry)throw Error('journal not durable');}
 catch(error){blocked=true;status('Local save could not be preserved. Cloud sync paused.');return;}
 queue=queue.then(async()=>{
  if(blocked||raw===last[slot])return;
  try{
   const result=await api({action:'save',code,slot,revision,snapshot});
   if(result.revision!==revision+1)throw Error('Unexpected cloud revision. Local recovery journal retained.');
   revision=result.revision;slots[slot]=snapshot;last[slot]=raw;
   if(localStorage.getItem(localKey)===entry)localStorage.removeItem(localKey);
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
