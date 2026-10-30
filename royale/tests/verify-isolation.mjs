import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'});
const base=process.argv[2]||'b11a1d8103f10e38d63788496660b99d4a8d9e6e';
assert.equal(git('branch','--show-current').trim(),'feature/showdown-royale','use only the requested branch');
const allowed=['index.html','game.html','hero-showdown.html'];
const changed=git('diff','--name-only',base).trim().split('\n').filter(Boolean);
assert.ok(changed.every(path=>path.startsWith('royale/')||allowed.includes(path)),'unexpected change outside Royale');
const oldTile=/<button class="mode-tile locked-mode" disabled aria-label="Showdown Royal[^\n]*?<\/button>/;
const newTile=/<button class="mode-tile" onclick="location.href='royale\/'"[^\n]*?<\/button>/;
for(const path of allowed){
  const before=git('show',`${base}:${path}`),after=readFileSync(root+path,'utf8');
  assert.ok(oldTile.test(before),`base Royale tile exists in ${path}`);assert.ok(newTile.test(after),`new Royale tile exists in ${path}`);
  assert.equal(before.replace(oldTile,'ROYALE_TILE'),after.replace(newTile,'ROYALE_TILE'),`only Royale tile may change in ${path}`);
}
assert.equal(git('diff','--name-only',base,'--','assets/','videos/','tests/').trim(),'','original assets, videos, tests and game systems are unchanged');
console.log('PASS: requested branch; only three Royale menu tiles change outside royale/. Original gameplay and assets are byte-for-byte unchanged.');
