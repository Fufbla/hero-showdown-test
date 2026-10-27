'use strict';

// One press, one action. Do not derive touch attack edges from render polling:
// a complete phone tap can begin and end between two animation frames.
const battleTouchPointers = new Map();
const battleTouchButtons = new Map();
const battlePadAxes = new Map();
const battleShell = document.querySelector('.shell');

function battleGamepads(){
 try{return Array.from(navigator.getGamepads?.()||[]).filter(p=>p&&p.connected!==false);}
 catch(_){return [];}
}
function readBattleGamepad(gp){
 if(!gp)return {};
 const b=i=>!!gp.buttons?.[i]?.pressed||Number(gp.buttons?.[i]?.value)>.5;
 const x=Number(gp.axes?.[0])||0,y=Number(gp.axes?.[1])||0;
 const old=battlePadAxes.get(gp.index)||0;
 const direction=Math.abs(x)>=(old===Math.sign(x)?.20:.35)?Math.sign(x):0;
 battlePadAxes.set(gp.index,direction);
 return {left:b(14)||direction<0,right:b(15)||direction>0,
  up:b(12)||y<-.45,down:b(13)||y>.45,jump:b(0),punch:b(2),kick:b(3),
  block:b(4)||b(6),special:b(5)||b(1),pause:b(9),back:b(8),sound:b(10),fullscreen:b(11)};
}
function battlePadForTouch(){
 const pads=battleGamepads();
 return pads.find(p=>p.index===coop.padSlots?.[0])||pads[0];
}
function flushBattleCoopKeyboard(index){
 if(!coActive()||mode!=='fight'||paused||specialSceneLocked()||story.playing)return;
 const pads=battleGamepads().sort((a,b)=>a.index-b.index);
 const gp=pads.find(p=>p.index===coop.padSlots?.[index])||pads[index];
 const state=coMerged(coop.keyboard[index],readBattleGamepad(gp),index===0?touchHeld:{});
 // Preserve taps that begin and end between render frames, just like touch.
 // coApply keeps the edge history shared with the next regular pad poll.
 if(coGuest()){coop.localInput=state;coSendInput();}
 else coApply(index,state);
}
function flushBattleTouch(key){
 if(mode!=='fight'||paused||specialSceneLocked()||story.playing)return;
 if(!coActive()){if(key)action(key);return;}
 const state=coMerged(coop.keyboard[0],readBattleGamepad(battlePadForTouch()),touchHeld);
 if(coGuest()){
  // Send both edges immediately; retain the established authoritative protocol.
  coop.localInput=state;coSendInput();
 }else coApply(0,state);
}
function battleTouchDown(button,id,event){
 event.preventDefault();
 if(button.disabled||battleTouchPointers.has(id)||battleTouchButtons.has(button))return;
 battleTouchPointers.set(id,button);battleTouchButtons.set(button,id);
 touchHeld[button.dataset.key]=true;button.classList.add('down');
 button.setAttribute('aria-pressed','true');
 flushBattleTouch(button.dataset.key);
 // Some embedded browsers reject capture. That must not cancel the attack.
 try{button.setPointerCapture?.(id);}catch(_){}
}
function battleTouchUp(id,event){
 const button=battleTouchPointers.get(id);if(!button)return;
 event?.preventDefault?.();
 battleTouchPointers.delete(id);battleTouchButtons.delete(button);
 touchHeld[button.dataset.key]=false;button.classList.remove('down');
 button.setAttribute('aria-pressed','false');flushBattleTouch();
 try{if(button.hasPointerCapture?.(id))button.releasePointerCapture(id);}catch(_){}
}
function clearBattleTouches(){
 const captures=Array.from(battleTouchPointers);
 battleTouchPointers.clear();battleTouchButtons.clear();
 for(const [id,button] of captures){
  touchHeld[button.dataset.key]=false;button.classList.remove('down');
  button.setAttribute('aria-pressed','false');
  try{if(button.hasPointerCapture?.(id))button.releasePointerCapture(id);}catch(_){}
 }
}
function showBattleTouch(){
 // A second finger must not move the controls under the first finger.
 if(battleShell.classList.contains('touch-input'))return;
 battleShell.classList.add('touch-input');layoutBattleControls();
}
function resetBattleTouchInput(){
 clearBattleTouches();analogRelease();analogSetDirection(0);
 touchHeld={};delete directionTaps.touch;flushBattleTouch();
}
if(navigator.maxTouchPoints>0||matchMedia('(any-pointer: coarse)').matches)showBattleTouch();
window.addEventListener('pointerdown',event=>{
 if(event.pointerType!=='touch')return;
 // The first finger of a new gesture also recovers a browser-lost release.
 if(event.isPrimary)resetBattleTouchInput();
 showBattleTouch();
},{capture:true,passive:true});

document.querySelectorAll('[data-key]').forEach(button=>{
 button.type='button';button.setAttribute('aria-pressed','false');
 button.onpointerdown=event=>{
  if(event.pointerType==='mouse'&&event.button!==0)return;
  battleTouchDown(button,event.pointerId,event);
 };
 button.onpointerup=button.onpointercancel=event=>battleTouchUp(event.pointerId,event);
 button.onlostpointercapture=event=>{
  if(!button.hasPointerCapture?.(event.pointerId))battleTouchUp(event.pointerId,event);
 };
 // Pointer Events are standard on current iOS/Android. Older embedded views
 // get an exclusive fallback so compatibility events cannot double the move.
 if(!window.PointerEvent){
  button.addEventListener('touchstart',event=>{
   showBattleTouch();for(const touch of event.changedTouches)battleTouchDown(button,touch.identifier,event);
  },{passive:false});
  for(const type of ['touchend','touchcancel'])button.addEventListener(type,event=>{
   for(const touch of event.changedTouches)battleTouchUp(touch.identifier,event);
  },{passive:false});
 }
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])window.addEventListener(type,event=>{
 battleTouchUp(event.pointerId,event);analogRelease(event);
},{capture:true,passive:false});
// Keep the stick responsive if an embedded browser refuses pointer capture.
window.addEventListener('pointermove',event=>{
 if(event.pointerId!==analogPointer)return;
 if(event.pointerType!=='touch'&&event.buttons===0){analogRelease(event);return;}
 event.preventDefault();analogMove(event);
},{capture:true,passive:false});
// Some phone browsers lose a pointerup during a system gesture. Touches is
// authoritative: release everything only after the final finger leaves.
for(const type of ['touchend','touchcancel'])window.addEventListener(type,event=>{
 if(event.touches?.length===0)resetBattleTouchInput();
},{capture:true,passive:true});

const battleClearInput=clearInput;
clearInput=function(){clearBattleTouches();analogRelease();battlePadAxes.clear();return battleClearInput();};
const battleAnalogSet=analogSetDirection;
analogSetDirection=function(dir){const changed=dir!==analogDirection;battleAnalogSet(dir);if(changed&&coActive())flushBattleTouch();};
const battleAnalogRelease=analogRelease;
analogRelease=function(event){
 const id=analogPointer;battleAnalogRelease(event);
 if(id!==null&&analogPointer===null){
  try{if(analogEl.hasPointerCapture?.(id))analogEl.releasePointerCapture(id);}catch(_){}
 }
};
if(!window.PointerEvent){
 window.addEventListener('touchstart',event=>{
  if(event.touches?.length===1)resetBattleTouchInput();
 },{capture:true,passive:true});
 analogEl.addEventListener('touchstart',event=>{
  event.preventDefault();if(analogPointer!==null)return;
  const touch=event.changedTouches[0];analogPointer=touch.identifier;showBattleTouch();analogMove(touch);
 },{passive:false});
 window.addEventListener('touchmove',event=>{
  const touch=Array.from(event.changedTouches).find(t=>t.identifier===analogPointer);
  if(touch){event.preventDefault();analogMove(touch);}
 },{capture:true,passive:false});
 for(const type of ['touchend','touchcancel'])window.addEventListener(type,event=>{
  for(const touch of event.changedTouches)battleTouchUp(touch.identifier,event);
  if(Array.from(event.changedTouches).some(t=>t.identifier===analogPointer)){event.preventDefault();analogRelease();}
 },{capture:true,passive:false});
}
window.addEventListener('gamepaddisconnected',event=>{
 battlePadAxes.delete(event.gamepad.index);
 if(coop.padSlots)coop.padSlots=coop.padSlots.map(index=>index===event.gamepad.index?null:index);
 if(activePadIndex===event.gamepad.index){activePadIndex=null;padHeld={};gamepadPrev={};padAxisDirection=0;delete directionTaps.pad;}
 if(coActive())pollPad();
});
window.addEventListener('pagehide',()=>{clearInput();if(mode==='fight'&&!paused)pauseGame();});
window.addEventListener('orientationchange',()=>{clearInput();layoutBattleControls();});
window.visualViewport?.addEventListener('resize',layoutBattleControls);
