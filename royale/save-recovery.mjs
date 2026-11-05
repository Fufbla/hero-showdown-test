import {decodeSave,SAVE_KEY} from './core.mjs';
import {PROFILE_KEY,BACKUP_KEY} from './saves.mjs';

export {BACKUP_KEY};
// Only known hero keys: never export account sessions, tokens or unrelated games.
export const RECOVERY_KEYS=Object.freeze([PROFILE_KEY,BACKUP_KEY,SAVE_KEY]);
export function inspectLocalHeroes(storage){
 const sources=[],heroes=[],issues=[];
 for(const key of RECOVERY_KEYS){
  let raw;try{raw=storage.getItem(key);}catch{issues.push({key,reason:'Browser storage is unavailable.'});continue;}
  if(raw===null)continue;
  sources.push({key,raw});let parsed;
  try{parsed=JSON.parse(raw);}catch{issues.push({key,reason:'Unreadable JSON. Original data retained.'});continue;}
  const entries=key===SAVE_KEY?[{snapshot:parsed}]:parsed?.version===2&&Array.isArray(parsed.slots)&&parsed.slots.length===3?parsed.slots:null;
  if(!entries){issues.push({key,reason:'Unknown save envelope. Original data retained.'});continue;}
  entries.forEach((entry,index)=>{
   if(entry===null)return;
   const snapshot=decodeSave(JSON.stringify(entry?.snapshot));
   if(!snapshot){issues.push({key,slot:index,reason:'This hero needs repair. Other readable slots can still be recovered.'});return;}
   // Do not pick a "newest" snapshot by timestamp or silently merge versions.
   heroes.push({key,slot:index,id:typeof entry.id==='string'?entry.id:null,snapshot,updatedAt:entry.updatedAt??null});
  });
 }
 return {version:1,sources,heroes,issues};
}

export function exportLocalRecovery(storage){
 const result=inspectLocalHeroes(storage);
 return JSON.stringify({format:'hero-showdown-royale-local-backup',version:1,sources:result.sources},null,2);
}

// Used only after an explicit import confirmation; IDs are stable across reloads.
export async function recoveryImportCandidate(hero,cryptoAPI=globalThis.crypto){
 if(hero.id)return {id:hero.id,snapshot:structuredClone(hero.snapshot)};
 const bytes=new TextEncoder().encode(JSON.stringify([hero.key,hero.slot,hero.snapshot]));
 const hash=new Uint8Array(await cryptoAPI.subtle.digest('SHA-256',bytes));
 return {id:'recovered-'+Array.from(hash,b=>b.toString(16).padStart(2,'0')).join(''),snapshot:structuredClone(hero.snapshot)};
}
