import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
export const BALANCE_BASE='88ff10dfe09fe70ac9031e2343c171db89ebb97c';
export const BALANCE_FILES=new Set(['combat-tuning.mjs','eris.css','eris.mjs','eris-ui.mjs','tests/balance-preservation.mjs','tests/combat-balance-report.mjs','tests/balance-selling.test.mjs','tests/balance-browser.html','tests/balance-browser.mjs','tests/fireball-armor.test.mjs','tests/roots-armor.test.mjs','tests/strength-armor.test.mjs','tests/super-kick-armor.test.mjs','tests/whirlwind-armor.test.mjs','tests/phase6.test.mjs','tests/phase7.test.mjs','tests/phase3-checks.mjs','BALANCE-RELEASE.md','qa/balance/before.json','qa/balance/after.json'].map(p=>'royale/'+p));
export function withoutBalance(name,s){
 if(name==='core.mjs')return s.replace("import {BASIC_GROWTH} from './combat-tuning.mjs';\n",'').replace('reach: 59, damage: 5','reach: 59, damage: 13').replace('reach: 76, damage: 8','reach: 76, damage: 19').replace('damage+BASIC_GROWTH[kind]*(this.hero.level-1)','damage+3*(this.hero.level-1)');
 if(name==='eris.mjs')return s.replace("    if(Object.values(this.inventory.equipped).includes(uid))return failed('Unequip this item before selling it.');\n",'');
 if(name!=='powers.mjs')return s;
 s=s.replace("import {offensiveDamage} from './combat-tuning.mjs';\n",'');
 for(const [now,before] of [
 ["offensiveDamage(id,45+8*(level-1)+2*(strength-eq.strength),level,heroLevel)+2*eq.strength+eq.damage",'45+8*(level-1)+2*strength+eq.damage'],
 ["offensiveDamage(id,16+2*(level-1)+.5*(strength-eq.strength),level,heroLevel)+.5*eq.strength+eq.damage",'16+2*(level-1)+.5*strength+eq.damage'],
 ["offensiveDamage(id,24+5*(level-1),level,heroLevel)+eq.fireball",'24+5*(level-1)+eq.fireball'],
 ["offensiveDamage(id,6+2*(level-1),level,heroLevel)+eq.roots",'6+2*(level-1)+eq.roots'],
 ["offensiveDamage(id,10+3*(level-1),level,heroLevel)+eq.whirlwind",'10+3*(level-1)+eq.whirlwind']])s=s.replace(now,before);
 return s;
}
export function assertBalanceScope(){
 const git=(...a)=>execFileSync('git',a,{cwd:new URL('../../',import.meta.url),encoding:'utf8',maxBuffer:32e6}).trimEnd();
 for(const name of ['core.mjs','powers.mjs','eris.mjs'])assert.equal(withoutBalance(name,readFileSync(new URL('../'+name,import.meta.url),'utf8')).trimEnd(),git('show',BALANCE_BASE+':royale/'+name),`Only authorized damage formulas / worn-sale protection changed in ${name}`);
 assert.equal(git('diff','--name-only',BALANCE_BASE,'--','assets','index.html','royale/assets','royale/progression.mjs','royale/equipment.mjs','royale/costume-catalog.mjs','royale/world.mjs','royale/monsters.mjs','royale/journey.mjs','royale/saves.mjs','royale/save-policy.mjs','royale/boss-data.mjs','royale/legendary-data.mjs','royale/bosses.mjs','royale/legendary-bosses.mjs'),'','Art, XP, rewards, respawns, population, saves, item bonuses and boss mechanics stay exact');
}

for(const p of ['tests/expected-balance.mjs','tests/armor-integration.test.mjs','tests/agility-armor.test.mjs','tests/speed-armor.test.mjs','tests/steel-armor.test.mjs','tests/phase5.test.mjs'])BALANCE_FILES.add('royale/'+p);
BALANCE_FILES.add('royale/multiplayer/tests/combat.test.mjs');
BALANCE_FILES.add('royale/tests/powers-lab.mjs');
for(const path of ['royale-sell-landscape.jpg','royale-sale-confirmation.jpg'])BALANCE_FILES.add('royale/qa/balance/'+path);
