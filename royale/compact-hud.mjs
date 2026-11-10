import {POWERS} from './powers.mjs';
export function cooldownFraction(remaining,total){return Math.max(0,Math.min(1,(Number(remaining)||0)/Math.max(.001,Number(total)||1)));}
export function updatePowerProgress(button,index,game){
  if(!game)return;
  const special=index===3,def=special?game.mergeAbility():POWERS[game.powers.data.equipped[index]],id=special?def?.id:game.powers.data.equipped[index];
  const remaining=(special?game.mergeCooldowns[id]:game.powers.cooldowns[id])||0;
  button.style.setProperty('--cooldown-remaining',cooldownFraction(remaining,def?.cooldown));
  button.dataset.powerState=button.classList.contains('disrupted')?'disrupted':remaining>0?'cooldown':button.classList.contains('active')?'active':'ready';
  button.title=button.getAttribute('aria-label');
}
