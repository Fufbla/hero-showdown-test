import { drawEquipmentPreview, statComparison } from './eris-ui.mjs';
import { STAT_KEYS, STAT_LABELS, formatStat } from './costume-catalog.mjs';
import { WORLD_REGIONS } from './world.mjs';
import { EQUIPMENT_PARTS, EQUIPMENT_NAMES, itemDefinition } from './equipment.mjs';
import { LOOT } from './progression.mjs';
const $=id=>document.getElementById(id);
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
export function statsText(def){return STAT_KEYS.filter(k=>def.stats[k]).map(k=>`${STAT_LABELS[k]} +${formatStat(k,def.stats[k])}`).join(' · ');}
export class JourneyMenu {
  constructor(getGame,persist,say,resume,transaction=null){this.transaction=transaction;this.getGame=getGame;this.persist=persist;this.say=say;this.resume=resume;this.confirmation=null;}
  commit(action){if(this.transaction)return this.transaction(action).ok;const ok=action();if(ok)this.persist();return !!ok;}
  preview(item){const g=this.getGame(),def=itemDefinition(item),panel=el('section',undefined,'equipment-preview'),canvas=el('canvas');canvas.width=360;canvas.height=420;const inv=structuredClone(g.inventory);if(!inv.items.some(i=>i.uid===item.uid))inv.items.push(item);inv.equipped[def.part]=item.uid;const body=el('div');body.append(el('h3',def.name),el('p',`${def.rarity} · Level ${def.level||1} · Fixed colors`),el('p',statsText(def)));for(const view of ['front','back']){const b=el('button',view==='front'?'Front preview':'Back preview','secondary');b.onclick=()=>drawEquipmentPreview(canvas,g,inv,view);body.append(b);}panel.append(canvas,body);$('equipment-list').prepend(panel);drawEquipmentPreview(canvas,g,inv);panel.scrollIntoView({block:'nearest'});}
  shop(){
    const g=this.getGame(),section=$('root-shop');section.replaceChildren();
    const text=el('div');text.append(el('strong','Health Roots'),el('p',`Restore 25% HP anywhere. ${g.healthRoots} / 4 carried · 50 coins each.`));
    const button=el('button','Buy Health Root · 50 ◈','secondary');button.id='buy-root';button.disabled=!g.canSave()||g.healthRoots>=4||g.hero.coins<50;
    button.onclick=()=>{if(g.buyHealthRoot()){this.persist();this.shop();this.say('One Health Root added.');}};section.append(text,button);
  }
  map(){
    const g=this.getGame(),list=$('region-cards');list.replaceChildren();
    $('map-note').textContent=g.canTravel()?'Travel to any unlocked region’s safe checkpoint. Connected paths also lead backward.':'Travel locked. Finish the encounter and spend five seconds without attacking or taking damage.';
    for(const region of WORLD_REGIONS){
      const open=g.world.unlocked.includes(region.id),current=region.id===g.regionId,card=el('article',undefined,'region-card');card.style.setProperty('--region-color',region.sky[0]);card.dataset.region=region.id;if(current)card.setAttribute('aria-current','location');
      const art=el('div',undefined,`region-art ${region.theme}`);art.append(el('span',String(region.id).padStart(2,'0'),'region-number'),el('b',['','≋','♧','▥','◇','❧','✧','✦'][region.id]));card.append(art);
      const body=el('div',undefined,'region-copy');body.append(el('small',`LEVELS ${region.levels.join('–')} · ${region.id<=2?'PERMANENT DAY':'DAY / NIGHT'}`),el('h3',region.name),el('p',region.boards.join(' → ')));
      body.append(el('p',`${document.body.classList.contains('practice-world')?'Unlocked practice fixture':g.world.bossVictories.includes(region.id)?'Victory recorded':'Challenge available'} · ${region.boss}`,'boss-note'));
      const button=el('button',!open?'Locked · previous boss required':current?'Return to safe camp':'Travel to safe camp',open?'secondary':'secondary locked');button.disabled=!open||!g.canTravel();button.dataset.travel=region.id;
      button.onclick=()=>{if(g.travel(region.id)){this.persist();this.resume();this.say(`${region.name} · arrived at safe camp.`);}else{this.say('That route is locked or combat is active.');this.map();}};body.append(button);card.append(body);list.append(card);
    }
  }
  inventory(){
    const g=this.getGame();this.confirmation=null;$('equipment-confirm').hidden=true;
    $('inventory-summary').textContent=`${g.inventory.items.length} / 7 carried · Equipped and unequipped items share this limit. ${g.healthRoots} / 4 Health Roots stored separately.`;
    const list=$('equipment-list');list.replaceChildren();
    if(!g.inventory.items.length)list.append(el('p','Your starter suit is always yours. Regular monsters may drop fixed-color costume equipment.','empty-equipment'));
    const pending=g.inventory.pending[0],reward=$('pending-reward');reward.replaceChildren();reward.hidden=!pending;
    if(pending){const def=itemDefinition(pending);reward.append(el('div',g.inventory.items.length>=7?'INVENTORY FULL · CHOOSE YOUR REWARD':'CHOOSE YOUR REWARD','eyebrow'),el('h3',def.name),el('p',statsText(def)),el('p',`${def.rarity==='rare'?'Constant white glow.':'No glow.'} Choose a carried item below to compare and replace, or discard this reward.`));
      if(g.inventory.items.length<7){const keep=el('button','Keep this equipment','primary');keep.id='accept-reward';keep.disabled=!g.canSave();keep.onclick=()=>{if(this.commit(()=>g.acceptReward()))this.inventory();};reward.append(keep);}
      const decline=el('button','Discard new reward','secondary');decline.id='discard-reward';decline.onclick=()=>this.confirm(null,true);reward.append(decline);}
    for(const item of g.inventory.items){
      const def=itemDefinition(item),equipped=g.inventory.equipped[def.part]===item.uid,card=el('article',undefined,`equipment-card ${def.rarity}`);card.dataset.item=item.uid;
      const symbol=el('div',['◉','⬡','✧','⌁','═','⚑','✦'][EQUIPMENT_PARTS.indexOf(def.part)],'equipment-symbol');symbol.style.color=def.color;card.append(symbol);
      const body=el('div');body.append(el('small',`${def.rarity.toUpperCase()} · ${EQUIPMENT_NAMES[def.part]}${equipped?' · EQUIPPED':''}`),el('h3',def.name),el('p',statsText(def)));card.append(body);
      const actions=el('div',undefined,'equipment-actions');
      if(pending){const compare=el('button','Compare & replace','secondary');compare.onclick=()=>this.confirm(item.uid,true);actions.append(compare);}
      else{
        const wear=el('button',equipped?'Unequip':'Equip','secondary');wear.disabled=!g.canSave()||g.hero.level<(def.level||1);wear.onclick=()=>{if(this.commit(()=>g.equipItem(item.uid)))this.inventory();};
        const discard=el('button','Discard','text-button');discard.disabled=!g.canSave();discard.onclick=()=>this.confirm(item.uid,false);actions.append(wear,discard);
      }
      const preview=el('button','Preview','secondary');preview.onclick=()=>this.preview(item);actions.append(preview);card.append(actions);list.append(card);
    }
    $('inventory-close').textContent=pending?'Keep reward pending · back':'Back to pause';
  }
  confirm(uid,pending){
    const g=this.getGame(),section=$('equipment-confirm');section.replaceChildren();section.hidden=false;
    const old=g.inventory.items.find(i=>i.uid===uid),incoming=g.inventory.pending[0],oldDef=itemDefinition(old),newDef=itemDefinition(incoming);
    section.append(el('h3',uid&&pending?'Replace this equipment?':'Discard this equipment?'));
    if(uid&&pending){const table=el('table'),head=el('tr');head.append(el('th','Stat'),el('th',oldDef.name),el('th',newDef.name));table.append(head);for(const key of STAT_KEYS){const row=el('tr');row.append(el('th',key),el('td',String(oldDef.stats[key])),el('td',String(newDef.stats[key])));table.append(row);}section.append(table);}
    section.append(el('p',`${(uid?oldDef:newDef).rarity==='rare'?'RARE EQUIPMENT. ':''}${(uid?oldDef:newDef).rarity==='legendary'?'LEGENDARY: cannot be earned again. ':''}${uid?oldDef.name:newDef.name} will be permanently discarded. Discarded equipment cannot be recovered.`));
    const yes=el('button',uid&&pending?'Confirm replacement':'Confirm discard','primary danger'),no=el('button','Keep equipment','secondary');yes.id='confirm-equipment';no.id='cancel-equipment';
    const revision=g.economy.revision,incomingId=incoming?.uid;yes.disabled=!g.canSave();yes.onclick=()=>{const ok=this.commit(()=>revision===g.economy.revision&&(!pending||g.inventory.pending[0]?.uid===incomingId)&&(pending?g.resolveReward(uid,true):g.discardItem(uid,true)));if(ok){this.inventory();this.say('Equipment selection updated.');}};
    no.onclick=()=>{section.hidden=true;};section.append(yes,no);section.scrollIntoView({block:'nearest'});no.focus();
  }
}
