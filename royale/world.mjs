// Coastal Beginnings is deliberately independent of Story/Versus world state.
export const WORLD_WIDTH = 6160;
export const DEATH_Y = 890;
export const REGIONS = [
  { x: 0, name: 'Sunwash Strand', note: 'A small beginning. A bigger adventure.' },
  { x: 1940, name: 'Driftwood Rise', note: 'Take the high road, or follow the shore.' },
  { x: 4020, name: 'Lighthouse Point', note: 'Every hero starts somewhere.' },
];
export const VERTICAL_TIERS = Object.freeze([480, 320, 160, 0]);
// Three staggered climbing circuits. Rises <=160 fit the approved double jump.
export const VERTICAL_ROUTES = [0,1940,4020].map((base,board)=>
  VERTICAL_TIERS.map((y,tier)=>({id:`climb-${board}-${tier+1}`,x:base+[430,780,1110,1440][tier],y,w:tier===3?340:330,h:28,kind:tier%2?'wood':'grass',oneWay:true,tier:tier+1,board})));
export const SURFACES = [
  { id: 'sand-a', x: 0, y: 600, w: 1390, h: 320, kind: 'sand' },
  { id: 'sand-b', x: 1540, y: 600, w: 1170, h: 320, kind: 'sand' },
  { id: 'sand-c', x: 2860, y: 600, w: 1260, h: 320, kind: 'sand' },
  { id: 'sand-d', x: 4270, y: 600, w: 1890, h: 320, kind: 'sand' },
  // Low, connected tide-pool routes make missed jumps forgiving.
  { id: 'pool-a', x: 1380, y: 664, w: 170, h: 256, kind: 'rock' },
  { id: 'pool-b', x: 2700, y: 664, w: 170, h: 256, kind: 'rock' },
  { id: 'pool-c', x: 4110, y: 664, w: 170, h: 256, kind: 'rock' },
  { id: 'p1', x: 420, y: 480, w: 230, h: 28, kind: 'grass', oneWay: true },
  { id: 'p2', x: 740, y: 370, w: 250, h: 28, kind: 'grass', oneWay: true },
  { id: 'p3', x: 1080, y: 455, w: 220, h: 24, kind: 'wood', oneWay: true },
  { id: 'p4', x: 1580, y: 470, w: 230, h: 28, kind: 'grass', oneWay: true },
  { id: 'p5', x: 1890, y: 355, w: 260, h: 26, kind: 'wood', oneWay: true },
  { id: 'p6', x: 2250, y: 265, w: 330, h: 30, kind: 'grass', oneWay: true },
  { id: 'p7', x: 2600, y: 445, w: 290, h: 24, kind: 'wood', oneWay: true },
  { id: 'p8', x: 3030, y: 480, w: 230, h: 28, kind: 'grass', oneWay: true },
  { id: 'p9', x: 3340, y: 355, w: 260, h: 28, kind: 'grass', oneWay: true },
  { id: 'p10', x: 3690, y: 445, w: 260, h: 24, kind: 'wood', oneWay: true },
  { id: 'p11', x: 4380, y: 480, w: 240, h: 28, kind: 'grass', oneWay: true },
  { id: 'p12', x: 4720, y: 365, w: 300, h: 26, kind: 'wood', oneWay: true },
  { id: 'p13', x: 5120, y: 470, w: 240, h: 28, kind: 'grass', oneWay: true },
];
// Side branches create alternate crossings and descending loops, not vertical stacks.
SURFACES.push(...VERTICAL_ROUTES.flat(), ...[0,1940,4020].flatMap((base,board)=>[
  {id:`branch-${board}-2`,x:base+1200,y:320,w:290,h:28,kind:'wood',oneWay:true,tier:2,board},
  {id:`branch-${board}-3`,x:base+1770,y:160,w:260,h:28,kind:'grass',oneWay:true,tier:3,board},
]));
export const CAMPS = [{ x: 160, y: 600, name: 'Shore camp' }, { x: 2340, y: 600, name: 'Driftwood camp' }, { x: 4370, y: 600, name: 'Lighthouse camp' }];
const COAST_TYPES = {
  bottle: { name: 'Bottle Critter', hp: 34, damage: 5, speed: 43, xp: 14, coins: 1, w: 34, h: 49, color: '#65d9c6' },
  slime: { name: 'Trash Slime', hp: 48, damage: 6, speed: 32, xp: 20, coins: 1, w: 53, h: 36, color: '#b1ce67' },
  crawler: { name: 'Sand Crawler', hp: 60, damage: 7, speed: 54, xp: 26, coins: 1, w: 49, h: 32, color: '#efaa66' },
};
const LEGACY_SPAWNS = [
  ['bottle', 600, 'sand-a'], ['bottle', 940, 'sand-a'], ['slime', 1230, 'sand-a'],
  ['bottle', 850, 'p2'], ['slime', 1700, 'sand-b'], ['crawler', 2010, 'sand-b'],
  ['bottle', 2460, 'sand-b'], ['slime', 2430, 'p6'], ['crawler', 3100, 'sand-c'],
  ['slime', 3500, 'sand-c'], ['bottle', 3890, 'sand-c'], ['bottle', 3470, 'p9'],
  ['crawler', 4620, 'sand-d'], ['slime', 4990, 'sand-d'], ['bottle', 5350, 'sand-d'],
  ['crawler', 5570, 'sand-d'], ['bottle', 4880, 'p12'],
];
// Keep the first 17 monster identities stable for old saves; relocate their homes.
const homes=[
 [600,'sand-a'],[900,'climb-0-2'],[1240,'climb-0-3'],[1580,'climb-0-4'],
 [1700,'sand-b'],[2500,'climb-1-1'],[2870,'climb-1-2'],[3170,'climb-1-3'],
 [3520,'climb-1-4'],[3500,'sand-c'],[3890,'sand-c'],[3810,'branch-1-3'],
 [4620,'sand-d'],[4580,'climb-2-1'],[4920,'climb-2-2'],[5250,'climb-2-3'],[5590,'climb-2-4'],
 [570,'climb-0-1'],[1370,'branch-0-2'],[1900,'branch-0-3'],
 [3300,'branch-1-2'],[5360,'branch-2-2'],[5910,'branch-2-3'],[5670,'sand-d'],
];
export const SPAWNS=homes.map(([x,surface],i)=>[LEGACY_SPAWNS[i]?.[0]||['crawler','slime','bottle'][i%3],x,surface]);
export const regionAt = x => [...REGIONS].reverse().find(r => x >= r.x) || REGIONS[0];

// Region IDs are stable save identifiers. Board boundaries remain physical, visible paths.
export const WORLD_REGIONS=[
  {id:1,name:'Coastal Beginnings',levels:[1,10],boss:'Trash Monster',theme:'coast',sky:['#83c0c9','#f6e3ad'],ground:'#c9aa6e',edge:'#f2dba0',accent:'#328b73',boards:REGIONS.map(b=>b.name),types:['bottle','slime','crawler']},
  {id:2,name:'Polluted Forest',levels:[11,20],boss:'Bushman',theme:'forest',sky:['#5f9290','#d4dbab'],ground:'#6c6650',edge:'#a6bc72',accent:'#48795c',boards:['Briar Approach','Sporewood Canopy','Hollow Clearing'],types:['sprout','mushroom','bark']},
  {id:3,name:'Industrial Wasteland',levels:[21,35],boss:'Wastelander',theme:'factory',sky:['#76818d','#ddbb9b'],ground:'#5f7480',edge:'#e7bd76',accent:'#9d6850',boards:['Scrapline Yard','Furnace Walk','Foundry Threshold'],types:['scrap','sludge','drone']},
  {id:4,name:'Toxic Underground',levels:[36,50],boss:'Giant Scorpion',theme:'cave',sky:['#38445c','#8b9f86'],ground:'#66637c',edge:'#c3b8d5',accent:'#b1ce67',boards:['Violet Descent','Acid Galleries','Scorpion Vault'],types:['scorpion','beetle','venomCrawler']},
  {id:5,name:'Mutated Territories',levels:[51,65],boss:'Venomis',theme:'mutant',sky:['#9b83a7','#d4bf9e'],ground:'#80627f',edge:'#deb0b0',accent:'#b5ce73',boards:['Overgrowth Verge','Twisted Wilds','Venomis Approach'],types:['thornBeast','stalker','spitter']},
  {id:6,name:'Dark Energy Realm',levels:[66,80],boss:'AtomDust',theme:'energy',sky:['#3c486d','#8e8cb1'],ground:'#545e88',edge:'#c8c4eb',accent:'#81b5cf',boards:['Fractured Horizon','Echo Causeway','AtomDust Seal'],types:['wisp','phantom','sentinel']},
  {id:7,name:'Final Showdown',levels:[81,99],boss:'Ultimate Pollution Boss',theme:'final',sky:['#8c666f','#d5ad8a'],ground:'#705e65',edge:'#e2c2aa',accent:'#cc9773',boards:['Last City Outskirts','Broken Boulevard','Final Gate'],types:['apocalypse','guardian','titan']},
];
const lineup=[
  ['sprout','Thorn Sprout',2,11,120,10,49,90,37,52,'#8baf65','lunge','common'],
  ['mushroom','Toxic Mushroom',2,15,180,14,24,125,51,48,'#bf8fbc','spore','common'],
  ['bark','Bark Crawler',2,20,250,18,65,175,57,34,'#a88960','skitter','strong'],
  ['scrap','Scrap Crawler',3,21,300,20,78,200,53,36,'#b4bdba','skitter','common'],
  ['sludge','Sludge Beast',3,28,420,28,38,280,65,55,'#95a85a','slam','strong'],
  ['drone','Rust Drone',3,35,550,35,68,360,53,45,'#c58756','bolt','strong'],
  ['scorpion','Cave Scorpion',4,36,650,40,80,410,58,40,'#b49aca','sting','common'],
  ['beetle','Acid Beetle',4,43,820,50,57,520,51,36,'#adc86d','acid','common'],
  ['venomCrawler','Venom Crawler',4,50,1000,60,104,650,61,32,'#a0b7bb','pounce','strong'],
  ['thornBeast','Thorn Beast',5,51,1200,65,75,720,70,58,'#b19d65','slam','common'],
  ['stalker','Mutant Stalker',5,58,1550,78,118,880,46,72,'#b18ea9','pounce','strong'],
  ['spitter','Poison Spitter',5,65,1900,90,57,1040,60,51,'#a7c879','spit','strong'],
  ['wisp','Shadow Wisp',6,66,2200,100,95,1160,38,47,'#9896cf','orb','common'],
  ['phantom','Energy Phantom',6,73,2850,120,110,1400,49,67,'#91bccc','phase','strong'],
  ['sentinel','Dark Sentinel',6,80,3500,140,66,1650,62,81,'#858fae','pulse','elite'],
  ['apocalypse','Apocalypse Mutant',7,81,4000,150,125,1800,59,66,'#c88b91','pounce','common'],
  ['guardian','Corrupted Guardian',7,90,5500,185,89,2250,66,83,'#afa2b5','volley','strong'],
  ['titan','Pollution Titan',7,99,7000,220,49,2800,81,95,'#b4a584','quake','elite'],
];
export const TYPES={
  ...Object.fromEntries(Object.entries(COAST_TYPES).map(([id,info],i)=>[id,{...info,region:1,level:[1,4,8][i],behavior:['lunge','hop','skitter'][i],rank:'common',peaceful:i<2}])),
  ...Object.fromEntries(lineup.map(([id,name,region,level,hp,damage,speed,xp,w,h,color,behavior,rank])=>[id,{name,region,level,hp,damage,speed,xp,w,h,color,behavior,rank,coins:1,flying:['drone','wisp','phantom'].includes(id)}])),
};
export const regionDefinition=id=>WORLD_REGIONS.find(r=>r.id===id)||WORLD_REGIONS[0];
export const boardIndex=x=>x>=4020?2:x>=1940?1:0;
export const boardAt=(region,x)=>({index:boardIndex(x),name:regionDefinition(region).boards[boardIndex(x)]});
export function regionSurfaces(id){
  const region=regionDefinition(id);
  // Retain legacy definitions for migration/tools, but replace their crowded
  // one-tier layout with the reachable circuits. Saved airborne positions remain valid.
  const result=SURFACES.filter(s=>!/^p\d+$/.test(s.id)).map(s=>({...s,kind:id===1?s.kind:s.kind==='wood'?(id===2||id===5?'wood':'metal'):region.theme}));
  if(id===4)result.push({id:'cave-roof',x:3040,y:-220,w:750,h:40,kind:'cave'});
  return result;
}
export const regionCamps=id=>CAMPS.map((c,i)=>({...c,name:id===1?c.name:`${regionDefinition(id).boards[i]} camp`}));
export function regionSpawns(id){
  if(id===1)return SPAWNS;
  const types=regionDefinition(id).types;
  return SPAWNS.map(([_,x,surface],i)=>[types[(i+Math.floor((LEGACY_SPAWNS[i]?.[1]??x)/1900))%3],x,surface]);
}
export const GATES=Object.freeze({back:44,arena:5840,forward:6070});
