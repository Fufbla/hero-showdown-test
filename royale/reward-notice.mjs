import {itemDefinition} from './equipment.mjs';
// Routine XP/coins are HUD-only. Announce a rare drop without issuing rewards.
export function rewardNotice(event,loot){
 if(event.type!=='reward'||!event.item)return null;
 const drop=loot.findLast(o=>o.kind==='equipment'&&o.x===event.x&&o.y===event.y+12);
 const item=drop&&itemDefinition(drop.item);
 return item?.rarity==='rare'?`${item.name} dropped`:null;
}
