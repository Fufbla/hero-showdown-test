'use strict';
// Initialization order preserved from the original single script.

const keyMap={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',ArrowUp:'jump',w:'jump',W:'jump',j:'punch',J:'punch',k:'kick',K:'kick',l:'block',L:'block',' ':'special'};

window.addEventListener('keydown',e=>{
 if([' ','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&e.target.closest?.('.shell'))e.preventDefault();
 if(keyMap[e.key]){
  e.preventDefault();const k=keyMap[e.key],fresh=!keys[k]&&!e.repeat;keys[k]=true;
  if(fresh){
   if(k==='left'||k==='right'){
    if(keys.left&&keys.right)delete directionTaps.keyboard;
    else directionPress(k==='left'?-1:1,'keyboard');
   }else action(k);
  }
 }else if(e.key==='Escape'||e.key==='p'||e.key==='P'){e.preventDefault();if(!e.repeat)pauseGame();}
});

window.addEventListener('keyup',e=>{if(keyMap[e.key]){e.preventDefault();keys[keyMap[e.key]]=false;}});

window.addEventListener('blur',()=>{clearInput();if(mode==='fight'&&!paused)pauseGame();});

document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(mode==='fight'&&!paused)pauseGame();}});

document.querySelectorAll('[data-key]').forEach(b=>{
 b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);const k=b.dataset.key;touchHeld[k]=true;b.classList.add('down');action(k);};
 const release=e=>{e.preventDefault();touchHeld[b.dataset.key]=false;b.classList.remove('down');};
 b.onpointerup=release;b.onpointercancel=release;b.onlostpointercapture=release;
});

document.getElementById('sound').onclick=()=>{audio();muted=!muted;if(master)master.gain.value=muted?0:.16;if(!muted)audio();document.getElementById('sound').textContent=muted?'SOUND OFF':'SOUND ON'};
document.getElementById('pause').onclick=pauseGame;

document.getElementById('help').onclick=()=>{let returnMode=mode;if(mode==='fight'&&!paused)pauseGame();overlay.classList.remove('hidden');overlay.innerHTML=`<section class="panel"><div class="eyebrow">FIELD GUIDE</div><h2>Make every hit count.</h2><div class="help"><b>Move:</b> A / D or arrows. <b>Dash:</b> tap the same direction twice quickly to dash forward or retreat while facing your opponent. On a controller, double-tap the D-pad or flick the stick twice, returning to center. On touch, tap the same side of the movement pad twice or flick twice through center. Dashes work on the ground and do not grant invincibility.<br><b>Jump twice:</b> W or ↑. <b>Controller:</b> left stick/D-pad move, A jump/confirm, X punch, Y kick, LB block, RB special, Start pause, Select back, L3 sound, R3 fullscreen. On some browsers tap once to unlock audio.<br><b>Punch:</b> J. <b>Kick:</b> K. <b>Hold block:</b> L. <b>Special:</b> Space at 100% power.<br>Land hits or block attacks to build power. Orange zones show where the boss will strike. Jump or move clear, then attack during its recovery. Blocking reduces punches, but cannot stop toxic clouds. Against Styrodog, jump his ground shockwaves and block or dodge flying foam. His extended claw and landing fists show exactly when he strikes. Against Venomis, watch her command and dodge Thornbear’s marked vines; block flytrap shots. Against Sonic Tusk, jump low bass waves; double jump or block horn blasts and counter while he catches his breath.<br><b>Connect a controller:</b> Pair it in your phone/computer Bluetooth settings or plug it in by USB, then press a controller button here. Xbox and PlayStation standard gamepads are supported. <b>Controller:</b> D-pad / left stick to move; A / Cross to jump; X / Square to punch; Y / Triangle to kick; left bumper to block; right bumper or B / Circle for special; Start to pause. Menus support D-pad and A / Cross; Start pauses and resumes. Left trigger also blocks. A controller must be paired with your device first.<br><b>Touch:</b> Use the bottom buttons. Double-tap Jump for a double jump.</div><button class="primary" id="closehelp">GOT IT</button></section>`;document.getElementById('closehelp').onclick=()=>{if(returnMode==='fight'){paused=false;overlay.classList.add('hidden');document.getElementById('pause').textContent='PAUSE'}else if(returnMode==='select')showSelect();else if(returnMode==='opponent')showOpponent();else if(returnMode==='venue')showVenue();else if(returnMode==='title')showTitle();else result()}};


let menuFocus=0,menuFocusElement=null;

// Pointer navigation changes the same logical focus used by the gamepad.
document.addEventListener('pointerdown',e=>{
 const target=e.target.closest?.('.overlay button,.brand button');
 if(target&&!target.disabled)syncMenuFocus(target);
},true);

// A mouse click may transition to a different screen; focus its new menu.
// Observe only structural changes, not highlight classes or styles.
new MutationObserver(()=>{
 if(menuFocusElement&&!menuFocusElement.isConnected){menuFocusElement=null;}
 if(mode!=='fight'||paused)syncMenuFocus();
}).observe(overlay,{childList:true,subtree:false});

let padAudioNotice=false;

document.addEventListener('pointerdown',()=>{
 if(!muted)audio();
 document.getElementById('audio-prompt')?.classList.add('hidden');
 padAudioNotice=false;
 const status=document.getElementById('padstatus');
 if(status)status.textContent='CONTROLLER CONNECTED';
},{passive:true});

document.addEventListener('keydown',()=>{if(ac&&ac.state!=='running')audio();padAudioNotice=false;});

document.getElementById('audio-prompt').addEventListener('click',()=>{if(!muted)audio();document.getElementById('audio-prompt').classList.add('hidden')});

document.getElementById('fullscreen').onclick=()=>{const shell=document.querySelector('.shell');if(document.fullscreenElement){document.exitFullscreen?.().catch(()=>{})}else if(shell.requestFullscreen){shell.requestFullscreen().catch(()=>{})}else if(shell.webkitRequestFullscreen){shell.webkitRequestFullscreen()}else{document.getElementById('fullscreen').textContent='ROTATE PHONE';}};


// Preserve directional selection on every screen, including result and pause overlays.
const focusResetObserver=new MutationObserver(()=>{
 if(menuFocusElement&&!document.contains(menuFocusElement))menuFocusElement=null;
});

focusResetObserver.observe(overlay,{childList:true});

// Native browser touch gestures must not hijack arcade controls.
const analogEl=document.getElementById('analog');

const analogKnob=document.getElementById('analog-knob');

let analogPointer=null,analogDirection=0;

analogEl.addEventListener('pointerdown',e=>{
 if(analogPointer!==null)return;
 e.preventDefault();
 analogPointer=e.pointerId;
 try{analogEl.setPointerCapture(e.pointerId)}catch(_){}
 analogMove(e);
});

analogEl.addEventListener('pointermove',e=>{
 if(e.pointerId!==analogPointer)return;
 e.preventDefault();analogMove(e);
});

for(const name of ['pointerup','pointercancel','lostpointercapture']){
 analogEl.addEventListener(name,analogRelease);
}

window.addEventListener('blur',()=>analogRelease());

document.addEventListener('contextmenu',e=>{
 if(e.target.closest('.shell'))e.preventDefault();
});

document.addEventListener('dragstart',e=>{
 if(e.target.closest('.shell'))e.preventDefault();
});

document.addEventListener('selectstart',e=>{
 if(e.target.closest('.shell'))e.preventDefault();
});

document.addEventListener('gesturestart',e=>{if(e.cancelable)e.preventDefault()},{passive:false});

document.addEventListener('gesturechange',e=>{if(e.cancelable)e.preventDefault()},{passive:false});

document.addEventListener('gestureend',e=>{if(e.cancelable)e.preventDefault()},{passive:false});

document.addEventListener('touchmove',e=>{
 if(e.target.closest('.overlay .panel'))return;
 if(e.target.closest('.shell')&&e.cancelable)e.preventDefault();
},{passive:false});

let lastGameTap=0;

document.addEventListener('touchend',e=>{
 if(!e.target.closest('.shell')||e.target.closest('.overlay'))return;
 const now=performance.now();
 if(now-lastGameTap<330&&e.cancelable)e.preventDefault();
 lastGameTap=now;
},{passive:false});

// Safari may still reserve certain hardware or browser shortcuts outside the page.


// Keep progression and result actions accessible on EVERY overlay screen.
const allScreenMenuObserver=new MutationObserver(()=>{
 const panel=overlay.querySelector('.panel');
 if(!panel)return;
 const actions=Array.from(panel.querySelectorAll('#begin,#fight,#startfight,#start,#retry,#choose,#opponents,#resume,#back,#backhero,#backselect'));
 const row=panel.querySelector('.row');
 if(row&&row.querySelector('button'))actions.push(...row.querySelectorAll('button'));
 const unique=[...new Set(actions)];
 if(!unique.length)return;
 let dock=panel.querySelector('.menu-action-dock');
 if(!dock){dock=document.createElement('div');dock.className='menu-action-dock';panel.appendChild(dock)}
 for(const btn of unique){if(btn.parentElement!==dock)dock.appendChild(btn)}
});

allScreenMenuObserver.observe(overlay,{childList:true,subtree:true});
