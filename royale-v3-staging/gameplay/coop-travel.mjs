import {travelQuote} from './portal-layout.mjs';

// Preserve shared legendary encounters while charging every participating hero.
// Validate the whole party before the existing leader-entry operation mutates it.
export function sharedLegendaryTravel(session,id,revisions){
 const active=[...session.active],quotes=active.map(i=>travelQuote(session.games[i],{legendary:id}));
 if(!revisions||active.some((i,n)=>{
  const g=session.games[i],quote=quotes[n];
  return !quote||revisions[i]!==g.economy.revision||g.hero.coins<quote.cost||g.hero.level!==99||!g.legendaryStorageReady||g.arenaScene||!g.canTravel()||!g.hero.grounded||!g.legendary.defeated[id]&&!g.powers.data.equipped.some(p=>p&&g.powers.data.levels[p]);
 }))return {ok:false,error:'Every active hero needs 3,500 coins, level 99, a usable power and a current travel confirmation.'};
 const leader=session.heroes[session.leader],firstEvent=leader.game.events.length;
 const result=session.authority.command(leader.owner,leader.id,leader.commandSeq+1,'enterLegendary',[id]);
 if(result===false||result?.ok===false)return result;
 for(const i of active)if(i!==session.leader)session.followLeader(i);
 for(let n=0;n<active.length;n++){
  const g=session.games[active[n]],cost=quotes[n].cost;
  g.hero.coins-=cost;g.recordEconomy('purchase',-cost);g.emit('fast-travel',{coins:cost});
 }
 for(const event of leader.game.events.slice(firstEvent))if(event.type==='boss-entry'&&event.snapshot){
  const snapshot=JSON.parse(event.snapshot);snapshot.coins=leader.game.hero.coins;snapshot.economy=structuredClone(leader.game.economy);event.snapshot=JSON.stringify(snapshot);
 }
 session.authority.commit();session.setPaused(session.paused);return true;
}
