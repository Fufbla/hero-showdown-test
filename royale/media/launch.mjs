import {getSoundtrack} from './controller.mjs';
const track=getSoundtrack(),doc=document;
const owned=track.win===window;
const asset=name=>new URL(name,import.meta.url).href;
function bindControls(root){
 const toggle=root.querySelector('[data-music-toggle]')||root.querySelector('#sound');
 const slider=root.querySelector('[data-music-volume]')||root.querySelector('#volume-music');
 const output=root.querySelector('[data-music-value]')||root.querySelector('#volume-music-value');
 if(toggle)toggle.onclick=()=>track.toggle();
 if(slider)slider.oninput=()=>track.setVolume(Number(slider.value)/100);
 const unsubscribe=track.subscribe(()=>{
  if(toggle){toggle.setAttribute('aria-label',track.settings.muted?'Unmute music':'Mute music');toggle.setAttribute('aria-pressed',String(!track.settings.muted));if(toggle.hasAttribute('data-music-toggle'))toggle.textContent=track.settings.muted?'Music off':'Music on';}
  if(slider)slider.value=Math.round(track.settings.volume*100);
  if(output)output.textContent=Math.round(track.settings.volume*100)+'%';
 });window.addEventListener('pagehide',unsubscribe,{once:true});
}
function compactControls(){
 const box=doc.createElement('details');box.className='royale-music-controls';
 box.innerHTML='<summary>Music</summary><button type="button" data-music-toggle>Music on</button><label>Volume <output data-music-value>20%</output><input type="range" min="0" max="100" value="20" aria-label="Music volume" data-music-volume></label>';
 return box;
}
// Each visible menu gets one set; gameplay reuses its existing sound/settings UI.
if(doc.querySelector('#welcome')){const controls=compactControls();doc.querySelector('#welcome').append(controls);bindControls(controls);}
if(doc.querySelector('#setup')){
 const controls=compactControls();doc.querySelector('#setup').append(controls);bindControls(controls);
 const move=()=>{const parent=doc.querySelector('#menu').open?doc.querySelector('#menu .pause-header'):doc.querySelector('#setup');if(controls.parentNode!==parent)parent.append(controls);};
 new MutationObserver(move).observe(doc.querySelector('#menu'),{attributes:true,attributeFilter:['open']});
}
// Called after the app assigns its legacy handlers.
window.addEventListener('royale-audio-controls-ready',()=>bindControls(doc));
for(const type of ['pointerdown','keydown','touchend'])doc.addEventListener(type,()=>track.unlock(),{capture:true,passive:true});

function openScene(path){
 const frame=doc.querySelector('#game-frame');if(!frame)return;
 for(const id of ['welcome','new-code'])doc.getElementById(id).hidden=true;
 doc.getElementById('roster').hidden=false;doc.body.classList.add('staging-session');frame.src=path;
}
// Keep the launch document alive for local play and co-op, as it already is for
// cloud heroes. No account, snapshot, autosave or gameplay code is intercepted.
for(const [id,path] of [['local-coop','./local-coop/'],['browser-heroes','./gameplay/']]){
 doc.getElementById(id)?.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();openScene(path);},true);
}
const frame=doc.querySelector('#game-frame');if(frame){frame.allow='autoplay; fullscreen';frame.setAttribute('allowfullscreen','');}

if(owned){
 const overlay=doc.createElement('dialog');overlay.id='royale-intro';overlay.setAttribute('aria-label','Hero Showdown Royale intro');
 overlay.innerHTML='<video playsinline webkit-playsinline preload="metadata" aria-label="Hero Showdown Royale opening video"></video><div class="intro-start"><p>JAMES CLAN COMICS</p><h1>HERO SHOWDOWN<br><em>ROYALE</em></h1><button type="button" id="intro-start">Tap to Start</button><p class="intro-status" role="status">Your adventure begins here.</p></div><button type="button" id="intro-skip">Skip Intro</button>';
 doc.body.append(overlay);const video=overlay.querySelector('video'),start=overlay.querySelector('.intro-start'),status=overlay.querySelector('.intro-status');
 video.poster=asset('intro-poster.jpg');video.src=asset(video.canPlayType('video/mp4; codecs="avc1.4D401F, mp4a.40.2"')?'intro.mp4':'intro.webm');video.volume=1;video.muted=false;
 let finished=false,watchdog=null,lastTime=0,lastProgress=Date.now(),attempting=false;
 function finish(smooth=false){
  if(finished)return;finished=true;clearInterval(watchdog);
  video.pause();video.removeAttribute('src');video.load();
  overlay.close();overlay.remove();doc.documentElement.classList.remove('royale-intro-pending');
  if(smooth){doc.body.classList.add('royale-intro-finished');setTimeout(()=>doc.body.classList.remove('royale-intro-finished'),350);}
  track.finishIntro();
 }
 function watch(){clearInterval(watchdog);lastProgress=Date.now();watchdog=setInterval(()=>{
  if(doc.hidden){lastProgress=Date.now();return;}
  if(video.currentTime>lastTime){lastTime=video.currentTime;lastProgress=Date.now();}
  else if(Date.now()-lastProgress>15000)finish();
 },1000);}
 async function play(){
  if(finished||attempting)return;attempting=true;track.unlock();status.textContent='Loading your adventure…';watch();
  try{await video.play();if(finished)return;start.hidden=true;}
  catch(error){clearInterval(watchdog);if(finished)return;if(error.name==='NotAllowedError'){start.hidden=false;status.textContent='Tap to play the intro with sound.';}else finish();}
  finally{attempting=false;}
 }
 overlay.querySelector('#intro-start').onclick=play;
 overlay.querySelector('#intro-skip').onclick=()=>{track.unlock();finish();};
 overlay.addEventListener('cancel',event=>{event.preventDefault();finish();});
 video.addEventListener('ended',()=>finish(true));video.addEventListener('error',()=>finish());
 video.addEventListener('pause',()=>{if(!finished&&!video.ended&&!doc.hidden){start.hidden=false;status.textContent='Tap to continue the intro.';}});
 overlay.showModal();doc.documentElement.classList.remove('royale-intro-pending');
 // Never silently discard original audio to satisfy autoplay restrictions.
 void play();
}
