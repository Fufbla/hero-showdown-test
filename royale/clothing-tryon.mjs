// Read-only Try On. Renders approved clothing on an in-memory portrait; never mutates game state.
import {drawHero} from './hero-art.mjs';
import {previewHero} from './hero-rig.mjs';
import {clothingRuntime} from './cosmetics/runtime.mjs';
import {drawClothingPass} from './cosmetics/renderer.mjs';
import {universalRenderLook} from './cosmetics/template.mjs';

const passes=['behindBody','farLeg','nearLeg','torso','farArm','nearArm','overBody','behindHead','headwear','accessory'];
let active=null,serial=0;
const make=(tag,label)=>{const n=document.createElement(tag);if(label!=null)n.textContent=label;return n;};
function currentHero(){
 let hero=null;
 window.dispatchEvent(new CustomEvent('royale-clothing-preview-request',{detail:{receive(value){hero=value;}}}));
 return hero;
}
function paint(){
 if(!active||!active.layers||!active.hero)return;
 const {canvas,hero,layers,view}=active,c=canvas.getContext('2d');
 if(!c)return;
 const size=canvas.width,foot=canvas.height-18,scale=2;
 c.clearRect(0,0,size,canvas.height);
 c.fillStyle='rgba(150,210,170,.12)';c.beginPath();c.ellipse(size/2,foot,65,9,0,0,Math.PI*2);c.fill();
 const rawLook=universalRenderLook(hero.look);
 const p=drawHero(c,size/2,foot,rawLook,previewHero('idle',0),0,scale,{view,outfit:hero.outfit});
 if(!p?.arms||!p?.legs){active.note.textContent='Hero rendering unavailable; original outfit art remains visible.';return;}
 c.save();c.translate(size/2,foot);c.scale(scale,scale);
 for(const pass of passes)drawClothingPass(c,p,view,pass,layers);
 c.restore();
}
export async function openTryOn(set,card){
 const id=++serial;
 if(active?.stage?.isConnected)active.stage.remove();
 active=null;
 const stage=make('section');stage.className='clothing-tryon';stage.setAttribute('aria-label',set.name+' virtual try-on');
 const h=make('h4','Try On · '+set.name),note=make('p','Loading your hero and outfit artwork…');
 note.setAttribute('role','status');
 const controls=make('div');controls.className='clothing-tryon-controls';
 const canvas=make('canvas');canvas.width=340;canvas.height=430;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Read-only hero clothing preview');
 const close=make('button','Close preview');close.type='button';close.onclick=()=>{serial++;stage.remove();active=null;};
 stage.append(h,controls,canvas,note,close);
 card.append(stage);
 const hero=currentHero();
 if(!hero){note.textContent='Select and load a hero first, then open the Tree of Eris to try on clothes.';return;}
 try{
  const layers=await clothingRuntime.loadIds(set.pieces.map(p=>p.id),{review:true,retry:true});
  if(id!==serial||!stage.isConnected)return;
  if(!layers.length)throw Error('Outfit artwork not available');
  active={stage,hero,layers,canvas,note,view:'front'};
  for(const view of ['front','right','back','left']){
   const button=make('button',view[0].toUpperCase()+view.slice(1));button.type='button';button.className='secondary';
   button.setAttribute('aria-pressed',String(view==='front'));
   button.onclick=()=>{if(!active||active.stage!==stage)return;active.view=view;for(const b of controls.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b===button));paint();};
   controls.append(button);
  }
  note.textContent='Visual try-on only. Your outfit, armor, coins, and saves have not changed.';
  paint();
 }catch(error){if(id!==serial||!stage.isConnected)return;note.textContent='Try On unavailable: '+(error?.message||'Artwork loading failed')+'. Your hero is unchanged.';}
}
