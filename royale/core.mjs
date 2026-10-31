import { initializeJourney, journeyMethods } from './journey.mjs';
import { advancedEnemy, stepEnemyProjectiles } from './monsters.mjs';
import { normalizeWorld } from './world-state.mjs';
import { normalizeInventory, emptyInventory } from './equipment.mjs';
import { xpForLevel, PROGRESSION, RESPAWN } from './progression.mjs';
export { xpForLevel } from './progression.mjs';
import { PowerSystem, POWERS, normalizePowers, equipmentStats, BALANCE, isBoss } from './powers.mjs';
import { DEFAULT_LOOK, sanitizeLook, sanitizeOutfit } from './appearance.mjs';
import { WORLD_WIDTH, DEATH_Y, SURFACES, TYPES, SPAWNS, CAMPS, regionSurfaces, regionSpawns, regionCamps, boardIndex } from './world.mjs';
export const STEP = 1 / 60;
export const LEVEL_CAP = 99;
export const SAVE_KEY = 'healthia.royale.phase1.v1';
export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const approach = (v, target, amount) => v < target ? Math.min(v + amount, target) : Math.max(v - amount, target);
export const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export const ATTACKS = Object.freeze({
  punch: { startup: .055, active: .105, duration: .27, reach: 59, damage: 13 },
  kick: { startup: .10, active: .13, duration: .39, reach: 76, damage: 19 },
});
export { DEFAULT_LOOK, sanitizeLook } from './appearance.mjs';
export function decodeSave(text) {
  try {
    const data = JSON.parse(text);
    if (!data || ![1,2,3,4].includes(data.version) || (data.version>=2 && (!data.look || typeof data.look!=='object'))) return null;
    const integer = (value, max) => clamp(Math.floor(Number(value) || 0), 0, max);
    const level = Math.max(1, integer(data.level, LEVEL_CAP));
    const powers=normalizePowers(data.version>=3?data.powers:null,level,{strict:data.version>=3});
    if(!powers)return null;
    const checkpoint=integer(data.checkpoint,CAMPS.length-1);
    const world=normalizeWorld(data.version===4?data.world:null,checkpoint),inventory=data.version===4?normalizeInventory(data.inventory):emptyInventory();
    if(!world||!inventory||data.version===4&&(!data.world||!Number.isInteger(data.healthRoots)||data.healthRoots<0||data.healthRoots>4))return null;
    return { version: 4, powers, world, inventory, healthRoots:data.version===4?data.healthRoots:0, look: sanitizeLook(data.look), outfit: sanitizeOutfit(data.outfit), level,
      xp: level===99?0:integer(data.xp, xpForLevel(level) - 1), coins: integer(data.coins, 999999),
      checkpoint: integer(data.checkpoint, CAMPS.length - 1), kills: integer(data.kills, 999999),
      species: [...new Set((Array.isArray(data.species) ? data.species : []).filter(t => Object.hasOwn(TYPES,t)))],
      reachedEnd: data.reachedEnd === true };
  } catch { return null; }
}
export class Game {
  constructor({ look, save = null, surfaces = null, random = Math.random, equipment = {}, now = Date.now } = {}) {
    this.look = sanitizeLook(look ?? save?.look); this.outfit = sanitizeOutfit(save?.outfit); this.surfaces = surfaces||regionSurfaces(save?.world?.region||1); this.time = 0; this.paused = false;
    this.checkpoint = save?.checkpoint || 0; this.kills = save?.kills || 0;
    this.species = new Set(save?.species || []); this.reachedEnd = save?.reachedEnd || false;
    this.random=random; this.baseEquipment=equipmentStats(equipment); this.combatTimer=0;initializeJourney(this,save,now);this.refreshEquipment();
    this.events = []; this.attackSerial = 0; this.deathTimer = 0; this.started = false;
    const camp = this.camps[this.world.checkpoint.region===this.regionId?this.world.checkpoint.index:0], level = save?.level || 1;
    this.hero = { x: camp.x, y: camp.y, prevX: camp.x, prevY: camp.y, w: 34, h: 88,
      vx: 0, vy: 0, face: 1, prevFace: 1, grounded: true, jumps: 0, coyote: .10, jumpBuffer: 0,
      level, xp: save?.xp || 0, coins: save?.coins || 0, hp: 100 + (level - 1) * 15,
      maxHp: 100 + (level - 1) * 15, invulnerable: 1.7, attack: null, attackBuffer: null,
      pose: 'idle', cycle: 0, landing: 0, stun: 0, dead: false, jumpAge: 100, hurtAge: 100, defeatAge: 0, respawnAge: 100 };
    this.powers=new PowerSystem(this,normalizePowers(save?.powers,level)||normalizePowers(null,level));
    this.enemies = regionSpawns(this.regionId).map(([type, x, surface], id) => this.makeEnemy(type, x, surface, id));
    const location=save?.world?.location;
    if(location){Object.assign(this.hero,{x:location.x,y:location.y,prevX:location.x,prevY:location.y,face:location.face,hp:clamp(location.hp||this.hero.maxHp,Number.EPSILON,this.hero.maxHp),vx:location.vx||0,vy:location.vy||0,jumps:location.jumps||0,grounded:this.surfaces.some(s=>location.x>=s.x&&location.x<=s.x+s.w&&Math.abs(location.y-s.y)<.01)});}
    if(location&&!this.hero.grounded){this.hero.coyote=0;this.hero.jumps=Math.max(1,this.hero.jumps);}
    this.board=boardIndex(this.hero.x);
    for(const old of save?.world?.monsters||[]){const e=this.enemies.find(e=>e.id===old.id&&e.type===old.type);if(e){e.hp=old.hp;e.respawn=old.respawn;if(e.hp<=0){e.state='dead';e.rewarded=true;}}}
  }
  makeEnemy(type, x, surface, id) {
    const ground = this.surfaces.find(s => s.id === surface) || this.surfaces[0];
    const info = TYPES[type];
    for(const camp of this.camps)if(Math.abs(ground.y-camp.y)<80&&Math.abs(x-camp.x)<210){x=clamp(camp.x+(x>=camp.x?1:-1)*(210+info.w/2),ground.x+info.w/2,ground.x+ground.w-info.w/2);}
    const y=ground.y-(info.flying?50:0);
    return { id, type, level:info.level, flying:!!info.flying, x, y, prevX: x, prevY: y, spawnX: x, surface: ground, spawnSurface:ground, provoked:false, rewarded:false,
      hp: info.hp, maxHp: info.hp, w: info.w, h: info.h, face: id % 2 ? -1 : 1,
      state: 'patrol', age: id * .13, flash: 0, stagger: 0, respawn: 0, protection: .8, hit: false };
  }
  attackDefinition(kind) {return {...ATTACKS[kind],damage:ATTACKS[kind].damage+3*(this.hero.level-1)+this.equipment.damage+this.equipment.strength*.5};}
  markCombat(){this.combatTimer=PROGRESSION.combatGrace;}
  inCombat(){return !!this.bossEncounter||this.combatTimer>1e-8||!!this.hero.attack||Object.entries(this.powers.active).some(([id])=>POWERS[id].offensive)||this.powers.projectiles.length>0||this.powers.bursts.length>0||this.enemyShots.length>0;}

  nearTree(){return !this.hero.dead&&(this.treeVisit||(this.hero.grounded&&Math.abs(this.hero.x-BALANCE.tree.x)<85&&Math.abs(this.hero.y-BALANCE.tree.y)<40));}
  upgradePreview(id,count=1){
    if(!Object.hasOwn(POWERS,id))return {ok:false,error:'Unknown power.'};
    const levels=this.powers.data.levels,current=levels[id];
    if(!Number.isInteger(count)||count<1||current+count>20)return {ok:false,error:'Choose 1–20 levels within the ability cap.'};
    if(this.inCombat())return {ok:false,error:'Leave combat before spending Power Points.'};
    if(!this.nearTree())return {ok:false,error:'Visit the Tree of Eris from Pause or beside camp to upgrade.'};
    if(count>this.powers.data.points)return {ok:false,error:'Not enough Power Points. Earn one each hero level.'};
    return {ok:true,id,count,current,next:current+count};
  }
  upgradePower(id,count=1){
    const preview=this.upgradePreview(id,count);if(!preview.ok)return preview;
    this.powers.data.levels[id]+=count;this.powers.data.points-=count;
    this.emit('upgrade',{id,count});return preview;
  }
  equipPower(index,id){
    if(!Number.isInteger(index)||index<0||index>=3||this.inCombat()||!this.paused||this.hero.dead)return false;
    if(id!==null&&(!Object.hasOwn(POWERS,id)||POWERS[id].passive||!this.powers.data.levels[id]))return false;
    const slots=this.powers.data.equipped,old=slots[index],other=slots.indexOf(id);
    if(id!==null&&other>=0&&other!==index)slots[other]=old;else if(old&&old!==id)this.powers.end(old);slots[index]=id;return true;
  }
  damageEnemy(e,amount,{kind='punch',knock=0,face=this.hero.face,stagger=true}={}){
    if(e.state==='dead'||e.protection>0||!Number.isFinite(amount)||amount<=0)return false;
    this.markCombat();e.provoked=true;e.hp=Math.max(0,e.hp-amount);e.flash=.12;
    if(stagger&&!isBoss(e)){e.stagger=.26;e.state='recover';e.age=0;}
    if(knock&&!e.rooted&&!e.lifted&&!isBoss(e))e.x=clamp(e.x+face*knock,e.surface.x+e.w/2,e.surface.x+e.surface.w-e.w/2);
    this.emit('hit',{x:e.x,y:e.y-e.h/2,kind});
    if(e.hp<=0){e.state='dead';e.respawn=this.respawnDelay(e);e.rooted=false;e.lifted=false;this.reward(e);}
    return true;
  }
  moveEnemyAir(e,nx,ny){
    const oldX=e.x,oldY=e.y;nx=clamp(nx,e.w/2,WORLD_WIDTH-e.w/2);
    for(const s of this.surfaces){
      if(s.oneWay||oldY<=s.y+.01||oldY-e.h>=s.y+s.h)continue;
      if(oldX+e.w/2<=s.x&&nx+e.w/2>s.x)nx=s.x-e.w/2;
      if(oldX-e.w/2>=s.x+s.w&&nx-e.w/2<s.x+s.w)nx=s.x+s.w+e.w/2;
    }
    for(const s of this.surfaces){
      if(nx+e.w/2<=s.x||nx-e.w/2>=s.x+s.w)continue;
      if(ny>=oldY&&oldY<=s.y+.01&&ny>=s.y)ny=s.y;
      if(!s.oneWay&&ny<oldY&&oldY-e.h>=s.y+s.h&&ny-e.h<=s.y+s.h)ny=s.y+s.h+e.h;
    }
    e.x=nx;e.y=ny;
  }
  heroBox() { const h = this.hero; return { x: h.x - h.w / 2, y: h.y - h.h, w: h.w, h: h.h }; }
  attackBox() {
    const h = this.hero, a = h.attack;
    if (!a) return null;
    const reach = ATTACKS[a.kind].reach;
    return { x: a.face > 0 ? h.x + 3 : h.x - reach - 3, y: h.y - 71, w: reach, h: 69 };
  }
  emit(type, data = {}) { this.events.push({ type, ...data }); }
  drain() { return this.events.splice(0); }
  startAttack(kind) {
    this.markCombat();
    const h = this.hero;
    h.attack = { kind, age: 0, face: h.face, targets: new Set(), id: ++this.attackSerial };
    this.emit('swing', { kind });
  }
  moveHero(dt) {
    const h = this.hero, oldX = h.x;
    h.x = clamp(h.x + h.vx * dt, h.w / 2, WORLD_WIDTH - h.w / 2);
    for (const s of this.surfaces) {
      if (s.oneWay || h.y <= s.y + .01 || h.y - h.h >= s.y + s.h) continue;
      if (oldX + h.w / 2 <= s.x && h.x + h.w / 2 > s.x) { h.x = s.x - h.w / 2; h.vx = 0; }
      if (oldX - h.w / 2 >= s.x + s.w && h.x - h.w / 2 < s.x + s.w) { h.x = s.x + s.w + h.w / 2; h.vx = 0; }
    }
    const oldY = h.y;
    if(!this.powers.flying)h.vy = Math.min(900, h.vy + 1480 * dt); h.y += h.vy * dt; h.grounded = false;
    // Sweep the feet vertically; choose the first surface crossed, independent of array order.
    let floor = Infinity, ceiling = -Infinity;
    for (const s of this.surfaces) {
      if (h.x + h.w / 2 <= s.x || h.x - h.w / 2 >= s.x + s.w) continue;
      if (h.vy >= 0 && oldY <= s.y + .01 && h.y >= s.y) floor = Math.min(floor, s.y);
      if (!s.oneWay && h.vy < 0 && oldY - h.h >= s.y + s.h && h.y - h.h <= s.y + s.h) ceiling = Math.max(ceiling, s.y + s.h);
    }
    if (floor < Infinity) {
      if (h.vy > 150) { h.landing = .13; this.emit('land', { x: h.x, y: floor }); }
      h.y = floor; h.vy = 0; h.grounded = true; h.jumps = 0; h.coyote = .10;
    } else if (ceiling > -Infinity) { h.y = ceiling + h.h; h.vy = 0; }
  }
  hurt(amount, fromX, source = {}) {
    const h = this.hero;
    if (Object.hasOwn(TYPES,source.type)&&!isBoss(source)&&this.isSafeCamp())return false;
    if (h.invulnerable > 0 || h.dead || !Number.isFinite(amount) || amount<=0) return false;
    const incoming=this.powers.incoming(amount,source);if(incoming===null)return false;this.markCombat();
    h.hp = Math.max(0, h.hp - incoming); h.invulnerable = 1.05; h.hurtAge = 0;
    if(!this.powers.active.steel){h.stun=.16;h.vx = (h.x >= fromX ? 1 : -1) * 210;h.attack=null;h.attackBuffer=null;}
    this.emit('hurt');
    if (h.hp <= 0) this.defeat();
    return true;
  }
  defeat() {
    const h = this.hero; if (h.dead) return;
    this.powers.cancelEffects();
    this.lastDefeatPenalty=h.level<99?Math.min(h.xp,Math.floor(xpForLevel(h.level)*PROGRESSION.defeatFraction)):0;h.xp-=this.lastDefeatPenalty;
    h.dead = true; h.defeatAge = 0; h.hp = 0; h.vx = h.vy = 0; h.attack = null; h.attackBuffer = null;
    this.deathTimer = 1.5; this.emit('defeat');
  }
  respawn() {
    const h = this.hero, cp=this.world.checkpoint;
    // Compatibility for old callers changing the local checkpoint index.
    if(cp.region===this.regionId)cp.index=this.checkpoint;
    if(cp.region!==this.regionId)this.loadRegion(cp.region);
    const camp=regionCamps(cp.region)[cp.index];this.checkpoint=cp.index;this.enemyShots=[];this.combatTimer=0;
    this.powers.cancelEffects();
    Object.assign(h, { x: camp.x, y: camp.y, prevX: camp.x, prevY: camp.y, vx: 0, vy: 0, dead: false,
      hp: h.maxHp, invulnerable: 2.5, stun: 0, grounded: true, jumps: 0, jumpBuffer: 0, coyote: .1, attack: null, attackBuffer: null, pose: 'idle', respawnAge: 0, hurtAge: 100, jumpAge: 100, defeatAge: 0 });
    this.emit('respawn', { name: camp.name });
  }
  isSafeCamp(){return !this.bossEncounter&&this.camps.some(c=>Math.abs(c.x-this.hero.x)<180&&Math.abs(c.y-this.hero.y)<100);}
  nearCamp() { return this.camps.findIndex(c => Math.abs(c.x - this.hero.x) < 90 && Math.abs(c.y - this.hero.y) < 40); }
  interact() {
    const i = this.nearCamp();
    if (i < 0) {this.usePassage();return;}
    if (!this.canSave()) return;
    this.checkpoint = i; this.hero.hp = this.hero.maxHp; this.hero.invulnerable = 2;
    this.world.checkpoint={region:this.regionId,index:i};const key=`${this.regionId}:${i}`;if(!this.world.activated.includes(key))this.world.activated.push(key);
    this.emit('camp', { name: this.camps[i].name });
  }
  step(dt = STEP, input = {}) {
    if (this.paused || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, STEP); this.time += dt;this.combatTimer=Math.max(0,this.combatTimer-dt);
    this.powers.step(dt);
    const h = this.hero;
    h.prevX = h.x; h.prevY = h.y; h.prevFace = h.face;
    if (h.dead) { h.defeatAge += dt; this.deathTimer -= dt; if (this.deathTimer <= 0) this.respawn(); return; }
    h.jumpAge += dt; h.hurtAge += dt; h.respawnAge += dt;h.castAge=(h.castAge??100)+dt;
    for(let i=0;i<4;i++)if(input.powers?.[i])this.powers.activateSlot(i);
    h.invulnerable = Math.max(0, h.invulnerable - dt); h.stun = Math.max(0, h.stun - dt); h.landing = Math.max(0, h.landing - dt);
    h.coyote = Math.max(0, h.coyote - dt); h.jumpBuffer = Math.max(0, h.jumpBuffer - dt);
    if (!h.grounded && h.coyote <= 0 && h.jumps === 0) h.jumps = 1;
    if (input.jump&&!this.powers.flying) h.jumpBuffer = .13;
    if (!this.powers.flying && h.jumpBuffer > 0 && h.jumps < 2 && h.stun <= 0) {
      h.vy = h.jumps === 0 ? -565 : -520; h.jumps++; h.jumpAge = 0; h.grounded = false; h.coyote = 0; h.jumpBuffer = 0;
      this.emit('jump', { x: h.x, y: h.y, double: h.jumps === 2 });
    }
    const axis = clamp(Number(input.move) || 0, -1, 1);
    if (h.stun <= 0) {
      h.vx = approach(h.vx, axis * (input.run ? 315*(1+this.powers.speed) : 185), (axis ? 2100 : 2500) * dt);
      if (Math.abs(axis) > .08) h.face = axis > 0 ? 1 : -1;
    }
    if(this.powers.flying){h.vy=approach(h.vy,(input.vertical?clamp(Number(input.vertical),-1,1):this.powers.active.flight.age<.35?-1:0)*BALANCE.flightSpeed,1200*dt);if(h.y<120){h.y=120;h.vy=Math.max(0,h.vy);}}
    this.moveHero(dt);
    if (h.y > DEATH_Y) { this.defeat(); return; }
    if(input.heal)this.useHealthRoot();
    if (input.interact) this.interact();
    if(input.tree&&this.nearTree()&&!this.inCombat())this.emit('tree');
    if (h.attackBuffer) { h.attackBuffer.life -= dt; if (h.attackBuffer.life <= 0) h.attackBuffer = null; }
    if (input.punch&&!this.powers.flying&&!this.powers.active.superKick) h.attackBuffer = { kind: 'punch', life: .18 };
    if (input.kick&&!this.powers.flying&&!this.powers.active.superKick) h.attackBuffer = { kind: 'kick', life: .18 };
    if (h.attack) { h.attack.age += dt*this.powers.attackRate; if (h.attack.age >= ATTACKS[h.attack.kind].duration) h.attack = null; }
    // Held controls chain immediately after recovery: no cooldown timer or stamina gate.
    if (!h.attack && h.stun <= 0 && !this.powers.flying && !this.powers.active.superKick) {
      const kind = h.attackBuffer?.kind || (input.kickHeld ? 'kick' : input.punchHeld ? 'punch' : null);
      if (kind) { this.startAttack(kind); h.attackBuffer = null; }
    }
    const attack = h.attack, definition = attack && ATTACKS[attack.kind];
    if (attack && attack.age >= definition.startup && attack.age < definition.startup + definition.active) {
      const box = this.attackBox();
      const candidates=this.enemies.filter(e=>e.state!=='dead'&&e.protection<=0&&!attack.targets.has(e.id)&&overlaps(box,{x:e.x-e.w/2,y:e.y-e.h,w:e.w,h:e.h})).sort((a,b)=>Math.abs(a.x-h.x)-Math.abs(b.x-h.x)||a.id-b.id);
      this.powers.melee(attack,candidates);
    }
    for (const e of this.enemies) this.stepEnemy(e, dt);
    stepEnemyProjectiles(this,dt);this.enterBoard(boardIndex(h.x));
    h.cycle += Math.abs(h.x - h.prevX) / 52;
    h.pose = h.stun > 0 ? 'hurt' : h.attack ? h.attack.kind : !h.grounded ? (h.vy < 0 ? 'jump' : 'fall') : h.landing > 0 ? 'land' : Math.abs(h.vx) > 220 ? 'run' : Math.abs(h.vx) > 8 ? 'walk' : 'idle';
    if (this.regionId===1&&h.x >= 5860 && !this.reachedEnd) { this.reachedEnd = true; this.emit('destination'); }
  }
  stepEnemy(e, dt) {
    if(!e.lifted){e.prevX = e.x; e.prevY = e.y;}
    if (e.state === 'dead') {
      e.respawn -= dt;
      if (e.respawn <= 0 && (Math.abs(this.hero.x - e.spawnX) > RESPAWN.safeDistance || Math.abs(this.hero.y - e.spawnSurface.y) > 160)) {
        e.provoked=false;e.rewarded=false;e.pouncing=false;e.airVx=0;e.surface=e.spawnSurface||e.surface;e.x = e.prevX = e.spawnX;e.y=e.prevY=e.surface.y-(e.flying?50:0);e.airborne=false;e.lifted=false;e.rooted=false;e.vy=0; e.hp = e.maxHp; e.state = 'patrol'; e.age = 0; e.protection = 1; this.emit('spawn', { x: e.x, y: e.y });
      }
      return;
    }
    e.age += dt; e.flash = Math.max(0, e.flash - dt); e.protection = Math.max(0, e.protection - dt); e.stagger = Math.max(0, e.stagger - dt);
    if(e.lifted)return;
    if(e.airborne){
      const oldY=e.y;if(e.pouncing){this.moveEnemyAir(e,e.x+(e.airVx||0)*dt,e.y);if(!e.hit&&Math.abs(this.hero.x-e.x)<65&&Math.abs(this.hero.y-e.y)<65){e.hit=true;this.hurt(this.monsterDamage(e),e.x,e);}}e.vy=Math.min(900,(e.vy||0)+1480*dt);e.y+=e.vy*dt;
      const floors=this.surfaces.filter(s=>e.x+e.w/2>s.x&&e.x-e.w/2<s.x+s.w&&oldY<=s.y+.01&&e.y>=s.y).sort((a,b)=>a.y-b.y);
      if(floors.length){e.surface=floors[0];e.y=e.surface.y;e.vy=0;e.airborne=false;e.pouncing=false;e.state='recover';e.age=0;}
      else if(e.y>DEATH_Y){e.y=e.surface.y;e.x=e.spawnX;e.airborne=false;e.vy=0;}
      return;
    }
    if((e.rooted&&!isBoss(e))||e.stagger > 0 || e.protection > 0) return;
    if(TYPES[e.type].region>1){advancedEnemy(this,e,dt);return;}
    const movementScale=e.rooted?.5:1;
    const h = this.hero, d = h.x - e.x, nearHeight = Math.abs(h.y - e.y) < 62;
    const peaceful=TYPES[e.type].peaceful&&h.level<=3&&!e.provoked;
    const withinLeash = !h.dead&&!peaceful&&!this.isSafeCamp()&&Math.abs(h.x - e.spawnX) < 225;
    const info = TYPES[e.type], left = Math.max(e.surface.x + e.w / 2 + 5, e.spawnX - 150), right = Math.min(e.surface.x + e.surface.w - e.w / 2 - 5, e.spawnX + 150);
    if (e.state === 'patrol') {
      if (nearHeight && withinLeash && Math.abs(d) < 65) { e.face = Math.sign(d) || e.face; e.state = 'warn'; e.age = 0; }
      else {
        if (nearHeight && withinLeash && Math.abs(d) < 185) e.face = Math.sign(d) || e.face;
        if (e.x <= left) e.face = 1; if (e.x >= right) e.face = -1;
        if(e.x<left)e.x=Math.min(left,e.x+info.speed*movementScale*dt);else if(e.x>right)e.x=Math.max(right,e.x-info.speed*movementScale*dt);else e.x=clamp(e.x+e.face*info.speed*movementScale*dt,left,right);
      }
    } else if (e.state === 'warn' && e.age >= (e.type==='crawler'?.55:.7)) { e.state = 'strike'; e.age = 0; e.hit = false;if(e.type==='slime'){e.airborne=true;e.pouncing=true;e.vy=-180;e.airVx=e.face*95;} }
    else if (e.state === 'strike') {
      e.x = clamp(e.x + e.face * (e.type==='crawler'?155:105) * movementScale * dt, left, right);
      if (!e.hit && e.age >= .06) {
        e.hit = true;
        if (nearHeight && Math.abs(h.x - e.x) < 76 && (h.x - e.x) * e.face > -15) this.hurt(this.monsterDamage(e), e.x, e);
      }
      if (e.age >= .24) { e.state = 'recover'; e.age = 0; }
    } else if (e.state === 'recover' && e.age >= 1.1) { e.state = 'patrol'; e.age = 0; }
  }
  save() {
    if(!this.canSave())return null;
    const h=this.hero;
    this.world.checkpoint=this.world.checkpoint.region===this.regionId?{region:this.regionId,index:this.checkpoint}:this.world.checkpoint;
    if(!this.world.activated.includes(`${this.world.checkpoint.region}:${this.world.checkpoint.index}`))this.world.activated.push(`${this.world.checkpoint.region}:${this.world.checkpoint.index}`);
    const world={...this.world,region:this.regionId,location:{x:h.x,y:h.y,face:h.face,hp:h.hp,vx:h.vx,vy:this.powers.flying?Math.max(0,h.vy):h.vy,jumps:h.jumps},monsters:this.enemies.filter(e=>!isBoss(e)&&!e.summoned).map(e=>({id:e.id,type:e.type,hp:e.hp,respawn:Math.max(0,e.respawn)}))};
    return JSON.stringify({version:4,powers:this.powers.snapshot(),look:this.look,outfit:this.outfit,level:h.level,xp:h.xp,coins:h.coins,checkpoint:this.checkpoint,kills:this.kills,species:[...this.species],reachedEnd:this.reachedEnd,healthRoots:this.healthRoots,inventory:this.inventory,world});
  }
}
Object.assign(Game.prototype,journeyMethods);
