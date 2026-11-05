import {updatePowerProgress} from './compact-hud.mjs';
// Presentation-only sizing. No world coordinates or save data are written here.
export const landscapeLayout=(width,height,touch=false)=>width>height&&(touch||height<=600||width<=1180&&height<=820);
export const stableTouchScale=(width,height)=>Math.max(.65,Math.min(1,Math.min(width,height)/480));
export function installLandscapeLayout(input,openSlot){
 const media=window.matchMedia('(pointer:coarse)');let orientation;
 const resize=()=>{
  const w=window.innerWidth,h=window.innerHeight,wide=w>h;
  const touch=media.matches||document.body.classList.contains('force-touch');
  document.body.classList.toggle('landscape-game',landscapeLayout(w,h,touch));
  document.body.classList.toggle('touch-layout',touch);
  if(orientation!==undefined&&orientation!==wide){input.clear();input.padHeld.clear();input.padPrevious.clear();input.padX=input.padY=0;input.waitForNeutralPad=true;}
  orientation=wide;
 };
 window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);resize();
 const slots=[];
 for(const [i,cast] of [...document.querySelectorAll('.power-button')].entries()){
  const wrap=document.createElement('div');wrap.className='compact-power-slot';cast.before(wrap);wrap.append(cast);
  cast.dataset.slot=String(i);slots.push({cast,wrap,i});
  // A context click or Shift+Enter selects this slot directly; the visible swap
  // button and empty-slot + also keep equipment access available to touch users.
  if(i<3){cast.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();openSlot(i,cast);});cast.addEventListener('keydown',e=>{if(e.shiftKey&&e.key==='Enter'){e.preventDefault();e.stopPropagation();openSlot(i,cast);}});}
 }
 return (canEdit,game)=>{for(const {cast,wrap,i} of slots){wrap.hidden=cast.hidden;updatePowerProgress(cast,i,game);}};
}
