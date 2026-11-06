import {LocalHeroStore} from '../royale-cloud-test/saves.mjs';
const $=id=>document.getElementById(id);
const endpoint='https://adakwbhxiuatjvphutgo.supabase.co/functions/v1/royale-code-saves';
const key='healthia.royale.code-saves.v1';
let code=null,slots=[null,null,null],revision=0,busy=false;
function status(message){$('status').textContent=message;}
async function request(body){const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(20000)});const data=await response.json();if(!response.ok)throw Error(data.error||'Cloud service unavailable');return data;}
async function run(action){if(busy){status('Wait for the current save to finish.');return;}busy=true;for(const button of document.querySelectorAll('button'))button.disabled=true;try{await action();}catch(error){status(error.message||String(error));}finally{busy=false;for(const button of document.querySelectorAll('button'))button.disabled=false;}}
function button(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>void run(fn));return b;}
function display(){ $('entry').hidden=!!code;$('account').hidden=!code;if(!code)return;$('code').textContent=code;const root=$('slots');root.replaceChildren();const local=new LocalHeroStore(localStorage);
 for(let i=0;i<3;i++){const div=document.createElement('div');div.className='slot';const h=document.createElement('h3');h.textContent='Slot '+(i+1);div.append(h);const p=document.createElement('p');const saved=slots[i];const hero=saved?.hero||{};p.textContent=saved?'Level '+String(hero.level??saved.level??'?')+' · XP '+String(hero.xp??saved.xp??'?'):'Empty cloud slot';div.append(p);
 if(!saved){for(let j=0;j<3;j++){const existing=local.slot(j);if(!existing)continue;div.append(button('Copy Browser Hero '+(j+1),async()=>{const current=await request({action:'recover',code});if(current.revision!==revision||current.slots[i]!==null)throw Error('Cloud slot changed. Reload before importing.');const result=await request({action:'save',code,slot:i,revision,snapshot:existing.snapshot});revision=result.revision;const verified=await request({action:'recover',code});if(!verified.slots[i])throw Error('Import not verified. Browser save is unchanged.');slots=verified.slots;revision=verified.revision;display();status('Browser hero copied and verified. Original browser save retained.');}));}}
 else{div.append(button('Verify Saved Hero',async()=>{const remote=await request({action:'recover',code});if(JSON.stringify(remote.slots[i])!==JSON.stringify(saved))throw Error('Cloud slot changed. No data overwritten.');revision=remote.revision;status('Slot '+(i+1)+' verified. Revision '+revision+'.');}));}
 root.append(div);}}
async function recover(value){if(!/^\d{10}$/.test(value))throw Error('Enter exactly 10 digits.');const data=await request({action:'recover',code:value});code=value;slots=data.slots;revision=data.revision;localStorage.setItem(key,code);display();status('Heroes loaded from cloud.');}
$('create').onclick=()=>void run(async()=>{const data=await request({action:'create'});code=data.code;slots=data.slots;revision=data.revision;localStorage.setItem(key,code);display();status('Code created. Copy it somewhere safe.');});
$('recover').onclick=()=>void run(()=>recover($('recover-code').value.trim()));
$('copy').onclick=()=>void run(async()=>{await navigator.clipboard.writeText(code);status('Code copied.');});
$('forget').onclick=()=>void run(async()=>{code=null;slots=[null,null,null];revision=0;localStorage.removeItem(key);display();status('Code removed from this browser only. Cloud heroes remain stored.');});
$('reload').onclick=()=>void run(()=>recover(code));
const remembered=localStorage.getItem(key);if(remembered)void run(()=>recover(remembered));
