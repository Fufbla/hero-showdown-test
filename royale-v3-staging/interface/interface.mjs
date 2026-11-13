import {clothingRuntime} from '../../royale/cosmetics/runtime.mjs';
import {ownsOutfit,selectedOutfit,quoteOutfit} from '../../royale/cosmetics/state.mjs';
import {drawOutfitPreview} from '../costumes/preview.mjs';
import {StoreController} from './store-controller.mjs';

const $=id=>document.getElementById(id);
const element=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const button=(text,action,cls)=>{const e=element('button',text,cls);e.type='button';e.onclick=action;return e;};
const money=n=>Number(n||0).toLocaleString();
const cloudIcon='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9 24H7a6 6 0 0 1-1-12 10 10 0 0 1 19-1 7 7 0 0 1 0 13h-2M16 15v15m-5-5 5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function installInterface(hooks){
  let currentScreen='',catalog=[],layers=[],look=null,frame=0,last=0,serial=0,direction=1,thumbObserver,heroScale=3.5;
  const scales=new Map();
  const cards=new Map();
  const openButton=button('Clothing Store',hooks.open,'secondary');openButton.id='open-clothing-store';$('tree-from-pause').after(openButton);
  const pauseCard=$('pause-menu').querySelector('.pause-card');
  const topActions=document.querySelector('.top-actions'),actionsHome=document.createComment('Gameplay controls');topActions.before(actionsHome);
  const brand=element('div',undefined,'pause-brand');brand.innerHTML='<span aria-hidden="true">✦</span><div><small>JAMES CLAN COMICS</small><strong>HERO SHOWDOWN</strong></div>';
  pauseCard.prepend(brand);
  const footer=element('footer',undefined,'pause-save-footer');
  const saved=element('span');saved.id='pause-saved-slot';
  const restore=button('',()=>{if(!controller.busy)hooks.restore();});restore.id='restore-cloud-heroes';restore.innerHTML=cloudIcon+'<span>Restore Cloud Heroes</span>';
  footer.append(saved,restore);pauseCard.append(footer);
  document.querySelectorAll('[data-eris="clothing"],[data-eris-panel="clothing"]').forEach(n=>n.remove());

  const page=element('section',undefined,'overlay clothing-page');page.id='clothing-menu';page.hidden=true;page.setAttribute('aria-label','Clothing Store');
  page.innerHTML=`<div class="store-shell">
    <header class="store-header"><button type="button" id="store-back" aria-label="Back to pause menu">←</button><div class="store-brand"><small>JAMES CLAN COMICS</small><strong>HERO SHOWDOWN</strong></div><h1>Clothing Store</h1><div class="store-wallet" aria-label="Available coins"><span aria-hidden="true">◉</span><b id="store-coins">0</b><span class="sr-only">coins</span></div></header>
    <section class="store-preview" aria-label="Costume Preview"><div class="preview-copy"><span class="preview-label">Costume Preview</span><p>This is your hero in the<br>selected costume.</p><i aria-hidden="true"></i></div><div class="preview-cloud cloud-one"></div><div class="preview-cloud cloud-two"></div><div class="preview-hills" aria-hidden="true"></div><canvas id="store-hero" width="600" height="520" role="img" aria-label="Your hero running in place"></canvas><div class="preview-caption"><h2 id="store-preview-name">Your hero</h2><span id="preview-price"></span><div class="preview-actions"><button type="button" id="preview-left" aria-label="Preview running left" aria-pressed="false">←</button><button type="button" id="preview-right" aria-label="Preview running right" aria-pressed="true">→</button><button type="button" id="preview-equip" hidden>Equip</button></div></div></section>
    <div class="store-collection-heading"><h2><span aria-hidden="true">✦</span> Available Costumes</h2><label><span class="sr-only">Costume collection</span><select id="store-filter"><option value="all">All Costumes</option></select></label></div>
    <div class="store-carousel-wrap"><button id="costumes-previous" type="button" aria-label="Previous costumes">‹</button><div id="costume-carousel" role="list" aria-label="Available costumes" tabindex="0"></div><button id="costumes-next" type="button" aria-label="Next costumes">›</button></div>
    <p id="store-message" role="status" aria-live="polite">Select a costume to preview it. Your equipped outfit stays unchanged.</p>
    <dialog id="costume-confirm" aria-labelledby="purchase-title" aria-describedby="purchase-message"><button type="button" id="purchase-close" aria-label="Cancel purchase">×</button><canvas id="purchase-thumbnail" width="200" height="180" aria-hidden="true"></canvas><h2 id="purchase-title"></h2><p id="purchase-message" role="status"></p><div class="purchase-actions"><button type="button" id="purchase-cancel">Cancel</button><button type="button" id="purchase-buy">Buy</button></div></dialog>
  </div>`;
  $('stage').append(page);
  const canvas=$('store-hero'),dialog=$('costume-confirm'),carousel=$('costume-carousel');
  const controller=new StoreController({status:hooks.status,quote:quoteOutfit,owns:ownsOutfit,
    operate:operation=>new Promise(resolve=>window.dispatchEvent(new CustomEvent('royale-clothing-operation',{detail:{operation,receive:resolve}}))),changed:update});
  const stop=()=>{serial++;if(frame)cancelAnimationFrame(frame);frame=0;canvas.dataset.animating='false';};
  function animate(now){
    frame=0;if(currentScreen!=='clothing'||document.hidden)return;
    if(now-last>=1000/30){last=now;if(look&&layers.length){
      const pose=drawOutfitPreview(canvas,{look,layers,view:'game',motion:'run',direction,time:now/1000,scale:heroScale});
      canvas.dataset.animating=String(!!pose);canvas.dataset.motion='run';canvas.dataset.direction=String(direction);
    }}
    frame=requestAnimationFrame(animate);
  }
  async function select(set){
    controller.select(set);layers=[];const request=++serial;
    canvas.dataset.animating='false';canvas.dataset.outfit='';
    canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
    canvas.setAttribute('aria-label',hooks.hero().name+' running in '+set.name);
    try{const next=await clothingRuntime.loadOutfit(set,{review:true});if(request!==serial||currentScreen!=='clothing')return;layers=next;heroScale=fitScale(next,canvas);canvas.dataset.outfit=set.id;drawThumbnail($('purchase-thumbnail'),next);}
    catch(error){if(request===serial){controller.message='Unable to load '+set.name+'. '+error.message;update();}}
  }
  function fitScale(next,target){
    const key=next.map(l=>l.id).join('|');let bounds=scales.get(key);
    if(!bounds){
      const probe=document.createElement('canvas');probe.width=600;probe.height=520;const c=probe.getContext('2d',{willReadFrequently:true});let left=300,right=300,top=500;
      for(let sample=0;sample<12;sample++){
        drawOutfitPreview(probe,{look,layers:next,view:'game',motion:'run',direction:1,time:sample/12,scale:1});
        const pixels=c.getImageData(0,0,600,490).data;
        for(let y=0;y<490;y++)for(let x=0;x<600;x++)if(pixels[(y*600+x)*4+3]>25){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);}
      }
      bounds={half:Math.max(300-left,right-300,40),height:Math.max(500-top,100)};scales.set(key,bounds);
    }
    return Math.min((target.width-32)/(bounds.half*2),(target.height-48)/bounds.height);
  }
  function drawThumbnail(target,next){if(look)drawOutfitPreview(target,{look,layers:next,view:'game',motion:'run',direction:1,time:.3,scale:fitScale(next,target)});}
  async function thumbnail(card,set){
    const next=await clothingRuntime.loadOutfit(set,{review:true});if(!card.isConnected||currentScreen!=='clothing')return;drawThumbnail(card.querySelector('canvas'),next);
  }
  function renderCards(){
    thumbObserver?.disconnect();cards.clear();carousel.replaceChildren();
    thumbObserver=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){thumbObserver.unobserve(e.target);thumbnail(e.target,e.target.costume).catch(()=>e.target.classList.add('art-unavailable'));}},{root:carousel,rootMargin:'180px'});
    for(const set of catalog.filter(s=>$('store-filter').value==='all'||s.collection===$('store-filter').value)){
      const card=element('article',undefined,'costume-card');card.setAttribute('role','listitem');card.dataset.outfit=set.id;card.costume=set;
      const choose=button('',()=>void select(set),'costume-select');choose.setAttribute('aria-label','Preview '+set.name);
      const badge=element('span','Selected','costume-selected');const art=element('canvas');art.width=280;art.height=240;art.setAttribute('aria-hidden','true');choose.append(badge,art,element('h3',set.name));
      const row=element('div',undefined,'costume-price-row'),price=element('span',undefined,'costume-price'),action=button('+',()=>{if(controller.request(set)){void select(set);dialog.showModal();$('purchase-cancel').focus();}},'costume-action');
      row.append(price,action);card.append(choose,row);cards.set(set.id,{card,choose,price,action,set});carousel.append(card);thumbObserver.observe(card);
    }
    update();
  }
  function update(){
    const state=hooks.status(),selected=controller.selected,wearing=state?.cosmetics?.visible?selectedOutfit(state.cosmetics)?.id:null;
    $('store-coins').textContent=money(state?.coins);
    $('store-message').textContent=controller.message||'Select a costume to preview it. Your equipped outfit stays unchanged.';
    for(const {card,choose,price,action,set} of cards.values()){
      const owned=ownsOutfit(state?.cosmetics,set),quote=quoteOutfit(state?.cosmetics,set);
      const picked=set.id===selected?.id;card.classList.toggle('selected',picked);choose.setAttribute('aria-pressed',String(picked));
      price.textContent=owned?(wearing===set.id?'Equipped':'Owned'):'◉ '+money(quote.ok?quote.debit:set.coinPrice);
      action.textContent=owned?(wearing===set.id?'✓':'Equip'):'+';action.disabled=controller.busy||(owned&&wearing===set.id);
      action.setAttribute('aria-label',owned?(wearing===set.id?'Equipped '+set.name:'Equip '+set.name):'Buy '+set.name);
      action.onclick=owned?()=>void controller.equip(set):()=>{if(controller.request(set)){void select(set);if(!dialog.open)dialog.showModal();$('purchase-cancel').focus();}};
    }
    if(selected){
      const owned=ownsOutfit(state?.cosmetics,selected),quote=quoteOutfit(state?.cosmetics,selected);
      $('store-preview-name').textContent=selected.name;$('preview-price').textContent=owned?(wearing===selected.id?'Currently equipped':'Owned outfit'):'◉ '+money(quote.ok?quote.debit:selected.coinPrice)+' coins';
      const equip=$('preview-equip');equip.hidden=!owned;equip.textContent=wearing===selected.id?'Remove outfit':'Equip';equip.disabled=controller.busy;equip.onclick=()=>void controller.equip(wearing===selected.id?null:selected);
    }
    if(controller.confirming){
      $('purchase-title').textContent='Buy '+controller.confirming.set.name+' for '+money(controller.confirming.price)+' coins?';
      $('purchase-message').textContent=controller.message||'Unlock this outfit permanently for your hero.';
    }else if(dialog.open)dialog.close();
    for(const id of ['purchase-buy','purchase-cancel','purchase-close','store-back'])$(id).disabled=controller.busy;
    $('purchase-buy').textContent=controller.busy?'Saving…':'Buy';
  }
  const cancel=()=>{controller.cancel();};
  $('purchase-cancel').onclick=cancel;$('purchase-close').onclick=cancel;$('purchase-buy').onclick=()=>void controller.buy();
  dialog.addEventListener('cancel',e=>{e.preventDefault();cancel();});
  dialog.addEventListener('keydown',e=>{e.stopPropagation();});
  dialog.addEventListener('close',()=>{if(controller.selected)cards.get(controller.selected.id)?.action.focus();});
  $('store-back').onclick=()=>{if(!controller.busy)hooks.back();};
  $('store-filter').onchange=renderCards;
  $('costumes-previous').onclick=()=>carousel.scrollBy({left:-carousel.clientWidth*.8,behavior:'smooth'});
  $('costumes-next').onclick=()=>carousel.scrollBy({left:carousel.clientWidth*.8,behavior:'smooth'});
  carousel.addEventListener('keydown',e=>{if(e.target!==carousel)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();carousel.scrollBy({left:(e.key==='ArrowRight'?1:-1)*240,behavior:'smooth'});}});
  for(const [id,value]of [['preview-left',-1],['preview-right',1]])$(id).onclick=()=>{direction=value;$('preview-left').setAttribute('aria-pressed',String(value===-1));$('preview-right').setAttribute('aria-pressed',String(value===1));};
  document.addEventListener('visibilitychange',()=>{if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;}else if(currentScreen==='clothing'&&!frame)frame=requestAnimationFrame(animate);});
  window.addEventListener('pagehide',stop);
  for(const event of ['royale-clothing-updated','royale-clothing-context-updated'])window.addEventListener(event,update);
  return {
    blocked:()=>controller.busy||dialog.open,
    back(){if(controller.busy)return;if(dialog.open){cancel();return;}hooks.back();},
    saved(){const info=hooks.saved();saved.textContent=info?.updatedAt?'Saved Slot '+(info.slot+1)+' · '+new Date(info.updatedAt).toLocaleTimeString():'Slot '+((info?.slot??0)+1)+' · Not saved yet';},
    async screen(next){
      currentScreen=next;page.hidden=next!=='clothing';document.body.dataset.screen=next;this.saved();
      if(next==='pause')brand.append(topActions);else actionsHome.after(topActions);
      if(next!=='clothing'){stop();thumbObserver?.disconnect();if(dialog.open&&!controller.busy){controller.cancel();}return;}
      look=structuredClone(hooks.hero());frame||=requestAnimationFrame(animate);$('store-back').focus();
      try{
        if(!catalog.length){catalog=(await clothingRuntime.catalog()).data.sets;for(const name of [...new Set(catalog.map(s=>s.collection))]){const option=element('option',name);option.value=name;$('store-filter').append(option);}}
        if(currentScreen!=='clothing')return;renderCards();
        const chosen=controller.selected||catalog.find(s=>s.id===selectedOutfit(hooks.status()?.cosmetics)?.id)||catalog[0];
        if(chosen)await select(chosen);
      }catch(error){controller.message='Clothing Store unavailable: '+error.message;update();}
    }
  };
}
