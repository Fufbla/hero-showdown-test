// Scope of the final test-build work. Artwork and simulation have no exceptions.
export const FINAL_BASE='3fdaee3eeba50a703f6a850b1871facd1de7896e';
export const FINAL_FILES=new Set([
 'app.mjs','index.html','landscape.css','renderer.mjs','package.json','package-lock.json',
 'tools/build-playtest.mjs','FINAL-PLAYTEST.md',
 'tests/final-preservation.mjs','tests/final-integration.test.mjs',
 'tests/final-mobile.html','tests/final-mobile.mjs',
 'tests/phase5-checks.mjs','tests/polish-preservation.mjs',
 'tests/browser-checks.mjs','tests/phase3-checks.mjs',
 'tests/landscape-layout.test.mjs',
 'qa/final-mobile/landscape-patrol.jpg',
].map(p=>'royale/'+p));
