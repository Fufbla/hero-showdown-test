// The public character test is independent of cloud accounts and game saves.
// Keep this module dependency-free so opening 0000000000 never loads old heroes.
export const CHARACTER_TEST_CODE='0000000000';
export const CHARACTER_TEST_URL='./character-test/index.html';
export const LEGACY_CHARACTER_TEST_PREFIX='royale-v2-prototype-'+CHARACTER_TEST_CODE+':';
export const LEGACY_CHARACTER_TEST_DATABASE=LEGACY_CHARACTER_TEST_PREFIX+'permanent';
export const isCharacterTestCode=value=>typeof value==='string'&&value.trim()===CHARACTER_TEST_CODE;

export function clearLegacyCharacterTest(scope=globalThis){
 let removedKeys=0;
 const storageErrors=[];
 for(const name of ['localStorage','sessionStorage']){
  try{
   const storage=scope[name];
   if(!storage)continue;
   for(let index=storage.length-1;index>=0;index--){
    const key=storage.key(index);
    if(typeof key==='string'&&key.startsWith(LEGACY_CHARACTER_TEST_PREFIX)){
     storage.removeItem(key);removedKeys++;
    }
   }
  }catch{storageErrors.push(name);}
 }
 const database=new Promise(resolve=>{
  try{
   if(!scope.indexedDB?.deleteDatabase){resolve('unavailable');return;}
   const request=scope.indexedDB.deleteDatabase(LEGACY_CHARACTER_TEST_DATABASE);
   request.onsuccess=()=>resolve('deleted');
   request.onerror=()=>resolve('error');
   // An old tab can hold this database open. The new test never reads it and
   // must remain usable while the browser waits for that tab to close.
   request.onblocked=()=>resolve('blocked');
  }catch{resolve('error');}
 });
 return {removedKeys,storageErrors,database};
}
