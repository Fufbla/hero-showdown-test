import {boardIndex,regionCamps} from '../../royale/world.mjs';
import {regionPortals,boardPortals,travelQuote} from './portal-layout.mjs';
export const travelMethods={
 fastTravel(destination,revision){
  const quote=travelQuote(this,destination);
  if(!quote||revision!==this.economy.revision||!this.canTravel()||this.hero.coins<quote.cost)return false;
  const {region,board,legendary,cost}=quote;
  if(legendary){
   const firstEvent=this.events.length;
   if(!this.enterLegendary(legendary))return false;
   // Charge only successful entry, then update its already-created entry
   // checkpoint before any consumer can persist it. Retries cannot refund travel.
   this.hero.coins-=cost;this.recordEconomy('purchase',-cost);
   for(const event of this.events.slice(firstEvent))if(event.type==='boss-entry'&&event.snapshot){
    const saved=JSON.parse(event.snapshot);saved.coins=this.hero.coins;saved.economy=structuredClone(this.economy);event.snapshot=JSON.stringify(saved);
   }
  }else{
   if(!this.arenaScene&&region===this.regionId&&board===boardIndex(this.hero.x))return false;
   const camp=regionCamps(region)[board];
   if(this.loadRegion(region,{x:camp.x,y:camp.y})===false)return false;
   this.checkpoint=board;this.world.checkpoint={region,index:board};
   const key=`${region}:${board}`;if(!this.world.activated.includes(key))this.world.activated.push(key);
   this.hero.coins-=cost;this.recordEconomy('purchase',-cost);
   this.portalPickupGuard={region,x:this.hero.x,y:this.hero.y};
  }
  this.emit('fast-travel',{coins:cost});return true;
 },
 portalTravel(id,revision){return this.nearPortal()?this.fastTravel({region:id,board:0},revision):false;},
 // Retained command name for old clients; never a free teleport bypass.
 travel(id,revision){return this.fastTravel({region:id,board:0},revision);},
 usePassage(){
  if(!this.canTravel()||!this.hero.grounded||this.arenaScene)return false;
  const candidates=regionPortals(this.regionId).filter(p=>p.kind==='passage'&&Math.hypot(this.hero.x-p.x,this.hero.y-p.y)<=90).sort((a,b)=>Math.abs(this.hero.x-a.x)-Math.abs(this.hero.x-b.x));
  const p=candidates.find(p=>p.id===this.interactionTarget)||candidates[0];if(!p)return false;
  const d=p.destination;
  if(d.boss)return this.enterBoss();
  if(d.hub){this.emit('tree');return true;}
  if(!this.world.unlocked.includes(d.region))return false;
  const landing=boardPortals(d.region,d.board).find(p=>p.role===(d.side==='exit'?'exit':'entrance'));
  const x=landing.x+(d.side==='exit'?-110:110);
  if(this.loadRegion(d.region,{x,y:600})===false)return false;
  this.checkpoint=d.board;this.world.checkpoint={region:d.region,index:d.board};
  const key=`${d.region}:${d.board}`;if(!this.world.activated.includes(key))this.world.activated.push(key);
  this.portalPickupGuard={region:d.region,x,y:600};return true;
 },
};
