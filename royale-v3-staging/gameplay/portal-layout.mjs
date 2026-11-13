import {boardIndex,regionCamps,regionSpawns,TYPES,WORLD_REGIONS,GATES} from '../../royale/world.mjs';
import {LEGENDARY} from '../../royale/legendary-data.mjs';
import {travelCoins} from './economy.mjs';
// Boards are the three existing sections of each continuous region. All portal
// anchors sit on existing ground; no surfaces or environmental art are changed.
export function boardPortals(region,board){
 if(!WORLD_REGIONS.some(r=>r.id===region)||![0,1,2].includes(board))return [];
 const camp=regionCamps(region)[board];
 const entry=[GATES.back,2000,4080][board],boss=[1640,3720,GATES.arena][board],exit=[1860,3940,GATES.forward][board];
 const previous=board>0?{region,board:board-1,side:'exit'}:region>1?{region:region-1,board:2,side:'exit'}:{hub:true};
 const next=board<2?{region,board:board+1,side:'entry'}:region<7?{region:region+1,board:0,side:'entry'}:{hub:true};
 return [
  {id:`entry-${board}`,role:'entrance',kind:'passage',x:entry,y:600,label:'Entrance · Previous path',destination:previous},
  {id:`portal-${board}`,role:'fast-travel',kind:'portal',x:camp.x+90,y:camp.y,label:'Fast Travel · Coins required'},
  {id:`arena-${board}`,role:'boss',kind:'passage',x:boss,y:600,label:'Boss Entrance',destination:{boss:true}},
  {id:`exit-${board}`,role:'exit',kind:'passage',x:exit,y:600,label:'Exit · Next path',destination:next},
 ];
}
export const regionPortals=region=>[0,1,2].flatMap(board=>boardPortals(region,board));
// A destination board can contain several levels. Quote its highest actual
// resident monster level so every region's price reflects its full difficulty.
const levels=new Map();
export function destinationLevel(region,board=0){
 if(!WORLD_REGIONS.some(r=>r.id===region)||![0,1,2].includes(board))return null;
 const key=region+':'+board;
 if(!levels.has(key))levels.set(key,Math.max(...regionSpawns(region).filter(([,x])=>boardIndex(x)===board).map(([type])=>TYPES[type].level)));
 return levels.get(key);
}
export function travelQuote(g,destination){
 const {region,board=0,legendary}=destination||{};
 if(legendary){const d=LEGENDARY[legendary];return d&&g.world.unlocked.includes(d.region)?{level:99,cost:travelCoins(99),legendary}:null;}
 const level=destinationLevel(region,board);
 return level&&g.world.unlocked.includes(region)?{region,board,level,cost:travelCoins(level)}:null;
}
