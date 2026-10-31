import { LEGENDARY, LEGENDARY_ATTACKS, LEGENDARY_HP, MERGE_CATALOG } from './legendary-data.mjs';
import { ARENA, bossPhase } from './boss-data.mjs';
import { itemDefinition } from './equipment.mjs';
import { arenaSurfaces } from './bosses.mjs';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
export function makeLegendary(id,surface){const d=LEGENDARY[id];return {id:100,type:`boss-legendary-${id}`,boss:true,legendary:true,legendaryId:id,region:d.region,level:99,x:1180,y:id==='air'?530:600,prevX:1180,prevY:id==='air'?530:600,spawnX:1180,surface,spawnSurface:surface,w:id==='styrodog'?165:145,h:id==='air'?155:190,hp:LEGENDARY_HP(),maxHp:LEGENDARY_HP(),damage:d.damage,face:-1,state:'idle',age:0,phase:1,pattern:0,flash:0,protection:0,stagger:0,attack:null,rooted:false,lifted:false,flying:id==='air',airborne:id==='air',respawn:0};}
export function legendaryZones(b,a){
 const y=ARENA.floor;
 if(['ground','lightning','fall','leap','trap','cloud','tornado'].includes(a.shape))return Array.from({length:a.spots||1},(_,i)=>({x:clamp(a.targetX+(i-((a.spots||1)-1)/2)*240,310,1700)-a.width/2,y:a.shape==='fall'?90:y-(a.shape==='cloud'||a.shape==='tornado'?185:55),w:a.width,h:a.shape==='fall'?510:a.shape==='cloud'||a.shape==='tornado'?185:55}));
 if(a.shape==='melee'||a.shape==='charge')return [{x:b.face>0?b.x:b.x-a.reach,y:y-105,w:a.reach,h:105}];
 if(a.shape==='sweep')return [{x:b.x-a.reach,y:y-55,w:a.reach*2,h:55}];
 return [];
}
function fireLegendary(g,b){
 const a=b.attack,h=g.hero,damage=b.damage*a.damage;
 const shot=(x,y,vx,vy=0,extra={})=>{if(g.enemyShots.length<40)g.enemyShots.push({x,y,vx,vy,life:5,source:b,damage,color:a.color||LEGENDARY[b.legendaryId].colors[1],bossShot:true,...extra});};
 if(a.shape==='projectile'||a.shape==='bounce'){
  const x=b.x+b.face*(b.w/2+12),y=b.y-75,angle=Math.atan2(h.y-45-y,h.x-x);
  for(let i=0;i<a.count;i++){const theta=angle+(i-(a.count-1)/2)*.18;shot(x,y,Math.cos(theta)*a.speed,a.shape==='bounce'?-270-i*55:Math.sin(theta)*a.speed,a.shape==='bounce'?{bounce:3,gravity:650}:{});}
 }else if(a.shape==='wave'){for(const direction of [-1,1]){shot(b.x+direction*70,578,direction*a.speed);if(a.double)shot(b.x+direction*25,578,direction*a.speed*.63);}}
 else if(a.shape==='fall')for(const z of a.zones)shot(z.x+z.w/2,90,0,390);
 else if(['cloud','tornado','trap'].includes(a.shape))for(const z of a.zones)g.legendaryHazards.push({...z,source:b,damage,kind:a.shape,life:a.life,age:0,next:0,vx:a.shape==='cloud'?b.face*75:a.shape==='tornado'?b.face*95:0});
 else if(a.shape!=='barrier'&&a.shape!=='leap'&&a.shape!=='charge'&&a.zones.some(z=>overlaps(z,g.heroBox())))g.hurt(damage,b.x,b);
 if(a.hazard)for(const z of a.zones)g.legendaryHazards.push({...z,source:b,damage,kind:'lightning',life:2,age:0,next:1,vx:0});
 g.emit('boss-attack',{kind:a.kind});
}
export function stepLegendaryBoss(g,b,dt){
 b.prevX=b.x;b.prevY=b.y;b.flash=Math.max(0,b.flash-dt);b.age+=dt;if(b.state==='dead')return;
 const d=LEGENDARY[b.legendaryId],h=g.hero;
 if(b.state==='idle'){
  b.face=Math.sign(h.x-b.x)||b.face;const distance=Math.abs(h.x-b.x),ranged=['hover','scientist','reactor','crystal'].includes(d.style),desired=ranged?290:150;
  const direction=distance>desired?b.face:ranged&&distance<170?-b.face:0,gait=d.style==='heavy'?.7+.3*Math.max(0,Math.sin(g.time*2.5)):d.style==='crystal'?.8+.2*Math.sin(g.time*2)**2:1;
  b.x=clamp(b.x+direction*d.speed*gait*(b.phase===1?1:b.phase===2?1.15:1.3)*(b.rooted?.5:1)*dt,340,1670);
  if(d.style==='hover')b.y=525+Math.sin(g.time*1.8)*18;
  if(b.age>=[1.2,1.2,.85,.65][b.phase]){
   const pattern=d.patterns[b.phase-1],kind=pattern[b.pattern++%pattern.length],base=LEGENDARY_ATTACKS[kind];
   // Lightning always has one warning area, including its desperation pattern.
   const warning=base.warning*(b.phase===1?1:b.phase===2?.96:.92);
   b.attack={...base,kind,warning,targetX:clamp(h.x,300,1720),startX:b.x,startY:b.y,hit:false};if(base.shape==='leap'&&b.rooted)b.attack.targetX=b.x+(b.attack.targetX-b.x)*.5;b.attack.zones=legendaryZones(b,b.attack);b.state='windup';b.age=0;
  }
 }else if(b.state==='windup'&&b.age>=b.attack.warning){b.state='active';b.age=0;if(b.attack.shape==='leap')b.airborne=true;fireLegendary(g,b);}
 else if(b.state==='active'){
  const a=b.attack;
  if(a.shape==='charge'){b.x=clamp(b.x+b.face*a.speed*(b.rooted?.5:1)*dt,310,1700);if(!a.hit&&overlaps({x:b.x-b.w/2-18,y:b.y-100,w:b.w+36,h:100},g.heroBox())){a.hit=true;g.hurt(b.damage*a.damage,b.x,b);}}
  if(a.shape==='leap'){
   const q=Math.min(1,b.age/a.duration);b.x=a.startX+(a.targetX-a.startX)*q;b.y=600-Math.sin(q*Math.PI)*180;
   if(q>=.98&&!a.hit){a.hit=true;b.airborne=false;b.y=600;if(a.zones.some(z=>overlaps(z,g.heroBox())))g.hurt(b.damage*a.damage,b.x,b);}
  }
  if(b.age>=a.duration){b.state='recover';b.age=0;if(a.shape==='leap'){b.y=600;b.airborne=false;}}
 }else if(b.state==='recover'&&b.age>=b.attack.recovery*(b.phase===1?1:.94)){b.state='idle';b.age=0;b.attack=null;}
}
export const legendaryMethods={
 initializeLegendaryRuntime(){this.legendaryHazards=[];this.pendingLegendaryVictory=null;this.disruptedPower=null;this.legendaryStorageReady=false;},
 enterLegendary(id){
  if(!LEGENDARY[id]||this.hero.level!==99||!this.legendaryStorageReady||this.arenaScene||!this.canTravel()||!this.hero.grounded)return false;
  if(!this.legendary.defeated[id]&&!this.powers.data.equipped.some(id=>id&&this.powers.data.levels[id]))return false;
  const mode=this.legendary.defeated[id]?'cleared':'restart';this.pendingBossEntry={legendary:id,mode};const snapshot=this.save();this.pendingBossEntry=null;
  this.startLegendaryScene(id,mode);this.emit('boss-entry',{snapshot});return true;
 },
 startLegendaryScene(id,mode='restart'){
  const h=this.hero,defeated=!!this.legendary.defeated[id];mode=defeated?'cleared':mode;
  this.arenaScene={legendary:id,region:this.regionId,cleared:mode==='cleared',returnLocation:{x:h.x,y:h.y,face:h.face},surfaces:this.surfaces,enemies:this.enemies,camps:this.camps};
  this.powers.cancelEffects();this.cancelMergeEffects();this.enemyShots=[];this.legendaryHazards=[];this.surfaces=arenaSurfaces();this.camps=[];
  Object.assign(h,{x:420,prevX:420,y:600,prevY:600,vx:0,vy:0,grounded:true,jumps:0,jumpBuffer:0,coyote:.1,attack:null,attackBuffer:null,face:1,invulnerable:1.2});
  const b=makeLegendary(id,this.surfaces[0]);this.arenaScene.boss=b;this.enemies=[b];this.disruptedPower=null;
  if(mode==='cleared'){b.hp=0;b.state='dead';b.age=2;this.bossEncounter=null;this.combatTimer=0;}
  else{const choices=this.powers.data.equipped.filter(id=>id&&this.powers.data.levels[id]);this.disruptedPower=choices.length?choices[Math.min(choices.length-1,Math.floor(this.random()*choices.length))]:null;this.bossEncounter={legendary:id,region:this.regionId,boss:b,waves:0,spawned:0,elapsed:0,nextWave:null,waveWarning:0};}
  this.emit('arena',{mode,legendary:id});
 },
 stepLegendaryEncounter(dt){
  const scene=this.arenaScene;if(!scene?.legendary)return;
  if(this.hero.x<ARENA.left&&!this.hero.dead){this.leaveBoss();return;}
  for(const a of this.legendaryHazards){a.age+=dt;a.life-=dt;a.x=clamp(a.x+a.vx*dt,240,1700);if(a.age>=a.next){a.next+=1;if(overlaps(a,this.heroBox()))this.hurt(a.damage,a.x+a.w/2,a.source);}}
  this.legendaryHazards=this.legendaryHazards.filter(a=>a.life>0&&a.source.hp>0);
  const fight=this.bossEncounter;if(!fight||this.hero.dead)return;const b=fight.boss;fight.elapsed+=dt;
  if(b.phase>=2)this.disruptedPower=null;
  if(b.hp>0&&b.phase===3&&fight.waves<3){
   if(fight.nextWave===null)fight.nextWave=fight.elapsed+2.5;
   const living=this.enemies.filter(e=>e.summoned&&e.state!=='dead');fight.waveWarning=living.length?0:Math.max(0,Math.min(2.5,fight.nextWave-fight.elapsed));
   if(!living.length&&fight.elapsed>=fight.nextWave){
    for(let i=0;i<3;i++){
     const x=[450+i*65,1010+i*55,1500+i*55].sort((a,b)=>Math.abs(this.hero.x-b)-Math.abs(this.hero.x-a))[0],e=this.makeEnemy(LEGENDARY[scene.legendary].helper,x,'arena-floor',200+fight.spawned++);
     Object.assign(e,{summoned:true,legendaryHelper:true,helperTheme:scene.legendary,level:99,w:55,h:80,hp:1400,maxHp:1400,damage:100,provoked:true,protection:1.2});this.enemies.push(e);
    }
    fight.waves++;fight.nextWave=fight.elapsed+14;fight.waveWarning=0;this.emit('boss-wave',{wave:fight.waves});
   }
  }else fight.waveWarning=0;
  if(b.hp<=0&&this.enemies.every(e=>e.state==='dead')&&!this.hero.dead&&!this.pendingLegendaryVictory){this.pendingLegendaryVictory=scene.legendary;this.paused=true;this.emit('legendary-clear-ready',{id:scene.legendary});}
 },
 prepareLegendaryVictory(){
  const id=this.pendingLegendaryVictory,fight=this.bossEncounter;
  if(!id||!fight?.legendary||this.hero.dead||fight.boss.hp>0||this.enemies.some(e=>e.state!=='dead')||this.legendary.defeated[id])return false;
  this.legendary.defeated[id]={claimed:false,pieces:['helmet','chest','boots'].map(part=>({uid:`drop-${this.inventory.nextId++}`,catalogId:`merge-${id}-${part}`,state:'unclaimed'}))};
  this.legendary.revision++;this.recordEconomy('legendary');this.bossEncounter=null;this.arenaScene.cleared=true;this.disruptedPower=null;this.powers.cancelEffects();this.cancelMergeEffects();this.enemyShots=[];this.legendaryHazards=[];this.hero.attack=null;this.hero.attackBuffer=null;this.combatTimer=0;this.pendingLegendaryVictory=null;return true;
 },
 pendingMergeReward(){return Object.entries(this.legendary.defeated).find(([,r])=>!r.claimed)?.[0]||null;},
 claimMergeReward(id,keepUids,discardUids,{confirmed=false,revision}={}){
  const record=this.legendary.defeated[id];if(!confirmed||revision!==this.legendary.revision||!this.canSave()||!record||record.claimed||!Array.isArray(keepUids)||!Array.isArray(discardUids))return false;
  if(new Set(keepUids).size!==keepUids.length||new Set(discardUids).size!==discardUids.length||keepUids.some(uid=>!record.pieces.some(p=>p.uid===uid))||discardUids.some(uid=>!this.inventory.items.some(p=>p.uid===uid))||this.inventory.items.length-discardUids.length+keepUids.length>7)return false;
  for(const uid of discardUids)this.retireItem(uid);this.inventory.items=this.inventory.items.filter(i=>!discardUids.includes(i.uid));
  record.claimed=true;
  for(const p of record.pieces){if(keepUids.includes(p.uid)){this.inventory.items.push({uid:p.uid,catalogId:p.catalogId});p.state='owned';}else{p.state='discarded';this.retireItem(p.uid);}}
  this.legendary.revision++;this.recordEconomy('legendary');this.refreshEquipment();return true;
 },
 equipMergeMix(selection){
  if(!this.treeVisit||!this.canSave()||!selection)return false;
  const parts=['helmet','chest','boots'];
  for(const part of parts){const uid=selection[part];if(uid&&!this.inventory.items.some(i=>i.uid===uid&&itemDefinition(i)?.part===part))return false;}
  for(const part of parts){if(selection[part])this.inventory.equipped[part]=selection[part];else delete this.inventory.equipped[part];}delete this.inventory.equipped.mask;delete this.inventory.equipped.suit;
  this.recordEconomy('equip');this.refreshEquipment();return true;
 },
 activateMergeSet(id){
  if(!this.treeVisit||!this.canSave())return false;
  const pieces=['helmet','chest','boots'].map(part=>this.inventory.items.find(i=>i.catalogId===`merge-${id}-${part}`));if(pieces.some(p=>!p))return false;
  for(const [i,part] of ['helmet','chest','boots'].entries())this.inventory.equipped[part]=pieces[i].uid;delete this.inventory.equipped.mask;delete this.inventory.equipped.suit;
  this.recordEconomy('equip');this.refreshEquipment();return true;
 },
 returnNormalEquipment(){
  if(!this.treeVisit||!this.canSave())return false;
  for(const [part,uid] of Object.entries(this.inventory.equipped))if(this.inventory.items.find(i=>i.uid===uid)?.catalogId.startsWith('merge-'))delete this.inventory.equipped[part];
  this.recordEconomy('equip');this.refreshEquipment();return true;
 },
};
