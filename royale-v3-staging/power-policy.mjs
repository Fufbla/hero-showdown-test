// Staging-only policy. The point ledger is derived, never additively credited.
export const MOVEMENT_POLICY_VERSION=1;
export const CURRENT_POWER_IDS=Object.freeze(['strength','superKick','fireball','flight','steel','roots','speed','whirlwind']);
const int=n=>Number.isInteger(n)&&n>=0&&n<=20;
export function retireMovementPower(raw,heroLevel,{allowOverBudget=false}={}){
 const earned=Math.max(0,Math.floor(Number(heroLevel)||1)-1);
 const prior=raw?.movementPolicy;
 const removed=raw?.levels?.agility??0;
 if(!int(removed)||prior&&(prior.version!==1||!int(prior.refunded)))return null;
 if(raw?.levels){
  const values=CURRENT_POWER_IDS.map(id=>raw.levels[id]);
  if(values.some(n=>!int(n)))return null;
  if(!allowOverBudget&&values.reduce((a,b)=>a+b,0)+removed>earned)return null;
 }
 const levels=Object.fromEntries(CURRENT_POWER_IDS.map(id=>[id,raw?.levels?.[id]??0]));
 const recovery=Object.fromEntries(CURRENT_POWER_IDS.filter(id=>id!=='speed').map(id=>[id,raw?.recovery?.[id]??0]));
 const equipped=Array.from({length:3},(_,i)=>{
  const id=raw?.equipped?.[i];return CURRENT_POWER_IDS.includes(id)&&id!=='speed'?id:null;
 });
 return {...raw,levels,equipped,recovery,points:Math.max(0,earned-Object.values(levels).reduce((a,b)=>a+b,0)),
  movementPolicy:{version:1,refunded:prior?.refunded??removed}};
}
export function migratePowerSnapshot(snapshot,options){
 if(snapshot===null)return null;
 if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))throw Error('Invalid hero snapshot');
 const powers=retireMovementPower(snapshot.powers,snapshot.level,options);
 if(!powers)throw Error('Power ledger requires recovery; no progress was changed');
 return {...snapshot,powers};
}
export function guardPowerSave(previous,incoming){
 const before=previous?migratePowerSnapshot(previous):null;
 const next=migratePowerSnapshot(incoming);
 if(before){
  if(next.level<before.level||CURRENT_POWER_IDS.some(id=>next.powers.levels[id]<before.powers.levels[id]))throw Error('Power progress changed; reload your hero');
  if(previous.powers?.movementPolicy?.version===1&&(incoming.powers?.levels?.agility||incoming.powers?.equipped?.includes('agility')))throw Error('Power rules changed; reload this game tab');
  next.powers.movementPolicy=before.powers.movementPolicy;
 }
 return next;
}
