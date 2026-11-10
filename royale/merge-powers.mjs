import { MERGE_POWERS } from './legendary-data.mjs';
import { segmentHit, isBoss } from './powers.mjs';
const box=e=>({x:e.x-e.w/2,y:e.y-e.h,w:e.w,h:e.h});
const near=(e,x,y,r)=>Math.abs(e.x-x)<=r&&Math.abs(e.y-y)<140;
export const mergeMethods={
 initializeMergeRuntime(){this.mergeEffects=[];this.mergeShots=[];this.mergeCooldowns={...this.legendary.recovery};},
 mergeAbility(){return this.legendary.active?{...MERGE_POWERS[this.legendary.active],id:this.legendary.active,cooldown:MERGE_POWERS[this.legendary.active].cooldown*.5}:null;},
 activateMerge(){
  const a=this.mergeAbility(),h=this.hero;if(!a||this.paused||h.dead||h.stun>0||(this.mergeCooldowns[a.id]||0)>1e-8||this.mergeEffects.some(e=>e.id===a.id)||this.powers.flying&&a.offensive||a.id==='styrodog'&&!h.grounded)return false;
  const state={...a,age:0,x:h.x,y:h.y,face:h.face,hits:new Set(),targets:[],remaining:a.absorb};
  if(a.offensive)this.markCombat();if(!a.after)this.mergeCooldowns[a.id]=a.cooldown;h.castAge=0;
  if(a.id==='lightning')state.x=Math.max(240,Math.min(this.arenaScene?1700:6100,h.x+h.face*220));
  if(a.id==='air')state.x=h.x+h.face*120;
  if(a.id==='venomis'){
   state.targets=this.enemies.filter(e=>e.state!=='dead'&&e.protection<=0&&!e.flying&&!e.airborne&&Math.abs(e.y-e.surface.y)<1&&near(e,h.x,h.y,280)).sort((a,b)=>Math.abs(a.x-h.x)-Math.abs(b.x-h.x)).slice(0,a.targets).map(e=>e.id);
   for(const e of this.enemies)if(state.targets.includes(e.id)){e.mergeRooted=true;e.rooted=true;}
  }
  if(a.id==='sonic')this.mergeShots.push({...state,x:h.x+h.face*25,y:h.y-48,vx:h.face*a.speed,life:1.7,pierce:8});
  else if(a.id==='wastelander')for(const face of [-1,1])this.mergeShots.push({...state,hits:new Set(),face,x:h.x+face*25,y:h.y-20,vx:face*a.speed,life:2.1,pierce:8,groundOnly:true});
  else this.mergeEffects.push(state);
  this.emit('merge-power',{id:a.id});return true;
 },
 endMergeEffect(a){
  if(a.after)this.mergeCooldowns[a.id]=a.cooldown;
  for(const e of this.enemies){if(a.id==='venomis'&&a.targets.includes(e.id)){e.mergeRooted=false;e.rooted=!!this.powers.active.roots?.targets.includes(e.id);}if(a.id==='air'&&e.mergeLifted){e.mergeLifted=false;e.lifted=!!this.powers.active.whirlwind?.targets.includes(e.id);e.airborne=true;e.vy=0;}}
  a.ended=true;
 },
 cancelMergeEffects(){if(!this.mergeEffects)return;for(const a of this.mergeEffects)this.endMergeEffect(a);this.mergeEffects=[];this.mergeShots=[];},
 mergeDefense(amount){const barrier=this.mergeEffects.find(e=>e.id==='styro'&&!e.ended);if(!barrier)return amount;const absorbed=Math.min(barrier.remaining,amount);barrier.remaining-=absorbed;if(barrier.remaining<=0)this.endMergeEffect(barrier);return amount-absorbed||null;},
 applyMergeMovement(){const a=this.mergeEffects.find(e=>e.id==='styrodog'&&!e.ended);if(a){if(this.hero.stun>0)this.endMergeEffect(a);else this.hero.vx=a.face*a.speed;}},
 stepMerge(dt){
  if(!this.mergeEffects)return;
  for(const id of Object.keys(MERGE_POWERS))this.mergeCooldowns[id]=Math.max(0,(this.mergeCooldowns[id]||0)-dt);
  for(const a of this.mergeEffects){
   if(a.ended)continue;const before=a.age;a.age+=dt;const tick=Math.floor(a.age+1e-8)-Math.floor(before+1e-8);
   if(a.id==='lightning'||a.id==='atomdust'){
    if(a.age>=a.delay&&!a.fired){a.fired=true;for(const e of this.enemies)if(e.state!=='dead'&&near(e,a.x,a.y,a.radius))this.damageEnemy(e,a.damage,{kind:`merge:${a.id}`,knock:a.id==='atomdust'?50:0,stagger:false});}
    if(a.age>=a.delay+.35)this.endMergeEffect(a);
   }else if(a.id==='styrodog'){
    for(const e of this.enemies)if(e.state!=='dead'&&!a.hits.has(e.id)&&near(e,this.hero.x,this.hero.y,e.w/2+38)){if(this.damageEnemy(e,a.damage,{kind:'merge:styrodog',knock:35,face:a.face}))a.hits.add(e.id);}
   }else if(a.id==='venomis'){
    for(const e of this.enemies)if(a.targets.includes(e.id)&&e.state!=='dead'){e.mergeRooted=true;e.rooted=true;if(tick&&a.age<=a.duration+1e-8)this.damageEnemy(e,a.damage*tick,{kind:'merge:venomis',stagger:false});}
   }else if(a.id==='air'){
    a.x+=a.face*65*dt;
    for(const e of this.enemies)if(e.state!=='dead'&&e.protection<=0&&(near(e,a.x,a.y,100)||a.targets.includes(e.id))){
     if(!a.targets.includes(e.id)&&a.targets.length<5)a.targets.push(e.id);if(!a.targets.includes(e.id))continue;
     if(!isBoss(e)){e.mergeLifted=true;e.lifted=true;e.airborne=true;e.spawnSurface||=e.surface;e.vy=0;this.moveEnemyAir(e,a.x+Math.sin(a.age*8+e.id)*25,a.y-80+Math.cos(a.age*7+e.id)*18);}
     if(tick&&a.age<=a.duration+1e-8)this.damageEnemy(e,a.damage*tick,{kind:'merge:air',stagger:false});
    }
   }
   if(a.duration&&a.age+1e-8>=a.duration)this.endMergeEffect(a);
  }
  this.mergeEffects=this.mergeEffects.filter(e=>!e.ended);
  for(const p of this.mergeShots){
   const nx=p.x+p.vx*dt,contacts=[];
   for(const s of this.surfaces.filter(s=>!s.oneWay)){const t=segmentHit(p.x,p.y,nx,p.y,s,8);if(t!==null)contacts.push({t,wall:true});}
   for(const e of this.enemies){if(e.state==='dead'||e.protection>0||p.hits.has(e.id)||p.groundOnly&&(e.flying||e.airborne||Math.abs(e.y-e.surface.y)>20))continue;const t=segmentHit(p.x,p.y,nx,p.y,box(e),12);if(t!==null)contacts.push({t,e});}
   contacts.sort((a,b)=>a.t-b.t||Number(b.wall)-Number(a.wall));for(const hit of contacts){if(hit.wall){p.life=0;break;}this.damageEnemy(hit.e,p.damage,{kind:`merge:${p.id}`,knock:40,face:p.face,stagger:false});p.hits.add(hit.e.id);if(p.hits.size>=p.pierce){p.life=0;break;}}
   p.x=nx;p.life-=dt;
  }
  this.mergeShots=this.mergeShots.filter(p=>p.life>0);
 },
 mergeSnapshot(){const recovery={...this.mergeCooldowns};for(const a of this.mergeEffects)if(a.after)recovery[a.id]=a.cooldown+Math.max(0,a.duration-a.age);return recovery;},
};
