// Reserved public test profile detection, never a cloud-account credential.
// Vice is now released for all heroes; this helper does not gate the costume.
export const VICE_TEST_CODE='0000000000';
export function isViceTestContext({pathname='',search=''}={}){
 return /\/four-powers-test\/(?:gameplay|local-coop)\/(?:index\.html)?$/.test(pathname)&&
  new URLSearchParams(search).get('testAccount')===VICE_TEST_CODE;
}
export const VICE_TEST_ENABLED=isViceTestContext(typeof location==='undefined'?{}:location);
