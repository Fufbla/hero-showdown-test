import {bossChestCoins} from './economy.mjs';
const levels=[0,10,20,35,50,65,80,99];
const fail=message=>{throw Error(message);};
// Additive guard for the existing revision-checked staging save endpoint. This
// validates reward continuity, not client-authored combat or arbitrary earnings.
export function guardEconomySave(previous,next){
 const before=previous?.bossProgress?.records||{},after=next?.bossProgress?.records||{};
 for(const [id,old]of Object.entries(before)){
  const record=after[id];
  if(!record||!Number.isSafeInteger(record.wins)||record.wins<old.wins)fail('Boss completion cannot be rolled back.');
  if(['claimed','legacy'].includes(old.chest?.state)&&record.chest?.state!==old.chest.state)fail('A first-defeat chest cannot be reopened.');
  if(old.chest?.rewardVersion===1&&record.chest?.rewardVersion!==1)fail('Reload the current game before saving upgraded rewards.');
 }
 for(const [id,record]of Object.entries(after)){
  const chest=record?.chest,old=before[id]?.chest;
  if(chest?.rewardVersion!==1)continue; // Existing older saves remain readable.
  if(!levels[id]||!Number.isSafeInteger(record.wins)||record.wins<1||!['available','claimed','legacy'].includes(chest.state)||!Number.isSafeInteger(chest.coins)||chest.roots!==0||!Array.isArray(chest.items)||chest.items.length)fail('Invalid coin-only boss chest.');
  const expected=old?.rewardVersion===1?old.coins:old?.state==='available'?Math.max(0,bossChestCoins(levels[id])-100):bossChestCoins(levels[id]);
  if(chest.coins!==expected)fail('Boss chest amount cannot be changed.');
  if(!next.world?.bossVictories?.includes(Number(id)))fail('Boss chest requires recorded completion.');
 }
 for(const key of ['revision','coinsSpent'])if(previous?.economy&&(!Number.isSafeInteger(next?.economy?.[key])||next.economy[key]<previous.economy[key]))fail('The save predates recorded purchases or rewards.');
 return next;
}
