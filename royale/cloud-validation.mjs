// Shared structural validation; executed again in the authenticated server endpoint.
// It is not a server-side combat simulation or an anti-cheat claim.
import {decodeSave, xpForLevel} from './core.mjs';
import {legendaryDominates} from './legendary-state.mjs';
import {WORLD_CLOCK_REFERENCE} from './world-state.mjs';
const stable=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
const fail=message=>{throw Error(message);};
export const MAX_SAVE_BYTES=1000000;
export function validateSnapshot(raw,{migration=false}={}){
 if(typeof raw==='string'){if(raw.length>MAX_SAVE_BYTES)fail('Save exceeds the supported size.');try{raw=JSON.parse(raw);}catch{fail('Unreadable save.');}}
 if(!raw||typeof raw!=='object'||JSON.stringify(raw).length>MAX_SAVE_BYTES)fail('Invalid save size.');
 for(const [key,min,max] of [['level',1,99],['coins',0,999999],['xp',0,Number.MAX_SAFE_INTEGER],['kills',0,999999]])if(!Number.isSafeInteger(raw[key])||raw[key]<min||raw[key]>max)fail('Invalid '+key+'.');
 if(raw.xp>=(raw.level===99?1:xpForLevel(raw.level)))fail('Invalid XP progress.');
 if((raw.inventory?.pending?.length||0)>2048||Object.keys(raw.inventory?.retired||{}).length>20000)fail('Inventory history exceeds the supported size.');
 const state=decodeSave(JSON.stringify(raw));if(!state)fail('Save validation failed. The original data was not changed.');
 if(!migration&&raw.powers?.points!==undefined&&raw.powers.points!==state.powers.points)fail('Invalid Power Point balance.');
 if(!migration&&state.arena?.mode==='restart')fail('Manual saving is unavailable during boss encounters.');
 if(state.world.location?.hp>100+(state.level-1)*15)fail('Invalid health.');
 state.world.clockReference=WORLD_CLOCK_REFERENCE;return state;
}
export function validateProgress(previous,next,{kind='manual'}={}){
 const old=previous;if(!old)return next;
 if(!legendaryDominates(next.legendary,old.legendary))fail('Permanent Legendary progress cannot be rolled back.');
 for(const [uid,reason] of Object.entries(old.inventory.retired))if(next.inventory.retired[uid]!==reason)fail('Destroyed equipment cannot be restored.');
 if(next.level<old.level||next.economy.revision<old.economy.revision||next.inventory.nextId<old.inventory.nextId)fail('This save predates recorded progression.');
 for(const [id,n] of Object.entries(old.powers.levels))if(next.powers.levels[id]<n)fail('Spent Power Points cannot be refunded.');
 for(const item of [...old.inventory.items,...old.inventory.pending]){const n=[...next.inventory.items,...next.inventory.pending].find(i=>i.uid===item.uid);if(n&&n.catalogId!==item.catalogId)fail('An existing item cannot change identity.');}
 for(const [id,r] of Object.entries(old.bossProgress.records)){const n=next.bossProgress.records[id];if(!n||n.wins<r.wins||r.chest.state==='claimed'&&n.chest.state!=='claimed')fail('Boss rewards cannot be recreated.');}
 const before=old.legendary,after=next.legendary;
 if(kind==='manual'){
  if(after.revision!==before.revision||stable(after.defeated)!==stable(before.defeated))fail('Legendary changes require an irreversible transaction.');
 }else if(kind==='irreversible'){
  if(after.revision!==before.revision+1)fail('Permanent revision must advance exactly once.');
  const added=Object.keys(after.defeated).filter(id=>!before.defeated[id]);
  const changed=Object.keys(before.defeated).filter(id=>stable(before.defeated[id])!==stable(after.defeated[id]));
  if(added.length===1&&!changed.length){
   const id=added[0],record=after.defeated[id];
   if(next.level!==99||record.claimed||record.pieces.some(p=>p.state!=='unclaimed')||next.arena?.legendary!==id||next.arena?.mode!=='cleared')fail('Invalid Legendary victory reservation.');
  }else if(!added.length&&changed.length){
   const claims=changed.filter(id=>!before.defeated[id].claimed&&after.defeated[id].claimed);
   if(claims.length>1||changed.some(id=>!before.defeated[id].claimed&&!claims.includes(id)))fail('Invalid reward claim.');
   if(changed.some(id=>before.defeated[id].claimed&&after.defeated[id].pieces.some((p,i)=>p.state!==before.defeated[id].pieces[i].state&&p.state!=='discarded')))fail('Only permanent discards may change claimed rewards.');
  }else fail('Permanent transaction has no valid event.');
 }else fail('Unknown save transaction.');
 return next;
}
export function validateUsername(value){const name=String(value||'').normalize('NFKC').toLowerCase();if(!/^[a-z][a-z0-9_]{3,23}$/.test(name))fail('Use 4–24 letters, numbers or underscores, beginning with a letter.');return name;}
export function validatePasscode(value){if(typeof value!=='string'||value.length<15||new TextEncoder().encode(value).length>72||/^\d+$/.test(value)||new Set(value).size<6)fail('Use a passphrase of 15–72 bytes with letters and varied characters; numeric PINs are not accepted.');return value;}
export const validSlot=slot=>Number.isInteger(slot)&&slot>=0&&slot<3;
