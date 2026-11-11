import {COSTUME_PARTS,matchingArmorSet} from './costume-catalog.mjs';
import {STRENGTH_SUITS, STRENGTH_PIECES, WARDROBE_CATALOG as priorCatalog} from './strength-armor.mjs';

const designs = [
  ['slipstream','Slipstream'], ['crosswind','Crosswind'], ['mistral','Mistral Vane'],
  ['venturi','Venturi'], ['scythe','Gale Scythe'], ['helix','Helix Rider'],
  ['jetstream','Jetstream Lance'], ['eyewall','Eyewall Sentinel'], ['tempest','Tempest Regent'],
];

export const WHIRLWIND_SUITS = Object.freeze(designs.map(([art,name],i)=>{
  const {level,price}=STRENGTH_SUITS[i];
  return {setId:'whirlwind-'+art, art, name, level, price, whirlwindLevels:i+1,
    color:'#7543ac', accent:'#d6aff6', rarity:'ordinary'};
}));
const labels={helmet:'Helmet',chest:'Chest Armor',boots:'Boots'};
export const WHIRLWIND_PIECES = Object.freeze(Object.fromEntries(WHIRLWIND_SUITS.flatMap((suit,i)=>
  COSTUME_PARTS.map(part=>{
    const id=suit.setId+'-'+part;
    const {catalogValue}=STRENGTH_PIECES[STRENGTH_SUITS[i].setId+'-'+part];
    return [id,{id,setId:suit.setId,setName:suit.name,name:suit.name+' '+labels[part],art:suit.art,part,
      level:suit.level,color:suit.color,accent:suit.accent,rarity:suit.rarity,
      whirlwindLevels:suit.whirlwindLevels,catalogValue,shop:part!=='helmet',sellable:true,stats:{}}];
  })
)));
export const WARDROBE_CATALOG = Object.freeze({...priorCatalog,...WHIRLWIND_PIECES});

export function matchingWhirlwindBonus(inventory,level){
  return matchingArmorSet(inventory,WHIRLWIND_PIECES,level)?.[0]?.whirlwindLevels||0;
}

// Keep the original tick clock and acquisition order if the outfit changes mid-cast.
export function refreshWhirlwindEffect(powers){
  const effect=powers?.active.whirlwind;
  if(!effect)return;
  const {level,damage,duration,targets}=powers.stats('whirlwind');
  Object.assign(effect,{level,damage,duration});
  if(effect.age>=duration){powers.end('whirlwind');return;}
  const released=effect.targets.splice(targets);
  for(const enemy of powers.game.enemies){
    if(!released.includes(enemy.id)||!enemy.lifted)continue;
    enemy.lifted=!!enemy.mergeLifted;
    enemy.airborne=true;
    enemy.vy=0;
  }
}
