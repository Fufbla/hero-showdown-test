import {COSTUME_PARTS,matchingArmorSet} from './costume-catalog.mjs';
import {ROOTS_SUITS, ROOTS_PIECES, WARDROBE_CATALOG as priorCatalog} from './roots-armor.mjs';

const designs = [
  ['striker','Striker'], ['fulcrum','Fulcrum'], ['ram','Ram Driver'],
  ['piston','Piston Jack'], ['anvil','Anvil Guard'], ['fault','Faultbreaker'],
  ['flywheel','Flywheel Titan'], ['atlas','Atlas Bearer'], ['colossus','Solar Colossus'],
];

export const STRENGTH_SUITS = Object.freeze(designs.map(([art,name],i)=>{
  const {level,price}=ROOTS_SUITS[i];
  return {setId:'strength-'+art, art, name, level, price, strengthLevels:i+1,
    color:'#dca62c', accent:'#ffdf83', rarity:'ordinary'};
}));
const labels={helmet:'Helmet',chest:'Chest Armor',boots:'Boots'};
export const STRENGTH_PIECES = Object.freeze(Object.fromEntries(STRENGTH_SUITS.flatMap((suit,i)=>
  COSTUME_PARTS.map(part=>{
    const id=suit.setId+'-'+part;
    const {catalogValue}=ROOTS_PIECES[ROOTS_SUITS[i].setId+'-'+part];
    return [id,{id,setId:suit.setId,setName:suit.name,name:suit.name+' '+labels[part],art:suit.art,part,
      level:suit.level,color:suit.color,accent:suit.accent,rarity:suit.rarity,
      strengthLevels:suit.strengthLevels,catalogValue,shop:part!=='helmet',sellable:true,stats:{}}];
  })
)));
export const WARDROBE_CATALOG = Object.freeze({...priorCatalog,...STRENGTH_PIECES});

export function matchingStrengthBonus(inventory,level){
  return matchingArmorSet(inventory,STRENGTH_PIECES,level)?.[0]?.strengthLevels||0;
}
