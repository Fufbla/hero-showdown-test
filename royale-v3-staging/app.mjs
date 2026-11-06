import {LocalHeroStore} from '../royale/saves.mjs';
const $=id=>document.getElementById(id),url='https://adakwbhxiuatjvphutgo.supabase.co/functions/v1/royale-v3-staging',prefix='royale-v3-play:';
const storage={getItem:k=>localStorage.getItem(prefix+k),setItem:(k,v)=>localStorage.setItem(prefix+k,v)};
let access='',refresh='',code='',slots=[],last=[null,null,null],busy=false,blocked=false,queue=Promise.resolve();
function status(s){$('status').textContent=s;}
async function api(action,body={},auth=true){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+access}:{})},body:JSON.stringify({action,...body}),cache:'no-store'});const d=await r.json();if(!r.ok){const e=Error((d.error||'Cloud error')+' (HTTP '+r.status+', '+action+')');e.status=r.status;e.retryAfter=r.headers.get('Retry-After');throw e;}return d;}
async function renew(){const r=await api('renew',{refresh},false);access=r.access;refresh=r.refresh;}
async function call(action,body){try{return await api(action,body);}catch(e){if(e.status!==401||!refresh)throw e;await renew();return api(action,body);}}
async function run(fn){if(busy)return;busy=true;try{await fn();}catch(e){status(e.message);}finally{busy=false;}}
async function launch(){slots=(await call('slots')).slots;
const store=new LocalHeroStore(storage),next=structuredClone(store.data);
// Slot 3 recovery: an unconfirmed locally created hero must not be erased
// by an empty cloud response. The cloud write is revision-checked.
if(slots[2]?.snapshot===null&&store.data.slots[2]?.snapshot){
 const localSnapshot=store.data.slots[2].snapshot;
 const backupKey=prefix+'slot3-before-recovery:'+crypto.randomUUID();
 const raw=JSON.stringify(localSnapshot);
 localStorage.setItem(backupKey,raw);
 if(localStorage.getItem(backupKey)!==raw)throw Error('Slot 3 backup verification failed.');
 const saved=await call('save',{slot:3,revision:slots[2].revision,snapshot:localSnapshot});
 slots[2]={...slots[2],snapshot:localSnapshot,revision:saved.revision};
 status('Slot 3 recovered from local save and confirmed in cloud.');
}

for(let i=0;i<3;i++){let snap=slots[i]?.snapshot||null;const journal=localStorage.getItem(prefix+'journal:'+i);if(journal){let j;try{j=JSON.parse(journal);}catch{}if(j?.snapshot&&snap===null&&j.revision===slots[i].revision){const saved=await call('save',{slot:i+1,revision:j.revision,snapshot:j.snapshot});slots[i].revision=saved.revision;snap=j.snapshot;localStorage.removeItem(prefix+'journal:'+i);}else if(j?.snapshot&&JSON.stringify(snap)!==JSON.stringify(j.snapshot)){const backup=prefix+'conflict:'+crypto.randomUUID();localStorage.setItem(backup,journal);if(localStorage.getItem(backup)!==journal)throw Error('Recovery backup failed');localStorage.removeItem(prefix+'journal:'+i);}}
next.slots[i]=snap?{id:'v3-slot-'+i,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),lastRegion:'Cloud',snapshot:snap}:null;}
const original=storage.getItem('healthia.royale.profiles.v2');if(original){const backup=prefix+'backup:'+crypto.randomUUID();localStorage.setItem(backup,original);if(localStorage.getItem(backup)!==original)throw Error('Local backup failed');}
const saved=store.flush(next,{atomic:true});if(!saved.ok)throw Error(saved.error||'Local restore failed');
last=slots.map(x=>x.snapshot?JSON.stringify(x.snapshot):null);console.info('[V3 cloud restored]',slots.map(x=>({slot:x.slot_number,revision:x.revision,x:x.snapshot?.world?.location?.x,y:x.snapshot?.world?.location?.y,xp:x.snapshot?.xp,coins:x.snapshot?.coins})));$('welcome').hidden=true;$('new-code').hidden=true;$('roster').hidden=false;$('game-frame').src='../royale/?codePlay=v3&v=staging';status('V3 cloud loaded. Choose a hero.');
}
async function save(slot,snapshot){if(blocked||!access||![0,1,2].includes(slot)||!snapshot)return;const raw=JSON.stringify(snapshot);if(raw===last[slot])return;const key=prefix+'journal:'+slot;const journal=JSON.stringify({snapshot,revision:slots[slot].revision});localStorage.setItem(key,journal);
queue=queue.then(async()=>{if(blocked||raw===last[slot])return;try{const result=await call('save',{slot:slot+1,revision:slots[slot].revision,snapshot});slots[slot].revision=result.revision;slots[slot].snapshot=snapshot;last[slot]=raw;console.info('[V3 cloud confirmed]',{slot:slot+1,revision:result.revision,x:snapshot.world.location.x,y:snapshot.world.location.y,xp:snapshot.xp,coins:snapshot.coins});if(localStorage.getItem(key)===journal)localStorage.removeItem(key);status('Saved Slot '+(slot+1)+' · '+new Date().toLocaleTimeString());}catch(e){blocked=true;status('Cloud saving paused: '+e.message+' Local recovery preserved. Re-enter your code to retry safely.');console.error('[V3 save rejected]',{slot:slot+1,revision:slots[slot].revision,status:e.status,reason:e.message});}});return queue;}
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==$('game-frame').contentWindow||e.data?.type!=='royale-code-progress')return;try{
 const snapshot=typeof e.data.snapshot==='string'?JSON.parse(e.data.snapshot):e.data.snapshot;
 if(!snapshot||typeof snapshot!=='object'||!snapshot.world?.location){status('Gameplay snapshot missing location; cloud save not attempted.');return;}
 console.info('[V3 save outgoing]',{slot:e.data.slot,region:snapshot.world.region,x:snapshot.world.location.x,y:snapshot.world.location.y,level:snapshot.level,xp:snapshot.xp,coins:snapshot.coins});
 void save(e.data.slot,snapshot);
 }catch(error){status('Could not decode live gameplay snapshot.');}});
$('new').onclick=()=>void run(async()=>{const r=await api('create',{},false);access=r.access;refresh=r.refresh;code=r.code;$('code').textContent=code;$('welcome').hidden=true;$('new-code').hidden=false;});
$('enter').onclick=()=>$('input-area').hidden=false;
$('copy').onclick=()=>void navigator.clipboard.writeText(code).then(()=>status('Code copied. Keep it safe.'),()=>status('Copy the code displayed above.'));
$('load').onclick=()=>void run(async()=>{code=$('input').value.trim();if(!/^\d{10}$/.test(code))throw Error('Enter 10 digits');const r=await api('verify',{code},false);access=r.access;refresh=r.refresh;await launch();});
$('continue').onclick=()=>void run(launch);
$('refresh').onclick=()=>void run(launch);
setInterval(()=>{if(refresh&&!blocked)void renew().catch(e=>status('Session renewal failed: '+e.message));},12*60000);
