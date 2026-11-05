import {assertAccountSafetyScope} from './account-preservation.mjs';
import {withoutBalance,assertBalanceScope,BALANCE_FILES} from './balance-preservation.mjs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
export const CORRECTIONS_BASE='04466d81dc161cded79056177d30861e6831a6e2';
export const CORRECTION_FILES=new Set(['tests/menu-gamepad.test.mjs','tests/flight-armor.test.mjs','tests/phase3.test.mjs','tests/polish.test.mjs','tests/final-mobile.mjs','app.mjs','core.mjs','creator.mjs','index.html','input.mjs','monsters.mjs','powers.mjs','style-c-face.mjs','style-c-hair.mjs','world-ui.css','menu-gamepad.mjs','hair-fit-corrections.mjs','tests/core.test.mjs','tests/player-corrections.test.mjs','tests/player-corrections-preservation.mjs','tests/final-preservation.mjs','tests/final-integration.test.mjs','tests/cleanup-preservation.mjs','tests/world-ui-preservation.mjs','tests/player-corrections-browser.html','tests/player-corrections-browser.mjs','PLAYER-CORRECTIONS.md'].map(p=>'royale/'+p));
const git=(...args)=>execFileSync('git',args,{cwd:new URL('../../',import.meta.url),encoding:'utf8',maxBuffer:32*1024*1024}).trimEnd();
export function withoutHitCorrection(current){
 current=withoutBalance('core.mjs',current);
 const before=git('show',CORRECTIONS_BASE+':royale/core.mjs');
 const start='  hurt(amount, fromX, source = {}) {',end='  defeat() {';
 return current.replace('    this.hitRecovery=new Map();this.hitEvents=new Map();\n','').replace(current.slice(current.indexOf(start),current.indexOf(end)),before.slice(before.indexOf(start),before.indexOf(end)));
}
export function assertCombatCorrectionScope(){
 assertBalanceScope();
 const read=n=>readFileSync(new URL('../'+n,import.meta.url),'utf8').trimEnd();
 const before=n=>git('show',CORRECTIONS_BASE+':royale/'+n);
 assert.equal(withoutHitCorrection(read('core.mjs')),before('core.mjs'),'Only damage event tracking/recovery may change in core');
 assert.equal(withoutBalance('powers.mjs',read('powers.mjs')),before('powers.mjs').replace('y:h.y-45,vx:burst.face','y:h.y-30,vx:burst.face'),'Only Fireball vertical origin changes; all balance and piercing remain exact');
 assert.equal(read('monsters.mjs'),before('monsters.mjs').replace("e.state='strike';e.age=0;e.hit=false;","e.state='strike';e.age=0;e.hit=false;e.damageEvent={};"),'Only a strike identity may change in monster AI');
 assert.equal(git('diff','--name-only',CORRECTIONS_BASE,'--','assets','royale/assets','royale/progression.mjs','royale/equipment.mjs','royale/save-policy.mjs','royale/boss-data.mjs','royale/legendary-data.mjs','royale/bosses.mjs','royale/legendary-bosses.mjs'),'','Approved art, rewards, progression, saves and bosses remain byte-identical');
}

for(const path of BALANCE_FILES)CORRECTION_FILES.add(path);

assertAccountSafetyScope();
