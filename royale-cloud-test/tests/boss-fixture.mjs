import { Game } from '../core.mjs';
import { BOSSES } from '../boss-data.mjs';
import { bossVictory, CLOCK } from '../progression.mjs';
import { PROFILE_KEY } from '../saves.mjs';
export const LOADOUTS={brawler:['strength','superKick','steel'],ranged:['fireball','flight','agility'],control:['roots','whirlwind','steel']};
export function bossFixture(region,loadout='brawler',night=false){
  const g=new Game({look:{name:'Boss Practice Hero',suit:'#325f77',trim:'#e4c979',capeColor:'#885b67'}}),level=BOSSES[region].level;
  for(let i=1;i<region;i++)bossVictory(g.world,i);g.travel(region);g.hero.level=level;g.hero.hp=g.hero.maxHp=100+15*(level-1);g.hero.coins=200;g.healthRoots=4;g.hero.x=5840;
  const ids=LOADOUTS[loadout],budget=level-1;let spent=0;for(let i=0;i<3;i++){const value=Math.min(20,Math.floor(budget*[.45,.3,.2][i]));g.powers.data.levels[ids[i]]=value;spent+=value;}
  g.powers.data.points=budget-spent;g.powers.data.equipped=ids;g.world.clockReference=Date.now()-(night?CLOCK.day+60000:0);g.pendingBossEntry={region,mode:'restart'};
  return JSON.parse(g.save());
}
export function saveBossFixture(session,region,loadout='brawler',night=false){
  const snapshot=bossFixture(region,loadout,night),prefix=`royale-test-${session}:`;
  sessionStorage.setItem(prefix+PROFILE_KEY,JSON.stringify({version:2,revision:0,activeSlot:0,legacyImported:true,slots:[{id:'boss-practice-only',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),lastRegion:`${BOSSES[region].name} Arena`,snapshot},null,null]}));
}
let requestSequence=0;
export function fixtureCommand(frame,action,value){
  const request=`boss-request-${Date.now()}-${++requestSequence}`;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{removeEventListener('message',handler);reject(Error('Fixture command timed out'));},15000);const handler=e=>{if(e.source===frame.contentWindow&&e.origin===location.origin&&e.data?.type==='royale-boss-fixture-result'&&e.data.request===request){clearTimeout(timer);removeEventListener('message',handler);resolve(e.data.state);}};addEventListener('message',handler);frame.contentWindow.postMessage({type:'royale-boss-fixture',request,action,value},location.origin);});
}
