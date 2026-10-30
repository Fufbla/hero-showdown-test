import { DEFAULT_LOOK, sanitizeLook, sanitizeOutfit } from './appearance.mjs';
import { WORLD_WIDTH, DEATH_Y, SURFACES, TYPES, SPAWNS, CAMPS } from './world.mjs';
export const STEP = 1 / 60;
export const LEVEL_CAP = 10; // Phase 1 balance range; the 99-level system comes later.
export const SAVE_KEY = 'healthia.royale.phase1.v1';
export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const approach = (v, target, amount) => v < target ? Math.min(v + amount, target) : Math.max(v - amount, target);
export const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export const xpForLevel = level => 50 + (level - 1) * 30;
export const ATTACKS = Object.freeze({
  punch: { startup: .055, active: .105, duration: .27, reach: 59, damage: 13 },
  kick: { startup: .10, active: .13, duration: .39, reach: 76, damage: 19 },
});
export { DEFAULT_LOOK, sanitizeLook } from './appearance.mjs';
export function decodeSave(text) {
  try {
    const data = JSON.parse(text);
    if (!data || ![1,2].includes(data.version) || (data.version===2 && (!data.look || typeof data.look!=='object'))) return null;
    const integer = (value, max) => clamp(Math.floor(Number(value) || 0), 0, max);
    const level = Math.max(1, integer(data.level, LEVEL_CAP));
    return { version: 2, look: sanitizeLook(data.look), outfit: sanitizeOutfit(data.outfit), level,
      xp: integer(data.xp, xpForLevel(level) - 1), coins: integer(data.coins, 999999),
      checkpoint: integer(data.checkpoint, CAMPS.length - 1), kills: integer(data.kills, 999999),
      species: [...new Set((Array.isArray(data.species) ? data.species : []).filter(t => t in TYPES))],
      reachedEnd: data.reachedEnd === true };
  } catch { return null; }
}
export class Game {
  constructor({ look, save = null, surfaces = SURFACES } = {}) {
    this.look = sanitizeLook(look ?? save?.look); this.outfit = sanitizeOutfit(save?.outfit); this.surfaces = surfaces; this.time = 0; this.paused = false;
    this.checkpoint = save?.checkpoint || 0; this.kills = save?.kills || 0;
    this.species = new Set(save?.species || []); this.reachedEnd = save?.reachedEnd || false;
    this.events = []; this.attackSerial = 0; this.deathTimer = 0; this.started = false;
    const camp = CAMPS[this.checkpoint], level = save?.level || 1;
    this.hero = { x: camp.x, y: camp.y, prevX: camp.x, prevY: camp.y, w: 34, h: 88,
      vx: 0, vy: 0, face: 1, prevFace: 1, grounded: true, jumps: 0, coyote: .10, jumpBuffer: 0,
      level, xp: save?.xp || 0, coins: save?.coins || 0, hp: 100 + (level - 1) * 10,
      maxHp: 100 + (level - 1) * 10, invulnerable: 1.7, attack: null, attackBuffer: null,
      pose: 'idle', cycle: 0, landing: 0, stun: 0, dead: false, jumpAge: 100, hurtAge: 100, defeatAge: 0, respawnAge: 100 };
    this.enemies = SPAWNS.map(([type, x, surface], id) => this.makeEnemy(type, x, surface, id));
  }
  makeEnemy(type, x, surface, id) {
    const ground = this.surfaces.find(s => s.id === surface) || this.surfaces[0];
    const info = TYPES[type];
    return { id, type, x, y: ground.y, prevX: x, prevY: ground.y, spawnX: x, surface: ground,
      hp: info.hp, maxHp: info.hp, w: info.w, h: info.h, face: id % 2 ? -1 : 1,
      state: 'patrol', age: id * .13, flash: 0, stagger: 0, respawn: 0, protection: .8, hit: false };
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
    h.vy = Math.min(900, h.vy + 1480 * dt); h.y += h.vy * dt; h.grounded = false;
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
  reward(e) {
    const h = this.hero, info = TYPES[e.type];
    this.kills++; this.species.add(e.type); h.coins += info.coins;
    if (h.level < LEVEL_CAP) h.xp += info.xp;
    while (h.level < LEVEL_CAP && h.xp >= xpForLevel(h.level)) {
      h.xp -= xpForLevel(h.level); h.level++; h.maxHp += 10; h.hp = h.maxHp;
      this.emit('level', { level: h.level });
    }
    if (h.level === LEVEL_CAP) h.xp = 0;
    this.emit('reward', { x: e.x, y: e.y - 24, xp: info.xp, coins: info.coins, enemy: info.name });
  }
  hurt(amount, fromX) {
    const h = this.hero;
    if (h.invulnerable > 0 || h.dead) return false;
    h.hp = Math.max(0, h.hp - amount); h.invulnerable = 1.05; h.stun = .16; h.hurtAge = 0;
    h.vx = (h.x >= fromX ? 1 : -1) * 210; h.attack = null; h.attackBuffer = null;
    this.emit('hurt');
    if (h.hp <= 0) this.defeat();
    return true;
  }
  defeat() {
    const h = this.hero; if (h.dead) return;
    h.dead = true; h.defeatAge = 0; h.hp = 0; h.vx = h.vy = 0; h.attack = null; h.attackBuffer = null;
    this.deathTimer = 1.5; this.emit('defeat');
  }
  respawn() {
    const h = this.hero, camp = CAMPS[this.checkpoint];
    Object.assign(h, { x: camp.x, y: camp.y, prevX: camp.x, prevY: camp.y, vx: 0, vy: 0, dead: false,
      hp: h.maxHp, invulnerable: 2.5, stun: 0, grounded: true, jumps: 0, jumpBuffer: 0, coyote: .1, attack: null, attackBuffer: null, pose: 'idle', respawnAge: 0, hurtAge: 100, jumpAge: 100, defeatAge: 0 });
    this.emit('respawn', { name: camp.name });
  }
  nearCamp() { return CAMPS.findIndex(c => Math.abs(c.x - this.hero.x) < 90 && Math.abs(c.y - this.hero.y) < 40); }
  interact() {
    const i = this.nearCamp();
    if (i < 0 || this.hero.dead) return;
    this.checkpoint = i; this.hero.hp = this.hero.maxHp; this.hero.invulnerable = 2;
    this.emit('camp', { name: CAMPS[i].name });
  }
  step(dt = STEP, input = {}) {
    if (this.paused || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, STEP); this.time += dt;
    const h = this.hero;
    h.prevX = h.x; h.prevY = h.y; h.prevFace = h.face;
    if (h.dead) { h.defeatAge += dt; this.deathTimer -= dt; if (this.deathTimer <= 0) this.respawn(); return; }
    h.jumpAge += dt; h.hurtAge += dt; h.respawnAge += dt;
    h.invulnerable = Math.max(0, h.invulnerable - dt); h.stun = Math.max(0, h.stun - dt); h.landing = Math.max(0, h.landing - dt);
    h.coyote = Math.max(0, h.coyote - dt); h.jumpBuffer = Math.max(0, h.jumpBuffer - dt);
    if (!h.grounded && h.coyote <= 0 && h.jumps === 0) h.jumps = 1;
    if (input.jump) h.jumpBuffer = .13;
    if (h.jumpBuffer > 0 && h.jumps < 2 && h.stun <= 0) {
      h.vy = h.jumps === 0 ? -565 : -520; h.jumps++; h.jumpAge = 0; h.grounded = false; h.coyote = 0; h.jumpBuffer = 0;
      this.emit('jump', { x: h.x, y: h.y, double: h.jumps === 2 });
    }
    const axis = clamp(Number(input.move) || 0, -1, 1);
    if (h.stun <= 0) {
      h.vx = approach(h.vx, axis * (input.run ? 315 : 185), (axis ? 2100 : 2500) * dt);
      if (Math.abs(axis) > .08) h.face = axis > 0 ? 1 : -1;
    }
    this.moveHero(dt);
    if (h.y > DEATH_Y) { this.defeat(); return; }
    if (input.interact) this.interact();
    if (h.attackBuffer) { h.attackBuffer.life -= dt; if (h.attackBuffer.life <= 0) h.attackBuffer = null; }
    if (input.punch) h.attackBuffer = { kind: 'punch', life: .18 };
    if (input.kick) h.attackBuffer = { kind: 'kick', life: .18 };
    if (h.attack) { h.attack.age += dt; if (h.attack.age >= ATTACKS[h.attack.kind].duration) h.attack = null; }
    // Held controls chain immediately after recovery: no cooldown timer or stamina gate.
    if (!h.attack && h.stun <= 0) {
      const kind = h.attackBuffer?.kind || (input.kickHeld ? 'kick' : input.punchHeld ? 'punch' : null);
      if (kind) { this.startAttack(kind); h.attackBuffer = null; }
    }
    const attack = h.attack, definition = attack && ATTACKS[attack.kind];
    if (attack && attack.age >= definition.startup && attack.age < definition.startup + definition.active) {
      const box = this.attackBox();
      for (const e of this.enemies) {
        if (e.state === 'dead' || e.protection > 0 || attack.targets.has(e.id)) continue;
        if (!overlaps(box, { x: e.x - e.w / 2, y: e.y - e.h, w: e.w, h: e.h })) continue;
        attack.targets.add(e.id); e.hp = Math.max(0, e.hp - definition.damage); e.flash = .12; e.stagger = .26;
        e.x = clamp(e.x + attack.face * 18, e.surface.x + e.w / 2, e.surface.x + e.surface.w - e.w / 2);
        e.state = 'recover'; e.age = 0; this.emit('hit', { x: e.x, y: e.y - e.h / 2, kind: attack.kind });
        if (e.hp <= 0) { e.state = 'dead'; e.respawn = 8; this.reward(e); }
      }
    }
    for (const e of this.enemies) this.stepEnemy(e, dt);
    h.cycle += Math.abs(h.x - h.prevX) / 52;
    h.pose = h.stun > 0 ? 'hurt' : h.attack ? h.attack.kind : !h.grounded ? (h.vy < 0 ? 'jump' : 'fall') : h.landing > 0 ? 'land' : Math.abs(h.vx) > 220 ? 'run' : Math.abs(h.vx) > 8 ? 'walk' : 'idle';
    if (h.x >= 5860 && !this.reachedEnd) { this.reachedEnd = true; this.emit('destination'); }
  }
  stepEnemy(e, dt) {
    e.prevX = e.x; e.prevY = e.y;
    if (e.state === 'dead') {
      e.respawn -= dt;
      if (e.respawn <= 0 && (Math.abs(this.hero.x - e.spawnX) > 130 || Math.abs(this.hero.y - e.y) > 100)) {
        e.x = e.prevX = e.spawnX; e.hp = e.maxHp; e.state = 'patrol'; e.age = 0; e.protection = 1; this.emit('spawn', { x: e.x, y: e.y });
      }
      return;
    }
    e.age += dt; e.flash = Math.max(0, e.flash - dt); e.protection = Math.max(0, e.protection - dt); e.stagger = Math.max(0, e.stagger - dt);
    if (e.stagger > 0 || e.protection > 0) return;
    const h = this.hero, d = h.x - e.x, nearHeight = Math.abs(h.y - e.y) < 62;
    const withinLeash = Math.abs(h.x - e.spawnX) < 225;
    const info = TYPES[e.type], left = Math.max(e.surface.x + e.w / 2 + 5, e.spawnX - 150), right = Math.min(e.surface.x + e.surface.w - e.w / 2 - 5, e.spawnX + 150);
    if (e.state === 'patrol') {
      if (nearHeight && withinLeash && Math.abs(d) < 65) { e.face = Math.sign(d) || e.face; e.state = 'warn'; e.age = 0; }
      else {
        if (nearHeight && withinLeash && Math.abs(d) < 185) e.face = Math.sign(d) || e.face;
        if (e.x <= left) e.face = 1; if (e.x >= right) e.face = -1;
        e.x = clamp(e.x + e.face * info.speed * dt, left, right);
      }
    } else if (e.state === 'warn' && e.age >= .7) { e.state = 'strike'; e.age = 0; e.hit = false; }
    else if (e.state === 'strike') {
      e.x = clamp(e.x + e.face * 105 * dt, left, right);
      if (!e.hit && e.age >= .06) {
        e.hit = true;
        if (nearHeight && Math.abs(h.x - e.x) < 76 && (h.x - e.x) * e.face > -15) this.hurt(info.damage, e.x);
      }
      if (e.age >= .24) { e.state = 'recover'; e.age = 0; }
    } else if (e.state === 'recover' && e.age >= 1.1) { e.state = 'patrol'; e.age = 0; }
  }
  save() {
    const h = this.hero;
    return JSON.stringify({ version: 2, look: this.look, outfit: this.outfit, level: h.level, xp: h.xp, coins: h.coins, checkpoint: this.checkpoint, kills: this.kills, species: [...this.species], reachedEnd: this.reachedEnd });
  }
}
