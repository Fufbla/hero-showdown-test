// Reproducible analytical bounds, not a claim of human boss victories.
import {Game,ATTACKS} from '../core.mjs';
import {TYPES} from '../world.mjs';
import {COSTUME_SETS} from '../costume-catalog.mjs';
import {BOSSES} from '../boss-data.mjs';
import {LEGENDARY_HP} from '../legendary-data.mjs';
import {xpForLevel,monsterXP,maximumHP} from '../progression.mjs';
const gear=level=>Object.values(COSTUME_SETS).filter(s=>s.level<=level).at(-1).stats;
const rates=level=>{const g=new Game({equipment:gear(level)});g.hero.level=level;const power=level>20?20:Math.max(0,level-1);g.powers.data.levels.speed=power;return {damage:g.attackDefinition('punch').damage,dps:g.attackDefinition('punch').damage*g.powers.attackRate/ATTACKS.punch.duration};};
const monsters=Object.entries(TYPES).map(([id,m])=>{const r=rates(m.level);return {id,name:m.name,region:m.region,heroLevel:m.level,hp:m.hp,damage:m.damage,nightDamage:m.region>2?m.damage*2:m.damage,xp:m.xp,punchDamage:r.damage,uninterruptedPunchSeconds:+(Math.ceil(m.hp/r.damage)*ATTACKS.punch.duration/(r.dps*ATTACKS.punch.duration/r.damage)).toFixed(2),dayHitsToDefeatHero:Math.ceil(maximumHP(m.level)/(m.damage*(1-gear(m.level).defense))),equalLevelKillsToNext:m.level===99?null:Math.ceil(xpForLevel(m.level)/m.xp)};});
const bosses=Object.values(BOSSES).map(b=>({name:b.name,level:b.level,hp:b.hp,damage:b.damage,perfectUptimeBasicSeconds:+(b.hp/rates(b.level).dps).toFixed(1),warning:'Lower bound: no travel, knockback, defenses, misses, dodge, helpers or special powers.'}));
console.log(JSON.stringify({method:'Catalog-complete ordinary set at recommended level; legal Speed investment; uninterrupted punch bound. Human time-to-kill will differ. No combat values adjusted.',xp:[1,10,20,35,50,65,80,90,98].map(level=>({level,nextLevelXP:xpForLevel(level)})),lowLevelFarmXP:monsterXP(TYPES.bottle.xp,99,TYPES.bottle.level),monsters,bosses,legendaryHP:LEGENDARY_HP(),legendaryBasicLowerBoundSeconds:+(LEGENDARY_HP()/rates(99).dps).toFixed(1)},null,2));
