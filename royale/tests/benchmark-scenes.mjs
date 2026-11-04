// Development-only, deterministic fixtures shared by CPU and browser benchmarks.
// None of these helpers is imported by an ordinary adventure session.
export const SCENARIOS=['empty','monsters','vertical','effects','regional','legendary','touch'];
export function scenarioGame(Game,scene){
 let seed=4251;const g=new Game({look:{name:'QA Benchmark',cape:true},random:()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296)});
 g.travel(scene==='regional'?4:scene==='empty'?1:scene==='vertical'||scene==='touch'?6:7);g.gainXP(1e8);g.hero.invulnerable=1e9;g.hero.coins=200;g.healthRoots=4;g.started=true;
 for(const [id,n] of Object.entries({strength:1,superKick:1,fireball:20,flight:5,steel:5,roots:20,agility:5,speed:20,whirlwind:20}))g.powers.data.levels[id]=n;
 g.powers.data.points=1;g.powers.data.equipped=['fireball','roots','whirlwind'];
 if(scene==='empty')g.enemies=[];
 else if(scene==='regional'||scene==='legendary'){
  g.legendaryStorageReady=true;if(scene==='regional')g.enterBoss();else{g.enterLegendary('lightning');const b=g.arenaScene.boss;g.damageEnemy(b,b.maxHp*.81,{stagger:false});g.stepLegendaryEncounter(0);g.stepLegendaryEncounter(3);}
  g.hero.x=g.hero.prevX=820;g.hero.invulnerable=1e9;
 }else if(scene==='vertical'||scene==='touch'){const s=g.surfaces.find(s=>s.id==='climb-0-4');Object.assign(g.hero,{x:s.x+40,prevX:s.x+40,y:s.y,prevY:s.y});}
 else{const floor=g.surfaces[0];g.hero.x=g.hero.prevX=680;for(let i=0;i<9;i++){const e=g.enemies[i];Object.assign(e,{surface:floor,spawnSurface:floor,x:780+i*65,prevX:780+i*65,spawnX:780+i*65,y:floor.y,prevY:floor.y,protection:0});}}
 g.events.length=0;return g;
}
export function scenarioInput(g,scene,tick){
 const input={};if(scene==='effects'||scene==='legendary'||scene==='regional'){input.powers=[true,true,true];input.punchHeld=true;input.kickHeld=tick%120<60;}
 // Real ability cooldowns and monster behavior remain active. No damage is fabricated.
 return input;
}
