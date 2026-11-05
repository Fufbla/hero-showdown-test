import {withoutHitCorrection,assertCombatCorrectionScope} from './player-corrections-preservation.mjs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
export const CLEANUP_BASE='034aecb944b755bfe5743ced437409349684243d';
export const CLEANUP_FILES=new Set(['reward-notice.mjs','tests/mobile-patrol.mjs','world-state.mjs','backend/validation.mjs','style-c-turnaround.mjs','core.mjs','world.mjs','world-loot.mjs','app.mjs','renderer.mjs','environment-art.mjs','controls.mjs','input.mjs','index.html','landscape.css','style-c-source.mjs','style-c-hair.mjs','style-c-equipment.mjs','power-armor-art.mjs','headwear-fit.mjs','CLEANUP-PLAYTEST.md','tools/build-playtest.mjs','tests/cleanup-preservation.mjs','tests/cleanup.test.mjs','tests/cleanup-render.mjs','tests/cleanup-review.html','tests/cleanup-review.mjs','tests/core.test.mjs','tests/phase4.test.mjs','tests/final-integration.test.mjs','tests/final-preservation.mjs','tests/polish.test.mjs','tests/world-ui-preservation.mjs'].map(p=>'royale/'+p));
export const git=(...args)=>execFileSync('git',args,{cwd:new URL('../../',import.meta.url),encoding:'utf8',maxBuffer:32*1024*1024}).trimEnd();
export const cleanupBefore=name=>git('show',CLEANUP_BASE+':royale/'+name);
export const cleanupCurrent=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8').trimEnd();
const replaceBlock=(current,before,start,end)=>current.slice(0,current.indexOf(start))+before.slice(before.indexOf(start),before.indexOf(end))+current.slice(current.indexOf(end));
export function assertCleanupSimulation(){
 assertCombatCorrectionScope();
 let current=withoutHitCorrection(cleanupCurrent('core.mjs')),before=cleanupBefore('core.mjs');
 current=current.replace('    this.activateCheckpoint();\n','');
 current=replaceBlock(current,before,'  enterPortal() {','  step(dt');
 assert.equal(current,before,'Only checkpoint activation/healing changes in simulation');
 current=cleanupCurrent('world.mjs');before=cleanupBefore('world.mjs');
 assert.equal(replaceBlock(current,before,'export function regionSpawns(id)','export const GATES'),before,'Only platform population changes; all geometry/species/stat definitions remain exact');
 assert.equal(git('diff','--name-only',CLEANUP_BASE,'--','royale/assets','assets','index.html','royale/progression.mjs','royale/bosses.mjs','royale/legendary-bosses.mjs','royale/boss-data.mjs','royale/legendary-data.mjs','royale/boss-loot.mjs','royale/legendary-state.mjs','royale/merge-powers.mjs','royale/equipment.mjs','royale/costume-catalog.mjs','royale/saves.mjs','royale/journey.mjs'),'');
}

for(const path of ['tests/strength-armor.test.mjs', 'tests/flight-armor.test.mjs', 'tests/super-kick-armor.test.mjs', 'tests/roots-armor.test.mjs', 'tests/speed-armor.test.mjs', 'tests/whirlwind-armor.test.mjs', 'tests/agility-armor.test.mjs', 'tests/phase9.test.mjs'])CLEANUP_FILES.add('royale/'+path);

for(const path of ['gameplay-landscape.jpg','helmet-fit.jpg','hair-fit.jpg'])CLEANUP_FILES.add('royale/qa/cleanup/'+path);
