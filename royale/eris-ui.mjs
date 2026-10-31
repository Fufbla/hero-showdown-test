import { COSTUME_CATALOG, COSTUME_SETS, COSTUME_PARTS, STAT_KEYS, STAT_LABELS, formatStat, resaleValue } from './costume-catalog.mjs';
import { EQUIPMENT_NAMES, itemDefinition, equipmentBonuses, equipmentOutfit } from './equipment.mjs';
import { equipmentStats, powerStats } from './powers.mjs';
import { drawHero } from './hero-art.mjs';
import { previewHero } from './hero-rig.mjs';
import { formatClock } from './progression.mjs';
const $=id=>document.getElementById(id);
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const button=(text,fn,cls='secondary')=>{const b=el('button',text,cls);b.type='button';b.onclick=fn;return b;};
export function drawEquipmentPreview(canvas,g,inventory=g.inventory,view='front'){
  const c=canvas.getContext('2d');c.clearRect(0,0,360,420);c.fillStyle='#8cca9133';c.beginPath();c.ellipse(180,382,75,11,0,0,Math.PI*2);c.fill();
  drawHero(c,180,380,g.look,previewHero('idle',0),0,2.85,{view,outfit:equipmentOutfit(inventory,g.outfit)});canvas.setAttribute('aria-label',`${view} full-body costume preview of ${g.look.name}`);
}
export function appliedEquipment(g,inventory,level=g.hero.level){const stats=equipmentStats(equipmentBonuses(inventory,level)),speed=g.powers.data.levels.speed?powerStats('speed',g.powers.data.levels.speed):{attackBonus:0,runBonus:0};stats.attackSpeed=Math.min(stats.attackSpeed,Math.max(0,.5-speed.attackBonus));stats.moveSpeed=Math.min(stats.moveSpeed,Math.max(0,.6-speed.runBonus));return stats;}
export function statComparison(before,after){
  const table=el('table',undefined,'gear-stats'),head=el('tr');for(const t of ['Applied bonus','Equipped','Preview'])head.append(el('th',t));table.append(head);
  for(const k of STAT_KEYS){const row=el('tr');row.append(el('th',STAT_LABELS[k]),el('td',`+${formatStat(k,before[k]||0)}`),el('td',`+${formatStat(k,after[k]||0)}`));table.append(row);}return table;
}
function withPreview(g,defs){
  const inv=structuredClone(g.inventory);
  for(const [i,d] of defs.entries()){const uid=`preview-${i}`;inv.items.push({uid,catalogId:d.id});inv.equipped[d.part]=uid;if(d.part==='helmet')delete inv.equipped.mask;if(d.part==='chest')delete inv.equipped.suit;}
  return inv;
}
export class ErisMenu{
  constructor(getGame,{powerMenu,transaction,say,appearance,leave}){
    Object.assign(this,{getGame,powerMenu,transaction,say,appearance,leave});this.panel='home';this.mode='buy';this.category='sets';this.selected={setId:'shore-ordinary'};this.view='front';this.previewInventory=null;this.confirm=null;
    for(const b of document.querySelectorAll('[data-eris]'))b.onclick=()=>this.open(b.dataset.eris);
    $('eris-appearance').onclick=appearance;$('close-tree').onclick=leave;
    for(const view of ['front','back'])$(`gear-view-${view}`).onclick=()=>{this.view=view;this.draw();};
    for(const b of document.querySelectorAll('[data-wardrobe]'))b.onclick=()=>{this.mode=b.dataset.wardrobe;this.selected=null;this.wardrobe();};
    $('shop-category').onchange=()=>{this.category=$('shop-category').value;this.selected=null;this.wardrobe();};
  }
  open(panel='home'){
    if(panel==='appearance'){this.appearance();return;}
    this.panel=panel;this.confirm=null;
    for(const n of document.querySelectorAll('[data-eris-panel]'))n.hidden=n.dataset.erisPanel!==panel;
    for(const b of document.querySelectorAll('[data-eris]'))b.setAttribute('aria-pressed',String(b.dataset.eris===panel));
    this.update();if(panel==='powers')this.powerMenu.open();if(panel==='wardrobe')this.wardrobe();if(panel==='roots')this.roots();
    if(panel==='home')drawEquipmentPreview($('eris-hero'),this.getGame());
  }
  update(){const g=this.getGame();$('eris-coins').textContent=g.hero.coins.toLocaleString();$('tree-points').textContent=g.powers.data.points;$('eris-capacity').textContent=`${g.inventory.items.length}/7 equipment`;$('eris-clock').textContent=`Adventure clock · ${formatClock(g.clock())}`;const r=g.sanctuary?.returnLocation;$('eris-return').textContent=r?`Return to ${g.getRegion().name} · board ${r.board+1}`:'Your adventure is waiting.';}
  draw(){const g=this.getGame();drawEquipmentPreview($('gear-preview'),g,this.previewInventory||g.inventory,this.view);for(const v of ['front','back'])$(`gear-view-${v}`).setAttribute('aria-pressed',String(v===this.view));}
  wardrobe(){
    const g=this.getGame();this.update();$('shop-confirm').hidden=true;this.confirm=null;
    $('shop-category-wrap').hidden=this.mode!=='buy';$('wardrobe-note').textContent=this.mode==='buy'?'One central shop. Regular outfits only; rare equipment is earned. Every piece has fixed colors.':this.mode==='sell'?'Resale is 25% of original catalog value, rounded down. Legendary equipment can never be sold.':'Seven total spaces, including worn items. Mix pieces freely. Starter colors remain yours.';
    for(const b of document.querySelectorAll('[data-wardrobe]'))b.setAttribute('aria-pressed',String(b.dataset.wardrobe===this.mode));
    const list=$('shop-items');list.replaceChildren();
    let entries;
    if(this.mode==='buy')entries=this.category==='sets'?Object.values(COSTUME_SETS).map(s=>({setId:`${s.id}-ordinary`,name:s.name,level:s.level,color:s.color,accent:s.accent,price:Object.values(COSTUME_CATALOG).filter(d=>d.setId===`${s.id}-ordinary`).reduce((n,d)=>n+d.catalogValue,0)})):Object.values(COSTUME_CATALOG).filter(d=>d.shop&&(this.category==='all'||d.part===this.category)).map(d=>({...d,catalogId:d.id,price:d.catalogValue}));
    else entries=g.inventory.items.map(i=>({...itemDefinition(i),uid:i.uid,catalogId:i.catalogId,price:resaleValue(itemDefinition(i))}));
    const key=e=>e.uid||e.catalogId||e.setId;
    this.selected=entries.find(e=>key(e)===key(this.selected||{}))||entries[0]||null;
    for(const e of entries){
      const locked=g.hero.level<e.level,card=button('',()=>{this.selected=e;this.wardrobe();},'shop-item');card.dataset.catalog=key(e);card.setAttribute('aria-pressed',String(key(e)===key(this.selected||{})));
      const icon=el('span',e.setId&&!e.uid&&!e.catalogId?'✦':e.part==='helmet'?'◉':e.part==='boots'?'⌁':'⬡','shop-icon');icon.style.setProperty('--item-color',e.color);icon.style.color=e.accent;
      const text=el('span');text.append(el('b',e.name),el('small',`${locked?'LOCKED · ':''}LEVEL ${e.level||1} · ${(e.rarity||'ordinary').toUpperCase()}${e.legacy?' · LEGACY':''}`),el('small',this.mode==='owned'?(Object.values(g.inventory.equipped).includes(e.uid)?'Equipped':'In wardrobe'):`${e.price===null?'Not sellable':e.price+' coins'}${e.setId&&!e.catalogId&&!e.uid?' · 3 pieces':''}`));card.append(icon,text);list.append(card);
    }
    if(!entries.length)list.append(el('p','Your starter suit is always available. Buy or earn equipment to fill your wardrobe.','empty-equipment'));
    this.detail();
  }
  detail(){
    const g=this.getGame(),e=this.selected,p=$('shop-detail');p.replaceChildren();this.previewInventory=g.inventory;
    const applied=appliedEquipment(g,g.inventory);$('equipped-bonuses').textContent='Applied equipment · '+(STAT_KEYS.filter(k=>applied[k]).map(k=>`${STAT_LABELS[k]} +${formatStat(k,applied[k])}`).join(' · ')||'No stat bonuses')+` · Natural strength ${10+2*(g.hero.level-1)} · Total running +${formatStat('moveSpeed',g.powers.speed)} · Total attack speed +${formatStat('attackSpeed',g.powers.attackRate-1)}`;
    const appliedDetails=el('details',undefined,'applied-details');appliedDetails.append(el('summary','Current applied bonuses'),el('p',$('equipped-bonuses').textContent));p.append(appliedDetails);
    if(!e){this.draw();return;}
    const defs=e.uid?[itemDefinition(e)]:e.catalogId?[COSTUME_CATALOG[e.catalogId]]:Object.values(COSTUME_CATALOG).filter(d=>d.setId===e.setId);
    this.previewInventory=withPreview(g,defs);this.draw();
    p.append(el('div',`${this.mode==='buy'?'TRY IT ON':'YOUR EQUIPMENT'} · ${defs.length===3?'COMPLETE OUTFIT':EQUIPMENT_NAMES[defs[0].part]}`,'eyebrow'),el('h3',e.name||defs[0].setName));
    p.append(el('p',`Level ${defs[0].level||1} · ${defs[0].rarity} · Fixed colors${defs[0].rarity==='rare'?' · Constant white glow':''}.`));
    p.append(statComparison(appliedEquipment(g,g.inventory),appliedEquipment(g,this.previewInventory,99)));
    p.append(el('p','Helmet 33% · Chest 33% · Boots 34%. A matching set totals 100%; no second set bonus is added. Running +60% and attack speed +50% caps include powers.','set-note'));
    if(this.mode==='buy'){
      const cost=defs.reduce((n,d)=>n+d.catalogValue,0),b=button(`Review purchase · ${cost} coins`,()=>this.reviewBuy(e),'primary');b.id='review-purchase';b.disabled=g.hero.level<defs[0].level||g.hero.coins<cost;p.append(b);
      if(g.hero.level<defs[0].level)p.append(el('p',`Unlocks at hero level ${defs[0].level}. You can inspect and preview it now.`,'shop-warning'));else if(g.hero.coins<cost)p.append(el('p',`You need ${cost-g.hero.coins} more coins.`,'shop-warning'));
    }else if(this.mode==='sell'){
      const q=g.salePreview(e.uid),b=button(q.ok?`Review sale · ${q.value} coins`:'Cannot sell',()=>this.reviewAction('sell',e.uid),'primary');b.id='review-sale';b.disabled=!q.ok;p.append(b);
    }else{
      const equipped=Object.values(g.inventory.equipped).includes(e.uid),b=button(equipped?'Unequip piece':'Equip piece',()=>{const r=this.transaction(()=>g.equipItem(e.uid));if(r.ok)this.wardrobe();},'primary');b.id='equip-piece';b.disabled=g.hero.level<(defs[0].level||1);p.append(b,button('Discard piece',()=>this.reviewAction('discard',e.uid),'text-button'));
    }
  }
  reviewBuy(selection){
    const g=this.getGame(),s=$('shop-confirm');s.replaceChildren();s.hidden=false;const defs=selection.catalogId?[COSTUME_CATALOG[selection.catalogId]]:Object.values(COSTUME_CATALOG).filter(d=>d.setId===selection.setId),needed=Math.max(0,g.inventory.items.length+defs.length-7),chosen=new Set(),revision=g.economy.revision;
    s.append(el('h3','Confirm costume purchase'),el('p',`${defs.map(d=>d.name).join(' + ')} · ${defs.reduce((n,d)=>n+d.catalogValue,0)} coins. ${needed?`Choose ${needed} owned items to permanently discard below.`:'All pieces fit in your inventory.'}`));
    if(needed)for(const item of g.inventory.items){const def=itemDefinition(item),label=el('label',undefined,'discard-choice'),check=el('input');check.type='checkbox';check.value=item.uid;check.onchange=()=>{check.checked?chosen.add(item.uid):chosen.delete(item.uid);update();};label.append(check,el('span',`${def.name}${def.rarity==='rare'?' · RARE — cannot recover':''}${def.rarity==='legendary'?' · LEGENDARY — permanently lost, cannot earn again':''} · ${Object.entries(def.stats).filter(([,v])=>v).map(([k,v])=>`${STAT_LABELS[k]} +${formatStat(k,v)}`).join(', ')}`));s.append(label);}
    const status=el('p'),yes=button('Confirm purchase',()=>{const r=this.transaction(()=>g.buyCostume(selection,{discardUids:[...chosen],confirmed:true,revision}));if(r.ok){this.say('Costume purchased. Open Owned to equip each piece.');this.wardrobe();}else status.textContent=r.error;},'primary'),no=button('Cancel purchase',()=>{s.hidden=true;},'secondary');yes.id='confirm-purchase';no.id='cancel-purchase';s.append(status,yes,no);
    const update=()=>{const q=g.costumePreview(selection,[...chosen]);yes.disabled=!q.ok;status.textContent=q.ok?`After purchase: ${g.hero.coins-q.cost} coins · ${g.inventory.items.length-chosen.size+defs.length}/7 equipment.${needed?' Selected items are permanently discarded.':''}`:q.error;};update();s.scrollIntoView({block:'nearest'});no.focus();
  }
  reviewAction(kind,uid){
    const g=this.getGame(),item=g.inventory.items.find(i=>i.uid===uid),def=itemDefinition(item),revision=g.economy.revision,s=$('shop-confirm');s.replaceChildren();s.hidden=false;
    s.append(el('h3',kind==='sell'?'Sell this equipment?':'Permanently discard this equipment?'),el('p',`${def.name} · ${kind==='sell'?`${resaleValue(def)} coins, exactly 25% of catalog value.`:'Cannot be recovered.'}${def.rarity==='rare'?' This is RARE equipment.':''}${def.rarity==='legendary'?' LEGENDARY: permanent loss; cannot be earned again.':''}`));
    const status=el('p'),yes=button(kind==='sell'?'Confirm sale':'Confirm discard',()=>{const r=this.transaction(()=>kind==='sell'?g.sellItem(uid,{confirmed:true,revision}):revision===g.economy.revision&&g.discardItem(uid,true));if(r.ok){this.selected=null;this.wardrobe();this.say(kind==='sell'?'Equipment sold. Coins credited once.':'Equipment permanently discarded.');}else status.textContent=r.error;},'primary danger'),no=button('Keep equipment',()=>{s.hidden=true;});yes.id=kind==='sell'?'confirm-sale':'confirm-shop-discard';no.id='cancel-shop-action';s.append(status,yes,no);s.scrollIntoView({block:'nearest'});no.focus();
  }
  roots(){
    const g=this.getGame(),s=$('root-shop');s.replaceChildren();s.append(el('div','RESTOCK FOR THE ROAD','eyebrow'),el('h3','Health Roots'),el('p',`${g.healthRoots}/4 carried · ${4-g.healthRoots} spaces available. Each restores 25% maximum HP, with no cooldown. Separate from equipment.`));
    const label=el('label','Quantity','field'),quantity=el('input');quantity.id='root-quantity';quantity.type='number';quantity.min=1;quantity.max=Math.max(1,4-g.healthRoots);quantity.value=1;quantity.inputMode='numeric';label.append(quantity);s.append(label);
    const price=el('p'),review=button('Review Health Root purchase',()=>{const count=Number(quantity.value),q=g.rootPreview(count);if(!q.ok)return;confirm.hidden=false;note.textContent=`Buy ${count} Health Roots for ${q.cost} coins? You will carry ${g.healthRoots+count}/4.`;pending=q;},'primary');review.id='buy-root';
    const confirm=el('div',undefined,'upgrade-confirm');confirm.hidden=true;const note=el('p');let pending=null;
    const yes=button('Confirm Health Roots',()=>{if(!pending||pending.revision!==g.economy.revision)return;const q=pending;pending=null;const r=this.transaction(()=>g.buyHealthRoot(q.count));if(r.ok){this.roots();this.update();this.say(`${q.count} Health Roots purchased.`);}},'primary');yes.id='confirm-roots';confirm.append(note,yes,button('Cancel',()=>{pending=null;confirm.hidden=true;}));
    const update=()=>{pending=null;confirm.hidden=true;const q=g.rootPreview(Number(quantity.value));review.disabled=!q.ok;price.textContent=q.ok?`${q.cost} coins · balance after purchase ${g.hero.coins-q.cost}`:q.error;};quantity.oninput=update;update();s.append(price,review,confirm);
    const heal=button('Use one Health Root now',()=>{const r=this.transaction(()=>g.useHealthRoot());if(r.ok){this.roots();this.update();}},'secondary');heal.id='eris-heal';heal.disabled=!g.healthRoots||g.hero.hp>=g.hero.maxHp;s.append(heal);
  }
}
