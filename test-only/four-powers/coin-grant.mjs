// This one-time wallet adjustment belongs only to the reserved, browser-local
// test profile. The receipt is stored atomically in the same profile envelope.
export const PUPPY_TEST_PREFIX='royale-four-powers-0000000000-v1:';
export const PUPPY_TEST_BALANCE=10000;
export const PUPPY_GRANT_VERSION=1;

export function applyPuppyTestCoins(store,{storagePrefix}={}){
 if(storagePrefix!==PUPPY_TEST_PREFIX||store?.cloud||store?.data?.version!==2||!Array.isArray(store.data.slots)||typeof store.flush!=='function')
  return {ok:false,error:'Puppy test coins are available only in the isolated 0000000000 profile.'};
 if(Object.hasOwn(store.data,'puppyCoinGrant')){
  const receipt=store.data.puppyCoinGrant;
  if(receipt?.version!==PUPPY_GRANT_VERSION||receipt.targetBalance!==PUPPY_TEST_BALANCE||typeof receipt.heroId!=='string'||!receipt.heroId)
   return {ok:false,error:'The test coin receipt needs recovery. The existing wallet has been preserved.'};
  return {ok:true,granted:false,heroId:receipt.heroId};
 }
 if(!store.writable||!store.durable)return {ok:false,error:store.message||'Save the test hero durably before adding test coins.'};
 const slots=store.data.slots,active=store.data.activeSlot;
 const index=Number.isInteger(active)&&slots[active]?.snapshot?active:slots.findIndex(row=>row?.snapshot);
 if(index<0)return {ok:false,error:'Create a test hero before adding test coins.'};
 const row=slots[index],oldCoins=row.snapshot.coins;
 if(typeof row.id!=='string'||!row.id||!Number.isSafeInteger(oldCoins)||oldCoins<0)
  return {ok:false,error:'The test wallet needs recovery. It has been left unchanged.'};
 const next=structuredClone(store.data);
 next.slots[index].snapshot.coins=PUPPY_TEST_BALANCE;
 next.puppyCoinGrant={version:PUPPY_GRANT_VERSION,targetBalance:PUPPY_TEST_BALANCE,heroId:row.id};
 const saved=store.flush(next,{atomic:true});
 return saved.ok?{ok:true,granted:true,heroId:row.id,index,previousCoins:oldCoins,coins:PUPPY_TEST_BALANCE}:saved;
}
