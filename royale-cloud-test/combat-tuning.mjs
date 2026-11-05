// Solo balance revision. Timing, target milestones and item bonuses live in their
// existing systems; only innate attack damage is tuned here.
export const BASIC_GROWTH=Object.freeze({punch:.18,kick:.25});
const MASTERY=Object.freeze({strength:6,superKick:4.5,fireball:3,roots:14,whirlwind:12});
const HERO_GROWTH=Object.freeze({strength:0,superKick:0,fireball:2,roots:.45,whirlwind:.6});
export function offensiveDamage(id,innate,effectiveLevel,heroLevel){
 const learnedBand=Math.max(0,Math.min(19,effectiveLevel-1));
 const heroMastery=.35+.65*Math.min(1,Math.max(0,heroLevel-1)/98);
 return (innate+HERO_GROWTH[id]*Math.max(0,heroLevel-1))*(1+(MASTERY[id]-1)*learnedBand/19*heroMastery);
}
