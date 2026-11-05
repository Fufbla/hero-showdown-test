import {withoutHitCorrection} from './player-corrections-preservation.mjs';
import {assertCleanupSimulation,cleanupBefore} from './cleanup-preservation.mjs';
import {isFireballFile} from './power-armor-preservation.mjs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
export const WORLD_BASE='2bd6c6546cf41ee774763b8ed7ba3be88540c8fc';
const files=new Set(['environment-art.mjs','environment-detail.mjs','tests/overhaul-before-environment.mjs','tests/overhaul-environments.test.mjs','tests/overhaul-environment-gallery.mjs','assets/items/comic-equipment.png','assets/items/PROMPT.md','app.mjs','appearance.mjs','creator.mjs','hair-art.mjs','hair-catalog.mjs','eris.mjs','tests/overhaul-customization.test.mjs','tests/overhaul-gallery.mjs','power-menu.mjs','controls.mjs','core.mjs','eris-ui.mjs','index.html','input.mjs','journey-menu.mjs','journey.mjs','equipment.mjs','world-art.mjs','world-loot.mjs','portal-art.mjs','item-art.mjs','world-ui.css','backend/validation.mjs','tests/world-ui-preservation.mjs','tests/world-ui-loot.test.mjs','tests/overhaul-controls.test.mjs','tests/world-ui-review.html','tests/world-ui-review.mjs','tests/core.test.mjs','tests/phase3.test.mjs','tests/phase3-checks.mjs','tests/phase4.test.mjs','tests/phase6.test.mjs','WORLD-UI-LOOT.md'].map(p=>'royale/'+p));
export const isWorldUIFile=p=>isFireballFile(p)||files.has(p)||p.startsWith('royale/qa/world-ui/')||p.startsWith('royale/qa/overhaul/');
export function assertWorldPreserved(){
 assertCleanupSimulation();
 const root=new URL('../../',import.meta.url),git=(...a)=>execFileSync('git',a,{cwd:root,encoding:'utf8'}).trim();
 assert.equal(git('diff','--name-only',WORLD_BASE,'--','royale/progression.mjs','royale/bosses.mjs','royale/legendary-bosses.mjs','royale/legendary-state.mjs','royale/merge-powers.mjs','royale/costume-catalog.mjs','royale/saves.mjs','royale/save-policy.mjs','royale/shared-clock.mjs'),'', 'Combat, rewards, catalogs, saves, ownership, clock and all creature rendering stay exact');
 // The new item catalog is the only transaction/inventory wiring change.
 const body=source=>source.replace(/^import .*?;\n/gm,'').trimEnd();
 const current=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
 const base=name=>git('show',WORLD_BASE+':royale/'+name);
 assert.equal(body(current('equipment.mjs')).replace("  if(pieces.chest?.strengthLevels && !pieces.gloves)pieces.gloves={...pieces.chest,part:'gloves'};\n",'').replace('...WARDROBE_CATALOG','...COSTUME_CATALOG').replace('pieces.emblem??={...pieces.chest','pieces.emblem={...pieces.chest'),body(base('equipment.mjs')));
 assert.equal(body(current('eris.mjs')).replace(/^const GROUPS=.*$/m,''),body(base('eris.mjs')).replace(/^const GROUPS=.*$/m,''));
 // Protect all combat code outside the scoped Fireball stat formula and its
 // effective-level input. The dedicated armor suite tests those differences.
 const powers=current('powers.mjs').trimEnd().replace('y:h.y-30,vx:burst.face','y:h.y-45,vx:burst.face')
   .replace("const scale = (level,a,b) => a + (b-a)*(level-1)/19;\nconst speedScale = (level,low,cap,bonus=0) => level ? scale(Math.min(POWER_CAP,level+bonus),low,cap) : 0;","const scale = (level,a,b) => a + (b-a)*(level-1)/19;")
   .replace("runBonus:speedScale(level,.05,.6),attackBonus:speedScale(level,.03,.5)","runBonus:scale(level,.05,.6),attackBonus:scale(level,.03,.5)")
   .replace("powerStats('speed',level,{equipment}).attackBonus","powerStats('speed',level).attackBonus")
   .replace("speedScale(this.data.levels.speed,.05,.6,this.game.equipment.speedLevels)","(this.data.levels.speed?scale(this.data.levels.speed,.05,.6):0)")
   .replace("speedScale(this.data.levels.speed,.03,.5,this.game.equipment.speedLevels)","(this.data.levels.speed?scale(this.data.levels.speed,.03,.5):0)")
   .replace("      if(!target && combo.target!==null && g.enemies.some(e=>e.id===combo.target && e.state!=='dead'))return;\n",'')
   .replace("import {groundedForRoots,releaseInvalidRoots} from './roots-armor.mjs';\n",'')
   .replace('groundedForRoots(e)','(!e.flying&&!e.airborne&&Math.abs(e.y-e.surface.y)<1)')
   .replace("      if(id==='roots')releaseInvalidRoots(g,a);\n",'')
   .replace(/^  const armorLevels=.*\n/m,'')
   .replace('integer(level,1,20)+armorLevels','integer(level,1,20)')
   .replace('scale(Math.min(level,POWER_CAP),.25,1)','scale(level,.25,1)')
   .replace('[20,.75],[29,.84]','[20,.75]').replace('[20,8],[29,10.25]','[20,8]')
   .replace('projectiles:level>=20','projectiles:level===20').replace('pierce:level>=20','pierce:level===20');
 assert.equal(powers,base('powers.mjs'));
 assert.equal(cleanupBefore('world.mjs'),base('world.mjs'));
 const before=git('show',WORLD_BASE+':royale/core.mjs'),after=withoutHitCorrection(readFileSync(new URL('../core.mjs',import.meta.url),'utf8'));
 for(const [start,end] of [['  attackDefinition(', '  interact()'],['    const axis =','    if(input.heal)'],['    if (h.attackBuffer)','    for (const e of this.enemies)'],['  stepEnemy(', '  save()']])assert.equal(after.slice(after.indexOf(start),after.indexOf(end)),before.slice(before.indexOf(start),before.indexOf(end)),`Protected simulation block ${start}`);
}
