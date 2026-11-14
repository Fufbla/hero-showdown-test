// Each ID identifies one permanent catalog design in saved inventories.
// Prices are whole coins. For a half-coin quarter the boots take the remainder.
import {COSTUME_CATALOG, COSTUME_PARTS, matchingArmorSet} from './costume-catalog.mjs';
import {ARMOR_PRICES} from './armor-prices.mjs';

const designs = [
  ['ember', 'Ember Scout', 500],
  ['kiln', 'Kiln Rider', 1250],
  ['forge', 'Forge Guard', 2500],
  ['flare', 'Flare Lancer', 4500],
  ['phoenix', 'Phoenix Wing', 7500],
  ['caldera', 'Caldera Breaker', 12000],
  ['furnace', 'Furnace Warden', 18000],
  ['corona', 'Corona Knight', 27000],
  ['supernova', 'Supernova Sovereign', 40000],
];

export const FIREBALL_SUITS = Object.freeze(designs.map(([art, name], i) => ({
  setId: 'fireball-'+art, art, name, price:ARMOR_PRICES[10*(i+1)], level:10*(i+1), fireballLevels:i+1,
  color:'#bd2132', accent:'#ffbd5a', rarity:'ordinary',
})));

export const FIREBALL_PIECES = Object.freeze(Object.fromEntries(FIREBALL_SUITS.flatMap((suit,index) => {
  const originalValue=designs[index][2];
  const helmet = Math.floor(originalValue/4), chest = originalValue/2;
  const prices = {helmet, chest, boots:originalValue-helmet-chest};
  return COSTUME_PARTS.map(part => {
    const id = suit.setId+'-'+part;
    return [id, {id, setId:suit.setId, art:suit.art, setName:suit.name,
      name:suit.name+' '+({helmet:'Helmet',chest:'Chest Armor',boots:'Boots'})[part], part,
      level:suit.level, color:suit.color, accent:suit.accent, rarity:suit.rarity,
      fireballLevels:suit.fireballLevels, catalogValue:prices[part], shop:part!=='helmet', sellable:true,
      stats:{fireball:part==='chest'?2:1}}];
  });
})));
export const WARDROBE_CATALOG = Object.freeze({...COSTUME_CATALOG, ...FIREBALL_PIECES});

export function matchingFireballBonus(inventory,level){
  return matchingArmorSet(inventory,FIREBALL_PIECES,level)?.[0]?.fireballLevels||0;
}
