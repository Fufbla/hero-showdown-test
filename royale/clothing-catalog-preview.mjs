// Read-only visual clothing catalog. Never changes hero, coins, equipment or saves.
const root=document.getElementById('clothing-catalog');
const status=document.getElementById('clothing-status');
const filter=document.getElementById('clothing-filter');
const count=document.getElementById('clothing-count');
let sets=[];
const node=(tag,value,cls)=>{const e=document.createElement(tag);if(value!==undefined)e.textContent=value;if(cls)e.className=cls;return e;};
const manifestCache=new Map(),imageCache=new Map();
async function manifest(path){
 if(!/^\.\/assets\/[a-z0-9/_-]+\.json$/i.test(path))throw Error('Invalid artwork reference');
 if(!manifestCache.has(path))manifestCache.set(path,fetch(new URL(path,'./cosmetics/')).then(r=>{if(!r.ok)throw Error('Artwork unavailable');return r.json();}));
 return manifestCache.get(path);
}
async function atlas(url){
 if(!/^\.\/assets\/[a-z0-9/_-]+\.(png|webp)$/i.test(url))throw Error('Invalid artwork image');
 if(!imageCache.has(url))imageCache.set(url,new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Artwork image unavailable'));img.src=new URL(url,'./cosmetics/').href;}));
 return imageCache.get(url);
}
async function drawArtwork(canvas,set){
 const ctx=canvas.getContext('2d');if(!ctx)return;
 // Display approved source artwork, not an invented costume or an inaccurate try-on.
 const parts=set.pieces.filter(p=>p.assetManifest);
 const sources=await Promise.all(parts.map(async p=>{const m=await manifest(p.assetManifest);return {m,img:await atlas(m.atlas.url)};}));
 const front=sources.flatMap(({m,img})=>m.layers.filter(l=>l.view==='front'&&l.rect?.length===4).map(l=>({l,img})));
 if(!front.length)throw Error('No front artwork');
 ctx.clearRect(0,0,canvas.width,canvas.height);
 // Layer source artwork pieces in separate tiles so each approved detail remains unaltered.
 const tiles=front.slice(0,6),columns=3,rows=Math.ceil(tiles.length/columns),w=canvas.width/columns,h=canvas.height/rows;
 tiles.forEach(({l,img},i)=>{const [x,y,sw,sh]=l.rect;const scale=Math.min((w-12)/sw,(h-12)/sh);ctx.drawImage(img,x,y,sw,sh,(i%columns)*w+(w-sw*scale)/2,Math.floor(i/columns)*h+(h-sh*scale)/2,sw*scale,sh*scale);});
}
const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;observer.unobserve(entry.target);const {canvas,set,note}=entry.target._clothingPreview;drawArtwork(canvas,set).then(()=>note.textContent='Approved artwork pieces · front view').catch(()=>note.textContent='Artwork preview unavailable');}}, {rootMargin:'200px'}):null;
function render(){
 root.replaceChildren();
 const category=filter.value;
 const visible=sets.filter(s=>category==='all'||s.collection===category);
 count.textContent=`${visible.length} complete outfits · ${visible.reduce((n,s)=>n+s.pieces.length,0)} individual pieces`;
 for(const set of visible){
  const card=node('article',undefined,'clothing-catalog-card');
  card.append(node('h3',set.name));
  const canvas=node('canvas',undefined,'clothing-artwork');canvas.width=360;canvas.height=240;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',set.name+' original clothing artwork pieces');
  const note=node('p','Loading artwork…','clothing-artwork-note');
  const artwork=node('div',undefined,'clothing-artwork-wrap');artwork.append(canvas,note);card.append(artwork);
  artwork._clothingPreview={canvas,set,note};if(observer)observer.observe(artwork);else drawArtwork(canvas,set).then(()=>note.textContent='Approved artwork pieces · front view').catch(()=>note.textContent='Artwork preview unavailable');
  card.append(node('p',`${set.coinPrice} coins · ${set.pieces.length} pieces · ${set.collection}`));
  const details=node('details');details.append(node('summary','View individual pieces'));
  const list=node('ul');for(const p of set.pieces)list.append(node('li',`${p.category}: ${p.coinPrice} coins`));
  details.append(list);card.append(details);root.append(card);
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
  for(const c of [...new Set(sets.map(s=>s.collection))].sort()){const option=node('option',c);option.value=c;filter.append(option);}
  status.textContent='Approved clothing artwork preview. Purchases and equipping remain disabled until cloud-save verification.';
  render();
 }catch(e){status.textContent=`Clothing catalog unavailable: ${e.message}. Existing equipment and saves are unaffected.`;}
}
load();
