// Phase 3 rules. Values not specified by the design are collected here for balancing.
export const POWER_CAP = 20;
export const ACTIVE_SLOTS = 3;
export const FUTURE_MERGE_SLOT = Object.freeze({ index: 3, requiredPieces: 3, cooldownMultiplier: .5 });
// Villain Merge adapter remains reserved; production has no merge entitlement.
export function resolveAbilitySlots(data,merge=null) {
  const slots=Array.from({length:ACTIVE_SLOTS},(_,index)=>({id:data.equipped[index],level:data.levels[data.equipped[index]]||0,cooldownMultiplier:1}));
  if(merge?.completePieces===FUTURE_MERGE_SLOT.requiredPieces&&POWER_IDS.includes(merge.ability)&&!POWERS[merge.ability].passive)
    slots.push({id:merge.ability,level:integer(merge.level,1,20),cooldownMultiplier:FUTURE_MERGE_SLOT.cooldownMultiplier});
  return slots;
}
export const POWER_IDS = ['strength','superKick','fireball','flight','steel','roots','agility','speed','whirlwind'];
export const POWERS = Object.freeze({
  strength: { name: 'Super Strength', icon: 'ϟ', cooldown: 8, offensive: true, summary: 'One mighty forward punch. Yellow electricity is visual only.' },
  superKick: { name: 'Super Kick', icon: '⌁', cooldown: 6, after: true, offensive: true, summary: 'A focused martial arts combination. Retargets only within reach.' },
  fireball: { name: 'Fireball', icon: '◉', cooldown: 5, offensive: true, summary: 'Straight shots. No homing, burning or ongoing damage.' },
  flight: { name: 'Flight', icon: '↟', cooldown: 30, after: true, summary: 'Launch from the ground. Press again to land. Only Fireball can attack.' },
  steel: { name: 'Steel Body', icon: '⬡', cooldown: 15, after: true, summary: 'Reduce all incoming damage. Ignore knockback without slowing down.' },
  roots: { name: 'Ground Roots', icon: '♧', cooldown: 10, after: true, offensive: true, summary: 'Trap grounded foes. Squeeze once per second. Bosses are slowed.' },
  agility: { name: 'Agility', icon: '◇', cooldown: 10, after: true, summary: 'Automatically roll a dodge against each valid incoming attack.' },
  speed: { name: 'Speed', icon: '»', passive: true, summary: 'Permanent running and attack speed. No damage bonus or active slot.' },
  whirlwind: { name: 'Whirlwind', icon: '≋', cooldown: 12, after: true, offensive: true, summary: 'Lift regular foes. Damage once per second. Bosses stay grounded.' },
});
export const BALANCE = Object.freeze({ fireballSpeed: 520, fireballLife: 1.6, burstInterval: .12, controlRange: 260, combatGrace: 5, tree: { x: 290, y: 600 }, flightSpeed: 250 });
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
const integer = (x,a,b) => clamp(Math.floor(Number(x)||0),a,b);
export const tier = level => level >= 20 ? 5 : 1 + Math.floor(level / 5);
const scale = (level,a,b) => a + (b-a)*(level-1)/19;
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
  level=integer(level,1,20);const n=tier(level),eq=equipmentStats(equipment),strength=10+2*(heroLevel-1)+eq.strength;
  const base={level,cooldown:POWERS[id]?.cooldown||0};
  switch(id) {
    case 'strength': return {...base,targets:n,damage:45+8*(level-1)+2*strength+eq.damage,bossEffectiveness:scale(level,.25,1),reach:59};
    case 'superKick': return {...base,kicks:n+1,damage:16+2*(level-1)+.5*strength+eq.damage,reach:76};
    case 'fireball': return {...base,projectiles:level===20?3:level>=10?2:1,damage:24+5*(level-1)+eq.fireball,pierce:level===20?2:1};
    case 'flight': return {...base,duration:level+2,bossHitChance:.5};
    case 'steel': return {...base,reduction:interpolate(level,[[1,.2],[5,.3],[10,.45],[15,.6],[20,.75]]),duration:interpolate(level,[[1,3],[5,4],[10,5],[15,6],[20,8]])};
    case 'roots': return {...base,targets:n,duration:n+1,damage:6+2*(level-1)+eq.roots};
    case 'agility': return {...base,duration:scale(level,5,15),dodge:.75,legendaryDodge:.5};
    case 'speed': return {...base,runBonus:scale(level,.05,.6),attackBonus:scale(level,.03,.5)};
    case 'whirlwind': return {...base,targets:n,duration:n+1,damage:10+3*(level-1)+eq.whirlwind};
    default: throw new Error('Unknown power');
  }
}
export function normalizePowers(raw,heroLevel,{strict=false}={}) {
  const levels=Object.fromEntries(POWER_IDS.map(id=>[id,integer(raw?.levels?.[id],0,20)]));
  const spent=Object.values(levels).reduce((a,b)=>a+b,0),earned=Math.max(0,heroLevel-1);
  // Never silently refund or redistribute an invalid ledger.
  if(spent>earned || (strict && (!raw || !raw.levels || POWER_IDS.some(id=>!Number.isInteger(raw.levels[id])||raw.levels[id]<0||raw.levels[id]>20)))) return null;
  const used=new Set(),equipped=Array.from({length:ACTIVE_SLOTS},(_,i)=>{
    const id=raw?.equipped?.[i];if(!POWER_IDS.includes(id)||POWERS[id].passive||!levels[id]||used.has(id))return null;used.add(id);return id;
  });
  return {levels,equipped,points:earned-spent,recovery:Object.fromEntries(POWER_IDS.map(id=>[id,clamp(Number(raw?.recovery?.[id])||0,0,120)]))};
}
export function attackRate(level,equipment={}) {return 1+Math.min(.5,(level?powerStats('speed',level).attackBonus:0)+equipmentStats(equipment).attackSpeed);}
export const isBoss = e => e?.boss === true || e?.legendary === true;
const box = e => ({x:e.x-e.w/2,y:e.y-e.h,w:e.w,h:e.h});
const EPS=1e-8;
// Swept point vs expanded rectangle. Earliest contact keeps fast projectiles from tunneling.
export function segmentHit(x,y,nx,ny,rect,r=0) {
  let lo=0,hi=1;
  for(const [origin,delta,min,max] of [[x,nx-x,rect.x-r,rect.x+rect.w+r],[y,ny-y,rect.y-r,rect.y+rect.h+r]]) {
    if(Math.abs(delta)<EPS){if(origin<min||origin>max)return null;continue;}
    const a=(min-origin)/delta,b=(max-origin)/delta;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));if(lo>hi)return null;
  }
  return lo;
}
export class PowerSystem {
  constructor(game,data) {
    Object.defineProperty(this,'game',{value:game});this.data=data;this.cooldowns={...data.recovery};this.active={};this.projectiles=[];this.bursts=[];
    // The slot resolver is extensible; Phase 3 exposes only three standard slots.
    this.mergeEntitlement=null;
  }
  stats(id) {return powerStats(id,this.data.levels[id],{heroLevel:this.game.hero.level,equipment:this.game.equipment});}
  get flying(){return !!this.active.flight;}
  get speed(){return Math.min(.6,(this.data.levels.speed?this.stats('speed').runBonus:0)+equipmentStats(this.game.equipment).moveSpeed);}
  get attackRate(){return attackRate(this.data.levels.speed,this.game.equipment);}
  ready(id){return POWER_IDS.includes(id)&&!!this.data.levels[id]&&!POWERS[id]?.passive&&!this.active[id]&&(this.cooldowns[id]||0)<=EPS;}
  activateSlot(index){const slot=resolveAbilitySlots(this.data,this.mergeEntitlement)[index];return slot?.id?this.activate(slot.id,slot):false;}
  activate(id,slot=null) {
    const g=this.game,h=g.hero,def=POWERS[id];
    const resolved=resolveAbilitySlots(this.data,this.mergeEntitlement).find(s=>s.id===id);
    if(g.paused||h.dead||!POWER_IDS.includes(id)||def.passive||!resolved)return false;
    slot=slot||resolved;
    if(id==='flight'&&this.flying){this.end('flight');return true;}
    if(!slot.level||this.active[id]||(this.cooldowns[id]||0)>EPS||h.stun>0||(this.flying&&def.offensive&&id!=='fireball'))return false;
    if(id==='flight'&&(!h.grounded||h.attack||this.active.superKick))return false;
    if(['strength','superKick'].includes(id)&&(h.attack||this.active.superKick))return false;
    const s=powerStats(id,slot.level,{heroLevel:h.level,equipment:g.equipment});s.cooldown*=slot.cooldownMultiplier;
    const state={...s,age:0,targets:[],x:h.x+h.face*100,y:h.y,face:h.face};
    if(def.after)this.active[id]=state;else this.cooldowns[id]=s.cooldown;
    if(def.offensive)g.markCombat();
    if(id==='strength'){g.startAttack('punch');Object.assign(h.attack,{power:id,stats:s});}
    if(id==='superKick'){state.left=s.kicks;state.target=null;this.nextKick(state);}
    if(id==='fireball'){this.bursts.push({...state,left:s.projectiles,next:0});h.castAge=0;}
    if(id==='flight'){for(const other of ['roots','whirlwind'])this.end(other);h.attack=null;h.attackBuffer=null;h.jumpBuffer=0;h.grounded=false;h.vy=-170;h.jumpAge=100;h.jumps=1;}
    if(id==='roots'||id==='whirlwind'){
      state.targets=g.enemies.filter(e=>e.state!=='dead'&&e.protection<=0&&Math.abs(e.x-h.x)<=BALANCE.controlRange&&Math.abs(e.y-h.y)<120&&
        (id!=='roots'||(!e.flying&&!e.airborne&&Math.abs(e.y-e.surface.y)<1))&&(id!=='whirlwind'||!e.rooted||isBoss(e)))
        .sort((a,b)=>Math.abs(a.x-h.x)-Math.abs(b.x-h.x)||a.id-b.id).slice(0,s.targets).map(e=>e.id);
      if(id==='whirlwind'&&state.targets.length)state.x=g.enemies.filter(e=>state.targets.includes(e.id)).reduce((sum,e)=>sum+e.x,0)/state.targets.length;
      for(const e of g.enemies.filter(e=>state.targets.includes(e.id))) {
        if(id==='roots')e.rooted=true;else if(!isBoss(e)){e.spawnSurface ||= e.surface;e.lifted=true;e.airborne=true;e.vy=0;e.liftOrigin={x:e.x,y:e.y};}
      }
    }
    this.sync();g.emit('power',{id});return true;
  }
  nextKick(state) {
    this.game.startAttack('kick');Object.assign(this.game.hero.attack,{power:'superKick',stats:state,comboIndex:state.kicks-state.left});state.left--;
  }
  end(id) {
    const state=this.active[id];if(!state)return;
    this.cooldowns[id]=state.cooldown;delete this.active[id];
    if(id==='flight')this.game.hero.vy=Math.max(0,this.game.hero.vy);
    if(id==='roots'||id==='whirlwind')for(const e of this.game.enemies)if(state.targets.includes(e.id)){
      if(id==='roots')e.rooted=false;else if(e.lifted){e.lifted=false;e.airborne=true;e.vy=0;}
    }
    this.sync();
  }
  sync(){const h=this.game.hero;h.flying=this.flying;h.steel=!!this.active.steel;h.agile=!!this.active.agility;}
  cancelEffects(){for(const id of Object.keys(this.active))this.end(id);this.bursts=[];this.projectiles=[];}
  incoming(amount,source={}) {
    const g=this.game;
    if(this.flying&&(!isBoss(source)||g.random()>=.5))return null;
    if(this.active.agility&&g.random()<(source.legendary? .5:.75)){g.emit('dodge');return null;}
    return amount*(1-(this.active.steel?.reduction||0))*(1-equipmentStats(g.equipment).defense);
  }
  melee(attack,candidates) {
    const g=this.game,stats=attack.stats;
    if(attack.power==='superKick'){
      if(attack.targets.size)return;
      const combo=this.active.superKick;if(!combo)return;
      let target=candidates.find(e=>e.id===combo.target);
      if(!target){target=candidates[0];combo.target=target?.id??null;}
      candidates=target?[target]:[];
    }
    const cap=attack.power==='strength'?stats.targets:Infinity;
    for(const e of candidates){
      if(attack.targets.size>=cap)break;
      attack.targets.add(e.id);
      const damage=stats?stats.damage*(attack.power==='strength'&&isBoss(e)?stats.bossEffectiveness:1):g.attackDefinition(attack.kind).damage;
      g.damageEnemy(e,damage,{kind:attack.kind,knock:attack.power==='superKick'?0:18,face:attack.face});
    }
  }
  step(dt) {
    const g=this.game,h=g.hero;
    for(const id of POWER_IDS)this.cooldowns[id]=Math.max(0,(this.cooldowns[id]||0)-dt);
    for(const [id,a] of Object.entries(this.active)){
      if(id==='superKick'){
        if(!h.attack&&h.stun<=0){if(a.left>0)this.nextKick(a);else this.end(id);}continue;
      }
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
        this.projectiles.push({x:h.x+burst.face*22,y:h.y-45,vx:burst.face*BALANCE.fireballSpeed,life:BALANCE.fireballLife,damage:burst.damage,pierce:burst.pierce,hits:new Set()});
        burst.left--;burst.next+=BALANCE.burstInterval;
      }
    }
    this.bursts=this.bursts.filter(b=>b.left>0);
    for(const p of this.projectiles){
      const nx=p.x+p.vx*dt,contacts=[];
      for(const wall of g.surfaces.filter(s=>!s.oneWay)){const t=segmentHit(p.x,p.y,nx,p.y,wall,6);if(t!==null)contacts.push({t,wall:true});}
      for(const e of g.enemies){if(e.state==='dead'||e.protection>0||p.hits.has(e.id))continue;const t=segmentHit(p.x,p.y,nx,p.y,box(e),6);if(t!==null)contacts.push({t,e});}
      contacts.sort((a,b)=>a.t-b.t||Number(b.wall)-Number(a.wall));
      for(const contact of contacts){
        if(contact.wall){p.life=0;break;}
        g.damageEnemy(contact.e,p.damage*(p.hits.size? .5:1),{kind:'fireball',stagger:false});p.hits.add(contact.e.id);
        if(p.hits.size>=p.pierce){p.life=0;break;}
      }
      p.x=nx;p.life-=dt;
    }
    this.projectiles=this.projectiles.filter(p=>p.life>0);
    this.sync();
  }
  snapshot(){
    const recovery={...this.cooldowns};
    // Reloading discards transient effects, but cannot bypass their remaining recovery.
    for(const [id,a] of Object.entries(this.active))recovery[id]=a.cooldown+(id==='superKick'?(a.left+1)*.39/this.attackRate:Math.max(0,a.duration-a.age));
    return {levels:{...this.data.levels},equipped:[...this.data.equipped],recovery};
  }
}
