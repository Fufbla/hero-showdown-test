// Generate narrow staging overrides from the unchanged shared implementation.
// Run after the existing costume/armor builders. Fail loudly on changed anchors.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const write=(p,s)=>fs.writeFileSync(path.join(root,p),s);
const shared=s=>s.replace(/((?:from\s*|import\s*\()\s*['"])\.\//g,'$1../../royale/');
const replace=(s,a,b)=>{if(!s.includes(a))throw Error('Economy source changed: '+a.slice(0,100));return s.replace(a,b);};
let journey=shared(read('royale/journey.mjs'));
journey="import {monsterCoins} from './economy.mjs';\n"+journey;
journey=replace(journey,"coins=regular&&!summoned?(this.clock().night?2:1):0","coins=regular&&!summoned?monsterCoins(e.level??info.level):0");
const start=journey.indexOf('    let root=false,item=null;'),end=journey.indexOf("    this.emit('reward'",start);
if(start<0||end<0)throw Error('Missing loot boundary');
journey=journey.slice(0,start)+'    const root=false,item=null; // Regular monsters award coins and unchanged XP only.\n'+journey.slice(end);
write('royale-v3-staging/gameplay/journey.mjs',journey);

let data=shared(read('royale/boss-data.mjs'));
data=replace(data,'({region,name,level,hp,damage,speed,helper,patterns,art,xp:', '({region,name,level,hp:hp*2,damage,speed,helper,patterns,art,xp:');
// Legendary HP derives from the final regional boss, so it doubles exactly once.
write('royale-v3-staging/gameplay/boss-data.mjs',data);
let state=shared(read('royale/boss-state.mjs'));
state="import {bossChestCoins} from './economy.mjs';\nimport {BOSSES} from '../../royale/boss-data.mjs';\n"+state;
state=replace(state,'c.coins>100','c.coins>Math.max(100,bossChestCoins(BOSSES[region].level))');
state=replace(state,"records[region]={wins:r.wins,chest:{state:c.state,coins:c.coins,roots:c.roots,items:c.items.map(i=>normalizeEquipmentItem(i,{allowRetired:legacy}))}};",`if(c.rewardVersion!==undefined&&c.rewardVersion!==1)return null;
    // Older victories already paid 100 coins immediately. Convert only still
    // unclaimed chests, deducting that payment. Claimed/legacy eligibility stays closed.
    const available=c.state==='available',coins=available&&c.rewardVersion!==1?Math.max(0,bossChestCoins(BOSSES[region].level)-100):c.coins;
    records[region]={wins:r.wins,chest:{state:c.state,coins,roots:available?0:c.roots,items:available?[]:c.items.map(i=>normalizeEquipmentItem(i,{allowRetired:legacy})),...(available||c.rewardVersion===1?{rewardVersion:1}:{})}};`);
const a=state.indexOf('export function rollChest('),b=state.indexOf('export function normalizeArena(',a);
state=state.slice(0,a)+`export function rollChest(region){
  return {state:'available',coins:bossChestCoins(BOSSES[region].level),roots:0,items:[],rewardVersion:1};
}
`+state.slice(b);
write('royale-v3-staging/gameplay/boss-state.mjs',state);
let bosses=shared(read('royale/bosses.mjs'));
bosses=replace(bosses,'this.hero.coins=Math.min(999999,this.hero.coins+reward.coins);const xp=',`// First-defeat coins live only in the individually claimable chest.
    // Preserve the existing 10-coin repeat-victory reward.
    reward.coins=reward.first?0:reward.coins;
    this.hero.coins=Math.min(999999,this.hero.coins+reward.coins);const xp=`);
write('royale-v3-staging/gameplay/bosses.mjs',bosses);
const mappings={'journey.mjs':'journey.mjs','boss-data.mjs':'boss-data.mjs','boss-state.mjs':'boss-state.mjs','bosses.mjs':'bosses.mjs'};
for(const [file,basePath]of [['index.html','/royale-v3-staging/'],['kingjames/index.html','/royale/'],['gameplay/index.html','/royale/'],['local-coop/index.html','/royale/local-coop/']]){
 const dest='royale-v3-staging/'+file;
 let html=read(dest).replace(/<script type="importmap">([\s\S]*?)<\/script>/,(_,raw)=>{
  const m=JSON.parse(raw),base=new URL(basePath,'https://build.invalid');
  for(const [source,target]of Object.entries(mappings)){
   const sourcePath='/royale/'+source,targetPath='/royale-v3-staging/gameplay/'+target;
   const relative=p=>{const r=path.posix.relative(basePath,p);return r.startsWith('.')?r:'./'+r;};
   const dest=relative(targetPath)+'?v=economy-1';
   for(const [key,value]of Object.entries(m.imports))if(new URL(key,base).pathname===sourcePath||new URL(value,base).pathname===sourcePath||new URL(value,base).pathname===targetPath){m.imports[key]=dest;if(new URL(value,base).pathname===sourcePath)m.imports[value]=dest;}
   m.imports[relative(sourcePath)]=dest;
  }
  return '<script type="importmap">'+JSON.stringify(m)+'</script>';
 });write(dest,html);
}
console.log('Built staging economy: exact monster coins, double boss HP, first-defeat coin chests.');
