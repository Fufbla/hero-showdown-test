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
  if(i<3){const select=document.createElement('button');select.type='button';select.className='slot-select';select.textContent='Select';select.title='Tap the power icon to activate; tap its name to select or replace.';select.onclick=e=>{e.stopPropagation();openSlot(i,select);};wrap.append(select);slots.push({select,cast,wrap,i});}
  else slots.push({cast,wrap,i});
 }
 return canEdit=>{for(const {select,cast,wrap,i} of slots){wrap.hidden=cast.hidden;if(select){select.disabled=!canEdit;select.textContent=cast.querySelector('span').textContent;select.setAttribute('aria-label','Select or replace power in slot '+(i+1));}}};
}
