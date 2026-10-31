import { LOOT } from './progression.mjs';
import { STARTER_OUTFIT } from './appearance.mjs';
export const EQUIPMENT_PARTS=['mask','suit','gloves','boots','belt','cape','emblem'];
export const EQUIPMENT_NAMES={mask:'Mask',suit:'Suit',gloves:'Gauntlets',boots:'Boots',belt:'Belt',cape:'Cape',emblem:'Emblem'};
const themes=[null,['Shore','#327f86','#f0bd70'],['Briar','#60743e','#ddb380'],['Foundry','#657c8c','#da8a58'],['Cavern','#796196','#bbd484'],['Wild','#936381','#e4c883'],['Aether','#52649b','#bcafe1'],['Vanguard','#b96354','#f4c777']];
export const GLOW=Object.freeze({ordinary:null,rare:'#ffffff',legendary:'#65ff7a'}); // Legendary rendering contract only; no Legendary catalog.
export const EQUIPMENT=Object.freeze(Object.fromEntries(themes.flatMap((theme,region)=>!theme?[]:['ordinary',...(region>=4?['rare']:[])].flatMap(rarity=>EQUIPMENT_PARTS.map((part,i)=>{
  const id=`r${region}-${rarity}-${part}`,rare=rarity==='rare',factor=rare?1.6:1;
  return [id,{id,region,rarity,part,name:`${rare?'Radiant ':''}${theme[0]} ${EQUIPMENT_NAMES[part]}`,color:theme[1],accent:theme[2],stats:{strength:Math.round(region*(i===2?6:2)*factor),damage:Math.round(region*(i===3?7:3)*factor),attackSpeed:(i===4||i===6)?Number((region*.005*factor).toFixed(3)):0}}];
})))));
export function createEquipment(region,rarity,index=0,serial=1){
  const part=EQUIPMENT_PARTS[Math.max(0,Math.min(6,Math.floor(index)))],catalogId=`r${region}-${rarity}-${part}`;
  return EQUIPMENT[catalogId]?{uid:`drop-${serial}`,catalogId}:null;
}
export const itemDefinition=item=>EQUIPMENT[item?.catalogId];
export function normalizeInventory(raw={}){
  if(!raw||typeof raw!=='object'||!Array.isArray(raw.items)||raw.items.length>7||!Array.isArray(raw.pending)||raw.pending.length>32)return null;
  const ids=new Set(),valid=item=>{
    if(!item||!Object.hasOwn(EQUIPMENT,item.catalogId)||typeof item.uid!=='string'||!/^drop-\d+$/.test(item.uid)||ids.has(item.uid))return false;
    ids.add(item.uid);return true;
  };
  if(!raw.items.every(valid)||!raw.pending.every(valid))return null;
  const items=raw.items.map(({uid,catalogId})=>({uid,catalogId})),pending=raw.pending.map(({uid,catalogId})=>({uid,catalogId})),equipped={};
  for(const part of EQUIPMENT_PARTS){const uid=raw.equipped?.[part];if(uid){const item=items.find(i=>i.uid===uid);if(!item||itemDefinition(item).part!==part)return null;equipped[part]=uid;}}
  const maxId=Math.max(0,...[...items,...pending].map(i=>Number(i.uid.slice(5))));
  return {items,pending,equipped,nextId:Math.max(maxId+1,Math.min(1e9,Math.floor(Number(raw.nextId)||1)))};
}
export const emptyInventory=()=>({items:[],pending:[],equipped:{},nextId:1});
export function equipmentBonuses(inventory){
  const sum={strength:0,damage:0,attackSpeed:0};
  for(const uid of Object.values(inventory.equipped)){const item=inventory.items.find(i=>i.uid===uid),def=itemDefinition(item);if(def)for(const key of Object.keys(sum))sum[key]+=def.stats[key];}
  return sum;
}
export function equipmentOutfit(inventory,fallback=STARTER_OUTFIT){
  const pieces={};for(const [part,uid] of Object.entries(inventory.equipped)){const def=itemDefinition(inventory.items.find(i=>i.uid===uid));if(def)pieces[part]=def;}
  return {...fallback,pieces};
}
export function rollEquipment(region,random,serial){
  const roll=random(),rare=LOOT.rareChance[region]||0;
  const rarity=roll<rare?'rare':roll<rare+LOOT.ordinaryChance?'ordinary':null;
  return rarity?createEquipment(region,rarity,Math.floor(random()*7),serial):null;
}
