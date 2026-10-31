// Visible fixtures use an isolated session namespace. Never access real hero localStorage.
import {Game} from '../core.mjs';
import {WORLD_REGIONS} from '../world.mjs';
import {bossVictory,CLOCK} from '../progression.mjs';
import {createEquipment} from '../equipment.mjs';
import {PROFILE_KEY} from '../saves.mjs';
const $=id=>document.getElementById(id),frame=$('practice-game'),session=`world-practice-${Date.now()}`,prefix=`royale-test-${session}:`;
for(const region of WORLD_REGIONS){const o=document.createElement('option');o.value=region.id;o.textContent=`${region.id} · ${region.name}`;$('practice-region').append(o);}
async function load(loot=false){
  const id=Number($('practice-region').value),g=new Game({look:{name:'World Explorer',suit:'#315b7c',trim:'#e6c879',capeColor:'#725455',emblem:'bolt'}});
  for(let i=1;i<=7;i++)bossVictory(g.world,i);g.travel(id);
  const region=WORLD_REGIONS[id-1],level=region.levels[1];g.hero.level=level;g.hero.hp=g.hero.maxHp=100+15*(level-1);g.hero.coins=200;g.healthRoots=3;
  let budget=level-1;
  for(const [power,share] of [['strength',.3],['fireball',.3],['steel',.2],['speed',.1]]){const n=Math.min(20,Math.floor((level-1)*share));g.powers.data.levels[power]=n;budget-=n;}
  g.powers.data.points=budget;g.powers.data.equipped=['strength','fireball','steel'];
  const clock=$('practice-clock').value;g.world.clockReference=Date.now()-(clock==='night'?CLOCK.day+60000:clock==='sunset'?CLOCK.day-5000:clock==='sunrise'?CLOCK.day+CLOCK.night-5000:0);
  const place=$('practice-place').value;g.hero.x=g.hero.prevX=place==='wild'?515:place==='gate'?5840:160;
  if(loot){for(let i=0;i<7;i++)g.inventory.items.push(createEquipment(id,id>=4?'rare':'ordinary',i,i+1));g.inventory.nextId=9;g.inventory.pending=[createEquipment(id,id>=4?'rare':'ordinary',0,8)];}
  const snapshot=JSON.parse(g.save());sessionStorage.setItem(prefix+PROFILE_KEY,JSON.stringify({version:2,revision:0,activeSlot:0,legacyImported:true,slots:[{id:'practice-only',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),lastRegion:region.name,snapshot},null,null]}));
  await new Promise(resolve=>{frame.onload=resolve;frame.src=`../?qa=1&touch=1&testSession=${session}`;});
  const d=frame.contentDocument;await new Promise(resolve=>{const check=()=>{const start=d.querySelector('[data-action="continue"]');if(start){start.click();if(loot){d.getElementById('pause').click();d.getElementById('open-inventory').click();}resolve();}else setTimeout(check,40);};check();});frame.focus();
}
$('reset-world').onclick=()=>load();$('loot-demo').onclick=()=>load(true);
$('measure-world').onclick=()=>{const button=frame.contentDocument.getElementById('measure-performance');button?.click();frame.focus();};
setInterval(()=>{$('performance-readout').textContent=frame.contentDocument?.getElementById('performance-result')?.textContent||'';},500);
load();
