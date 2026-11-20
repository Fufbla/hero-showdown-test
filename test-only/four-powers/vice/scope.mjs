// Reserved public test code, never a cloud-account credential. Both the
// isolated route and its code must match before this costume becomes active.
export const VICE_TEST_CODE='0000000000';
export function isViceTestContext({pathname='',search=''}={}){
 return /\/four-powers-test\/(?:gameplay|local-coop)\/(?:index\.html)?$/.test(pathname)&&
  new URLSearchParams(search).get('testAccount')===VICE_TEST_CODE;
}
export const VICE_TEST_ENABLED=isViceTestContext(typeof location==='undefined'?{}:location);
