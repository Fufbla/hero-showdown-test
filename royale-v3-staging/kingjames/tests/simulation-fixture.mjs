import {Game,STEP} from '../../../royale/core.mjs';
import {PowerSystem,normalizePowers,powerStats,POWER_IDS} from '../../../royale/powers.mjs';
export function record(){
 const ids=['strength','superKick','fireball','flight','steel','roots','speed','whirlwind'];
 const stats=ids.map(id=>Array.from({length:20},(_,i)=>powerStats(id,i+1,{heroLevel:44,equipment:{moveSpeed:.1,attackSpeed:.1,defense:.2}})));
 const g=new Game({random:()=>.2});g.enemies=[];g.hero.level=99;
 const levels=Object.fromEntries(POWER_IDS.map(id=>[id,['steel','flight','strength','superKick'].includes(id)?15:id==='speed'?20:0]));
 g.powers=new PowerSystem(g,normalizePowers({levels,equipped:['steel','flight','strength']},99));
 const trace=[];
 for(let i=0;i<240;i++){
  if(i===5)g.powers.activate('steel');
  g.step(STEP,{move:i<60?1:i<120?-1:0,run:true,jump:i===20||i===32,punch:i===130,kick:i===155});
  const h=g.hero;trace.push([h.x,h.y,h.vx,h.vy,h.jumps,h.grounded,h.w,h.h,h.attack?.kind,h.attack?.age,g.powers.speed,g.powers.attackRate]);
 }
 const duration=g.powers.stats('steel').duration,reduction=g.powers.incoming(100,{});
 return {stats,trace,duration,reduction,attack:g.attackDefinition('punch')};
}
if(process.argv[1]?.endsWith('simulation-fixture.mjs'))console.log(JSON.stringify(record()));
