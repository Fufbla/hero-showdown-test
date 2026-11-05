import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import assert from 'node:assert/strict';
import {BOSS_ART_DEPENDENCIES} from '../boss-art.mjs';
const base='42a3760deb46ce22d86d37509e0295d4b7859c0c',main='b11a1d8103f10e38d63788496660b99d4a8d9e6e';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
assert.equal(git('branch','--show-current'),'feature/showdown-royale');
const changed=[...git('diff','--name-only',base).split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')].filter(Boolean);
assert.ok(changed.every(p=>p.startsWith('royale/')),'All Phase 10 changes must stay inside royale/');
assert.equal(git('rev-parse',main+'^{commit}'),main);
const protectedPaths=['royale/backend','royale/vendor','royale/accounts.mjs','royale/cloud-api.mjs','royale/cloud-client.mjs','royale/cloud-saves.mjs','royale/cloud-validation.mjs','royale/shared-clock.mjs','royale/legendary-state.mjs','royale/equipment.mjs','royale/costume-catalog.mjs','royale/legendary-data.mjs','royale/boss-data.mjs','royale/merge-powers.mjs','royale/progression.mjs','royale/world-state.mjs','royale/world.mjs','royale/appearance.mjs','royale/hero-rig.mjs','royale/boss-art.mjs'];
assert.equal(git('diff','--name-only',base,'--',...protectedPaths),'','Auth, balance tables, world geometry and canonical artwork must remain unchanged');
for(const file of [...BOSS_ART_DEPENDENCIES,'assets/animation/motion-core.js'])assert.deepEqual(readFileSync(file),execFileSync('git',['show',`${base}:${file}`],{maxBuffer:32*1024*1024}));
assert.equal(git('diff','--name-only',base,'--',':(exclude)royale'),'');
let imports=0;const walk=p=>readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?['vendor','backend'].includes(e.name)?[]:walk(p+'/'+e.name):[p+'/'+e.name]);
for(const path of walk('royale').filter(p=>p.endsWith('.mjs'))){const source=readFileSync(path,'utf8');for(const m of source.matchAll(/(?:from\s*|import\s*\()(['"])(\.{1,2}\/[^'"\n]+)\1/g)){assert.ok(existsSync(resolve(dirname(path),m[2])),`${path}: broken import ${m[2]}`);imports++;}}
console.log(`PASS: Phase 10 Royale-only; ${imports} local imports resolve; main, Story/Versus, 35 approved shared assets, balance tables, world geometry and unfinished backend unchanged.`);
