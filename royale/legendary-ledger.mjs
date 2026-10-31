// IndexedDB is the authority for irreversible events. Each record contains the
// complete safe snapshot so a crash between this commit and localStorage cache
// synchronization is recoverable. There is no periodic ledger write.
import { decodeSave } from './core.mjs';
import { legendaryDominates } from './legendary-state.mjs';
export function validateLedgerWrite(previous,heroId,expectedRevision,snapshot){
 const state=decodeSave(typeof snapshot==='string'?snapshot:JSON.stringify(snapshot));
 if(typeof heroId!=='string'||!heroId||heroId.length>160||!state||state.version<7)throw Error('Invalid permanent-progress transaction.');
 if((previous?.revision||0)!==expectedRevision)throw Error('Permanent progress changed in another tab. Reload the latest hero.');
 if(state.legendary.revision<=expectedRevision||previous&&!legendaryDominates(state.legendary,previous.snapshot.legendary))throw Error('This transaction would restore permanently lost progress.');
 if(previous&&Object.keys(previous.snapshot.inventory.retired).some(uid=>!state.inventory.retired[uid]))throw Error('A destroyed item cannot be restored.');
 return {heroId,revision:state.legendary.revision,snapshot:state};
}
export class LegendaryLedger{
 constructor(db){this.db=db;}
 static async open(indexedDB,name='healthia.royale.permanent.v1'){
  if(!indexedDB)throw Error('Durable browser storage is unavailable.');
  const db=await new Promise((resolve,reject)=>{const request=indexedDB.open(name,1);request.onupgradeneeded=()=>request.result.createObjectStore('heroes',{keyPath:'heroId'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('Close older game tabs to enable permanent progress.'));});
  // Do not enable irreversible rewards unless strict durable transactions work.
  try{const tx=db.transaction('heroes','readwrite',{durability:'strict'});if(tx.durability!=='strict'){tx.abort();throw Error('This browser does not support strict durable transactions.');}await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error||Error('Durable storage check failed.'));});}catch(error){db.close();throw error;}
  db.onversionchange=()=>db.close();return new LegendaryLedger(db);
 }
 all(){return new Promise((resolve,reject)=>{const tx=this.db.transaction('heroes','readonly'),request=tx.objectStore('heroes').getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
 commit(heroId,expectedRevision,snapshot){
  return new Promise((resolve,reject)=>{let result,failure;const tx=this.db.transaction('heroes','readwrite',{durability:'strict'}),store=tx.objectStore('heroes'),request=store.get(heroId);
   request.onsuccess=()=>{try{result=validateLedgerWrite(request.result,heroId,expectedRevision,snapshot);store.put(result);}catch(error){failure=error;tx.abort();}};
   tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(failure||tx.error||Error('Permanent progress could not be saved.'));
  });
 }
 close(){this.db.close();}
}
export async function reconcileLegendaryStore(store,ledger){
 const records=await ledger.all();let changed=false;
 for(const record of records){
  const index=store.data.slots.findIndex(s=>s?.id===record.heroId);if(index<0)continue;
  const local=store.data.slots[index].snapshot,permanent=decodeSave(JSON.stringify(record.snapshot));
  if(!permanent||permanent.legendary.revision!==record.revision)throw Error('Permanent progress needs recovery. It has not been overwritten.');
  if(local.legendary.revision<record.revision||!legendaryDominates(local.legendary,permanent.legendary)||Object.keys(permanent.inventory.retired).some(uid=>!local.inventory.retired[uid])){
   store.data.slots[index].snapshot=permanent;store.data.slots[index].lastRegion='Recovered permanent Legendary progress';changed=true;
  }else if(local.legendary.revision>record.revision)throw Error('The ordinary save is newer than its permanent record. Legendary play is locked until recovery.');
 }
 // An existing v7 victory without its authority record must not enable rematches.
 for(const slot of store.data.slots)if(slot?.snapshot.legendary.revision&&!records.some(r=>r.heroId===slot.id))throw Error('This hero is missing its permanent record. Keep this browser data intact; Legendary play is locked.');
 if(changed)store.flush(store.data,{atomic:false});return changed;
}
