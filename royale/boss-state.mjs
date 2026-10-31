import { createEquipment, itemDefinition } from './equipment.mjs';
export function initialBossProgress(victories=[]){return {records:Object.fromEntries(victories.map(id=>[id,{wins:1,chest:{state:'legacy',coins:0,roots:0,items:[]}}]))};}
export function normalizeBossProgress(raw,victories,{strict=false}={}){
  if(!raw)return strict?null:initialBossProgress(victories);
  if(!raw.records||typeof raw.records!=='object'||Array.isArray(raw.records))return null;
  const records={};
  if(Object.keys(raw.records).some(id=>!victories.includes(Number(id))))return null;
  for(const region of victories){
    const r=raw.records[region],c=r?.chest;
    if(!r||!Number.isSafeInteger(r.wins)||r.wins<1||!c||!['available','claimed','legacy'].includes(c.state)||!Number.isInteger(c.coins)||c.coins<0||c.coins>100||!Number.isInteger(c.roots)||c.roots<0||c.roots>2||!Array.isArray(c.items)||c.items.length>2)return null;
    if(!c.items.every(i=>itemDefinition(i)?.region===region&&(region>=4||itemDefinition(i)?.rarity==='ordinary')&&/^chest-[1-7]-[01]$/.test(i.uid)))return null;
    if(new Set(c.items.map(i=>i.uid)).size!==c.items.length)return null;
    records[region]={wins:r.wins,chest:{state:c.state,coins:c.coins,roots:c.roots,items:c.items.map(({uid,catalogId})=>({uid,catalogId}))}};
  }
  return {records};
}
export function rollChest(region,random=Math.random){
  const coins=20+Math.floor(random()*21),roots=1+Math.floor(random()*2),count=random()<.35?2:1,items=[];
  for(let i=0;i<count;i++){const rarity=region>=4&&random()<.3?'rare':'ordinary',item=createEquipment(region,rarity,Math.floor(random()*7),1);item.uid=`chest-${region}-${i}`;items.push(item);}
  return {state:'available',coins,roots,items};
}
export function normalizeArena(raw,world,bosses){
  if(raw==null)return null;
  if(!raw||raw.region!==world.region||!['restart','cleared'].includes(raw.mode)||raw.mode==='cleared'&&!bosses.records[raw.region])return false;
  return {region:raw.region,mode:raw.mode};
}
