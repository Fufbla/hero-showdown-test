import {COSTUME_CATALOG, STAT_KEYS} from './costume-catalog.mjs';

// Only the existing numeric loot helmets roll. Shop power-armor bonuses and
// permanent Legendary rewards keep their authored rules. Work in 1/10,000 units
// so save/load validation never changes a roll through floating-point rounding.
const units=value=>Math.round(value*10000);
const helmets=Object.values(COSTUME_CATALOG).filter(d=>d.part==='helmet');
const ranges=new Map();
const levels=[...new Set(helmets.map(d=>d.level))].sort((a,b)=>b-a);
for(const level of levels){
  for(const def of helmets.filter(d=>d.level===level)){
    const previous=helmets.filter(d=>d.rarity===def.rarity&&d.level<level).sort((a,b)=>b.level-a.level)[0];
    const nextLevel=Math.min(...helmets.filter(d=>d.level>level).map(d=>d.level));
    const next=helmets.filter(d=>d.level===nextLevel);
    const result={};
    for(const key of STAT_KEYS){
      const base=units(def.stats[key]||0);
      if(!base){result[key]={min:0,max:0};continue;}
      // A lower level cannot outrank even the minimum next-level roll, across
      // both existing rarities. The current catalog value is always the ceiling.
      const ceilings=next.filter(d=>d.stats[key]>0).map(d=>units(ranges.get(d.id)[key].min));
      const max=Math.min(base,...ceilings);
      const neighbor=previous||next.find(d=>d.rarity===def.rarity)||next[0];
      const gap=neighbor?Math.abs(base-units(neighbor.stats[key]||0)):base;
      const min=Math.max(1,max-Math.floor(Math.min(gap/2,max/2)));
      result[key]=Object.freeze({min:min/10000,max:max/10000});
    }
    ranges.set(def.id,Object.freeze(result));
  }
}
export const helmetStatRanges=catalogId=>ranges.get(catalogId)||null;
export function validHelmetStats(item){
  if(!Object.hasOwn(item,'stats'))return true; // Existing owned items are fixed.
  const range=ranges.get(item.catalogId),stats=item.stats;
  return !!range&&!!stats&&typeof stats==='object'&&!Array.isArray(stats)&&
    Object.keys(stats).length===STAT_KEYS.length&&STAT_KEYS.every(key=>
      Number.isFinite(stats[key])&&stats[key]===units(stats[key])/10000&&
      stats[key]>=range[key].min&&stats[key]<=range[key].max);
}
export function rollHelmetStats(item,random=Math.random){
  const range=item&&ranges.get(item.catalogId);
  if(!range||Object.hasOwn(item,'stats'))return item;
  return {...item,stats:Object.fromEntries(STAT_KEYS.map(key=>{
    const lo=units(range[key].min),hi=units(range[key].max);
    return [key,(lo+(hi>lo?Math.min(hi-lo,Math.floor(random()*(hi-lo+1))):0))/10000];
  }))};
}
