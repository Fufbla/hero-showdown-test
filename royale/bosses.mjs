import { ARENA, BOSSES, BOSS_MOVEMENT, attackFor, bossPhase } from './boss-data.mjs';
import { bossVictory, monsterXP } from './progression.mjs';
import { rollChest, initialBossProgress } from './boss-state.mjs';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const floor=()=>({id:'arena-floor',x:0,y:ARENA.floor,w:1820,h:180,kind:'rock'});
export const arenaSurfaces=()=>[floor(),{id:'arena-right',x:1820,y:-400,w:60,h:1180,kind:'rock'},...[650,1370].map((x,i)=>({id:`arena-platform-${i}`,x,y:440,w:140,h:20,oneWay:true,kind:'rock'}))];
export function makeBoss(region,surface){const d=BOSSES[region];return {id:100,type:`boss-${region}`,boss:true,region,level:d.level,x:ARENA.bossX,y:ARENA.floor,prevX:ARENA.bossX,prevY:ARENA.floor,spawnX:ARENA.bossX,surface,spawnSurface:surface,w:region===4?240:140,h:region===4?165:180,hp:d.hp,maxHp:d.hp,damage:d.damage,face:-1,state:'idle',age:0,phase:1,pattern:0,flash:0,protection:0,stagger:0,attack:null,rooted:false,lifted:false,respawn:0};}
function attackZones(b,attack){
  const x=attack.targetX,y=ARENA.floor,shape=attack.shape;
  if(shape==='ground'||shape==='fall')return Array.from({length:attack.spots||1},(_,i)=>({x:clamp(x+(i-((attack.spots||1)-1)/2)*210,300,1720)-attack.width/2,y:shape==='ground'?y-52:80,w:attack.width,h:shape==='ground'?52:y-80}));
  if(shape==='melee')return [{x:b.face>0?b.x:b.x-attack.reach,y:y-105,w:attack.reach,h:105}];
  if(shape==='sweep')return [{x:b.x-attack.reach,y:y-48,w:attack.reach*2,h:48}];
  return [];
}
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function fire(g,b){
  const a=b.attack,h=g.hero,damage=b.damage*a.damage,shot=(x,y,vx,vy=0,color='#e6cc83')=>g.enemyShots.push({x,y,vx,vy,life:5,source:b,damage,color,bossShot:true});
  if(a.shape==='projectile'){
    const x=b.x+b.face*(b.w*.5+10),y=b.y-70,angle=Math.atan2(h.y-48-y,h.x-x),speed=a.speed*(b.phase===1?1:1.12);
    for(let i=0;i<a.count;i++){const theta=angle+(i-(a.count-1)/2)*.14;shot(x,y,Math.cos(theta)*speed,Math.sin(theta)*speed,a.color);}
  }else if(a.shape==='wave'){
    for(const direction of [-1,1]){shot(b.x+direction*75,ARENA.floor-22,direction*a.speed);if(a.double)shot(b.x+direction*30,ARENA.floor-26,direction*a.speed*.72);}
  }else if(a.shape==='fall')for(const z of a.zones)shot(z.x+z.w/2,90,0,370,'#baad8c');
  else if(a.zones.some(z=>overlap(z,g.heroBox())))g.hurt(damage,b.x,b);
  g.emit('boss-attack',{kind:a.kind});
}
export function stepBoss(g,b,dt){
  b.prevX=b.x;b.prevY=b.y;b.flash=Math.max(0,b.flash-dt);if(b.state==='dead'){b.age+=dt;return;}
  b.age+=dt;const d=BOSSES[b.region],h=g.hero;
  if(b.state==='idle'){
    b.face=Math.sign(h.x-b.x)||b.face;
    const distance=Math.abs(h.x-b.x),motion=BOSS_MOVEMENT[b.region];
    const gait=motion.style==='weave'?.65+.35*Math.sin(g.time*3)**2:motion.style==='heavy'?.55+.45*Math.max(0,Math.sin(g.time*2.5)):1;
    const speed=d.speed*gait*(b.phase===1?1:b.phase===2?1.2:1.35)*(b.rooted?.5:1);
    const direction=distance>motion.approach?b.face:distance<motion.retreat?-b.face:motion.style==='drift'?Math.sin(g.time*1.7)*.25:0;
    b.x=clamp(b.x+direction*speed*dt,350,1690);
    if(b.age>=[1.25,1.25,.8,.55][b.phase]){
      const pattern=d.patterns[b.phase-1],kind=pattern[b.pattern++%pattern.length];
      // The articulated stinger has a physical reach: its warning and hit zone share the same endpoint.
      const targetX=b.region===4?clamp(h.x,b.x-200,b.x+200):clamp(h.x,300,1720);
      b.attack={...attackFor(b,kind),targetX};b.attack.zones=attackZones(b,b.attack);b.state='windup';b.age=0;
    }
  }else if(b.state==='windup'&&b.age>=b.attack.warning){b.state='active';b.age=0;b.attack.fired=false;if(b.region!==4){fire(g,b);b.attack.fired=true;}}
  else if(b.state==='active'){if(!b.attack.fired&&b.age>=b.attack.duration*.65){fire(g,b);b.attack.fired=true;}if(b.age>=b.attack.duration){b.state='recover';b.age=0;}}
  else if(b.state==='recover'&&b.age>=b.attack.recovery){b.state='idle';b.age=0;b.attack=null;}
}
export const bossMethods={
  initializeBosses(save){this.bossProgress=structuredClone(save?.bossProgress||initialBossProgress(this.world.bossVictories));this.arenaScene=null;this.pendingBossEntry=null;},
  enterBoss(){
    if(this.arenaScene||!this.canTravel()||!this.hero.grounded)return false;
    // This is a single safe entry snapshot, not a mid-combat save or a new periodic autosave.
    this.pendingBossEntry={region:this.regionId,mode:'restart'};const snapshot=this.save();this.pendingBossEntry=null;
    this.startBossScene('restart');this.emit('boss-entry',{snapshot});return true;
  },
  startBossScene(mode='restart'){
    const h=this.hero;this.arenaScene={region:this.regionId,cleared:mode==='cleared',returnLocation:{x:h.x,y:h.y,face:h.face},surfaces:this.surfaces,enemies:this.enemies,camps:this.camps};
    this.powers.cancelEffects();this.enemyShots=[];this.surfaces=arenaSurfaces();this.camps=[];
    Object.assign(h,{x:ARENA.heroX,prevX:ARENA.heroX,y:ARENA.floor,prevY:ARENA.floor,vx:0,vy:0,grounded:true,jumps:0,jumpBuffer:0,coyote:.1,attack:null,attackBuffer:null,face:1,invulnerable:1.2});
    const b=makeBoss(this.regionId,this.surfaces[0]);this.arenaScene.boss=b;this.enemies=[b];
    if(mode==='cleared'){b.hp=0;b.state='dead';this.bossEncounter=null;this.combatTimer=0;}
    else this.bossEncounter={region:this.regionId,boss:b,waves:0,spawned:0,elapsed:0,nextWave:null,waveWarning:0,sequence:0};
    this.emit('arena',{mode});
  },
  leaveBoss(reason='retreat'){
    const scene=this.arenaScene;if(!scene)return false;
    this.powers.cancelEffects();this.enemyShots=[];this.hero.attack=null;this.hero.attackBuffer=null;
    this.surfaces=scene.surfaces;this.enemies=scene.enemies;this.camps=scene.camps;this.arenaScene=null;this.bossEncounter=null;
    Object.assign(this.hero,{x:scene.returnLocation.x,prevX:scene.returnLocation.x,y:scene.returnLocation.y,prevY:scene.returnLocation.y,vx:0,vy:0,grounded:true,jumps:0,face:-1,invulnerable:1.5});
    this.combatTimer=reason==='defeat'?0:5;this.emit('arena-exit',{reason});return true;
  },
  bossDamaged(b){
    const old=b.phase;b.phase=bossPhase(b.hp/b.maxHp);if(old!==b.phase)this.emit('boss-phase',{phase:b.phase});
    if(b.hp<=0){b.state='dead';b.age=0;b.attack=null;b.rooted=false;this.enemyShots=this.enemyShots.filter(p=>p.source!==b);this.emit('boss-down');}
  },
  stepEncounter(dt){
    const scene=this.arenaScene;if(!scene)return;
    if(this.hero.x<ARENA.left&&!this.hero.dead){this.leaveBoss();return;}
    const encounter=this.bossEncounter;if(!encounter||this.hero.dead)return;
    const b=encounter.boss;encounter.elapsed+=dt;
    if(b.hp>0&&b.phase===3&&encounter.waves<ARENA.waveLimit){
      if(encounter.nextWave===null)encounter.nextWave=encounter.elapsed+ARENA.waveWarning;
      const alive=this.enemies.filter(e=>e.summoned&&e.state!=='dead');
      encounter.waveWarning=alive.length===0?Math.max(0,Math.min(ARENA.waveWarning,encounter.nextWave-encounter.elapsed)):0;
      if(encounter.elapsed>=encounter.nextWave&&alive.length===0){
        for(let i=0;i<ARENA.helpersPerWave;i++){
          const choices=[450+i*60,980+i*70,1490+i*60],x=choices.sort((a,b)=>Math.abs(this.hero.x-b)-Math.abs(this.hero.x-a))[0];
          const e=this.makeEnemy(BOSSES[this.regionId].helper,x,'arena-floor',200+encounter.spawned++);e.summoned=true;e.level=BOSSES[this.regionId].level;e.provoked=true;e.protection=1.2;this.enemies.push(e);
        }
        encounter.waves++;encounter.nextWave=encounter.elapsed+ARENA.waveDelay;encounter.waveWarning=0;this.emit('boss-wave',{wave:encounter.waves});
      }
    }else encounter.waveWarning=0;
    if(b.hp<=0&&this.enemies.every(e=>e.state==='dead')&&!this.hero.dead)this.completeBoss();
  },
  completeBoss(){
    const fight=this.bossEncounter;if(!fight||this.hero.dead||fight.boss.hp>0||this.enemies.some(e=>e.state!=='dead'))return false;
    const reward=bossVictory(this.world,fight.region);if(!reward.ok)return false;
    const existing=this.bossProgress.records[fight.region];
    this.bossProgress.records[fight.region]=existing?{...existing,wins:existing.wins+1}:{wins:1,chest:rollChest(fight.region,this.random)};
    this.hero.coins=Math.min(999999,this.hero.coins+reward.coins);const xp=this.hero.level<99?monsterXP(BOSSES[fight.region].xp,this.hero.level,BOSSES[fight.region].level):0;this.gainXP(xp);
    this.bossEncounter=null;this.arenaScene.cleared=true;this.powers.cancelEffects();this.enemyShots=[];this.hero.attack=null;this.hero.attackBuffer=null;this.combatTimer=0;
    this.emit('boss-victory',{...reward,xp,name:BOSSES[fight.region].name,region:fight.region});return true;
  },
  availableChest(){return this.arenaScene?.cleared&&this.bossProgress.records[this.regionId]?.chest.state==='available'?this.bossProgress.records[this.regionId].chest:null;},
  claimChest(){
    const chest=this.availableChest();if(!chest||!this.canSave()||this.inventory.pending.length)return false;
    this.hero.coins=Math.min(999999,this.hero.coins+chest.coins);const roots=Math.min(4-this.healthRoots,chest.roots);this.healthRoots+=roots;
    for(const item of chest.items)this.inventory.pending.push({uid:`drop-${this.inventory.nextId++}`,catalogId:item.catalogId});
    chest.state='claimed';this.emit('chest-claimed',{coins:chest.coins,roots,overflow:chest.roots-roots});return true;
  },
  acceptReward(){if(!this.inventory.pending.length||this.inventory.items.length>=7||!this.canSave())return false;this.inventory.items.push(this.inventory.pending.shift());return true;},
};
