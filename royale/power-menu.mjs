import { POWERS, POWER_IDS, powerStats } from './powers.mjs';
import { CONTROL_NAMES, CONTROL_KEY, normalizeControls } from './controls.mjs';
const $=id=>document.getElementById(id);
const node=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
const labels={targets:'Maximum targets',damage:'Damage per hit',bossEffectiveness:'Boss damage effectiveness',reach:'Combat reach',kicks:'Kicks per combination',projectiles:'Fireballs per cast',pierce:'Enemies per Fireball',duration:'Duration',reduction:'All-damage reduction',dodge:'Regular enemy dodge chance',legendaryDodge:'Legendary Boss dodge chance',runBonus:'Running speed bonus',attackBonus:'Attack speed bonus',bossHitChance:'Boss hit chance during Flight',cooldown:'Cooldown'};
const percent=new Set(['bossEffectiveness','reduction','dodge','legendaryDodge','runBonus','attackBonus','bossHitChance']);
function format(key,value){return `${Number((value*(percent.has(key)?100:1)).toFixed(4))}${percent.has(key)?'%':['duration','cooldown'].includes(key)?' s':key==='reach'?' units':''}`;}
export class PowerMenu {
  constructor(getGame,persist,say,upgrades){Object.assign(this,{getGame,persist,say,upgrades});this.selected='strength';this.busy=false;this.message='';this.padPrevious=new Set();}
  loadout(){
    const g=this.getGame(),safe=!g.inCombat()&&!g.hero.dead&&!this.busy;
    $('loadout-note').textContent=safe?'Choose three learned powers. Selecting an equipped power swaps its slot.':'Loadout locked until safe.';
    $('loadout-slots').replaceChildren();
    for(let i=0;i<3;i++){
      const label=node('label',`Slot ${i+1}`,'field'),select=node('select');select.id=`slot-${i}`;select.setAttribute('aria-label',`Power slot ${i+1}`);
      const empty=node('option','Empty');empty.value='';select.append(empty);
      for(const id of POWER_IDS.filter(id=>!POWERS[id].passive&&g.powers.data.levels[id])){const option=node('option',`${POWERS[id].name} · ${g.powers.data.levels[id]}`);option.value=id;select.append(option);}
      select.value=g.powers.data.equipped[i]||'';select.disabled=!safe;
      select.onchange=()=>{if(this.busy)return;if(g.equipPower(i,select.value||null)){this.persist();this.loadout();}else this.say('Leave combat to change your loadout.');};label.append(select);$('loadout-slots').append(label);
    }
    $('power-points').textContent=g.powers.data.points;
    $('tree-from-pause').disabled=!safe;
    $('tree-location').textContent='Power Point upgrades save immediately. Loadout changes use your normal Save Game.';
  }
  open(){this.loadout();this.renderList();this.detail();}
  renderList(){
    const g=this.getGame(),list=$('power-list'),left=list.scrollLeft,top=list.scrollTop,focus=document.activeElement?.dataset;
    $('tree-points').textContent=g.powers.data.points;list.replaceChildren();list.setAttribute('aria-busy',String(this.busy));
    for(const id of POWER_IDS){
      const def=POWERS[id],row=node('div',undefined,'power-row'),choice=node('button',undefined,'power-choice'),arrow=node('button','↑','power-upgrade');
      choice.type=arrow.type='button';choice.dataset.power=id;choice.setAttribute('aria-pressed',String(this.selected===id));
      choice.append(node('b',def.icon),node('span',def.name),node('small',`Level ${g.powers.data.levels[id]} / 20${def.passive?' · PASSIVE':''}`));
      choice.onclick=()=>{this.selected=id;this.renderList();this.detail();};
      arrow.dataset.upgrade=id;arrow.setAttribute('aria-label',`Upgrade ${def.name} by one level`);arrow.title='1 Power Point · permanent';
      arrow.disabled=this.busy||!g.upgradePreview(id,1).ok;
      arrow.onclick=()=>void this.upgrade(id);
      arrow.onkeydown=e=>{if(e.repeat&&(e.key==='Enter'||e.key===' '))e.preventDefault();};
      row.append(choice,arrow);list.append(row);
    }
    list.scrollLeft=left;list.scrollTop=top;
    const focused=focus?.upgrade?list.querySelector(`[data-upgrade="${focus.upgrade}"]`):focus?.power?list.querySelector(`[data-power="${focus.power}"]`):null;
    if(focused)(focused.disabled?list.querySelector(`[data-power="${focus.upgrade}"]`):focused)?.focus({preventScroll:true});
    list.onkeydown=e=>{
      if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
      const current=document.activeElement,id=current?.dataset?.upgrade||current?.dataset?.power,index=POWER_IDS.indexOf(id);if(index<0)return;
      e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?8:e.key==='ArrowDown'?(index+1)%9:e.key==='ArrowUp'?(index+8)%9:index;
      const kind=e.key==='ArrowLeft'?'power':e.key==='ArrowRight'?'upgrade':current.dataset.upgrade?'upgrade':'power';
      const target=list.querySelector(`[data-${kind}="${POWER_IDS[next]}"]`);
      (target.disabled?list.querySelector(`[data-power="${POWER_IDS[next]}"]`):target).focus();
    };
  }
  async upgrade(id){
    if(this.busy)return;
    this.busy=true;this.selected=id;this.message='Saving upgrade…';this.renderList();this.detail();this.loadout();
    try{
      const result=await this.upgrades.spend(id);
      this.message=result.ok?`${POWERS[id].name} is now Level ${result.level}. ${result.points} Power Points available.${result.storage==='local'?' Saved on this browser.':''}`:result.error;
      if(result.ok)this.say(this.message);return result;
    }finally{this.busy=false;this.renderList();this.detail();this.loadout();const arrow=$('power-list').querySelector(`[data-upgrade="${id}"]`);if(this.selected===id&&!arrow.disabled)arrow.focus({preventScroll:true});}
  }
  detail(){
    const g=this.getGame(),id=this.selected,def=POWERS[id],level=g.powers.data.levels[id],panel=$('power-detail');panel.replaceChildren();
    panel.append(node('div',def.passive?'PASSIVE SUPERPOWER':'ACTIVE SUPERPOWER','eyebrow'),node('h3',def.name),node('p',def.summary));
    const preview=node('div');preview.id='upgrade-preview';panel.append(preview);
    const table=node('table'),head=node('tr');for(const label of ['Ability',`Level ${level}`])head.append(node('th',label));const thead=node('thead');thead.append(head);table.append(thead);
    const body=node('tbody'),stats=powerStats(id,Math.max(1,level),{heroLevel:g.hero.level,equipment:g.equipment});
    for(const [key,label] of Object.entries(labels)){if(!(key in stats))continue;const row=node('tr');row.append(node('th',label),node('td',level?format(key,stats[key]):'Not learned'));body.append(row);}table.append(body);preview.append(table);
    const status=node('p',this.message|| (level===20?'Maximum level reached.':g.powers.data.points?'↑ spends one Power Point immediately. Upgrades are permanent.':'Earn one Power Point with each hero level.'),'upgrade-status');status.id='upgrade-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');panel.append(status);
    if(id==='fireball'&&level===20)panel.append(node('p','Piercing: first enemy 100% damage; second enemy 50%.'));
    if(id==='speed')panel.append(node('p','Total attack speed, including equipment, is capped at +50%. No damage increase.'));
    if(def.after)panel.append(node('p','Cooldown begins when the ability finishes.'));
  }
  pollGamepad(enabled,pad){
    if(pad===undefined){try{pad=[...(navigator.getGamepads?.()||[])].find(p=>p?.connected&&p.mapping==='standard');}catch{}}
    const held=new Set();if(pad){for(const i of[0,12,13,14,15])if(pad.buttons[i]?.pressed)held.add(i);if(pad.axes[1]<-.6)held.add(12);if(pad.axes[1]>.6)held.add(13);if(pad.axes[0]<-.6)held.add(14);if(pad.axes[0]>.6)held.add(15);}
    const edges=[...held].filter(i=>!this.padPrevious.has(i));this.padPrevious=held;if(!enabled||this.busy)return;
    const list=$('power-list'),active=document.activeElement,id=active?.dataset?.upgrade||active?.dataset?.power||this.selected;let index=POWER_IDS.indexOf(id),kind=active?.dataset?.power?'power':'upgrade';
    if(edges.includes(12))index=(index+8)%9;if(edges.includes(13))index=(index+1)%9;if(edges.includes(14))kind='power';if(edges.includes(15))kind='upgrade';
    const target=list.querySelector(`[data-${kind}="${POWER_IDS[index]}"]`);if(!target)return;
    if(edges.some(i=>i!==0))(target.disabled?list.querySelector(`[data-power="${POWER_IDS[index]}"]`):target).focus();
    if(edges.includes(0)&&!target.disabled){target.focus();target.click();}
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
      const pad=node('select');pad.setAttribute('aria-label',`${name} controller button`);for(let i=-1;i<=16;i++){const o=node('option',i<0?'Unassigned':`Button ${i}`);o.value=i;pad.append(o);}pad.value=this.input.controls.pad[id];
      pad.onchange=()=>{const n=Number(pad.value),old=this.input.controls.pad[id],other=Object.keys(this.input.controls.pad).find(a=>n>=0&&a!==id&&this.input.controls.pad[a]===n);if(other)this.input.controls.pad[other]=old;this.input.controls.pad[id]=n;this.save();this.render();};row.append(pad);$('mapping-list').append(row);
    }
    $('touch-settings').replaceChildren();
    for(const [id,title,min,max] of [['stickSize','Joystick size',76,106],['size','Button size',44,64],['left','Move stick inward',0,24],['right','Move actions inward',0,24],['rise','Raise touch controls',0,20]]){
      const label=node('label',undefined,'field'),caption=node('span'),slider=node('input');slider.type='range';slider.min=min;slider.max=max;slider.value=this.input.controls.touch[id];slider.id=`touch-${id}`;slider.setAttribute('aria-label',title);
      const update=()=>{caption.textContent=`${title} · ${slider.value}px`;this.input.controls.touch[id]=Number(slider.value);this.save();};slider.oninput=update;caption.textContent=`${title} · ${slider.value}px`;label.append(caption,slider);$('touch-settings').append(label);
    }
    $('reset-controls').onclick=()=>{this.input.controls=normalizeControls();this.save();this.render();};
  }
}
