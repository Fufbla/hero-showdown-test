import {COSTUME_PARTS} from './costume-catalog.mjs';
import {AGILITY_SUITS, AGILITY_PIECES, WARDROBE_CATALOG as priorCatalog} from './agility-armor.mjs';

const designs = [
  ['swift', 'Swift Start'],
  ['glider', 'Glider Scout'],
  ['kestrel', 'Kestrel Wing'],
  ['stratus', 'Stratus Guard'],
  ['jet', 'Jet Lancer'],
  ['vortex', 'Vortex Aviator'],
  ['aurora', 'Aurora Sail'],
  ['zenith', 'Zenith Marshal'],
  ['firmament', 'Firmament Sovereign'],
];

export const FLIGHT_SUITS = Object.freeze(designs.map(([art,name],i)=>{
  const {level,price}=AGILITY_SUITS[i];
  return {setId:'flight-'+art, art, name, level, price, flightLevels:i+1,
    color:'#62b8e8', accent:'#c3efff', rarity:'ordinary'};
}));
const labels={helmet:'Helmet',chest:'Chest Armor',boots:'Boots'};
export const FLIGHT_PIECES = Object.freeze(Object.fromEntries(FLIGHT_SUITS.flatMap((suit,i)=>
  COSTUME_PARTS.map(part=>{
    const id=suit.setId+'-'+part;
    const {catalogValue}=AGILITY_PIECES[AGILITY_SUITS[i].setId+'-'+part];
    return [id,{id,setId:suit.setId,setName:suit.name,name:suit.name+' '+labels[part],art:suit.art,part,
      level:suit.level,color:suit.color,accent:suit.accent,rarity:suit.rarity,
      flightLevels:suit.flightLevels,catalogValue,shop:true,sellable:true,stats:{}}];
  })
)));
export const WARDROBE_CATALOG = Object.freeze({...priorCatalog,...FLIGHT_PIECES});

export function matchingFlightBonus(inventory,level){
  const worn=COSTUME_PARTS.map(part=>FLIGHT_PIECES[inventory.items.find(item=>item.uid===inventory.equipped[part])?.catalogId]);
  const helmet=worn[0];
  return helmet && level>=helmet.level && worn.every((item,i)=>item?.part===COSTUME_PARTS[i] && item.setId===helmet.setId)
    ? helmet.flightLevels : 0;
}

export function refreshFlightEffect(powers) {
  const effect=powers?.active.flight;
  if (!effect) return;
  const {level,duration}=powers.stats('flight');
  Object.assign(effect,{level,duration});
  if (effect.age>=duration) powers.end('flight');
}
