import { POWERS, POWER_IDS, powerStats } from './powers.mjs';
import { CONTROL_NAMES, CONTROL_KEY, normalizeControls } from './controls.mjs';
const $=id=>document.getElementById(id);
const node=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
const labels={targets:'Maximum targets',damage:'Damage per hit',bossEffectiveness:'Boss damage effectiveness',reach:'Combat reach',kicks:'Kicks per combination',projectiles:'Fireballs per cast',pierce:'Enemies per Fireball',duration:'Duration',reduction:'All-damage reduction',dodge:'Regular enemy dodge chance',legendaryDodge:'Legendary Boss dodge chance',runBonus:'Running speed bonus',attackBonus:'Attack speed bonus',bossHitChance:'Boss hit chance during Flight',cooldown:'Cooldown'};
const percent=new Set(['bossEffectiveness','reduction','dodge','legendaryDodge','runBonus','attackBonus','bossHitChance']);
function format(key,value){return `${Number((value*(percent.has(key)?100:1)).toFixed(4))}${percent.has(key)?'%':['duration','cooldown'].includes(key)?' s':key==='reach'?' units':''}`;}
export class PowerMenu {
  constructor(getGame,persist,say,transaction=null){this.transaction=transaction;this.getGame=getGame;this.persist=persist;this.say=say;this.selected='strength';this.pending=null;}
  loadout(){
    const g=this.getGame(),safe=!g.inCombat()&&!g.hero.dead;
    $('loadout-note').textContent=safe?'Choose three learned powers. Selecting an equipped power swaps its slot.':'Loadout locked during combat. Move away from enemies and wait until safe.';
    $('loadout-slots').replaceChildren();
    for(let i=0;i<3;i++){
      const label=node('label',`Slot ${i+1}`,'field'),select=node('select');select.id=`slot-${i}`;select.setAttribute('aria-label',`Power slot ${i+1}`);
      const empty=node('option','Empty');empty.value='';select.append(empty);
      for(const id of POWER_IDS.filter(id=>!POWERS[id].passive&&g.powers.data.levels[id])){const option=node('option',`${POWERS[id].name} · ${g.powers.data.levels[id]}`);option.value=id;select.append(option);}
      select.value=g.powers.data.equipped[i]||'';select.disabled=!safe;
      select.onchange=()=>{if(g.equipPower(i,select.value||null)){this.persist();this.loadout();}else this.say('Leave combat to change your loadout.');};label.append(select);$('loadout-slots').append(label);
    }
    $('power-points').textContent=g.powers.data.points;
    $('tree-from-pause').disabled=!safe;
    $('tree-location').textContent=g.nearTree()?'The Tree of Eris is beside you.':'Visit safely from this menu. You return to this exact location.';
  }
  open(){this.pending=null;this.renderList();this.detail();}
  renderList(){
    const g=this.getGame(),scrollLeft=$('power-list').scrollLeft,scrollTop=$('power-list').scrollTop;$('tree-points').textContent=g.powers.data.points;$('power-list').replaceChildren();
    for(const id of POWER_IDS){
      const def=POWERS[id],button=node('button',undefined,'power-choice');button.dataset.power=id;button.setAttribute('aria-pressed',String(this.selected===id));
      button.append(node('b',def.icon),node('span',def.name),node('small',`${g.powers.data.levels[id]} / 20${def.passive?' · PASSIVE':''}`));
      button.onclick=()=>{this.selected=id;this.pending=null;this.renderList();this.detail();};$('power-list').append(button);
    }
    $('power-list').scrollLeft=scrollLeft;$('power-list').scrollTop=scrollTop;$('power-list').querySelector('[aria-pressed=true]')?.scrollIntoView({block:'nearest',inline:'nearest'});
  }
  detail(){
    const g=this.getGame(),id=this.selected,def=POWERS[id],level=g.powers.data.levels[id],panel=$('power-detail');panel.replaceChildren();panel.scrollTop=0;
    panel.append(node('div',def.passive?'ALWAYS WITH YOU':'ACTIVE SUPERPOWER','eyebrow'),node('h3',def.name),node('p',def.summary));
    const label=node('label','Levels to purchase','field'),amount=node('input');amount.id='upgrade-quantity';amount.type='number';amount.min=1;amount.max=Math.max(1,Math.min(20-level,g.powers.data.points));amount.value=1;amount.inputMode='numeric';label.append(amount);panel.append(label);
    const preview=node('div');preview.id='upgrade-preview';panel.append(preview);
    const status=node('p',undefined,'upgrade-status');status.id='upgrade-status';status.setAttribute('role','status');panel.append(status);
    const review=node('button','Review permanent upgrade','primary');review.id='review-upgrade';panel.append(review);
    const confirmation=node('div',undefined,'upgrade-confirm');confirmation.id='upgrade-confirm';confirmation.hidden=true;confirmation.setAttribute('role','group');confirmation.setAttribute('aria-label','Confirm permanent Power Point spend');
    const confirmText=node('p'),confirm=node('button','Confirm upgrade','primary'),cancel=node('button','Keep my points','secondary');confirm.id='confirm-upgrade';cancel.id='cancel-upgrade';confirmation.append(confirmText,confirm,cancel);panel.append(confirmation);
    const update=()=>{
      this.pending=null;confirmation.hidden=true;const count=Number(amount.value),next=level+count,result=g.upgradePreview(id,count);
      preview.replaceChildren();const table=node('table'),thead=node('thead'),tr=node('tr');
      for(const text of ['Stat',`Level ${level}`,`Level ${Number.isInteger(next)&&next<=20?next:'—'}`])tr.append(node('th',text));thead.append(tr);table.append(thead);
      const tbody=node('tbody'),options={heroLevel:g.hero.level,equipment:g.equipment},current=level?powerStats(id,level,options):null,after=Number.isInteger(next)&&next>level&&next<=20?powerStats(id,next,options):null;
      for(const [key,title] of Object.entries(labels)){if(!(key in (after||current||powerStats(id,1,options))))continue;const row=node('tr');row.append(node('th',title),node('td',current?format(key,current[key]):'Locked'),node('td',after?format(key,after[key]):'—'));tbody.append(row);}table.append(tbody);preview.append(table);
      if(id==='fireball'&&next===20)preview.append(node('p','Piercing: first enemy 100% damage; second enemy 50%.'));
      if(id==='speed')preview.append(node('p','Total attack speed, including equipment, is capped at +50%. No damage increase.'));
      if(def.after)preview.append(node('p','Cooldown begins when the ability finishes.'));
      status.textContent=level===20?'Maximum level reached.':result.ok?`${count} Power Point${count===1?'':'s'} · Level ${level} → ${next}. This choice is permanent.`:result.error;
      review.disabled=!result.ok;
    };
    const choices=node('div',undefined,'quantity-actions'),one=node('button','One level','secondary'),maximum=node('button','Maximum affordable','secondary');maximum.id='max-upgrade';one.type=maximum.type='button';one.onclick=()=>{amount.value=1;update();};maximum.disabled=level>=20||g.powers.data.points===0;maximum.onclick=()=>{amount.value=Math.min(20-level,g.powers.data.points);update();};choices.append(one,maximum);label.after(choices);
    amount.oninput=update;update();
    review.onclick=()=>{const count=Number(amount.value),result=g.upgradePreview(id,count);if(!result.ok){update();return;}this.pending={id,count,level};confirmText.textContent=`Spend ${count} Power Point${count===1?'':'s'} on ${def.name}, level ${level} → ${level+count}? Points cannot be redistributed.`;confirmation.hidden=false;confirm.focus();};
    cancel.onclick=()=>{this.pending=null;confirmation.hidden=true;review.focus();};
    confirm.onclick=()=>{
      const pending=this.pending;if(!pending||g.powers.data.levels[id]!==pending.level)return;
      const result=this.transaction?this.transaction(()=>g.upgradePower(pending.id,pending.count)):g.upgradePower(pending.id,pending.count);this.pending=null;
      if(result.ok){if(!this.transaction)this.persist();this.renderList();this.detail();this.say(`${def.name} upgraded to level ${g.powers.data.levels[id]}.`);$('upgrade-status').focus();}
      else{status.textContent=result.error;confirmation.hidden=true;}
    };
  }
}
export class ControlMenu {
  constructor(input,storage,say){this.input=input;this.storage=storage;this.say=say;this.capture=null;this.apply();
    document.addEventListener('keydown',e=>{
      if(!this.capture)return;e.preventDefault();e.stopImmediatePropagation();
      if(e.code==='Escape'){this.capture=null;this.render();return;}
      const action=this.capture,test=normalizeControls({keys:{[action]:[e.code]}}).keys[action];
      if(test.length!==1||test[0]!==e.code){$('mapping-note').textContent='Use a letter, digit, arrow, Space, Shift, Control or Alt.';return;}
      const duplicate=Object.entries(this.input.controls.keys).find(([id,codes])=>id!==action&&codes.includes(e.code));
      if(duplicate){$('mapping-note').textContent=`That key is used by ${CONTROL_NAMES[duplicate[0]]}. Choose another.`;return;}
      this.input.controls.keys[action]=[e.code];this.capture=null;this.save();this.render();
    },true);
  }
  apply(){const t=this.input.controls.touch;for(const [name,value] of Object.entries(t))document.documentElement.style.setProperty(`--touch-${name}`,`${value}px`);}
  save(){this.apply();try{this.storage.setItem(CONTROL_KEY,JSON.stringify(this.input.controls));}catch{this.say('Controls changed for this session. Browser storage is unavailable.',5);}}
  render(){
    this.capture=null;$('mapping-note').textContent='Choose a key to rebind it. Esc always closes a menu. Left stick also moves and steers Flight.';$('mapping-list').replaceChildren();
    for(const [id,name] of Object.entries(CONTROL_NAMES)){
      const row=node('div',undefined,'mapping-row');row.append(node('span',name));
      const key=node('button',this.input.controls.keys[id].map(x=>x.replace('Key','').replace('Digit','')).join(' / '),'secondary');key.dataset.map=id;key.setAttribute('aria-label',`Rebind ${name}`);
      key.onclick=()=>{this.capture=id;$('mapping-note').textContent=`Press a new key for ${name}. Esc cancels.`;key.textContent='Press a key…';};row.append(key);
      const pad=node('select');pad.setAttribute('aria-label',`${name} controller button`);for(let i=0;i<=16;i++){const o=node('option',`Button ${i}`);o.value=i;pad.append(o);}pad.value=this.input.controls.pad[id];
      pad.onchange=()=>{const n=Number(pad.value),old=this.input.controls.pad[id],other=Object.keys(this.input.controls.pad).find(a=>a!==id&&this.input.controls.pad[a]===n);if(other)this.input.controls.pad[other]=old;this.input.controls.pad[id]=n;this.save();this.render();};row.append(pad);$('mapping-list').append(row);
    }
    $('touch-settings').replaceChildren();
    for(const [id,title,min,max] of [['size','Button size',44,64],['left','Move stick inward',0,24],['right','Move actions inward',0,24],['rise','Raise touch controls',0,20]]){
      const label=node('label',undefined,'field'),caption=node('span'),slider=node('input');slider.type='range';slider.min=min;slider.max=max;slider.value=this.input.controls.touch[id];slider.id=`touch-${id}`;slider.setAttribute('aria-label',title);
      const update=()=>{caption.textContent=`${title} · ${slider.value}px`;this.input.controls.touch[id]=Number(slider.value);this.save();};slider.oninput=update;caption.textContent=`${title} · ${slider.value}px`;label.append(caption,slider);$('touch-settings').append(label);
    }
    $('reset-controls').onclick=()=>{this.input.controls=normalizeControls();this.save();this.render();};
  }
}
