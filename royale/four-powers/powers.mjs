import {retireMovementPower} from '../../royale-v3-staging/power-policy.mjs';
import {offensiveDamage} from '../../royale/combat-tuning.mjs';
import {groundedForRoots,releaseInvalidRoots} from '../../royale/roots-armor.mjs';
import { MERGE_POWERS } from '../../royale/legendary-data.mjs';
import {ProjectilePool,clearProjectiles,compactProjectiles} from '../../royale/projectiles.mjs';
// Phase 3 rules. Values not specified by the design are collected here for balancing.
export const POWER_CAP = 20;
export const ACTIVE_SLOTS = 3;
export const FUTURE_MERGE_SLOT = Object.freeze({ index: 3, requiredPieces: 2, cooldownMultiplier: .5 });
// Villain Merge adapter remains reserved; production has no merge entitlement.
export function resolveAbilitySlots(data,merge=null) {
  const slots=Array.from({length:ACTIVE_SLOTS},(_,index)=>{const id=data.equipped[index];return {id:POWERS[id]?.passive?null:id,level:POWERS[id]?.passive?0:data.levels[id]||0,cooldownMultiplier:1};});
  if(merge?.completePieces===FUTURE_MERGE_SLOT.requiredPieces&&((POWER_IDS.includes(merge.ability)&&!POWERS[merge.ability].passive)||Object.hasOwn(MERGE_POWERS,merge.ability?.replace('merge:',''))))
    slots.push({id:merge.ability,level:integer(merge.level,1,20),cooldownMultiplier:FUTURE_MERGE_SLOT.cooldownMultiplier});
  return slots;
}
export const POWER_IDS = ['strength','superKick','fireball','flight','steel','roots','speed','whirlwind','animalAllies','seismicSmash'];
export const POWERS = Object.freeze({
  strength: { name: 'Super Strength', icon: 'ϟ', cooldown: 8, offensive: true, summary: 'A heavy forward punch with an 86-unit force burst, beyond a normal punch. Only enemies in front can be struck.' },
  superKick: { name: 'Super Kick', icon: '⌁', cooldown: 6, after: true, offensive: true, summary: 'Two to six forward kicks with 105-unit motion trails, slightly beyond Super Strength. Each kick has its own impact.' },
  fireball: { name: 'Fireball', icon: '◉', cooldown: 5, offensive: true, summary: 'Straight shots. No homing, burning or ongoing damage.' },
  flight: { name: 'Flight', icon: '↟', passive: true, cooldown: 30, after: true, summary: 'Double-jump to fly without using a power slot. Steer with the directional controls. Double-tap Jump again to cancel. Fireball and Animal Allies can attack.' },
  steel: { name: 'Steel Body', icon: '⬡', cooldown: 15, after: true, summary: 'Reduce all incoming damage. Ignore knockback without slowing down.' },
  roots: { name: 'Ground Roots', icon: '♧', cooldown: 10, after: true, offensive: true, summary: 'Trap grounded foes. Squeeze once per second. Bosses are slowed.' },
  speed: { name: 'Speed', icon: '»', passive: true, summary: 'Permanent running and attack speed. No damage bonus or active slot.' },
  animalAllies: { name:'Animal Allies',icon:'🐾',cooldown:6,offensive:true,summary:'Evolving allies strike the closest enemies within 260 units, then vanish. Wolf hits 1 → Hawk 2 → Bear 3 → Panther 5 → Spirit Stag 5. Each target takes the full listed damage. Works on ground or in air. Six-second cooldown.' },
  seismicSmash: { name:'Seismic Smash',icon:'✊',cooldown:6,offensive:true,summary:'Slam both fists into the ground. Hit the nearest 1–5 enemies once, within a 1.5–4.5 m shockwave. Damage increases every level. Ground only; six-second cooldown.' },
  whirlwind: { name: 'Whirlwind', icon: '≋', cooldown: 12, after: true, offensive: true, summary: 'Lift regular foes. Damage once per second. Bosses stay grounded.' },
});
export const BALANCE = Object.freeze({ fireballSpeed: 520, fireballLife: 1.6, burstInterval: .12, controlRange: 260, combatGrace: 5, tree: { x: 290, y: 600 }, flightSpeed: 250 });
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
const integer = (x,a,b) => clamp(Math.floor(Number(x)||0),a,b);
export const tier = level => level >= 20 ? 5 : 1 + Math.floor(level / 5);
const scale = (level,a,b) => a + (b-a)*(level-1)/19;
const speedScale = (level,low,cap,bonus=0) => level ? scale(Math.min(POWER_CAP,level+bonus),low,cap) : 0;
function interpolate(level,anchors) {
  for(let i=1;i<anchors.length;i++) if(level<=anchors[i][0]) {
    const [a,x]=anchors[i-1],[b,y]=anchors[i];return x+(y-x)*(level-a)/(b-a);
  }
  return anchors.at(-1)[1];
}
// Bounded equipped-item stat adapter. The Villain Merge slot remains disabled.
export function equipmentStats(raw={}) {
  return { strength: clamp(Number(raw.strength)||0,0,1000), damage: clamp(Number(raw.damage)||0,0,1000), attackSpeed: clamp(Number(raw.attackSpeed)||0,0,.5), defense:clamp(Number(raw.defense)||0,0,.25),moveSpeed:clamp(Number(raw.moveSpeed)||0,0,.6),fireball:clamp(Number(raw.fireball)||0,0,80),roots:clamp(Number(raw.roots)||0,0,15),whirlwind:clamp(Number(raw.whirlwind)||0,0,20) };
}
export function powerStats(id,level,{heroLevel=1,equipment={}}={}) {
  const armorLevels=level>0 ? integer(({fireball:equipment.fireballLevels,steel:equipment.steelLevels,roots:equipment.rootsLevels,strength:equipment.strengthLevels,whirlwind:equipment.whirlwindLevels,superKick:equipment.superKickLevels,speed:equipment.speedLevels,flight:equipment.flightLevels})[id]||0,0,9) : 0;
  level=integer(level,1,20)+armorLevels;const n=tier(level),eq=equipmentStats(equipment),strength=10+2*(heroLevel-1)+eq.strength;
  const base={level,cooldown:POWERS[id]?.cooldown||0};
  // Match one complete Whirlwind cast at the same learned rank and hero level.
  // Keep the burst powers' existing generic equipment bonus, applied once per
  // target; Whirlwind-specific equipment remains exclusive to Whirlwind.
  const burstDamage=()=>{
    const reference=powerStats('whirlwind',level,{heroLevel});
    return reference.damage*reference.duration+eq.damage;
  };
  switch(id) {
    case 'strength': return {...base,targets:n,damage:offensiveDamage(id,45+8*(level-1)+2*(strength-eq.strength),level,heroLevel)+2*eq.strength+eq.damage,bossEffectiveness:scale(Math.min(level,POWER_CAP),.25,1),reach:86};
    case 'superKick': return {...base,kicks:n+1,damage:offensiveDamage(id,16+2*(level-1)+.5*(strength-eq.strength),level,heroLevel)+.5*eq.strength+eq.damage,reach:105};
    case 'animalAllies': {
      const animal=level>=20?'spirit-stag':level>=15?'panther':level>=10?'bear':level>=5?'hawk':'wolf';
      return {...base,animal,targets:level>=15?5:level>=10?3:level>=5?2:1,range:260,damage:burstDamage()};
    }
    case 'seismicSmash': {
      const radius=level>=20?180:level>=15?144:level>=10?112:level>=5?80:60;
      const targets=level>=20?5:level>=15?4:level>=10?3:level>=5?2:1;
      return {...base,radius,targets,damage:burstDamage()};
    }
    case 'fireball': return {...base,projectiles:level>=20?3:level>=10?2:1,damage:offensiveDamage(id,24+5*(level-1),level,heroLevel)+eq.fireball,pierce:level>=20?2:1};
    case 'flight': return {...base,duration:level+2,bossHitChance:.5};
    case 'steel': return {...base,reduction:interpolate(level,[[1,.2],[5,.3],[10,.45],[15,.6],[20,.75],[29,.84]]),duration:interpolate(level,[[1,3],[5,4],[10,5],[15,6],[20,8],[29,10.25]])};
    case 'roots': return {...base,targets:n,duration:n+1,damage:offensiveDamage(id,6+2*(level-1),level,heroLevel)+eq.roots};
    case 'speed': return {...base,runBonus:speedScale(level,.05,.6),attackBonus:speedScale(level,.03,.5)};
    case 'whirlwind': return {...base,targets:n,duration:n+1,damage:offensiveDamage(id,10+3*(level-1),level,heroLevel)+eq.whirlwind};
    default: throw new Error('Unknown power');
  }
}
export function normalizePowers(raw,heroLevel,{strict=false,allowOverBudget=false}={}) {
  if(strict&&(!raw||!raw.levels))return null;
  // Apply the existing Agility retirement policy while preserving the new ledger.
  const migrated=retireMovementPower(raw,heroLevel,{allowOverBudget});if(!migrated)return null;
  const added=['animalAllies','seismicSmash'];
  raw={...migrated,levels:{...migrated.levels,...Object.fromEntries(added.map(id=>[id,raw?.levels?.[id]??0]))},
    recovery:{...migrated.recovery,...Object.fromEntries(added.map(id=>[id,raw?.recovery?.[id]??0]))},
    equipped:Array.from({length:3},(_,i)=>added.includes(raw?.equipped?.[i])?raw.equipped[i]:migrated.equipped[i])};
  const levels=Object.fromEntries(POWER_IDS.map(id=>[id,integer(raw?.levels?.[id],0,20)]));
  const spent=Object.values(levels).reduce((a,b)=>a+b,0),earned=Math.max(0,heroLevel-1);
  // Never silently refund or redistribute an invalid ledger.
  if((!allowOverBudget&&spent>earned) || (strict && (!raw || !raw.levels || POWER_IDS.some(id=>!Number.isInteger(raw.levels[id]??(['animalAllies','seismicSmash'].includes(id)?0:undefined))||(raw.levels[id]??0)<0||(raw.levels[id]??0)>20)))) return null;
  const used=new Set(),equipped=Array.from({length:ACTIVE_SLOTS},(_,i)=>{
    const id=raw?.equipped?.[i];if(!POWER_IDS.includes(id)||POWERS[id].passive||!levels[id]||used.has(id))return null;used.add(id);return id;
  });
  return {movementPolicy:migrated.movementPolicy,resetRevision:migrated.resetRevision,levels,equipped,points:Math.max(0,earned-spent),recovery:Object.fromEntries(POWER_IDS.map(id=>[id,clamp(Number(raw?.recovery?.[id])||0,0,120)]))};
}
export function attackRate(level,equipment={}) {return 1+Math.min(.5,(level?powerStats('speed',level,{equipment}).attackBonus:0)+equipmentStats(equipment).attackSpeed);}
export const isBoss = e => e?.boss === true || e?.legendary === true;
const box = e => ({x:e.x-e.w/2,y:e.y-e.h,w:e.w,h:e.h});
const EPS=1e-8;
// Swept point vs expanded rectangle. Earliest contact keeps fast projectiles from tunneling.
export function segmentHit(x,y,nx,ny,rect,r=0) {
  let lo=0,hi=1;const dx=nx-x,dy=ny-y;
  if(Math.abs(dx)<EPS){if(x<rect.x-r||x>rect.x+rect.w+r)return null;}
  else{const a=(rect.x-r-x)/dx,b=(rect.x+rect.w+r-x)/dx;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));if(lo>hi)return null;}
  if(Math.abs(dy)<EPS){if(y<rect.y-r||y>rect.y+rect.h+r)return null;}
  else{const a=(rect.y-r-y)/dy,b=(rect.y+rect.h+r-y)/dy;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));if(lo>hi)return null;}
  return lo;
}
export class PowerSystem {
  constructor(game,data) {
    Object.defineProperty(this,'game',{value:game});this.data=data;this.cooldowns={...data.recovery};this.active={};this.projectiles=[];this.projectilePool=new ProjectilePool(12);this.bursts=[];this.effects=[];this.effectSerial=0;
    // The slot resolver is extensible; Phase 3 exposes only three standard slots.
    this.mergeEntitlement=null;
  }
  stats(id) {return powerStats(id,this.data.levels[id],{heroLevel:this.game.hero.level,equipment:this.game.equipment});}
  get flying(){return !!this.active.flight;}
  startFlight(){
    const g=this.game,h=g.hero;
    if(g.paused||h.dead||g.disruptedPower==='flight'||!this.data.levels.flight||this.flying||
      (this.cooldowns.flight||0)>EPS||h.stun>0||h.grounded||h.jumps!==2||h.attack||this.active.superKick||h.powerPose)return false;
    this.active.flight={...this.stats('flight'),age:0,targets:[],cancelTapAge:-Infinity};
    for(const effect of g.mergeEffects.filter(e=>e.offensive))g.endMergeEffect(effect);
    g.mergeShots=[];for(const other of ['roots','whirlwind'])this.end(other);
    h.attackBuffer=null;h.jumpBuffer=0;h.vy=-170;h.jumpAge=100;h.coyote=0;
    this.sync();g.emit('power',{id:'flight'});return true;
  }
  jumpInFlight(){
    const state=this.active.flight;
    if(!state||this.game.paused||this.game.hero.dead)return false;
    // Only two new Jump presses count; the activation jump is never a cancel tap.
    if(state.age-state.cancelTapAge<=.4+EPS){this.end('flight');return true;}
    state.cancelTapAge=state.age;return false;
  }
  get speed(){return Math.min(.6,speedScale(this.data.levels.speed,.05,.6,this.game.equipment.speedLevels)+this.game.equipment.moveSpeed);}
  get attackRate(){return 1+Math.min(.5,speedScale(this.data.levels.speed,.03,.5,this.game.equipment.speedLevels)+this.game.equipment.attackSpeed);}
  ready(id){return this.game.disruptedPower!==id&&POWER_IDS.includes(id)&&!!this.data.levels[id]&&!POWERS[id]?.passive&&!this.active[id]&&(this.cooldowns[id]||0)<=EPS;}
  activateSlot(index){if(index===3&&this.game.legendary?.active)return this.game.activateMerge();const slot=resolveAbilitySlots(this.data,this.mergeEntitlement)[index];return slot?.id?this.activate(slot.id,slot):false;}
  activate(id,slot=null) {
    const g=this.game,h=g.hero,def=POWERS[id];
    const resolved=resolveAbilitySlots(this.data,this.mergeEntitlement).find(s=>s.id===id);
    if(g.paused||h.dead||g.disruptedPower===id||!POWER_IDS.includes(id)||def.passive||!resolved)return false;
    slot=slot||resolved;
    if(!slot.level||this.active[id]||(this.cooldowns[id]||0)>EPS||h.stun>0||(this.flying&&def.offensive&&!['fireball','animalAllies'].includes(id)))return false;
    if(id==='seismicSmash'&&(!h.grounded||this.flying))return false;
    // A held basic attack must yield once its contact window has finished.
    // Otherwise chaining basics keeps h.attack populated forever and starves
    // ready melee powers. Never cancel a basic before its hit or a power combo.
    if(['strength','superKick','seismicSmash'].includes(id)&&h.attack&&!h.attack.power){
      const basic=g.attackDefinition(h.attack.kind);
      if(h.attack.age>=basic.startup+basic.active){h.attack=null;h.attackBuffer=null;}
    }
    if(['strength','superKick','seismicSmash'].includes(id)&&(h.attack||this.active.superKick||h.powerPose))return false;
    const s=powerStats(id,slot.level,{heroLevel:h.level,equipment:g.equipment});s.cooldown*=slot.cooldownMultiplier;
    // The 0000000000 V2 prototype tests two-second control effects. Keep
    // the production hero balance, power levels and cloud saves unchanged.
    if(g.testPowers&&(id==='roots'||id==='whirlwind'))s.duration=2;
    const state={...s,age:0,targets:[],x:h.x+h.face*100,y:h.y,face:h.face};
    if(def.after)this.active[id]=state;else this.cooldowns[id]=s.cooldown;
    if(def.offensive)g.markCombat();
    if(id==='strength'){g.startAttack('punch');Object.assign(h.attack,{power:id,stats:s});}
    if(id==='superKick'){state.left=s.kicks;state.target=null;this.nextKick(state);}
    if(id==='animalAllies'){
      const targets=this.nearest(s.range,s.targets);
      // Damage is deferred to visible contact; both Panther strikes are separate.
      const duration=s.animal==='panther'?.64:.52;
      const serial=++this.effectSerial;
      for(const target of targets.length?targets:[null])this.effects.push({id,serial,animal:s.animal,level:s.level,damage:s.damage,target:target?.id,
        x:h.x,y:h.y,targetX:target?.x??h.x+h.face*65,targetY:target?.y??h.y,
        face:Math.sign((target?.x??h.x+h.face)-h.x)||h.face,age:0,duration,hitCount:0,contact:.32,range:s.range});
      h.castAge=0;
    }
    if(id==='seismicSmash'){
      h.powerPose={id,age:0,duration:.58,face:h.face};h.vx=0;h.attackBuffer=null;
      this.effects.push({id,serial:++this.effectSerial,x:h.x,y:h.y,radius:s.radius,level:s.level,
        damage:s.damage,targets:s.targets,face:h.face,age:0,duration:.70,contact:.20,hitCount:0});
    }
    if(id==='fireball'){this.bursts.push({...state,left:s.projectiles,next:0});h.castAge=0;}
    if(id==='roots'||id==='whirlwind'){
      state.targets=g.enemies.filter(e=>e.state!=='dead'&&e.protection<=0&&Math.abs(e.x-h.x)<=BALANCE.controlRange&&Math.abs(e.y-h.y)<120&&
        (id!=='roots'||groundedForRoots(e))&&(id!=='whirlwind'||!e.rooted||isBoss(e)))
        .sort((a,b)=>Math.abs(a.x-h.x)-Math.abs(b.x-h.x)||a.id-b.id).slice(0,s.targets).map(e=>e.id);
      if(id==='whirlwind'&&state.targets.length)state.x=g.enemies.filter(e=>state.targets.includes(e.id)).reduce((sum,e)=>sum+e.x,0)/state.targets.length;
      for(const e of g.enemies.filter(e=>state.targets.includes(e.id))) {
        if(id==='roots')e.rooted=true;else if(!isBoss(e)){e.spawnSurface ||= e.surface;e.lifted=true;e.airborne=true;e.vy=0;e.liftOrigin={x:e.x,y:e.y};}
      }
    }
    this.sync();g.emit('power',{id});return true;
  }
  nearest(range,count,origin=this.game.hero){
    return this.game.enemies.filter(e=>e.state!=='dead'&&(e.hp===undefined||e.hp>0)&&!(e.protection>0)&&
      Number.isFinite(e.x)&&Number.isFinite(e.y)&&Math.hypot(e.x-origin.x,e.y-origin.y)<=range)
      .sort((a,b)=>Math.hypot(a.x-origin.x,a.y-origin.y)-Math.hypot(b.x-origin.x,b.y-origin.y)||String(a.id).localeCompare(String(b.id)))
      .slice(0,count);
  }
  stepEffects(dt){
    const g=this.game,h=g.hero;
    if(h.powerPose){h.powerPose.age+=dt;if(h.powerPose.age>=h.powerPose.duration||h.dead||h.stun>0)h.powerPose=null;}
    for(const f of this.effects){
      f.age+=dt;
      if(f.id==='impact')continue;
      if(h.dead||h.stun>0){f.cancelled=true;f.duration=Math.min(f.duration,f.age+.10);}
      if(f.cancelled)continue;
      if(f.id==='seismicSmash'&&f.age>=f.contact&&!f.hitCount){
        f.hitCount=1;
        if(!h.grounded||Math.hypot(h.x-f.x,h.y-f.y)>8){f.cancelled=true;continue;}
        for(const e of this.nearest(f.radius,f.targets,f)){
          const face=Math.sign(e.x-f.x)||f.face;
          if(g.damageEnemy(e,f.damage,{kind:f.id,stagger:true,knock:12+f.level,face}))this.impact(e,f,face);
        }
      }
      if(f.id==='animalAllies'){
        const count=f.animal==='panther'?2:1;
        while(f.hitCount<count&&f.age+1e-8>=f.contact+f.hitCount*.11){
          f.hitCount++;
          const e=g.enemies.find(e=>e.id===f.target);
          // No re-targeting after the animal has materialized; do not strike a
          // dead/protected target or one that has moved out of the summon range.
          if(!e||e.state==='dead'||e.hp<=0||e.protection>0||Math.hypot(e.x-f.x,e.y-f.y)>f.range)continue;
          f.targetX=e.x;f.targetY=e.y;
          if(g.damageEnemy(e,f.damage/count,{kind:f.id,stagger:f.animal==='bear'||f.animal==='spirit-stag',
            knock:f.animal==='spirit-stag'?35:0,face:f.face}))this.impact(e,f,f.face);
        }
      }
    }
    this.effects=this.effects.filter(f=>f.age<f.duration).slice(-32);
  }
  impact(e,source,face){
    this.effects.push({id:'impact',power:source.id||source.power,x:e.x,y:e.y-Math.min(42,(e.h||60)/2),
      ground:e.y,level:source.level||source.stats?.level||1,face,age:0,duration:.22});
  }
  nextKick(state) {
    this.game.startAttack('kick');Object.assign(this.game.hero.attack,{power:'superKick',stats:state,comboIndex:state.kicks-state.left});state.left--;
  }
  end(id) {
    const state=this.active[id];if(!state)return;
    this.cooldowns[id]=state.cooldown;delete this.active[id];
    if(id==='flight'){const h=this.game.hero;h.vy=Math.max(0,h.vy);h.jumpBuffer=0;if(!h.grounded)h.jumps=2;}
    if(id==='roots'||id==='whirlwind')for(const e of this.game.enemies)if(state.targets.includes(e.id)){
      if(id==='roots')e.rooted=!!e.mergeRooted;else if(e.lifted){e.lifted=!!e.mergeLifted;e.airborne=true;e.vy=0;}
    }
    this.sync();
  }
  sync(){const h=this.game.hero;h.flying=this.flying;h.steel=!!this.active.steel;h.agile=false;}
  cancelEffects(){for(const id of Object.keys(this.active))this.end(id);this.bursts.length=0;this.effects.length=0;this.game.hero.powerPose=null;clearProjectiles(this.projectiles,this.projectilePool);}
  incoming(amount,source={}) {
    const g=this.game;
    if(this.flying&&(!isBoss(source)||g.random()>=.5))return null;
    return g.mergeDefense(amount*(1-(this.active.steel?.reduction||0))*(1-equipmentStats(g.equipment).defense));
  }
  melee(attack,candidates) {
    const g=this.game,stats=attack.stats;
    if(attack.power)candidates=candidates.filter(e=>(e.x-g.hero.x)*attack.face>=0);
    if(attack.power==='superKick'){
      if(attack.targets.size)return;
      const combo=this.active.superKick;if(!combo)return;
      let target=candidates.find(e=>e.id===combo.target);
      if(!target && combo.target!==null && g.enemies.some(e=>e.id===combo.target && e.state!=='dead'))return;
      if(!target){target=candidates[0];combo.target=target?.id??null;}
      candidates=target?[target]:[];
    }
    const cap=attack.power==='strength'?stats.targets:Infinity;
    for(const e of candidates){
      if(attack.targets.size>=cap)break;
      attack.targets.add(e.id);
      const damage=stats?stats.damage*(attack.power==='strength'&&isBoss(e)?stats.bossEffectiveness:1):g.attackDefinition(attack.kind).damage;
      const hit=g.damageEnemy(e,damage,{kind:attack.power||attack.kind,knock:attack.power==='superKick'?0:18,face:attack.face});
      if(hit&&attack.power)this.impact(e,attack,attack.face);
    }
  }
  step(dt) {
    this.stepEffects(dt);
    const g=this.game,h=g.hero;
    for(const id of POWER_IDS)this.cooldowns[id]=Math.max(0,(this.cooldowns[id]||0)-dt);
    for(const [id,a] of Object.entries(this.active)){
      if(id==='superKick'){
        if(!h.attack&&h.stun<=0){if(a.left>0)this.nextKick(a);else this.end(id);}continue;
      }
      if(id==='roots')releaseInvalidRoots(g,a);
      const before=a.age;a.age=Math.min(a.duration,a.age+dt);
      if(id==='roots'||id==='whirlwind'){
        for(const e of g.enemies){if(!a.targets.includes(e.id)||e.state==='dead')continue;
          if(id==='whirlwind'&&!isBoss(e)){
            const phase=a.age*8+e.id*2.4,lift=Math.min(1,a.age/.35);e.prevX=e.x;e.prevY=e.y;
            g.moveEnemyAir(e,e.liftOrigin.x+(a.x-e.liftOrigin.x)*lift+Math.sin(phase)*28*lift,e.liftOrigin.y-90*lift+Math.cos(phase)*18*lift);
          }
          const ticks=Math.floor(a.age+EPS)-Math.floor(before+EPS);
          if(ticks>0)g.damageEnemy(e,a.damage*ticks,{kind:id,stagger:false});
        }
      }
      if(a.age+EPS>=a.duration)this.end(id);
    }
    for(const burst of this.bursts){
      burst.next-=dt;
      while(burst.left>0&&burst.next<=EPS){
        const p=this.projectilePool.acquire({x:h.x+burst.face*22,y:h.y-30,vx:burst.face*BALANCE.fireballSpeed,life:BALANCE.fireballLife,damage:burst.damage,pierce:burst.pierce});if(p)this.projectiles.push(p);
        burst.left--;burst.next+=BALANCE.burstInterval;
      }
    }
    compactProjectiles(this.bursts,null,b=>b.left>0);
    for(const p of this.projectiles){
      const nx=p.x+p.vx*dt,contacts=[];
      for(const wall of g.surfaces){if(wall.oneWay)continue;const t=segmentHit(p.x,p.y,nx,p.y,wall,6);if(t!==null)contacts.push({t,wall:true});}
      for(const e of g.enemies){if(e.state==='dead'||e.protection>0||p.hits.has(e.id))continue;const t=segmentHit(p.x,p.y,nx,p.y,box(e),6);if(t!==null)contacts.push({t,e});}
      contacts.sort((a,b)=>a.t-b.t||Number(b.wall)-Number(a.wall));
      for(const contact of contacts){
        if(contact.wall){p.life=0;break;}
        g.damageEnemy(contact.e,p.damage*(p.hits.size? .5:1),{kind:'fireball',stagger:false});p.hits.add(contact.e.id);
        if(p.hits.size>=p.pierce){p.life=0;break;}
      }
      p.x=nx;p.life-=dt;
    }
    compactProjectiles(this.projectiles,this.projectilePool);
    this.sync();
  }
  snapshot(){
    const recovery={...this.cooldowns};
    // Reloading discards transient effects, but cannot bypass their remaining recovery.
    for(const [id,a] of Object.entries(this.active))recovery[id]=a.cooldown+(id==='superKick'?(a.left+1)*.39/this.attackRate:Math.max(0,a.duration-a.age));
    return {movementPolicy:{...this.data.movementPolicy},resetRevision:this.data.resetRevision||0,levels:{...this.data.levels},equipped:[...this.data.equipped],recovery};
  }
}
