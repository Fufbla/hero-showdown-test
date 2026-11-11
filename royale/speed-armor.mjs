import {COSTUME_PARTS,matchingArmorSet} from './costume-catalog.mjs';
import {SUPER_KICK_SUITS, SUPER_KICK_PIECES, WARDROBE_CATALOG as priorCatalog} from './super-kick-armor.mjs';

const designs = [
  ['starter','Starting Block'], ['relay','Relay Runner'], ['vector','Vector Dart'],
  ['velodrome','Velodrome'], ['switchback','Switchback'], ['apex','Apex Racer'],
  ['pulse','Pulse Courier'], ['mach','Mach Spear'], ['horizon','Event Horizon'],
];

export const SPEED_SUITS = Object.freeze(designs.map(([art,name],i)=>{
  const {level,price}=SUPER_KICK_SUITS[i];
  return {setId:'speed-'+art, art, name, level, price, speedLevels:i+1,
    color:'#07825b', accent:'#84e4ad', rarity:'ordinary'};
}));
const labels={helmet:'Helmet',chest:'Chest Armor',boots:'Boots'};
export const SPEED_PIECES = Object.freeze(Object.fromEntries(SPEED_SUITS.flatMap((suit,i)=>
  COSTUME_PARTS.map(part=>{
    const id=suit.setId+'-'+part;
    const {catalogValue}=SUPER_KICK_PIECES[SUPER_KICK_SUITS[i].setId+'-'+part];
    return [id,{id,setId:suit.setId,setName:suit.name,name:suit.name+' '+labels[part],art:suit.art,part,
      level:suit.level,color:suit.color,accent:suit.accent,rarity:suit.rarity,
      speedLevels:suit.speedLevels,catalogValue,shop:part!=='helmet',sellable:true,stats:{}}];
  })
)));
export const WARDROBE_CATALOG = Object.freeze({...priorCatalog,...SPEED_PIECES});

export function matchingSpeedBonus(inventory,level){
  return matchingArmorSet(inventory,SPEED_PIECES,level)?.[0]?.speedLevels||0;
}
