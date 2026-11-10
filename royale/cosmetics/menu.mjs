import {clothingRuntime} from './runtime.mjs';
import {applyClothingAction} from './game-adapter.mjs';
import {cosmeticTransaction,saleReady,CLOTHING_SLOTS} from './state.mjs';
import {drawHero} from '../hero-art.mjs';
import {previewHero} from '../hero-rig.mjs';
const names={headwear:'Headwear',top:'Tops',bottom:'Bottoms',fullbody:'Full outfits',footwear:'Footwear',accessory:'Accessories',cape:'Capes'};
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const button=(text,fn,disabled=false)=>{const b=el('button',text,'secondary');b.type='button';b.onclick=fn;b.disabled=disabled;return b;};
const accessories=new Set(['headwear','accessory','cape']);

// Mounted independently for each player's Tree panel. Previewing never changes
// ownership, equipped armor, coins, or the save. Only confirmed actions reach
// the caller's durable transaction and account-specific acknowledgement queue.
export class ClothingMenu {
 constructor(root,{getGame,transaction,onChange=()=>{},runtime=clothingRuntime}){
  Object.assign(this,{root,getGame,transaction,onChange,runtime});root.classList.add('clothing-menu');this.mode='store';this.view='front';this.category='set';this.selected=null;this.layers=[];this.serial=0;this.busy=false;this.pending=null;
  this.refresh=()=>{if(this.root.isConnected&&!this.root.hidden)this.draw();};
  window.addEventListener('clothing-ready',this.refresh);
 }
 destroy(){this.serial++;window.removeEventListener('clothing-ready',this.refresh);}
 async open(mode='store'){
  this.mode=mode;this.root.hidden=false;this.root.replaceChildren(el('p','Opening your wardrobe…'));const serial=++this.serial;
  try{const {data,index}=await this.runtime.catalog();if(serial!==this.serial)return;this.catalog=data;this.index=index;this.render();}
  catch(e){if(serial!==this.serial)return;this.root.replaceChildren(el('p',e.message),button('Try again',()=>this.open(mode)));}
 }
 title(entry){return entry.category==='set'?entry.name:`${this.index.get(entry.setId)?.name||'Clothing'} · ${names[entry.category]}`;}
 entries(){
  const owned=this.getGame().cosmetics.owned;
  if(this.mode==='owned')return owned.map(id=>this.index.get(id)).filter(Boolean);
  const all=[...this.index.values()];
  if(this.mode==='accessories')return all.filter(e=>accessories.has(e.category));
  return all.filter(e=>e.category===this.category);
 }
 draw(){
  if(!this.canvas)return;const c=this.canvas.getContext('2d'),g=this.getGame();
  c.clearRect(0,0,360,420);c.fillStyle='#8cca9122';c.beginPath();c.ellipse(180,386,72,10,0,0,Math.PI*2);c.fill();
  drawHero(c,180,382,g.look,previewHero('idle',0),0,2.85,{view:this.view,outfit:g.visualOutfit(),clothing:g.cosmetics.visible?this.layers:[]});
 }
 async preview(entry,tryOn=true){
  const serial=++this.serial;this.selected=entry?.id;this.layers=[];this.draw();this.detail.replaceChildren();
  if(!entry)return;
  const g=this.getGame(),parts=entry.category==='set'?entry.pieces:[entry],ids=parts.map(p=>p.id),allOwned=ids.every(id=>g.cosmetics.owned.includes(id));
  this.detail.append(el('h3',this.title(entry)),el('p','Appearance only. Your armor and power bonuses stay active.'));
  const status=el('p','Loading preview…');status.setAttribute('role','status');this.detail.append(status);
  // Preview selected pieces together with the player's other worn clothing.
  const equipped={...g.cosmetics.equipped};
  if(tryOn)for(const p of parts){if(p.category==='fullbody'){delete equipped.top;delete equipped.bottom;}if(['top','bottom'].includes(p.category))delete equipped.fullbody;equipped[p.category]=p.id;}
  try{const layers=await this.runtime.loadIds(Object.values(equipped),{review:true});if(serial!==this.serial)return;this.layers=layers;status.textContent=entry.availability==='released'?'Preview ready.':'Coming soon · preview the approved design.';this.draw();}
  catch(e){if(serial!==this.serial)return;status.textContent=parts.some(p=>!p.assetManifest)?'This design is coming soon.':e.message;return;}
  if(allOwned){
   this.detail.append(button('Wear '+(entry.category==='set'?'set':'piece'),()=>this.change({type:'equip',id:entry.id}),this.busy));
   if(entry.category!=='set'&&g.cosmetics.equipped[entry.category]===entry.id)this.detail.append(button('Remove piece',()=>this.change({type:'unequip',slot:entry.category}),this.busy));
  }else if(saleReady(entry)){
   const quote=cosmeticTransaction({state:g.cosmetics,coins:g.hero.coins,index:this.index,operation:{type:'purchase',id:entry.id,confirmed:true,revision:g.cosmetics.revision},safe:true,atWardrobe:true});
   this.detail.append(button(quote.ok?`Review purchase · ${quote.debit} coins`:quote.error,()=>this.review(entry,quote),!quote.ok||this.busy));
  }
  if(entry.category==='set'){
   this.detail.append(el('h4','Individual pieces'));
   for(const p of parts)this.detail.append(button(names[p.category],()=>this.preview(this.index.get(p.id)),this.busy));
  }
 }
 review(entry,quote){
  const revision=this.getGame().cosmetics.revision;this.confirm.replaceChildren();this.confirm.hidden=false;
  this.confirm.append(el('h3','Buy this clothing?'),el('p',`${this.title(entry)} · ${quote.debit} coins. You keep every piece you buy. Clothing uses no equipment slots.`),
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
  const head=el('header',undefined,'clothing-heading');head.append(el('h3',this.mode==='owned'?'My Clothing':this.mode==='accessories'?'Accessories':'Clothing Store'),el('span',`${g.hero.coins.toLocaleString()} coins`));root.append(head);
  root.append(el('p','Cosmetic clothing changes your look. Your equipped armor stays effective.'));
  const toolbar=el('div',undefined,'clothing-toolbar');root.append(toolbar);
  if(this.mode==='store'){
   const label=el('label','Browse ','field'),select=el('select');select.setAttribute('aria-label','Clothing category');
   for(const [id,name] of [['set','Complete sets'],...Object.entries(names)])select.append(new Option(name,id));select.value=this.category;select.onchange=()=>{this.category=select.value;this.selected=null;this.render();};label.append(select);toolbar.append(label);
  }
  const visibility=button(g.cosmetics.visible?'Hide clothing':'Show clothing',()=>this.change({type:'visible',value:!g.cosmetics.visible}),this.busy||!g.cosmetics.owned.length);toolbar.append(visibility);
  this.note=el('p',undefined,'clothing-status');this.note.setAttribute('role','status');root.append(this.note);
  const layout=el('div',undefined,'clothing-layout'),preview=el('aside',undefined,'clothing-preview'),views=el('nav');views.setAttribute('aria-label','Clothing preview view');
  for(const [view,label]of [['front','Front'],['right','Right'],['back','Back'],['left','Left']]){const b=button(label,()=>{this.view=view;views.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));this.draw();});b.setAttribute('aria-pressed',String(view===this.view));views.append(b);}
  this.canvas=el('canvas');this.canvas.width=360;this.canvas.height=420;this.canvas.setAttribute('aria-label',`Clothing preview of ${g.look.name}`);preview.append(views,this.canvas,el('p','Preview only. Select Wear to change your clothing.'));
  const main=el('div'),list=el('div',undefined,'clothing-list');list.setAttribute('aria-label',this.mode==='owned'?'Owned clothing':'Clothing catalog');
  const entries=this.entries();for(const entry of entries){const b=button(this.title(entry),()=>this.preview(entry));b.classList.add('clothing-card');const owned=entry.category==='set'?entry.pieces.every(p=>g.cosmetics.owned.includes(p.id)):g.cosmetics.owned.includes(entry.id);b.append(el('small',owned?'Owned':saleReady(entry)?`${entry.coinPrice} coins`:'Coming soon'));list.append(b);}
  if(!entries.length)list.append(el('p','Clothing you buy will appear here.'));
  this.detail=el('section',undefined,'clothing-detail');this.detail.setAttribute('aria-label','Clothing details');main.append(list,this.detail);layout.append(preview,main);root.append(layout);
  if(this.mode==='owned')for(const slot of CLOTHING_SLOTS)if(g.cosmetics.equipped[slot])root.append(button('Remove '+names[slot],()=>this.change({type:'unequip',slot})));
  this.confirm=el('section',undefined,'upgrade-confirm');this.confirm.setAttribute('aria-label','Confirm clothing purchase');this.confirm.hidden=true;root.append(this.confirm);
  const entry=entries.find(e=>e.id===this.selected)||entries[0];void this.preview(entry,this.mode!=='owned');
 }
}
