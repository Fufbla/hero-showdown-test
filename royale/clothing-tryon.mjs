// Persistent read-only clothing fitting room. No state, wallet, or save mutations.
import {drawHero} from './hero-art.mjs';
import {previewHero} from './hero-rig.mjs';
import {clothingRuntime} from './cosmetics/runtime.mjs';
import {universalRenderLook} from './cosmetics/template.mjs';

let serial=0, ui=null, selected=null, layers=[];
const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
function currentHero(){
 let value=null;
 window.dispatchEvent(new CustomEvent('royale-clothing-preview-request',{detail:{receive(v){value=v;}}}));
 return value;
}
function draw(){
 if(!ui)return;
 const {canvas,note,view}=ui,c=canvas.getContext('2d');
 if(!c)return;
 c.clearRect(0,0,canvas.width,canvas.height);
 c.fillStyle='rgba(150,210,170,.1)';c.beginPath();c.ellipse(180,390,65,10,0,0,Math.PI*2);c.fill();
 const hero=currentHero();
 if(!hero?.look){
  note.textContent='Load a hero before using Try On. Your original clothing stays unchanged.';
  return;
 }
 try{
  const rawLook=universalRenderLook({...hero.look,cape:false});
  const scale=1.7,x=180,y=392;
  const pose=drawHero(c,x,y,rawLook,previewHero('idle',0),0,scale,{view,outfit:{pieces:{}},clothing:layers});
  if(!pose?.arms?.length||!pose?.legs?.length){
   note.textContent='Character artwork is loading. Try selecting the outfit again.';
   return;
  }
 }catch(e){note.textContent='Cannot render this outfit: '+e.message;}
}
export function initializeTryOn(holder){
 if(ui?.holder===holder)return;
 const section=node('section');section.className='clothing-fitting-room';
 const heading=node('h3','YOUR HERO · FITTING ROOM');
 const title=node('p','Choose any outfit below to see your hero wearing it.');
 const views=node('nav');views.className='clothing-fit-views';views.setAttribute('aria-label','View outfit from four sides');
 const canvas=node('canvas');canvas.width=360;canvas.height=420;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Hero clothing fitting room');
 const note=node('p','Preview only. No coins or saved clothing will change.');note.setAttribute('role','status');
 section.append(heading,title,views,canvas,note);
 holder.prepend(section);
 ui={holder,section,title,views,canvas,note,view:'front'};
 for(const view of ['front','right','back','left']){
  const b=node('button',view[0].toUpperCase()+view.slice(1));b.type='button';b.className='secondary';
  b.setAttribute('aria-pressed',String(view==='front'));
  b.onclick=()=>{ui.view=view;for(const item of views.querySelectorAll('button'))item.setAttribute('aria-pressed',String(item===b));draw();};
  views.append(b);
 }
 draw();
}
export async function openTryOn(set){
 if(!ui){throw Error('Fitting room not initialized');}
 const request=++serial;
 selected=set;layers=[];ui.title.textContent='Trying on: '+set.name;
 ui.note.textContent='Loading your hero and '+set.pieces.length+' clothing pieces…';
 ui.section.scrollIntoView({block:'nearest',behavior:'smooth'});
 draw();
 try{
  const result=await clothingRuntime.loadIds(set.pieces.map(p=>p.id),{review:true,retry:true});
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
