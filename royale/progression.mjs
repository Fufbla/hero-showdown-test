// Phase 4 tuning is deliberately data-driven. XP is the cost of reaching the next level.
export const PROGRESSION = Object.freeze({ cap:99, base:50, linear:28, quadratic:4, lateStart:69, lateSpan:29, lateWeight:3, defeatFraction:.10, combatGrace:5 });
export function xpForLevel(level, curve=PROGRESSION){
  const l=Math.max(1,Math.min(curve.cap,Math.floor(level)||1)),n=l-1;
  return Math.round((curve.base+curve.linear*n+curve.quadratic*n*n)*(1+curve.lateWeight*(Math.max(0,l-curve.lateStart)/curve.lateSpan)**2));
}
export const maximumHP=level=>100+15*(level-1);
export function xpMultiplier(heroLevel,monsterLevel){
  const gap=heroLevel-monsterLevel;
  return gap<=3?1:gap<=6?.75:gap<=10?.35:gap<=15?.1:0;
}
export const monsterXP=(base,heroLevel,monsterLevel)=>Math.max(0,Math.floor(base*xpMultiplier(heroLevel,monsterLevel)));
export const CLOCK=Object.freeze({day:30*60*1000,night:10*60*1000});
export function worldClock(reference,now=Date.now(),region=1){
  if(region<=2)return {night:false,remaining:null,phase:'Permanent day'};
  const phase=Math.max(0,now-reference)%(CLOCK.day+CLOCK.night),night=phase>=CLOCK.day;
  return {night,remaining:Math.ceil(((night?CLOCK.day+CLOCK.night:CLOCK.day)-phase)/1000),phase:night?'Night':'Day'};
}
export function formatClock(clock){
  if(clock.remaining===null)return 'Permanent day';
  return `${clock.night?'☾':'☀'} ${clock.phase} · ${Math.floor(clock.remaining/60)}:${String(clock.remaining%60).padStart(2,'0')}`;
}
export const LOOT=Object.freeze({rootChance:.10,rootPrice:50,rootLimit:4,ordinaryChance:.12,rareChance:[0,0,0,0,.07,.08,.09,.10],inventoryLimit:7});
export const RESPAWN=Object.freeze({common:18,strong:36,elite:150,safeDistance:160});
// A Phase 5 encounter coordinator will call this after a verified victory. No battle is fabricated here.
export function bossVictory(world,region){
  if(!Number.isInteger(region)||region<1||region>7||!world.unlocked.includes(region))return {ok:false};
  const first=!world.bossVictories.includes(region);
  if(first)world.bossVictories.push(region);
  if(region<7&&!world.unlocked.includes(region+1))world.unlocked.push(region+1);
  return {ok:true,first,coins:first?100:10};
}
