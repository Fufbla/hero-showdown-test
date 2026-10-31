import { BOSSES } from '../boss-data.mjs';
import { saveBossFixture, fixtureCommand } from './boss-fixture.mjs';
const $=id=>document.getElementById(id),frame=$('practice-game'),session=`boss-practice-${Date.now()}`;
for(const [id,b] of Object.entries(BOSSES)){const o=document.createElement('option');o.value=id;o.textContent=`${id} · ${b.name} · LV ${b.level}`;$('practice-boss').append(o);}
async function load(){
  $('fixture-result').textContent='';
  $('performance-readout').textContent='';
  saveBossFixture(session,Number($('practice-boss').value),$('practice-loadout').value,$('practice-clock').value==='night');
  await new Promise(resolve=>{frame.onload=resolve;frame.src=`../?qa=1&touch=1&testSession=${session}`;});
  const check=()=>{const b=frame.contentDocument.querySelector('[data-action="continue"]');if(b){b.click();frame.contentDocument.getElementById('diagnostics').style.display='none';frame.focus();}else setTimeout(check,40);};check();
}
$('reset-boss').onclick=load;
for(const button of document.querySelectorAll('[data-fixture]'))button.onclick=async()=>{
  const state=await fixtureCommand(frame,button.dataset.fixture,Number(button.dataset.value));
  $('fixture-result').textContent=`Phase ${state.boss?.phase||'—'} · Boss HP ${Math.ceil(state.boss?.hp||0)} · ${state.helpers} helpers · ${state.waves} waves · ${state.coins} coins · ${state.items}/7 equipment · ${state.chest||'no chest'}${button.dataset.fixture==='full-inventory'&&state.active?' · Clear the arena before filling inventory.':''}`;
  if(!frame.contentDocument.getElementById('pause-menu').hidden)frame.contentDocument.getElementById('resume').click();frame.focus();
};
$('measure-boss').onclick=()=>{frame.contentDocument.getElementById('measure-performance').click();frame.focus();};
setInterval(()=>{$('performance-readout').textContent=frame.contentDocument?.getElementById('performance-result')?.textContent||'';},500);
load();
