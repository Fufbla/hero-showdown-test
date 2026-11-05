import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {assertHeroPresentationOnly,isHeroPresentationFile} from './hero-preservation.mjs';

export const MONSTER_COMMIT='b8b39dbedd92b89a298e13062abbc545453ff163';
export const BOSS_COMMIT='a5ada842f517e5ab64ad3214eacfb5a6c48806b3';
const root=new URL('../../',import.meta.url);
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024}).trim();
const lines=s=>s.split('\n').filter(Boolean);
// Creature/runtime protections remain exact. The separately authorized hero
// presentation stage is checked against the verified integration commit below.
const reviewFiles=new Set([
 'royale/tests/boss-sprites.test.mjs',
 ...[2,3,4,5,6].map(n=>`royale/tests/boss-sprites-batch${n}.test.mjs`),
 'royale/tests/creature-integration-preservation.mjs',
 'royale/tests/creature-integration-raster.mjs',
 'royale/tests/creature-review.html','royale/tests/creature-review.mjs',
 'royale/tests/creature-review-render.mjs','royale/CREATURE-INTEGRATION.md',
]);
export const isReviewFile=p=>reviewFiles.has(p)||p.startsWith('royale/qa/creature-integration/')||isHeroPresentationFile(p);
let expectedTree;
export function assertApprovedIntegration(historicalBossBase=BOSS_COMMIT){
 assertHeroPresentationOnly();
 // Missing source history is a failure, never a skip or a substituted baseline.
 for(const ref of [MONSTER_COMMIT,BOSS_COMMIT,historicalBossBase])
  assert.equal(git('cat-file','-t',ref),'commit',`Required approved history: ${ref}`);
 if(!expectedTree){
  const base=git('merge-base',MONSTER_COMMIT,BOSS_COMMIT);
  const monsterChanges=new Set(lines(git('diff','--name-only',base,MONSTER_COMMIT)));
  const shared=lines(git('diff','--name-only',base,BOSS_COMMIT)).filter(p=>monsterChanges.has(p));
  assert.deepEqual(shared,[],'Shared adapters require an explicit behavior review; do not silently choose one source');
  expectedTree=git('merge-tree','--write-tree',MONSTER_COMMIT,BOSS_COMMIT);
  assert.match(expectedTree,/^[a-f0-9]{40}$/,'The approved merge must be conflict-free');
 }
 const changed=lines(git('diff','--name-only',expectedTree));
 assert.deepEqual(changed.filter(p=>!isReviewFile(p)),[],
  'Every runtime, artwork and gameplay file must equal the approved two-source merge');
 const untracked=lines(git('ls-files','--others','--exclude-standard'));
 assert.deepEqual(untracked.filter(p=>p!=='royale/node_modules'&&!p.startsWith('royale/node_modules/')&&!isReviewFile(p)),[],
  'No unapproved added artwork or runtime files');
 assert.equal(git('diff','--name-only',MONSTER_COMMIT,'--','royale/assets/monsters',
  'royale/monster-art.mjs','royale/monster-animations.mjs','royale/monster-animation-catalog.mjs'),'',
  'All 21 approved animations and the approved monster renderer remain exact');
 assert.equal(git('diff','--name-only',BOSS_COMMIT,'--','royale/assets/boss-sprites',
  'royale/boss-art.mjs','royale/boss-sprites.mjs','royale/legendary-sprites.mjs','royale/scorpion-sprites.mjs','royale/bosses.css'),'',
  'All 15 approved boss integrations, metadata and renderers remain exact');
 assert.equal(git('diff','--name-only','--diff-filter=MD',historicalBossBase,BOSS_COMMIT,'--','royale/assets/boss-sprites'),'',
  'Previously completed boss artwork remains unchanged across historical batches');
 assert.equal(git('diff','--name-only',MONSTER_COMMIT,'--',':(exclude)royale'),'',
  'Story, Versus and every non-Royale tracked file remain unchanged');
 return {monster:MONSTER_COMMIT,boss:BOSS_COMMIT,expectedTree,changedReviewFiles:changed};
}
