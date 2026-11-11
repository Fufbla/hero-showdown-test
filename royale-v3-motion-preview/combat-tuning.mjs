// Solo combat tuning. Timing, target milestones, earned upgrades and item
// bonuses remain in their existing systems.
export const BASIC_GROWTH=Object.freeze({punch:.18,kick:.25});
// Enemy defense grows with late-game offensive mastery. Keep early-region
// durability and saved HP unchanged; every damage source uses this same armor.
export function monsterArmor(level){
 return 1+2*(Math.max(0,Math.min(99,level)-20)/70)**2;
}
// A smooth level disadvantage, never immunity. No bonus for overlevelling:
// stronger heroes already earn more health, equipment and offensive mastery.
export function levelDamageFactor(attackerLevel,defenderLevel){
 const gap=Math.max(0,defenderLevel-attackerLevel);
 return 1/(1+(gap/20)**2);
}
export function damageToEnemy(amount,heroLevel,enemy){
 const level=Number.isFinite(enemy.level)?enemy.level:heroLevel;
 const armor=enemy.boss||enemy.legendary||enemy.summoned?1:monsterArmor(level);
 return amount*levelDamageFactor(heroLevel,level)/armor;
}
export function damageToHero(amount,heroLevel,source){
 const gap=Number.isFinite(source.level)?Math.max(0,source.level-heroLevel):0;
 return amount*(1+gap/50);
}
const MASTERY=Object.freeze({strength:6,superKick:4.5,fireball:3,roots:14,whirlwind:12});
const HERO_GROWTH=Object.freeze({strength:0,superKick:0,fireball:2,roots:.45,whirlwind:.6});
export function offensiveDamage(id,innate,effectiveLevel,heroLevel){
 const learnedBand=Math.max(0,Math.min(19,effectiveLevel-1));
 const heroMastery=.35+.65*Math.min(1,Math.max(0,heroLevel-1)/98);
 return (innate+HERO_GROWTH[id]*Math.max(0,heroLevel-1))*(1+(MASTERY[id]-1)*learnedBand/19*heroMastery);
}
