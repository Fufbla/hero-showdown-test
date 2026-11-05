import {PlayerAccountAPI} from '../royale-cloud-test/player-account-client.mjs';
import {CloudHeroStore} from '../royale-cloud-test/cloud-client.mjs';
import {LocalHeroStore} from '../royale-cloud-test/saves.mjs';
const $=id=>document.getElementById(id);
const api=new PlayerAccountAPI({storageKey:'healthia.royale.auth.v1'});
let cloud=null,busy=false;
function status(t){$('status').textContent=t;}
function button(label,fn){const b=document.createElement('button');b.textContent=label;b.onclick=()=>void run(fn);return b;}
async function run(fn){if(busy)return;busy=true;try{await fn();}catch(e){status(e.message||String(e));}finally{busy=false;}}
function snapshotInfo(slot){const s=slot?.snapshot;if(!s)return 'Empty';const hero=s.hero||{};return 'Hero: '+String(hero.name||s.name||'Saved Hero')+' · Level '+String(hero.level||s.level||'?')+' · XP '+String(hero.xp??s.xp??'?');}
async function load(){const next=new CloudHeroStore(api);await next.refresh();cloud=next;$('login').hidden=true;$('roster').hidden=false;$('account-name').textContent='Account: '+(cloud.user?.username||'Signed in');render();status('Cloud roster loaded. Existing saves have not been modified.');}
function render(){const root=$('slots');root.replaceChildren();const local=new LocalHeroStore(localStorage);
 for(let i=0;i<3;i++){const section=document.createElement('div');section.className='slot';const title=document.createElement('h3');title.textContent='Slot '+(i+1);const desc=document.createElement('p');const hero=cloud.slot(i);desc.textContent=snapshotInfo(hero);section.append(title,desc);
 if(hero){const revision=document.createElement('small');revision.textContent='Cloud revision '+cloud.meta[i]?.revision;section.append(revision);
 section.append(button('Verify Cloud Restoration',async()=>{const expected=JSON.stringify(cloud.slot(i)?.snapshot);await load();const actual=JSON.stringify(cloud.slot(i)?.snapshot);if(expected!==actual)throw Error('Cloud snapshot changed during verification; no save was written.');status('Slot '+(i+1)+' restored identically from the server.');}));}
 else{for(let j=0;j<3;j++){const existing=local.slot(j);if(!existing)continue;section.append(button('Import Browser Slot '+(j+1),async()=>{if(!confirm('Copy browser slot '+(j+1)+' into EMPTY cloud slot '+(i+1)+'? Your browser save will remain unchanged.'))return;const before=JSON.stringify(existing.snapshot);const fresh=new CloudHeroStore(api);await fresh.refresh();if(fresh.slot(i))throw Error('Cloud slot is no longer empty. Import cancelled.');await fresh.migrate(i,existing);const verify=new CloudHeroStore(api);await verify.refresh();if(!verify.slot(i)?.snapshot)throw Error('Cloud import could not be restored. Original browser hero is unchanged.');cloud=verify;render();status('Import verified in cloud slot '+(i+1)+'. Browser save retained.');}));}}
 root.append(section);}}
$('login-form').onsubmit=e=>{e.preventDefault();void run(async()=>{status('Signing in…');await api.signIn($('username').value.trim(),$('password').value);$('password').value='';await load();});};
$('reload').onclick=()=>void run(load);
$('logout').onclick=()=>void run(async()=>{await api.logout();cloud=null;$('roster').hidden=true;$('login').hidden=false;status('Signed out.');});
void run(async()=>{const {data}=await api.auth.getSession();if(data?.session)await load();});
