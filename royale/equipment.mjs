import { MERGE_CATALOG } from './legendary-data.mjs';
import { COSTUME_CATALOG, COSTUME_PARTS, STAT_KEYS, costumeDrop } from './costume-catalog.mjs';
import { LOOT } from './progression.mjs';
import { STARTER_OUTFIT } from './appearance.mjs';
export const LEGACY_PARTS=['mask','suit','gloves','boots','belt','cape','emblem'];
export const EQUIPMENT_PARTS=[...new Set([...COSTUME_PARTS,...LEGACY_PARTS])];
export const EQUIPMENT_NAMES={helmet:'Helmet',chest:'Chest piece',mask:'Mask',suit:'Suit',gloves:'Gauntlets',boots:'Boots',belt:'Belt',cape:'Cape',emblem:'Emblem'};
const themes=[null,['Shore','#327f86','#f0bd70'],['Briar','#60743e','#ddb380'],['Foundry','#657c8c','#da8a58'],['Cavern','#796196','#bbd484'],['Wild','#936381','#e4c883'],['Aether','#52649b','#bcafe1'],['Vanguard','#b96354','#f4c777']];
export const GLOW=Object.freeze({ordinary:null,rare:'#ffffff',legendary:'#65ff7a'});
const legacyCatalog=Object.fromEntries(themes.flatMap((theme,region)=>!theme?[]:['ordinary',...(region>=4?['rare']:[])].flatMap(rarity=>LEGACY_PARTS.map((part,i)=>{
  const id=`r${region}-${rarity}-${part}`,rare=rarity==='rare',factor=rare?1.6:1;
  return [id,{id,region,rarity,part,legacy:true,level:1,catalogValue:100*region*(rare?2:1),sellable:true,name:`${rare?'Radiant ':''}${theme[0]} ${EQUIPMENT_NAMES[part]}`,color:theme[1],accent:theme[2],stats:{strength:Math.round(region*(i===2?6:2)*factor),damage:Math.round(region*(i===3?7:3)*factor),attackSpeed:(i===4||i===6)?Number((region*.005*factor).toFixed(3)):0}}];
}))));
export const EQUIPMENT=Object.freeze({...legacyCatalog,...COSTUME_CATALOG,...MERGE_CATALOG});
export function createEquipment(region,rarity,index=0,serial=1){
  const part=LEGACY_PARTS[Math.max(0,Math.min(6,Math.floor(index)))],catalogId=`r${region}-${rarity}-${part}`;
  return EQUIPMENT[catalogId]?{uid:`drop-${serial}`,catalogId}:null;
}
export const itemDefinition=item=>EQUIPMENT[item?.catalogId];
export function normalizeInventory(raw={}){
  // Unclaimed rewards are a queue, not carried equipment. Long battles must not
  // invalidate an otherwise valid save merely because more than 32 drops await review.
  if(!raw||typeof raw!=='object'||!Array.isArray(raw.items)||raw.items.length>7||!Array.isArray(raw.pending))return null;
  const ids=new Set(),valid=item=>{
    if(!item||!Object.hasOwn(EQUIPMENT,item.catalogId)||typeof item.uid!=='string'||!/^drop-\d+$/.test(item.uid)||ids.has(item.uid)||!Number.isSafeInteger(Number(item.uid.slice(5)))||Number(item.uid.slice(5))>=1e9)return false;
    ids.add(item.uid);return true;
  };
  if(!raw.items.every(valid)||!raw.pending.every(valid))return null;
  const items=raw.items.map(({uid,catalogId})=>({uid,catalogId})),pending=raw.pending.map(({uid,catalogId})=>({uid,catalogId})),equipped={};
  for(const part of EQUIPMENT_PARTS){const uid=raw.equipped?.[part];if(uid){const item=items.find(i=>i.uid===uid);if(!item||itemDefinition(item).part!==part)return null;equipped[part]=uid;}}
  if(equipped.helmet&&equipped.mask||equipped.chest&&equipped.suit)return null;
  const maxId=Math.max(0,...[...items,...pending].map(i=>Number(i.uid.slice(5))));
  const retired=raw.retired??{};if(!retired||typeof retired!=='object'||Array.isArray(retired)||Object.entries(retired).some(([id,reason])=>!/^drop-\d+$/.test(id)||!['sold','discarded'].includes(reason)||ids.has(id)||!Number.isSafeInteger(Number(id.slice(5)))||Number(id.slice(5))>=1e9))return null;
  const highest=Math.max(maxId,...Object.keys(retired).map(id=>Number(id.slice(5))));
  return {items,pending,equipped,retired:{...retired},nextId:Math.max(highest+1,Math.min(1e9,Math.floor(Number(raw.nextId)||1)))};
}
export const emptyInventory=()=>({items:[],pending:[],equipped:{},retired:{},nextId:1});
export function equipmentBonuses(inventory,level=99){
  const sum=Object.fromEntries(STAT_KEYS.map(k=>[k,0]));
  for(const uid of Object.values(inventory.equipped)){const item=inventory.items.find(i=>i.uid===uid),def=itemDefinition(item);if(def&&level>=(def.level||1))for(const key of STAT_KEYS)sum[key]+=def.stats[key]||0;}
  return Object.fromEntries(Object.entries(sum).map(([k,v])=>[k,Number(v.toFixed(4))]));
}
export function equipmentOutfit(inventory,fallback=STARTER_OUTFIT){
  const pieces={};for(const [part,uid] of Object.entries(inventory.equipped)){const def=itemDefinition(inventory.items.find(i=>i.uid===uid));if(def)pieces[part]=def;}
  if(pieces.helmet)pieces.mask=pieces.helmet;
  if(pieces.chest){pieces.suit=pieces.chest;pieces.emblem={...pieces.chest,color:pieces.chest.accent};}
  return {...fallback,pieces};
}
export function rollEquipment(region,random,serial){
  const roll=random(),rare=LOOT.rareChance[region]||0;
  const rarity=roll<rare?'rare':roll<rare+LOOT.ordinaryChance?'ordinary':null;
  return rarity?costumeDrop(region,rarity,Math.floor(random()*3),serial):null;
}
