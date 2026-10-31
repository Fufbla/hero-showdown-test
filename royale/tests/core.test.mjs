import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, STEP, ATTACKS, LEVEL_CAP, decodeSave, sanitizeLook, xpForLevel } from '../core.mjs';
import { WORLD_WIDTH, SURFACES, CAMPS } from '../world.mjs';
const ticks = (g, n, input = {}) => { for (let i = 0; i < n; i++) g.step(STEP, typeof input === 'function' ? input(i) : input); };
const empty = () => { const g = new Game(); g.enemies = []; return g; };
test('walk, run, release, reverse, and world bounds', () => {
  const walk = empty(), run = empty(); ticks(walk, 60, { move: 1 }); ticks(run, 60, { move: 1, run: true });
  assert.equal(walk.hero.vx, 185); assert.equal(run.hero.vx, 315); assert.ok(run.hero.x - walk.hero.x > 100);
  ticks(run, 10); assert.equal(run.hero.vx, 0);
  ticks(run, 12, { move: -1, run: true }); assert.equal(run.hero.face, -1); assert.equal(run.hero.vx, -315);
  ticks(run, 300, { move: -1, run: true }); assert.equal(run.hero.x, 17);
  run.hero.x = WORLD_WIDTH - 30; ticks(run, 20, { move: 1, run: true }); assert.equal(run.hero.x, WORLD_WIDTH - 17);
});
test('double jump rises again; a third jump cannot reset vertical velocity', () => {
  const g = empty(); g.step(STEP, { jump: true }); ticks(g, 18); const y = g.hero.y;
  g.step(STEP, { jump: true }); assert.equal(g.hero.jumps, 2); assert.ok(g.hero.vy < -490);
  ticks(g, 6); const vy = g.hero.vy; g.step(STEP, { jump: true }); assert.ok(g.hero.vy > vy); assert.equal(g.hero.jumps, 2);
  ticks(g, 10); assert.ok(g.hero.y < y - 30); ticks(g, 90); assert.equal(g.hero.y, 600); assert.equal(g.hero.jumps, 0);
});
test('midair directional control reverses promptly', () => {
  const g = empty(); ticks(g, 15, { move: 1, run: true }); g.step(STEP, { move: 1, jump: true, run: true }); ticks(g, 18, { move: -1, run: true });
  assert.ok(g.hero.vx < -290); assert.equal(g.hero.grounded, false);
});
test('coyote jump and buffered landing jump work without a third air jump', () => {
  const g = empty(); g.hero.x = 1403; g.hero.grounded = false; g.hero.coyote = .08;
  g.step(STEP, { jump: true }); assert.equal(g.hero.jumps, 1); assert.ok(g.hero.vy < 0);
  const land = empty(); Object.assign(land.hero, { y: 594, vy: 300, grounded: false, jumps: 2, coyote: 0 });
  land.step(STEP, { jump: true }); ticks(land, 2); assert.ok(land.hero.vy < 0); assert.equal(land.hero.jumps, 1);
});
test('one-way platforms allow ascent from below and catch a falling hero', () => {
  const g = empty(); g.hero.x = 500; g.step(STEP, { jump: true }); ticks(g, 10); g.step(STEP, { jump: true });
  let minimum = g.hero.y; for (let i = 0; i < 70; i++) { g.step(STEP); minimum = Math.min(minimum, g.hero.y); }
  assert.ok(minimum < 480); assert.equal(g.hero.y, 480); assert.equal(g.hero.grounded, true);
});
test('solid wall, ceiling, and swept floor collisions stop penetration', () => {
  const surfaces = [{id:'base',x:0,y:600,w:2000,h:300}, {id:'wall',x:300,y:400,w:80,h:200}, {id:'roof',x:50,y:420,w:180,h:20}];
  const g = new Game({ surfaces }); g.enemies=[]; ticks(g, 60, {move:1,run:true}); assert.equal(g.hero.x,283);
  g.hero.x=150;g.step(STEP,{jump:true});ticks(g,12);assert.ok(g.hero.y-g.hero.h>=440);assert.ok(g.hero.vy>=0);
  g.hero.x=600;g.hero.y=580;g.hero.vy=900;g.hero.grounded=false;ticks(g,3);assert.equal(g.hero.y,600);
});
test('all low tide routes can be crossed with ordinary jumps', () => {
  const g = empty(); let furthest=0;
  for(let i=0;i<1800;i++){
    const x=g.hero.x;
    const nearGap=[1390,2710,4120].some(edge=>x>edge-75&&x<edge+170);
    g.step(STEP,{move:1,run:true,jump:g.hero.grounded&&nearGap});
    assert.ok(!g.hero.dead,'route must not force a death');furthest=Math.max(furthest,g.hero.x);
  }
  assert.ok(furthest>=5900);assert.equal(g.reachedEnd,true);
});
function duel(){const g=new Game();const e=g.enemies[0];g.enemies=[e];e.x=e.spawnX=220;e.protection=0;e.state='recover';e.age=-100;g.hero.x=175;g.hero.invulnerable=0;return {g,e};}
test('one punch damages each target once; attacks cannot hit behind the hero', () => {
  const {g,e}=duel();g.step(STEP,{punch:true});ticks(g,13);assert.equal(e.hp,e.maxHp-ATTACKS.punch.damage);ticks(g,8);assert.equal(e.hp,e.maxHp-13);
  e.x=130;g.step(STEP,{kick:true});ticks(g,30);assert.equal(e.hp,e.maxHp-13);
});
test('held basic attacks chain with only animation recovery, including while airborne', () => {
  const g=empty();ticks(g,100,{punchHeld:true});assert.ok(g.attackSerial>=6);
  g.step(STEP,{jump:true,kick:true});ticks(g,20,{kickHeld:true});assert.equal(g.hero.grounded,false);assert.equal(g.hero.attack.kind,'kick');
});
test('airborne attacks connect using the current hero and enemy positions', () => {
  const {g,e}=duel();g.hero.y=575;g.hero.vy=-50;g.hero.grounded=false;g.hero.jumps=1;g.hero.coyote=0;
  g.step(STEP,{kick:true});ticks(g,10);assert.ok(e.hp<e.maxHp);
});
test('a defeated enemy rewards once, respawns later, and avoids spawning on the hero', () => {
  const {g,e}=duel();e.hp=13;g.step(STEP,{punch:true});ticks(g,10);assert.equal(e.state,'dead');assert.equal(g.kills,1);assert.equal(g.hero.coins,3);assert.equal(g.hero.xp,14);
  ticks(g,600,{punchHeld:true});assert.equal(e.state,'dead');assert.equal(g.hero.coins,3);
  g.hero.x=800;ticks(g,2);assert.equal(e.state,'patrol');assert.equal(e.hp,e.maxHp);assert.ok(e.protection>0);
});
test('level ups restore health, carry remaining XP, and enforce the 99-level cap', () => {
  const {g,e}=duel();g.hero.hp=25;g.hero.xp=45;g.reward(e);assert.equal(g.hero.level,2);assert.equal(g.hero.xp,9);assert.equal(g.hero.hp,115);
  for(let i=0;i<12000;i++)g.reward(e);assert.equal(g.hero.level,LEVEL_CAP);assert.equal(g.hero.xp,0);
});
test('enemies telegraph before hitting and respect invulnerability', () => {
  const {g,e}=duel();e.state='patrol';e.age=0;e.x=220;
  ticks(g,35);assert.equal(g.hero.hp,100);assert.equal(e.state,'warn');ticks(g,17);assert.equal(g.hero.hp,95);
  const hp=g.hero.hp;assert.equal(g.hurt(7,e.x),false);assert.equal(g.hero.hp,hp);
});
test('enemy patrols stay on their platforms and leash back', () => {
  const g=new Game();g.hero.x=0;
  ticks(g,3600);for(const e of g.enemies){assert.ok(e.x-e.w/2>=e.surface.x);assert.ok(e.x+e.w/2<=e.surface.x+e.surface.w);assert.ok(Math.abs(e.x-e.spawnX)<=151);}
});
test('pause freezes health, position, attacks, enemy AI, and respawn timers', () => {
  const g=new Game();g.step(STEP,{punch:true});g.paused=true;const before=JSON.stringify(g);ticks(g,120,{move:1,jump:true,kick:true});assert.equal(JSON.stringify(g),before);
});
test('death and returning to a checkpoint preserve progression and clear input buffers', () => {
  const g=empty();g.checkpoint=1;g.hero.coins=23;g.hero.xp=17;g.hero.invulnerable=0;g.hero.hp=1;g.hurt(9,0);assert.equal(g.hero.dead,true);
  ticks(g,100);assert.equal(g.hero.dead,false);assert.equal(g.hero.x,CAMPS[1].x);assert.equal(g.hero.hp,100);assert.equal(g.hero.coins,23);assert.equal(g.hero.xp,17);assert.equal(g.hero.jumpBuffer,0);
});
test('camp interaction heals, updates checkpoint, and ignores distant input', () => {
  const g=empty();g.hero.x=2340;g.hero.hp=50;g.step(STEP,{interact:true});assert.equal(g.checkpoint,1);assert.equal(g.hero.hp,100);
  g.hero.x=3000;g.hero.hp=50;g.step(STEP,{interact:true});assert.equal(g.hero.hp,50);
});
test('all appearance presets preserve movement, attack timing, and hitboxes', () => {
  const outcomes=[];for(const build of ['slender','balanced','strong','full']){const g=empty();g.look=sanitizeLook({build,height:1.12,legs:.85,cape:false});ticks(g,60,{move:1,punchHeld:true});outcomes.push([g.hero.x,g.attackSerial,g.hero.w,g.hero.h]);}assert.ok(outcomes.every(x=>JSON.stringify(x)===JSON.stringify(outcomes[0])));
});
test('save round-trip and malformed or future saves fail safely', () => {
  const g=empty();g.hero.level=3;g.hero.xp=20;g.hero.coins=35;g.species.add('bottle');g.checkpoint=1;
  const saved=decodeSave(g.save());assert.equal(saved.level,3);assert.equal(saved.coins,35);assert.deepEqual(saved.species,['bottle']);assert.equal(new Game({save:saved}).hero.x,2340);
  for(const text of ['{','null','{}','{"version":2}'])assert.equal(decodeSave(text),null);
  const bad=decodeSave(JSON.stringify({version:1,level:999,xp:1e10,coins:-12,checkpoint:999,look:{height:-9,suit:'url(secret)'},species:['invalid','bottle','bottle']}));
  assert.equal(bad.level,99);assert.equal(bad.coins,0);assert.equal(bad.checkpoint,2);assert.equal(bad.look.height,.88);assert.ok(/^#[0-9a-f]{6}$/i.test(bad.look.suit));assert.equal(bad.species.length,1);assert.ok(bad.xp<xpForLevel(99));
});
test('invalid elapsed times do not corrupt the model', () => {const g=empty();const before=JSON.stringify(g);for(const dt of [0,-1,NaN,Infinity])g.step(dt,{move:1});assert.equal(JSON.stringify(g),before);});
