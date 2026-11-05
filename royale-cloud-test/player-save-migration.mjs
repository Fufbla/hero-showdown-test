import {exportLocalRecovery} from './save-recovery.mjs';
import {legendaryDominates} from './legendary-state.mjs';
export async function prepareLegacyImport(hero,{storage,ledger}){
 // Keep a complete immutable source export before attempting a cloud mutation.
 const key='healthia.royale.import-backup.v1:'+crypto.randomUUID();
 const backup=exportLocalRecovery(storage);storage.setItem(key,backup);
 if(storage.getItem(key)!==backup)throw Error('Local recovery backup could not be verified. No cloud import was attempted.');
 if(!ledger)throw Error('Permanent progress must be checked before importing. Original saves remain intact.');
 const records=await ledger.all(),record=records.find(r=>r.heroId===hero.id);
 if(record?.deleted)throw Error('This hero was permanently deleted. Its old copy cannot be imported.');
 if(hero.snapshot.legendary.revision&&!record)throw Error('This hero needs its missing permanent-progress record. Original saves remain intact.');
 if(record&&(hero.snapshot.legendary.revision!==record.revision||!legendaryDominates(hero.snapshot.legendary,record.snapshot.legendary)||Object.keys(record.snapshot.inventory.retired).some(uid=>!hero.snapshot.inventory.retired[uid])))throw Error('This copy predates permanent progress. Choose the reconciled current hero; no import was attempted.');
 if(!hero.id){
  // Pre-slot saves had no identity. Assign one per source on this browser, only
  // after confirmation, so changing the old snapshot cannot import it twice.
  const identityKey='healthia.royale.import-identities.v1',raw=storage.getItem(identityKey);
  let identities;try{identities=raw===null?{}:JSON.parse(raw);}catch{throw Error('Migration identity record needs recovery. No import was attempted.');}
  if(!identities||Array.isArray(identities)||typeof identities!=='object')throw Error('Invalid migration identity record.');
  const source=hero.key+':'+hero.slot;identities[source]||=crypto.randomUUID();const encoded=JSON.stringify(identities);storage.setItem(identityKey,encoded);if(storage.getItem(identityKey)!==encoded)throw Error('Migration identity could not be preserved.');hero.id=identities[source];
 }
 return {backupKey:key};
}
