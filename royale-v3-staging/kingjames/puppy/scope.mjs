// This catalog is compiled only into the separate public test-code build.
// Requiring its route as well as the code keeps imported review modules inert
// on normal gameplay and ordinary account pages.
export const PUPPY_TEST_CODE='0000000000';
export function isPuppyTestContext({pathname='',search=''}={}){
 return /\/four-powers-test\/(?:gameplay|local-coop)\/(?:index\.html)?$/.test(pathname)&&
  new URLSearchParams(search).get('testAccount')===PUPPY_TEST_CODE;
}
export const PUPPY_TEST_ENABLED=isPuppyTestContext(typeof location==='undefined'?{}:location);
