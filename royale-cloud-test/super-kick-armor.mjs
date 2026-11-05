import {COSTUME_PARTS} from './costume-catalog.mjs';
import {WHIRLWIND_SUITS, WHIRLWIND_PIECES, WARDROBE_CATALOG as priorCatalog} from './whirlwind-armor.mjs';

const designs = [
  ['spar','Sparring Guard'], ['pivot','Pivot Step'], ['crane','Crane Wing'],
  ['koi','Koi Current'], ['mantis','Mantis Hook'], ['wheel','Wheelhouse'],
  ['tiger','White Tiger'], ['pagoda','Pagoda Master'], ['dragon','Argent Dragon'],
];

export const SUPER_KICK_SUITS = Object.freeze(designs.map(([art,name],i)=>{
  const {level,price}=WHIRLWIND_SUITS[i];
  return {setId:'superKick-'+art, art, name, level, price, superKickLevels:i+1,
    color:'#adb4bc', accent:'#f0f3f6', rarity:'ordinary'};
}));
const labels={helmet:'Helmet',chest:'Chest Armor',boots:'Boots'};
export const SUPER_KICK_PIECES = Object.freeze(Object.fromEntries(SUPER_KICK_SUITS.flatMap((suit,i)=>
  COSTUME_PARTS.map(part=>{
    const id=suit.setId+'-'+part;
    const {catalogValue}=WHIRLWIND_PIECES[WHIRLWIND_SUITS[i].setId+'-'+part];
    return [id,{id,setId:suit.setId,setName:suit.name,name:suit.name+' '+labels[part],art:suit.art,part,
      level:suit.level,color:suit.color,accent:suit.accent,rarity:suit.rarity,
      superKickLevels:suit.superKickLevels,catalogValue,shop:true,sellable:true,stats:{}}];
  })
)));
export const WARDROBE_CATALOG = Object.freeze({...priorCatalog,...SUPER_KICK_PIECES});

export function matchingSuperKickBonus(inventory,level){
  const worn=COSTUME_PARTS.map(part=>SUPER_KICK_PIECES[inventory.items.find(item=>item.uid===inventory.equipped[part])?.catalogId]);
  const helmet=worn[0];
  return helmet && level>=helmet.level && worn.every((item,i)=>item?.part===COSTUME_PARTS[i] && item.setId===helmet.setId)
    ? helmet.superKickLevels : 0;
}

// The attack and combo share this state. Update a pending strike without
// restarting its animation, changing its target, or refunding spent kicks.
export function refreshSuperKickEffect(powers){
  const combo=powers?.active.superKick;
  if(!combo)return;
  const {level,damage,kicks}=powers.stats('superKick');
  const started=combo.kicks-combo.left;
  combo.left=Math.max(0,Math.min(combo.left,kicks-started));
  combo.kicks=started+combo.left;
  combo.level=level;
  combo.damage=damage;
}
