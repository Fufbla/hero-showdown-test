import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {MONSTER_ANIMATIONS} from '../monster-animation-catalog.mjs';
import {animationFrame,AnimatedMonsterAtlas} from '../monster-animations.mjs';
import {Game,STEP} from '../core.mjs';
import {TYPES} from '../world.mjs';

for(const [type,meta] of Object.entries(MONSTER_ANIMATIONS)){
 test(`${meta.name}: five complete PNG sequences with unchanged name and region`,()=>{
  assert.equal(meta.name,TYPES[type].name);assert.equal(meta.region,TYPES[type].region);
  const manifest=JSON.parse(readFileSync(new URL(`../assets/monsters/animations/${type}/manifest.json`,import.meta.url)));
  for(const state of ['idle','move','attack','hit','defeat']){
   const frames=manifest.frames.filter(f=>f.state===state);assert.equal(frames.length,6);
   assert.equal(new Set(frames.map(f=>f.sha256)).size,6,'six separately drawn poses, not duplicates');
   for(const frame of frames){const png=readFileSync(new URL(`../assets/monsters/animations/${type}/${frame.file}`,import.meta.url));assert.equal(png[25],6);assert.equal(png.readUInt32BE(16),meta.cellWidth);assert.equal(png.readUInt32BE(20),meta.cellHeight);assert.deepEqual(frame.anchor,meta.anchor);assert.equal(createHash('sha256').update(png).digest('hex'),frame.sha256);}
  }
 });
 for(let tier=0;tier<=4;tier++)test(`${meta.name}: wounded aggression and stable feet on platform ${tier}`,()=>{
  const g=new Game({random:()=>.99});g.travel(meta.region);g.hero.level=99;g.hero.hp=g.hero.maxHp=100000;g.hero.invulnerable=999;
  const s=g.surfaces.find(s=>s.id===(tier?`climb-0-${tier}`:'sand-a'))||g.surfaces.find(s=>!s.oneWay);
  assert.ok(s);const offset=tier?0:500;const e=g.makeEnemy(type,s.x+70+offset,s.id,100);g.enemies=[e];e.protection=0;
  g.hero.x=g.hero.prevX=s.x+200+offset;g.hero.y=g.hero.prevY=s.y;
  const before={x:e.x,y:e.y,damage:g.monsterDamage(e),hp:e.maxHp};g.damageEnemy(e,e.maxHp*.5,{stagger:false});
  assert.ok(e.desperate);assert.equal(e.x,before.x);assert.equal(e.y,before.y);assert.equal(g.monsterDamage(e),before.damage);
  let approaches=false,attacks=false;const initial=Math.abs(e.x-g.hero.x);
  for(let i=0;i<480;i++){
   g.step(STEP,{});approaches ||= Math.abs(e.x-g.hero.x)<initial-10;attacks ||= e.state==='strike'||e.pouncing||g.enemyShots.length>0;
   assert.equal(e.maxHp,before.hp);
   if(!e.flying&&!e.airborne&&!e.pouncing&&!e.lifted)assert.equal(e.y,e.surface.y,'art does not move the simulation feet');
   const snapshot=JSON.stringify(e);animationFrame(e,g.time);assert.equal(JSON.stringify(e),snapshot);
  }
  const ranged=['spore','bolt','acid','spit','orb','pulse','volley'].includes(TYPES[type].behavior);
  if(!ranged)assert.ok(approaches,'melee enemy continues to approach below half health');
  else assert.ok(attacks,'ranged enemy keeps firing from its existing attack range');assert.ok(attacks,'continues to attack below half health');
 });
}
test('Drawn attack frames follow real telegraph, strike and recovery clocks',()=>{
 assert.equal(animationFrame({type:'bottle',state:'warn',age:0}),12);
 assert.equal(animationFrame({type:'bottle',state:'warn',age:.6}),13);
 assert.equal(animationFrame({type:'bottle',state:'strike',age:0}),14);
 assert.equal(animationFrame({type:'bottle',state:'strike',age:.13}),15);
 assert.equal(animationFrame({type:'bottle',state:'recover',age:0}),16);
 assert.equal(animationFrame({type:'bottle',state:'recover',age:.13}),17);
 assert.equal(animationFrame({state:'dead',deadAge:1}),29);
 for(let i=0;i<6;i++)assert.equal(animationFrame({flash:.12*(1-(i+.1)/6)}),18+i);
 const e=Object.freeze({state:'desperation',walkCycle:.4});assert.equal(animationFrame(e,0),animationFrame(e,999));
 assert.ok(animationFrame({...e,rooted:true},0)<6);
});
test('PNG loading failure retains a playable fallback and destroy prevents late loads',async()=>{
 let calls=0;const a=new AnimatedMonsterAtlas({loadImages:false,fallback:{entries:new Map(),draw:()=>calls++}});
 assert.equal(await a.preload(1),false);a.draw({},Object.freeze({type:'bottle'}),0);assert.equal(calls,1);a.destroy();assert.equal(await a.load('bottle'),false);
});
