/* Hero Showdown menu soundtrack add-on. Load after the game's scripts. */
(()=>{
  'use strict';
  const music=new Audio('assets/audio/hero-menu-theme.mp3');
  music.loop=true; music.volume=0.28; music.preload='auto';
  let lastWanted=false;
  function isIntroPlaying(){return [...document.querySelectorAll('video')].some(v=>!v.paused&&!v.ended&&!v.hidden&&getComputedStyle(v).display!=='none');}
  function shouldPlay(){
    if(isIntroPlaying())return false;
    // Existing Hero Showdown uses an overlay for its menus and hides it for combat.
    const overlay=document.querySelector('.overlay');
    if(!overlay||overlay.classList.contains('hidden')||getComputedStyle(overlay).display==='none')return false;
    const words=(overlay.textContent||'').toLowerCase();
    // Never play over the outcome screen or an in-game cutscene.
    if(/victory|defeat|you win|you lose|game over/.test(words))return false;
    return true;
  }
  function sync(){const wanted=shouldPlay();if(wanted){if(music.paused)music.play().catch(()=>{});}else if(!music.paused){music.pause();music.currentTime=0;}lastWanted=wanted;}
  document.addEventListener('pointerdown',sync,true);
  document.addEventListener('keydown',sync,true);
  new MutationObserver(sync).observe(document.documentElement,{attributes:true,childList:true,subtree:true,attributeFilter:['class','style','hidden']});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)music.pause();else sync();});
  setInterval(sync,500);
  sync();
})();
