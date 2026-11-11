import {POWER_IDS,POWER_CAP} from './powers.mjs';
// Reserved PUBLIC development shortcut, not a cloud account credential.
// Each browser gets its own isolated local V2 prototype hero. Production V3
// access tokens and cloud account slots are never used with this code.
export const V2_TEST_CODE='0000000000';
export const V2_TEST_HERO_NAME='V2 Test Hero';
export const V2_TEST_STORAGE_PREFIX='royale-v2-prototype-'+V2_TEST_CODE+':';
export const V2_TEST_QUERY_PARAM='v2TestCharacter';
export const isV2TestCode=value=>typeof value==='string'&&value.trim()===V2_TEST_CODE;
export const isV2TestRoute=params=>params?.get?.(V2_TEST_QUERY_PARAM)===V2_TEST_CODE;
export const v2TestLook=defaultLook=>({...defaultLook,name:V2_TEST_HERO_NAME});

// Grant all nine powers only to the isolated 0000000000 browser-local test saves.
// Preserve existing equipped slots, character appearance, location, and currency.
export function maxV2TestPowers(snapshot,{starterLoadout=false}={}){
  const next=structuredClone(snapshot);
  const old=next.powers||{};
  const equipped=Array.isArray(old.equipped)?[...old.equipped]:[null,null,null];
  if(starterLoadout&&equipped.every(id=>id==null))equipped.splice(0,3,'strength','superKick','fireball');
  next.powers={...old,levels:Object.fromEntries(POWER_IDS.map(id=>[id,POWER_CAP])),equipped,points:0};
  return next;
}
export const hasMaxV2TestPowers=snapshot=>POWER_IDS.every(id=>snapshot?.powers?.levels?.[id]===POWER_CAP);
