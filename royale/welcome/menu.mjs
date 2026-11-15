// Welcome presentation only. Existing account handlers and the shared soundtrack
// own login, saves, scene changes and audio playback.
import {getSoundtrack} from '../media/controller.mjs';
const $=id=>document.getElementById(id),track=getSoundtrack();
const main=$('main-actions'),options=$('play-options'),play=$('play-game');
function showOptions(open){
 main.hidden=open;options.hidden=!open;play.setAttribute('aria-expanded',String(open));
 (open?$('new'):play).focus();
}
play.addEventListener('click',()=>showOptions(true));
$('play-back').addEventListener('click',()=>{if(!$('input-area').hidden){$('input-area').hidden=true;$('enter').focus();}else showOptions(false);});
window.addEventListener('royale-show-welcome',()=>{showOptions(false);$('input-area').hidden=true;window.scrollTo(0,0);});
$('enter').addEventListener('click',()=>{ $('input-area').hidden=false;$('input').focus(); });
$('input').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('load').click();}});
options.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();$('play-back').click();}});
for(const [button,panel]of [['welcome-settings','settings-panel'],['welcome-help','help-panel']]){
 const dialog=$(panel);
 $(button).addEventListener('click',()=>dialog.showModal());
 dialog.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>dialog.close()));
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
}
$('welcome-volume').addEventListener('input',e=>track.setVolume(Number(e.target.value)/100));
$('welcome-mute').addEventListener('click',()=>track.toggle());
const unsubscribe=track.subscribe(()=>{
 $('welcome-volume').value=Math.round(track.settings.volume*100);
 $('welcome-volume-value').textContent=Math.round(track.settings.volume*100)+'%';
 $('welcome-mute').textContent=track.settings.muted?'Unmute music':'Mute music';
 $('welcome-mute').setAttribute('aria-pressed',String(track.settings.muted));
});
window.addEventListener('pagehide',unsubscribe,{once:true});
const motionKey='healthia.royale.welcome.motion';
let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
try{reduced=localStorage.getItem(motionKey)==='reduce'||reduced;}catch{}
function motion(){document.body.classList.toggle('welcome-reduced-motion',$('welcome-motion').checked);}
$('welcome-motion').checked=reduced;motion();
$('welcome-motion').addEventListener('change',()=>{motion();try{localStorage.setItem(motionKey,$('welcome-motion').checked?'reduce':'auto');}catch{}});
// Pause decorative animation while the intro or an actual game scene is visible.
function syncVisibility(){
 const inGame=!$('roster').hidden;
 document.body.classList.toggle('staging-session',inGame);
 document.body.classList.toggle('welcome-paused',inGame||document.hidden||!!$('royale-intro'));
 if(inGame){for(const d of document.querySelectorAll('.welcome-dialog[open]'))d.close();}
}
new MutationObserver(syncVisibility).observe($('roster'),{attributes:true,attributeFilter:['hidden']});
new MutationObserver(syncVisibility).observe(document.body,{childList:true});
document.addEventListener('visibilitychange',syncVisibility);syncVisibility();
