// Phase 4 tuning is deliberately data-driven. XP is the cost of reaching the next level.
export const PROGRESSION = Object.freeze({ cap:99, base:50, linear:28, quadratic:4, lateStart:69, lateSpan:29, lateWeight:3, defeatFraction:.02, combatGrace:5 });
export function xpForLevel(level, curve=PROGRESSION){
  const l=Math.max(1,Math.min(curve.cap,Math.floor(level)||1)),n=l-1;
  return Math.round((curve.base+curve.linear*n+curve.quadratic*n*n)*(1+curve.lateWeight*(Math.max(0,l-curve.lateStart)/curve.lateSpan)**2));
}
export const maximumHP=level=>100+15*(level-1);
export function xpMultiplier(heroLevel,monsterLevel){
  const gap=heroLevel-monsterLevel;
  // A small challenge above the hero remains fully rewarded. Distant-region
  // carries must not turn one kill into several early levels.
  if(gap < -7)return 1/(1+((-gap-7)/5)**2);
  return gap<=3?1:gap<=6?.75:gap<=10?.35:gap<=15?.1:0;
}
const XP_PACE=Object.freeze([[1,.25],[10,.09],[20,.055],[35,.04],[50,.034],[65,.03],[80,.03],[99,.038]].map(Object.freeze));
export function earnedXPRate(level){
  level=Math.max(1,Math.min(99,level));
  for(let i=1;i<XP_PACE.length;i++)if(level<=XP_PACE[i][0]){
    const [a,x]=XP_PACE[i-1],[b,y]=XP_PACE[i];return x+(y-x)*(level-a)/(b-a);
  }
}
// Adjust future earnings only: saved XP, level thresholds and Power Points stay
// compatible with existing cloud saves. No daily caps or waiting timers.
export const monsterXP=(base,heroLevel,monsterLevel)=>Math.max(0,Math.floor(base*xpMultiplier(heroLevel,monsterLevel)*earnedXPRate(heroLevel)));
export const CLOCK=Object.freeze({day:30*60*1000,night:10*60*1000});
export function worldClock(reference,now=Date.now(),region=1){
  // Every region shares the existing epoch and 30-minute day / 10-minute night.
  // A hero's starting region must not opt their account out of the cycle.
  const phase=Math.max(0,now-reference)%(CLOCK.day+CLOCK.night),night=phase>=CLOCK.day;
  return {night,remaining:Math.ceil(((night?CLOCK.day+CLOCK.night:CLOCK.day)-phase)/1000),phase:night?'Night':'Day'};
}
export function formatClock(clock){
  if(clock.remaining===null)return 'Permanent day';
  return `${clock.night?'☾':'☀'} ${clock.phase} · ${Math.floor(clock.remaining/60)}:${String(clock.remaining%60).padStart(2,'0')}`;
}
export const LOOT=Object.freeze({equipmentChance:.02,rootChance:.04,rootPrice:50,rootLimit:10,ordinaryChance:.12,rareChance:[0,0,0,0,.07,.08,.09,.10],inventoryLimit:20});
export function regularLootOutcome(roll){return roll<LOOT.equipmentChance?'equipment':roll<LOOT.equipmentChance+LOOT.rootChance?'root':null;}
export const RESPAWN=Object.freeze({common:18,strong:36,elite:150,safeDistance:160});
// A Phase 5 encounter coordinator will call this after a verified victory. No battle is fabricated here.
export function bossVictory(world,region){
  if(!Number.isInteger(region)||region<1||region>7||!world.unlocked.includes(region))return {ok:false};
  const first=!world.bossVictories.includes(region);
  if(first)world.bossVictories.push(region);
  if(region<7&&!world.unlocked.includes(region+1))world.unlocked.push(region+1);
  return {ok:true,first,coins:first?100:10};
}
