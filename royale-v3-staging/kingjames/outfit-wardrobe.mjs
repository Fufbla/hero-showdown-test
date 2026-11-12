import {APPROVED_OUTFITS,OUTFIT_STORAGE_KEY} from './outfit-catalog.mjs';
import {OUTFIT_ID} from './selection.mjs';
import {FullBodyAnimator} from './animation.mjs';
import {ATTACKS} from '../../royale/core.mjs';

// Mounted only by the existing reserved-code staging adapter.
export function installOutfitWardrobe({engine,parent,getLook,onResume,storage=globalThis.localStorage}){
 const all=[{id:OUTFIT_ID,label:'Original Red Jacket',number:0,collection:'Original'},...APPROVED_OUTFITS];
 const dialog=document.createElement('dialog');dialog.id='outfit-wardrobe';dialog.setAttribute('aria-labelledby','outfit-heading');
 dialog.innerHTML=`<header class="outfit-header"><div><p class="outfit-eyebrow">YOUR APPROVED COLLECTION</p><h2 id="outfit-heading">Try all 12 outfits</h2></div><button type="button" data-close aria-label="Close outfits">×</button></header><p class="outfit-note">Free to try on this test character. Your saved appearance, coins and equipment stay intact.</p><div class="outfit-body"><section class="outfit-stage"><canvas width="320" height="300" aria-label="Animated outfit preview"></canvas><strong data-current></strong><label>Motion<select data-motion><option value="idle">Idle</option><option value="run">Run</option><option value="jump">Jump</option><option value="doubleJump">Double jump</option><option value="punch">Punch</option><option value="kick">Kick</option><option value="strength">Super Strength</option><option value="superKick">Super Kick</option><option value="fireball">Fireball</option></select></label><button type="button" data-facing>Face left</button><p data-status role="status" aria-live="polite"></p><button type="button" class="primary" data-play>Play in this outfit</button></section><section class="outfit-grid" aria-label="Approved outfits"></section></div>`;
 const style=document.createElement('style');style.textContent=`#outfit-wardrobe{color:#f6f7fb;background:#141c2d;border:1px solid #5f708a;border-radius:20px;width:min(960px,94vw);max-height:92dvh;padding:20px;box-shadow:0 24px 90px #000a;overflow:auto}#outfit-wardrobe::backdrop{background:#050a16ce}.outfit-header{display:flex;align-items:center;justify-content:space-between;gap:12px}.outfit-header h2{margin:4px 0;font-size:clamp(22px,4vw,32px)}.outfit-header [data-close]{font-size:26px;min-width:44px;min-height:44px}.outfit-eyebrow{font-size:11px;letter-spacing:.13em;color:#9de7c7;margin:0}.outfit-note{font-size:13px;color:#bac9df;line-height:1.5}.outfit-body{display:grid;grid-template-columns:260px 1fr;gap:18px}.outfit-stage{display:flex;align-items:center;flex-direction:column;gap:10px;position:sticky;top:0;align-self:start;background:#202d43;border-radius:14px;padding:12px}.outfit-stage canvas{width:100%;height:auto;max-height:260px;object-fit:contain}.outfit-stage label{display:flex;align-items:center;gap:8px;font-size:14px}.outfit-stage select{max-width:160px}.outfit-stage [data-status]{font-size:12px;min-height:32px;margin:0;text-align:center;color:#c4d4e8}.outfit-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.outfit-card{display:flex;flex-direction:column;align-items:center;gap:5px;border:2px solid #42516a;border-radius:13px;padding:8px;background:#1e293e;color:#fff;min-width:0;cursor:pointer;font:inherit}.outfit-card[aria-pressed=true]{border-color:#83f2bb;background:#243e42}.outfit-card img{width:100%;aspect-ratio:1;object-fit:contain;background:#e6e9ef;border-radius:8px}.outfit-card b{font-size:12px;text-align:center;line-height:1.3}.outfit-card small{font-size:10px;color:#bac9df}.outfit-card:focus-visible{outline:3px solid #fff;outline-offset:2px}#outfit-wardrobe button{min-height:42px}#outfit-wardrobe [data-play]{width:100%}@media(max-width:650px){#outfit-wardrobe{padding:12px}.outfit-body{grid-template-columns:1fr}.outfit-stage{position:static;display:grid;grid-template-columns:112px 1fr;align-items:center}.outfit-stage canvas{grid-row:1/6;width:112px;height:150px}.outfit-stage [data-current]{font-size:14px}.outfit-stage [data-status]{min-height:0}.outfit-stage [data-play]{grid-column:1/-1}.outfit-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-height:500px) and (min-width:651px){.outfit-body{grid-template-columns:205px 1fr}.outfit-stage canvas{max-height:120px}.outfit-note{margin:5px 0}.outfit-stage{gap:5px}.outfit-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}`;
 document.head.append(style);document.body.append(dialog);
 const open=document.createElement('button');open.type='button';open.id='kingjames-outfits';open.className='primary';open.textContent='Try Outfits · 12';parent.prepend(open);
 const grid=dialog.querySelector('.outfit-grid'),status=dialog.querySelector('[data-status]'),current=dialog.querySelector('[data-current]'),motion=dialog.querySelector('[data-motion]'),canvas=dialog.querySelector('canvas'),c=canvas.getContext('2d');
 let frame=0,busy=false,direction=1,animator,animatorID,started=0;
 const update=()=>{current.textContent=all.find(o=>o.id===engine.outfitID)?.label||'Original Red Jacket';for(const button of grid.children)button.setAttribute('aria-pressed',String(button.dataset.outfit===engine.outfitID));};
 async function choose(id,{remember=true}={}){
  if(busy)return false;busy=true;status.textContent='Loading outfit…';
  for(const b of grid.children)b.disabled=true;dialog.querySelector('[data-play]').disabled=true;
  const ok=await engine.choose(id);
  if(ok){if(remember)try{storage.setItem(OUTFIT_STORAGE_KEY,id);}catch{}status.textContent='Ready to try. Choose a motion or return to the game.';started=performance.now();animatorID=null;update();}
  else status.textContent='This outfit could not load. Your previous outfit is still selected. Tap to retry.';
  busy=false;for(const b of grid.children)b.disabled=false;dialog.querySelector('[data-play]').disabled=false;return ok;
 }
 for(const outfit of all){
  const button=document.createElement('button');button.type='button';button.className='outfit-card';button.dataset.outfit=outfit.id;button.setAttribute('aria-label','Wear '+outfit.label);button.setAttribute('aria-pressed','false');
  const img=document.createElement('img');img.alt='';img.loading='lazy';img.src=new URL('./outfits/'+outfit.id+'/preview.webp',import.meta.url).href;
  const title=document.createElement('b');title.textContent=(outfit.number?outfit.number+'. ':'')+outfit.label;const category=document.createElement('small');category.textContent=outfit.collection;
  button.append(img,title,category);button.onclick=()=>void choose(outfit.id);grid.append(button);
 }
 function render(now){
  if(!dialog.open)return;const loaded=engine.outfits.get(engine.outfitID);c.clearRect(0,0,canvas.width,canvas.height);
  if(loaded){const m=loaded.manifest;if(animatorID!==m.id){animator=new FullBodyAnimator(m);animatorID=m.id;started=now;}
   const time=(now-started)/1000,action=motion.value,phase=time%1.4;
   const h={grounded:true,vx:0,vy:0,face:direction,dead:false,respawnAge:100,hurtAge:100,jumpAge:100,jumps:0,stun:0,landing:0,castAge:100};
   if(action==='run')h.vx=230;
   if(action==='jump'||action==='doubleJump'){h.grounded=false;h.jumpAge=phase*.4;h.vy=-480+phase*380;h.jumps=action==='doubleJump'?2:1;}
   if(['punch','kick','strength','superKick'].includes(action)&&phase<.95){const kind=action==='kick'||action==='superKick'?'kick':'punch';h.attack={kind,power:action===kind?null:action,age:phase/.95*ATTACKS[kind].duration,face:direction,comboIndex:Math.floor(time/1.4)%6};}
   if(action==='fireball')h.castAge=phase;
   const sample=animator.sample(h,time),f=sample.frame,s=1.08;c.save();c.translate(160,278);c.scale(sample.direction*s,s);c.translate(-m.foot[0],-m.foot[1]);c.drawImage(loaded.atlases[f.atlas||'default'],...f.rect,0,0,...m.cell);engine.head.draw(c,getLook(),f.head,m.head.scale);c.restore();
  }
  frame=requestAnimationFrame(render);
 }
 open.onclick=()=>{dialog.showModal();update();started=performance.now();frame=requestAnimationFrame(render);dialog.querySelector('[data-close]').focus();};
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.querySelector('[data-play]').onclick=()=>{dialog.close();onResume();};
 dialog.querySelector('[data-facing]').onclick=e=>{direction*=-1;e.currentTarget.textContent=direction>0?'Face left':'Face right';};
 motion.onchange=()=>{animatorID=null;};dialog.addEventListener('close',()=>{cancelAnimationFrame(frame);open.focus();});
 let saved;try{saved=storage.getItem(OUTFIT_STORAGE_KEY);}catch{}
 if(all.some(o=>o.id===saved)&&saved!==OUTFIT_ID)void choose(saved,{remember:false});
 return {dialog,choose};
}
