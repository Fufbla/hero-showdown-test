// Generated staging presentation; all catalog, equipment and bonus rules remain shared.
import {armorFreeAppearance} from './armor-appearance.mjs';
import { MERGE_CATALOG } from '../../royale/legendary-data.mjs';
import {WARDROBE_CATALOG} from '../../royale/flight-armor.mjs';
import { COSTUME_PARTS, ARMOR_OUTFIT_PARTS, STAT_KEYS, costumeDrop } from '../../royale/costume-catalog.mjs';
import { LOOT } from '../../royale/progression.mjs';
import { STARTER_OUTFIT } from '../../royale/appearance.mjs';
import {validHelmetStats} from '../../royale/helmet-rolls.mjs';
export const LEGACY_PARTS=['mask','suit','gloves','boots','belt','cape','emblem'];
export {ARMOR_OUTFIT_PARTS} from '../../royale/costume-catalog.mjs';
const HISTORICAL_EQUIPMENT_PARTS=[...new Set([...COSTUME_PARTS,...LEGACY_PARTS])];
export const EQUIPMENT_PARTS=HISTORICAL_EQUIPMENT_PARTS.filter(part=>part!=='helmet'&&part!=='mask');
export const EQUIPMENT_NAMES={helmet:'Helmet',chest:'Chest piece',mask:'Mask',suit:'Suit',gloves:'Gauntlets',boots:'Boots',belt:'Belt',cape:'Cape',emblem:'Emblem'};
const themes=[null,['Shore','#327f86','#f0bd70'],['Briar','#60743e','#ddb380'],['Foundry','#657c8c','#da8a58'],['Cavern','#796196','#bbd484'],['Wild','#936381','#e4c883'],['Aether','#52649b','#bcafe1'],['Vanguard','#b96354','#f4c777']];
export const GLOW=Object.freeze({ordinary:null,rare:'#ffffff',legendary:'#65ff7a'});
const legacyCatalog=Object.fromEntries(themes.flatMap((theme,region)=>!theme?[]:['ordinary',...(region>=4?['rare']:[])].flatMap(rarity=>LEGACY_PARTS.map((part,i)=>{
  const id=`r${region}-${rarity}-${part}`,rare=rarity==='rare',factor=rare?1.6:1;
  return [id,{id,setName:`${rare?'Radiant ':''}${theme[0]} Legacy Outfit`,region,rarity,part,legacy:true,level:1,catalogValue:100*region*(rare?2:1),sellable:true,name:`${rare?'Radiant ':''}${theme[0]} ${EQUIPMENT_NAMES[part]}`,color:theme[1],accent:theme[2],stats:{strength:Math.round(region*(i===2?6:2)*factor),damage:Math.round(region*(i===3?7:3)*factor),attackSpeed:(i===4||i===6)?Number((region*.005*factor).toFixed(3)):0}}];
}))));
export const EQUIPMENT=Object.freeze({...legacyCatalog,...WARDROBE_CATALOG,...MERGE_CATALOG});
// Retired definitions are historical save references only. They are never
// selected by live rewards, purchases, equip actions, or visual loadouts.
const definition=value=>value?.catalogId?itemDefinition(value):value;
export const isRetiredHeadwear=value=>['helmet','mask'].includes(definition(value)?.part);
export const equipmentItemActive=value=>EQUIPMENT_PARTS.includes(definition(value)?.part);
export const armorOutfitKey=value=>{const def=definition(value);return def?.legacy?`legacy-r${def.region}-${def.rarity}`:def?.setId||null;};
export const itemDefinition=item=>{const def=EQUIPMENT[item?.catalogId];return def&&item.stats?{...def,stats:item.stats}:def;};
const familyDefinitions=setId=>Object.values(EQUIPMENT).filter(def=>armorOutfitKey(def)===setId);
const selectionKey=value=>typeof value==='string'?value:Array.isArray(value)?armorOutfitKey(value[0]):value?.setId||armorOutfitKey(value);
const wholeStats=new Map(),wholePrices=new Map();
export function armorOutfitStats(selection){
  const key=selectionKey(selection);
  if(!wholeStats.has(key))wholeStats.set(key,Object.fromEntries(STAT_KEYS.map(stat=>[stat,Number(familyDefinitions(key).reduce((n,d)=>n+(d.stats[stat]||0),0).toFixed(4))])));
  return {...wholeStats.get(key)};
}
export function armorOutfitPrice(selection){
  const key=selectionKey(selection);
  if(!wholePrices.has(key))wholePrices.set(key,familyDefinitions(key).reduce((n,d)=>n+(d.catalogValue||0),0));
  return wholePrices.get(key);
}
export function activeArmorShopDefinitions(selection){
  if(selection?.catalogId&&isRetiredHeadwear(EQUIPMENT[selection.catalogId]))return [];
  const key=selectionKey(selection),family=familyDefinitions(key);
  const defs=ARMOR_OUTFIT_PARTS.map(part=>family.find(d=>d.part===part&&d.shop));
  return defs.every(Boolean)?defs:[];
}
export function armorOutfitForItem(inventory,uid,level=99){
  const selected=inventory?.items?.find(i=>i.uid===uid),def=itemDefinition(selected),setId=armorOutfitKey(def);
  const requiredParts=def?.legacy?['suit','boots']:[...ARMOR_OUTFIT_PARTS];
  const allDefinitions=familyDefinitions(setId).filter(d=>requiredParts.includes(d.part));
  const items=requiredParts.map(part=>{
    const candidates=(inventory?.items||[]).filter(i=>{const d=itemDefinition(i);return d?.part===part&&armorOutfitKey(d)===setId;});
    return candidates.find(i=>i.uid===uid)||candidates.find(i=>i.uid===inventory.equipped?.[part])||candidates[0];
  }).filter(Boolean);
  const definitions=items.map(itemDefinition),selection=Object.fromEntries(items.map((i,n)=>[definitions[n].part,i.uid]));
  const missing=requiredParts.filter(part=>!definitions.some(d=>d.part===part));
  const neededLevel=Math.max(1,...allDefinitions.map(d=>d.level||1));
  const error=!def||!setId||isRetiredHeadwear(def)?'Headwear is no longer available.':missing.length?'Collect the matching '+missing.map(p=>EQUIPMENT_NAMES[p]||p).join(' and ')+' to wear this outfit.':level<neededLevel?'Requires hero level '+neededLevel+'.':null;
  const equipped=!error&&Object.keys(inventory.equipped||{}).length===requiredParts.length&&requiredParts.every(part=>inventory.equipped[part]===selection[part]);
  return {uid:items.find(i=>['chest','suit'].includes(itemDefinition(i)?.part))?.uid||items[0]?.uid||uid,setId,name:def?.setName||def?.name||'Outfit',definitions,allDefinitions,items,selection,requiredParts,missing,equipped,ok:!error,error,level:neededLevel,rarity:def?.rarity,color:def?.color,accent:def?.accent,legacy:!!def?.legacy,stats:armorOutfitStats(setId),price:armorOutfitPrice(setId)};
}
export function ownedArmorOutfits(inventory,level=99){
  const groups=new Map();
  for(const item of inventory?.items||[]){
    const def=itemDefinition(item),key=armorOutfitKey(def);if(!key||isRetiredHeadwear(def))continue;
    const prior=groups.get(key),rank=i=>{const d=itemDefinition(i);return (Object.values(inventory.equipped||{}).includes(i?.uid)?4:0)+(['chest','suit'].includes(d?.part)?2:d?.part==='boots'?1:0);};
    if(!prior||rank(item)>rank(prior))groups.set(key,item);
  }
  return [...groups.values()].map(item=>armorOutfitForItem(inventory,item.uid,level));
}
export function equippedArmorOutfit(inventory,level=99){
  const uid=inventory?.equipped?.chest||inventory?.equipped?.suit||inventory?.equipped?.boots;
  if(!uid)return null;
  const outfit=armorOutfitForItem(inventory,uid,level);
  return outfit.equipped?outfit:null;
}
export function reconcileArmorLoadout(inventory,level=99){
  for(const uid of [inventory.equipped?.chest,inventory.equipped?.suit,inventory.equipped?.boots]){
    if(!uid)continue;
    const outfit=armorOutfitForItem(inventory,uid,level);
    if(outfit.ok)return {...outfit.selection};
  }
  return {};
}
export function createEquipment(region,rarity,index=0,serial=1){
  const parts=LEGACY_PARTS.filter(part=>part!=='mask');
  const part=parts[Math.max(0,Math.min(parts.length-1,Math.floor(index)))],catalogId=`r${region}-${rarity}-${part}`;
  return EQUIPMENT[catalogId]?{uid:`drop-${serial}`,catalogId}:null;
}
export function normalizeEquipmentItem(item,{allowRetired=false}={}){
  if(!item||!Object.hasOwn(EQUIPMENT,item.catalogId)||typeof item.uid!=='string'||!validHelmetStats(item)||!allowRetired&&isRetiredHeadwear(item))return null;
  return {uid:item.uid,catalogId:item.catalogId,...(item.stats?{stats:{...item.stats}}:{})};
}
export function normalizeInventory(raw={},{legacy=false,level=99}={}){
  if(!raw||typeof raw!=='object'||!Array.isArray(raw.items)||raw.items.length>20||!Array.isArray(raw.pending))return null;
  const ids=new Set(),valid=item=>{
    if(!normalizeEquipmentItem(item,{allowRetired:legacy})||!/^drop-\d+$/.test(item.uid)||ids.has(item.uid)||!Number.isSafeInteger(Number(item.uid.slice(5)))||Number(item.uid.slice(5))>=1e9)return false;
    ids.add(item.uid);return true;
  };
  if(!raw.items.every(valid)||!raw.pending.every(valid))return null;
  const items=raw.items.map(i=>normalizeEquipmentItem(i,{allowRetired:legacy})),pending=raw.pending.map(i=>normalizeEquipmentItem(i,{allowRetired:legacy})),equipped={};
  const rawEquipped=raw.equipped??{};
  if(typeof rawEquipped!=='object'||Array.isArray(rawEquipped)||!legacy&&Object.keys(rawEquipped).some(part=>!HISTORICAL_EQUIPMENT_PARTS.includes(part)))return null;
  for(const part of HISTORICAL_EQUIPMENT_PARTS){const uid=rawEquipped[part];if(uid){const item=items.find(i=>i.uid===uid);if(!item||itemDefinition(item).part!==part)return null;equipped[part]=uid;}}
  if(equipped.helmet&&equipped.mask||equipped.chest&&equipped.suit)return null;
  if(!legacy&&Object.keys(equipped).length&&!equippedArmorOutfit({items,equipped},level))return null;
  const maxId=Math.max(0,...[...items,...pending].map(i=>Number(i.uid.slice(5))));
  const retired=raw.retired??{};if(!retired||typeof retired!=='object'||Array.isArray(retired)||Object.entries(retired).some(([id,reason])=>!/^drop-\d+$/.test(id)||!['sold','discarded'].includes(reason)||ids.has(id)||!Number.isSafeInteger(Number(id.slice(5)))||Number(id.slice(5))>=1e9))return null;
  const archived=raw.headwearArchive??[],headwearArchive=[],archiveKeys=new Set();
  if(!Array.isArray(archived)||archived.length>20000)return null;
  for(const record of archived){
    const item=normalizeEquipmentItem(record,{allowRetired:true}),source=record?.source,key=source+':'+record?.uid;
    if(!item||!isRetiredHeadwear(item)||typeof source!=='string'||!(/^(inventory|pending|loot|legendary:[a-z]+|boss:[1-7])$/.test(source))||archiveKeys.has(key))return null;
    if(/^drop-\d+$/.test(item.uid)){
      if(!retired[item.uid]||ids.has(item.uid))return null;
    }else if(!/^chest-[1-7]-[01]$/.test(item.uid)||!source.startsWith('boss:'))return null;
    archiveKeys.add(key);headwearArchive.push({...item,source});
  }
  const highest=Math.max(maxId,...Object.keys(retired).map(id=>Number(id.slice(5))));
  return {items,pending,equipped,retired:{...retired},headwearArchive,nextId:Math.max(highest+1,Math.min(1e9,Math.floor(Number(raw.nextId)||1)))};
}
export const emptyInventory=()=>({items:[],pending:[],equipped:{},retired:{},headwearArchive:[],nextId:1});
export function equipmentBonuses(inventory,level=99){
  const outfit=equippedArmorOutfit(inventory,level);
  return outfit?armorOutfitStats(outfit.setId):Object.fromEntries(STAT_KEYS.map(k=>[k,0]));
}
export function equipmentOutfit(inventory,fallback=STARTER_OUTFIT){
  return armorFreeAppearance(fallback);
}
export function rollEquipment(region,random,serial){
  const rare=LOOT.rareChance[region]||0;
  const rarity=random()<rare/(rare+LOOT.ordinaryChance)?'rare':'ordinary';
  return costumeDrop(region,rarity,Math.floor(random()*ARMOR_OUTFIT_PARTS.length),serial);
}
