import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const dir='_site/royale/release';
const runtime=fs.readdirSync(dir).filter(f=>f.endsWith('.mjs')).map(f=>fs.readFileSync(dir+'/'+f,'utf8')).join('\n');
test('production contains approved standalone store without reserved test entry',()=>{
 assert.match(runtime,/installInterface/);assert.match(runtime,/store-hero/);assert.match(runtime,/costume-confirm/);
 assert.doesNotMatch(runtime,/testAccount|royale-v2-prototype-0000000000|snapshot.coins = 2100/);
 assert.match(fs.readFileSync('_site/royale/gameplay/index.html','utf8'),/royale\/interface.css/);
 assert.match(fs.readFileSync('_site/royale/interface.css','utf8'),/pause-primary/);
});
test('production cloud launcher retains autosave and removes the banner',()=>{
 const cloud=fs.readFileSync(dir+'/cloud.mjs','utf8');
 assert.match(runtime,/8e3|8000/);assert.match(cloud,/royale-restore-cloud-heroes/);
 assert.doesNotMatch(fs.readFileSync('_site/royale/index.html','utf8'),/Cloud save: automatic every eight/);
});

test('the shipped costume carousel and transaction controller include hero eligibility',()=>{
 const manifest=JSON.parse(fs.readFileSync('_site/royale/release-manifest.json','utf8'));
 for(const source of ['royale/cosmetics/eligibility.mjs','royale-v3-staging/interface/interface.mjs','royale-v3-staging/interface/store-controller.mjs'])assert(manifest.sourceHashes[source],source);
 assert.match(runtime,/available\(catalog\)/);assert.match(runtime,/controller\.eligible\(set\)/);
});

test('published Fancy Costume includes the approved art and price without the test wallet grant',()=>{
 const manifest=JSON.parse(fs.readFileSync('_site/royale/release-manifest.json','utf8'));
 assert.equal(manifest.costumes.count,35);
 assert.equal(manifest.costumes.ids.filter(id=>id==='golden-puppy-costume').length,1);
 assert.equal(manifest.costumes.prices['golden-puppy-costume'],700);
 assert.equal(manifest.costumes.prices['robot-costume'],0);
 assert(manifest.sourceHashes['royale/fashion/puppy.mjs']);
 assert(!Object.keys(manifest.sourceHashes).some(name=>name.startsWith('test-only/')||name.endsWith('/puppy/scope.mjs')));
 assert.match(runtime,/Fancy Costume/);
 assert.doesNotMatch(runtime,/puppyCoinGrant|applyPuppyTestCoins|PUPPY_TEST_BALANCE/);
 const assets='royale-v3-staging/kingjames/puppy/assets/';
 for(const name of ['body.webp','manifest.json','preview.png'])assert.deepEqual(fs.readFileSync('_site/'+assets+name),fs.readFileSync(assets+name),name);
 const sprite=JSON.parse(fs.readFileSync('_site/'+assets+'manifest.json','utf8'));
 assert.equal(sprite.id,'golden-puppy-costume');assert.equal(sprite.label,'Fancy Costume');
 assert.equal(sprite.frames.length,48);assert.equal(Object.keys(sprite.animations).length,21);
});
