import {CodeAutosync} from './auto-sync.mjs';
import {LocalHeroStore} from '../royale-cloud-test/saves.mjs';
const $=id=>document.getElementById(id);
const endpoint='https://adakwbhxiuatjvphutgo.supabase.co/functions/v1/royale-code-saves';
const key='healthia.royale.code-saves.v1';
let code=null,slots=[null,null,null],revision=0,busy=false;
let autosync=null,waiting=null;
function status(message){$('status').textContent=message;}
async function request(body){const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(20000)});const data=await response.json();if(!response.ok)throw Error(data.error||'Cloud service unavailable');return data;}
async function run(action){if(busy){status('Wait for the current save to finish.');return;}busy=true;for(const button of document.querySelectorAll('button'))button.disabled=true;try{await action();}catch(error){status(error.message||String(error));}finally{busy=false;for(const button of document.querySelectorAll('button'))button.disabled=false;}}
function button(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>void run(fn));return b;}
function createAutosync(){return new CodeAutosync({
 readLocal:index=>new LocalHeroStore(localStorage).slot(index),
 readRemote:()=>request({action:'recover',code}),
 save:async({slot,revision,snapshot})=>{
  const result=await request({action:'save',code,slot,revision,snapshot});
  const verify=await request({action:'recover',code});
  if(verify.revision!==result.revision||JSON.stringify(verify.slots[slot])!==JSON.stringify(snapshot))throw Error('Cloud save verification mismatch');
  slots=verify.slots;return result;
 },
 onStatus:status
});}
async function connectWhenReady(browserSlot,cloudSlot){
 if(waiting){clearInterval(waiting);waiting=null;}
 if(autosync){autosync.stop();autosync=null;}
 const begin=async()=>{
  const local=new LocalHeroStore(localStorage).slot(browserSlot);
  if(!local?.snapshot)return false;
  if(waiting){clearInterval(waiting);waiting=null;}
  const current=await request({action:'recover',code});
  if(current.slots[cloudSlot]!==null)throw Error('Cloud slot is no longer empty. No hero overwritten.');
  autosync=createAutosync();
  await autosync.start({browserSlot,cloudSlot});
  const updated=await request({action:'recover',code});
  slots=updated.slots;revision=updated.revision;display();
  status('Hero saved to Cloud Slot '+(cloudSlot+1)+'. Auto-save is active while this page stays open.');
  return true;
 };
 if(await begin())return;
 $('launch-game').click();
 status('Create your hero and save it in Browser Slot '+(browserSlot+1)+'. This page will automatically connect it to Cloud Slot '+(cloudSlot+1)+'.');
 waiting=setInterval(()=>{if(!busy&&new LocalHeroStore(localStorage).slot(browserSlot)){clearInterval(waiting);waiting=null;void run(begin);}},2500);
}
function display(){ $('entry').hidden=!!code;$('account').hidden=!code;if(!code)return;$('code').textContent=code;const root=$('slots');root.replaceChildren();const local=new LocalHeroStore(localStorage);
 for(let i=0;i<3;i++){const div=document.createElement('div');div.className='slot';const h=document.createElement('h3');h.textContent='Slot '+(i+1);div.append(h);const p=document.createElement('p');const saved=slots[i];const hero=saved?.hero||saved||{};p.textContent=saved?'Level '+String(hero.level??saved.level??'?')+' · XP '+String(hero.xp??saved.xp??'?'):'Empty cloud slot';div.append(p);
 if(!saved){div.append(button('Connect Browser Slot '+(i+1)+' & Auto-Save',()=>connectWhenReady(i,i)));for(let j=0;j<3;j++){const existing=local.slot(j);if(!existing)continue;div.append(button('Copy Browser Hero '+(j+1),async()=>{const current=await request({action:'recover',code});if(current.revision!==revision||current.slots[i]!==null)throw Error('Cloud slot changed. Reload before importing.');const result=await request({action:'save',code,slot:i,revision,snapshot:existing.snapshot});revision=result.revision;const verified=await request({action:'recover',code});if(!verified.slots[i])throw Error('Import not verified. Browser save is unchanged.');slots=verified.slots;revision=verified.revision;display();status('Browser hero copied and verified. Original browser save retained.');}));}}
 else{
 div.append(button('Restore to Empty Browser Slot',async()=>{
  const localStore=new LocalHeroStore(localStorage);
  const empty=[0,1,2].find(n=>!localStore.slot(n));
  if(empty===undefined)throw Error('All browser hero slots are occupied. No save was overwritten.');
  const remote=await request({action:'recover',code});
  if(!remote.slots[i])throw Error('Cloud hero is missing.');
  const result=localStore.writeSlot(empty,remote.slots[i],{expectedId:null,requireDurable:true});
  if(!result.ok)throw Error(result.error||'Browser restore failed.');
  const verified=new LocalHeroStore(localStorage).slot(empty);
  if(!verified?.snapshot)throw Error('Browser restore could not be verified.');
  status('Cloud hero restored into empty browser slot '+(empty+1)+'. Reload the playable game to select it.');
 }));
 div.append(button('Verify Saved Hero',async()=>{const remote=await request({action:'recover',code});if(JSON.stringify(remote.slots[i])!==JSON.stringify(saved))throw Error('Cloud slot changed. No data overwritten.');revision=remote.revision;status('Slot '+(i+1)+' verified. Revision '+revision+'.');}));}
 if(!saved){for(let j=0;j<3;j++){if(!local.slot(j))continue;const browserIndex=j;div.append(button('Auto-Save Browser Hero '+(j+1),async()=>{
  if(autosync){autosync.stop();autosync=null;}
  if(!confirm('Automatically copy Browser Hero '+(j+1)+' into empty Cloud Slot '+(i+1)+' and keep saving while this page stays open? Your browser hero will not be deleted.'))return;
  autosync=createAutosync();await autosync.start({browserSlot:browserIndex,cloudSlot:i});revision=autosync.revision;
  const current=await request({action:'recover',code});slots=current.slots;revision=current.revision;display();
  status('Auto-save enabled while this page stays open. Keep the game and this page in the same browser.');
 }));}}
 root.append(div);}}
async function recover(value){if(autosync){autosync.stop();autosync=null;}if(!/^\d{10}$/.test(value))throw Error('Enter exactly 10 digits.');const data=await request({action:'recover',code:value});code=value;slots=data.slots;revision=data.revision;localStorage.setItem(key,code);display();status('Heroes loaded from cloud.');}
$('create').onclick=()=>void run(async()=>{const data=await request({action:'create'});code=data.code;slots=data.slots;revision=data.revision;localStorage.setItem(key,code);display();status('Code created. Copy it somewhere safe.');});
$('recover').onclick=()=>void run(()=>recover($('recover-code').value.trim()));
$('copy').onclick=()=>void run(async()=>{await navigator.clipboard.writeText(code);status('Code copied.');});
$('forget').onclick=()=>void run(async()=>{if(autosync){autosync.stop();autosync=null;}code=null;slots=[null,null,null];revision=0;localStorage.removeItem(key);display();status('Code removed from this browser only. Cloud heroes remain stored.');});
$('reload').onclick=()=>void run(()=>recover(code));
window.addEventListener('pagehide',()=>{autosync?.stop();if(waiting)clearInterval(waiting);});
$('launch-game').onclick=()=>{const panel=$('playable');panel.hidden=false;const frame=$('game-frame');if(!frame.getAttribute('src'))frame.src='../royale/';status('Playable game opened. Browser hero saves can be copied to your code slots above.');};
$('reload-game').onclick=()=>{const frame=$('game-frame');frame.src='../royale/?reload='+Date.now();status('Game reloaded.');};
const remembered=localStorage.getItem(key);if(remembered)void run(()=>recover(remembered));
