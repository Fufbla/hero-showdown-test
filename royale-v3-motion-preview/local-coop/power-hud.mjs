import {POWERS} from '../powers.mjs';

// These are the same icon glyphs used by the game's power buttons. Each view
// reads only its own hero; no timers, network messages or per-frame DOM rebuilds.
export function powerSlots(game) {
 const merge=game.mergeAbility();
 return [...game.powers.data.equipped.map(id=>({id,def:POWERS[id],remaining:game.powers.cooldowns[id]||0,active:!!game.powers.active[id],disrupted:!!id&&game.disruptedPower===id})),
  ...(merge?[{id:merge.id,def:merge,remaining:game.mergeCooldowns[merge.id]||0,active:game.mergeEffects.some(e=>e.id===merge.id&&!e.ended),merge:true}]:[])];
}
export function makePowerHUD(root,player) {
 const cells=Array.from({length:4},(_,slot)=>{
  const cell=document.createElement('span');cell.className='cooldown-icon';cell.setAttribute('role','img');
  const icon=document.createElement('b'),shade=document.createElement('i'),time=document.createElement('small');
  shade.className='cooldown-shade';time.className='cooldown-time';cell.append(icon,shade,time);root.append(cell);
  return {cell,icon,shade,time,key:'',peak:0,id:null};
 });
 return game=>powerSlots(game).concat([null,null,null,null]).slice(0,4).forEach((power,slot)=>{
  const view=cells[slot];view.cell.hidden=!power;if(!power)return;
  const {id,def,remaining,active,disrupted}=power;
  if(view.id!==id){view.id=id;view.peak=0;}
  view.peak=remaining?Math.max(view.peak,remaining,def?.cooldown||0):0;
  const label=disrupted?'Locked':remaining>0?`${Math.ceil(remaining)}s`:active?'Active':id?'Ready':'Empty';
  const key=`${id}:${label}:${!!power.merge}`;
  if(view.key!==key){view.key=key;view.icon.textContent=def?.icon||'+';view.time.textContent=remaining>0?String(Math.ceil(remaining)):active?'•':'';view.cell.title=`Slot ${slot+1} · ${def?.name||'Empty'} · ${label}`;view.cell.setAttribute('aria-label',`Player ${player+1} ${view.cell.title}`);view.cell.classList.toggle('is-active',!!active);view.cell.classList.toggle('is-locked',!!disrupted);}
  view.shade.style.transform=`scaleY(${remaining>0?Math.min(1,remaining/(view.peak||remaining)):disrupted?1:0})`;
 });
}
