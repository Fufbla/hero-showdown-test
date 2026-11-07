import {LocalHeroStore} from './royale/saves.mjs';
import {LegendaryLedger} from './royale/legendary-ledger.mjs';
const device=(new URLSearchParams(location.search).get('device')||'default').replace(/[^a-z0-9-]/gi,'').slice(0,30);
const $=id=>document.getElementById(id),endpoint='https://adakwbhxiuatjvphutgo.supabase.co/functions/v1/royale-mp-test?forceFunctionRegion=us-west-2',prefix='royale-mp-test:'+device+':',key=prefix+'sessions';
let sessions=JSON.parse(localStorage.getItem(key)||'[null,null]'),sourceAccess='',busy=false;
const storage={getItem:k=>localStorage.getItem(prefix+k),setItem:(k,v)=>localStorage.setItem(prefix+k,v)};
const status=text=>$('status').textContent=text;
async function api(action,body={},token=''){const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({action,...body})}),d=await r.json();if(!r.ok)throw Error(d.error||'Test connection failed.');return d;}
async function run(fn){if(busy)return;busy=true;document.querySelectorAll('#setup button').forEach(b=>b.disabled=true);try{await fn();}catch(e){status(e.message);}finally{busy=false;document.querySelectorAll('#setup button').forEach(b=>b.disabled=b.dataset.sourceSlot!==undefined&&!!sessions[Number(b.dataset.sourceSlot)]);}}
function remember(){localStorage.setItem(key,JSON.stringify(sessions));render();}
function render(){
 $('saved').replaceChildren();for(let i=0;i<2;i++)if(sessions[i]){const s=sessions[i],card=document.createElement('article');card.className='card';const h=document.createElement('h2');h.textContent=s.snapshot.look.name;const p=document.createElement('p');p.textContent=`Test Slot ${i+1} · Level ${s.snapshot.level} · ${s.snapshot.xp} XP`;const b=document.createElement('button');b.textContent='Play test hero';b.dataset.slot=i;b.onclick=()=>run(()=>launch(i));card.append(h,p,b);$('saved').append(card);}
}
async function add(action,body,token=''){
 const slot=sessions.findIndex(s=>!s);if(slot<0)throw Error('Both test slots have heroes. Choose Play test hero above.');
 if(action==='copy'&&sessions[body.slot])throw Error('That test slot is already occupied. Its existing copy is retained.');
 const data=await api(action,{...body,slot:action==='copy'?body.slot:slot},token);
 if(sessions[data.slot])throw Error('That test slot is already occupied. Its existing copy is retained.');
 sessions[data.slot]=data;remember();status('Test copy created. The original save was not changed.');
}
async function launch(selected){
 for(let i=0;i<2;i++)if(sessions[i]){const s=await api('profile',{},sessions[i].access);sessions[i]={...sessions[i],...s};}remember();
 const store=new LocalHeroStore(storage),next=structuredClone(store.data);next.activeSlot=selected;
 for(let i=0;i<3;i++){const s=sessions[i];next.slots[i]=s?{id:'test-'+s.id,createdAt:s.savedAt,updatedAt:s.savedAt,lastRegion:'Multiplayer test',snapshot:s.snapshot}:null;}
 const result=store.flush(next,{atomic:true});if(!result.ok)throw Error(result.error);
 const ledger=await LegendaryLedger.open(window.indexedDB,prefix+'permanent');
 for(const s of sessions.filter(Boolean))if(s.snapshot.legendary?.revision){const id='test-'+s.id,old=(await ledger.all()).find(x=>x.heroId===id);if(!old||old.revision<s.snapshot.legendary.revision)await ledger.commit(id,old?.revision||0,JSON.stringify(s.snapshot));}ledger.close();
 $('setup').hidden=true;$('play').hidden=false;$('back').hidden=false;$('game-frame').src='./royale/?codePlay=v3&mpDevice='+encodeURIComponent(device)+'&cloudLoad='+Date.now();status('Test saves only · choose Create Multiplayer Room or Join Multiplayer Room.');
}
window.addEventListener('message',e=>{
 if(e.origin!==location.origin||e.source!==$('game-frame').contentWindow)return;
 if(e.data?.type==='royale-room-session'){
  const s=sessions[e.data.slot];e.source.postMessage({type:'royale-room-session-result',requestId:e.data.requestId,...(s?{access:s.access}:{error:'Choose a saved test hero first.'})},location.origin);return;
 }
 if(e.data?.type==='royale-multiplayer-checkpoint'){
  const d=e.data,s=sessions[d.slot];if(!s||d.revision<s.revision)return;
  s.snapshot=d.snapshot;s.revision=d.revision;s.savedAt=d.savedAt;remember();
  const store=new LocalHeroStore(storage),slot=store.slot(d.slot);if(slot)store.writeSlot(d.slot,JSON.stringify(d.snapshot),{expectedId:slot.id,region:'Multiplayer test'});
  status('Saved test Slot '+(d.slot+1)+' · '+new Date(d.savedAt).toLocaleTimeString());
 }
 // Browser snapshots never write to the test authority or any original save.
});
$('new-form').onsubmit=e=>{e.preventDefault();void run(()=>add('new',{name:$('test-name').value}));};
$('source-form').onsubmit=e=>{e.preventDefault();void run(async()=>{
 sourceAccess=(await api('source-login',{code:$('source-code').value.trim()})).access;$('source-code').value='';const {slots}=await api('source-slots',{},sourceAccess);$('source-heroes').replaceChildren();
 for(const s of slots){const b=document.createElement('button');b.dataset.sourceSlot=s.slot;b.textContent=`Copy ${s.name} · Lv ${s.level}`;b.onclick=()=>run(()=>add('copy',{slot:s.slot},sourceAccess));b.disabled=!!sessions[s.slot];$('source-heroes').append(b);}status(slots.length?'Choose a hero to create its separate test copy.':'No heroes in visible Slots 1 and 2.');
 });};
$('back').onclick=()=>{$('game-frame').src='about:blank';$('play').hidden=true;$('setup').hidden=false;$('back').hidden=true;status('Your server test progress is retained.');render();};
render();
