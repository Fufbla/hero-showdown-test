import {assertCleanupSimulation} from './cleanup-preservation.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {FINAL_BASE,FINAL_FILES} from './final-preservation.mjs';
import {playtestFiles,repositoryRoot} from '../tools/build-playtest.mjs';
import {BOSS_ART_DEPENDENCIES} from '../boss-art.mjs';
import {MONSTER_ANIMATIONS} from '../monster-animation-catalog.mjs';

test('final build preserves every approved bitmap, combat rule, save schema and other mode exactly',async()=>{
 const git=(...args)=>execFileSync('git',args,{cwd:repositoryRoot,encoding:'utf8'}).trim();
 const changed=git('diff','--name-only',FINAL_BASE).split('\n').filter(Boolean);
 assert.deepEqual(changed.filter(p=>!FINAL_FILES.has(p)),[]);
 assert.equal(git('diff','--name-only',FINAL_BASE,'--','royale/assets','assets','index.html','royale/boss-data.mjs','royale/legendary-data.mjs','royale/powers.mjs','royale/saves.mjs','royale/equipment.mjs','royale/costume-catalog.mjs'),'');
 assertCleanupSimulation();
 const original=git('show',FINAL_BASE+':royale/renderer.mjs');
 const renderer=(await readFile(path.join(repositoryRoot,'royale/renderer.mjs'),'utf8')).trim();
 assert.equal(renderer,original.split('\n').filter(line=>!line.includes('REST · heal & set checkpoint')).join('\n'));
});
test('playtest package contains the complete transitive module graph and boss dependencies',async()=>{
 const files=new Set(await playtestFiles());
 for(const name of BOSS_ART_DEPENDENCIES)assert.ok(files.has(name),name);
 assert.equal(Object.keys(MONSTER_ANIMATIONS).length,21);
 for(const meta of Object.values(MONSTER_ANIMATIONS))assert.ok(files.has('royale/assets/monsters/'+meta.file),'Missing approved monster animation: '+meta.file);
 assert.ok(![...files].some(name=>name.includes('/animation-source/')),'Unused authoring sheets must not enter the playable package');
 const sizes=await Promise.all([...files].map(name=>stat(path.join(repositoryRoot,name))));
 assert.ok(sizes.reduce((total,s)=>total+s.size,0)<240*1024*1024,'Keep headroom under the host\'s 256 MiB expanded archive limit');
 const seen=new Set();
 async function visit(name){
  if(seen.has(name))return;seen.add(name);
  assert.ok(files.has(name),'Missing packaged module: '+name);
  assert.ok((await stat(path.join(repositoryRoot,name))).isFile(),name);
  const text=await readFile(path.join(repositoryRoot,name),'utf8');
  const refs=[...text.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"](\.[^'"]+)['"]/g)].map(m=>m[1]);
  for(const ref of refs)await visit(path.posix.normalize(path.posix.join(path.posix.dirname(name),ref)));
 }
 await visit('royale/app.mjs');
 const html=await readFile(path.join(repositoryRoot,'royale/index.html'),'utf8');
 for(const [,ref] of html.matchAll(/(?:src|href)="([^"#]+\.(?:mjs|js|css))"/g)){
  const name=path.posix.normalize(path.posix.join('royale',ref));assert.ok(files.has(name),'Missing entry resource: '+name);
 }
 assert.ok(seen.size>100,'The production dependency graph must be inspected');
});
