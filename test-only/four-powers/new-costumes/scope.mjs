// Public review code, never a cloud credential. New artwork stays in this sandbox.
export const NEW_COSTUMES_TEST_CODE='0000000000';
export function isNewCostumesTestContext({pathname='',search=''}={}){
 return /\/four-powers-test\/(?:gameplay|local-coop)\/(?:index\.html)?$/.test(pathname)&&
  new URLSearchParams(search).get('testAccount')===NEW_COSTUMES_TEST_CODE;
}
export const isNewCostumeTestContext=isNewCostumesTestContext;
export const NEW_COSTUMES_TEST_ENABLED=isNewCostumesTestContext(typeof location==='undefined'?{}:location);
export const NEW_COSTUMES_ENABLED=NEW_COSTUMES_TEST_ENABLED;
