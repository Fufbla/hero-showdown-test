import {CURRENT_POWER_IDS,ACTIVE_POWER_SLOTS,migratePowerSnapshot} from './power-policy.mjs';
export const SKILL_RESET_COST=1000;
const stable=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
export function preparePowerReset(raw){
 const current=migratePowerSnapshot(raw),spent=CURRENT_POWER_IDS.reduce((n,id)=>n+current.powers.levels[id],0);
 if(!Number.isInteger(current.level)||current.level<1||current.level>99)throw Error('Invalid hero level.');
 if(!spent)throw Error('No spent skill points to reset.');
 if(!Number.isSafeInteger(current.coins)||current.coins<SKILL_RESET_COST)throw Error('You need 1,000 coins to reset skills.');
 if(!current.economy||!Number.isSafeInteger(current.economy.revision)||!Number.isSafeInteger(current.economy.coinsSpent)||!Array.isArray(current.economy.recent))throw Error('Hero purchase history requires recovery.');
 const next=structuredClone(current);
 next.coins-=SKILL_RESET_COST;
 next.powers={...next.powers,levels:Object.fromEntries(CURRENT_POWER_IDS.map(id=>[id,0])),equipped:Array(ACTIVE_POWER_SLOTS).fill(null),points:next.level-1,resetRevision:next.powers.resetRevision+1};
 next.economy.revision++;next.economy.coinsSpent+=SKILL_RESET_COST;
 if(!Number.isSafeInteger(next.powers.resetRevision)||!Number.isSafeInteger(next.economy.revision)||!Number.isSafeInteger(next.economy.coinsSpent))throw Error('Hero history limit reached.');
 next.economy.recent.push({id:next.economy.revision,kind:'power-reset',coins:-SKILL_RESET_COST});
 next.economy.recent=next.economy.recent.slice(-20);
 return {snapshot:next,refunded:spent,points:next.powers.points,cost:SKILL_RESET_COST};
}
export function isPowerReset(previous,next){
 try{return stable(preparePowerReset(previous).snapshot)===stable(migratePowerSnapshot(next));}catch{return false;}
}
