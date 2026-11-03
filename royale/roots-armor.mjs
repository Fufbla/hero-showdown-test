import {COSTUME_PARTS} from './costume-catalog.mjs';
import {STEEL_SUITS, STEEL_PIECES, WARDROBE_CATALOG as priorCatalog} from './steel-armor.mjs';

const designs = [
  ['seed','Seedguard'], ['reed','Reed Strider'], ['briar','Briarhook'],
  ['oak','Oakheart'], ['lattice','Vineweaver'], ['mangrove','Mangrove Anchor'],
  ['canopy','Canopy Warden'], ['heartwood','Heartwood Paladin'], ['worldroot','Worldroot Sovereign'],
];

export const ROOTS_SUITS = Object.freeze(designs.map(([art,name],i)=>{
  const {level,price}=STEEL_SUITS[i];
  return {setId:'roots-'+art, art, name, level, price, rootsLevels:i+1,
    color:'#24723d', accent:'#b7da75', rarity:'ordinary'};
}));
export const ROOTS_PIECES = Object.freeze(Object.fromEntries(ROOTS_SUITS.flatMap((suit,i)=>
  COSTUME_PARTS.map(part=>{
    const id=suit.setId+'-'+part,peer=STEEL_PIECES[STEEL_SUITS[i].setId+'-'+part];
    const label={helmet:'Helmet',chest:'Chest Armor',boots:'Boots'}[part];
    return [id,{id, setId:suit.setId, setName:suit.name, name:suit.name+' '+label, art:suit.art, part,
      level:suit.level, color:suit.color, accent:suit.accent, rarity:suit.rarity,
      rootsLevels:suit.rootsLevels, catalogValue:peer.catalogValue, shop:true, sellable:true, stats:{}}];
  })
)));
export const WARDROBE_CATALOG = Object.freeze({...priorCatalog,...ROOTS_PIECES});

export function matchingRootsBonus(inventory,level){
  const worn=COSTUME_PARTS.map(part=>ROOTS_PIECES[inventory.items.find(i=>i.uid===inventory.equipped[part])?.catalogId]);
  const helmet=worn[0];
  return helmet && level>=helmet.level && worn.every((p,i)=>p?.part===COSTUME_PARTS[i] && p.setId===helmet.setId)
    ? helmet.rootsLevels : 0;
}
export function groundedForRoots(enemy){
  return !enemy.flying && !enemy.airborne && Math.abs(enemy.y-enemy.surface.y)<1;
}
export function releaseInvalidRoots(game,effect){
  for(let i=effect.targets.length-1;i>=0;i--){
    const enemy=game.enemies.find(e=>e.id===effect.targets[i]);
    if(enemy && enemy.state!=='dead' && groundedForRoots(enemy))continue;
    if(enemy)enemy.rooted=!!enemy.mergeRooted;
    effect.targets.splice(i,1);
  }
}
export function refreshRootsEffect(powers){
  const effect=powers?.active.roots;
  if(!effect)return;
  const stats=powers.stats('roots');
  Object.assign(effect,{level:stats.level, damage:stats.damage, duration:stats.duration});
  if(effect.age>=effect.duration){powers.end('roots');return;}
  // Keep original acquisition order. Re-equipping never catches new targets
  // or restarts the tick clock.
  const released=effect.targets.splice(stats.targets);
  for(const id of released){
    const enemy=powers.game.enemies.find(e=>e.id===id);
    if(enemy)enemy.rooted=!!enemy.mergeRooted;
  }
}
