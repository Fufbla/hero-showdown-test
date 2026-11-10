// Read-only cosmetic catalog preview. Does not touch hero, coins, inventory, or saves.
const root=document.getElementById('clothing-catalog');
const status=document.getElementById('clothing-status');
const filter=document.getElementById('clothing-filter');
const count=document.getElementById('clothing-count');
let sets=[];
const node=(tag,value,cls)=>{const e=document.createElement(tag);if(value!==undefined)e.textContent=value;if(cls)e.className=cls;return e;};
function render(){
  root.replaceChildren();
  const category=filter.value;
  const visible=sets.filter(s=>category==='all'||s.collection===category);
  count.textContent=`${visible.length} complete outfits · ${visible.reduce((n,s)=>n+s.pieces.length,0)} individual pieces`;
  for(const set of visible){
    const card=node('article',undefined,'clothing-catalog-card');
    card.append(node('h3',set.name),node('p',`${set.coinPrice} coins · ${set.pieces.length} pieces · ${set.collection}`));
    const details=node('details');details.append(node('summary','View individual pieces'));
    const list=node('ul');
    for(const p of set.pieces)list.append(node('li',`${p.category}: ${p.coinPrice} coins`));
    details.append(list);card.append(details);
    root.append(card);
  }
}
filter.addEventListener('change',render);
async function load(){
 try{
  const response=await fetch(new URL('./cosmetics/catalog.json',import.meta.url),{cache:'no-cache'});
  if(!response.ok)throw Error(`Catalog HTTP ${response.status}`);
  const data=await response.json();
  if(!Array.isArray(data.sets)||data.sets.length!==36||data.sets.some(s=>!Array.isArray(s.pieces)||s.coinPrice!==700))throw Error('Catalog verification failed');
  sets=data.sets;
  const collections=[...new Set(sets.map(s=>s.collection))].sort();
  for(const c of collections){const option=node('option',c);option.value=c;filter.append(option);}
  status.textContent='Catalog loaded. Preview only — purchases and equipping will be enabled after save-system verification.';
  render();
 }catch(e){status.textContent=`Clothing catalog unavailable: ${e.message}. Existing equipment and saves are unaffected.`;}
}
load();
