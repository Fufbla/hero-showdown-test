import {Game} from '../core.mjs';
import {PROFILE_KEY} from '../saves.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';
const $=id=>document.getElementById(id);
const sizes={desktop:[1280,720],portrait:[390,844],landscape:[844,390]};
function resize(){const [w,h]=sizes[$('review-viewport').value];$('review-game').style.width=w+'px';$('review-game').style.height=h+'px';}
$('review-viewport').onchange=resize;resize();
$('start-game').onclick=async()=>{
 const button=$('start-game');button.disabled=true;
 try{
  const sex=$('review-hero').value,g=new Game({look:styleCDefault(sex),random:()=>.4});
  g.hero.x=g.hero.prevX=500;g.hero.y=g.hero.prevY=600;g.combatTimer=0;
  const session='vertical-practice-style-c-art-'+Date.now(),stamp=new Date().toISOString();
  sessionStorage.setItem(`royale-test-${session}:`+PROFILE_KEY,JSON.stringify({version:2,revision:0,activeSlot:0,legacyImported:true,slots:[{id:session,createdAt:stamp,updatedAt:stamp,lastRegion:'Coastal Beginnings',snapshot:JSON.parse(g.save())},null,null]}));
  const frame=$('review-game');$('game-status').textContent='Loading actual game…';resize();
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Game loading timed out.')),20000);frame.onload=()=>{clearTimeout(timeout);resolve();};frame.src='../index.html?qa=1&touch=1&testSession='+session;});
  const start=performance.now();while(!frame.contentDocument.querySelector('[data-action="continue"]')&&performance.now()-start<15000)await new Promise(r=>setTimeout(r,50));
  const play=frame.contentDocument.querySelector('[data-action="continue"]');if(!play)throw Error('Review hero did not load.');
  // Only the diagnostic overlay is hidden; the real HUD and controls remain.
  const style=frame.contentDocument.createElement('style');style.textContent='#diagnostics{display:none!important}';frame.contentDocument.head.append(style);play.click();
  $('game-status').textContent=`Default ${sex} · actual game · ${sizes[$('review-viewport').value].join(' × ')} · original camera scale`;
  frame.scrollIntoView({block:'center'});frame.focus();
 }catch(e){$('game-status').textContent=e.message;}finally{button.disabled=false;}
};
