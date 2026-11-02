import {isWorldUIFile,assertWorldPreserved} from './world-ui-preservation.mjs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
export const HERO_BASE='67c885e14cb8a41bb55772802d3849d498ea3913';
const authorized=new Set([
 'royale/hero-art.mjs','royale/hero-rig.mjs','royale/hero-materials.mjs',
 'royale/assets/hero/ink-materials.png','royale/assets/hero/material-data.mjs',
 'royale/assets/hero/face-features.png','royale/assets/hero/feature-data.mjs',
 'royale/assets/hero/material-manifest.json','royale/assets/hero/PROMPT.md',
 'royale/tests/creature-integration-preservation.mjs','royale/tests/hero-preservation.mjs',
 'royale/tests/hero-animation.test.mjs','royale/tests/hero-raster.mjs',
 'royale/tests/hero-review.html','royale/tests/hero-review.mjs',
 'royale/tests/hero-review-checks.mjs','royale/tests/hero-before-art.mjs',
 'royale/tests/hero-before-rig.mjs','royale/tests/hero-record.mjs',
 'royale/HERO-ANIMATION.md',
 'royale/assets/hero/style-c-features.png','royale/assets/hero/style-c-features.mjs',
 'royale/style-c-materials.mjs','royale/assets/hero/style-c-parts.png','royale/assets/hero/style-c-parts.mjs','royale/assets/hero/style-c-prompt.md',
 'royale/style-c-rig.mjs','royale/style-c-paint.mjs','royale/style-c-hair.mjs','royale/style-c-hero.mjs',
 'royale/assets/hero/style-c-reference.jpeg','royale/STYLE-C-APPROVAL.md',
 'royale/tests/style-c-before-art.mjs','royale/tests/style-c.test.mjs',
 'royale/tests/style-c-review.html','royale/tests/style-c-review.mjs','royale/tests/style-c-scenes.mjs',
 'royale/tests/style-c-raster.mjs','royale/tests/style-c-browser.mjs',
]);
export const isHeroPresentationFile=p=>authorized.has(p)||isWorldUIFile(p)||p.startsWith('royale/qa/hero-animation/')||p.startsWith('royale/qa/style-c/');
export function assertHeroPresentationOnly(){
 assertWorldPreserved();
 const git=(...args)=>execFileSync('git',args,{cwd:new URL('../../',import.meta.url),encoding:'utf8',maxBuffer:32*1024*1024}).trim();
 assert.equal(git('cat-file','-t',HERO_BASE),'commit','Verified creature integration history is required');
 const changed=git('diff','--name-only',HERO_BASE).split('\n').filter(Boolean);
 const added=git('ls-files','--others','--exclude-standard').split('\n').filter(Boolean).filter(p=>p!=='royale/node_modules'&&!p.startsWith('royale/node_modules/'));
 assert.deepEqual([...changed,...added].filter(p=>!isHeroPresentationFile(p)),[],
  'Only the authorized hero presentation, art and review files may differ from the verified integration');
 // This covers the complete gameplay runtime, all 36 creatures, appearance/save
 // schemas, input, camera, platforms, Story and Versus without wildcard exceptions.
 assert.equal(git('diff','--name-only',HERO_BASE,'--','royale/renderer.mjs','royale/saves.mjs','royale/assets/monsters','royale/assets/boss-sprites'),'',
  'Creature integration and gameplay/customization contracts remain exact');
 return {base:HERO_BASE,changed};
}
