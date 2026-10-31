import {Game} from '../core.mjs';
import {PROFILE_KEY} from '../saves.mjs';
import {bossVictory} from '../progression.mjs';
export function saveErisFixture(session,level=50,coins=5000){
 const g=new Game({random:()=>.99});for(let r=1;r<4;r++)bossVictory(g.world,r);g.travel(4);g.hero.level=level;g.hero.maxHp=100+(level-1)*15;g.hero.hp=Math.round(g.hero.maxHp*.65);g.hero.coins=coins;g.hero.x=123.5;g.hero.y=600;g.look.name='Eris Practice Hero';g.powers.data.points=level-1;g.healthRoots=1;g.visitTree();
 const snapshot=JSON.parse(g.save()),stamp=new Date().toISOString();sessionStorage.setItem(`royale-test-${session}:${PROFILE_KEY}`,JSON.stringify({version:2,revision:0,activeSlot:0,legacyImported:true,slots:[{id:'eris-practice',createdAt:stamp,updatedAt:stamp,lastRegion:'Tree of Eris',snapshot},null,null]}));return snapshot;
}
