import {LocalHeroStore} from '../royale/saves.mjs';
const $=id=>document.getElementById(id),url='https://adakwbhxiuatjvphutgo.supabase.co/functions/v1/royale-v3-staging',prefix='royale-v3-play:';
const storage={getItem:k=>localStorage.getItem(prefix+'account-store:'+accountStore+':'+k),setItem:(k,v)=>localStorage.setItem(prefix+'account-store:'+accountStore+':'+k,v)};
let access='',refresh='',code='',accountTag='',accountStore='',slots=[],last=[null,null,null],busy=false,blocked=false,switching=false,queue=Promise.resolve();
const roomSlots=new Set();
const localRevision=slot=>Number(storage.getItem('cloud-revision:'+slot)||0);
const rememberRevision=(slot,revision)=>storage.setItem('cloud-revision:'+slot,String(Math.max(localRevision(slot),revision)));
function status(s){$('status').textContent=s;}
async function api(action,body={},auth=true){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+access}:{})},body:JSON.stringify({action,...body}),cache:'no-store'});const d=await r.json();if(!r.ok){const e=Error((d.error||'Cloud error')+' (HTTP '+r.status+', '+action+')');e.status=r.status;e.retryAfter=r.headers.get('Retry-After');throw e;}return d;}
async function renew(){const r=await api('renew',{refresh},false);access=r.access;refresh=r.refresh;}
async function call(action,body){try{return await api(action,body);}catch(e){if(e.status!==401||!refresh)throw e;await renew();return api(action,body);}}
async function run(fn){if(busy)return;busy=true;try{await fn();}catch(e){status(e.message);}finally{busy=false;}}
async function launch(){
 await queue;
 accountTag=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code))),b=>b.toString(16).padStart(2,'0')).join('').slice(0,24);
 // The URL receives a random cache namespace, never a hash that could expose
 // the ten-digit login code to an offline guessing attack in access logs.
 const namespaceKey=prefix+'account:'+accountTag;
 accountStore=localStorage.getItem(namespaceKey)||crypto.randomUUID().replaceAll('-','');
 if(!/^[a-f0-9]{32}$/.test(accountStore))throw Error('Local account cache needs recovery.');
 localStorage.setItem(namespaceKey,accountStore);
 // Always resolve each slot by its server-assigned number, never by array order.
 const response=await call('slots');
 const incoming=response.slots;
 if(!Array.isArray(incoming))throw Error('Cloud slot response missing; existing heroes were not changed.');
 const byNumber=new Map(incoming.map(entry=>[entry.slot_number,entry]));
 if([1,2,3].some(number=>!byNumber.has(number)))throw Error('Cloud returned an incomplete slot list. No local heroes were replaced.');
 slots=[1,2,3].map(number=>byNumber.get(number));
 if(slots.some((s,i)=>s.revision<localRevision(i)))throw Error('A newer cloud checkpoint arrived while loading. Reload Cloud Heroes to retry.');
 blocked=false;roomSlots.clear();

const store=new LocalHeroStore(storage),next=structuredClone(store.data);
console.info('[V3 cloud slot inventory]',slots.map(entry=>({slot:entry.slot_number,populated:!!entry.snapshot,revision:entry.revision})));
for(let i=0;i<3;i++){let snap=slots[i]?.snapshot||null;const key=prefix+'journal:'+accountTag+':'+i,journal=localStorage.getItem(key);if(journal){let j;try{j=JSON.parse(journal);}catch{}if(j?.snapshot&&snap===null&&j.revision===slots[i].revision){const saved=await call('save',{slot:i+1,revision:j.revision,snapshot:j.snapshot});slots[i].revision=saved.revision;snap=j.snapshot;localStorage.removeItem(key);}else if(j?.snapshot&&JSON.stringify(snap)!==JSON.stringify(j.snapshot)){const backup=prefix+'conflict:'+crypto.randomUUID();localStorage.setItem(backup,journal);if(localStorage.getItem(backup)!==journal)throw Error('Recovery backup failed');localStorage.removeItem(key);}}
next.slots[i]=snap?{id:'v3-slot-'+accountStore+'-'+i,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),lastRegion:'Cloud',snapshot:snap}:null;}
const original=storage.getItem('healthia.royale.profiles.v2');if(original){const backup=prefix+'backup:'+crypto.randomUUID();localStorage.setItem(backup,original);if(localStorage.getItem(backup)!==original)throw Error('Local backup failed');}
const saved=store.flush(next,{atomic:true});if(!saved.ok)throw Error(saved.error||'Local restore failed');
slots.forEach((s,i)=>rememberRevision(i,s.revision));
last=slots.map(x=>x.snapshot?JSON.stringify(x.snapshot):null);console.info('[V3 cloud restored]',slots.map(x=>({slot:x.slot_number,revision:x.revision,x:x.snapshot?.world?.location?.x,y:x.snapshot?.world?.location?.y,xp:x.snapshot?.xp,coins:x.snapshot?.coins})));$('welcome').hidden=true;$('new-code').hidden=true;$('roster').hidden=false;$('game-frame').src='../royale/?codePlay=v3&v=staging&cloudAccount='+accountStore+'&cloudLoad='+Date.now();status('V3 cloud loaded. Choose a hero.');
}
async function save(slot,snapshot){if(blocked||!access||![0,1,2].includes(slot)||!snapshot)return;const raw=JSON.stringify(snapshot);if(raw===last[slot])return;const key=prefix+'journal:'+accountTag+':'+slot;const journal=JSON.stringify({snapshot,revision:slots[slot].revision});localStorage.setItem(key,journal);
queue=queue.then(async()=>{if(blocked||raw===last[slot])return;try{const result=await call('save',{slot:slot+1,revision:slots[slot].revision,snapshot});slots[slot].revision=result.revision;slots[slot].snapshot=snapshot;last[slot]=raw;rememberRevision(slot,result.revision);console.info('[V3 cloud confirmed]',{slot:slot+1,revision:result.revision,x:snapshot.world.location.x,y:snapshot.world.location.y,xp:snapshot.xp,coins:snapshot.coins});if(localStorage.getItem(key)===journal)localStorage.removeItem(key);status('Saved Slot '+(slot+1)+' · '+new Date().toLocaleTimeString());}catch(e){blocked=true;status('Cloud saving paused: '+e.message+' Local recovery preserved. Re-enter your code to retry safely.');console.error('[V3 save rejected]',{slot:slot+1,revision:slots[slot].revision,status:e.status,reason:e.message});}});return queue;}
window.addEventListener('message',async e=>{
 if(e.origin!==location.origin||e.source!==$('game-frame').contentWindow)return;
 if(switching||!accountStore||e.data?.account!==accountStore)return;
 if(e.data?.type==='royale-room-session'){
  const {slot,snapshot,resume,requestId}=e.data;
  try{
   if(!Number.isInteger(slot)||slot<0||slot>2||typeof requestId!=='string'||requestId.length>100)throw Error('Select a saved hero.');
   if(blocked||!access)throw Error('Resolve the cloud save before joining multiplayer.');
   if(!resume){if(!snapshot)throw Error('Save this hero before joining multiplayer.');await save(slot,snapshot);await queue;if(blocked)throw Error('Cloud saving must finish before joining multiplayer.');}
   await renew();
   e.source.postMessage({type:'royale-room-session-result',requestId,access},location.origin);
  }catch(error){e.source.postMessage({type:'royale-room-session-result',requestId,error:error.message},location.origin);}
  return;
 }
 if(e.data?.type==='royale-multiplayer-checkpoint'){
  const {slot,snapshot,revision,savedAt,requestId}=e.data;
  try{
  if(!Number.isInteger(slot)||slot<0||slot>2||!snapshot?.world?.location||!Number.isSafeInteger(revision)||revision<Math.max(slots[slot]?.revision??0,localRevision(slot)))throw Error('A newer save is already present. Reload your heroes.');
  roomSlots.add(slot);slots[slot].snapshot=snapshot;slots[slot].revision=revision;last[slot]=JSON.stringify(snapshot);
  const store=new LocalHeroStore(storage),current=store.slot(slot);
  if(!current)throw Error('The selected hero changed. Reload your heroes.');
  const saved=store.writeSlot(slot,JSON.stringify(snapshot),{expectedId:current.id,region:'Multiplayer'});if(!saved.ok)throw Error(saved.error);
  rememberRevision(slot,revision);
  status('Saved Slot '+(slot+1)+' · '+new Date(savedAt).toLocaleTimeString());
  if(requestId)e.source.postMessage({type:'royale-checkpoint-confirmed',requestId},location.origin);
  }catch(error){status(error.message);if(requestId)e.source.postMessage({type:'royale-checkpoint-confirmed',requestId,error:error.message},location.origin);}
  return;
 }
 if(e.data?.type==='royale-room-released'){roomSlots.delete(e.data.slot);return;}
 if(e.data?.type!=='royale-code-progress'||roomSlots.has(e.data.slot))return;
 try{
 const snapshot=typeof e.data.snapshot==='string'?JSON.parse(e.data.snapshot):e.data.snapshot;
 if(!snapshot||typeof snapshot!=='object'||!snapshot.world?.location){status('Gameplay snapshot missing location; cloud save not attempted.');return;}
 console.info('[V3 save outgoing]',{slot:e.data.slot,region:snapshot.world.region,x:snapshot.world.location.x,y:snapshot.world.location.y,level:snapshot.level,xp:snapshot.xp,coins:snapshot.coins});
 void save(e.data.slot,snapshot);
 }catch(error){status('Could not decode live gameplay snapshot.');}});
$('new').onclick=()=>void run(async()=>{const r=await api('create',{},false);access=r.access;refresh=r.refresh;code=r.code;$('code').textContent=code;$('welcome').hidden=true;$('new-code').hidden=false;});
$('enter').onclick=()=>$('input-area').hidden=false;
$('copy').onclick=()=>void navigator.clipboard.writeText(code).then(()=>status('Code copied. Keep it safe.'),()=>status('Copy the code displayed above.'));
$('load').onclick=()=>void run(async()=>{switching=true;try{await queue;code=$('input').value.trim();if(!/^\d{10}$/.test(code))throw Error('Enter 10 digits');const r=await api('verify',{code},false);access=r.access;refresh=r.refresh;await launch();}finally{switching=false;}});
$('continue').onclick=()=>void run(launch);
$('refresh').onclick=()=>void run(launch);
setInterval(()=>{if(refresh&&!blocked)void renew().catch(e=>status('Session renewal failed: '+e.message));},12*60000);
