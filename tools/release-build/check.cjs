// Run the existing release gates plus the production 28-costume collection
// suite. The unchanged staging collection suite intentionally still expects 22.
const {readdirSync}=require('node:fs');
const {spawnSync}=require('node:child_process');
const groups=['royale-v3-staging/gameplay/tests','royale-v3-staging/bosses/tests',
 'royale-v3-staging/costumes/tests','royale/fashion/tests'];
const tests=['tools/release-build/release.test.mjs','tools/release-build/interface-release.test.mjs','tools/release-build/armor-daynight.test.mjs','tools/release-build/customization.test.mjs',...readdirSync('royale-v3-staging/interface').filter(n=>n.endsWith('.test.mjs')).map(n=>'royale-v3-staging/interface/'+n),...groups.flatMap(dir=>readdirSync(dir)
 .filter(name=>name.endsWith('.test.mjs')&&!(dir.endsWith('costumes/tests')&&name==='collection.test.mjs'))
 .sort().map(name=>dir+'/'+name)),
 'royale/local-coop/tests/local-coop.test.mjs','royale/local-coop/tests/setup-controller.test.mjs',
 'royale/local-coop/tests/render-view.test.mjs',
 'royale/local-coop/tests/presentation.test.mjs',
 'royale/local-coop/tests/asset-cache.test.mjs'];
const result=spawnSync(process.execPath,['--expose-gc','--import','./tools/release-build/register.mjs',
 '--test','--test-concurrency=1',...tests],{stdio:'inherit'});
process.exitCode=result.status??1;
