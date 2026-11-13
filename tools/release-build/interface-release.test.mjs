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
