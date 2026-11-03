// Review fixtures only. Resolve worn items through the same catalog adapter as a real hero.
import {sanitizeLook} from '../appearance.mjs';
import {COSTUME_PARTS, COSTUME_SETS} from '../costume-catalog.mjs';
import {EQUIPMENT, emptyInventory, equipmentOutfit} from '../equipment.mjs';
import {LEGENDARY, LEGENDARY_IDS} from '../legendary-data.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';

export const ART_VIEWS = [
  ['front','Front'], ['game','Gameplay'], ['side','Right side'], ['left','Left side'], ['back','Back']
];
export const PRESENTATIONS = [['male','Guardian'], ['female','Sentinel']];
export const KIT_LABELS = {
  starter:'Starter suit', custom:'Custom starter', ordinary:'Shore Guardian',
  rare:'Radiant Cavern Ranger', partial:'One Merge piece', mixed:'Mixed Merge pieces',
  ...Object.fromEntries(LEGENDARY_IDS.map(id => ['merge-'+id, LEGENDARY[id].name+' Merge']))
};
export const POSE_LABELS = {
  'double-jump':'Double jump','air-punch':'Aerial punch','air-kick':'Aerial kick', land:'Landing',
  turn:'Turn', steel:'Steel Body', roots:'Ground Roots', strength:'Super Strength',
  superKick:'Super Kick', speed:'Speed', agility:'Agility', fireball:'Fireball'
};
export const title = value => POSE_LABELS[value] || value.replace(/[-_]/g,' ').replace(/^./,c => c.toUpperCase());

export function inventoryFor(ids) {
  const inventory = emptyInventory();
  for (const id of ids) {
    const item = EQUIPMENT[id];
    if (!item) throw Error('Unknown equipment '+id);
    const uid = 'drop-'+inventory.nextId++;
    inventory.items.push({catalogId:id, uid});
    inventory.equipped[item.part] = uid;
  }
  return inventory;
}
export const setPieces = (set, rarity) => COSTUME_PARTS.map(part => 'eris-'+set+'-'+rarity+'-'+part);
export const mergePieces = id => COSTUME_PARTS.map(part => 'merge-'+id+'-'+part);
export function outfitFor(kit) {
  let ids = [];
  if (kit === 'ordinary') ids = setPieces('shore','ordinary');
  else if (kit === 'rare') ids = setPieces('cavern','rare');
  else if (kit === 'partial') ids = ['merge-lightning-helmet'];
  else if (kit === 'mixed') ids = ['merge-venomis-helmet','merge-sonic-chest','merge-atomdust-boots'];
  else if (kit.startsWith('merge-')) ids = mergePieces(kit.slice(6));
  return equipmentOutfit(inventoryFor(ids));
}
export function lookFor(sex, kit) {
  const base = styleCDefault(sex);
  if (kit !== 'custom') return base;
  return sanitizeLook(sex === 'male' ? {...base,build:'strong',hair:'cornrows',skin:'#8a553e',eyes:'#629b72',
    suit:'#1b685c',trim:'#eabd70',capeColor:'#21463e',emblem:'leaf'} :
    {...base,build:'full',hair:'bantu-knots',face:'round',skin:'#ba7b56',eyes:'#596a95',
    suit:'#295675',trim:'#f2c25f',capeColor:'#3e4773',emblem:'wave'});
}
export const regionalKits = Object.values(COSTUME_SETS).flatMap(set =>
  (set.region >= 4 ? ['ordinary','rare'] : ['ordinary']).map(rarity => ({
    set:set.id, name:set.name, level:set.level, rarity, parts:setPieces(set.id,rarity)
  }))
);
