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
