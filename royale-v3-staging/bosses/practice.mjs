import {BOSS_IDS,REGIONAL_IDS} from './model.mjs';
import {LEGENDARY} from '../../royale/legendary-data.mjs';
import {emptyLegendary} from '../../royale/legendary-state.mjs';
import {maxV2TestPowers} from '../../royale/v2-test-hero.mjs';
export function practiceRequest(params,allowed){
 const id=params.get('bossPractice');return allowed&&BOSS_IDS.includes(id)?{id,phase:[1,2,3].includes(Number(params.get('bossPhase')))?Number(params.get('bossPhase')):1}:null;
}
export function makePracticeGame(Game,snapshot,request){
 if(!BOSS_IDS.includes(request?.id))throw Error('Unknown practice boss');
 const next=maxV2TestPowers(structuredClone(snapshot),{starterLoadout:true});
 next.level=99;next.xp=0;next.arena=null;next.sanctuary=null;next.loot=[];
 next.world.location=null;next.world.monsters=[];next.inventory.pending=[];next.legendary=emptyLegendary();
 const g=new Game({save:next,testPowers:true}),legend=request.id.startsWith('legendary-'),key=request.id.replace(/^(regional|legendary)-/,'');
 const region=legend?LEGENDARY[key].region:REGIONAL_IDS.indexOf(key)+1;
 g.loadRegion(region,{checkpoint:true});g.treeVisit=false;g.legendaryStorageReady=true;g.healthRoots=10;g.hero.hp=g.hero.maxHp;
 if(legend)g.startLegendaryScene(key);else g.startBossScene();
 const b=g.arenaScene.boss,phase=[1,2,3].includes(request.phase)?request.phase:1;
 // Begin within sight of the opponent while leaving room to read the first attack.
 g.hero.x=b.x-420;g.hero.prevX=g.hero.x;
 b.hp=b.maxHp*({1:1,2:.5,3:.2}[phase]);g.bossDamaged(b);g.started=true;return g;
}
