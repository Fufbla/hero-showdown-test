import {boardIndex,regionCamps,regionSpawns,TYPES,WORLD_REGIONS,GATES} from '../../royale/world.mjs';
import {LEGENDARY} from '../../royale/legendary-data.mjs';
import {travelCoins} from './economy.mjs';
// Each of the seven phases is one continuous region with four portals total.
// Internal board indices remain only for terrain, checkpoints and existing saves.
export function regionPortals(region){
 if(!WORLD_REGIONS.some(r=>r.id===region))return [];
 const camp=regionCamps(region)[0];
 const previous=region>1?{region:region-1,board:2,side:'exit'}:{hub:true};
 const next=region<7?{region:region+1,board:0,side:'entry'}:{hub:true};
 return [
  {id:'entry-0',role:'entrance',kind:'passage',x:GATES.back,y:600,label:'Entrance · Previous phase',destination:previous},
  {id:'portal-0',role:'fast-travel',kind:'portal',x:camp.x+90,y:camp.y,label:'Fast Travel · Coins required'},
  {id:'arena-2',role:'boss',kind:'passage',x:GATES.arena,y:600,label:'Boss Entrance',destination:{boss:true}},
  {id:'exit-2',role:'exit',kind:'passage',x:GATES.forward,y:600,label:'Exit · Next phase',destination:next},
 ];
}
export const boardPortals=(region,board)=>regionPortals(region).filter(p=>boardIndex(p.x)===board);
// Prices reflect the whole destination phase; travel always lands at its start.
const levels=new Map();
export function destinationLevel(region,board=0){
 if(!WORLD_REGIONS.some(r=>r.id===region)||board!==0)return null;
 if(!levels.has(region))levels.set(region,Math.max(...regionSpawns(region).map(([type])=>TYPES[type].level)));
 return levels.get(region);
}
export function travelQuote(g,destination){
 const {region,board=0,legendary}=destination||{};
 if(legendary){const d=LEGENDARY[legendary];return d&&g.world.unlocked.includes(d.region)?{level:99,cost:travelCoins(99),legendary}:null;}
 const level=destinationLevel(region,board);
 return level&&g.world.unlocked.includes(region)?{region,board,level,cost:travelCoins(level)}:null;
}
