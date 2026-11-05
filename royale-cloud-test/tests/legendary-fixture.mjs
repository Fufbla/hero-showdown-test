import { Game, decodeSave } from '../core.mjs';
import { PROFILE_KEY } from '../saves.mjs';
import { bossVictory } from '../progression.mjs';
import { LEGENDARY } from '../legendary-data.mjs';
export const LEGEND_LOADOUTS={brawler:['strength','superKick','steel'],ranged:['fireball','flight','agility'],control:['roots','whirlwind','steel']};
export function legendaryFixture({level=99,loadout='brawler',boss=null}={}){
 const g=new Game({random:()=>.99,look:{name:'Legendary Vanguard',presentation:'female',hair:'locs',hairColor:'#542e32',skin:'#c48b63',eyes:'#708eac',cape:true,suit:'#33546b',trim:'#e3c97e'}});
 for(let r=1;r<=7;r++)bossVictory(g.world,r);g.travel(7);g.hero.level=level;g.hero.hp=g.hero.maxHp=100+15*(level-1);g.hero.coins=5000;g.healthRoots=4;g.hero.x=123.5;g.hero.prevX=123.5;
 const ids=LEGEND_LOADOUTS[loadout];for(const id of ids)g.powers.data.levels[id]=20;g.powers.data.levels.speed=Math.min(20,level-61);g.powers.data.points=level-1-60-g.powers.data.levels.speed;g.powers.data.equipped=[...ids];g.refreshEquipment();g.legendaryStorageReady=true;
 if(boss)g.pendingBossEntry={legendary:boss,mode:'restart'};
 return decodeSave(g.save());
}
export function legendaryGame(id='lightning',options={}){const g=new Game({save:legendaryFixture(options),random:options.random||(()=>.3)});g.legendaryStorageReady=true;if(id)g.enterLegendary(id);return g;}
export function clearLegendary(g){const boss=g.arenaScene.boss;g.damageEnemy(boss,boss.maxHp*5,{stagger:false});for(const e of g.enemies.filter(e=>e.summoned)){e.protection=0;g.damageEnemy(e,e.maxHp*5,{stagger:false});}g.stepEncounter(0);return g.prepareLegendaryVictory();}
export function claimAll(g,id=g.pendingMergeReward()){const r=g.legendary.defeated[id];return g.claimMergeReward(id,r.pieces.map(p=>p.uid),[],{confirmed:true,revision:g.legendary.revision});}
export function ownMerge(g,id){if(g.arenaScene)g.leaveBoss();g.combatTimer=0;g.paused=false;g.enterLegendary(id);clearLegendary(g);claimAll(g,id);g.leaveBoss();g.combatTimer=0;return g;}
export function saveLegendaryFixture(session,options={}){const snapshot=legendaryFixture(options),stamp=new Date().toISOString();sessionStorage.setItem(`royale-test-${session}:${PROFILE_KEY}`,JSON.stringify({version:2,revision:0,activeSlot:0,legacyImported:true,slots:[{id:`legendary-${session}`,createdAt:stamp,updatedAt:stamp,lastRegion:options.boss?LEGENDARY[options.boss].arena:'Final Showdown',snapshot},null,null]}));return snapshot;}
let sequence=0;
export function legendaryCommand(frame,action,value){const request=`legendary-${++sequence}`;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{removeEventListener('message',handler);reject(Error('Legendary fixture command timed out'));},15000);const handler=e=>{if(e.source===frame.contentWindow&&e.origin===location.origin&&e.data?.type==='royale-legendary-result'&&e.data.request===request){clearTimeout(timer);removeEventListener('message',handler);resolve(e.data.state);}};addEventListener('message',handler);frame.contentWindow.postMessage({type:'royale-legendary-fixture',request,action,value},location.origin);});}
