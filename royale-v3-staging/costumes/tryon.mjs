// Persistent read-only clothing fitting room. No state, wallet, or save mutations.
import {clothingRuntime} from '../../royale/cosmetics/runtime.mjs';
import {drawOutfitPreview} from '../../royale/cosmetics/preview.mjs';

let serial=0, ui=null, layers=[], frameHandle=0, lastFrame=0;
const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
function currentHero(){
 let value=null;
 window.dispatchEvent(new CustomEvent('royale-clothing-preview-request',{detail:{receive(v){value=v;}}}));
 return value;
}
function draw(time=0){
 if(!ui)return;
 const {canvas,note,direction,motion}=ui,c=canvas.getContext('2d');
 if(!c)return;
 c.clearRect(0,0,canvas.width,canvas.height);
 const hero=currentHero();
 if(!hero?.look){
  note.textContent='Load a hero before using Try On. Your original clothing stays unchanged.';
  return;
 }
 try{
  const pose=drawOutfitPreview(canvas,{look:hero.look,layers,view:'game',motion,direction,time,scale:1.7});
  if(!pose?.arms?.length||!pose?.legs?.length&&pose?.artSource!=='full-body-costume'){
   note.textContent='Character artwork is loading. Try selecting the outfit again.';
   return;
  }
 }catch(e){note.textContent='Cannot render this outfit: '+e.message;}
}
function frame(now){
 frameHandle=0;
 if(!ui||ui.motion==='idle'||!ui.section.isConnected)return;
 if(now-lastFrame>=1000/18){lastFrame=now;draw(now/1000);}
 frameHandle=requestAnimationFrame(frame);
}
function updateAnimation(){
 if(ui?.motion!=='idle'&&frameHandle===0&&typeof requestAnimationFrame==='function')
  frameHandle=requestAnimationFrame(frame);
 else if(ui?.motion==='idle'&&frameHandle&&typeof cancelAnimationFrame==='function'){
  cancelAnimationFrame(frameHandle);frameHandle=0;
 }
}
export function initializeTryOn(holder){
 if(ui?.holder===holder)return;
 const section=node('section');section.className='clothing-fitting-room';
 const heading=node('h3','YOUR HERO · FITTING ROOM');
 const title=node('p','Choose any outfit below to see your hero wearing it.');
 const views=node('nav');views.className='clothing-fit-views';views.setAttribute('aria-label','Actual gameplay facing direction');
 const canvas=node('canvas');canvas.width=360;canvas.height=420;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Hero clothing fitting room');
 const note=node('p','Preview only. No coins or saved clothing will change.');note.setAttribute('role','status');
 const motionButtons=node('nav');motionButtons.className='clothing-fit-views';
 motionButtons.setAttribute('aria-label','Preview walking and running movements');
 section.append(heading,title,views,motionButtons,canvas,note);
 holder.prepend(section);
 ui={holder,section,title,views,motionButtons,canvas,note,direction:1,motion:'idle'};
 for(const [direction,label] of [[1,'Moving right'],[-1,'Moving left']]){
  const b=node('button',label);b.type='button';b.className='secondary';
  b.setAttribute('aria-pressed',String(direction===1));
  b.onclick=()=>{ui.direction=direction;for(const item of views.querySelectorAll('button'))
    item.setAttribute('aria-pressed',String(item===b));draw();};
  views.append(b);
 }
 for(const [motion,label] of [['idle','Standing'],['walk','Walking'],['run','Running'],['jump','Jump'],['doubleJump','Double jump'],['punch','Punch'],['kick','Kick'],['strength','Super Strength'],['superKick','Super Kick'],['fireball','Fireball'],['flight','Flight'],['steel','Steel Body']]){
  const b=node('button',label);b.type='button';b.className='secondary';
  b.setAttribute('aria-pressed',String(motion==='idle'));
  b.onclick=()=>{ui.motion=motion;for(const item of motionButtons.querySelectorAll('button'))
    item.setAttribute('aria-pressed',String(item===b));draw();updateAnimation();};
  motionButtons.append(b);
 }
 draw();
}
export async function openTryOn(set){
 if(!ui){throw Error('Fitting room not initialized');}
 const request=++serial;
 layers=[];ui.title.textContent='Trying on: '+set.name;
 ui.note.textContent='Loading your hero and the complete outfit…';
 ui.section.scrollIntoView({block:'nearest',behavior:'smooth'});
 draw();
 try{
  const result=await clothingRuntime.loadOutfit(set,{review:true,retry:true});
  if(request!==serial)return;
  layers=result;
  ui.note.textContent='Wearing '+set.name+' in preview only. No changes saved.';
  draw();
 }catch(e){
  if(request!==serial)return;
  layers=[];ui.note.textContent='Unable to load '+set.name+': '+e.message+'. No coins or saved progress changed.';
  draw();
 }
}
