// Stable catalog IDs are save references. Never reuse an ID for different colors or stats.
export const COSTUME_PARTS = ['helmet', 'chest', 'boots'];
export const COSTUME_WEIGHTS = Object.freeze({helmet: .33, chest: .33, boots: .34});
export const STAT_KEYS = ['strength','damage','defense','moveSpeed','attackSpeed','fireball','roots','whirlwind'];
export const STAT_LABELS = {strength:'Physical strength',damage:'Physical damage',defense:'Damage reduction',moveSpeed:'Running speed',attackSpeed:'Attack speed',fireball:'Fireball damage',roots:'Root damage per tick',whirlwind:'Wind damage per tick'};
export const PERCENT_STATS = new Set(['defense','moveSpeed','attackSpeed']);
export const LEGENDARY_POLICY = Object.freeze({enabled:false,rarity:'legendary',glow:'#65ff7a',sellable:false,requiredPieces:3,fourthSlot:3,cooldownMultiplier:.5,discardIsPermanent:true,reearnable:false});
const rows = [
  ['shore', 'Shore Guardian', 1, 1, '#368a89','#edc77d','wave'],
  ['beacon', 'Beacon Knight', 10, 1, '#365d87','#f0d8a0','shield'],
  ['briar', 'Briar Warden', 20, 2, '#557c4b','#d9b99a','leaf'],
  ['foundry', 'Foundry Sentinel', 30, 3, '#637b8c','#e8a46f','bolt'],
  ['cavern', 'Cavern Ranger', 40, 4, '#765990','#c7e3a4','star'],
  ['crystal', 'Crystal Keeper', 50, 4, '#3f8b94','#d4e9ee','shield'],
  ['wild', 'Wild Protector', 60, 5, '#956b88','#efd58d','leaf'],
  ['aether', 'Aether Watcher', 70, 6, '#5969a7','#c7bce5','sun'],
  ['nova', 'Nova Defender', 80, 6, '#ba7650','#eee3ae','bolt'],
  ['vanguard', 'Vanguard Hero', 90, 7, '#a95b59','#ecd493','star'],
  ['horizon', 'Horizon Champion', 99, 7, '#334d66','#f4d790','sun'],
];
const rounded=n=>Number(n.toFixed(4));
export const COSTUME_SETS=Object.freeze(Object.fromEntries(rows.map(([id,name,level,region,color,accent,emblem],index)=>{
  const value=150+index*210,stats={strength:6+index*4,damage:3+index*2,defense:rounded(.025+index*.012),moveSpeed:rounded(.02+index*.008),attackSpeed:rounded(.015+index*.009),fireball:3+index*3,roots:rounded(index*.6),whirlwind:rounded(index*.8)};
  return [id,{id,name,level,region,color,accent,emblem,value,stats}];
})));
export const COSTUME_CATALOG=Object.freeze(Object.fromEntries(Object.values(COSTUME_SETS).flatMap(set=>['ordinary',...(set.region>=4?['rare']:[])].flatMap(rarity=>COSTUME_PARTS.map((part,index)=>{
  const rare=rarity==='rare',id=`eris-${set.id}-${rarity}-${part}`,weight=COSTUME_WEIGHTS[part],value=part==='boots'?set.value-2*Math.floor(set.value*.33):Math.floor(set.value*.33);
  return [id,{id,setId:`${set.id}-${rarity}`,setName:`${rare?'Radiant ':''}${set.name}`,name:`${rare?'Radiant ':''}${set.name} ${part==='chest'?'Chest Piece':part==='helmet'?'Helmet':'Boots'}`,part,region:set.region,rarity,level:set.level,color:set.color,accent:set.accent,emblem:set.emblem,style:index,weight,catalogValue:rare?value*2:value,shop:!rare,sellable:true,stats:Object.fromEntries(STAT_KEYS.map(k=>{const total=rounded(set.stats[k]*(rare?1.35:1)),third=rounded(total*.33);return [k,part==='boots'?rounded(total-2*third):third];}))}];
})))));
export const DROP_SETS={1:'shore',2:'briar',3:'foundry',4:'cavern',5:'wild',6:'aether',7:'vanguard'};
// Region is the drop origin. Higher-level drops can be kept and previewed until their required level.
export function costumeDrop(region,rarity,index,serial){
  if(rarity==='rare'&&region<4)return null;
  const set=DROP_SETS[region];
  const catalogId=`eris-${set}-${rarity}-${COSTUME_PARTS[Math.abs(Math.floor(index))%3]}`;
  return COSTUME_CATALOG[catalogId]?{uid:`drop-${serial}`,catalogId}:null;
}
export function formatStat(key,value){return `${Number((value*(PERCENT_STATS.has(key)?100:1)).toFixed(3))}${PERCENT_STATS.has(key)?'%':''}`;}
export const resaleValue=def=>def?.rarity==='legendary'||def?.sellable===false?null:Math.floor((def?.catalogValue||0)*.25);
