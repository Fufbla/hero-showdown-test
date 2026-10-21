'use strict';
// Classic-script module: shares the original game bindings.

function padMenuButtons(){
 return [...document.querySelectorAll('.overlay button:not([disabled]),.brand button:not([disabled])')].filter(el=>{
  const r=el.getBoundingClientRect(),st=getComputedStyle(el);
  return (el.id!=='pause'||mode==='fight')&&r.width>0&&r.height>0&&st.visibility!=='hidden'&&st.display!=='none';
 });
}

function menuHighlight(el){
 if(menuFocusElement&&menuFocusElement!==el)menuFocusElement.classList.remove('pad-focused');
 menuFocusElement=el;
 if(el){el.classList.add('pad-focused');el.focus({preventScroll:true});el.scrollIntoView({block:'nearest',inline:'nearest'});}
}

function menuNavigate(direction){
 const buttons=padMenuButtons();if(!buttons.length)return;
 let current=buttons.indexOf(menuFocusElement);
 if(current<0){const focused=buttons.find(el=>el.matches('.card.selected'));current=focused?buttons.indexOf(focused):0;}
 const source=buttons[current].getBoundingClientRect(),cx=source.left+source.width/2,cy=source.top+source.height/2;
 const vector={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]}[direction];
 let best=null,score=Infinity;
 for(const el of buttons){if(el===buttons[current])continue;
  const r=el.getBoundingClientRect(),dx=r.left+r.width/2-cx,dy=r.top+r.height/2-cy;
  const forward=dx*vector[0]+dy*vector[1],side=Math.abs(dx*vector[1]-dy*vector[0]);
  if(forward<7)continue;
  const rank=forward+side*2.6;
  if(rank<score){score=rank;best=el;}
 }
 if(!best){const candidates=buttons.filter(el=>el!==buttons[current]);
  // Wrap to the far edge of the same row/column, rather than walking every card.
  const aligned=candidates.filter(el=>{const r=el.getBoundingClientRect();const x=r.left+r.width/2,y=r.top+r.height/2;return vector[0]?Math.abs(y-cy)<Math.max(r.height,source.height):Math.abs(x-cx)<Math.max(r.width,source.width);});
  if(aligned.length){aligned.sort((a,b)=>{const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();const av=vector[0]?(ar.left+ar.width/2):(ar.top+ar.height/2),bv=vector[0]?(br.left+br.width/2):(br.top+br.height/2);return vector[0]+vector[1]>0?av-bv:bv-av});best=aligned[0];}
 }
 menuHighlight(best||buttons[current]);
}

// Keep mouse, touch, and controller menu selection synchronized.
// Clicking a menu option can replace the entire overlay, so never retain focus
// on a detached button from the previous screen.
function syncMenuFocus(preferred){
 const buttons=padMenuButtons();
 if(!buttons.length){
  if(menuFocusElement)menuFocusElement.classList.remove('pad-focused');
  menuFocusElement=null;return;
 }
 if(preferred&&buttons.includes(preferred)){menuHighlight(preferred);return;}
 if(menuFocusElement&&buttons.includes(menuFocusElement))return;
 const selected=buttons.find(b=>b.classList.contains('selected'));
 const inOverlay=buttons.find(b=>overlay.contains(b));
 // While assets load, do not silently focus a header setting instead of Start.
 menuHighlight(selected||inOverlay||null);
}

function padAudioUnlock(){
 if(muted)return;
 audio();
 if(ac&&ac.state==='running'){padAudioNotice=false;const status=document.getElementById('padstatus');if(status)status.textContent='CONTROLLER CONNECTED';return;}
 padAudioNotice=true;
 const status=document.getElementById('padstatus');if(status)status.textContent='TAP ONCE TO ENABLE MUSIC';
 document.getElementById('audio-prompt')?.classList.remove('hidden');
}

// Gamepad buttons: A confirm/jump, B back/special, X punch, Y kick,
// LB block, RB special, Start pause, Select back, L3 sound, R3 fullscreen.
let menuRepeatDirection='',menuRepeatAt=0,activePadIndex=null;
function pollPad(){
 if(!navigator.getGamepads)return;
 let pads;
 try{pads=Array.from(navigator.getGamepads()).filter(p=>p&&p.connected!==false);}catch(_){return;}
 const active=pads.find(p=>p.buttons.some(b=>b.pressed||b.value>.5)||p.axes.some(a=>Math.abs(a)>.4));
 const gp=active||pads.find(p=>p.index===activePadIndex)||pads[0],status=document.getElementById('padstatus');
 if(gp&&activePadIndex!==gp.index){activePadIndex=gp.index;gamepadPrev={};menuRepeatDirection='';}
 if(!gp){activePadIndex=null;menuRepeatDirection='';padHeld={};gamepadPrev={};padAxisDirection=0;delete directionTaps.pad;if(status)status.textContent='CONTROLLER READY';return}
 if(status&&!padAudioNotice)status.textContent='CONTROLLER CONNECTED';
 const b=i=>!!gp.buttons[i]?.pressed||gp.buttons[i]?.value>.5,axes=gp.axes||[];
 const horizontal=padHorizontal(axes[0]||0);
 const now={left:b(14)||horizontal<0,right:b(15)||horizontal>0,up:b(12)||(axes[1]||0)<-.35,down:b(13)||(axes[1]||0)>.35,
 jump:b(0),punch:b(2),kick:b(3),block:b(4)||b(6),special:b(5)||b(1),pause:b(9),back:b(8),sound:b(10),fullscreen:b(11)};
 const edge=k=>now[k]&&!gamepadPrev[k];
 const anyPress=Object.keys(now).some(k=>edge(k));
 if(anyPress&&(!ac||ac.state!=='running'))padAudioUnlock();
 // Retain button states across screen transitions; avoid phantom repeated presses.
 padHeld=now;
 if(edge('sound'))document.getElementById('sound').click();
 if(edge('fullscreen'))document.getElementById('fullscreen').click();
 if(edge('pause')){menuFocus=0;pauseGame();}
 const helpOpen=!!document.getElementById('closehelp');
 if(helpOpen&&(edge('back')||edge('special'))){document.getElementById('closehelp').click();gamepadPrev=now;return;}
 if(edge('back')&&!helpOpen){
  if(paused){const choose=document.getElementById('choose');if(choose)choose.click();else pauseGame();}
  else if(mode==='venue')showOpponent();
  else if(mode==='opponent')showSelect();
  else if(mode==='select')showTitle();
  else if(mode==='victory'||mode==='defeat')showSelect();
 }
 if(mode==='fight'&&!paused&&!helpOpen){
  menuRepeatDirection='';
  if(now.left&&now.right)delete directionTaps.pad;
  else{if(edge('left'))directionPress(-1,'pad');if(edge('right'))directionPress(1,'pad');}
  for(const k of ['jump','punch','kick','special'])if(edge(k))action(k);
 }else{
  syncMenuFocus();
  // One direction per sample prevents diagonal input from skipping cards.
  const dir=['left','right','up','down'].find(d=>now[d])||'';
  const stamp=performance.now();
  if(dir!==menuRepeatDirection){menuRepeatDirection=dir;menuRepeatAt=stamp+360;if(dir)menuNavigate(dir);}
  else if(dir&&stamp>=menuRepeatAt){menuNavigate(dir);menuRepeatAt=stamp+145;}
  if(edge('jump')){
   padAudioUnlock();
   const buttons=padMenuButtons();
   let target=menuFocusElement&&buttons.includes(menuFocusElement)?menuFocusElement:null;
   if(!target){target=buttons.find(el=>el.matches('.card.selected'))||buttons.find(el=>el.closest('.overlay'))||buttons[0];}
   if(target){target.click();menuFocusElement=null;syncMenuFocus();}
  }
 }
 gamepadPrev=now;
}

function analogSetDirection(dir){
 if(analogDirection===dir)return;
 analogDirection=dir;
 touchHeld.left=dir<0;
 touchHeld.right=dir>0;
 if(dir)directionPress(dir,'touch');
}

function analogMove(e){
 const rect=analogEl.getBoundingClientRect();
 const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
 const dx=e.clientX-cx,dy=e.clientY-cy;
 const limit=Math.min(rect.width,rect.height)*.28;
 const len=Math.hypot(dx,dy);
 const ratio=len>limit?limit/len:1;
 analogKnob.style.transform=`translate(calc(-50% + ${dx*ratio}px),calc(-50% + ${dy*ratio}px))`;
 const threshold=analogDirection===Math.sign(dx)?8:12;
 const direction=Math.abs(dx)>threshold&&Math.abs(dx)>Math.abs(dy)*.55?(dx<0?-1:1):0;
 analogSetDirection(direction);
}

function analogRelease(e){
 if(analogPointer===null||(e&&e.pointerId!==analogPointer))return;
 analogPointer=null;
 analogSetDirection(0);
 analogKnob.style.transform='translate(-50%,-50%)';
}
