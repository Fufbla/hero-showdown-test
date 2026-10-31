import {Game,xpForLevel} from '../core.mjs';
import {PROFILE_KEY} from '../saves.mjs';
import {WORLD_REGIONS} from '../world.mjs';
const $=id=>document.getElementById(id),frame=$('frame'),wait=ms=>new Promise(r=>setTimeout(r,ms));
$('run').onclick=async()=>{
 $('run').disabled=true;$('log').textContent='';let count=0;
 const check=(label,ok)=>{if(!ok)throw Error(label);count++;$('log').textContent+='PASS · '+label+'\n';};
 const until=async fn=>{const end=Date.now()+60000;while(!fn()){if(Date.now()>end)throw Error('Timeout');await wait(40);}};
 try{for(const [width,height] of[[390,844],[844,390],[360,740],[820,1180],[1440,900]]){
  frame.width=width;frame.height=height;const session='p8-'+Date.now()+'-'+width,prefix='royale-test-'+session+':',stamp=new Date().toISOString();
  const slots=['Portal Rookie','Forest Guardian','Atomic Wanderer'].map((name,i)=>{const g=new Game({look:{name,presentation:i===1?'female':'male',hair:['short','locs','wave'][i],suit:['#126875','#3c7049','#6a376f'][i]}});if(i)g.gainXP(xpForLevel(1));g.hero.coins=i*30;return {id:session+'-'+i,createdAt:stamp,updatedAt:stamp,lastRegion:'Coastal Beginnings',snapshot:JSON.parse(g.save())};});
  sessionStorage.setItem(prefix+PROFILE_KEY,JSON.stringify({version:2,revision:0,activeSlot:0,legacyImported:true,slots}));
  $('report').textContent=`Running ${width} × ${height}…`;
  await new Promise(r=>{frame.onload=r;frame.src=`../?qa=1&touch=1&testSession=${session}&accountPreview=1`;});
  const d=frame.contentDocument,el=id=>d.getElementById(id);await until(()=>d.querySelectorAll('[data-action=continue]').length===3);
  check(`${width}: three personalized hero portraits`,d.querySelectorAll('.hero-slot canvas').length===3&&d.querySelector('.hero-slot h2').textContent==='Portal Rookie');
  check(`${width}: roster stays within viewport`,d.documentElement.scrollWidth===width);
  d.querySelector('[data-action=continue]').click();el('pause').click();el('open-map').click();
  check(`${width}: all seven regular destinations enabled at level one`,d.querySelectorAll('[data-travel]').length===7&&[...d.querySelectorAll('[data-travel]')].every(b=>!b.disabled));
  check(`${width}: Legendary arenas remain level-99 locked`,[...d.querySelectorAll('#legendary-cards button')].every(b=>b.disabled));
  for(const region of WORLD_REGIONS){const b=d.querySelector(`[data-travel="${region.id}"]`);b.scrollIntoView({block:'nearest'});const rect=b.getBoundingClientRect();check(`${width}: ${region.name} touch target fits`,rect.width>44&&rect.height>=42&&rect.left>=0&&rect.right<=width);b.click();const saved=JSON.parse(sessionStorage.getItem(prefix+PROFILE_KEY)).slots[0].snapshot;check(`${width}: L1 reaches ${region.name} safely without boss wins`,saved.level===1&&saved.world.region===region.id&&saved.world.location.x===160&&saved.world.checkpoint.region===region.id&&saved.coins===0&&saved.world.bossVictories.length===0);el('pause').click();el('open-map').click();}
  check(`${width}: map has no horizontal overflow`,d.documentElement.scrollWidth===width);
  el('map-close').click();el('choose-hero').click();
  const data=JSON.parse(sessionStorage.getItem(prefix+PROFILE_KEY));check(`${width}: other two heroes retain separate resources`,data.slots[1].snapshot.coins===30&&data.slots[2].snapshot.coins===60&&data.slots[1].snapshot.world.region===1);
  el('account-open').click();await until(()=>el('account-panel').getAttribute('aria-busy')==='false');el('account-mode').value='signup';el('account-mode').dispatchEvent(new Event('change',{bubbles:true}));
  check(`${width}: no-recovery warning is explicit`,!el('no-recovery-warning').hidden&&el('no-recovery-warning').textContent.includes('permanently lose access'));
  check(`${width}: unconfigured Google, Apple and email controls are disabled`,el('account-google').disabled&&el('account-apple').disabled&&el('account-email-option').disabled);
  check(`${width}: undeployed cloud service cannot claim a working signup`,el('account-submit').disabled&&el('account-session').textContent.includes('awaits deployment'));
  el('acknowledge-recovery').scrollIntoView({block:'center'});check(`${width}: account form scrolls without horizontal overflow`,d.documentElement.scrollWidth===width&&el('account-close').getBoundingClientRect().top>=0);
  el('account-close').click();el('choose-hero').click();
 }
 $('report').textContent=`COMPLETE · ${count} Phase 8 browser assertions passed across five viewport sizes. Authentication/network integration and physical devices remain untested.`;
 }catch(e){$('report').textContent='FAIL · '+e.message+'\n'+count+' assertions passed before failure.';}
 finally{$('run').disabled=false;}
};
