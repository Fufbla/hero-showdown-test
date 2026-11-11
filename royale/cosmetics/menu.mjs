import {clothingRuntime} from './runtime.mjs';
import {applyClothingAction} from './game-adapter.mjs';
import {saleReady,ownsOutfit,selectedOutfit,quoteOutfit} from './state.mjs';
import {drawOutfitPreview} from './preview.mjs';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const button=(text,fn,disabled=false)=>{const b=el('button',text,'secondary');b.type='button';b.onclick=fn;b.disabled=disabled;return b;};

// Mounted independently for each player's Tree panel. Previewing never changes
// ownership, equipped armor, coins, or the save. Only confirmed actions reach
// the caller's durable transaction and account-specific acknowledgement queue.
export class ClothingMenu {
 constructor(root,{getGame,transaction,onChange=()=>{},runtime=clothingRuntime}){
  Object.assign(this,{root,getGame,transaction,onChange,runtime});root.classList.add('clothing-menu');this.mode='store';this.view='front';this.collection='all';this.selected=null;this.layers=[];this.serial=0;this.busy=false;this.pending=null;
  this.refresh=()=>{if(this.root.isConnected&&!this.root.hidden)this.draw();};
  window.addEventListener('clothing-ready',this.refresh);
 }
 destroy(){this.serial++;window.removeEventListener('clothing-ready',this.refresh);}
 async open(mode='store'){
  this.mode=mode==='owned'?'owned':'store';this.root.hidden=false;this.root.replaceChildren(el('p','Opening your wardrobe…'));const serial=++this.serial;
  try{const {data,index}=await this.runtime.catalog();if(serial!==this.serial)return;this.catalog=data;this.index=index;this.render();}
  catch(e){if(serial!==this.serial)return;this.root.replaceChildren(el('p',e.message),button('Try again',()=>this.open(mode)));}
 }
 title(entry){return entry.name;}
 entries(){
  const state=this.getGame().cosmetics;
  return this.catalog.sets.filter(set=>(this.mode!=='owned'||ownsOutfit(state,set))&&
   (this.mode==='owned'||this.collection==='all'||set.collection===this.collection));
 }
 draw(){
  if(!this.canvas)return;
  drawOutfitPreview(this.canvas,{look:this.getGame().look,layers:this.layers,view:this.view,scale:2.85});
 }
 async preview(entry){
  const serial=++this.serial;this.selected=entry?.id;this.layers=[];this.draw();this.detail.replaceChildren();
  if(!entry||entry.category!=='set')return;
  const g=this.getGame(),allOwned=ownsOutfit(g.cosmetics,entry);
  this.detail.append(el('h3',this.title(entry)),el('p','Appearance only. Your armor and power bonuses stay active.'));
  const status=el('p','Loading preview…');status.setAttribute('role','status');this.detail.append(status);
  try{const layers=await this.runtime.loadOutfit(entry,{review:true});if(serial!==this.serial)return;this.layers=layers;status.textContent=entry.availability==='released'?'Complete outfit preview.':'Coming soon · preview the complete design.';this.draw();}
  catch(e){if(serial!==this.serial)return;status.textContent=e.message;return;}
  if(allOwned){
   const wearing=g.cosmetics.visible&&selectedOutfit(g.cosmetics)?.id===entry.id;
   this.detail.append(wearing?button('Remove outfit',()=>this.change({type:'unequip'}),this.busy):
    button('Wear complete outfit',()=>this.change({type:'equip',id:entry.id}),this.busy));
  }else if(saleReady(entry)){
   const quote=quoteOutfit(g.cosmetics,entry),affordable=quote.ok&&g.hero.coins>=quote.debit;
   this.detail.append(button(quote.ok?`Buy complete outfit · ${quote.debit} coins`:quote.error,()=>this.review(entry,quote),!affordable||this.busy));
   if(quote.ok&&quote.debit<entry.coinPrice)this.detail.append(el('p',`Previous purchases credited · ${entry.coinPrice-quote.debit} coins`));
   if(quote.ok&&!affordable)this.detail.append(el('p','Not enough coins.'));
  }
 }
 review(entry,quote){
  const revision=this.getGame().cosmetics.revision;this.confirm.replaceChildren();this.confirm.hidden=false;
  this.confirm.append(el('h3','Buy this complete outfit?'),el('p',`${this.title(entry)} · ${quote.debit} coins. This outfit belongs permanently to this hero. Clothing uses no equipment slots.`),
   button('Cancel',()=>{this.confirm.hidden=true;}),button('Confirm purchase',()=>this.change({type:'purchase',id:entry.id,confirmed:true,revision}),this.busy));
  this.confirm.querySelector('button').focus();
 }
 async change(operation){
  if(this.busy)return;this.busy=true;
  const op={revision:this.getGame().cosmetics.revision,...operation};
  const buttons=[...this.root.querySelectorAll('button,select')].map(b=>[b,b.disabled]);buttons.forEach(([b])=>b.disabled=true);
  this.note.textContent='Saving your wardrobe…';
  try{
   // Retry the pending snapshot, not the debit. The caller keeps it until the
   // exact account/slot acknowledgement succeeds.
   const result=await this.transaction(()=>applyClothingAction(this.getGame(),this.index,op));
   this.pending=result.pending?op:null;
   if(!result.ok){this.note.textContent=result.error||'Your wardrobe could not be saved.';if(result.pending){this.note.append(button('Retry save',()=>this.change(op)));return;}}
   else{this.busy=false;this.onChange();this.render();this.note.textContent='Wardrobe saved.';}
  }catch(e){this.note.textContent=e.message;}
  finally{this.busy=false;if(!this.pending)for(const [b,disabled] of buttons)if(b.isConnected)b.disabled=disabled;}
 }
 render(){
  const g=this.getGame(),root=this.root;this.serial++;root.replaceChildren();
  const head=el('header',undefined,'clothing-heading');head.append(el('h3',this.mode==='owned'?'My Outfits':'Clothing Store'),el('span',`${g.hero.coins.toLocaleString()} coins`));root.append(head);
  root.append(el('p','Cosmetic clothing changes your look. Your equipped armor stays effective.'));
  const toolbar=el('div',undefined,'clothing-toolbar');root.append(toolbar);
  if(this.mode==='store'){
   const label=el('label','Collection ','field'),select=el('select');select.setAttribute('aria-label','Outfit collection');
   for(const [id,name] of [['all','All outfits'],...[...new Set(this.catalog.sets.map(set=>set.collection))].map(name=>[name,name])])select.append(new Option(name,id));select.value=this.collection;select.onchange=()=>{this.collection=select.value;this.selected=null;this.render();};label.append(select);toolbar.append(label);
  }
  this.note=el('p',undefined,'clothing-status');this.note.setAttribute('role','status');root.append(this.note);
  const layout=el('div',undefined,'clothing-layout'),preview=el('aside',undefined,'clothing-preview'),views=el('nav');views.setAttribute('aria-label','Clothing preview view');
  for(const [view,label]of [['front','Front'],['right','Right'],['back','Back'],['left','Left']]){const b=button(label,()=>{this.view=view;views.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));this.draw();});b.setAttribute('aria-pressed',String(view===this.view));views.append(b);}
  this.canvas=el('canvas');this.canvas.width=360;this.canvas.height=420;this.canvas.setAttribute('aria-label',`Clothing preview of ${g.look.name}`);preview.append(views,this.canvas,el('p','Preview only. Select Wear to change your clothing.'));
  const main=el('div'),list=el('div',undefined,'clothing-list');list.setAttribute('aria-label',this.mode==='owned'?'Owned clothing':'Clothing catalog');
  const entries=this.entries();for(const entry of entries){const b=button(this.title(entry),()=>this.preview(entry));b.classList.add('clothing-card');const owned=ownsOutfit(g.cosmetics,entry);b.append(el('small',owned?'Owned · complete outfit':saleReady(entry)?`${entry.coinPrice} coins`:'Coming soon'));list.append(b);}
  if(!entries.length)list.append(el('p','Clothing you buy will appear here.'));
  this.detail=el('section',undefined,'clothing-detail');this.detail.setAttribute('aria-label','Clothing details');main.append(list,this.detail);layout.append(preview,main);root.append(layout);
  this.confirm=el('section',undefined,'upgrade-confirm');this.confirm.setAttribute('aria-label','Confirm clothing purchase');this.confirm.hidden=true;root.append(this.confirm);
  const entry=entries.find(e=>e.id===this.selected)||entries[0];void this.preview(entry);
 }
}
