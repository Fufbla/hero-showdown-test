import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
export const WORLD_BASE='2bd6c6546cf41ee774763b8ed7ba3be88540c8fc';
const files=new Set(['assets/items/comic-equipment.png','assets/items/PROMPT.md','app.mjs','appearance.mjs','creator.mjs','hair-art.mjs','hair-catalog.mjs','eris.mjs','tests/overhaul-customization.test.mjs','tests/overhaul-gallery.mjs','power-menu.mjs','controls.mjs','core.mjs','eris-ui.mjs','index.html','input.mjs','journey-menu.mjs','journey.mjs','world-art.mjs','world-loot.mjs','portal-art.mjs','item-art.mjs','world-ui.css','backend/validation.mjs','tests/world-ui-preservation.mjs','tests/world-ui-loot.test.mjs','tests/overhaul-controls.test.mjs','tests/world-ui-review.html','tests/world-ui-review.mjs','tests/core.test.mjs','tests/phase3.test.mjs','tests/phase3-checks.mjs','tests/phase4.test.mjs','tests/phase6.test.mjs','WORLD-UI-LOOT.md'].map(p=>'royale/'+p));
export const isWorldUIFile=p=>files.has(p)||p.startsWith('royale/qa/world-ui/');
export function assertWorldPreserved(){
 const root=new URL('../../',import.meta.url),git=(...a)=>execFileSync('git',a,{cwd:root,encoding:'utf8'}).trim();
 assert.equal(git('diff','--name-only',WORLD_BASE,'--','royale/world.mjs','royale/progression.mjs','royale/powers.mjs','royale/bosses.mjs','royale/legendary-bosses.mjs','royale/legendary-state.mjs','royale/merge-powers.mjs','royale/costume-catalog.mjs','royale/equipment.mjs','royale/saves.mjs','royale/save-policy.mjs','royale/shared-clock.mjs','royale/renderer.mjs'),'', 'Combat, rewards, catalogs, saves, ownership, clock and all creature rendering stay exact');
 assert.equal(readFileSync(new URL('../eris.mjs',import.meta.url),'utf8').replace(/^const GROUPS=.*$/m,''),git('show',WORLD_BASE+':royale/eris.mjs').replace(/^const GROUPS=.*$/m,'')+'\n','Shop prices and transactions remain exact; only new cosmetic fields enter existing quote groups');
 const before=git('show',WORLD_BASE+':royale/core.mjs'),after=readFileSync(new URL('../core.mjs',import.meta.url),'utf8');
 for(const [start,end] of [['  attackDefinition(', '  interact()'],['    const axis =','    if(input.heal)'],['    if (h.attackBuffer)','    for (const e of this.enemies)'],['  stepEnemy(', '  save()']])assert.equal(after.slice(after.indexOf(start),after.indexOf(end)),before.slice(before.indexOf(start),before.indexOf(end)),`Protected simulation block ${start}`);
}
