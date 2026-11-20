import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {installTestCodeEntry} from './site-entry.mjs';

function page(code){
 const listeners={},input={value:code,addEventListener:(type,fn)=>listeners[type]=fn},button={contains:()=>false},destinations=[];
 const doc={getElementById:id=>({input,load:button})[id],addEventListener:(type,fn,capture)=>{assert.equal(capture,true);listeners[type]=fn;}};
 installTestCodeEntry(doc,{assign:url=>destinations.push(url)},'https://fufbla.github.io/hero-showdown-test/royale/test-code-entry.mjs');
 const event={target:button,key:'Enter',prevented:0,stopped:0,preventDefault(){this.prevented++;},stopImmediatePropagation(){this.stopped++;}};
 return {listeners,input,button,destinations,event};
}
test('Only reserved code routes to the separate test game before cloud login',()=>{
 for(const code of ['0000000000',' 0000000000 ']){
  const p=page(code);p.listeners.click(p.event);
  assert.deepEqual(p.destinations,['https://fufbla.github.io/hero-showdown-test/four-powers-test/gameplay/?testAccount=0000000000']);
  assert.equal(p.event.prevented,1);assert.equal(p.event.stopped,1);
 }
});
test('Ordinary and malformed codes leave the normal login handler untouched',()=>{
 for(const code of ['1234567890','0000000001','000000000','00000000000','']){
  const p=page(code);p.listeners.click(p.event);p.listeners.keydown(p.event);
  assert.equal(p.destinations.length,0);assert.equal(p.event.prevented,0);assert.equal(p.event.stopped,0);
 }
});
test('Reserved code supports Enter and ignores other buttons and composing text',()=>{
 const p=page('0000000000');p.listeners.click({...p.event,target:{}});p.listeners.keydown({...p.event,isComposing:true});
 assert.equal(p.destinations.length,0);p.listeners.keydown(p.event);assert.equal(p.destinations.length,1);
});
test('Website packages the sandbox separately while production receives the approved powers',()=>{
 const read=p=>fs.readFileSync('_site/'+p,'utf8');
 assert.match(read('royale/index.html'),/src="\.\/test-code-entry\.mjs\?v=/);
 assert.equal(read('royale/test-code-entry.mjs'),fs.readFileSync('test-only/four-powers/site-entry.mjs','utf8'));
 const normal=JSON.parse(read('royale/release-manifest.json')),sandbox=JSON.parse(read('four-powers-test/release-manifest.json'));
 assert.equal(sandbox.testAccount,'0000000000');assert.equal(sandbox.cloudWrites,false);
 assert.equal(normal.saveContract.profileKey,'healthia.royale.profiles.v2');
 assert.equal(normal.saveContract.cloudPrefix,'royale-v3-play:');assert.equal(normal.saveContract.databaseMigration,false);
 for(const file of Object.keys(normal.bundles))assert.equal(/["']0000000000["']|fourPowerReview/.test(read(file)),false,file);
 const production=Object.keys(normal.bundles).map(read).join('\n');assert.match(production,/animalAllies/);assert.match(production,/seismicSmash/);assert.match(production,/royale-skills-reset/);assert.match(production,/reset-powers/);
 assert.equal(fs.existsSync('_site/test-only'),false);
 for(const file of ['gameplay/index.html','local-coop/index.html','release/game.mjs','release/coop.mjs'])assert.ok(read('four-powers-test/'+file).length);
});
test('Sandbox HTML loads content-hashed entries and preserves compatible direct module URLs',()=>{
 const read=p=>fs.readFileSync('_site/four-powers-test/'+p,'utf8');
 const {entries}=JSON.parse(read('release-manifest.json'));
 assert.deepEqual(Object.keys(entries).sort(),['coop','gallery','game']);
 for(const [name,page]of [['game','gameplay/index.html'],['coop','local-coop/index.html'],['gallery','gallery.html']]){
  assert.match(entries[name],new RegExp(`^release/${name}-[A-Z0-9]{8}\\.mjs$`));
  const html=read(page),pageURL=new URL(page,'https://example.test/hero-showdown-test/four-powers-test/');
  const base=new URL(html.match(/<base href="([^"]+)"/)?.[1]||pageURL.href,pageURL);
  const scripts=[...html.matchAll(/<script type="module" src="([^"]+)"><\/script>/g)].map(match=>new URL(match[1],base).href);
  assert.deepEqual(scripts,[new URL(entries[name],'https://example.test/hero-showdown-test/four-powers-test/').href],page);
  assert.equal(read(`release/${name}.mjs`),read(entries[name]),`${name}: direct URL stays compatible`);
 }
});
