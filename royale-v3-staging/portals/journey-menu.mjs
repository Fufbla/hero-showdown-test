// Staging economy UI v1.
import {travelQuote} from '../gameplay/portal-layout.mjs?v=phase-portals-1';
import {worldPortalPreview,pulsePortal} from './runtime.mjs?v=economy-1';
import {pickupForGame} from '../../royale/multiplayer/game-session.mjs';
import {itemIcon} from '../../royale/item-art.mjs';
import {pickupLoot} from '../../royale/world-loot.mjs';
import { drawEquipmentPreview, statComparison } from '../../royale/eris-ui.mjs';
import { STAT_KEYS, STAT_LABELS, formatStat } from '../../royale/costume-catalog.mjs';
import { WORLD_REGIONS } from '../../royale/world.mjs';
import { EQUIPMENT_NAMES, itemDefinition, armorOutfitForItem, equipmentItemActive } from '../../royale/equipment.mjs';
import { LOOT, worldClock, formatClock } from '../../royale/progression.mjs';
const $=id=>document.getElementById(id);
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
export function statsText(def){return STAT_KEYS.filter(k=>def.stats[k]).map(k=>`${STAT_LABELS[k]} +${formatStat(k,def.stats[k])}`).join(' · ');}
export class JourneyMenu {
  constructor(getGame,persist,say,resume,transaction=null,travelCommit=null){this.travelCommit=travelCommit;this.transaction=transaction;this.getGame=getGame;this.persist=persist;this.say=say;this.resume=resume;this.confirmation=null;}
  async commit(action){if(this.transaction)return (await this.transaction(action)).ok;const ok=await action();if(ok)this.persist();return !!ok;}
  preview(item){
    if(!equipmentItemActive(item))return;
    const g=this.getGame(),def=itemDefinition(item),panel=el('section',undefined,'equipment-preview'),canvas=el('canvas');canvas.width=360;canvas.height=420;
    const inv=structuredClone(g.inventory);if(!inv.items.some(i=>i.uid===item.uid))inv.items.push(item);
    const outfit=armorOutfitForItem(inv,item.uid,99);
    inv.equipped=outfit.ok?Object.fromEntries(outfit.items.map(i=>[itemDefinition(i).part,i.uid])):{};
    const body=el('div');body.append(el('h3',outfit.name||def.name),el('p',`${def.rarity} · Level ${def.level||1} · Matching armor · Stat bonuses only`),el('p',outfit.ok?statsText({stats:outfit.stats}):outfit.error));
    for(const view of ['front','back']){const b=el('button',view==='front'?'Front preview':'Back preview','secondary');b.onclick=()=>drawEquipmentPreview(canvas,g,inv,view);body.append(b);}
    panel.append(canvas,body);$('equipment-list').prepend(panel);drawEquipmentPreview(canvas,g,inv);panel.scrollIntoView({block:'nearest'});
  }
  shop(){
    const g=this.getGame(),section=$('root-shop');section.replaceChildren();
    const text=el('div');text.append(el('strong','Health Roots'),el('p',`Restore 25% HP anywhere. ${g.healthRoots} / 10 carried · 50 coins each.`));
    const button=el('button','Buy Health Root · 50 ◈','secondary');button.id='buy-root';button.disabled=!g.canSave()||g.healthRoots>=10||g.hero.coins<50;
    button.onclick=async()=>{if(await g.buyHealthRoot()){this.persist();this.shop();this.say('One Health Root added.');}};section.append(text,button);
  }
  updateClock(){const g=this.getGame();for(const region of WORLD_REGIONS){const n=document.querySelector(`[data-region="${region.id}"] small`);if(n)n.textContent=`RECOMMENDED ${region.levels.join('–')} · ${formatClock(worldClock(g.world.clockReference,g.now(),region.id))}`;}}
  map(source=this.source||'map'){
    this.source=source;
    const g=this.getGame(),list=$('region-cards');list.replaceChildren();worldPortalPreview(list);if(source==='portal')pulsePortal();
    $('map-note').hidden=false;$('map-note').textContent='Fast travel is paid on every trip, including returns. Choose one of the seven phases. Fast travel always arrives at the beginning. Each phase has four portals: entrance and fast travel at the start, boss entrance and exit at the end.';
    for(const region of WORLD_REGIONS){
      const current=region.id===g.regionId,card=el('article',undefined,'region-card');card.style.setProperty('--region-color',region.sky[0]);card.dataset.region=region.id;if(current)card.setAttribute('aria-current','location');
      const art=el('div',undefined,`region-art ${region.theme}`);art.append(el('span',String(region.id).padStart(2,'0'),'region-number'),el('b',['','≋','♧','▥','◇','❧','✧','✦'][region.id]));card.append(art);
      const body=el('div',undefined,'region-copy');body.append(el('h3',region.name),el('small',`LV ${region.levels.join('–')}`));
      const board=0;
      const destination={region:region.id,board},quote=travelQuote(g,destination),here=current&&!g.arenaScene&&g.board===board;
        const button=el('button',here?'Current location':quote?`${region.name} · ${quote.cost.toLocaleString()} Coins`:'Locked','secondary');
        button.disabled=here||!quote||!g.canTravel();button.dataset.travel=region.id;button.dataset.board=board;
        button.onclick=()=>this.confirmTravel(destination);body.append(button);
      card.append(body);list.append(card);
    }
  }
  cancelTravel(){if(!this.travelDialog)return false;if(!this.travelBusy&&!this.travelPending)this.travelDialog.close();return true;}
  confirmTravel(destination){
    if(this.travelDialog)return;
    const g=this.getGame(),quote=travelQuote(g,destination);if(!quote){this.say('This destination is unavailable.');return;}const cost=quote.cost,price=cost.toLocaleString(),revision=g.economy.revision,origin=document.activeElement,d=el('dialog',undefined,'sale-dialog');d.id='fast-travel-dialog';
    const title=el('h3',`Fast Travel — ${price} Coins`);title.id='fast-travel-title';d.setAttribute('aria-labelledby',title.id);
    const status=el('p',g.hero.coins<cost?`Not enough coins! This trip costs ${price} coins. Entrance and exit portals remain free.`:`Teleport to this destination for ${price} coins? Return trips are charged separately.`);status.setAttribute('role','status');
    const yes=el('button',`Travel — ${price} Coins`,'primary'),no=el('button','Cancel','secondary');yes.id='confirm-fast-travel';no.id='cancel-fast-travel';yes.disabled=g.hero.coins<cost||!g.canTravel();
    no.onclick=()=>this.cancelTravel();yes.onclick=async()=>{
      if(this.travelBusy)return;this.travelBusy=true;yes.disabled=true;no.disabled=true;
      try{const result=this.travelCommit?await this.travelCommit(()=>g.fastTravel(destination,revision)):{ok:await this.commit(()=>g.fastTravel(destination,revision))};this.travelPending=!!result.pending;if(result.ok){d.close();this.resume();this.say(`Fast travel complete · ${price} coins paid.`);}else{status.textContent=result.error||'Travel was not completed. No fee was charged. Cancel and review the destination again.';}}
      catch(error){status.textContent=error.message;}
      finally{this.travelBusy=false;no.disabled=!!this.travelPending;if(this.travelPending){yes.textContent='Retry travel save';yes.disabled=false;}}
    };
    d.addEventListener('cancel',e=>{e.preventDefault();this.cancelTravel();});d.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();this.cancelTravel();}});
    d.addEventListener('close',()=>{this.travelDialog=null;this.travelPending=false;d.remove();if(origin?.isConnected)origin.focus();});d.append(title,status,no,yes);document.body.append(d);this.travelDialog=d;d.showModal();no.focus();
  }
  inventory(){
    const g=this.getGame();this.confirmation=null;$('equipment-confirm').hidden=true;
    $('inventory-summary').textContent=`${g.inventory.items.length} / 20 carried · Equipped and unequipped items share this limit. ${g.healthRoots} / 10 Health Roots stored separately. Armor grants stat bonuses only and never changes your appearance.`;
    const list=$('equipment-list');list.replaceChildren();
    if(!g.inventory.items.length)list.append(el('p','Your customized appearance is always yours. Monsters award coins only. Buy armor at the Tree of Eris; Legendary bosses retain their unique equipment.','empty-equipment'));
    const ground=g.loot.find(o=>o.id===this.groundReward),pending=ground?.item||g.inventory.pending[0],reward=$('pending-reward');reward.replaceChildren();reward.hidden=!pending;
    if(pending){const def=itemDefinition(pending);reward.append(el('div',g.inventory.items.length>=20?'INVENTORY FULL · CHOOSE YOUR REWARD':'CHOOSE YOUR REWARD','eyebrow'),el('h3',def.name),el('p',statsText(def)),el('p',`Stat bonuses only; your appearance stays the same. Choose a carried item below to compare and replace, or leave this item.`));
      if(g.inventory.items.length<20){const keep=el('button','Keep this equipment','primary');keep.id='accept-reward';keep.disabled=!g.canSave();keep.onclick=async()=>{if(await this.commit(()=>ground?pickupForGame(g,ground.id):g.acceptReward()))this.inventory();};reward.append(keep);}
      const decline=el('button',ground?'Leave orb on the ground':'Discard new reward','secondary');decline.id='discard-reward';decline.onclick=()=>{if(ground){this.groundReward=null;this.resume();}else this.confirm(null,true);};reward.append(decline);}
    for(const item of g.inventory.items.filter(equipmentItemActive)){
      const def=itemDefinition(item),equipped=g.inventory.equipped[def.part]===item.uid,card=el('article',undefined,`equipment-card ${def.rarity}`);card.dataset.item=item.uid;
      card.append(itemIcon(def));
      const body=el('div');body.append(el('small',`${def.rarity.toUpperCase()} · ${EQUIPMENT_NAMES[def.part]}${equipped?' · EQUIPPED':''}`),el('h3',def.name),el('p',statsText(def)));card.append(body);
      const actions=el('div',undefined,'equipment-actions');
      if(pending){const compare=el('button','Compare & replace','secondary');compare.onclick=()=>this.confirm(item.uid,true);actions.append(compare);}
      else{
        const outfit=armorOutfitForItem(g.inventory,item.uid,g.hero.level),changingMerge=def.rarity==='legendary'||Object.values(g.inventory.equipped).some(uid=>itemDefinition(g.inventory.items.find(i=>i.uid===uid))?.rarity==='legendary');
        const wear=el('button',equipped?'✓':'+','wardrobe-quick-equip');wear.setAttribute('aria-label',equipped?`${outfit.name||def.name} equipped`:`Equip matching ${outfit.name||def.name} outfit`);wear.title=equipped?'Equipped':outfit.ok?'Equip matching outfit':outfit.error;wear.disabled=equipped||!g.canSave()||!outfit.ok||!g.treeVisit&&changingMerge;wear.onclick=async()=>{if(await this.commit(()=>g.equipItem(item.uid)))this.inventory();};
        if(!outfit.ok)body.append(el('p',outfit.error));
        if(def.rarity==='legendary')body.append(el('p','Equip or change this matching outfit at the Tree of Eris.'));
        const discard=el('button','Discard','text-button');discard.disabled=!g.canSave();discard.onclick=()=>this.confirm(item.uid,false);card.append(wear);actions.append(discard);
      }
      const preview=el('button','Preview','secondary');preview.onclick=()=>this.preview(item);actions.append(preview);card.append(actions);list.append(card);
    }
    $('inventory-close').textContent=ground?'Leave orb · back':pending?'Keep reward pending · back':'Back to pause';
  }
  confirm(uid,pending){
    const g=this.getGame(),section=$('equipment-confirm');section.replaceChildren();section.hidden=false;
    const old=g.inventory.items.find(i=>i.uid===uid),incoming=g.loot.find(o=>o.id===this.groundReward)?.item||g.inventory.pending[0],oldDef=itemDefinition(old),newDef=itemDefinition(incoming);
    section.append(el('h3',uid&&pending?'Replace this equipment?':'Discard this equipment?'));
    if(uid&&pending){const table=el('table'),head=el('tr');head.append(el('th','Stat'),el('th',oldDef.name),el('th',newDef.name));table.append(head);for(const key of STAT_KEYS){const row=el('tr');row.append(el('th',key),el('td',String(oldDef.stats[key])),el('td',String(newDef.stats[key])));table.append(row);}section.append(table);}
    section.append(el('p',`${(uid?oldDef:newDef).rarity==='rare'?'RARE EQUIPMENT. ':''}${(uid?oldDef:newDef).rarity==='legendary'?'LEGENDARY: cannot be earned again. ':''}${uid?oldDef.name:newDef.name} will be permanently discarded. Discarded equipment cannot be recovered.`));
    const yes=el('button',uid&&pending?'Confirm replacement':'Confirm discard','primary danger'),no=el('button','Keep equipment','secondary');yes.id='confirm-equipment';no.id='cancel-equipment';
    const revision=g.economy.revision,incomingId=incoming?.uid;yes.disabled=!g.canSave()||!!this.groundReward&&oldDef?.rarity==='legendary';yes.onclick=async()=>{const ok=await this.commit(()=>revision===g.economy.revision&&(!pending||this.groundReward||g.inventory.pending[0]?.uid===incomingId)&&(this.groundReward?pickupForGame(g,this.groundReward,uid,true):pending?g.resolveReward(uid,true):g.discardItem(uid,true)));if(ok){this.inventory();this.say('Equipment selection updated.');}};
    no.onclick=()=>{section.hidden=true;};section.append(yes,no);section.scrollIntoView({block:'nearest'});no.focus();
  }
}
