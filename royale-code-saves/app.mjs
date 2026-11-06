import {LocalHeroStore,PROFILE_KEY} from '../royale/saves.mjs';
const $=id=>document.getElementById(id),endpoint='https://adakwbhxiuatjvphutgo.supabase.co/functions/v1/royale-code-saves',key='healthia.royale.code-saves.v1',prefix='royale-code-play-v1:';
let code=null,slots=[null,null,null],revision=0,queue=Promise.resolve(),last=[null,null,null],blocked=false;
const storage={getItem:k=>localStorage.getItem(prefix+k),setItem:(k,v)=>localStorage.setItem(prefix+k,v)};
function status(s){$('status').textContent=s;}
async function api(body){const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(20000)});const d=await r.json();if(!r.ok)throw Error(d.error||'Cloud unavailable');return d;}
function button(label,fn){const b=document.createElement('button');b.textContent=label;b.type='button';b.onclick=()=>void fn().catch(e=>status(e.message));return b;}
function draw(){ $('entry').hidden=!!code;$('account').hidden=!code;if(!code)return;$('code').textContent=code;const root=$('slots');root.replaceChildren();for(let i=0;i<3;i++){const div=document.createElement('div');div.className='slot';const h=document.createElement('h3');h.textContent='Slot '+(i+1);div.append(h);const p=document.createElement('p');const snap=slots[i],hero=snap?.hero||snap;p.textContent=snap?'Level '+(hero?.level??'?')+' · XP '+(hero?.xp??'?'):'Empty · Create Hero in Slot '+(i+1);div.append(p);root.append(div);}}
async function open(value){if(!/^\\d{10}$/.test(value))throw Error('Enter exactly 10 digits.');blocked=true;await queue;const remote=await api({action:'recover',code:value});
 // Keep the game's three slots isolated from all normal browser heroes.
 // Only replace the isolated code-play storage after a confirmed cloud read.
 const local=new LocalHeroStore(storage);
 const next=structuredClone(local.data);
 for(let i=0;i<3;i++){const snap=remote.slots[i];next.slots[i]=snap?{id:'code-slot-'+i,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),lastRegion:'Cloud hero',snapshot:snap}:null;}
 const saved=local.flush(next,{atomic:true});if(!saved.ok)throw Error('Could not prepare isolated hero slots: '+saved.error);
 code=value;slots=remote.slots;revision=remote.revision;last=slots.map(s=>s?JSON.stringify(s):null);localStorage.setItem(key,code);blocked=false;draw();$('game-frame').src='../royale/?codePlay=1&v=5006253f';status('Heroes loaded. Progress saves automatically every 8 seconds.');}
async function saveProgress(slot,snapshot){if(!code||blocked||![0,1,2].includes(slot))return;const raw=JSON.stringify(snapshot);if(raw===last[slot])return;queue=queue.then(async()=>{
  if(blocked||raw===last[slot])return;
  try{const result=await api({action:'save',code,slot,revision,snapshot});revision=result.revision;last[slot]=raw;slots[slot]=snapshot;draw();status('Cloud saved automatically · '+new Date().toLocaleTimeString());}
  catch(e){blocked=true;status('Automatic saving paused: '+e.message+'. Your browser hero remains saved.');}
 });await queue;}
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==$('game-frame').contentWindow||e.data?.type!=='royale-code-progress')return;void saveProgress(e.data.slot,JSON.parse(e.data.snapshot));});
$('create').onclick=()=>void (async()=>{try{const r=await api({action:'create'});await open(r.code);}catch(e){status(e.message);}})();
$('recover').onclick=()=>void open($('recover-code').value.trim()).catch(e=>status(e.message));
$('copy').onclick=()=>void navigator.clipboard.writeText(code).then(()=>status('Code copied.'),e=>status('Copy failed: '+e.message));
$('forget').onclick=()=>{blocked=true;code=null;localStorage.removeItem(key);$('game-frame').removeAttribute('src');draw();status('Code removed from this browser. Cloud saves remain available with the code.');};
$('reload').onclick=()=>void open(code).catch(e=>status(e.message));
const remembered=localStorage.getItem(key);if(remembered)void open(remembered).catch(e=>status(e.message));
