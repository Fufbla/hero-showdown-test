import {openTryOn,initializeTryOn} from '../../royale/clothing-tryon.mjs';
import {initializeStoreActions,storeControls,myClothingPanel} from '../../royale/clothing-purchase-ui.mjs';
import {clothingRuntime} from '../../royale/cosmetics/runtime.mjs';
import {drawOutfitPreview} from '../../royale/cosmetics/preview.mjs';
import {prepareStyleCMaterials} from '../../royale/style-c-materials.mjs';
// Read-only visual clothing catalog. Never changes hero, coins, equipment or saves.
const root=document.getElementById('clothing-catalog');
const status=document.getElementById('clothing-status');
const filter=document.getElementById('clothing-filter');
const count=document.getElementById('clothing-count');
let sets=[];
const node=(tag,value,cls)=>{const e=document.createElement(tag);if(value!==undefined)e.textContent=value;if(cls)e.className=cls;return e;};
async function drawArtwork(canvas,set){
 const [layers,ready]=await Promise.all([clothingRuntime.loadOutfit(set,{review:true}),prepareStyleCMaterials()]);
 if(!ready)throw Error('Character artwork unavailable');
 let hero=null;
 window.dispatchEvent(new CustomEvent('royale-clothing-preview-request',{detail:{receive(value){hero=value;}}}));
 drawOutfitPreview(canvas,{look:hero?.look,layers});
}
const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;observer.unobserve(entry.target);const {canvas,set,note}=entry.target._clothingPreview;drawArtwork(canvas,set).then(()=>note.textContent='Complete outfit · gameplay view').catch(()=>note.textContent='Outfit preview unavailable');}}, {rootMargin:'200px'}):null;
function render(){
 root.replaceChildren();
 myClothingPanel(root.parentElement);
 const category=filter.value;
 const visible=sets.filter(s=>category==='all'||s.collection===category);
 count.textContent=`${visible.length} complete matching outfits`;
 for(const set of visible){
  const card=node('article',undefined,'clothing-catalog-card');
  card.append(node('h3',set.name));
  const tryButton=node('button','Try On');tryButton.type='button';tryButton.className='secondary clothing-tryon-button';
  tryButton.addEventListener('click',()=>{tryButton.disabled=true;Promise.resolve(openTryOn(set)).catch(e=>{status.textContent='Try On error: '+e.message;}).finally(()=>{tryButton.disabled=false;});});
  card.append(tryButton);
  const canvas=node('canvas',undefined,'clothing-artwork');canvas.width=360;canvas.height=240;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',set.name+' complete outfit');
  const note=node('p','Loading artwork…','clothing-artwork-note');
  const artwork=node('div',undefined,'clothing-artwork-wrap');artwork.append(canvas,note);card.append(artwork);
  artwork._clothingPreview={canvas,set,note};if(observer)observer.observe(artwork);else drawArtwork(canvas,set).then(()=>note.textContent='Complete outfit · gameplay view').catch(()=>note.textContent='Outfit preview unavailable');
  card.append(node('p',`${set.coinPrice} coins · Complete outfit · ${set.collection}`));
  card.append(storeControls(set));
  root.append(card);
 }
}
filter.addEventListener('change',render);
async function load(){
 try{
  const {data}=await clothingRuntime.catalog();
  sets=data.sets;
  for(const c of [...new Set(sets.map(s=>s.collection))].sort()){const option=node('option',c);option.value=c;filter.append(option);}
  initializeStoreActions(sets,render,root.parentElement);
  initializeTryOn(root.parentElement);
  status.textContent='Choose Try On for a free preview, or use Buy and Wear with a loaded V3 cloud hero. Purchases require a successful cloud save.';
  render();
 }catch(e){status.textContent=`Clothing catalog unavailable: ${e.message}. Existing equipment and saves are unaffected.`;}
}
load();
