import {drawPortal} from './runtime.mjs?v=portals-1';
import {LOOT} from '../../royale/progression.mjs';
import {drawRewardChest,chestPresentation} from '../../royale/reward-chest.mjs';
import {drawBossAttackFX} from '../../royale/boss-effects.mjs';
import { LEGENDARY } from '../../royale/legendary-data.mjs';
import { BOSSES, ARENA } from '../../royale/boss-data.mjs';
import { itemDefinition } from '../../royale/equipment.mjs';
import { usesBossSprites } from '../../royale/boss-sprites.mjs';
const $=id=>document.getElementById(id);
const node=(tag,text,className='')=>{const n=document.createElement(tag);n.textContent=text;n.className=className;return n;};
export function updateBossHud(game,visible){
  const scene=game.arenaScene,bar=$('boss-hud');bar.hidden=!scene||!visible||!!(scene.legendary&&scene.cleared);if(!scene)return;
  const b=scene.boss,def=scene.legendary?LEGENDARY[scene.legendary]:BOSSES[scene.region];
  $('boss-name').textContent=def.name;
  bar.dataset.phase=b.phase;
  $('boss-health-fill').style.width=`${100*b.hp/b.maxHp}%`;
  $('boss-health').setAttribute('aria-valuenow',String(Math.ceil(b.hp)));
  $('boss-health').setAttribute('aria-valuemax',String(b.maxHp));
}
export function openChestMenu(game,onClaim){
  const chest=game.availableChest(),contents=$('chest-contents'),owned=$('chest-owned');contents.replaceChildren();owned.replaceChildren();
  if(!chest)return;
  $('chest-summary').textContent=`First victory · ${BOSSES[game.regionId].name}. Preview every reward before collecting.`;
  contents.append(chestPresentation(),node('h3','Inside this chest'),node('p',`${chest.coins} coins · ${chest.roots} Health Root${chest.roots>1?'s':''}`));
  contents.append(node('p',`Roots carried: ${game.healthRoots}/${LOOT.rootLimit}. You can carry ${Math.min(LOOT.rootLimit-game.healthRoots,chest.roots)} of these; extra Roots cannot be carried. Existing items are never deleted.`,'storage-note'));
  for(const item of chest.items){const d=itemDefinition(item),card=node('article','',`chest-item ${d.rarity}`);card.append(node('small',d.rarity.toUpperCase()),node('h4',d.name),node('p',`Strength +${d.stats.strength} · Damage +${d.stats.damage} · Attack speed +${+(d.stats.attackSpeed*100).toFixed(1)}%`));contents.append(card);}
  owned.append(node('h3',`Your equipment · ${game.inventory.items.length}/${LOOT.inventoryLimit}`));
  if(!game.inventory.items.length)owned.append(node('p','No equipment carried. Your starter suit remains available.'));
  for(const item of game.inventory.items){const d=itemDefinition(item);owned.append(node('p',`${d.name}${Object.values(game.inventory.equipped).includes(item.uid)?' · WORN':''} — Strength +${d.stats.strength}, Damage +${d.stats.damage}`));}
  $('collect-chest').disabled=!game.canSave()||!!game.inventory.pending.length;
  $('collect-chest').onclick=onClaim;
}
export function drawArena(c,g){
  if(!g.arenaScene)return;
  c.save();c.textAlign='center';c.font='bold 17px system-ui';c.fillStyle='#fff1c4';c.fillText('← EXIT ARENA',205,490);c.font='11px system-ui';c.fillText('Walk left to retreat',210,510);
  drawPortal(c,ARENA.left,ARENA.floor,g.regionId,g.time,g.arenaScene.cleared?'RETURN TO REGION':'RETREAT · WALK LEFT',g,g.arenaScene.cleared?'return':'regular');
  drawBossAttackFX(c,g);
  c.setLineDash([]);
  const chest=!g.arenaScene.legendary&&g.arenaScene.cleared&&g.bossProgress.records[g.regionId]?.chest;
  if(chest){const x=ARENA.chestX,y=ARENA.floor;drawRewardChest(c,x,y,{progress:chest.state==='claimed'?1:0,time:g.time});if(g.availableChest()){c.font='bold 12px system-ui';c.fillStyle='#fff1c4';c.fillText('E · VIEW TREASURE',x,y-100);}}
  c.restore();
}
