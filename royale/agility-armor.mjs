import {COSTUME_PARTS} from './costume-catalog.mjs';
import {SPEED_SUITS, SPEED_PIECES, WARDROBE_CATALOG as priorCatalog} from './speed-armor.mjs';

const designs = [
  ['flick', 'Flicker'],
  ['rook', 'Rook Pivot'],
  ['kite', 'Kite Step'],
  ['orbit', 'Orbit Reflex'],
  ['lynx', 'Lynx Vector'],
  ['parallax', 'Parallax'],
  ['shutter', 'Shutter Guard'],
  ['prism', 'Prism Shift'],
  ['afterimage', 'Afterimage Sovereign'],
];

export const AGILITY_SUITS = Object.freeze(designs.map(([art,name],i)=>{
  const {level,price}=SPEED_SUITS[i];
  return {setId:'agility-'+art, art, name, level, price, agilityLevels:i+1,
    color:'#24202d', accent:'#a069ed', rarity:'ordinary'};
}));
const labels={helmet:'Helmet',chest:'Chest Armor',boots:'Boots'};
export const AGILITY_PIECES = Object.freeze(Object.fromEntries(AGILITY_SUITS.flatMap((suit,i)=>
  COSTUME_PARTS.map(part=>{
    const id=suit.setId+'-'+part;
    const {catalogValue}=SPEED_PIECES[SPEED_SUITS[i].setId+'-'+part];
    return [id,{id,setId:suit.setId,setName:suit.name,name:suit.name+' '+labels[part],art:suit.art,part,
      level:suit.level,color:suit.color,accent:suit.accent,rarity:suit.rarity,
      agilityLevels:suit.agilityLevels,catalogValue,shop:true,sellable:true,stats:{}}];
  })
)));
export const WARDROBE_CATALOG = Object.freeze({...priorCatalog,...AGILITY_PIECES});

export function matchingAgilityBonus(inventory,level){
  const worn=COSTUME_PARTS.map(part=>AGILITY_PIECES[inventory.items.find(item=>item.uid===inventory.equipped[part])?.catalogId]);
  const helmet=worn[0];
  return helmet && level>=helmet.level && worn.every((item,i)=>item?.part===COSTUME_PARTS[i] && item.setId===helmet.setId)
    ? helmet.agilityLevels : 0;
}

export function refreshAgilityEffect(powers) {
  const effect=powers?.active.agility;
  if (!effect) return;
  const {level,duration}=powers.stats('agility');
  Object.assign(effect,{level,duration});
  if (effect.age>=duration) powers.end('agility');
}
