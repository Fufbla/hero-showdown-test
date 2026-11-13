import {bossChestCoins} from './economy.mjs';
import {BOSSES} from '../../royale/boss-data.mjs';
import { costumeDrop,ARMOR_OUTFIT_PARTS } from '../../royale/costume-catalog.mjs';
import { itemDefinition,normalizeEquipmentItem } from '../../royale/equipment.mjs';
export function initialBossProgress(victories=[]){return {records:Object.fromEntries(victories.map(id=>[id,{wins:1,chest:{state:'legacy',coins:0,roots:0,items:[]}}]))};}
export function normalizeBossProgress(raw,victories,{strict=false,legacy=false}={}){
  if(!raw)return strict?null:initialBossProgress(victories);
  if(!raw.records||typeof raw.records!=='object'||Array.isArray(raw.records))return null;
  const records={};
  if(Object.keys(raw.records).some(id=>!victories.includes(Number(id))))return null;
  for(const region of victories){
    const r=raw.records[region],c=r?.chest;
    if(!r||!Number.isSafeInteger(r.wins)||r.wins<1||!c||!['available','claimed','legacy'].includes(c.state)||!Number.isInteger(c.coins)||c.coins<0||c.coins>Math.max(100,bossChestCoins(BOSSES[region].level))||!Number.isInteger(c.roots)||c.roots<0||c.roots>2||!Array.isArray(c.items)||c.items.length>2)return null;
    if(!c.items.every(i=>normalizeEquipmentItem(i,{allowRetired:legacy})&&itemDefinition(i)?.region===region&&(region>=4||itemDefinition(i)?.rarity==='ordinary')&&/^chest-[1-7]-[01]$/.test(i.uid)))return null;
    if(new Set(c.items.map(i=>i.uid)).size!==c.items.length)return null;
    if(c.rewardVersion!==undefined&&c.rewardVersion!==1)return null;
    // Older victories already paid 100 coins immediately. Convert only still
    // unclaimed chests, deducting that payment. Claimed/legacy eligibility stays closed.
    const available=c.state==='available',coins=available&&c.rewardVersion!==1?Math.max(0,bossChestCoins(BOSSES[region].level)-100):c.coins;
    records[region]={wins:r.wins,chest:{state:c.state,coins,roots:available?0:c.roots,items:available?[]:c.items.map(i=>normalizeEquipmentItem(i,{allowRetired:legacy})),...(available||c.rewardVersion===1?{rewardVersion:1}:{})}};
  }
  return {records};
}
export function rollChest(region){
  return {state:'available',coins:bossChestCoins(BOSSES[region].level),roots:0,items:[],rewardVersion:1};
}
export function normalizeArena(raw,world,bosses){
  if(raw==null)return null;
  if(!raw||raw.region!==world.region||!['restart','cleared'].includes(raw.mode)||raw.mode==='cleared'&&!bosses.records[raw.region])return false;
  return {region:raw.region,mode:raw.mode};
}
