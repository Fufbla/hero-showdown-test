// The two collections share level gates and shop prices. Old item IDs and
// learned-power save fields remain the source of truth for older saves.
import {COSTUME_PARTS,matchingArmorSet} from './costume-catalog.mjs';
import {FIREBALL_SUITS, FIREBALL_PIECES, WARDROBE_CATALOG as existingWardrobe} from './power-armor.mjs';

const designs = [
  ['rivet', 'Rivet Guard'],
  ['breakwater', 'Breakwater'],
  ['rail', 'Rail Warden'],
  ['aegis', 'Aegis Kite'],
  ['boreal', 'Boreal Rampart'],
  ['tortoise', 'Tortoise Bastion'],
  ['lock', 'Vaultkeeper'],
  ['citadel', 'Sky Citadel'],
  ['polaris', 'Polaris Bulwark'],
];

export const STEEL_SUITS = Object.freeze(designs.map(([art,name], index) => {
  const {level,price}=FIREBALL_SUITS[index];
  return {setId:'steel-'+art, art, name, level, price, steelLevels:index+1,
    color:'#2058ac', accent:'#a4d5f8', rarity:'ordinary'};
}));

export const STEEL_PIECES = Object.freeze(Object.fromEntries(STEEL_SUITS.flatMap((suit,index) =>
  COSTUME_PARTS.map(part => {
    const id=suit.setId+'-'+part;
    const peer=FIREBALL_PIECES[FIREBALL_SUITS[index].setId+'-'+part];
    const label={helmet:'Helmet',chest:'Chest Armor',boots:'Boots'}[part];
    return [id, {id, setId:suit.setId, setName:suit.name, name:suit.name+' '+label, art:suit.art,
      level:suit.level, color:suit.color, accent:suit.accent, rarity:suit.rarity, part,
      steelLevels:suit.steelLevels, catalogValue:peer.catalogValue, shop:part!=='helmet', sellable:true, stats:{}}];
  })
)));
export const WARDROBE_CATALOG = Object.freeze({...existingWardrobe, ...STEEL_PIECES});

export function matchingSteelBonus(inventory,level){
  return matchingArmorSet(inventory,STEEL_PIECES,level)?.[0]?.steelLevels||0;
}

// Retain elapsed time if a safe wardrobe transaction changes an active suit.
export function refreshSteelEffect(powers) {
  const effect=powers?.active.steel;
  if (!effect) return;
  const {level,duration,reduction}=powers.stats('steel');
  Object.assign(effect,{level,duration,reduction});
  if (effect.age>=duration) powers.end('steel');
}
