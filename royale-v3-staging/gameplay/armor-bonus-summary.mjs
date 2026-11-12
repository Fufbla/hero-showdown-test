// Presentation only: read the same matching-set bonuses used by journey.refreshEquipment.
// Learned power levels and save data are never modified here.
import {STAT_KEYS,STAT_LABELS,formatStat} from '../../royale/costume-catalog.mjs';
import {matchingFireballBonus} from '../../royale/power-armor.mjs';
import {matchingSteelBonus} from '../../royale/steel-armor.mjs';
import {matchingRootsBonus} from '../../royale/roots-armor.mjs';
import {matchingStrengthBonus} from '../../royale/strength-armor.mjs';
import {matchingWhirlwindBonus} from '../../royale/whirlwind-armor.mjs';
import {matchingSuperKickBonus} from '../../royale/super-kick-armor.mjs';
import {matchingSpeedBonus} from '../../royale/speed-armor.mjs';
import {matchingFlightBonus} from '../../royale/flight-armor.mjs';

const powers={
 strength:['Super Strength',matchingStrengthBonus],superKick:['Super Kick',matchingSuperKickBonus],
 fireball:['Fireball',matchingFireballBonus],steel:['Steel Body',matchingSteelBonus],
 roots:['Ground Roots',matchingRootsBonus],whirlwind:['Whirlwind',matchingWhirlwindBonus],
 speed:['Speed',matchingSpeedBonus],flight:['Flight',matchingFlightBonus]
};
const levelKeys=Object.keys(powers).map(id=>id+'Levels');
export function armorLevelBonuses(game,inventory,level=game.hero.level){
 return Object.fromEntries(Object.entries(powers).map(([id,[,matching]])=>[
  id+'Levels',game.powers.data.levels[id]>0?matching(inventory,level):0
 ]));
}
export const armorStatKeys=(before={},after={})=>[...levelKeys.filter(key=>before[key]||after[key]),...STAT_KEYS];
export const armorStatLabel=key=>STAT_LABELS[key]||powers[key.slice(0,-6)]?.[0]+' armor levels';
export const appliedBonusSummary=stats=>armorStatKeys(stats).filter(key=>stats[key]).map(key=>`${armorStatLabel(key)} +${formatStat(key,stats[key])}`).join(' · ')||'No stat bonuses';
